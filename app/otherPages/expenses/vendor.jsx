import React, { useState, useEffect, useContext } from "react";
import { View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import PageHeader from "../../../src/components/PageHeader";
import Button from "../../../src/components/Button";
import Input from "../../../src/components/Input";
import Select from "../../../src/components/Select";
import { readCache, storeCache } from "../../../src/offline/cache";
import { OfflineContext } from "../../../src/offline/OfflineProvider";
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";
import { router } from "expo-router";

const CACHE_KEY = "expense_cache_data"; // Same cache key as Expense page

const Vendor = () => {
    const { showModal, setGlobalLoading, hideModal } = useAuth();
    const { offlineQueue, isConnected } = useContext(OfflineContext);
    const { post } = useApi();

    const [vendorName, setVendorName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState("");
    const [message, setMessage] = useState("");
    const [messageStatus, setMessageStatus] = useState(false);
    const [vendorList, setVendorList] = useState([]);

    const iconOptions = [
        { icon: "storefront-outline", label: "Storefront" },
        { icon: "business-outline", label: "Business" },
        { icon: "cube-outline", label: "Warehouse" },
        { icon: "cart-outline", label: "E-commerce" },
        { icon: "receipt-outline", label: "Receipt" },
        { icon: "people-outline", label: "Supplier" },
    ];

    // Load cached vendors on mount
    useEffect(() => {
        (async () => {
            const cachedWrap = (await readCache(CACHE_KEY)) || {};
            const cachedVendors = Array.isArray(cachedWrap.vendor) ? cachedWrap.vendor : [];
            setVendorList(cachedVendors);
        })();
    }, []);

    // Check name availability on input
    useEffect(() => {
        if (!vendorName?.trim()) {
            setMessage("");
            setMessageStatus(false);
            return;
        }
        const duplicate = vendorList.some(
            (v) => v?.label?.toLowerCase() === vendorName.trim().toLowerCase()
        );
        if (duplicate) {
            setMessage("This name is already used");
            setMessageStatus(true);
        } else {
            setMessage("Name is available");
            setMessageStatus(false);
        }
    }, [vendorName, vendorList]);

    // Handle save vendor (offline + online + live update)
    const handleAddVendor = async () => {
        if (!vendorName?.trim() || !selectedIcon) {
            showModal("Enter vendor name and select icon", "error");
            return;
        }
        if (messageStatus) {
            showModal("Name already used, choose another", "error");
            return;
        }

        setGlobalLoading(true);
        try {
            const newVendor = {
                id: Date.now().toString(),
                label: vendorName.trim(),
                name: vendorName.trim(),
                value: vendorName.trim().toLowerCase().replace(/\s/g, "-"),
                icon: selectedIcon,
                pending: !isConnected, // <-- mark offline items as pending
                type: "vendor"
            };

            // Update UI immediately
            setVendorList((prev) => [...prev, newVendor]);
            setVendorName("");
            setSelectedIcon("");
            setMessage("");
            setMessageStatus(false);

            // Update cache
            const cachedWrap = (await readCache(CACHE_KEY)) || {};
            const prevVendors = Array.isArray(cachedWrap.vendor) ? cachedWrap.vendor : [];
            cachedWrap.vendor = [...prevVendors, newVendor];
            await storeCache(CACHE_KEY, cachedWrap);

            // Live update Expense list if user is on Expense page
            try {
                const expenseCache = (await readCache(CACHE_KEY)) || {};
                const expenseVendors = Array.isArray(expenseCache.vendor) ? expenseCache.vendor : [];
                expenseCache.vendor = [...expenseVendors, newVendor];
                await storeCache(CACHE_KEY, expenseCache);
            } catch (err) {
                console.error("Failed live update in Expense cache:", err);
            }

            // Attempt online save if connected
            let isOffline = false;
            if (isConnected) {
                try {
                    await post("/vendor/create", {
                        label: newVendor.label,
                        value: newVendor.value,
                        icon: newVendor.icon,
                    });
                    newVendor.pending = false; // saved online
                } catch (err) {
                    isOffline = true;
                }
            } else {
                isOffline = true;
            }

            // Update cache with online status
            cachedWrap.vendor = cachedWrap.vendor.map((v) =>
                v.id === newVendor.id ? newVendor : v
            );
            await storeCache(CACHE_KEY, cachedWrap);

            showModal(
                isOffline
                    ? "Vendor saved locally. It will sync when online."
                    : "Vendor saved successfully online!",
                "success",
                false,
                [
                    {
                        label: "View changes",
                        bgColor: "bg-green-600",
                        onPress: async () => {
                            hideModal();
                            // Refresh from cache to reflect updated state
                        },
                    },
                    {
                        label: "View All",
                        bgColor: "bg-blue-600",
                        onPress: () => {
                            hideModal();
                            router.back();
                        },
                    },
                ]
            );
        } catch (err) {
            console.error(err);
            showModal("Failed to save vendor", "error");
        } finally {
            setGlobalLoading(false);
        }
    };

    return (
        <SafeAreacontext bgColor="#eff6ff" className="flex-1">
            <PageHeader routes="Adding Vendor" />
            <View className="p-4 flex-1">
                {/* Card Header */}
                <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
                    <ThemedText color="#374151" className="text-center text-lg font-medium mb-1">
                        Add Vendor
                    </ThemedText>
                </ThemedView>

                {/* Vendor Name Input */}
                <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
                    <ThemedText className="mb-1">Vendor:</ThemedText>
                    <Input placeholder="Enter vendor name" value={vendorName} onchange={setVendorName} />
                    {message ? (
                        <Text
                            className="mt-1"
                            style={{ color: messageStatus ? "#dc2626" : "#16a34a" }}
                        >
                            {message}
                        </Text>

                    ) : null}
                </ThemedView>

                {/* Icon Select */}
                <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
                    <ThemedText className="mb-2">Choose an icon:</ThemedText>
                    <Select
                        items={iconOptions.map((i) => ({ label: i.label, value: i.icon, icon: i.icon }))}
                        value={selectedIcon}
                        onChange={setSelectedIcon}
                        iconVisibility={true}
                        placeholder="Choose an icon"
                    />
                </ThemedView>

                {/* Live Preview */}
                {vendorName && selectedIcon && (
                    <ThemedView
                        className="flex-row items-center p-4 rounded-xl mb-3"
                        style={{ elevation: 5, borderColor: "#2563eb", borderWidth: 1 }}
                    >
                        <Ionicons name={selectedIcon} size={28} color="#2563eb" className="mr-3" />
                        <ThemedText className="text-base font-semibold">{vendorName}</ThemedText>
                    </ThemedView>
                )}

                <Button title="Save" onClickEvent={handleAddVendor} />

                <ThemedText color="#374151" className="mt-4 text-lg">
                    Please choose an icon that best represents this vendor. This helps identify vendors quickly in the app.
                </ThemedText>
            </View>
        </SafeAreacontext>
    );
};

export default Vendor;
