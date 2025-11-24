import { useState, useCallback, useContext, useRef, useEffect } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../utils/api";
import { useAuth } from "../context/UseAuth";
import { OfflineContext } from "../offline/OfflineProvider";
import { storeCache, readCache } from "../offline/cache";

export const useApi = () => {
  const { showModal } = useAuth();
  const { isConnected, queueAction, offlineQueue, addQueueListener } = useContext(OfflineContext);

  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const dataRef = useRef([]);
  const lastEndpointRef = useRef(null);

  // -----------------------------
  // Offline listener: safe update
  // -----------------------------
  useEffect(() => {
    const listener = async (syncedIds) => {
      const endpoint = lastEndpointRef.current;
      if (!endpoint) return;

      try {
        const cached = await readCache(endpoint);
        const list = cached?.data || [];

        // Merge pending offline items
        const pending = offlineQueue
          .filter(q => q.endpoint === endpoint)
          .map(q => ({ ...q.body, tempId: q.body.tempId || Date.now() }));

        const merged = [
          ...list.filter(item => !pending.some(p => p.id === item.id || p.tempId === item.tempId)),
          ...pending
        ];

        // Only update if actually changed
        if (JSON.stringify(dataRef.current) !== JSON.stringify(merged)) {
          dataRef.current = merged;
          setData(merged);
        }
      } catch (err) {
        console.warn("[Offline listener error]", err);
      }
    };

    const unsubscribe = addQueueListener(listener);
    return () => unsubscribe();
  }, []); // run once

  // -----------------------------
  // Main request function
  // -----------------------------
  const request = useCallback(
    async (method, endpoint, body = null, useToken = false, isFormData = false, options = {}) => {
      setError(null);
      lastEndpointRef.current = endpoint;

      // ---------------- OFFLINE MODE ----------------
      if (!isConnected) {
        try {
          const cached = (await readCache(endpoint)) || { data: [] };
          let list = Array.isArray(cached.data) ? cached.data : [];

          // Merge pending offline items
          const pending = offlineQueue
            .filter(q => q.endpoint === endpoint)
            .map(q => ({ ...q.body, tempId: q.body.tempId || Date.now() }));

          list = [
            ...list.filter(item => !pending.some(p => p.id === item.id || p.tempId === item.tempId)),
            ...pending
          ];

          // --- POST ---
          if (method === "post") {
            const tempId = Date.now();
            const newItem = { ...body, id: tempId, tempId };
            list.push(newItem);
            await storeCache(endpoint, { data: list });
            await queueAction({ method, endpoint, body: newItem, useToken, isFormData, options });
            dataRef.current = list;
            setData(list);
            // showModal("Item queued successfully (offline)", "success");
            return { offline: true, data: list };
          }

          // --- PUT ---
          if (method === "put") {
            const itemId = body.id || body.tempId || Date.now();
            let updated = false;

            list = list.map(item => {
              if (item.id === itemId || item.tempId === itemId) {
                updated = true;
                return { ...item, ...body, tempId: item.tempId || itemId };
              }
              return item;
            });

            if (!updated) list.push({ ...body, tempId: itemId });

            await storeCache(endpoint, { data: list });
            await queueAction({ method, endpoint, body, useToken, isFormData, options });
            dataRef.current = list;
            setData(list);
            console.log("Item updated offline. It will sync later.");
            return { offline: true, data: list };
          }

          // --- DELETE ---
          if (method === "delete") {
            showModal("Offline: delete not allowed", "warning");
            return { offline: true, data: list };
          }

          // --- GET ---
          dataRef.current = list;
          setData(list);
          return { offline: true, data: list };

        } catch (err) {
          setError(err.message || "Offline cache error");
          // showModal(err.message || "Offline cache error", "error");
          return null;
        }
      }

      // ---------------- ONLINE MODE ----------------
      try {
        let res;
        switch (method) {
          case "get": res = await apiGet(endpoint, useToken, options); break;
          case "post": res = await apiPost(endpoint, body, useToken, isFormData, options); break;
          case "put": res = await apiPut(endpoint, body, useToken, isFormData, options); break;
          case "delete": res = await apiDelete(endpoint, body, useToken, options); break;
          default: throw new Error(`Unknown method ${method}`);
        }

        const list = Array.isArray(res?.data) ? res.data : [];
        await storeCache(endpoint, { data: list });
        dataRef.current = list;
        setData(list);
        return res;

      } catch (err) {
        setError(err.message || "Network error");
        showModal(err.message || "Network error", "error");

        // GET fallback offline
        if (method === "get") {
          const cached = await readCache(endpoint) || { data: [] };
          const pending = offlineQueue
            .filter(q => q.endpoint === endpoint)
            .map(q => ({ ...q.body, tempId: q.body.tempId || Date.now() }));
          const merged = [...cached.data, ...pending];
          dataRef.current = merged;
          setData(merged);
          return { offline: true, data: merged };
        }

        return null;
      }
    },
    [isConnected, queueAction, offlineQueue, showModal]
  );

  // -----------------------------
  // Wrappers
  // -----------------------------
  const get = useCallback(
    (endpoint, useToken = false, options = {}) => request("get", endpoint, null, useToken, false, options),
    [request]
  );
  const post = useCallback(
    (endpoint, body, useToken = false, isFormData = false, options = {}) => request("post", endpoint, body, useToken, isFormData, options),
    [request]
  );
  const put = useCallback(
    (endpoint, body, useToken = false, isFormData = false, options = {}) => request("put", endpoint, body, useToken, isFormData, options),
    [request]
  );
  const del = useCallback(
    (endpoint, body, useToken = false, options = {}) => request("delete", endpoint, body, useToken, false, options),
    [request]
  );

  return { get, post, put, del, error, data };
};
