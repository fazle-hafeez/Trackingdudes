// import React, { createContext, useState, useEffect, useCallback } from "react";
// import NetInfo from "@react-native-community/netinfo";
// import { apiPost, apiPut, apiGet } from "../utils/api";
// import { storeCache, readCache } from "./cache";

// export const OfflineContext = createContext();

// export const OfflineProvider = ({ children }) => {
//   const [isConnected, setIsConnected] = useState(true);
//   const [offlineQueue, setOfflineQueue] = useState([]);
//   const [queueListeners, setQueueListeners] = useState([]);
//   const [pendingUpdates, setPendingUpdates] = useState({}); // Add pendingUpdates here

//   // -----------------------------
//   // Queue listener system
//   // -----------------------------
//   const addQueueListener = (callback) => {
//     setQueueListeners(prev => [...prev, callback]);
//     return () => setQueueListeners(prev => prev.filter(cb => cb !== callback));
//   };
//   const notifyQueueSync = (syncedIds) => queueListeners.forEach(cb => cb(syncedIds));

//   // -----------------------------
//   // Queue actions
//   // -----------------------------
//   const queueAction = async (action) => {
//     const newQueue = [...offlineQueue, action];
//     setOfflineQueue(newQueue);
//     await storeCache("offlineQueue", newQueue);
//     console.log("[OFFLINE QUEUE ADDED]", action);
//   };

//   const saveQueue = async (data) => {
//     setOfflineQueue(data);
//     await storeCache("offlineQueue", data);
//   };

//   // -----------------------------
//   // Load queue from cache
//   // -----------------------------
//   const loadQueue = useCallback(async () => {
//     const savedQueue = await readCache("offlineQueue") || [];
//     setOfflineQueue(savedQueue);

//     const savedPending = await readCache("pendingUpdates") || {};
//     setPendingUpdates(savedPending);

//     console.log("[QUEUE LOADED]", savedQueue);
//     console.log("[PENDING LOADED]", savedPending);
//   }, []);

//   // -----------------------------
//   // Process / sync offline queue
//   // -----------------------------
//   const processQueue = useCallback(async () => {
//     if (!isConnected || offlineQueue.length === 0) return [];

//     const newQueue = [...offlineQueue];
//     const syncedIds = [];

//     for (let i = 0; i < newQueue.length; i++) {
//       const action = newQueue[i];
//       try {
//         let res;
//         if (action.method === "post") {
//           res = await apiPost(action.endpoint, action.body, action.useToken, action.isFormData, action.options);
//         } else if (action.method === "put") {
//           res = await apiPut(action.endpoint, action.body, action.useToken, action.isFormData, action.options);
//         }

//         // Remove synced item from queue
//         newQueue.splice(i, 1);
//         i--;

//         // If PUT with vehicle_nos, mark them as synced
//         if (action.body?.vehicle_nos?.length) {
//           syncedIds.push(...action.body.vehicle_nos);
//         }

//         await saveQueue(newQueue);

//         // Update cache after PUT
//         if (action.method === "put") {
//           try {
//             const fresh = await apiGet(action.endpoint, action.useToken);
//             const list = Array.isArray(fresh?.data) ? fresh.data : [];
//             await storeCache(action.endpoint, { data: list });
//             console.log("[CACHE UPDATED AFTER PUT SYNC]");
//           } catch (err) {
//             console.log("[CACHE UPDATE FAILED AFTER PUT SYNC]", err.message);
//           }
//         }

//       } catch (err) {
//         console.log("[SYNC FAILED] Will retry later", err.message);
//         break;
//       }
//     }

//     // Remove synced IDs from pendingUpdates
//     if (syncedIds.length > 0) {
//       const pending = { ...pendingUpdates };
//       syncedIds.forEach(id => delete pending[id]);
//       setPendingUpdates(pending);
//       await storeCache("pendingUpdates", pending);
//       notifyQueueSync(syncedIds);
//     }

//     console.log("[SYNC END]");
//     return syncedIds;
//   }, [isConnected, offlineQueue, pendingUpdates]);

//   // -----------------------------
//   // Network listener
//   // -----------------------------
//   useEffect(() => {
//     const unsubscribe = NetInfo.addEventListener((state) => {
//       const online = state.isConnected && state.isInternetReachable;
//       setIsConnected(online);
//       console.log("[NETWORK STATUS]", online);
//     });

//     loadQueue();

//     return () => unsubscribe();
//   }, [loadQueue]);

//   // -----------------------------
//   // Auto sync when online
//   // -----------------------------
//   useEffect(() => {
//     if (isConnected) {
//       console.log("[NETWORK BACK] Running sync...");
//       processQueue();
//     }
//   }, [isConnected, processQueue]);

//   return (
//     <OfflineContext.Provider value={{
//       isConnected,
//       offlineQueue,
//       pendingUpdates,
//       setPendingUpdates,
//       queueAction,
//       processQueue,
//       addQueueListener
//     }}>
//       {children}
//     </OfflineContext.Provider>
//   );
// };

import React, { createContext, useState, useEffect, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";
import { apiPost, apiPut, apiGet } from "../utils/api";
import { storeCache, readCache } from "./cache";

export const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [queueListeners, setQueueListeners] = useState([]);
  const [pendingUpdates, setPendingUpdates] = useState({});

  // -----------------------------
  // Queue listener system
  // -----------------------------
  const addQueueListener = (callback) => {
    setQueueListeners(prev => [...prev, callback]);
    return () => setQueueListeners(prev => prev.filter(cb => cb !== callback));
  };
  
  // Added a new listener function to also pass old temporary IDs
  const notifyQueueSync = (syncedIds, tempIds) => queueListeners.forEach(cb => cb({ syncedIds, tempIds }));

  // -----------------------------
  // Queue actions
  // -----------------------------
  const queueAction = async (action) => {
    // Ensure every POST request has a tempId for later cleanup
    if (action.method === "post" && !action.body.tempId) {
      action.body.tempId = `local_${Date.now()}`;
    }
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
    if (!isConnected || offlineQueue.length === 0) return;

    let newQueue = [...offlineQueue];
    const syncedIds = [];
    const syncedTempIds = [];
    let pending = { ...pendingUpdates };

    for (let i = 0; i < newQueue.length; i++) {
      const action = newQueue[i];
      console.log(`[SYNCING] ${action.method} ${action.endpoint}`);

      try {
        let res;
        if (action.method === "post") {
          res = await apiPost(action.endpoint, action.body, action.useToken, action.isFormData, action.options);
        } else if (action.method === "put") {
          res = await apiPut(action.endpoint, action.body, action.useToken, action.isFormData, action.options);
        }

        // ----------------------------------------------------
        // 🚨 CORRECTION 1: Handle POST (New Record)
        // ----------------------------------------------------
        if (action.method === "post" && action.body.tempId && res?.id) {
          // New record synced successfully!
          syncedTempIds.push(action.body.tempId);
          // Remove the pending update flag if it was using tempId
          delete pending[action.body.tempId];
          console.log(`[POST SUCCESS] Temp ID ${action.body.tempId} converted to ID ${res.id}`);
        }

        // ----------------------------------------------------
        // 🚨 CORRECTION 2: Handle PUT (Status/Update) - PROJECTS & VEHICLES
        // ----------------------------------------------------
        if (action.method === "put") {
          // Clean up pending updates for both vehicles and projects
          const putIds = [...(action.body?.vehicle_nos || []), ...(action.body?.project_nos || [])];
          if (putIds.length) {
            syncedIds.push(...putIds);
          }
        }
        
        // Remove synced item from queue
        newQueue.splice(i, 1);
        i--; // Adjust counter because an item was removed

        await saveQueue(newQueue);

        // ----------------------------------------------------
        // Cache Update: This needs to be smarter. 
        // Instead of fetching the entire list (which might be huge),
        // we should only fetch the list when the view is focused.
        // For now, we will leave the full fetch/put for context.
        // ----------------------------------------------------
        if (action.method === "put" || action.method === "post") {
          // Set a flag so MyProjects.js knows to refetch all data from server
          await storeCache("recordUpdated", true); 
        }

      } catch (err) {
        console.log("[SYNC FAILED] Will retry later", err.message, action);
        // If sync fails, stop and wait for the next connection event
        break; 
      }
    }

    // ----------------------------------------------------
    // Cleanup pendingUpdates cache
    // ----------------------------------------------------
    if (syncedIds.length > 0 || syncedTempIds.length > 0) {
      // 1. Clean up PUT updates (vehicle/project status)
      syncedIds.forEach(id => delete pending[id]);
      
      // 2. Clean up POST temporary IDs
      syncedTempIds.forEach(id => delete pending[id]);

      setPendingUpdates(pending);
      await storeCache("pendingUpdates", pending);
      
      // Notify the consuming components (like MyProjects) to refetch/update UI
      notifyQueueSync(syncedIds, syncedTempIds); 
    }

    console.log("[SYNC END]");
  }, [isConnected, offlineQueue, pendingUpdates]); // Added pendingUpdates to dependencies

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
    if (isConnected && offlineQueue.length > 0) { // Added check for queue length
      console.log("[NETWORK BACK] Running sync...");
      processQueue();
    }
  }, [isConnected, offlineQueue, processQueue]); // Added offlineQueue to re-trigger sync after queue is added

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