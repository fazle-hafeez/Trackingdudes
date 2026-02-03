import React, { useState, useEffect, useContext, act } from "react";
import { View, Text } from "react-native";
import { FontAwesome, FontAwesome5, MaterialIcons, Ionicons } from "@expo/vector-icons";
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
import { useLocalSearchParams } from "expo-router";
import { useDebounce } from "../../../src/hooks/useDebounce";
import { parseIconString } from "../../../src/helper";


const CACHE_KEY = "expense_cache_data";

// =============={prefix, icon} -> "font6:car"====================
const buildIconString = (iconObj) =>
    `${iconObj.prefix}:${iconObj.icon}`;


const Vendor = () => {
    const { showModal, setGlobalLoading, hideModal } = useAuth();
    const { isConnected } = useContext(OfflineContext);
    const { id = null, activeStatus } = useLocalSearchParams()
    console.log("status:", activeStatus);
    
    const { post, put, get } = useApi();

    const [vendorName, setVendorName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState("");
    const [message, setMessage] = useState("");
    const [messageStatus, setMessageStatus] = useState(false);
    const [vendorList, setVendorList] = useState([]);
    const [isFocused, setIsFocused] = useState(false);
    const debouncedName = useDebounce(vendorName, 600);

    const iconOptions = [
        // --- Shopping & Retail ---
        { icon: "storefront", label: "Shop", type: "Ionicons", prefix: "Ion" },
        { icon: "shopping-cart", label: "Cart", type: "FontAwesome", prefix: "font" },
        { icon: "shopping-bag", label: "Brand", type: "FontAwesome", prefix: "font" },
        { icon: "tag", label: "Retail", type: "FontAwesome", prefix: "font" },

        // --- Food & Drinks ---
        { icon: "fast-food", label: "Food", type: "Ionicons", prefix: "Ion" },
        { icon: "restaurant", label: "Dining", type: "Ionicons", prefix: "Ion" },
        { icon: "coffee", label: "Cafe", type: "FontAwesome", prefix: "font" },
        { icon: "pizza", label: "Pizza", type: "Ionicons", prefix: "Ion" },

        // --- Services & Transport ---
        { icon: "car-sport", label: "Transport", type: "Ionicons", prefix: "Ion" },
        { icon: "tools", label: "Repair", type: "FontAwesome5", prefix: "font5" },
        { icon: "local-gas-station", label: "gas station", type: "MaterialIcons", prefix: "mater" },
        { icon: "medical", label: "Health", type: "Ionicons", prefix: "Ion" },
        { icon: "build", label: "Services", type: "Ionicons", prefix: "Ion" },

        // --- Tech & Office ---
        { icon: "laptop", label: "Tech", type: "FontAwesome", prefix: "font" },
        { icon: "print", label: "Print", type: "FontAwesome", prefix: "font" },
        { icon: "desktop-outline", label: "Software", type: "Ionicons", prefix: "Ion" },
        { icon: "wifi", label: "Internet", type: "Ionicons", prefix: "Ion" },

        // --- Others ---
        { icon: "globe-outline", label: "Online", type: "Ionicons", prefix: "Ion" },
        { icon: "card", label: "Bank", type: "Ionicons", prefix: "Ion" },
        { icon: "gift", label: "Gifts", type: "FontAwesome", prefix: "font" },
        { icon: "fitness", label: "Gym", type: "Ionicons", prefix: "Ion" },
        { icon: "briefcase", label: "Work", type: "FontAwesome", prefix: "font" },

    ];

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

            console.log("offline res is :", cachedVendors);

            setVendorList(cachedVendors);

            if (id) {
                // 2. Local Cache Check (Immediate UI update)
                const finalRecord = cachedVendors.find(
                    item => item?.id != null && String(item.id) === String(id)
                );


                if (finalRecord) {
                    setVendorName(finalRecord.vendor || finalRecord.label || "");

                    const parsed = parseIconString(finalRecord.icon ?? "");
                    const matchedIcon = iconOptions.find(
                        i => i.icon === parsed.icon && i.prefix === parsed.prefix
                    );
                    setSelectedIcon(matchedIcon || null);

                }


                // 3. Fresh Fetch from API (If online)
                if (isConnected) {
                    setGlobalLoading(true);
                    try {
                        const res = await get(`my-expenses/vendors/vendor?id= ${Number(id)}`, { useBearerAuth: true });
                        console.log("online:", res);

                        if (res?.status === "success" && res.data) {
                            setVendorName(res.data.vendor || "");

                            const parsed = parseIconString(res.data.icon ?? "");
                            const matchedIcon = iconOptions.find(
                                i => i.icon === parsed.icon && i.prefix === parsed.prefix
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
                setMessage("This name is already used (Local Cache)");
                setMessageStatus(true);
            } else {
                // if network are anabled or not in casge
                const offlineWarning = isConnected
                    ? "Server error, could not verify name."
                    : "Offline: Name verified in local cache only.";

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

            let isOffline = false;
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


    const RenderVendorIcon = ({ item, size = 26, color = "#000" }) => {
        switch (item.type) {
            case "FontAwesome":
                return <FontAwesome name={item.icon} size={size} color={color} />;
            case "FontAwesome5":
                return <FontAwesome5 name={item.icon} size={size} color={color} />;
            case "MaterialIcons":
                return <MaterialIcons name={item.icon} size={size} color={color} />;
            default:
                return <Ionicons name={item.icon} size={size} color={color} />;
        }
    };

    return (
        <SafeAreacontext bgColor="#eff6ff" className="flex-1">
            <PageHeader routes={` ${id ? "Edit Vendor" : "Adding Vendor"}`} />
            <View className="p-4 flex-1">
                {/* Card Header */}
                <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
                    <ThemedText color="#374151" className="text-center text-lg font-medium mb-1">
                        {id ? "Edit Vendor" : "Add Vendor"}
                    </ThemedText>
                </ThemedView>

                {/* Vendor Name Input */}
                <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
                    <ThemedText className="mb-1">Vendor:</ThemedText>
                    <Input placeholder="Enter vendor name" value={vendorName}
                        onchange={(val) => {
                            setVendorName(val);
                            setIsFocused(true)
                        }
                        } />
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

                {/* Icon Select */}
                <ThemedView className="p-4 rounded-lg" style={{ elevation: 2 }}>
                    <ThemedText className="mb-2">Choose an icon:</ThemedText>
                    <Select
                        items={iconOptions.map((i) => ({ label: i.label, value: i.icon, icon: i.icon, type: i.type, prefix: i.prefix }))}
                        value={selectedIcon?.icon || ""} // show selected
                        onChange={(val) => {
                            const obj = iconOptions.find(i => i.icon === val);
                            setSelectedIcon(obj);
                        }}

                        iconVisibility={true}
                        placeholder="Choose an icon"
                    />
                </ThemedView>

                {/* Live Preview */}
                {vendorName && selectedIcon && (
                    <ThemedView
                        className="flex-row items-center p-4 rounded-xl my-4"
                        style={{ elevation: 5, borderColor: "#2563eb", borderWidth: 1 }}
                    >
                        <RenderVendorIcon
                            item={selectedIcon ? { icon: selectedIcon.icon, type: selectedIcon.type } : { icon: '', type: 'Ionicons' }}
                            color="#2563eb"
                            size={28}
                        />

                        <ThemedText className="text-base font-semibold ml-3">{vendorName}</ThemedText>
                    </ThemedView>
                )}

                <Button title={`${id ? "Update" : "Save"} `} onClickEvent={id ? handleUpdateVendor : handleAddVendor} />

                <ThemedText color="#374151" className="mt-4 text-lg">
                    Please choose an icon that best represents this vendor. This helps identify vendors quickly in the app.
                </ThemedText>
            </View>
        </SafeAreacontext>
    );
};

export default Vendor;
