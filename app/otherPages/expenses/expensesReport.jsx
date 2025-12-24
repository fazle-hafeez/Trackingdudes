import React, { useState, useEffect, useContext, useMemo } from "react";
import { View, FlatList, TouchableOpacity, Text } from "react-native";
import { FontAwesome6, Ionicons, FontAwesome } from "@expo/vector-icons";
import { router } from "expo-router";

// Contexts / Hooks
import { useTheme } from "../../../src/context/ThemeProvider";
import { useAuth } from "../../../src/context/UseAuth";
import { OfflineContext } from "../../../src/offline/OfflineProvider";
import usePersistentValue from "../../../src/hooks/usePersistentValue";
import { readCache, storeCache } from "../../../src/offline/cache";


// Components
import Tabs from "../../../src/components/Tabs";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import PageHeader from "../../../src/components/PageHeader";
import ProjectCountModal from "../../../src/components/ProjectCountModal";
import Input from "../../../src/components/Input";
import { AddFilterCard, FilterChip } from "../../../src/components/AddEntityCard";
import LoadingSkeleton from "../../../src/components/LoadingSkeleton";
import CheckBox from "../../../src/components/CheckBox";
import BottomActionBar from "../../../src/components/ActionBar";
import Pagination from "../../../src/components/Pagination";

const Expenses = () => {

    //  Custom reusable hook (only change key per page)
    const {
        modalVisible,
        storedValue: fetchExpense,
        saveValue: setFetchExpense,
        setModalVisible
    } = usePersistentValue("@expense-tracking");

    const { showModal, hideModal } = useAuth();
    const { isConnected } = useContext(OfflineContext);
    const { darkMode } = useTheme();

    const timeFilters = ["this-week", "prev-week", "this-month", "others"];
    const CURRENT_DATE = "10-13 2025";

    // UI states
    const [activeTab, setActiveTab] = useState("this-week");
    const [searchQuery, setSearchQuery] = useState("");

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [loading, setLoading] = useState(true);
    const [showExpensesReport, setShowExpensesReport] = useState(false);

    // Selection states
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedExpenses, setSelectedExpenses] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    const inputBgColor = darkMode ? "bg-transparent" : "bg-white";

    //  Enable expenses table when user selects value
    useEffect(() => {
        if (fetchExpense !== null) {
            setShowExpensesReport(true);
        }
    }, [fetchExpense]);

    // Demo data

    // const fetchExpenses = async (pageNumber = 1, shouldUpdateCache = false) => {
    //     try {
    //         setLoading(true);

    //         const limit = fetchExpense || 10;

    //         // 1️⃣ API call
    //         const result = await get(
    //             `expenses?limit=${limit}&page=${pageNumber}&_t=${isConnected ? Date.now() : 0}`,
    //             { useBearerAuth: true }
    //         );

    //         let expensesData = Array.isArray(result?.data) ? result.data : [];

    //         // 2️⃣ Read offlineQueue new expenses
    //         const offlineQueue = await readCache("offlineQueue") || [];
    //         const pendingItems = offlineQueue
    //             .filter(i => i.endpoint?.includes("create-expense") && i.method === "post")
    //             .map(i => ({ ...i.body, tempId: i.body.tempId || Date.now(), pending: true }));

    //         pendingItems.forEach(p => {
    //             const exists = expensesData.find(v => v.id === p.id || v.tempId === p.tempId);
    //             if (!exists) expensesData.push(p);
    //         });

    //         // 3️⃣ Apply pending edits / deleted
    //         const cachedPendingRaw = await readCache("pendingUpdates") || {};
    //         const cachedPending = mergePendingAndNormalize(cachedPendingRaw);

    //         expensesData = expensesData.map(v => {
    //             const id = v.id || v.tempId;
    //             const pending = cachedPending[id];
    //             return pending ? { ...v, pending: true, ...pending } : v;
    //         });

    //         // 4️⃣ Filter by time tab (optional)
    //         // For example, this-week / prev-week etc
    //         // expensesData = expensesData.filter(v => matchesTimeFilter(v.date, activeTab));

    //         setExpensesReports(expensesData);

    //         // 5️⃣ Update cache
    //         if (expensesData.length > 0 && (isConnected || shouldUpdateCache)) {
    //             await storeCache("@expenses-cache", { data: expensesData, timestamp: Date.now() });
    //         }

    //     } catch (err) {
    //         console.log("Expenses API error:", err);

    //         // fallback to cache
    //         const cachedWrap = await readCache("@expenses-cache") || { data: [] };
    //         const cached = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];
    //         const cachedPendingRaw = await readCache("pendingUpdates") || {};
    //         const cachedPending = mergePendingAndNormalize(cachedPendingRaw);

    //         const safeCachedData = cached.map(item => {
    //             const id = item.id || item.tempId;
    //             const pending = cachedPending[id];
    //             return pending ? { ...item, pending: true, ...pending } : item;
    //         });

    //         setExpensesReports(safeCachedData);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const [expensesReports, setExpensesReports] = useState([
        { id: "1", project: "Mosque Project", amount: "$1200", date: "02/03/2025", vendor: "ABC Supplier", paymentType: "Bank", category: "Construction" },
        { id: "2", project: "School Repair", amount: "$800", date: "05/03/2025", vendor: "XYZ Store", paymentType: "Cash", category: "Maintenance" },
        { id: "3", project: "Hospital Plumbing", amount: "$1500", date: "10/03/2025", vendor: "Khan Traders", paymentType: "Bank", category: "Plumbing" },
        { id: "4", project: "Road Maintenance", amount: "$600", date: "15/03/2025", vendor: "RoadFix Co.", paymentType: "Cash", category: "Infrastructure" },
        { id: "5", project: "Office Supplies", amount: "$300", date: "18/03/2025", vendor: "OfficePro", paymentType: "Online", category: "Stationary" },

    ]);

    // Simulate loading after selecting count
    useEffect(() => {
        if (!showExpensesReport) return;
        const t = setTimeout(() => setLoading(false), 1200);
        return () => clearTimeout(t);
    }, [showExpensesReport]);

    // Delete
    const deleteExpense = () => {
        if (selectedExpenses.length === 0) {
            showModal("Please select at least one item to perform this action", "error");
            return;
        }

        showModal(
            "You're about to permanently remove selected item...",
            "warning",
            "Deleting item?",
            [
                { label: "Yes, delete", bgColor: "bg-red-600", onPress: () => { hideModal(); confirmDelete(selectedExpenses); } },
                { label: "Cancel", bgColor: "bg-green-600", onPress: () => { hideModal(); handleCancel(); } },
            ]
        );
    };

    const confirmDelete = (ids) => {
        const updated = expensesReports.filter(item => !ids.includes(item.id));
        setExpensesReports(updated);
        showModal(`${ids.length} record(s) deleted successfully`, "success");
        handleCancel();

        // setExpensesReports(prev => prev.filter(v => !ids.includes(v.id)));
        // const cachedWrap = await readCache(CACHE_KEY) || { data: [] };
        // const cachedList = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];
        // const updatedCache = cachedList.filter(v => !ids.includes(v.id));
        // await storeCache(CACHE_KEY, { data: updatedCache });
        // await storeCache("recordDeleted", true);
        // showModal(res.data || "Projects deleted successfully.", "success");
        // handleCancel();
    };

    const handleSelectAll = () => {
        setSelectAll(prev => {
            const next = !prev;
            const validIds = filteredExpenses.map(v => v.id).filter(Boolean);
            setSelectedExpenses(next ? validIds : []);
            return next;
        });
    };

    const toggleSelect = (id) => {
        setSelectedExpenses(prev => {
            let updated;
            if (prev.includes(id)) updated = prev.filter(v => v !== id);
            else updated = [...prev, id];

            const allIds = filteredExpenses.map(v => v.id).filter(Boolean);
            setSelectAll(updated.length === allIds.length);

            return updated;
        });
    };

    const handleCancel = () => {
        setSelectionMode(false);
        setSelectedExpenses([]);
    };

    // Search filter
    const filteredExpenses = useMemo(() => {
        return expensesReports.filter(item =>
            item.category?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [expensesReports, searchQuery]);

    // Single Item Renderer
    const ExpenseItem = ({ item }) => {
        const isSelected = selectedExpenses.includes(item.id);

        return (
            <TouchableOpacity
                onLongPress={() => {
                    if (!selectionMode) {
                        setSelectionMode(true);
                        setSelectedExpenses([item.id]);
                    }
                }}
                onPress={() => {
                    if (selectionMode) toggleSelect(item.id);
                    else router.push({ pathname: "/otherPages/expenses/addExpenses", params: { id: item.id } });
                }}
                activeOpacity={0.8}
                className="mb-4"
            >
                <View
                    className={`rounded-xl p-4 shadow-sm border  flex-row
                        ${isSelected
                            ? darkMode ? "border-blue-500  " : "border-blue-500 bg-white"
                            : item.pending // <-- offline/pending items
                                ? darkMode ?  "border-gray-700 " : "border-yellow-400 bg-yellow-50"
                                : darkMode ? "border-gray-700 " : 'bg-white border-gray-100'
                        }`}
                    style={{ elevation: 5 }}
                >

                    <View className="flex-1">

                        <View className="flex-row justify-between items-center mb-4">
                            <View className="flex-row items-center">
                                {selectionMode && (
                                    <CheckBox
                                        value={isSelected}
                                        onClick={() => toggleSelect(item.id)}
                                        className="mr-3"
                                    />
                                )}
                                <View className="bg-purple-100 p-2 rounded-full mr-1">
                                    <Ionicons name="pricetag-outline" size={16} color="#7c3aed" />
                                </View>
                                <View className="ml-2">
                                    <ThemedText className="text-base font-semibold">{item.category}</ThemedText>
                                    <ThemedText>{item.date}</ThemedText>
                                </View>
                            </View>

                            <ThemedText>{item.amount}</ThemedText>
                        </View>

                        <View className={`${darkMode ? "border-gray-500" : "border-yellow-400"} mb-5 border-b`} />

                        <View className="flex-row justify-between mb-3">
                            <View className="flex-row items-center w-[48%]">
                                <View className="bg-green-100 p-2 rounded-full mr-2">
                                    <FontAwesome name="credit-card" size={16} color="#15803d" />
                                </View>
                                <View>
                                    <ThemedText className="text-xs text-gray-400">Payment Type</ThemedText>
                                    <ThemedText>{item.paymentType}</ThemedText>
                                </View>
                            </View>

                            <View className="flex-row items-center w-[48%]">
                                <View className="bg-orange-100 p-2 rounded-full mr-2">
                                    <Ionicons name="storefront-outline" size={16} color="#c2410c" />
                                </View>
                                <View>
                                    <ThemedText className="text-xs text-gray-400">Vendor</ThemedText>
                                    <ThemedText>{item.vendor}</ThemedText>
                                </View>
                            </View>
                        </View>

                        <View className="flex-row justify-between">
                            <View className="flex-row items-center w-[48%]">
                                <View className="bg-blue-100 p-2 rounded-full mr-2">
                                    <FontAwesome6 name="folder-open" size={16} color="#2563eb" />
                                </View>
                                <View>
                                    <ThemedText className="text-xs text-gray-400">Project</ThemedText>
                                    <ThemedText>{item.project}</ThemedText>
                                </View>
                            </View>
                        </View>

                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const EmptyList = () => (
        <ThemedView className="items-center justify-center py-10">
            <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
            <ThemedText className="mt-4 text-base text-gray-400">No expenses listed yet</ThemedText>
            <ThemedText className="text-sm text-gray-400 mt-1">Start by adding your first expense</ThemedText>
        </ThemedView>
    );

    return (
        <SafeAreacontext className="flex-1">

            {/* Header */}
            <PageHeader
                routes="Expenses Tracking"
                showMenu={true}
                onMenuPress={() => router.push("/otherPages/expenses/expense")}
            />

            <View className="px-3 flex-1">

                <View className="my-4">
                    <Tabs tabs={timeFilters} activeTab={activeTab} setActiveTab={setActiveTab} />
                </View>

                <AddFilterCard
                    title="Add Expenses"
                    filterItem={() => { }}
                    onchange={() => router.push("/otherPages/expenses/addExpenses")}
                />

                <View className="flex-row flex-wrap mb-4">
                    <FilterChip label={`dates: ${CURRENT_DATE} to ${CURRENT_DATE}`} />
                    <FilterChip label="project: all" />
                </View>

                <Input
                    className={`${inputBgColor} mb-3 `}
                    placeholder="Search expenses..."
                    icon={true}
                    border={false}
                    value={searchQuery}
                    elevation={2}
                    onchange={setSearchQuery}
                />

                {selectionMode && filteredExpenses.length > 0 && (
                    <ThemedView className="flex-row items-center mb-3 rounded-lg shadow-sm p-3 px-4">
                        <CheckBox value={selectAll} onClick={handleSelectAll} />
                        <ThemedText className="ml-2 text-lg font-medium">
                            Select All ({selectedExpenses.length})
                        </ThemedText>
                    </ThemedView>
                )}

                {loading ? (
                    <LoadingSkeleton count={4} height={89} />
                ) : (
                    <FlatList
                        data={filteredExpenses}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <ExpenseItem item={item} />}
                        ListEmptyComponent={EmptyList}
                        contentContainerStyle={{ paddingBottom: selectionMode ? 60 : 0 }}
                        ListFooterComponent={
                            isConnected && totalPages > 1 ? (
                                <View className="items-center mb-2">
                                    <Pagination
                                        page={page}
                                        totalPages={totalPages}
                                        onPageChange={(p) => console.log("change page", p)}
                                    />
                                </View>
                            ) : null
                        }
                    />
                )}
            </View>

            {selectionMode && (
                <View className="absolute bottom-0 left-0 right-0">
                    <BottomActionBar
                        actionType="editView"
                        handleView={() => { }}
                        handleDelete={deleteExpense}
                        handleCancel={handleCancel}
                    />
                </View>
            )}

            {/* Hook-driven modal */}
            <ProjectCountModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSelect={(value) => {
                    setFetchExpense(value);
                    setShowExpensesReport(true);
                    setModalVisible(false);
                }}
            />
        </SafeAreacontext>
    );
};

export default Expenses;
