import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import PageHeader from "../../../src/components/PageHeader";
import { Feather } from "@expo/vector-icons";
import Button from "../../../src/components/Button";
import Input from "../../../src/components/Input";
import { readCache, storeCache } from "../../../src/offline/cache";
import { OfflineContext } from "../../../src/offline/OfflineProvider";
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";
import { router } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { useDebounce } from "../../../src/hooks/useDebounce";
import { parseIconString, RenderIcons } from "../../../src/helper";
import { EXPENSE_VENDOR_ICONS } from "../../../src/constants/icons";
import IconPicker from "../../../src/components/IconPicker";



const CACHE_KEY = "expense_cache_data";

// =============={prefix, icon} -> "font6:car"====================
const buildIconString = (iconObj) =>
    `${iconObj.prefix}:${iconObj.icon}`;


const Vendor = () => {
    const { showModal, setGlobalLoading, hideModal } = useAuth();
    const { isConnected } = useContext(OfflineContext);
    const { id = null, activeStatus } = useLocalSearchParams()

    const { post, put, get } = useApi();
    const pickerRef = useRef(null)

    const [vendorName, setVendorName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState(null);
    const [message, setMessage] = useState("");
    const [messageStatus, setMessageStatus] = useState(false);
    const [vendorList, setVendorList] = useState([]);
    const [isFocused, setIsFocused] = useState(false);
    const debouncedName = useDebounce(vendorName, 600);
    const [isPickerVisible, setIsPickerVisible] = useState(false);


    const suggestedIcons = useMemo(() => {
        if (!vendorName.trim()) {
            return EXPENSE_VENDOR_ICONS.slice(0, 6); // Default 6 icons
        }
        const filtered = EXPENSE_VENDOR_ICONS.filter(item =>
            item.label.toLowerCase().includes(vendorName.toLowerCase())
        );
        return filtered.slice(0, 6); // Max 6 icons for 2 rows (3 per row)
    }, [vendorName]);


    // ===============Load cached vendors on mount======================
    useEffect(() => {
        const initializeVendorData = async () => {
            // 1. Initial Cache Load
            const cachedWrap = (await readCache(CACHE_KEY)) || {};
            const vendorsTab = cachedWrap["vendor"] || {};
            const cachedVendors = [
                ...(vendorsTab.enabled || []),
                ...(vendorsTab.disabled || [])
            ];


            setVendorList(cachedVendors);

            if (id) {
                // 2. Local Cache Check (Immediate UI update)
                const finalRecord = cachedVendors.find(
                    item => item?.id != null && String(item.id) === String(id)
                );


                if (finalRecord) {
                    setVendorName(finalRecord.vendor || finalRecord.label || "");

                    const parsed = parseIconString(finalRecord.icon ?? "");
                    const matchedIcon = EXPENSE_VENDOR_ICONS.find(
                        i => i.icon === parsed.icon && (i.prefix === parsed.prefix || i.type?.toLowerCase() === parsed.prefix)
                    );

                    setSelectedIcon(matchedIcon || null);

                }


                // 3. Fresh Fetch from API (If online)
                if (isConnected) {
                    setGlobalLoading(true);
                    try {
                        const res = await get(`my-expenses/vendors/vendor?id=${Number(id)}&_t=${Date.now()}`, { useBearerAuth: true });
                        console.log("online:", res);

                        if (res?.status === "success" && res.data) {
                            setVendorName(res.data.vendor || "");

                            const parsed = parseIconString(res.data.icon ?? "");
                            const matchedIcon = EXPENSE_VENDOR_ICONS.find(
                                i => i.icon === parsed.icon && (i.prefix === parsed.prefix || i.type?.toLowerCase() === parsed.prefix)
                            );

                            setSelectedIcon(matchedIcon || null);
                        }


                    } catch (err) {
                        console.log("Fetch Vendor Record Error:", err.message);
                    } finally {
                        setGlobalLoading(false);
                    }
                }
            }
        };

        initializeVendorData();
    }, [id, isConnected]); // Dependency array updated for re-fetching

    // Check name availability on input
    useEffect(() => {
        if (!isFocused) return;
        if (!debouncedName.trim()) {
            setMessage("");
            setMessageStatus(false);
            return;
        }

        const checkAvailability = async () => {
            setMessage("Checking...");

            // --- 1. ONLINE CHECK ---
            if (isConnected) {
                try {
                    const res = await get(
                        `my-expenses/vendors/check-availability?vendor=${encodeURIComponent(debouncedName)}`,
                        { useBearerAuth: true }
                    );


                    if (res) {
                        if (res.status === "error") {
                            setMessage(res.message || res.data || "This name already exists.");
                            setMessageStatus(true);
                        } else {
                            setMessage(res.message || res.data || "The name is available");
                            setMessageStatus(false);
                        }
                        return;
                    }
                } catch (err) {
                    console.log("API Error Details:", err?.response?.data || err.message);
                }
            }

            // --- 2. OFFLINE FALLBACK ---
            //if net doesnt avalble are api crash
            console.log("Running offline duplicate check...");

            const duplicate = vendorList.some((v) => {
                // Edit mode: ignore current item 
                if (id && String(v.id) === String(id)) return false;

                const existingName = (v.vendor || v.label || "").toLowerCase().trim();
                return existingName === debouncedName.toLowerCase().trim();
            });

            if (duplicate) {
                setMessage("This Vendor is already used (Local Cache)");
                setMessageStatus(true);
            } else {
                // if network are anabled or not in casge
                const offlineWarning = isConnected
                    ? "Server error, could not verify name."
                    : " Vendor verified in local cache only.";

                setMessage(offlineWarning);
                setMessageStatus(false);
            }
        };

        checkAvailability();
    }, [debouncedName, isConnected, isFocused, vendorList, id]);


    ///=========== handle create vender ============
    const handleAddVendor = async () => {
        if (!vendorName?.trim() || !selectedIcon) {
            showModal("Enter vendor name and select icon", "error");
            return;
        }

        setGlobalLoading(true);
        try {
            const iconString = buildIconString(selectedIcon);
            const tempId = `local_${Date.now()}`;
            const payload = {
                vendor: vendorName.trim(),
                icon: iconString,
                status: "enabled",
                tempId: tempId
            };

            let isOffline = !isConnected;
            let serverResult = null;

            try {
                // Attempt to send data to API
                serverResult = await post("my-expenses/vendors/create", payload, { useBearerAuth: true });

                // If result is null or has offline flag
                if (!serverResult || serverResult.offline) {
                    isOffline = true;
                }
            } catch (e) {
                isOffline = true;
            }

            if (isOffline) {
                const existingQueue = (await readCache("offlineQueue")) || [];
                const newEntry = {
                    method: "POST",
                    endpoint: "my-expenses/vendors/create",
                    body: payload
                };
                await storeCache("offlineQueue", [...existingQueue, newEntry]);
            }
            await storeCache("newRecordAdded", true);

            showModal(
                isOffline ? "Vendor was added successfully you are in offline mode please don't use the dublicate vendor name it may be crashed your request (offline)" : "Vendor created successfully!",
                isOffline ? "warning" : "success",
                false,
                [
                    { label: "Add More", bgColor: "bg-green-600", onPress: () => { hideModal(); } },
                    { label: "View All", bgColor: "bg-blue-600", onPress: () => { hideModal(); router.back(); } },
                ]
            );
        } catch (err) {
            showModal(err?.message || "Server error", "error");
        } finally {
            setGlobalLoading(false);
        }
    };



    const handleUpdateVendor = async () => {
        if (!vendorName?.trim() || !selectedIcon || messageStatus) return;

        setGlobalLoading(true);

        // ----------------------------
        // 1️⃣ STATUS NORMALIZATION
        // ----------------------------
        let currentStatus = "enabled";
        if (
            activeStatus &&
            (activeStatus.toLowerCase().includes("dis") ||
                activeStatus.toLowerCase().includes("disable"))
        ) {
            currentStatus = "disabled";
        }

        const payload = {
            id,
            vendor: vendorName.trim(),
            icon: buildIconString(selectedIcon),
            status: currentStatus,
        };

        let isOffline = !isConnected;


        // ----------------------------
        // 2️⃣ API CALL (TRY ONLINE)
        // ----------------------------
        try {
            const res = await put(
                "my-expenses/vendors/update",
                payload,
                { useBearerAuth: true }
            );

            if (!res || res.offline) {
                isOffline = true;
            }
        } catch (e) {
            isOffline = true;
        }

        // ----------------------------
        // 3️⃣ CACHE UPDATE (CORRECT WAY)
        // ----------------------------
        try {
            const cachedWrap = (await readCache(CACHE_KEY)) || {};

            const TAB_KEY = "vendor";
            const vendorsTab = cachedWrap[TAB_KEY] || {};

            const enabledList = Array.isArray(vendorsTab.enabled)
                ? [...vendorsTab.enabled]
                : [];

            const disabledList = Array.isArray(vendorsTab.disabled)
                ? [...vendorsTab.disabled]
                : [];

            const updatedVendor = {
                ...payload,
                pending: isOffline,
            };

            console.log("UPDATED ITEM:", updatedVendor);

            // Remove vendor from both lists (avoid duplicates)
            const cleanEnabled = enabledList.filter(
                v => String(v.id) !== String(id)
            );

            const cleanDisabled = disabledList.filter(
                v => String(v.id) !== String(id)
            );

            // Insert into correct status list
            const status = activeStatus.toLowerCase() || "enabled"
            if (status === "enabled" || payload.status === " enabled") {
                cleanEnabled.push(updatedVendor);
            } else {
                cleanDisabled.push(updatedVendor);
            }

            cachedWrap[TAB_KEY] = {
                enabled: cleanEnabled,
                disabled: cleanDisabled,
            };

            await storeCache(CACHE_KEY, cachedWrap);
        } catch (cacheErr) {
            console.log("Vendor cache update failed:", cacheErr);
        }

        // ----------------------------
        // 4️⃣ OFFLINE QUEUE (IF NEEDED)
        // ----------------------------
        if (isOffline) {
            const queue = (await readCache("offlineQueue")) || [];

            const filteredQueue = queue.filter(q => {
                try {
                    const body =
                        typeof q.body === "string"
                            ? JSON.parse(q.body)
                            : q.body;
                    return String(body.id) !== String(id);
                } catch {
                    return true;
                }
            });

            filteredQueue.push({
                method: "put",
                endpoint: "my-expenses/vendors/update",
                body: JSON.stringify(payload),
            });

            await storeCache("offlineQueue", filteredQueue);
        }

        // ----------------------------
        // 5️⃣ FINAL FLAGS + UI
        // ----------------------------
        await storeCache("recordUpdated", true);

        const msg = isOffline
            ? "Vendor was updated successfully you are in offline mode please don't use the dublicate vendor name it may be crashed your request (offline)"
            : "Vendor updated successfully!";

        const type = isOffline ? "warning" : "success";

        showModal(msg, type, false, [
            {
                label: "View",
                bgColor: "bg-green-600",
                onPress: () => hideModal(),
            },
            {
                label: "View All",
                bgColor: "bg-blue-600",
                onPress: () => {
                    hideModal();
                    router.back();
                },
            },
        ]);

        setGlobalLoading(false);
    };



    return (
        <SafeAreacontext bgColor="#eff6ff" className="flex-1">
            <PageHeader routes={` ${id ? "Edit Vendor" : "Adding Vendor"}`} />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <ScrollView
                    contentContainerStyle={{  padding: 12 }}
                >

                    {/* Card Header */}
                    <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
                        <ThemedText color="#374151" className=" text-lg font-medium mb-1">
                            {/* {id ? "Edit Vendor" : "Add Vendor"} */}
                            Please choose an icon that best represents this vendor. Also, give it a good name.This helps identify vendors quickly in the app.
                        </ThemedText>
                    </ThemedView>


                    {/* Icon Select */}
                    {!isPickerVisible && (
                        <ThemedView className="p-4 rounded-lg" style={{ elevation: 2 }}>
                            <View className="flex-row justify-between items-center">
                                <ThemedText className="mb-2">Choose icon here:</ThemedText>
                                <TouchableOpacity onPress={() => pickerRef.current?.open()}>
                                    <Feather
                                        name="search"
                                        size={22}
                                        color="#9ca3af"
                                        style={{ marginLeft: 8 }}
                                    />
                                </TouchableOpacity>

                            </View>

                            <View className="flex-row flex-wrap justify-between mt-4">
                                {suggestedIcons.map((item, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => {
                                            setSelectedIcon(item);
                                            setVendorName(item.label);

                                        }}
                                        style={{ width: '31%', marginBottom: 10 }}
                                        className={`items-center p-3 rounded-xl border ${selectedIcon?.label === item.label
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 bg-gray-50"
                                            }`}
                                    >
                                        <RenderIcons item={item} color={selectedIcon?.label === item.label ? "#2563eb" : "#4b5563"} size={22} />
                                        <Text numberOfLines={1} className="text-[10px] mt-1 text-gray-500">{item.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Load More / Open Picker Button */}
                            <TouchableOpacity
                                onPress={() => pickerRef.current?.open()}
                                className="py-2 mt-1 border-t border-gray-100 items-center"
                            >
                                {
                                    !vendorName && !selectedIcon && (
                                        <ThemedText preventWrap={true} style={{ color: '#2563eb' }} className="font-medium">
                                            Load More Icons.....
                                        </ThemedText>
                                    )
                                }

                            </TouchableOpacity>
                        </ThemedView>
                    )}


                    {/* Vendor Name Input */}
                    <ThemedView className="p-4 rounded-lg mt-6 my-5" style={{ elevation: 2 }}>
                        <ThemedText className="mb-1">Give the vendor a label or name:</ThemedText>
                        <Input
                            placeholder="Enter vendor name here"
                            value={vendorName}
                            rightIcon={true}
                            iconEvent={() => {
                                pickerRef.current?.open()
                            }} // Toggle picker
                            onchange={(val) => {
                                setVendorName(val);
                                setIsFocused(true);

                            }}
                        />
                        {message ? (
                            <Text
                                preventWrap={true}
                                className="mt-1"
                                style={{ color: messageStatus ? "#dc2626" : "#16a34a" }}
                            >
                                {message}
                            </Text>

                        ) : null}
                    </ThemedView>

                    <Button title={`${id ? "Update" : "Save"} `} onClickEvent={id ? handleUpdateVendor : handleAddVendor} />

                    <IconPicker
                        ref={pickerRef}
                        items={EXPENSE_VENDOR_ICONS}
                        value={selectedIcon}
                        isPickerContentShown={true}
                        filterOptions={[
                            { label: "Fuel", value: "fuel" },
                            { label: "Supplies", value: "supplies" },
                            { label: "Food", value: "food_meals" },
                            { label: "Transport", value: "travel_transport" },
                        ]}
                        onChange={(val) => {
                            setVendorName(val.label);
                            setSelectedIcon(val);
                            setIsPickerVisible(false);
                        }}
                    />

                </ScrollView>
            </KeyboardAvoidingView>


        </SafeAreacontext>
    );
};

export default Vendor;
