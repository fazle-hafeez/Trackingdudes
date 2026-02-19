import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from "react-native";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import PageHeader from "../../../src/components/PageHeader";
import Button from "../../../src/components/Button";
import Input from "../../../src/components/Input";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { readCache, storeCache } from "../../../src/offline/cache";
import { OfflineContext } from "../../../src/offline/OfflineProvider";
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";
import { router, useLocalSearchParams } from "expo-router";
import { useDebounce } from "../../../src/hooks/useDebounce";
import { parseIconString, RenderIcon } from "../../../src/helper";
import { PAYMENT_OPTION_ICONS } from "../../../src/constants/icons";
import IconPicker from "../../../src/components/IconPicker";
import { useTheme } from "../../../src/context/ThemeProvider";

const CACHE_KEY = "expense_cache_data";

// Helper to build icon string like "Ion:cash" for API/Cache
const buildIconString = (iconObj) => iconObj ? `${iconObj.prefix}:${iconObj.icon}` : "";

const PaymentOption = () => {
  const { showModal, setGlobalLoading, hideModal } = useAuth();
  const { isConnected } = useContext(OfflineContext);
  const { id = null, activeTab } = useLocalSearchParams();
  const { post, put, get } = useApi();
  const pickerRef = useRef(null)
  const { darkMode } = useTheme()

  const [paymentName, setPaymentName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [message, setMessage] = useState("");
  const [messageStatus, setMessageStatus] = useState(false);
  const [paymentList, setPaymentList] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const debouncedName = useDebounce(paymentName, 600);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [vendorError, setVendorErr] = useState("")



  const suggestedIcons = useMemo(() => {
    return PAYMENT_OPTION_ICONS.slice(0, 6);
  }, []);


  // Map stored icon string (prefix:name) back to full object for the UI
  // Improved helper to find icon even if prefix is missing
  const getFullIconObject = (iconStr) => {
    if (!iconStr) return null;

    // Case 1: If string contains ":" (e.g., "Ion:cash")
    const parsed = parseIconString(iconStr);

    // Case 2: Try to find by icon name directly if prefix search fails
    const found = PAYMENT_OPTION_ICONS.find(
      i =>
        i.icon?.toLowerCase() === parsed.icon?.toLowerCase() &&
        i.prefix?.toLowerCase() === parsed.type?.toLowerCase()
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
            const res = await get(`my-expenses/payment-options/payment-option?id=${id}&t_=${Date.now()}`, { useBearerAuth: true });
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
    if (!paymentName?.trim()) {
      setVendorErr("Field is required!")
      return;
    }

    if (!selectedIcon) {
      showModal(
        "Please select an icon that best represents this payment option...",
        "warning"
      );
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

    if (!paymentName?.trim()) {
      setVendorErr("Field is required!")
      return;
    }

    if (!selectedIcon) {
      showModal(
        "Please select an icon that best represents this payment option...",
        "warning"
      );
      return;
    }
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


  //=================================
  //=======Filter option array == 
  //=================================

  const MAIN_CATEGORY_FILTER = [
    { label: "Credit Cards", value: "credit_card" },
    { label: "Bank Accounts", value: "bank_account" },
    { label: "Digital Wallets", value: "digital_wallet" },
    { label: "Processors", value: "payment_processor" },
    { label: "BNPL", value: "bnpl_financing" },
    { label: "Cash Methods", value: "cash" },
    { label: "Crypto", value: "crypto" }
  ];

  return (
    <SafeAreacontext bgColor="#eff6ff" className="flex-1">

      {/* Page Header */}
      <PageHeader routes={`${id ? "Edit Payment Option" : "Adding Payment Option"}`} />

      {/* Keyboard handler for inputs */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >

        <ScrollView contentContainerStyle={{ padding: 12 }} >

          <ThemedView className="p-4 rounded-lg mt-2 mb-4 " style={{ elevation: 2 }} >
            <ThemedText color="#374151" className="text-lg  mb-1">
              Choose a popular payment option or add a new one
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
                        setPaymentName(item.label);
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
                        prefix={item.prefix}
                        type="payment"
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

            <ThemedText className="mb-2">Give the payment option a label or name:  </ThemedText>
            <Input
              placeholder="Enter vendor name here"
              value={paymentName}
              // Open icon picker from input icon *
              rightIcon={true}
              iconEvent={() => pickerRef.current?.open()}
              onchange={(val) => {
                const textValue = typeof val === 'object' ? val?.label : val;

                setPaymentName(textValue || "");

                // Only set icon when user selects from picker
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
            onClickEvent={id ? handleUpdatePaymentOption : handleAddPaymentOption}
          />


          {/* ---------------- Info Card ---------------- */}
          <View className="p-2 rounded-lg mt-2" >
            <ThemedText color="#374151" className="text-lg  mb-1">
              Please choose an icon that best represents this payment option and give it a proper name.
              This helps identify payment option quickly inside the app.
            </ThemedText>
          </View>

        </ScrollView>
      </KeyboardAvoidingView >

      {/* ---------------- Hidden Full Icon Picker ---------------- */}
      <View View className="opacity-0" >
        <IconPicker
          ref={pickerRef}
          placeholder="Select Payment option"
          modalTitle="Choose a payment option"
          inputPlaceholder="Search payment option......"
          label="payment-option"
          items={PAYMENT_OPTION_ICONS}
          value={selectedIcon}
          isPickerContentShown={true}
          filterOptions={MAIN_CATEGORY_FILTER}
          onChange={(val) => {
            console.log("selected icon :", val);
            setPaymentName(val.label);
            setSelectedIcon(val);
            setIsPickerVisible(false);
            setIsFocused(true);
          }}
        />
      </View>

    </SafeAreacontext >
  );
};



export default PaymentOption;