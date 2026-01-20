

import React, { useState, useCallback, useContext, useEffect } from "react";
import { FlatList, View, TouchableOpacity, Text, RefreshControl } from "react-native";
import { FontAwesome, FontAwesome5, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";

// --------- Components ---------
import PageHeader from "../../../src/components/PageHeader";
import Tabs from "../../../src/components/Tabs";
import { AddFilterCard } from "../../../src/components/AddEntityCard";
import Input from "../../../src/components/Input";
import LoadingSkeleton from "../../../src/components/LoadingSkeleton";
import BottomActionBar from "../../../src/components/ActionBar";
import CheckBox from "../../../src/components/CheckBox";
import Pagination from "../../../src/components/Pagination";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import ProjectCountModal from "../../../src/components/ProjectCountModal";

// --------- Hooks & Helpers ---------
import { useTheme } from "../../../src/context/ThemeProvider";
import { useAuth } from "../../../src/context/UseAuth";
import { useApi } from "../../../src/hooks/useApi";
import { OfflineContext } from "../../../src/offline/OfflineProvider";
import { readCache, storeCache } from "../../../src/offline/cache";
import { normalizeStatus, mergePendingAndNormalize, parseIconString } from "../../../src/helper";
import usePersistentValue from "../../../src/hooks/usePersistentValue";


const CACHE_KEY = "expense_cache_data";

const Expense = () => {
    const {
        modalVisible,
        storedValue: projectCount,
        saveValue: setProjectCount,
        setModalVisible
    } = usePersistentValue("@my-expense");


    const { get, put, del } = useApi();
    const { showModal, hideModal, setGlobalLoading } = useAuth();
    const { darkMode } = useTheme();
    const { isConnected } = useContext(OfflineContext);

    // Tabs Config
    const tabs = ["vendor", "payment-type", "reporting", "category"];
    const projectStatus = ["Enabled", "Disabled"];
    const [activeTab, setActiveTab] = useState("vendor");
    const [activeStatus, setActiveStatus] = useState("Enabled");
    const [selectAll, setSelectAll] = useState(false);


    // States
    const [data, setData] = useState([]);
    const [filterItem, setFilterItem] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [order, setOrder] = useState("asc");

    // Selection & Pagination
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pendingUpdates, setPendingUpdates] = useState({});

    // --- Helpers ---

    const removeHyphens = (str = "") =>
        str.split("-").map((word, i) => i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)).join("");

    const capitalizeFirst = (str = "") => str.charAt(0).toUpperCase() + str.slice(1);
    const getItemText = (item) => item.vendor || item.payment - type || item.category || item.label || item.title;

    //--get recored through tabs means vendors,category,payment-type etc ----------

    const loadExpenseData = async (pageNumber = 1, currentOrder = order, bypassCache = false) => {
        const statusVal = activeStatus.toLowerCase().trim() === "enabled" ? "enabled" : "disabled";
        const CACHE_TAB_KEY = activeTab;
        const tabPath = activeTab === "reporting" ? "reportings" : `${activeTab}s`;

        try {
            setLoading(true);
            let apiData = [];
            let apiSuccess = false;

            // 1. ONLINE FETCH
            if (isConnected) {
                try {
                    const query = `status=${statusVal}&order=${currentOrder}&limit=${projectCount || 10}&page=${pageNumber}&_t=${Date.now()}`;
                    const res = await get(`my-expenses/${tabPath}?${query}`, { useBearerAuth: true });
                    if (res?.status === "success") {
                        apiData = Array.isArray(res.data) ? res.data : [];
                        apiSuccess = true;
                        setPage(Number(res?.pagination?.current_page) || pageNumber);
                        setTotalPages(Number(res?.pagination?.total_pages) || 1);
                    }
                } catch (err) {
                    console.log("Network error, falling back to cache logic");
                }
            }

            // 2. READ CACHES
            const offlineQueue = (await readCache("offlineQueue")) || [];
            const cachedWrap = (await readCache(CACHE_KEY)) || {};
            const currentTabCached = Array.isArray(cachedWrap[CACHE_TAB_KEY]) ? cachedWrap[CACHE_TAB_KEY] : [];

            const getSafeId = (item) => String(item.id || item.vendor_no || item.tempId || "");

            // 3. MERGING LOGIC (Fix: Offline Fallback Included)
            const mergedMap = new Map();

            // --- STEP A: Data Source Selection ---
            // Agar net hai toh API data, warna Cache data
            const dataSource =
                currentTabCached.length > 0
                    ? currentTabCached
                    : apiData;


            dataSource.forEach(item => {
                const id = getSafeId(item);
                mergedMap.set(id, { ...item, pending: false });
            });

            // --- STEP B: Apply Offline Updates (PUT) ---
            offlineQueue.forEach(q => {
                const isEdit =
                    q.method?.toLowerCase() === "put" &&
                    q.endpoint?.includes(tabPath);

                if (isEdit) {
                    const body = typeof q.body === "string" ? JSON.parse(q.body) : q.body;
                    const id = getSafeId(body);

                    if (mergedMap.has(id)) {
                        mergedMap.set(id, {
                            ...mergedMap.get(id),
                            ...body,
                            pending: true // ✅ ONLY SOURCE OF TRUE
                        });
                    }
                }
            });


            // --- STEP C: Add New Offline Records (POST) ---
            offlineQueue.forEach(q => {
                if (q.endpoint?.includes(tabPath) && q.method?.toLowerCase() === "post") {
                    const body = typeof q.body === "string" ? JSON.parse(q.body) : q.body;
                    const id = getSafeId(body) || `local_${Date.now()}`;
                    if (!mergedMap.has(id)) {
                        mergedMap.set(id, { ...body, tempId: id, id: id, pending: true, status: body.status || statusVal });
                    }
                }
            });

            // 4. FINAL LIST CLEANUP & FILTERING
            // --- Step 4 mein ye logic dalein ---
            let finalList = Array.from(mergedMap.values())
            .map(item => {
                let rawStatus = String(item.status || "").toLowerCase();
                let normStatus = "";

                // API se "a" aata hai, update se "enabled" aata hai
                if (rawStatus === "a" || rawStatus === "active" || rawStatus === "enabled") {
                    normStatus = "enabled";
                } else {
                    normStatus = "disabled";
                }

                return {
                    ...item,
                    pending: !!item.pending,
                    status: normStatus
                };
            })
                .filter(item => item.status === statusVal)

            // Sort: Pending items top par
            finalList.sort((a, b) => (a.pending === b.pending ? 0 : a.pending ? -1 : 1));

            setData(finalList);

            // 5. UPDATE CACHE (Sirf online hone par update karein taake cache fresh rahe)
            if (isConnected && apiSuccess) {
                const cleanList = finalList.map(i => ({
                    ...i,
                    pending: false
                }));

                await storeCache(CACHE_KEY, {
                    ...cachedWrap,
                    [CACHE_TAB_KEY]: cleanList
                });

                setData(cleanList);
                return;
            }



        } catch (err) {
            console.error("LoadExpenseData Error:", err);
        } finally {
            setLoading(false);
        }
    };


    useFocusEffect(
        useCallback(() => {
            const checkActionsAndFetch = async () => {
                try {
                    // Read action flags from cache
                    const newRecord = await readCache("newRecordAdded");
                    const recordDeleted = await readCache("recordDeleted");
                    const recordUpdated = await readCache("recordUpdated");

                    // If any action was performed in another screen, force refresh
                    if (newRecord || recordDeleted || recordUpdated) {
                        await loadExpenseData(1, order, true); // page 1, current order, bypassCache: true

                        // Reset flags
                        if (newRecord) await storeCache("newRecordAdded", false);
                        if (recordDeleted) await storeCache("recordDeleted", false);
                        if (recordUpdated) await storeCache("recordUpdated", false);
                    } else {
                        // Normal focus without explicit changes
                        await loadExpenseData(page, order);
                    }
                } catch (err) {
                    console.error("Focus fetch error:", err);
                }
            };

            checkActionsAndFetch();
        }, [activeTab, activeStatus, isConnected, order])
    );


    // --- when user push up  then get data in desc order---

    const onRefresh = async () => {
        setRefreshing(true);
        // Refresh par hum strictly cache bypass karenge
        setOrder("desc")
        await loadExpenseData(1, order, true);
        setRefreshing(false);
    };

    // ====== delete recored =======

    const deleteExpenses = async () => {
        if (selectedItems.length === 0) {
            showModal("Please select at least one expense to delete.", "error");
            return;
        }


        showModal(
            `You're about to permanently remove the selected ${activeTab}.`,
            "warning",
            `Deleting ${capitalizeFirst(activeTab)}?`,
            [
                {
                    label: "Delete",
                    bgColor: "bg-red-600",
                    onPress: async () => {
                        hideModal();
                        handleCancel();
                        await confirmDeleteExpenses(selectedItems);
                    }
                },
                {
                    label: "Cancel",
                    bgColor: "bg-green-600",
                    onPress: () => {
                        hideModal();
                        handleCancel();
                    }
                }
            ]
        );
    };

    const confirmDeleteExpenses = async (selectedItems) => {
        try {
            setGlobalLoading(true);

            // API ko plural chahiye hota hai
            const apiTabPath = activeTab === "reporting" ? "reportings" : `${activeTab}s`;

            // Cache key humari hamesha singular rahegi (e.g., "vendor")
            const CACHE_TAB_KEY = activeTab;

            const res = await del(
                `my-expenses/${apiTabPath}/delete`,
                { ids: selectedItems },
                { useBearerAuth: true }
            );
            console.log(res);

            if (res?.offline) {
                showModal("Cannot delete in offline mode.", "error");
                return;
            }

            if (res?.status === "success") {
                /* ---------- 1. UI UPDATE ---------- */
                setData(prev =>
                    prev.filter(item => !selectedItems.includes(item.id) && !selectedItems.includes(item.tempId))
                );

                /* ---------- 2. CACHE UPDATE ---------- */
                const cachedWrap = (await readCache(CACHE_KEY)) || {};

                // A. Singular Key Update (Asli logic)
                if (Array.isArray(cachedWrap[CACHE_TAB_KEY])) {
                    cachedWrap[CACHE_TAB_KEY] = cachedWrap[CACHE_TAB_KEY].filter(
                        item => !selectedItems.includes(item.id) && !selectedItems.includes(item.tempId)
                    );
                }

                // B. Safety Clean: Agar ghalti se plural key "vendors" bani hui hai, usey delete kar den
                const pluralKey = `${activeTab}s`;
                if (cachedWrap[pluralKey]) {
                    delete cachedWrap[pluralKey];
                }

                await storeCache(CACHE_KEY, cachedWrap);
                await storeCache("recordDeleted", true);

                showModal(res?.data || res?.message || "Deleted successfully!", "success");
            } else {
                showModal(res?.data || res?.message || "coudnt delete ", "error");
            }

        } catch (err) {
            console.error("Delete error:", err);
            showModal("Something went wrong.", "error");
        } finally {
            setGlobalLoading(false);
            handleCancel();
        }
    };


    const filteredExpensesItems = data.filter(item => getItemText(item).toLowerCase().includes(filterItem.toLowerCase()))

    //---------Cancel it means close the selectionmode etc-----
    const handleCancel = () => {
        setSelectionMode(false);
        setSelectedItems([]);
    };

    //-------select and diselect the expenses recored----------
    const toggleExpensesSelect = (id) => {
        setSelectedItems(prev => {
            // Toggle the id in the selected list
            const isSelected = prev.includes(id);
            const updated = isSelected
                ? prev.filter(i => i !== id)
                : [...prev, id];

            // Check if all CURRENTLY FILTERED items are now selected
            // We use tempId or id to match what is displayed in the list
            const filteredIds = filteredExpensesItems
                .map(item => item.id || item.tempId)
                .filter(Boolean);

            const isEveryFilteredSelected = filteredIds.every(fId => updated.includes(fId));
            setSelectAll(isEveryFilteredSelected);

            return updated;
        });
    };


    const handleSelectAll = () => {
        // Agar filtered list khali hai toh kuch na karein
        if (filteredExpensesItems.length === 0) return;

        // 1. Check karein ke kya sab pehle se hi selected hain?
        const allFilteredSelected = filteredExpensesItems.every(item =>
            selectedItems.includes(item.id || item.tempId)
        );

        if (allFilteredSelected) {
            // --- DESELECT ALL ---
            const filteredIds = filteredExpensesItems.map(item => item.id || item.tempId);
            setSelectedItems(prev => prev.filter(id => !filteredIds.includes(id)));
            setSelectAll(false); // Checkbox ko UNCHECK karo
        } else {
            // --- SELECT ALL ---
            const newIds = filteredExpensesItems.map(item => item.id || item.tempId);
            setSelectedItems(prev => {
                const combinedSet = new Set([...prev, ...newIds]);
                return Array.from(combinedSet);
            });
            setSelectAll(true); // Checkbox ko CHECK (Blue) karo
        }
    };


    //
    // whenever selected item length are changed select all also update
    useEffect(() => {
        if (filteredExpensesItems.length > 0) {
            const isEveryItemChecked = filteredExpensesItems.every(item =>
                selectedItems.includes(item.id || item.tempId)
            );
            setSelectAll(isEveryItemChecked);
        } else {
            setSelectAll(false);
        }
    }, [selectedItems, filteredExpensesItems]);

    // --- RENDER HELPERS ---
    const RenderVendorIcon = ({ item, size = 26, color = "#2563eb" }) => {
        if (!item.icon) return <FontAwesome5 name="store" size={size} color={color} />;
        const { type, icon } = parseIconString(item.icon);
        if (type === "FontAwesome") return <FontAwesome name={icon} size={size} color={color} />;
        if (type === "FontAwesome5") return <FontAwesome5 name={icon} size={size} color={color} />;
        if (type === "MaterialIcons") return <MaterialIcons name={icon} size={size} color={color} />;
        return <Ionicons name={icon} size={size} color={color} />;
    };

    const renderItem = ({ item }) => {
        const id = item.id || item.tempId;
        const isSelected = selectedItems.includes(id);
        console.log("Item ID:", item.id, "Pending:", item.pending);

        return (
            <TouchableOpacity
                onLongPress={() => {
                    // Only start selection mode if item has a real ID (cannot bulk action pending new adds)
                    if (!selectionMode && item.id) {
                        setSelectionMode(true);
                        setSelectedItems([item.id]); // Only select if it has a real ID
                    } else if (selectionMode && item.id) {
                        toggleExpensesSelect(item.id);
                    }

                }}
                onPress={() =>
                    router.push({
                        pathname: `/otherPages/expenses/${removeHyphens(activeTab)}`, params: {
                            id: item.id, order, activeTab, projectCount
                        }
                    })}
                activeOpacity={0.8}
                delayLongPress={500}
            >
                <View className={`
            rounded-lg p-4 shadow-sm border mb-3
            ${isSelected ? darkMode ? "border-blue-500" : " border-blue-700 bg-white" :
                        item.pending ? darkMode ? 'border-yellow-300' : "border-yellow-400 bg-yellow-50" :
                            darkMode ? "border-gray-700" : "bg-white border-gray-100"}
          `}>
                    <View className="flex-row items-center">
                        {selectionMode &&
                            <View className="mr-3">
                                <CheckBox value={item.id ? selectedItems.includes(item.id) : false} onClick={() => item.id && toggleExpensesSelect(item.id)} />
                            </View>}
                        <View className={`w-12 h-12 p-2 rounded-xl border items-center justify-center mr-5 ${darkMode ? "border-gray-700" : "border-gray-400"}`}>
                            <RenderVendorIcon item={item} size={28} />
                        </View>
                        <ThemedText color={"#646060ff"} className="text-lg font-medium">{getItemText(item)}</ThemedText>
                    </View>
                    {item.pending && <Text className="text-yellow-600 mt-3 text-xs font-medium">⏳ Sync pending...</Text>}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreacontext bgColor="#eff6ff" className="flex-1">
            <PageHeader routes="Expense Tracking" />
            <View className="flex-1 px-3 pt-3">
                <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={(t) => { setActiveTab(t); setPage(1); }} className="mb-4" />

                <AddFilterCard
                    title={`Add ${capitalizeFirst(activeTab)}`}
                    onchange={() => router.push(`/otherPages/expenses/${removeHyphens(activeTab)}`)}
                />

                <View className="">
                    <Tabs tabs={projectStatus} activeTab={activeStatus} setActiveTab={(s) => { setActiveStatus(s); setPage(1); }} />
                </View>

                <Input
                    value={filterItem}
                    placeholder="Search items ..."
                    icon={true}
                    onchange={setFilterItem}
                    className={`my-4 ${darkMode ? "bg-transparent" : "bg-white"}`}
                />

                {selectionMode && data.length > 0 && (
                    <ThemedView className="flex-row items-center mb-3  rounded-lg shadow-sm p-3 px-4">
                        <CheckBox value={selectAll} onClick={handleSelectAll} />
                        <ThemedText color="#1f2937" className="ml-2 text-lg font-medium ">Select All ({selectedItems.length})</ThemedText>
                    </ThemedView>
                )}

                {loading ? <LoadingSkeleton count={3} height={105} spacing={15} /> : (
                    <FlatList
                        data={filteredExpensesItems}
                        renderItem={renderItem}
                        keyExtractor={item => (item.id || item.tempId).toString()}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        ListEmptyComponent={!loading && (
                            <ThemedView className="rounded-xl p-8 mt-2 items-center border border-gray-100 shadow-sm">
                                <Ionicons name="receipt-outline" size={60} color="#9ca3af" />
                                <ThemedText className="text-xl font-bold mt-4">No {capitalizeFirst(activeTab)} Found</ThemedText>
                                <ThemedText color="#6b7280" className="text-center mt-2">
                                    You haven't added any {activeTab}s yet. Start tracking your business expenses now.
                                </ThemedText>
                            </ThemedView>
                        )}
                        ListFooterComponent={isConnected && totalPages > 1 && (
                            <Pagination page={page} totalPages={totalPages} onPageChange={(newPage) => loadExpenseData(newPage)} />
                        )}
                        contentContainerStyle={{ paddingBottom: selectionMode ? 80 : 20 }}
                    />
                )}
            </View>


            <ProjectCountModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSelect={(val) => {
                    setProjectCount(val);
                    setFetchProject(true)
                    setModalVisible(false)
                }}
            />

            {selectionMode && (
                <View className="absolute bottom-0 left-0 right-0 ">
                    <BottomActionBar
                        handleDelete={deleteExpenses}
                        handleCancel={handleCancel}
                        toggleStatus={() => console.log("gggg")
                        }
                        activeTab={activeStatus}
                    />
                </View>
            )}
        </SafeAreacontext>
    );
};

export default Expense;