import React, { useState, useEffect, useContext, useMemo } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import { FontAwesome6, Ionicons, FontAwesome,Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system/legacy";
import { shareAsync } from "expo-sharing";

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

    const [activeTab, setActiveTab] = useState("this-week");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [showExpensesReport, setShowExpensesReport] = useState(false);

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedExpenses, setSelectedExpenses] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    const inputBgColor = darkMode ? "bg-transparent" : "bg-white";

    const [expensesReports, setExpensesReports] = useState([
        {
            id: "1",
            project: "Mosque Project",
            amount: "$1200",
            date: "02/03/2025",
            vendor: "ABC Supplier",
            paymentType: "Bank",
            category: "Construction",
            image: "https://cdn-icons-png.flaticon.com/512/3064/3064197.png",
            memo: "Purchased cement and bricks for the mosque foundation."
        },
        {
            id: "2",
            project: "School Repair",
            amount: "$800",
            date: "05/03/2025",
            vendor: "XYZ Store",
            paymentType: "Cash",
            category: "Maintenance",
            image: "https://cdn-icons-png.flaticon.com/512/1046/1046857.png",
            memo: "Bought paint and repair materials for classrooms."
        },
        {
            id: "3",
            project: "Hospital Plumbing",
            amount: "$1500",
            date: "10/03/2025",
            vendor: "Khan Traders",
            paymentType: "Bank",
            category: "Plumbing",
            image: "https://cdn-icons-png.flaticon.com/512/639/639365.png",
            memo: "Replaced broken pipes and installed new valves."
        },
        {
            id: "4",
            project: "Road Maintenance",
            amount: "$600",
            date: "15/03/2025",
            vendor: "RoadFix Co.",
            paymentType: "Cash",
            category: "Infrastructure",
            image: "https://cdn-icons-png.flaticon.com/512/861/861386.png",
            memo: "Filling potholes and surface leveling."
        },
        {
            id: "5",
            project: "Office Supplies",
            amount: "$300",
            date: "18/03/2025",
            vendor: "OfficePro",
            paymentType: "Online",
            category: "Stationary",
            image: "https://cdn-icons-png.flaticon.com/512/906/906334.png",
            memo: "Purchased pens, A4 papers, markers and toner."
        }
    ]);


    // SAVE DATA TO CACHE HELPER
    const updateCache = async (newList) => {
        setExpensesReports(newList);
        await storeCache("expenses-cache", { data: newList });
    };

    // FIRST TIME APP LOAD → READ CACHE → OR SAVE DEFAULT DATA
    useEffect(() => {
        const loadExpenses = async () => {
            const cached = await readCache("expenses-cache");

            if (cached?.data && cached.data.length > 0) {
                setExpensesReports(cached.data);
            } else {
                // Cache empty → default data save & use karo
                await storeCache("expenses-cache", { data: expensesReports });
                setExpensesReports(expensesReports);
            }
        };

        loadExpenses();
    }, []);


    // REFRESH SCREEN WHEN FOCUSED (WHEN RETURNING FROM ADD EXPENSES)
    useFocusEffect(
        React.useCallback(() => {
            const load = async () => {
                const cached = await readCache("expenses-cache");
                if (cached.data) setExpensesReports(cached.data);
            };
            load();
        }, [])
    );

    // ENABLE TABLE WHEN SELECTION MADE
    useEffect(() => {
        if (fetchExpense !== null) {
            setShowExpensesReport(true);
        }
    }, [fetchExpense]);

    // SIMULATE LOADING SKELETON
    useEffect(() => {
        if (!showExpensesReport) return;
        const t = setTimeout(() => setLoading(false), 1200);
        return () => clearTimeout(t);
    }, [showExpensesReport]);

    // DELETE ONLINE ONLY
    const confirmDelete = async (ids) => {
        if (!isConnected) {
            showModal("Offline mode — You cannot delete items", "error");
            return;
        }

        const updated = expensesReports.filter(item => !ids.includes(item.id));
        await updateCache(updated);

        showModal(`${ids.length} record(s) deleted`, "success");
        handleCancel();
    };

    const deleteExpense = () => {
        if (selectedExpenses.length === 0) {
            showModal("Please select at least one item", "error");
            return;
        }

        showModal(
            "You're about to permanently delete selected item(s)...",
            "warning",
            "Deleting?",
            [
                { label: "Yes, delete", bgColor: "bg-red-600", onPress: () => { hideModal(); confirmDelete(selectedExpenses); } },
                {
                    label: "Cancel", bgColor: "bg-green-600", onPress: () => {
                        hideModal();
                        handleCancel()
                    }
                }
            ]
        );
    };

    const handleSelectAll = () => {
        setSelectAll(prev => {
            const next = !prev;
            const valid = filteredExpenses.map(v => v.id);
            setSelectedExpenses(next ? valid : []);
            return next;
        });
    };

    const toggleSelect = (id) => {
        setSelectedExpenses(prev => {
            const updated = prev.includes(id)
                ? prev.filter(v => v !== id)
                : [...prev, id];

            const allIds = filteredExpenses.map(v => v.id);
            setSelectAll(updated.length === allIds.length);
            return updated;
        });
    };

    const handleCancel = () => {
        setSelectionMode(false);
        setSelectedExpenses([]);
    };

    // SEARCH FILTER
    const filteredExpenses = useMemo(() => {
        return expensesReports.filter(item => {
            const cat = item.category || "";
            return cat.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [expensesReports, searchQuery]);

    

    // EXPENSE ITEM UI
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
                    else router.push({
                        pathname: "/otherPages/expenses/addExpenses",
                        params: { id: item.id }
                    });
                }}
                activeOpacity={0.8}
                className="mb-4"
            >
                <View
                    className={`
                        rounded-xl p-4 shadow-sm border flex-row
                        ${isSelected ? darkMode ? "border-blue-500" : " border-blue-700 bg-white" :
                            item.pending ? "border-yellow-400 bg-yellow-50" :
                                darkMode ? "border-gray-700" : "bg-white border-gray-100"}
                    `}
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
                         <ThemedText className=" mb-4">{item.amount}</ThemedText>             
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

                        <View className="flex-row items-center w-[48%]">
                            <View className="bg-blue-100 p-2 rounded-full mr-2">
                                <FontAwesome6 name="folder-open" size={16} color="#2563eb" />
                            </View>
                            <View>
                                <ThemedText className="text-xs text-gray-400">Project</ThemedText>
                                <ThemedText>{item.project}</ThemedText>
                            </View>
                        </View>

                        {/* MEMO SECTION */}
                        {item.memo && (
                            <View className="mt-3 px-2">
                                <ThemedText className="text-sm text-gray-600 mt-1">
                                    {item.memo}
                                </ThemedText>
                            </View>
                        )}

                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const EmptyList = () => (
        <ThemedView className=" rounded-lg mt-2 items-center justify-center py-10">
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
                    value={searchQuery}
                    borderColors="#ddd"
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
                    <LoadingSkeleton count={3} height={100} spacing={15} />
                ) : (
                    <FlatList
                        data={filteredExpenses}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <ExpenseItem item={item} />}
                        ListEmptyComponent={EmptyList}
                        contentContainerStyle={{ paddingBottom: selectionMode ? 60 : 0 }}
                    />
                )}
            </View>

            {selectionMode && (
                <View className="absolute bottom-0 left-0 right-0">
                    <BottomActionBar
                        actionType="editView"
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
