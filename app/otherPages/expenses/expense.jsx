import React, { useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import PageHeader from "../../../src/components/PageHeader";
import Tabs from "../../../src/components/Tabs";

const Expense = () => {
    const tabs = ["vendor", "payment-type", "reporting"];
    const [activeTab, setActiveTab] = useState("vendor");
    const [data, setData] = useState([]);
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
        return new Promise((resolve,reject) => {
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


    useEffect(() => {
        setLoading(true);

        if (activeTab === "vendor") {
            getVendors().then(res => setData(res)).finally(() => setLoading(false));
        }

        if (activeTab === "payment-type") {
            getPaymentTypes().then(res => setData(res)).finally(() => setLoading(false));
        }

        if (activeTab === "reporting") {
            getReports().then(res => setData(res)).catch(res=>setData(res)).finally(() => setLoading(false));
        }
    }, [activeTab]);


    const renderItem = ({ item }) => (
        <ThemedView className="flex-row items-center p-4 mt-4  rounded-xl">
            <ThemedView className="w-12 h-12 rounded-full border border-gray-900 items-center justify-center mr-4">
                <Ionicons name={item.icon} size={25} color="#2563eb" />
            </ThemedView>

            <ThemedText className="text-base font-semibold">
                {item.name || item.type || item.title}
            </ThemedText>
        </ThemedView>
    );

    return (
        <SafeAreacontext bgColor="#eff6ff" className="flex-1">
            <PageHeader routes="Expense" />

            <View className="p-4">
                <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

                {loading ? (
                    <ThemedText className="text-center mt-10 ">
                        Loading...
                    </ThemedText>
                ) : (
                    <FlatList
                        data={data}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </SafeAreacontext>
    );
};

export default Expense;
