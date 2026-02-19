import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import PageHeader from "../../../src/components/PageHeader";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import Button from "../../../src/components/Button";
import Input from "../../../src/components/Input";
import { readCache, storeCache } from "../../../src/offline/cache";
import { OfflineContext } from "../../../src/offline/OfflineProvider";
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";
import { router } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { useDebounce } from "../../../src/hooks/useDebounce";
import { parseIconString, RenderIcon } from "../../../src/helper";
import { EXPENSE_VENDOR_ICONS } from "../../../src/constants/icons";
import IconPicker from "../../../src/components/IconPicker";
import { useTheme } from "../../../src/context/ThemeProvider";



const CACHE_KEY = "expense_cache_data";

// =============={prefix, icon} -> "font6:car"====================
const buildIconString = (iconObj) =>
    `${iconObj.prefix}:${iconObj.icon}`;


const Vendor = () => {
    const { showModal, setGlobalLoading, hideModal } = useAuth();
    const { isConnected } = useContext(OfflineContext);
    const { id = null, activeStatus } = useLocalSearchParams()
    const { darkMode } = useTheme();
    const { post, put, get } = useApi();
    const pickerRef = useRef(null)

    const [vendorName, setVendorName] = useState("");
    const [vendorError, setVendorErr] = useState("")
    const [selectedIcon, setSelectedIcon] = useState(null);
    const [message, setMessage] = useState("");
    const [messageStatus, setMessageStatus] = useState(false);
    const [vendorList, setVendorList] = useState([]);
    const [isFocused, setIsFocused] = useState(false);
    const debouncedName = useDebounce(vendorName, 900);
    const [isPickerVisible, setIsPickerVisible] = useState(false);


    const suggestedIcons = useMemo(() => {
        return EXPENSE_VENDOR_ICONS.slice(0, 6);
    }, []);

    // Map stored icon string (prefix:name) back to full object for the UI
    // Improved helper to find icon even if prefix is missing
    const getFullIconObject = (iconStr) => {
        if (!iconStr) return null;

        // Case 1: If string contains ":" (e.g., "Ion:cash")
        const parsed = parseIconString(iconStr);

        // Case 2: Try to find by icon name directly if prefix search fails
        const found = EXPENSE_VENDOR_ICONS.find(
            i =>
                i.icon?.toLowerCase() === parsed.icon?.toLowerCase() &&
                i.prefix?.toLowerCase() === parsed.type?.toLowerCase()
        );
        return found || { icon: parsed.icon || iconStr, type: "Ionicons", prefix: "Ion" };
    };

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
                console.log('offline record found :', finalRecord);

                if (finalRecord) {
                    setVendorName(finalRecord.vendor || finalRecord.label || "");
                    setSelectedIcon(getFullIconObject(finalRecord.icon));

                }


                // 3. Fresh Fetch from API (If online)
                if (isConnected) {
                    setGlobalLoading(true);
                    try {
                        const res = await get(`my-expenses/vendors/vendor?id=${Number(id)}&_t=${Date.now()}`, { useBearerAuth: true });
                        console.log("online:", res);

                        if (res?.status === "success" && res.data) {
                            setVendorName(res.data.vendor || "");
                            setSelectedIcon(getFullIconObject(res.data.icon));
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

                    console.log(res);

                    if (res) {
                        if (res.status === "error") {
                            setMessageStatus(true);
                            setMessage(res.message || res.data || "This name already exists.");
                        } else {
                            setMessage(res.message || res.data || "The name is available");
                            setMessageStatus(false);
                        }
                        return;
                    }
                } catch (err) {
                    // console.log("API Error Details:", err?.response?.data || err.message);
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
        if (!vendorName?.trim()) {
            setVendorErr("Field is required.");
            return;
        }

        if (!selectedIcon) {
            showModal(
                "Please select an icon that best represents this vendor...",
                "warning"
            );
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
            // showModal(err?.message || "Server error", "error");
        } finally {
            setGlobalLoading(false);
        }
    };



    const handleUpdateVendor = async () => {
        if (!vendorName?.trim()) {
            setVendorErr("Field is required.");
            return;
        }

        if (!selectedIcon) {
            showModal(
                "Please select an icon that best represents this vendor...",
                "warning"
            );
            return;
        }

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

    //=================================
    //=======Filter option array == 
    //=================================

    const filterOptions = [
        { label: "Ads", value: "marketing_ads" },
        { label: "Fuel", value: "fuel" },
        { label: "Supplies", value: "supplies" },
        { label: "Food", value: "food_meals" },
        { label: "Transport", value: "travel_transport" },
        { label: "Finance", value: "finance_payment" },
        { label: "SaaS", value: "software_saas" },
        { label: "Shipping", value: "shipping_logistics" },
        { label: "Utilities", value: "utilities_telecom" },
        { label: "Lodging", value: "travel_lodging" },
        { label: "Office", value: "office_space" },
    ]

    return (
        <SafeAreacontext bgColor="#eff6ff" className="flex-1">

            {/* Page Header */}
            <PageHeader routes={`${id ? "Edit Vendor" : "Adding Vendor"}`} />

            {/* Keyboard handler for inputs */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >

                <ScrollView contentContainerStyle={{ padding: 12 }} >

                    <ThemedView className="p-4 rounded-lg mt-2 mb-4 " style={{ elevation: 2 }} >
                        <ThemedText color="#374151" className="text-lg  mb-1">
                            Choose a popular vendor or add a new one
                        </ThemedText>
                    </ThemedView>


                    {/* ---------------- Suggested Icon Section ---------------- */}
                    {!isPickerVisible && (
                        <ThemedView className="p-4 rounded-lg" style={{ elevation: 2 }}>

                            {/* Header Row */}
                            <View className="flex-row justify-between items-center mb-1">
                                <ThemedText className="">Choose icon here:</ThemedText>

                                {/* Open full picker */}
                                <TouchableOpacity onPress={() => {
                                    pickerRef.current?.open();
                                    setIsFocused(true)
                                }}>
                                    <Feather name="search" size={22} color="#9ca3af" />
                                </TouchableOpacity>
                            </View>

                            {/* Suggested Icons */}
                            <View className={`
                                flex-row flex-wrap justify-between mt-1 border rounded-lg p-4 ${darkMode ? "border-gray-500" : "border-gray-300"}
                                `}>
                                {(() => {
                                    let iconsToDisplay = [];

                                    if (selectedIcon) {
                                        // 1. Filter out the selected icon from the default list to avoid duplication
                                        const otherIcons = suggestedIcons.filter(
                                            (item) => item.label !== selectedIcon.label
                                        );

                                        // 2. Place the selected icon at the first position (index 0)
                                        // 3. Take the remaining icons and slice to ensure the total count is exactly 6
                                        iconsToDisplay = [selectedIcon, ...otherIcons].slice(0, 6);
                                    } else {
                                        // If no icon is selected, show the default top 6 icons
                                        iconsToDisplay = suggestedIcons;
                                    }

                                    return iconsToDisplay.map((item, index) => (
                                        <TouchableOpacity
                                            key={`${item.label}-${index}`}
                                            onPress={() => {
                                                setSelectedIcon(item);
                                                setVendorName(item.label);
                                                setIsFocused(true);
                                            }}
                                            style={{ width: '31%', marginBottom: 10 }}
                                            className={`items-center p-3 rounded-xl border ${selectedIcon?.label === item.label
                                                ? darkMode ? "border-blue-500" : "border-blue-500 bg-blue-50" // Highlighted state
                                                : darkMode ? "border-gray-500 " : "border-gray-200 bg-gray-50"  // Default state
                                                }`}
                                        >
                                            {/* Custom Icon Component */}
                                            <RenderIcon
                                                icon={item.icon}
                                                color={selectedIcon?.label === item.label ? "#2563eb" : "#4b5563"}
                                                size={30}
                                                prefix={item.prefix || ''}
                                                type="vendor"
                                            />

                                            {/* Icon Label - Truncated if too long */}
                                            <Text numberOfLines={1} className="text-[10px] mt-1 text-gray-500 text-center">
                                                {item.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ));
                                })()}
                            </View>

                            {/* Load More Button */}
                            <TouchableOpacity
                                onPress={() => {
                                    pickerRef.current?.open();
                                    setIsFocused(true)
                                }}
                                className={`py-2 mt-2 border-t ${darkMode ? "border-gray-500" : "border-gray-300"} items-center`}
                            >

                                <Text preventWrap={true} className={`font-medium ${darkMode ? 'text-blue-500' : 'text-blue-600'}`}>
                                    Load More Icons.....
                                </Text>

                            </TouchableOpacity>

                        </ThemedView>
                    )}

                    {/* ---------------- Vendor Name Input ---------------- */}
                    <ThemedView className="p-4 rounded-lg mt-6" style={{ elevation: 2 }}>

                        <ThemedText className="mb-2">Give the vendor a label or name:  </ThemedText>
                        <Input
                            placeholder="Enter vendor name here"
                            value={vendorName}
                            // Open icon picker from input icon *
                            rightIcon={true}
                            iconEvent={() => pickerRef.current?.open()}
                            onchange={(val) => {
                                // If value comes from picker (object), extract label
                                const textValue = typeof val === 'object' ? val?.label : val;

                                setVendorName(textValue || "");

                                // Set selected icon only if full object received
                                if (typeof val === 'object' && val !== null) {
                                    setSelectedIcon(val);
                                }

                                setIsFocused(true);

                            }}

                            inputError={vendorError}
                            setInputError={setVendorErr}
                        />
                        {
                            message !== "" && (
                                <Text preventWrap={true} className={`${messageStatus ? "text-red-500" : "text-green-500"} mt-2`}>
                                    {message}
                                </Text>
                            )
                        }

                    </ThemedView>

                    {/* ---------------- Save / Update Button ---------------- */}
                    <Button
                        className="mt-5"
                        title={`${id ? "Update" : "Save"}`}
                        onClickEvent={id ? handleUpdateVendor : handleAddVendor}
                    />


                    {/* ---------------- Info Card ---------------- */}
                    <View className="p-2 rounded-lg mt-2" >
                        <ThemedText color="#374151" className="text-lg  mb-1">
                            Please choose an icon that best represents this vendor and give it a proper name.
                            This helps identify vendors quickly inside the app.
                        </ThemedText>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView >

            {/* ---------------- Hidden Full Icon Picker ---------------- */}
            <View View className="opacity-0" >
                <IconPicker
                    ref={pickerRef}
                    label="vendors"
                    items={EXPENSE_VENDOR_ICONS}
                    value={selectedIcon}
                    isPickerContentShown={true}
                    filterOptions={filterOptions}
                    onChange={(val) => {
                        console.log("selected icon :", val);
                        setVendorName(val.label);
                        setSelectedIcon(val);
                        setIsPickerVisible(false);
                        setIsFocused(true);
                    }}
                />
            </View>

        </SafeAreacontext >
    );
};

export default Vendor;
