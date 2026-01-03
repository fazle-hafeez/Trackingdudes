import React, { useEffect, useState } from "react";
import { FlatList, View, TouchableOpacity, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import PageHeader from "../../../src/components/PageHeader";
import Tabs from "../../../src/components/Tabs";
import { AddFilterCard } from "../../../src/components/AddEntityCard";
import Input from "../../../src/components/Input";
import LoadingSkeleton from "../../../src/components/LoadingSkeleton";
import BottomActionBar from "../../../src/components/ActionBar";
import { useFocusEffect } from "@react-navigation/native";
import CheckBox from "../../../src/components/CheckBox";
import { useTheme } from "../../../src/context/ThemeProvider";
import { router } from "expo-router";
import { useAuth } from "../../../src/context/UseAuth";
import { readCache, storeCache } from "../../../src/offline/cache";

const Expense = () => {
    const { showModal, hideModal, setGlobalLoading } = useAuth();
    const { darkMode } = useTheme();

    const tabs = ["vendor", "payment-type", "reporting", "category"];
    const projectStatus  = ["Enabled", "Disabled"]
    const [activeTab, setActiveTab] = useState("vendor");
    const [activeStatus, setActiveStatus] = useState("Enabled");

    const [selectAll, setSelectAll] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);

    const [data, setData] = useState([]);
    const [filterItem, setFilterItem] = useState("");
    const [loading, setLoading] = useState(false);

    const CACHE_KEY = "expense_cache_data";

    // STATIC DATA
    const staticData = {
        vendor: [
            { id: "1", label: "ABC Supplier", icon: "storefront-outline",status:"enabled" },
            { id: "2", label: "Khan Traders", icon: "business-outline",status:"enabled" },
            { id: "3", label: "OfficePro", icon: "cube-outline",status:"disabled" },
        ],
        "payment-type": [
            { id: "1", label: "Cash", icon: "cash-outline",status:"enabled" },
            { id: "2", label: "Bank Transfer", icon: "business-outline" },
            { id: "3", label: "Card Payment", icon: "card-outline" },
            { id: "4", label: "Online", icon: "globe-outline" },
        ],
        reporting: [
            { id: "1", label: "Monthly Expense Report", icon: "calendar-outline" },
            { id: "2", label: "Yearly Summary", icon: "bar-chart-outline" },
            { id: "3", label: "Vendor Wise Report", icon: "pie-chart-outline" },
        ],
        category: [
            { id: "1", label: "Office Expense", icon: "briefcase-outline" },
            { id: "2", label: "Travel Expense", icon: "airplane-outline" },
            { id: "3", label: "Utility Bills", icon: "flash-outline" },
        ],
    };

    const removeHyphens = (str = "") =>
        str
            .split("-")
            .map((word, index) =>
                index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
            )
            .join("");

    const capitalizeFirst = (str = "") => str.charAt(0).toUpperCase() + str.slice(1);

    const getItemText = (item) => item.name || item.label || item.title || "";

    const filteredData = data.filter((item) =>
        getItemText(item).toLowerCase().includes(filterItem.toLowerCase())
    );

    // LOAD DATA (CACHE + STATIC) AND MERGE OFFLINE RECORDS
    const loadExpenseData = async () => {
        setLoading(true);
        const cached = await readCache(CACHE_KEY);

        const cachedList = cached?.[activeTab] || [];
        const freshData = staticData[activeTab] || [];

        // Merge cached offline records with static data (avoid duplicates)
        const merged = [
            ...cachedList,
            ...freshData.filter((f) => !cachedList.some((c) => c.id === f.id)),
        ].map(item => ({
            ...item,
            pending: item.pending || false
        }));

        setData(merged);

        // Update cache with merged data
        const updatedCache = cached || {};
        updatedCache[activeTab] = merged;
        await storeCache(CACHE_KEY, updatedCache);

        setLoading(false);
    };

    useFocusEffect(
        React.useCallback(() => {
            // Reload data when screen comes into focus
            loadExpenseData();
        }, [activeTab])
    );


    // SELECTION LOGIC
    const toggleSelect = (id) => {
        setSelectedItems((prev) => {
            let updated;
            if (prev.includes(id)) updated = prev.filter((v) => v !== id);
            else updated = [...prev, id];
            setSelectAll(updated.length === filteredData.length);
            return updated;
        });
    };

    const handleSelectAll = () => {
        setSelectAll((prev) => {
            const newValue = !prev;
            setSelectedItems(newValue ? filteredData.map((item) => item.id) : []);
            return newValue;
        });
    };

    const handleCancel = () => {
        setSelectionMode(false);
        setSelectedItems([]);
    };

    // DELETE WITH CACHE UPDATE
    const confirmDelete = async (ids) => {
        setGlobalLoading(true);

        setData((prev) => prev.filter((item) => !ids.includes(item.id)));

        const cached = (await readCache(CACHE_KEY)) || {};
        const currentList = cached[activeTab] || [];
        cached[activeTab] = currentList.filter((item) => !ids.includes(item.id));
        await storeCache(CACHE_KEY, cached);

        setTimeout(() => {
            showModal(`${capitalizeFirst(activeTab)} deleted successfully!`, "success");
            setGlobalLoading(false);
        }, 500);

        setSelectedItems([]);
        setSelectionMode(false);
        setSelectAll(false);
    };

    const deleteItems = () => {
        if (selectedItems.length === 0) {
            showModal("Please select at least one item to delete.", "error");
            return;
        }

        showModal(
            "You're about to permanently remove selected item(s).",
            "warning",
            "Delete?",
            [
                {
                    label: "Yes, delete",
                    bgColor: "bg-red-600",
                    onPress: () => {
                        hideModal();
                        confirmDelete(selectedItems);
                    },
                },
                { label: "Cancel", bgColor: "bg-green-600", onPress: () => hideModal() },
            ]
        );
    };

    // RENDER ITEM WITH OFFLINE PENDING STATUS
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
                        router.push({
                            pathname: `/otherPages/expenses/${removeHyphens(activeTab)}`,
                            params: { id: item.id }
                        })
                    }

                }}
                activeOpacity={0.8}
            >
                <View
                    className={` p-4 mt-4 rounded-xl border shadow ${isSelected
                        ? darkMode ? "border-blue-500  " : "border-blue-500 bg-white"
                        : item.pending // <-- offline/pending items
                            ? darkMode ? "border-gray-700 " : "border-yellow-400 bg-yellow-50"
                            : darkMode ? "border-gray-700 " : 'bg-white border-gray-100'
                        }`}
                >
                    <View className="flex-row items-center">
                        {selectionMode && (
                            <View className="mr-3">
                                <CheckBox value={isSelected} onClick={() => toggleSelect(item.id)} />
                            </View>
                        )}

                        <View
                            className={`w-25 h-25 p-2 rounded-xl border items-center justify-center mr-5 ${darkMode ? "border-gray-700" : "border-gray-400"
                                }`}
                        >
                            <Ionicons
                                name={item.icon}
                                size={30}
                                color={"#2563eb"} // brownish icon for pending
                            />
                        </View>

                        <ThemedText
                            color={"#646060ff"} // brown text for pending
                            className="text-lg font-medium"
                        >
                            {getItemText(item)}
                        </ThemedText>

                    </View>

                    {item.pending && (
                        <Text className="text-yellow-600 mt-3 text-xs font-medium">
                            {item.id ? "⏳ Status/Update pending sync..." : "⏳ New record pending sync..."}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };


    const EmptyList = () => (
        <ThemedView className="items-center justify-center py-10 mt-4 rounded-lg shadow">
            <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
            <ThemedText className="mt-4 text-base text-gray-400">
                No {activeTab} listed yet
            </ThemedText>
            <ThemedText className="text-sm text-gray-400 mt-1">
                Start by adding your first {activeTab}
            </ThemedText>
        </ThemedView>
    );

    return (
        <SafeAreacontext bgColor="#eff6ff" className="flex-1">
            <PageHeader routes="Expense Tracking" />

            <View className="flex-1 px-3 py-4">
                <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} className="mb-4" />

                <AddFilterCard
                    title={`Add ${capitalizeFirst(activeTab)}`}
                    filterItem={() => { }}
                    onchange={() =>
                        router.push(`/otherPages/expenses/${removeHyphens(activeTab)}`)
                    }
                />

                <Tabs tabs={projectStatus} activeTab={activeStatus} setActiveTab={setActiveStatus} className="mb-4" />

                <Input
                    value={filterItem}
                    placeholder="Search items ..."
                    icon={true}
                    borderColors={"#ddd"}
                    onchange={setFilterItem}
                    className={darkMode ? "bg-transparent" : "bg-white"}
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
                    <View className="mt-2">
                        <LoadingSkeleton count={4} height={100} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredData}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        ListEmptyComponent={EmptyList}
                        contentContainerStyle={{ paddingBottom: selectionMode ? 80 : 0 }}
                    />
                )}
            </View>

            {selectionMode && (
                <View className="absolute bottom-0 left-0 right-0">
                    <BottomActionBar handleDelete={deleteItems} handleCancel={handleCancel} />
                </View>
            )}
        </SafeAreacontext>
    );
};

export default Expense;
