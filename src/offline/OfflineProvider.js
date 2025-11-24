import React, { createContext, useState, useEffect, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";
import { apiPost, apiPut, apiGet } from "../utils/api";
import { storeCache, readCache } from "./cache";

export const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [queueListeners, setQueueListeners] = useState([]);
  const [pendingUpdates, setPendingUpdates] = useState({}); // Add pendingUpdates here

  // -----------------------------
  // Queue listener system
  // -----------------------------
  const addQueueListener = (callback) => {
    setQueueListeners(prev => [...prev, callback]);
    return () => setQueueListeners(prev => prev.filter(cb => cb !== callback));
  };
  const notifyQueueSync = (syncedIds) => queueListeners.forEach(cb => cb(syncedIds));

  // -----------------------------
  // Queue actions
  // -----------------------------
  const queueAction = async (action) => {
    const newQueue = [...offlineQueue, action];
    setOfflineQueue(newQueue);
    await storeCache("offlineQueue", newQueue);
    console.log("[OFFLINE QUEUE ADDED]", action);
  };

  const saveQueue = async (data) => {
    setOfflineQueue(data);
    await storeCache("offlineQueue", data);
  };

  // -----------------------------
  // Load queue from cache
  // -----------------------------
  const loadQueue = useCallback(async () => {
    const savedQueue = await readCache("offlineQueue") || [];
    setOfflineQueue(savedQueue);

    const savedPending = await readCache("pendingUpdates") || {};
    setPendingUpdates(savedPending);

    console.log("[QUEUE LOADED]", savedQueue);
    console.log("[PENDING LOADED]", savedPending);
  }, []);

  // -----------------------------
  // Process / sync offline queue
  // -----------------------------
  const processQueue = useCallback(async () => {
    if (!isConnected || offlineQueue.length === 0) return [];

    const newQueue = [...offlineQueue];
    const syncedIds = [];

    for (let i = 0; i < newQueue.length; i++) {
      const action = newQueue[i];
      try {
        let res;
        if (action.method === "post") {
          res = await apiPost(action.endpoint, action.body, action.useToken, action.isFormData, action.options);
        } else if (action.method === "put") {
          res = await apiPut(action.endpoint, action.body, action.useToken, action.isFormData, action.options);
        }

        // Remove synced item from queue
        newQueue.splice(i, 1);
        i--;

        // If PUT with vehicle_nos, mark them as synced
        if (action.body?.vehicle_nos?.length) {
          syncedIds.push(...action.body.vehicle_nos);
        }

        await saveQueue(newQueue);

        // Update cache after PUT
        if (action.method === "put") {
          try {
            const fresh = await apiGet(action.endpoint, action.useToken);
            const list = Array.isArray(fresh?.data) ? fresh.data : [];
            await storeCache(action.endpoint, { data: list });
            console.log("[CACHE UPDATED AFTER PUT SYNC]");
          } catch (err) {
            console.log("[CACHE UPDATE FAILED AFTER PUT SYNC]", err.message);
          }
        }

      } catch (err) {
        console.log("[SYNC FAILED] Will retry later", err.message);
        break;
      }
    }

    // Remove synced IDs from pendingUpdates
    if (syncedIds.length > 0) {
      const pending = { ...pendingUpdates };
      syncedIds.forEach(id => delete pending[id]);
      setPendingUpdates(pending);
      await storeCache("pendingUpdates", pending);
      notifyQueueSync(syncedIds);
    }

    console.log("[SYNC END]");
    return syncedIds;
  }, [isConnected, offlineQueue, pendingUpdates]);

  // -----------------------------
  // Network listener
  // -----------------------------
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable;
      setIsConnected(online);
      console.log("[NETWORK STATUS]", online);
    });

    loadQueue();

    return () => unsubscribe();
  }, [loadQueue]);

  // -----------------------------
  // Auto sync when online
  // -----------------------------
  useEffect(() => {
    if (isConnected) {
      console.log("[NETWORK BACK] Running sync...");
      processQueue();
    }
  }, [isConnected, processQueue]);

  return (
    <OfflineContext.Provider value={{
      isConnected,
      offlineQueue,
      pendingUpdates,
      setPendingUpdates,
      queueAction,
      processQueue,
      addQueueListener
    }}>
      {children}
    </OfflineContext.Provider>
  );
};
