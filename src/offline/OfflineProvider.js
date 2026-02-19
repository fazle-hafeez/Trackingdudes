
import React, { createContext, useState, useEffect, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";
import { apiPost, apiPut } from "../utils/api";
import { storeCache, readCache } from "./cache";

export const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {

    // Track internet connectivity
    const [isConnected, setIsConnected] = useState(true);

    // Stores all pending offline actions
    const [offlineQueue, setOfflineQueue] = useState([]);

    // Allows screens to listen when queue sync completes
    const [queueListeners, setQueueListeners] = useState([]);

    // Track items currently waiting to sync
    const [pendingUpdates, setPendingUpdates] = useState({});

    /**
     * Allow UI components to listen when queue sync completes
     */
    const addQueueListener = (callback) => {
        setQueueListeners((prev) => [...prev, callback]);
        return () =>
            setQueueListeners((prev) => prev.filter((cb) => cb !== callback));
    };

    /**
     * Notify UI when sync happens
     */
    const notifyQueueSync = (syncedIds, tempIds) => {
        queueListeners.forEach((cb) => cb({ syncedIds, tempIds }));
    };

    /**
     * Add any offline API action to queue
     */
    const queueAction = async (action) => {

        // Assign tempId for new POST records (for UI tracking)
        if (action.method === "post" && !action.body.tempId && !action.body.id) {
            action.body.tempId = `local_${Date.now()}`;
        }

        const newQueue = [...offlineQueue, action];

        setOfflineQueue(newQueue);
        await storeCache("offlineQueue", newQueue);

        console.log("[OFFLINE QUEUE ADDED]", action.endpoint);
    };

    /**
     * Save updated queue into state + cache
     */
    const saveQueue = async (data) => {
        setOfflineQueue(data);
        await storeCache("offlineQueue", data);
    };

    /**
     * Load queue from local cache when app starts
     */
    const loadQueue = useCallback(async () => {
        const savedQueue = (await readCache("offlineQueue")) || [];
        const savedPending = (await readCache("pendingUpdates")) || {};

        setOfflineQueue(savedQueue);
        setPendingUpdates(savedPending);
    }, []);

    /**
     * MAIN SYNC ENGINE
     * Runs when internet returns
     */
    const processQueue = useCallback(async () => {

        // Stop if offline or queue empty
        if (!isConnected || offlineQueue.length === 0) return;

        let newQueue = [...offlineQueue];
        let pending = { ...pendingUpdates };

        const syncedIds = [];
        const syncedTempIds = [];

        for (let i = 0; i < newQueue.length; i++) {
            const action = newQueue[i];

            try {

                let payload;

                /**
                 * STEP 1: Build payload (FormData OR JSON)
                 */
                if (action.isFormData) {

                    const fd = new FormData();

                    Object.keys(action.body).forEach((key) => {

                        /**
                         * Handle receipt file upload
                         */
                        if (
                            key === "receipt" &&
                            action.body.receipt &&
                            typeof action.body.receipt === "string"
                        ) {
                            fd.append("receipt", {
                                uri: action.body.receipt,
                                name: "receipt.jpg",
                                type: "image/jpeg",
                            });

                            /**
                             * Ensure PUT override is always sent correctly
                             */
                        } else if (key === "OVERRIDE_METHOD") {
                            fd.append("OVERRIDE_METHOD", action.body[key]);

                            /**
                             * Normal field append
                             */
                        } else {
                            fd.append(key, action.body[key] ?? "");
                        }

                    });

                    payload = fd;

                } else {
                    payload = action.body;
                }

                /**
                 * STEP 2: Decide which request method to call
                 */

                let res;
                // const options = action.options || { useBearerAuth: true };
                const options = {
                    useBearerAuth: true,
                    ...(action.options || {})
                };

                // If server requires PUT override via POST
                if (action.body?.OVERRIDE_METHOD === "PUT") {

                    // Send POST but server will treat as PUT
                    res = await apiPost(
                        action.endpoint,
                        payload,
                        action.useToken,
                        true,
                        options
                    );

                }
                else if (action.method === "post") {

                    res = await apiPost(
                        action.endpoint,
                        payload,
                        action.useToken,
                        action.isFormData,
                        options
                    );

                }
                else if (action.method === "put") {

                    res = await apiPut(
                        action.endpoint,
                        payload,
                        action.useToken,
                        action.isFormData,
                        options
                    );
                }

                /**
                 * STEP 3: Success handling
                 * Remove item from queue
                 */

                if (action.body.tempId) {
                    syncedTempIds.push(action.body.tempId);
                    delete pending[action.body.tempId];
                }

                if (action.body.id) {
                    syncedIds.push(action.body.id);
                    delete pending[action.body.id];
                }

                newQueue.splice(i, 1);
                i--;

                await saveQueue(newQueue);
                await storeCache("recordUpdated", true);

            } catch (err) {

                console.log("[SYNC FAILED] Stopping queue processing", err.message);

                // Stop further processing to avoid API overload
                break;
            }
        }

        /**
         * Update pending updates cache
         */
        setPendingUpdates(pending);
        await storeCache("pendingUpdates", pending);

        notifyQueueSync(syncedIds, syncedTempIds);

    }, [isConnected, offlineQueue, pendingUpdates]);

    /**
     * Listen to network status changes
     */
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            const online = state.isConnected && state.isInternetReachable;
            setIsConnected(online);
        });

        loadQueue();

        return () => unsubscribe();
    }, [loadQueue]);

    /**
     * Auto-run sync when internet returns
     */
    useEffect(() => {
        if (isConnected && offlineQueue.length > 0) {
            processQueue();
        }
    }, [isConnected, offlineQueue, processQueue]);

    return (
        <OfflineContext.Provider
            value={{
                isConnected,
                offlineQueue,
                pendingUpdates,
                setPendingUpdates,
                queueAction,
                processQueue,
                addQueueListener
            }}
        >
            {children}
        </OfflineContext.Provider>
    );
};
