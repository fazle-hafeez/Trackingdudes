

import React, { useState, useCallback, useContext, useEffect } from "react";
import { FlatList, View, TouchableOpacity, Text, RefreshControl } from "react-native";
import { FontAwesome, FontAwesome5, FontAwesome6, MaterialIcons, Ionicons, AntDesign, Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { Svg } from "react-native-svg";


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
import { parseIconString } from "../../../src/helper";
import usePersistentValue from "../../../src/hooks/usePersistentValue";
import { getIconComponent } from "../../../src/utils/getIconComponent";


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
    const tabs = ["vendor", "payment-option", "categories", "reporting"];
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
    const getItemText = (item) => item.vendor || item.payment_option || item.payment_type || item.category || item.label || item.title;

    //--get recored through tabs means vendors,category,payment-type etc ----------


    const loadExpenseData = async (
        pageNumber = 1,
        currentOrder = order,
        bypassCache = false
    ) => {
        const tabPath = activeTab === "reporting" ? "reportings" : activeTab === "categories" ? "categories" : `${activeTab}s`;
        const statusKey = activeStatus.toLowerCase().trim(); // enabled | disabled
        const CACHE_TAB_KEY = activeTab;

        const normalizeStatus = (status = "") => {
            const s = String(status).toLowerCase().trim();
            if (["a", "active", "enabled"].includes(s)) return "enabled";
            return "disabled";
        };

        const getSafeId = (item) =>
            String(item.id || item.vendor_no || item.tempId || "");

        try {
            setLoading(true);

            let apiData = [];
            let apiSuccess = false;

            /* =======================
               1️⃣ ONLINE FETCH (STATUS INCLUDED)
            ======================== */
            if (isConnected) {
                try {
                    const query = `status=${statusKey}&order=${currentOrder}&limit=${projectCount || 10}&page=${pageNumber}&_t=${Date.now()}`;

                    const res = await get(
                        `my-expenses/${tabPath}?${query}`,
                        { useBearerAuth: true }
                    );

                    console.log("fresh api :", res);


                    if (res?.status === "success" && Array.isArray(res.data)) {
                        apiData = res.data;
                        apiSuccess = true;
                        setPage(Number(res?.pagination?.current_page) || pageNumber);
                        setTotalPages(Number(res?.pagination?.total_pages) || 1);
                    }
                } catch (e) {
                    console.log("API failed → offline mode");
                }
            }

            /* =======================
               2️⃣ READ CACHE (STATUS WISE)
            ======================== */
            const cachedWrap = (await readCache(CACHE_KEY)) || {};
            const cachedTab = cachedWrap[CACHE_TAB_KEY] || {};
            const cachedList = Array.isArray(cachedTab[statusKey]) ? cachedTab[statusKey] : [];

            const offlineQueue = (await readCache("offlineQueue")) || [];

            /* =======================
               3️⃣ BASE SOURCE
            ======================== */
            let source = [];
            if (isConnected && apiSuccess) {
                source = apiData; // Fresh data from server
            } else {
                source = cachedList; // Offline fallback
            }
            const mergedMap = new Map();

            source.forEach(item => {
                const id = getSafeId(item);
                mergedMap.set(id, { ...item, pending: !!item.pending, status: normalizeStatus(item.status) });
            });

            /* =======================
               4️⃣ OFFLINE PUT (STATUS TOGGLE)
            ======================== */
            offlineQueue.forEach(q => {
                if (q.method?.toLowerCase() === "put" && q.endpoint?.includes(tabPath)) {
                    const body = typeof q.body === "string" ? JSON.parse(q.body) : q.body;

                    body?.ids?.forEach(id => {
                        const key = String(id);
                        if (mergedMap.has(key)) {
                            mergedMap.set(key, {
                                ...mergedMap.get(key),
                                status: normalizeStatus(body.status),
                                pending: true,
                            });
                        }
                    });
                }
            });

            /* ========================================================
             5️⃣ OFFLINE POST (NEW RECORDS)
             Logic: Prevent duplicates by checking if an item with the 
             same name already exists in the list from API/Cache.
            =========================================================== */
            offlineQueue.forEach(q => {
                // Check if the request is a POST method and belongs to the current tab
                if (q.method?.toLowerCase() === "post" && q.endpoint?.includes(tabPath)) {
                    const body = typeof q.body === "string" ? JSON.parse(q.body) : q.body;

                    // Extract a "display name" based on the tab type (Category, Vendor, or Payment Option)
                    const newItemName = (body.category || body.vendor || body.payment_option || body.title || "").toLowerCase().trim();

                    // Check if any item already in the Map matches this name
                    const isDuplicate = Array.from(mergedMap.values()).some(existingItem => {
                        const existingName = (existingItem.category || existingItem.name || existingItem.vendor || existingItem.payment_option || "").toLowerCase().trim();
                        return existingName === newItemName && newItemName !== "";
                    });

                    // Only add to the list if it's not already there (prevents double entries)
                    if (!isDuplicate) {
                        const id = getSafeId(body) || `local_${Date.now()}`;
                        mergedMap.set(id, {
                            ...body,
                            id,
                            tempId: id,
                            pending: true, // Mark as pending so UI can show a loader/icon
                            status: normalizeStatus(body.status),
                        });
                    }
                }
            });

            const finalList = Array.from(mergedMap.values())
                .sort((a, b) =>
                    a.pending === b.pending ? 0 : a.pending ? -1 : 1
                );

            setData(finalList);

            /* =======================
               6️⃣ UPDATE CACHE (STATUS WISE)
            ======================== */
            if (isConnected && apiSuccess) {
                // API se jo data aaya hai, usey clean karein
                const apiFreshData = apiData.map(i => ({ ...i, pending: false }));

                // Sirf CURRENT TAB aur CURRENT STATUS ka cache update karein
                const updatedTabContent = {
                    ...(cachedWrap[CACHE_TAB_KEY] || {}),
                    [statusKey]: apiFreshData, // update ur cashe with fresh data remove old data
                };

                const updatedGlobalCache = {
                    ...cachedWrap,
                    [CACHE_TAB_KEY]: updatedTabContent
                };

                // Cache mein save karein
                await storeCache(CACHE_KEY, updatedGlobalCache);

                // UI mein wahi list dikhayein jo API + Offline Queue se bani hai
                setData(finalList);
            } else {
                // Agar offline hain to cached list dikhayein
                setData(finalList);
            }


        } catch (err) {
            console.error("loadExpenseData error:", err);
        } finally {
            setLoading(false);
        }
    };


    useFocusEffect(
        useCallback(() => {
            const refreshScreenData = async () => {
                // Read flags to see if we need a hard refresh
                const isNew = await readCache("newRecordAdded");
                const isDeleted = await readCache("recordDeleted");
                const isUpdated = await readCache("recordUpdated");

                if (isNew || isDeleted || isUpdated) {
                    // Force load page 1 with fresh API data
                    await loadExpenseData(1, order, true);

                    // Clear flags immediately after refresh
                    await storeCache("newRecordAdded", false);
                    await storeCache("recordDeleted", false);
                    await storeCache("recordUpdated", false);
                } else {
                    // Regular focus load
                    await loadExpenseData(page, order, false);
                }
            };

            refreshScreenData();
        }, [activeTab, activeStatus, isConnected, order, page]) // Added 'page' to dependencies
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

            const apiTabPath = activeTab === "reporting" ? "reportings" : activeTab === "categories" ? "categories" : `${activeTab}s`;

            // Cache key  (e.g., "vendor")
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


    // ---------------- ENABLE / DISABLE EXPENSE ITEMS ----------------
    const toggleExpense = async () => {
        if (selectedItems.length <= 0) {
            showModal(`Please select at least one ${activeTab}.`, "error");
            return;
        }

        // Filter out items that are still pending (don't have real server IDs)
        const validSelection = selectedItems.filter(id => id && !String(id).startsWith('local_'));

        if (validSelection.length === 0) {
            showModal("Pending items cannot be updated until they are synced.", "error");
            return;
        }

        const isCurrentlyEnabled = activeStatus.toLowerCase() === "enabled";
        const newStatus = isCurrentlyEnabled ? "disabled" : "enabled";
        const actionWord = isCurrentlyEnabled ? "Disable" : "Enable";

        showModal(
            `You're about to ${actionWord.toLowerCase()} the selected ${activeTab}s. Do you want to continue?`,
            "warning",
            `${actionWord} ${capitalizeFirst(activeTab)}`,
            [
                {
                    label: `Yes, ${actionWord}`,
                    bgColor: "bg-blue-600",
                    onPress: async () => {
                        hideModal();
                        await changeExpenseStatus(newStatus, validSelection);
                    },
                },
                {
                    label: "Back",
                    bgColor: "bg-gray-500",
                    onPress: () => {
                        hideModal();
                        handleCancel();
                    },
                },
            ]
        );
    };

    const changeExpenseStatus = async (status, selectedIds) => {
        try {
            setGlobalLoading(true);

            const tabPath = activeTab === "reporting" ? "reportings" : activeTab === "categories" ? "categories" : `${activeTab}s`;
            const endpoint = `my-expenses/${tabPath}/mark`;
            const payload = { status, ids: selectedIds.map(id => parseInt(id, 10)) };

            let isOffline = false;
            let result;

            try {
                result = await put(endpoint, payload, { useBearerAuth: true });
                if (!result || result.offline) isOffline = true;
            } catch {
                isOffline = true;
            }

            const fromStatus = activeStatus.toLowerCase(); // current tab status
            const toStatus = status.toLowerCase();

            /* ======================
               1️⃣ UPDATE UI IMMEDIATELY
            ====================== */
            setData(prev =>
                prev
                    .map(item => selectedIds.includes(item.id)
                        ? { ...item, status: toStatus, pending: isOffline }
                        : item
                    )
                    .filter(item => item.status.toLowerCase() === fromStatus)
            );

            /* ======================
               2️⃣ UPDATE CACHE
            ====================== */
            const cachedWrap = (await readCache(CACHE_KEY)) || {};
            const tabCache = cachedWrap[activeTab] || {};

            const fromList = Array.isArray(tabCache[fromStatus]) ? tabCache[fromStatus] : [];
            const toList = Array.isArray(tabCache[toStatus]) ? tabCache[toStatus] : [];

            const movedItems = [];
            const remainingFrom = fromList.filter(item => {
                if (selectedIds.includes(item.id)) {
                    movedItems.push({
                        ...item,
                        status: toStatus,
                        pending: isOffline,
                    });
                    return false;
                }
                return true;
            });

            cachedWrap[activeTab] = {
                ...tabCache,
                [fromStatus]: remainingFrom,
                [toStatus]: [...movedItems, ...toList],
            };

            await storeCache(CACHE_KEY, cachedWrap);

            /* ======================
               3️⃣ HANDLE PENDING UPDATES
            ====================== */
            const pendingCache = (await readCache("pendingUpdates")) || {};
            pendingCache[activeTab] = pendingCache[activeTab] || {};

            if (isOffline) {
                selectedIds.forEach(id => {
                    pendingCache[activeTab][id] = {
                        status: toStatus,
                        timestamp: Date.now(),
                    };
                });
                await storeCache("pendingUpdates", pendingCache);

                showModal(
                    `Status updated to ${status} (Offline). Will sync later.`,
                    "warning"
                );
            } else {
                // Online: remove from pendingUpdates
                if (pendingCache[activeTab]) {
                    selectedIds.forEach(id => delete pendingCache[activeTab][id]);
                    await storeCache("pendingUpdates", pendingCache);
                }

                showModal(result?.message || "Status updated successfully!", "success");
            }

            handleCancel();

        } catch (err) {
            console.error("Toggle Status Error:", err);
            showModal("Something went wrong.", "error");
        } finally {
            setGlobalLoading(false);
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

    const RenderIcons = ({ item, size = 26, color = "#2563eb" }) => {
        if (!item.icon || item.icon === "undefined:undefined") {
            // Fallback: try icon from vendor nme
            return getSvgIconByVendor(item.vendor, size, color);
        }

        const iconData = parseIconString(item.icon);
        const { type, icon } = iconData;
        const types = type?.toLowerCase();

        switch (types) {
            case "svgicon":
            case "svg":
                // Complete tab-to-icon-type mapping
                const iconType = getIconTypeFromTab(activeTab);
                console.log(` Loading ${icon} as ${iconType} from ${activeTab} tab`);

                const SvgComponent = getIconComponent(icon, iconType);
                if (!SvgComponent) {
                    console.log(` SVG not found: ${icon} in ${iconType} folder`);
                    return null;
                }
                return (
                    <Svg width={size} height={size} viewBox="0 0 64 64" fill={color}>
                        <SvgComponent width={size * 2} height={size * 2} />
                    </Svg>
                );

            // ... rest of font icons same
            case "fa":
            case "font":
                return <FontAwesome name={icon} size={size} color={color} />;
            case "fa5":
            case "font5":
                return <FontAwesome5 name={icon} size={size} color={color} />;

            case "fa6":
                return <FontFace name={icon} size={size} color={color} />;

            case "ant":
                return <AntDesign name={icon} size={size} color={color} />;

            case "fth":
                return <Feather name={icon} size={size} color={color} />;

            case "mater":
            case "mat":
                return <MaterialIcons name={icon} size={size} color={color} />;

            case "ion":
                return <Ionicons name={icon} size={size} color={color} />;
            default:
                return <Ionicons name={icon || "help-circle"} size={size} color={color} />;
        }
    };

    // Tab to Icon Type mapping
    const getIconTypeFromTab = (tab) => {
        const tabMapping = {
            "vendor": "vendor",
            "payment-option": "payment",
            "categories": "category",
            "reporting": "vendor", // fallback
            "vendor": "vendor" // explicit
        };
        return tabMapping[tab] || "vendor";
    };

    // Vendor fallback helper
    const getSvgIconByVendor = (vendorName, size, color) => {
        if (!vendorName) return <Ionicons name="storefront" size={size} color={color} />;

        const vendorKey = vendorName.toLowerCase().replace(/\s+/g, '');

        // Try vendor folder first
        let SvgComponent = getIconComponent(vendorKey, "vendor");
        if (SvgComponent) return renderSvg(SvgComponent, size, color);

        // Try payment folder
        SvgComponent = getIconComponent(vendorKey, "payment");
        if (SvgComponent) return renderSvg(SvgComponent, size, color);

        // Try category folder
        SvgComponent = getIconComponent(vendorKey, "category");
        if (SvgComponent) return renderSvg(SvgComponent, size, color);

        return <Ionicons name="storefront" size={size} color={color} />;
    };

    const renderSvg = (SvgComponent, size, color) => (
        <Svg width={size} height={size} viewBox="0 0 64 64" fill={color}>
            <SvgComponent width={size * 2} height={size * 2} />
        </Svg>
    );



    const renderItem = ({ item }) => {
        const id = item.id || item.tempId;
        const isSelected = selectedItems.includes(id);

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
                            id: item.id, activeStatus
                        }
                    })}
                activeOpacity={0.8}
                delayLongPress={500}
            >
                <View className={`
            rounded-lg p-4 shadow-md border mb-3
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
                            <RenderIcons item={item} size={28} />
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
                <Tabs
                    multiText={true}
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={(t) => { setActiveTab(t); setPage(1); }}
                    className="mb-4"
                />

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
                            <ThemedView className="rounded-xl p-8  items-center shadow-md">
                                <Ionicons name="receipt-outline" size={60} color="#9ca3af" />
                                <ThemedText className="text-xl font-medium mt-4">No {capitalizeFirst(activeTab)} Found</ThemedText>
                                <ThemedText color="#6b7280" className="text-center text-lg leading-6 mt-2">
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
                        toggleStatus={toggleExpense}
                        activeTab={activeStatus}
                    />
                </View>
            )}
        </SafeAreacontext>
    );
};

export default Expense;