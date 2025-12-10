import React, { useState, useEffect } from "react";
import { View, FlatList, TouchableOpacity, Text } from "react-native";
import { FontAwesome6, Ionicons, FontAwesome } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "../../../src/context/ThemeProvider";

// Components
import Tabs from "../../../src/components/Tabs";
import { ThemedView, ThemedText, SafeAreacontext, } from "../../../src/components/ThemedColor";
import PageHeader from "../../../src/components/PageHeader";
import Input from "../../../src/components/Input";
import { AddFilterCard, FilterChip } from "../../../src/components/AddEntityCard";
import LoadingSkeleton from "../../../src/components/LoadingSkeleton";

const Expenses = () => {
    const timeFilters = ["this-week", "prev-week", "this-month", "others"];
    const { darkMode } = useTheme()
    const [activeTimeFilter, setActiveTimeFilter] = useState("this-week");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const CURRENT_DATE = '10-13 2025';
    const inputBgColor = darkMode ? 'bg-transparent' : 'bg-white'
    const expensesReports = [
        {
            id: "1",
            project: "Mosque Project",
            amount: "$1200",
            date: "02/03/2025",
            vendor: "ABC Supplier",
            paymentType: "Bank",
            category: "Construction",
        },
        {
            id: "2",
            project: "School Repair",
            amount: "$800",
            date: "05/03/2025",
            vendor: "XYZ Store",
            paymentType: "Cash",
            category: "Maintenance",
        },
    ];

    //  Simulate loading
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1200);
        return () => clearTimeout(timer);
    });


    const ExpenseItem = ({ item }) => {
        return (
            <ThemedView className="rounded-xl p-4 mb-4 shadow-sm border border-gray-200"
                style={{ elevation: 5 }}>

                {/* Project (Full Width) */}
                <View className="flex-row justify-between items-center mb-4">
                    <View className="flex-row items-center">
                        <View className="bg-purple-100 p-2 rounded-full mr-1">
                            <Ionicons name="pricetag-outline" size={16} color="#7c3aed" />
                        </View>
                        <View className="ml-2">
                            <ThemedText className=" text-base font-semibold">
                                {item.category}
                            </ThemedText>
                            <ThemedText>{item.date}</ThemedText>
                        </View>
                    </View>
                    <ThemedText> {item.amount}</ThemedText>
                </View>
                <View className={`${darkMode ? 'border-gray-500' : 'border-yellow-400'} mb-5 border-b `} />
                {/*  Row 2 */}
                <View className="flex-row justify-between mb-3">

                    {/* Amount */}
                    <View className="flex-row items-center w-[48%]">
                        <View className="bg-green-100 p-2 rounded-full mr-2">
                            <FontAwesome name="credit-card" size={16} color="#15803d" />

                        </View>
                        <View>
                            <ThemedText className="text-xs text-gray-400">
                                Payment Type
                            </ThemedText>
                            <ThemedText >
                                {item.paymentType}
                            </ThemedText>
                        </View>
                    </View>

                    {/* Date */}
                    {/* <View className="flex-row items-center w-[48%]">
                        <View className="bg-blue-100 p-2 rounded-full mr-2">
                            <Ionicons name="calendar-outline" size={16} color="#1d4ed8" />
                        </View>
                        <View>
                            <ThemedText className="text-xs text-gray-400">
                                Date
                            </ThemedText>
                            <ThemedText>
                                {item.date}
                            </ThemedText>
                        </View>
                    </View> */}
                     <View className="flex-row items-center w-[48%]">
                        <View className="bg-orange-100 p-2 rounded-full mr-2">
                            <Ionicons name="storefront-outline" size={16} color="#c2410c" />
                        </View>
                        <View>
                            <ThemedText className="text-xs text-gray-400">
                                Vendor
                            </ThemedText>
                            <ThemedText>
                                {item.vendor}
                            </ThemedText>
                        </View>
                    </View>
                </View>

                {/*  Row 3 */}
                <View className="flex-row justify-between">

                    {/* Category */}

                    <View className="flex-row items-center w-[48%]">
                        <View className="bg-blue-100 p-2 rounded-full mr-2">
                            <FontAwesome6 name="folder-open" size={16} color="#2563eb" />
                        </View>
                        <View>
                            <ThemedText className="text-xs text-gray-400">
                                Project
                            </ThemedText>
                            <ThemedText>
                                {item.project}
                            </ThemedText>
                        </View>
                    </View>

                    {/* Vendor */}
                   

                </View>
            </ThemedView>
        );
    };


    //  Empty state
    const EmptyList = () => (
        <ThemedView className="items-center justify-center py-10">
            <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
            <ThemedText className="mt-4 text-base text-gray-400">
                No expenses listed yet
            </ThemedText>
            <ThemedText className="text-sm text-gray-400 mt-1">
                Start by adding your first expense
            </ThemedText>
        </ThemedView>
    );

    const filteredProjects = expensesReports.filter(item =>
        item.project.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase())
    );


    return (
        <SafeAreacontext className="flex-1">
            <PageHeader routes="Expenses Tracking" />

            <View className="px-4">

                {/* Tabs */}
                <View className="my-4">
                    <Tabs
                        tabs={timeFilters}
                        activeTab={activeTimeFilter}
                        setActiveTab={setActiveTimeFilter}
                    />
                </View>

                {/* Add Expense Card */}
                <AddFilterCard
                    title="Add Expenses"
                    filterItem={()=>console.log('filtered')}
                    onchange={() => router.push("/otherPages/expenses/addExpenses")}
                />

                <View className="flex-row flex-wrap mb-4">
                    <FilterChip label={`dates: ${CURRENT_DATE} to ${CURRENT_DATE}`} />
                    <FilterChip label="project: all" />
                </View>

                {/* Search */}
                <Input
                    className={`${inputBgColor} mb-4 `}
                    placeholder="Search expenses..."
                    icon={true}
                    border={false}
                    value={searchQuery}
                    elevation={2}
                    onchange={setSearchQuery}
                />

                {/* ✅ Loading / List / Empty */}
                {loading ? (
                    <LoadingSkeleton count={4} />
                ) : (
                    <FlatList
                        data={filteredProjects}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <ExpenseItem item={item} />}
                        ListEmptyComponent={EmptyList}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                )}
            </View>
        </SafeAreacontext>
    );
};

export default Expenses;
