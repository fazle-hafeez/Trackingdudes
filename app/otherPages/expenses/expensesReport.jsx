import React, { useState, useEffect, useContext, useMemo } from "react";
import { View, FlatList, TouchableOpacity, Text } from "react-native";
import { FontAwesome6, Ionicons, FontAwesome } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "../../../src/context/ThemeProvider";
import { useAuth } from "../../../src/context/UseAuth";
import { OfflineContext } from "../../../src/offline/OfflineProvider";

// Components
import Tabs from "../../../src/components/Tabs";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import PageHeader from "../../../src/components/PageHeader";
import Input from "../../../src/components/Input";
import { AddFilterCard, FilterChip } from "../../../src/components/AddEntityCard";
import LoadingSkeleton from "../../../src/components/LoadingSkeleton";
import CheckBox from "../../../src/components/CheckBox";
import BottomActionBar from "../../../src/components/ActionBar";
import Pagination from "../../../src/components/Pagination";

const Expenses = () => {
    const { showModal, hideModal, setGlobalLoading } = useAuth();
    const { isConnected } = useContext(OfflineContext)
    const timeFilters = ["this-week", "prev-week", "this-month", "others"];
    const { darkMode } = useTheme();
    const [activeTab, setActiveTab] = useState("this-week");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [selectAll, setSelectAll] = useState(false);

    const CURRENT_DATE = '10-13 2025';
    const inputBgColor = darkMode ? 'bg-transparent' : 'bg-white';

    const [expensesReports, setExpensesReports] = useState([
        { id: "1", project: "Mosque Project", amount: "$1200", date: "02/03/2025", vendor: "ABC Supplier", paymentType: "Bank", category: "Construction" },

        { id: "2", project: "School Repair", amount: "$800", date: "05/03/2025", vendor: "XYZ Store", paymentType: "Cash", category: "Maintenance" },

        { id: "3", project: "Hospital Plumbing", amount: "$1500", date: "10/03/2025", vendor: "Khan Traders", paymentType: "Bank", category: "Plumbing" },

        { id: "4", project: "Road Maintenance", amount: "$600", date: "15/03/2025", vendor: "RoadFix Co.", paymentType: "Cash", category: "Infrastructure" },

        { id: "5", project: "Office Supplies", amount: "$300", date: "18/03/2025", vendor: "OfficePro", paymentType: "Online", category: "Stationary" }
    ]);


    // Selection states
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedExpenses, setSelectedExpenses] = useState([]);

    // Simulate loading
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1200);
        return () => clearTimeout(timer);
    }, []);

    const deleteExpense = async () => {
        if (selectedExpenses.length === 0) {
            showModal("Please select at least one item to perform this action", "error");
            return;
        }

        showModal(
            "You're about to permanently remove the selected item...",
            "warning",
            "Deleting item?",
            [
                {
                    label: " Yes,delete",
                    bgColor: "bg-red-600",
                    onPress: () => {
                        hideModal();
                        confirmDelete(selectedExpenses);
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

    const confirmDelete = (ids) => {
        const updatedList = expensesReports.filter((item => !ids.includes(item.id)))
        const recoreds = ids.length
        if (updatedList) {
            setExpensesReports(updatedList)
            showModal(`${recoreds} recored was deleted successfully `, "success")
        }
        handleCancel();

    }

    // sellect all the items

    const handleSelectAll = () => {
        setSelectAll(prev => {
            const newValue = !prev;
            // Filtered projects based on search query
            const filteredExpenses = expensesReports.filter(item =>
                item?.project?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            // Only select items with a valid ID (not just tempId from offline new record)
            setSelectedExpenses(newValue ? filteredExpenses.map(v => v.id).filter(Boolean) : []);
            return newValue;
        });
    };

    // selects or disselects the items

    const toggleSelect = (id) => {
        setSelectedExpenses(prev => {
            let updated;

            // add / remove logic
            if (prev.includes(id)) {
                updated = prev.filter(v => v !== id);
            } else {
                updated = [...prev, id];
            }


            const filteredIds = filteredExpenses
                .map(item => item.id)
                .filter(Boolean);

            // 🔹 auto select-all sync
            setSelectAll(updated.length === filteredIds.length);

            return updated;
        });
    };


    const handleCancel = () => {
        setSelectionMode(false);
        setSelectedExpenses([])
    }

    useEffect(() => {
        if (activeTab === "this-week") {
            console.log("active tab is this-week");
                
        }

        if (activeTab === "prev-week") {
            console.log("active tab is prev-week");
                
        }

        if (activeTab === "this-month") {
            console.log("active tab is this-month");
                
        }

        if (activeTab === "others") {
            console.log("active tab is others");
                
        }

    }, [activeTab])
    // filter item throught input 

    const filteredExpenses = useMemo(() => {
        return expensesReports.filter((item) => (
            item?.category?.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase())
        ))
    }, [expensesReports, searchQuery])

    const ExpenseItem = ({ item }) => {
        const isSelected = selectedExpenses.includes(item.id);

        return (
            <TouchableOpacity
                onLongPress={() => {
                    if (!selectionMode) {
                        setSelectionMode(true);
                        setSelectedExpenses([]);
                    }
                    else {
                        setSelectedExpenses([item.id])
                    }
                }}
                onPress={() => {
                    if (selectionMode) {
                        toggleSelect(item.id);
                    } else {
                        router.push({ pathname: "/otherPages/expenses/addExpenses", params: { id: item.id } });
                    }
                }}
                activeOpacity={0.8}
                className="mb-4"
            >
                <ThemedView
                    className={`rounded-xl p-4 shadow-sm border ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"} flex-row`}
                    style={{ elevation: 5 }}
                >

                    <View className="flex-1">
                        {/* Row 1 */}
                        <View className="flex-row justify-between items-center mb-4">
                            <View className="flex-row items-center">
                                {selectionMode && (
                                    <CheckBox
                                        value={isSelected}
                                        onClick={() => toggleSelect(item.id)}
                                        className="mr-3 "
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

                        <View className={`${darkMode ? 'border-gray-500' : 'border-yellow-400'} mb-5 border-b`} />

                        {/* Row 2 */}
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

                        {/* Row 3 */}
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
                </ThemedView>
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
            <PageHeader routes="Expenses Tracking" showMenu={true}
                onMenuPress={() => router.push("/otherPages/expenses/expense")}
            />
            <View className="px-4 flex-1">
                {/* Tabs */}
                <View className="my-4">
                    <Tabs tabs={timeFilters} activeTab={activeTab} setActiveTab={setActiveTab} />
                </View>

                {/* Add Expense Card */}
                <AddFilterCard
                    title="Add Expenses"
                    filterItem={() => console.log('filtered')}
                    onchange={() => router.push("/otherPages/expenses/addExpenses")}
                />

                <View className="flex-row flex-wrap mb-4">
                    <FilterChip label={`dates: ${CURRENT_DATE} to ${CURRENT_DATE}`} />
                    <FilterChip label="project: all" />
                </View>

                {/* Search */}
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
                    <ThemedView className="flex-row items-center mb-3  rounded-lg shadow-sm p-3 px-4">
                        <CheckBox value={selectAll} onClick={handleSelectAll} />
                        <ThemedText color="#1f2937" className="ml-2 text-lg font-medium ">Select All ({selectedExpenses.length})</ThemedText>
                    </ThemedView>
                )}
                {/* Loading / List / Empty */}
                {loading ? (
                    <LoadingSkeleton count={4} />
                ) : (
                    <FlatList
                        data={filteredExpenses}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <ExpenseItem item={item} />}
                        ListEmptyComponent={EmptyList}
                        contentContainerStyle={{
                            paddingBottom: selectionMode ? 60 : 0
                        }}
                        ListFooterComponent={
                            isConnected && totalPages > 1 ? (
                                <View className="items-center mb-2">
                                    <Pagination
                                        page={page}
                                        totalPages={totalPages}
                                        onPageChange={(newPage) => fetchVehicles(newPage)}
                                    />
                                </View>
                            ) : null
                        }
                    />
                )}
            </View>

            {/* Bottom Action Bar for Selection */}
            {selectionMode && (
                <View className="absolute bottom-0 left-0 right-0 ">
                    <BottomActionBar
                        actionType="editView"
                        handleView={() => console.log("view function is called")}
                        handleDelete={deleteExpense}
                        handleCancel={handleCancel}
                    />

                </View>
            )}
        </SafeAreacontext>
    );
};

export default Expenses;
