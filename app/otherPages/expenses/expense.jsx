import React, { useEffect, useState } from "react";
import { FlatList, View, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import PageHeader from "../../../src/components/PageHeader";
import Tabs from "../../../src/components/Tabs";
import { AddFilterCard } from "../../../src/components/AddEntityCard";
import Input from "../../../src/components/Input";
import LoadingSkeleton from "../../../src/components/LoadingSkeleton";
import BottomActionBar from "../../../src/components/ActionBar";
import CheckBox from "../../../src/components/CheckBox";
import { useTheme } from "../../../src/context/ThemeProvider";
import { router } from "expo-router";

const Expense = () => {
    const { darkMode } = useTheme();
    const inputBgColor = darkMode ? 'bg-transparent' : 'bg-white';
    const tabs = ["vendor", "payment-type", "reporting", "category"];
    const [activeTab, setActiveTab] = useState("vendor");
    const [selectAll, setSelectAll] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);

    const [data, setData] = useState([]);
    const [filterItem, setFilterItem] = useState("")
    const [loading, setLoading] = useState(false);

    const getVendors = async () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    { id: "1", name: "ABC Supplier", icon: "storefront-outline" },
                    { id: "2", name: "Khan Traders", icon: "business-outline" },
                    { id: "3", name: "OfficePro", icon: "cube-outline" },
                ]);
            }, 600);
        });
    };

    const getPaymentTypes = async () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    { id: "1", type: "Cash", icon: "cash-outline" },
                    { id: "2", type: "Bank Transfer", icon: "business-outline" },
                    { id: "3", type: "Card Payment", icon: "card-outline" },
                    { id: "4", type: "Online", icon: "globe-outline" },
                ]);
            }, 600);
        });
    };

    const getReports = async () => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve([
                    { id: "1", title: "Monthly Expense Report", icon: "calendar-outline" },
                    { id: "2", title: "Yearly Summary", icon: "bar-chart-outline" },
                    { id: "3", title: "Vendor Wise Report", icon: "pie-chart-outline" },
                ]);
                reject("Something went wrong please try again")
            }, 600);
        });
    };

    const getCategories = async () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    { id: "1", name: "Office Expense", icon: "briefcase-outline" },
                    { id: "2", name: "Travel Expense", icon: "airplane-outline" },
                    { id: "3", name: "Utility Bills", icon: "flash-outline" },
                ]);
            }, 600);
        });
    };


    const removeHyphens = (str = "") =>
        str
            .split("-")
            .map((word, index) =>
                index === 0
                    ? word
                    : word.charAt(0).toUpperCase() + word.slice(1)
            )
            .join("");


    const capitalizeFirst = (str = "") =>
        str.charAt(0).toUpperCase() + str.slice(1);

    const getItemText = (item) =>
        item.name || item.type || item.title || "";



    const filteredData = data.filter(item =>
        getItemText(item)
            .toLowerCase()
            .includes(filterItem.toLowerCase())
    );


    useEffect(() => {
        setLoading(true);

        if (activeTab === "vendor") {
            getVendors().then(res => setData(res)).finally(() => setLoading(false));
        }

        if (activeTab === "payment-type") {
            getPaymentTypes().then(res => setData(res)).finally(() => setLoading(false));
        }

        if (activeTab === "reporting") {
            getReports().then(res => setData(res)).catch(res => setData(res)).finally(() => setLoading(false));
        }

        if (activeTab === "category") {
            getCategories().then(res => setData(res)).finally(() => setLoading(false));
        }
    }, [activeTab]);


    const toggleSelect = (id) => {
        setSelectedItems(prev => {
            let updated;

            if (prev.includes(id)) {
                updated = prev.filter(v => v !== id);
            } else {
                updated = [...prev, id];
            }

            // 🔹 auto sync Select All
            setSelectAll(updated.length === filteredData.length);

            return updated;
        });
    };


    const handleSelectAll = () => {
        setSelectAll(prev => {
            const newValue = !prev;

            setSelectedItems(
                newValue
                    ? filteredData.map(item => item.id) // sab select
                    : [] // clear
            );

            return newValue;
        });
    };


    const handleCancel = () => {
        setSelectionMode(false);
        setSelectedItems([]);
    };


    const renderItem = ({ item }) => {
        const isSelected = selectedItems.includes(item.id);

        return (
            <TouchableOpacity
                onLongPress={() => {
                    if (!selectionMode) {
                        setSelectionMode(true);
                        setSelectedItems([item.id]);
                    }
                }}
                onPress={() => {
                    if (selectionMode) {
                        toggleSelect(item.id);
                    } else {
                        console.log("Normal press (open detail / edit)");
                    }
                }}
                activeOpacity={0.8}
            >
                <ThemedView
                    className={`flex-row items-center p-4 mt-4 rounded-xl border
          ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"}
        `}
                >
                    {selectionMode && (
                        <View className="mr-3">
                            <CheckBox
                                value={isSelected}
                                onClick={() => toggleSelect(item.id)}
                            />
                        </View>
                    )}

                    <ThemedView
                        className="w-12 h-12 rounded-full border border-gray-900 items-center justify-center mr-4">
                        <Ionicons name={item.icon} size={25} color="#2563eb" />
                    </ThemedView>

                    <ThemedText className="text-base font-semibold">
                        {item.name || item.type || item.title}
                    </ThemedText>
                </ThemedView>
            </TouchableOpacity>
        );
    };


    return (
        <SafeAreacontext bgColor="#eff6ff" className="flex-1">
            <PageHeader routes="Expense" />

            <View className="p-4">

                <Tabs
                    className={"mb-4"}
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />

                <AddFilterCard
                    filterItem={() => console.log("filter func is calling")}
                    title={`Add ${capitalizeFirst(activeTab)}`}
                    onchange={() => router.push(`/otherPages/expenses/${removeHyphens(activeTab)}`)}
                />

                <Input
                    className={` ${inputBgColor}`}
                    value={filterItem}
                    placeholder="Search items ..."
                    icon={true}
                    border={false}
                    elevation={1}
                    onchange={setFilterItem}

                />

                {selectionMode && filteredData.length > 0 && (
                    <ThemedView className="flex-row items-center mt-4 px-3 py-4 rounded-lg bg-gray-100">
                        <CheckBox value={selectAll} onClick={handleSelectAll} />
                        <ThemedText className="ml-2 text-lg font-semibold">
                            Select All ({selectedItems.length})
                        </ThemedText>
                    </ThemedView>
                )}

                {loading ? (
                    <LoadingSkeleton count={4} />
                ) : (
                    <FlatList
                        data={filteredData}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            paddingBottom: selectionMode ? 70 : 0
                        }}
                    />
                )}
            </View>

            {selectionMode && (
                <View className="absolute bottom-0 left-0 right-0">
                    <BottomActionBar
                        handleDelete={() => console.log("delete pressed", selectedItems)}
                        handleCancel={handleCancel}
                    />
                </View>
            )}

        </SafeAreacontext>
    );
};

export default Expense;
