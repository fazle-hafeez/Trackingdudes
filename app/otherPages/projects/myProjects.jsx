import { View, Text, TouchableOpacity, FlatList, RefreshControl, StatusBar } from "react-native";
import React, { useCallback, useState, useEffect, useContext } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { FontAwesome6, Feather, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// -----Hooks----------
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";
import { readCache, storeCache } from "../../../src/offline/cache";
import { OfflineContext } from "../../../src/offline/OfflineProvider";
import { useTheme } from "../../../src/context/ThemeProvider";
import { normalizeStatus, mergePendingAndNormalize } from "../../../src/helper";
import usePersistentValue from "../../../src/hooks/usePersistentValue";

//------- Components-------
import TickCrossIndicator from '../../../src/components/TickCrossIndicator';
import Input from "../../../src/components/Input";
import CheckBox from "../../../src/components/CheckBox";
import Pagination from "../../../src/components/Pagination";
import LoadingSkeleton from "../../../src/components/LoadingSkeleton";
import Tabs from "../../../src/components/Tabs";
import PageHeader from "../../../src/components/PageHeader";
import BottomActionBar from "../../../src/components/ActionBar";
import ProjectCountModal from "../../../src/components/ProjectCountModal";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import { AddItemCard } from "../../../src/components/AddEntityCard";

const CACHE_KEY = "my-projects";

const MyProjects = () => {
    const { get, del, put } = useApi();
    const { darkMode } = useTheme()
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
    const inputBgColor = darkMode ? 'bg-transparent' : 'bg-white'
    // NEW: Project limit states (from MyVehicles)
    const [fetchProject, setFetchProject] = useState(false);

    // Track pending offline updates (project id -> status string OR true)
    const [pendingUpdates, setPendingUpdates] = useState({});

    //  Custom reusable hook (only change key per page)
    const {
        modalVisible,
        storedValue: projectCount,
        saveValue: setProjectCount,
        setModalVisible
    } = usePersistentValue("@my-projects-count");

    const parseFlag = (v) => {
        if (v === true || v === "1" || v === 1) return true;
        return false;
    };

    useEffect(() => {
        if (projectCount) setFetchProject(true);
    }, [projectCount]);


    // -------------------- FETCH PROJECTS --------------------
    const fetchProjects = async (pageNumber = 1, currentOrder = order, shouldUpdateCache = false) => {
        const fetchStatus = activeTab.toLowerCase();
        try {
            setLoading(true);

            const result = await get(
                `my-projects?status=${fetchStatus}&order=${currentOrder}&limit=${projectCount}&page=${pageNumber}&_t=${isConnected ? Date.now() : 0}`,
                true
            );

            let projectsData = Array.isArray(result?.data) ? result.data : [];

            if (isConnected && result?.pagination) {
                setPage(result?.pagination?.current_page || pageNumber);
                setTotalPages(result?.pagination?.total_pages || 1);
            } else {
                setPage(1);
                setTotalPages(1);
            }

            // Read caches
            const cachedPendingRaw = await readCache("pendingUpdates") || {};
            const cachedPending = mergePendingAndNormalize(cachedPendingRaw);

            const allCachedWrap = await readCache(CACHE_KEY) || { data: [] };
            const allCached = Array.isArray(allCachedWrap.data) ? allCachedWrap.data : [];

            // Offline queue
            const offlineQueue = (await readCache("offlineQueue")) || [];
            const pendingAdds = offlineQueue
                .filter(i => i.endpoint?.includes("create-project") && i.method === "post")
                .map(i => ({
                    ...i.body,
                    tempId: i.body.tempId || i.body.id || `local_${Date.now()}`,
                    pending: true,
                    status: normalizeStatus(i.body.status) || "enabled",
                }));

            // Merge all projects uniquely
            const mergedMap = new Map();

            // 1) Existing online data
            projectsData.forEach(p => {
                const key = p.id || p.tempId;
                mergedMap.set(key, { ...p, pending: false, status: normalizeStatus(p.status) || fetchStatus });
            });

            // 2) Pending offline adds
            pendingAdds.forEach(p => {
                const key = p.tempId;
                if (!mergedMap.has(key)) {
                    mergedMap.set(key, { ...p, pending: true, status: normalizeStatus(p.status) || fetchStatus });
                }
            });

            // 3) Items moved due to pending status update
            allCached.forEach(item => {
                const id = item.id || item.tempId;
                const pendingStatus = cachedPending[id];
                if (id && pendingStatus) {
                    mergedMap.set(id, { ...item, status: pendingStatus, pending: true });
                }
            });

            // Convert Map to array & parse flags
            let finalList = Array.from(mergedMap.values())
                .map(p => ({
                    ...p,
                    inShift: parseFlag(p.inShift) || parseFlag(p.in_shifts),
                    inTrips: parseFlag(p.inTrips) || parseFlag(p.in_trips),
                    inTimes: parseFlag(p.inTimes) || parseFlag(p.in_times),
                    inExpenses: parseFlag(p.inExpenses) || parseFlag(p.in_expenses),
                    pending: !!p.pending,
                    status: normalizeStatus(p.status) || fetchStatus,
                }))

                .filter(p => normalizeStatus(p.status) === fetchStatus);

            setProjects(finalList);

            // Update cache if online or forced
            if (isConnected || shouldUpdateCache) {
                await storeCache(CACHE_KEY, { data: finalList, timestamp: Date.now() });
            }

        } catch (error) {
            console.error("Error fetching projects, falling back to cache:", error);

            // Offline fallback
            const cachedWrap = await readCache(CACHE_KEY) || { data: [] };
            const cached = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];
            const offlineQueue = (await readCache("offlineQueue")) || [];

            const pendingAdds = offlineQueue
                .filter(i => i.endpoint?.includes("create-project") && i.method === "post")
                .map(i => ({
                    ...i.body,
                    tempId: i.body.tempId || i.body.id || `local_${Date.now()}`,
                    pending: true,
                }));

            // Merge uniquely using Map
            const mergedMap = new Map();
            cached.forEach(p => mergedMap.set(p.id || p.tempId, p));
            pendingAdds.forEach(p => mergedMap.set(p.tempId, p));

            const finalList = Array.from(mergedMap.values())
                .map(p => ({
                    ...p,
                    inShift: parseFlag(p.inShift) || parseFlag(p.in_shifts),
                    inTrips: parseFlag(p.inTrips) || parseFlag(p.in_trips),
                    inTimes: parseFlag(p.inTimes) || parseFlag(p.in_times),
                    inExpenses: parseFlag(p.inExpenses) || parseFlag(p.in_expenses),

                    pending: !!p.pending,
                    status: normalizeStatus(p.status) || fetchStatus,
                }))
                .filter(p => normalizeStatus(p.status) === fetchStatus);

            setProjects(finalList);
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

            const checkActionsAndFetch = async () => {
                try {
                    // Read action flags
                    const newRecord = await readCache("newRecordAdded");
                    const recordDeleted = await readCache("recordDeleted");
                    const recordUpdated = await readCache("recordUpdated");

                    // If any action happened, force cache update
                    if (newRecord || recordDeleted || recordUpdated) {
                        await fetchProjects(1, order, true); // Force cache refresh

                        // Reset flags after fetch
                        if (newRecord) await storeCache("newRecordAdded", false);
                        if (recordDeleted) await storeCache("recordDeleted", false);
                        if (recordUpdated) await storeCache("recordUpdated", false);
                    } else {
                        await fetchProjects(1); // normal fetch
                    }
                } catch (err) {
                    console.error("Focus fetch error:", err);
                }
            };

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
        setSelectedProjects(prev => {
            let updated;
            if (prev.includes(id)) {
                updated = prev.filter(i => i !== id);
            } else {
                updated = [...prev, id];
            }

            const filteredIds = projects
                .filter(item => item?.project?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(item => item.id)
                .filter(Boolean);

            setSelectAll(updated.length === filteredIds.length);
            return updated;
        });
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
                await storeCache(CACHE_KEY, { data: updatedCache });
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

    // filter throught input =========
    const filteredProjects = React.useMemo(() => {
        return projects.filter((item) =>
            item?.project?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [projects, searchQuery])


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
                <ThemedView className={` rounded-lg shadow-sm p-4 ${isPending ? "border-2 border-yellow-400 bg-yellow-50" : ""}`}
                    style={{ elevation: 5 }}>
                    <View className={` ${darkMode ? 'border-gray-700' : 'border-orange-300'} 
                      flex-row items-center border-b  pb-2 mb-2`}>
                        <View className="flex-row items-center flex-1">
                            {selectionMode && (
                                // Only show checkbox/allow selection if it has a real ID
                                <CheckBox value={item.id ? selectedProjects.includes(item.id) : false} onClick={() => item.id && toggleProjectSelect(item.id)} />
                            )}
                            <FontAwesome5 name="folder-open" size={20} color="#3b82f6" className="ml-2" />
                            <ThemedText color={'#374151'} className="text-lg font-semibold ml-2">{item.project}</ThemedText>
                        </View>

                    </View>

                    <View className="flex-row justify-between items-center my-3">
                        {/* Shifts - */}
                        <View className="items-center flex-1">
                            <FontAwesome5 name="clock" size={20} color="#14b8a6" className="mb-1" />
                            <ThemedText color={'#6b7280'} className="text-xs font-medium ">Shifts</ThemedText>
                            <TickCrossIndicator checked={item.inShift} />
                        </View>

                        {/* Trips - */}
                        <View className="items-center flex-1">
                            <FontAwesome5 name="route" size={20} color="#6366f1" className="mb-1" />
                            <ThemedText color={'#6b7280'} className="text-xs font-medium">Trips</ThemedText>
                            <TickCrossIndicator checked={item.inTrips} />
                        </View>

                        {/* Times - */}
                        <View className="items-center flex-1">
                            <FontAwesome5 name="hourglass-half" size={20} color="#f97316" className="mb-1" />
                            <ThemedText color={'#6b7280'} className="text-xs font-medium ">Times</ThemedText>
                            <TickCrossIndicator checked={item.inTimes} />
                        </View>

                        {/* Expenses - */}
                        <View className="items-center flex-1">
                            <FontAwesome5 name="receipt" size={20} color="#059669" className="mb-1" />
                            <ThemedText color={'#6b7280'} className="text-xs font-medium ">Expenses</ThemedText>
                            <TickCrossIndicator checked={item.inExpenses} />
                        </View>
                    </View>

                    {item.suggestions && (
                        <ThemedText color={'#6b7280'} className="text-base  pl-6 pr-4">{item.suggestions}</ThemedText>
                    )
                    }

                    {isPending && (
                        <Text className="text-yellow-600 my-2 text-xs font-medium">
                            {item.id ? "⏳ Status/Update pending sync..." : "⏳ New record pending sync..."}
                        </Text>
                    )}
                </ThemedView>
            </TouchableOpacity>
        );
    };
    return (
        <SafeAreacontext bgColor={'#eff6ff'} className="flex-1">
            <PageHeader routes="My Projects" />

            <AddItemCard 
              className="mx-3 my-4"
              title="Add New Project"  
              icon={<FontAwesome6 name="file-shield" size={20} color="#10b981" />}   
              onchange={()=>router.push("otherPages/projects/addingProject")}       
            />

            <View className="px-3 flex-1">
                <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
                <Input
                    className={`${inputBgColor} my-4 `}
                    placeholder="Search projects..."
                    value={searchQuery}
                    onchange={setSearchQuery}
                    icon={true}
                    border={false}
                    elevation={1}

                />

                {selectionMode && filteredProjects.length > 0 && (
                    <ThemedView className="flex-row items-center mb-3 bg-white rounded-lg shadow-sm p-3 px-4">
                        <CheckBox value={selectAll} onClick={handleSelectAll} />
                        <ThemedText color={"#1f2937"} className="ml-2 text-lg font-medium ">
                            Select All ({selectedProjects.length})
                        </ThemedText>
                    </ThemedView>
                )}

                {loading ? (
                    <LoadingSkeleton  height={99}/>
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
                    <ThemedView className=" rounded-lg shadow-md p-4" style={{ eveltion: 5 }}>
                        <Ionicons name="receipt-outline" size={58} color="#9ca3af"  className="mx-auto my-4"/>
                        <ThemedText color={'#374151'} className="text-lg ">
                            You have not saved any projects under the selected status.
                            Saving a project allows you to select it from the list of saved projects.
                            This is useful in tracking shifts, trips, time, as well as fuel consumption or other expenses.

                        </ThemedText>
                    </ThemedView>
                )}
            </View>

            {selectionMode && (
                <View className="absolute bottom-0 left-0 right-0 ">
                    <BottomActionBar
                        activeTab={activeTab}
                        toggleStatus={toggleProjectStatus}
                        handleCancel={handleCancel}
                        handleDelete={deleteProjects}
                    />
                </View>
            )}

            <ProjectCountModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSelect={(val) => {
                    setProjectCount(val);
                    setFetchProject(true)
                    setModalVisible(false)
                }}
            />
        </SafeAreacontext>
    );
};

export default MyProjects;