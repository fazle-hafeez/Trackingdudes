import React, { useState, useEffect, useContext } from "react";
import { View, Text } from "react-native";
import { FontAwesome, FontAwesome5, FontAwesome6, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import PageHeader from "../../../src/components/PageHeader";
import Button from "../../../src/components/Button";
import Input from "../../../src/components/Input";
import Select from "../../../src/components/Select";
import { readCache, storeCache } from "../../../src/offline/cache";
import { OfflineContext } from "../../../src/offline/OfflineProvider";
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";
import { router, useLocalSearchParams } from "expo-router";
import { useDebounce } from "../../../src/hooks/useDebounce";
import { parseIconString } from "../../../src/helper";

const CACHE_KEY = "expense_cache_data";

// Helper to build icon string like "Ion:cash" for API/Cache
const buildIconString = (iconObj) => iconObj ? `${iconObj.prefix}:${iconObj.icon}` : "";

const PaymentOption = () => {
  const { showModal, setGlobalLoading, hideModal } = useAuth();
  const { isConnected } = useContext(OfflineContext);
  const { id = null, activeTab } = useLocalSearchParams();
  const { post, put, get } = useApi();

  const [paymentName, setPaymentName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [message, setMessage] = useState("");
  const [messageStatus, setMessageStatus] = useState(false);
  const [paymentList, setPaymentList] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const debouncedName = useDebounce(paymentName, 600);

  const iconOptions = [
    { icon: "cash-outline", label: "Cash", type: "Ionicons", prefix: "Ion" },
    { icon: "card", label: "Card", type: "Ionicons", prefix: "Ion" },
    { icon: "account-balance-wallet", label: "Wallet", type: "MaterialIcons", prefix: "mater" },
    { icon: "paypal", label: "PayPal", type: "FontAwesome", prefix: "font" },
    { icon: "apple-pay", label: "Apple Pay", type: "FontAwesome5", prefix: "font5" },
    { icon: "google-pay", label: "Google Pay", type: "FontAwesome6", prefix: "font6" }, // Ensure type is FontAwesome5
    { icon: "bitcoin", label: "Crypto", type: "FontAwesome5", prefix: "font5" },
    { icon: "bank", label: "Bank Transfer", type: "FontAwesome", prefix: "font" },
    { icon: "globe-outline", label: "Online", type: "Ionicons", prefix: "Ion" },
    { icon: "money-bill-alt", label: "Bill/Check", type: "FontAwesome5", prefix: "font5" },

  ];


  // Map stored icon string (prefix:name) back to full object for the UI
  // Improved helper to find icon even if prefix is missing
  const getFullIconObject = (iconStr) => {
    if (!iconStr) return null;

    // Case 1: If string contains ":" (e.g., "Ion:cash")
    const parsed = parseIconString(iconStr);

    // Case 2: Try to find by icon name directly if prefix search fails
    const found = iconOptions.find(opt =>
      (opt.prefix === parsed.prefix && opt.icon === parsed.icon) ||
      (opt.icon === iconStr) // fallback for simple names
    );

    return found || { icon: parsed.icon || iconStr, type: "Ionicons", prefix: "Ion" };
  };

  // 1. Initial Data Loading (Cache + API)
  useEffect(() => {
    const initializeData = async () => {
      const cachedWrap = (await readCache(CACHE_KEY)) || {};
      const cachedPayments = cachedWrap["payment-option"] || {};
      const cachedAll = [
        ...(cachedPayments.enabled || []),
        ...(cachedPayments.disabled || [])
      ];
      setPaymentList(cachedAll);

      if (id) {
        // First, check the local cache to show data immediately
        const finalRecord = cachedAll.find(item => String(item.id) === String(id));
        if (finalRecord) {
          setPaymentName(finalRecord.payment_option || finalRecord.label || "");
          setSelectedIcon(getFullIconObject(finalRecord.icon));
        }

        // Second, fetch fresh data from API if online
        if (isConnected) {
          setGlobalLoading(true);
          try {
            const res = await get(`my-expenses/payment-options/payment-option?id=${id}`, { useBearerAuth: true });
            if (res?.status === "success" && res.data) {
              setPaymentName(res.data.payment_option || "");
              setSelectedIcon(getFullIconObject(res.data.icon));
            }
          } catch (err) {
            console.log("Fetch Record Error:", err.message);
          } finally {
            setGlobalLoading(false);
          }
        }
      }
    };
    initializeData();
  }, [id, isConnected]);

  // 2. Name Availability Check
  useEffect(() => {
    if (!isFocused || !debouncedName.trim()) {
      setMessage("");
      setMessageStatus(false);
      return;
    }

    const checkAvailability = async () => {
      setMessage("Checking...");

      // --- ONLINE CHECK ---
      if (isConnected) {
        try {
          const res = await get(`my-expenses/payment-options/check-availability?payment_option=${encodeURIComponent(debouncedName)}`, { useBearerAuth: true });

          if (res?.status === "error") {
            setMessage(res.message || res.data || "This name already exists.");
            setMessageStatus(true);
          } else {
            setMessage(res.data || "The name is available");
            setMessageStatus(false);
          }
          return; // Stop here if online check is done
        } catch (err) {
          console.log("Availability API Error:", err.message);
          // If API fails, it will automatically fall through to local check below
        }
      }

      // --- OFFLINE / LOCAL CACHE CHECK ---
      const duplicate = paymentList.some(v => {
        // Skip comparing with the current record if we are in Edit mode
        if (id && String(v.id) === String(id)) return false;

        // Match name with local list
        const existingName = (v.payment_option || v.payment_type || "").toLowerCase().trim();
        return existingName === debouncedName.toLowerCase().trim();
      });

      if (duplicate) {
        setMessage("This name is already used (Local Cache)");
        setMessageStatus(true);
      } else {
        // FIX: Update message if NO duplicate is found offline
        setMessage(isConnected ? "Server error, verified locally." : "The payment-option is available in local cache(Offline)");
        setMessageStatus(false);
      }
    };

    checkAvailability();
  }, [debouncedName, isConnected, isFocused, paymentList, id]);

  // 3. Create Record
  const handleAddPaymentOption = async () => {
    if (!paymentName?.trim() || !selectedIcon) {
      showModal("Enter name and select icon", "error");
      return;
    }

    setGlobalLoading(true);
    const iconString = buildIconString(selectedIcon);
    const payload = {
      payment_option: paymentName.trim(),
      icon: iconString,
      status: "enabled"
    };

    try {
      let isOffline = !isConnected;
      try {
        const res = await post("my-expenses/payment-options/create", payload, { useBearerAuth: true });
        if (!res || res.offline) isOffline = true;
      } catch { isOffline = true; }

      if (isOffline) {
        const existingQueue = (await readCache("offlineQueue")) || [];
        const newEntry = {
          method: "POST",
          endpoint: "my-expenses/payment-options/create",
          body: payload
        };
        await storeCache("offlineQueue", [...existingQueue, newEntry]);
      }

      await storeCache("newRecordAdded", true);
      showModal(isOffline ? "Payment option was created successfully you are in offline mode please don't use the dublicate payment option it may be crashed your request (offline)" : "Payment option was created successfully!", isOffline ? "warning" : "success", false, [
        { label: "Add More", bgColor: "bg-green-600", onPress: () => { hideModal() } },
        { label: "View All", bgColor: "bg-blue-600", onPress: () => { hideModal(); router.back(); } },
      ]);
    } catch (err) {
      showModal(err.message || "Server Error", "error");
    } finally { setGlobalLoading(false); }
  };

  // 4. Update Record (Fixed Logic)
  const handleUpdatePaymentOption = async () => {
    if (!paymentName?.trim() || !selectedIcon || messageStatus) return;

    setGlobalLoading(true);

    // ----------------------------
    // 1️⃣ STATUS NORMALIZATION
    // ----------------------------
    let currentStatus = "enabled";
    if (activeTab && activeTab.toLowerCase().includes("dis")) {
      currentStatus = "disabled";
    }

    const payload = {
      id: String(id),
      payment_option: paymentName.trim(),
      icon: buildIconString(selectedIcon),
      status: currentStatus,
    };

    let isOffline = !isConnected;

    // ----------------------------
    // 2️⃣ API CALL (TRY ONLINE)
    // ----------------------------
    try {
      const res = await put("my-expenses/payment-options/update", payload, { useBearerAuth: true });
      if (!res || res.offline) isOffline = true;
    } catch (err) {
      isOffline = true;
    }

    // ----------------------------
    // 3️⃣ CACHE UPDATE (Enabled / Disabled Lists)
    // ----------------------------
    try {
      const cachedWrap = (await readCache(CACHE_KEY)) || {};
      const TAB_KEY = "payment-option";
      const paymentsTab = cachedWrap[TAB_KEY] || {};

      const enabledList = Array.isArray(paymentsTab.enabled) ? [...paymentsTab.enabled] : [];
      const disabledList = Array.isArray(paymentsTab.disabled) ? [...paymentsTab.disabled] : [];

      const updatedItem = { ...payload, pending: isOffline };

      // Remove existing record from both lists
      const cleanEnabled = enabledList.filter(v => String(v.id) !== String(id));
      const cleanDisabled = disabledList.filter(v => String(v.id) !== String(id));

      // Insert into correct list
      if (currentStatus === "enabled") {
        cleanEnabled.push(updatedItem);
      } else {
        cleanDisabled.push(updatedItem);
      }

      cachedWrap[TAB_KEY] = {
        enabled: cleanEnabled,
        disabled: cleanDisabled,
      };

      await storeCache(CACHE_KEY, cachedWrap);
    } catch (cacheErr) {
      console.log("Payment option cache update failed:", cacheErr);
    }

    // ----------------------------
    // 4️⃣ OFFLINE QUEUE (IF NEEDED)
    // ----------------------------
    if (isOffline) {
      const queue = (await readCache("offlineQueue")) || [];
      const filteredQueue = queue.filter(q => {
        try {
          const body = typeof q.body === "string" ? JSON.parse(q.body) : q.body;
          return String(body.id) !== String(id);
        } catch {
          return true;
        }
      });

      filteredQueue.push({
        method: "put",
        endpoint: "my-expenses/payment-options/update",
        body: JSON.stringify(payload),
      });

      await storeCache("offlineQueue", filteredQueue);
    }

    // ----------------------------
    // 5️⃣ FINAL FLAGS + UI MODAL
    // ----------------------------
    await storeCache("recordUpdated", true);

    const msg = isOffline
      ? "Payment option updated successfully in offline mode. Avoid duplicate names to prevent conflicts."
      : "Payment option updated successfully!";

    const type = isOffline ? "warning" : "success";

    showModal(msg, type, false, [
      { label: "Close", bgColor: "bg-green-600", onPress: () => hideModal() },
      { label: "View All", bgColor: "bg-blue-600", onPress: () => { hideModal(); router.back(); } },
    ]);

    setGlobalLoading(false);
  };

  // Icon Renderer
  const RenderIcon = ({ item, size = 26, color = "#000" }) => {
    if (!item) return null;
    switch (item.type) {
      case "FontAwesome": return <FontAwesome name={item.icon} size={size} color={color} />;
      case "FontAwesome5": return <FontAwesome5 name={item.icon} size={size} color={color} />;
      case "FontAwesome6": return <FontAwesome6 name={item.icon} size={size} color={color} />;
      case "MaterialIcons": return <MaterialIcons name={item.icon} size={size} color={color} />;
      default: return <Ionicons name={item.icon} size={size} color={color} />;
    }
  };



  return (
    <SafeAreacontext bgColor="#eff6ff" className="flex-1">
      <PageHeader routes={` ${id ? "Edit Payment" : "Adding Payment"}`} />

      <View className="p-4 flex-1">
        {/* Header Section */}
        <ThemedView className="p-4 rounded-lg mb-5 shadow-sm">
          <ThemedText className="text-center text-lg font-medium">
            {id ? "Edit Payment Method" : "Add Payment Method"}
          </ThemedText>
        </ThemedView>

        {/* Input Name Section */}
        <ThemedView className="p-4 rounded-lg mb-5 shadow-sm">
          <ThemedText className="mb-1 font-medium">Payment Method Name:</ThemedText>
          <Input
            placeholder="Enter a label for the payment method"
            value={paymentName}
            onchange={(val) => {
              setPaymentName(val),
                setIsFocused(true)
            }}
          />
          {message ? (
            <Text preventWrap={true} className="mt-1 text-md" style={{ color: messageStatus ? "#dc2626" : "#16a34a" }}>
              {message}
            </Text>
          ) : null}
        </ThemedView>

        {/* Icon Selection Section */}
        <ThemedView className="p-4 rounded-lg mb-5 shadow-sm">
          <ThemedText className="mb-2 font-medium">Choose an icon:</ThemedText>
          <Select
            items={iconOptions.map((i) => ({ label: i.label, value: i.icon, icon: i.icon, type: i.type, prefix: i.prefix }))}
            value={selectedIcon?.icon || ""}
            onChange={(val) => {
              const obj = iconOptions.find(i => i.icon === val);
              setSelectedIcon(obj);
            }}
            iconVisibility={true}
            placeholder="Select icon"
          />
        </ThemedView>

        {/* Live Preview */}
        {paymentName && selectedIcon && (
          <ThemedView className="flex-row items-center p-4 rounded-xl mb-6 border-blue-500 border bg-blue-50">
            <RenderIcon item={selectedIcon} color="#2563eb" size={28} />
            <ThemedText className="text-base font-bold ml-3 text-blue-700">{paymentName}</ThemedText>
          </ThemedView>
        )}

        {/* Submit Button */}
        <Button
          title={id ? "Update" : "Save"}
          onClickEvent={id ? handleUpdatePaymentOption : handleAddPaymentOption}
        />

        {/* Description Text Below Button */}
        <ThemedText color="#374151" className="mt-6 text-lg leading-7 text-gray-500">
          Please choose an icon that best represents this payment method. This helps identify payment methods quickly in the app.
        </ThemedText>

      </View>
    </SafeAreacontext>
  );
};

export default PaymentOption;