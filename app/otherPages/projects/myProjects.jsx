import { View, Text, TouchableOpacity, TextInput, FlatList, RefreshControl, StatusBar } from "react-native";
import React, { useCallback, useState, useEffect, useContext } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6, Feather, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Hooks
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";
import { readCache, storeCache } from "../../../src/offline/cache";
import { OfflineContext } from "../../../src/offline/OfflineProvider";
// Components
import TickCrossIndicator from '../../../src/components/TickCrossIndicator';
import CheckBox from "../../../src/components/CheckBox";
import Pagination from "../../../src/components/Pagination";
import LoadingSkeleton from "../../../src/components/LoadingSkeleton";
import Tabs from "../../../src/components/Tabs";
import PageHeader from "../../../src/components/PageHeader";
import BottomActionBar from "../../../src/components/ActionBar"; // Assumed to be reusable
import ProjectCountModal from "../../../src/components/ProjectCountModal"; // NEW: For project limit

const CACHE_KEY = "my-projects";
const PROJECT_COUNT_ASYNC_KEY = "@my-projects-count"; // NEW: Key for project count in AsyncStorage

const MyProjects = () => {
    const { get, del, put } = useApi();
    const { showModal, setGlobalLoading, hideModal } = useAuth();
    const { isConnected } = useContext(OfflineContext);

    const tabs = ["Enabled", "Disabled"];
    const [activeTab, setActiveTab] = useState("Enabled");
    const [projects, setProjects] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedProjects, setSelectedProjects] = useState([]); // NEW: State for selection
    const [selectAll, setSelectAll] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [refreshing, setRefreshing] = useState(false);
    const [order, setOrder] = useState("asc");

    // NEW: Project limit states (from MyVehicles)
    const [projectCount, setProjectCount] = useState(15); // Default to 15 if not set
    const [modalVisible, setModalVisible] = useState(false);
    const [fetchProject, setFetchProject] = useState(false);

    // Track pending offline updates (project id -> status string OR true)
    const [pendingUpdates, setPendingUpdates] = useState({});

    // ---------- helpers ----------
   const normalizeStatus = (value) => {
    if (!value) return null;
    if (typeof value === "string") return value.toLowerCase();
    if (typeof value === "object" && value.status) return String(value.status).toLowerCase();
    return null;
  };
  

  const mergePendingAndNormalize = (obj = {}) => {
    const out = {};
    Object.keys(obj).forEach(k => {
      const v = obj[k];
      const n = normalizeStatus(v);
      if (n) out[k] = n;
    });
    return out;
  };

    // -------------------- Project Count Logic (NEW) --------------------
    useEffect(() => {
        const checkProjectCount = async () => {
            const value = await AsyncStorage.getItem(PROJECT_COUNT_ASYNC_KEY);
            if (!value) {
                setModalVisible(true);
            } else {
                setProjectCount(parseInt(value) || 15);
                setFetchProject(true);
            }
        };
        checkProjectCount();
    }, []);

    const handleSelect = async (value) => {
        try {
            await AsyncStorage.setItem(PROJECT_COUNT_ASYNC_KEY, String(value));
            setProjectCount(value); // update state
            setModalVisible(false); // close modal
            setFetchProject(true);
            // Optionally, refetch projects with new limit
            await fetchProjects(1); // first page
        } catch (err) {
            console.log("Error handling project count select:", err);
        }
    };

    // -------------------- FETCH PROJECTS --------------------
    const fetchProjects = async (pageNumber = 1, currentOrder = order, shouldUpdateCache = false) => {
        if (!fetchProject) return; // Wait for project limit to be set
        const fetchStatus = activeTab.toLowerCase();
        try {
            setLoading(true);

            const result = await get(
                `my-projects?status=${fetchStatus}&order=${currentOrder}&limit=${projectCount}&page=${pageNumber}&_t=${isConnected ? Date.now() : 0}`, // Use projectCount
                { useBearerAuth: true }
            );

            let projectsData = Array.isArray(result?.data) ? result.data : [];

            // Pagination
            if (isConnected && result?.pagination) {
                setPage(result?.pagination?.current_page || pageNumber);
                setTotalPages(result?.pagination?.total_pages || 1);
            } else {
                setPage(1);
                setTotalPages(1);
            }

            // Load caches & pending
            const cachedPendingRaw = await readCache("pendingUpdates") || {};
            const cachedPending = mergePendingAndNormalize(cachedPendingRaw);
            const allCachedWrap = await readCache(CACHE_KEY) || { data: [] };
            const allCached = Array.isArray(allCachedWrap.data) ? allCachedWrap.data : [];

            // 1) Merge pending offline posts (new records added offline)
            const offlineQueue = (await readCache("offlineQueue")) || [];
            const pendingAdds = offlineQueue
                .filter(i => i.endpoint?.includes("create-project") && i.method === "post")
                .map(i => ({
                    ...i.body,
                    // 🚨 FIX 1: Make sure 'project' field is included from body
                    project: i.body.project,
                    tempId: i.body.tempId || i.body.id || `local_${Date.now()}`,
                    pending: true, // Mark as pending
                    status: normalizeStatus(i.body.status) || "enabled",
                }));

            // Only include pending adds that belong to the current tab status
            const addsForCurrentTab = pendingAdds.filter(p => normalizeStatus(p.status) === fetchStatus);

            addsForCurrentTab.forEach(p => {
                // Check if an item with the same tempId already exists in projectsData (to avoid duplicates on fresh fetch)
                const exists = projectsData.find(v => (v.tempId && p.tempId && v.tempId === p.tempId));
                // 🚨 FIX 2: Check if project already exists, if not, add it to the front of the list (unshift)
                if (!exists) {
                    projectsData.unshift(p);
                }
            });

            // 2) Add items moved to this tab due to pending status change (from cache)
            const movedPendingItems = allCached
                .filter(item => {
                    const id = item.id || item.tempId;
                    const pendingStatus = cachedPending[id];
                    // Item has a pending status change AND the new status matches the current tab
                    return id && pendingStatus && pendingStatus === fetchStatus;
                })
                .map(item => ({ ...item, status: cachedPending[item.id] || cachedPending[item.tempId], pending: true }));

            movedPendingItems.forEach(pItem => {
                // Only add if it doesn't already exist from the API fetch
                const exists = projectsData.find(v => (v.id && pItem.id && v.id === pItem.id) || (v.tempId && pItem.tempId && v.tempId === pItem.tempId));
                if (!exists) projectsData.push(pItem);
            });

            // 3) Apply final pending status/flag to all records in the current list
            projectsData = projectsData.map(p => {
                const id = p.id || p.tempId;
                const pendingStatus = cachedPending[id];

                // 🚨 FIX 3: Check if it's a new pending add (no ID, has tempId and pending: true from step 1) 
                // OR if it's a status update pending (has ID, pendingStatus exists)
                const isNewPendingAdd = !p.id && !!p.tempId && !!p.pending;
                const isStatusUpdatePending = !!pendingStatus;

                if (isNewPendingAdd) {
                    return { ...p, status: normalizeStatus(p.status) || fetchStatus, pending: true };
                }
                if (isStatusUpdatePending) {
                    // If status update is pending, use the new pending status for display
                    return { ...p, status: pendingStatus, pending: true };
                }
                // Use server status or cached status, and explicitly set pending to false
                return { ...p, status: normalizeStatus(p.status) || fetchStatus, pending: false };
            });

            // 4) Final filter to ensure displayed items match current tab (safe normalize)
            projectsData = projectsData.filter(p => {
                const st = normalizeStatus(p.status) || fetchStatus;
                return st === fetchStatus;
            });

            // Map to parsed format (inShift, inTrips etc) AFTER filtering & pending applied
            const parsed = projectsData.map((p) => ({
                ...p,
                inShift: String(p.in_shifts) === "1" || p.inShift === true,
                inTrips: String(p.in_trips) === "1" || p.inTrips === true,
                inTimes: String(p.in_times) === "1" || p.inTimes === true,
                inExpenses: String(p.in_expenses) === "1" || p.inExpenses === true,
                suggestions: p.suggestions
            }));

            setProjects(parsed);

            // Update cache if connected or forced
            if (isConnected || shouldUpdateCache) {
                // Storing the entire list including tempId items for offline view consistency
                // Only store projects for the current tab to avoid mixing data
                // ⚠️ Note: For full offline capability, all tabs should be cached, but for a quick fix, storing the current view.
                await storeCache(CACHE_KEY, { data: parsed, timestamp: Date.now() });
            }

        } catch (error) {
            console.error("Error fetching projects, falling back to cache:", error);

            // Fallback to cached data with pending applied
            const cachedWrap = await readCache(CACHE_KEY) || { data: [] };
            const cached = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];
            const cachedPendingRaw = await readCache("pendingUpdates") || {};
            const cachedPending = mergePendingAndNormalize(cachedPendingRaw);

            // Also merge pending adds into cached data during fallback
            const offlineQueue = (await readCache("offlineQueue")) || [];
            const pendingAdds = offlineQueue
                .filter(i => i.endpoint?.includes("create-project") && i.method === "post")
                .map(i => ({
                    ...i.body,
                    project: i.body.project, // Ensure project name is included
                    tempId: i.body.tempId || i.body.id || `local_${Date.now()}`,
                    pending: true,
                    status: normalizeStatus(i.body.status) || "enabled",
                }));

            // Filter pendingAdds for the current tab
            const pendingAddsForTab = pendingAdds.filter(p => normalizeStatus(p.status) === activeTab.toLowerCase());

            // Add pending adds to the top of cached list, filtering out duplicates if they somehow got cached
            let safeCachedData = [...pendingAddsForTab];
            const pendingTempIds = pendingAddsForTab.map(p => p.tempId);

            cached.forEach(item => {
                if (!item.tempId || !pendingTempIds.includes(item.tempId)) {
                    safeCachedData.push(item);
                }
            });

            if (safeCachedData.length > 0) {
                safeCachedData = safeCachedData.map(item => {
                    const id = item.id || item.tempId;
                    const pendingStatus = cachedPending[id];
                    const isNewPendingAdd = !item.id && !!item.tempId; // Check if it's a new local creation

                    return {
                        ...item,
                        status: pendingStatus || normalizeStatus(item.status) || activeTab.toLowerCase(),
                        pending: !!pendingStatus || isNewPendingAdd, // Keep pending true for new adds and status updates
                        inShift: String(item.in_shifts) === "1" || item.inShift === true,
                        inTrips: String(item.in_trips) === "1" || item.inTrips === true,
                        inTimes: String(item.in_times) === "1" || item.inTimes === true,
                        inExpenses: String(item.in_expenses) === "1" || item.inExpenses === true,
                        suggestions: item.suggestions
                    };
                });

                safeCachedData = safeCachedData.filter(item => String(item.status || "").toLowerCase() === activeTab.toLowerCase());
                setProjects(safeCachedData);
            } else {
                setProjects([]);
            }

            setPage(1);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    // -------------------- USE FOCUS EFFECT --------------------
    useFocusEffect(
        useCallback(() => {
            if (!fetchProject) return;

            const restorePending = async () => { /* ... (Same as before) */ };

            const checkActionsAndFetch = async () => {
                const newRecord = await readCache("newRecordAdded");
                const recordDeleted = await readCache("recordDeleted");

                // 🚨 NEW: Check for successful sync flag from OfflineProvider
                const recordUpdated = await readCache("recordUpdated");

                if (newRecord || recordDeleted || recordUpdated) { // Added recordUpdated
                    await fetchProjects(1, order, true);
                    if (newRecord) await storeCache("newRecordAdded", false);
                    if (recordDeleted) await storeCache("recordDeleted", false);
                    if (recordUpdated) await storeCache("recordUpdated", false); // 🚨 Clean up flag
                } else {
                    await fetchProjects(1);
                }
            };

            restorePending();
            checkActionsAndFetch();
        }, [activeTab, order, fetchProject])
    );

    // ---------------- REFRESH (FROM MyVehicles) ----------------
    const onRefresh = async () => {
        setRefreshing(true);
        await fetchProjects(1, "desc", true);
        setRefreshing(false);
    };

    // ---------------- SELECTION (FROM MyVehicles) ----------------
    const handleSelectAll = () => {
        setSelectAll(prev => {
            const newValue = !prev;
            // Filtered projects based on search query
            const filteredProjects = projects.filter(item =>
                item?.project?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            // Only select items with a valid ID (not just tempId from offline new record)
            setSelectedProjects(newValue ? filteredProjects.map(v => v.id).filter(Boolean) : []);
            return newValue;
        });
    };

    const toggleProjectSelect = (id) => {
        setSelectedProjects(prev =>
            prev.includes(id) ? prev.filter(vid => vid !== id) : [...prev, id]
        );
    };

    const handleCancel = () => {
        setSelectionMode(false);
        setSelectedProjects([]);
        setSelectAll(false);
    };

    // ---------------- ENABLE / DISABLE (FROM MyVehicles) ----------------
    const toggleProjectStatus = async () => {
        if (selectedProjects.length <= 0) {
            showModal("You must choose at least one project.", "error");
            return;
        }

        const validSelection = selectedProjects.filter(id => id);
        if (validSelection.length === 0) {
            showModal("Selected item is pending sync and cannot be updated yet.", "error");
            return;
        }

        const isEnabled = activeTab.toLowerCase() === "enabled";
        const newStatus = isEnabled ? "disabled" : "enabled";
        const actionWord = isEnabled ? "Disable" : "Enable";

        showModal(
            `You're about to ${actionWord.toLowerCase()} the selected projects. Do you want to continue?`,
            "warning",
            `${actionWord} Projects`,
            [
                {
                    label: `Yes, ${actionWord}`,
                    bgColor: "bg-red-600",
                    onPress: async () => {
                        hideModal();
                        await changeProjectStatus(newStatus, validSelection);
                    },
                },
                {
                    label: "Back",
                    bgColor: "bg-green-600",
                    onPress: () => {
                        hideModal();
                        handleCancel();
                    },
                },
            ]
        );
    };

    const changeProjectStatus = async (status, selectedIds) => {
        try {
            setGlobalLoading(true);
            // *** API Endpoint and Payload updated for Projects ***
            const payload = { status, project_nos: selectedIds };
            const newStatusLower = String(status).toLowerCase();
            const result = await put("my-projects/mark-projects", payload, { useBearerAuth: true }); // Updated Endpoint

            if (result?.offline) {
                const updatedPendingRaw = await readCache("pendingUpdates") || {};
                const updatedPending = mergePendingAndNormalize(updatedPendingRaw);

                selectedIds.forEach(id => { updatedPending[id] = newStatusLower; });
                setPendingUpdates(updatedPending);
                await storeCache("pendingUpdates", updatedPending);

                // Update UI: remove items from current tab view
                setProjects(prev => prev.filter(item => !selectedIds.includes(item.id)));

                // Update main cache so other tab can pick it up
                const cachedWrap = await readCache(CACHE_KEY) || { data: [] };
                let cachedList = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];
                cachedList = cachedList.map(item => selectedIds.includes(item.id) ? { ...item, status: newStatusLower, pending: true } : item);
                await storeCache(CACHE_KEY, { data: cachedList, timestamp: Date.now() });
                await storeCache("recordDeleted", true);

                showModal(`Projects status updated to ${status} (offline). They will sync when online.`, "success");
                handleCancel();
                return;
            }

            if (result.status === "success") {
                const updatedPendingRaw = await readCache("pendingUpdates") || {};
                const updatedPending = mergePendingAndNormalize(updatedPendingRaw);
                selectedIds.forEach(id => delete updatedPending[id]);
                await storeCache("pendingUpdates", updatedPending);
                setPendingUpdates(updatedPending);

                setProjects(prev => prev.filter(item => !selectedIds.includes(item.id)));

                const cachedWrap = await readCache(CACHE_KEY) || { data: [] };
                let cachedList = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];
                cachedList = cachedList.map(item => selectedIds.includes(item.id) ? { ...item, status: newStatusLower, pending: false } : item);
                await storeCache(CACHE_KEY, { data: cachedList, timestamp: Date.now() });

                showModal(result.data || `Projects ${status} successfully.`, "success");
                handleCancel();
            } else {
                showModal("Failed to update project status.", "error");
            }

        } catch (err) {
            showModal("Something went wrong. Please try again.", "error");
        } finally {
            setGlobalLoading(false);
        }
    };

    // ---------------- DELETE PROJECTS (FROM MyVehicles) ----------------
    const deleteProjects = async () => {
        if (selectedProjects.length === 0) {
            showModal("Please select at least one project to delete.", "error");
            return;
        }

        const validSelection = selectedProjects.filter(id => id);
        if (validSelection.length === 0) {
            showModal("Selected item is pending sync and cannot be deleted yet.", "error");
            return;
        }

        showModal(
            "You're about to permanently remove the selected projects...",
            "warning",
            "Deleting Projects?",
            [
                {
                    label: "Delete",
                    bgColor: "bg-red-600",
                    onPress: async () => {
                        hideModal();
                        await confirmDelete(validSelection);
                    },
                },
                {
                    label: "Cancel",
                    bgColor: "bg-green-600",
                    onPress: () => {
                        hideModal();
                        handleCancel();
                    },
                },
            ]
        );
    };

    const confirmDelete = async (selectedIds) => {
        try {
            setGlobalLoading(true);
            // *** API Endpoint and Payload updated for Projects ***
            const payload = { project_nos: selectedIds };
            const res = await del("my-projects/delete-projects", payload, { useBearerAuth: true }); // Updated Endpoint

            if (res?.offline) {
                showModal("Cannot delete in offline mode", "error");
                return;
            }

            if (res.status === "success") {
                setProjects(prev => prev.filter(v => !selectedIds.includes(v.id)));
                const cachedWrap = await readCache(CACHE_KEY) || { data: [] };
                const cachedList = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];
                const updatedCache = cachedList.filter(v => !selectedIds.includes(v.id));
                await storeCache(CACHE_KEY, { data: updatedCache, timestamp: Date.now() });
                await storeCache("recordDeleted", true);
                showModal(res.data || "Projects deleted successfully.", "success");
                handleCancel();
            } else {
                showModal(res?.data || "Couldn't delete projects.", "error");
            }

        } catch (err) {
            console.error("Delete error:", err);
            showModal("Something went wrong while deleting.", "error");
        } finally {
            setGlobalLoading(false);
        }
    };

    const filteredProjects = projects.filter((item) =>
        item?.project?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // -------------------- RENDER ITEM --------------------
const renderProject = ({ item }) => {
         const key = item.id || item.tempId;
    const isPending = !!item.pending || (item.id && !!pendingUpdates[item.id]) || (!!pendingUpdates[item.tempId]);

        return (
            <TouchableOpacity
                key={key}
                onLongPress={() => {
                    if (key) {
                        // Only start selection mode if item has a real ID (cannot bulk action pending new adds)
                        if (!selectionMode && item.id) {
                            setSelectionMode(true);
                            setSelectedProjects([item.id]); // Only select if it has a real ID
                        } else if (selectionMode && item.id) {
                            toggleProjectSelect(item.id);
                        }
                    }
                }}
                onPress={() => {
                    // Pass both ID and tempId to the detail screen for offline viewing/editing
                    router.push({ pathname: "/otherPages/projects/addingProject", params: { id: item.id, tempId: item.tempId } });
                }}
                activeOpacity={0.8}
                delayLongPress={500}
                className="mb-3"
            >
                <View className={`bg-white rounded-md shadow-sm p-4 ${isPending ? "border-2 border-yellow-400 bg-yellow-50" : ""}`}>
                    <View className="flex-row items-center border-b border-gray-200 pb-2 mb-2">
                        <View className="flex-row items-center flex-1">
                            {selectionMode && (
                                // Only show checkbox/allow selection if it has a real ID
                                <CheckBox value={item.id ? selectedProjects.includes(item.id) : false} onClick={() => item.id && toggleProjectSelect(item.id)} />
                            )}
                            {/* प्रोजेक्ट आइकॉन */}
                            <FontAwesome5 name="folder-open" size={20} color="#3b82f6" className="ml-2" /> 
                            <Text className="text-lg font-semibold text-gray-700 ml-2">{item.project}</Text>
                        </View>

                    </View>

                    <View className="flex-row justify-between items-center my-3">
                        {/* Shifts - हल्का नीला (Teal) रंग */}
                        <View className="items-center flex-1">
                            <FontAwesome5 name="clock" size={20} color="#14b8a6" className="mb-1" /> {/* Teal-500 */}
                            <Text className="text-xs font-medium text-gray-500">Shifts</Text>
                            <TickCrossIndicator checked={item.inShift}  />
                        </View>

                        {/* Trips - हल्का बैंगनी (Indigo) रंग */}
                        <View className="items-center flex-1">
                            <FontAwesome5 name="route" size={20} color="#6366f1" className="mb-1" /> {/* Indigo-500 */}
                            <Text className="text-xs font-medium text-gray-500">Trips</Text>
                            <TickCrossIndicator checked={item.inTrips}  />
                        </View>
                        
                        {/* Times - नारंगी (Orange) रंग */}
                        <View className="items-center flex-1">
                            <FontAwesome5 name="hourglass-half" size={20} color="#f97316" className="mb-1" /> {/* Orange-600 */}
                            <Text className="text-xs font-medium text-gray-500">Times</Text>
                            <TickCrossIndicator checked={item.inTimes}  />
                        </View>
                        
                        {/* Expenses - गहरा हरा (Emerald) रंग */}
                        <View className="items-center flex-1">
                            <FontAwesome5 name="receipt" size={20} color="#059669" className="mb-1" /> {/* Emerald-600 */}
                            <Text className="text-xs font-medium text-gray-500">Expenses</Text>
                            <TickCrossIndicator checked={item.inExpenses}  />
                        </View>
                    </View>

                     {item.suggestions && (
                                <Text className="text-base text-gray-500 pl-6 pr-4">{item.suggestions}</Text>
                            )
                        }

                    {isPending && (
                        <Text className="text-yellow-600 my-2 text-xs font-medium">
                            {item.id ? "⏳ Status/Update pending sync..." : "⏳ New record pending sync..."}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };
    return (
        <SafeAreaView className="flex-1 bg-blue-50">
            <PageHeader routes="My Projects" />

            <View className="bg-white rounded-md shadow-md flex-row justify-between items-center p-4 m-4">
                <View className="flex-row items-center">
                    <FontAwesome6 name="file-shield" size={20} color="#198754" />
                    <Text className="ml-2 text-lg font-medium text-[#198754]">Add New Project</Text>
                </View>
                <TouchableOpacity onPress={() => router.push("otherPages/projects/addingProject")}>
                    <Ionicons name="add-circle" size={26} color="#10b981" />
                </TouchableOpacity>
            </View>

            <View className="px-4 flex-1">
                <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

                <View className="flex-row items-center border border-gray-300 rounded-lg mb-3 bg-white px-3 mt-4">
                    <Feather name="search" size={20} color="#9ca3af" />
                    <TextInput className="flex-1 ml-2 py-3 text-lg text-[#9ca3af]" placeholder="Search projects..." placeholderTextColor="#9ca3af" value={searchQuery} onChangeText={setSearchQuery} />
                </View>

                {selectionMode && filteredProjects.length > 0 && (
                    <View className="flex-row items-center mb-3 bg-white rounded-lg shadow-sm p-3 px-4">
                        <CheckBox value={selectAll} onClick={handleSelectAll} />
                        <Text className="ml-2 text-lg font-medium text-gray-800">Select All ({selectedProjects.length})</Text>
                    </View>
                )}

                {loading ? (
                    <LoadingSkeleton />
                ) : filteredProjects.length > 0 ? (
                    <FlatList
                        data={filteredProjects}
                        renderItem={renderProject}
                        keyExtractor={(item) => (item.id || item.tempId)?.toString()}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        ListFooterComponent={
                            isConnected && totalPages > 1 ? (
                                <View className="items-center mb-2">
                                    <Pagination
                                        page={page}
                                        totalPages={totalPages}
                                        onPageChange={(newPage) => fetchProjects(newPage)}
                                    />
                                </View>
                            ) : null
                        }
                    />
                ) : (
                    <View className="bg-white rounded-md shadow-md p-4">
                        <Text className="text-lg text-gray-700">
                            You have not saved any projects under the selected status.
                            Saving a project allows you to select it from the list of saved projects.
                             This is useful in tracking shifts, trips, time, as well as fuel consumption or other expenses.

                        </Text>
                    </View>
                )}
            </View>

            {selectionMode && (
                <View className="absolute bottom-0 left-0 right-0 ">
                    <BottomActionBar activeTab={activeTab} toggleStatus={toggleProjectStatus} handleCancel={handleCancel} handleDelete={deleteProjects} />
                </View>
            )}

            <ProjectCountModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSelect={handleSelect}
            />
        </SafeAreaView>
    );
};

export default MyProjects;