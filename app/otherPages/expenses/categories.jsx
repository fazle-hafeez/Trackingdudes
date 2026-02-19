import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import { View, Text, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import PageHeader from "../../../src/components/PageHeader";
import Button from "../../../src/components/Button";
import Input from "../../../src/components/Input";
import { readCache, storeCache } from "../../../src/offline/cache";
import { OfflineContext } from "../../../src/offline/OfflineProvider";
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";
import { router, useLocalSearchParams } from "expo-router";
import { useDebounce } from "../../../src/hooks/useDebounce";
import { parseIconString, RenderIcon } from "../../../src/helper";
import { EXPENSE_CATEGORIES_ICONS } from "../../../src/constants/icons";
import IconPicker from "../../../src/components/IconPicker";
import { useTheme } from "../../../src/context/ThemeProvider";

const CACHE_KEY = "expense_cache_data";

// Helper to build icon string like "Ion:cart"
const buildIconString = (iconObj) => iconObj ? `${iconObj.prefix}:${iconObj.icon}` : "";

const CategoryPage = () => {
  const { showModal, setGlobalLoading, hideModal } = useAuth();
  const { isConnected } = useContext(OfflineContext);
  const { id = null, activeStatus } = useLocalSearchParams(); // activeStatus helps in logic
  const { post, put, get } = useApi();
  const { darkMode } = useTheme()
  const pickerRef = useRef(null)

  const [categoryName, setCategoryName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [message, setMessage] = useState("");
  const [categoryError, setCategoryError] = useState("")
  const [messageStatus, setMessageStatus] = useState(false);
  const [categoryList, setCategoryList] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const debouncedName = useDebounce(categoryName, 600);

  const suggestedIcons = useMemo(() => {
    return EXPENSE_CATEGORIES_ICONS.slice(0, 6);
  }, []);


  const getFullIconObject = (iconStr) => {
    if (!iconStr) return null;
    const parsed = parseIconString(iconStr);
    return EXPENSE_CATEGORIES_ICONS.find(opt => opt.prefix === parsed.prefix && opt.icon === parsed.icon) ||
      { icon: parsed.icon, type: "Ionicons", prefix: parsed.prefix };
  };

  // 1. Initial Load (Cache + API)
  useEffect(() => {
    const initializeData = async () => {
      // 1. first pack data from cache (Fastest)
      const cachedWrap = (await readCache(CACHE_KEY)) || {};
      const catData = cachedWrap["categories"] || {};
      const cachedAll = [...(catData.enabled || []), ...(catData.disabled || [])];
      setCategoryList(cachedAll);

      if (id) {
        // 2. search the recored in cache
        const record = cachedAll.find(item => String(item.id) === String(id));

        // update ui when recored is availble in cache
        if (record) {
          setCategoryName(record.category || record.label || "");
          setSelectedIcon(getFullIconObject(record.icon));
        }

        // 3. hit api for fresh data when you are on online mode
        if (isConnected) {
          setGlobalLoading(true);
          try {
            const res = await get(`my-expenses/categories/category?id=${id}&_t=${Date.now()}`, { useBearerAuth: true });

            if (res?.status === "success" && res.data) {

              setCategoryName(res.data.category || "");
              setSelectedIcon(getFullIconObject(res.data.icon));
            }
          } catch (err) {
            console.log("Fetch Error:", err.message);
          } finally {
            setGlobalLoading(false);
          }
        }
      }
    };
    initializeData();
  }, [id, isConnected]);

  // 2. Name Check (Online + Offline Fallback)
  useEffect(() => {
    // Exit early if the screen is not focused or the input name is empty
    if (!isFocused || !debouncedName.trim()) {
      setMessage("");
      return;
    }

    const checkAvailability = async () => {
      setMessage("Checking...");

      /* ============================================================
         1. ONLINE CHECK (Primary Source)
         ============================================================ */
      if (isConnected) {
        try {
          const res = await get(
            `my-expenses/categories/check-availability?category=${encodeURIComponent(debouncedName)}&_t=${Date.now()}`,
            { useBearerAuth: true }
          );

          // If API returns success (category available)
          console.log(res);

          if (res?.status === "success") {
            setMessage(res.data || res.message || "The category is available ");
            setMessageStatus(false);
            return; // Stop execution here so local check doesn't overwrite
          }

          // If API returns error (category already exists)
          if (res?.status === "error") {
            setMessage(res.data || res.message || "This category is already taken");
            setMessageStatus(true);
            return; // Stop execution here
          }
        } catch (err) {
          console.log("Check API fail, falling back to local check:", err.message);
          // If API fails, code will continue to execute the local check below
        }
      }

      /* ============================================================
         2. LOCAL CHECK (Backup / Offline Source)
         ============================================================ */
      const duplicate = categoryList.some((v) => {
        // Skip the current record if we are in 'Edit' mode
        if (id && String(v.id) === String(id)) return false;

        return (
          (v.category || "").toLowerCase().trim() ===
          debouncedName.toLowerCase().trim()
        );
      });

      // Update message based on local cache search
      setMessage(
        duplicate
          ? "You have already used this category name before (Offline)"
          : "The category is available local(Offline)"
      );
      setMessageStatus(duplicate);
    };

    checkAvailability();
  }, [debouncedName, isConnected, isFocused, categoryList, id]);

  // 3. Create Category
  const handleAddCategory = async () => {

    if (!categoryName?.trim()) {
      setCategoryError("Field is required!");
      return;
    }

    if (!selectedIcon) {
      showModal(
        "Please select an icon that best represents this category...",
        "warning"
      );
      return;
    }

    setGlobalLoading(true);
    const iconString = buildIconString(selectedIcon);
    const payload = { category: categoryName.trim(), icon: iconString, status: "enabled" };

    try {
      let isOffline = !isConnected;
      try {
        const res = await post("my-expenses/categories/create", payload, { useBearerAuth: true });
        if (!res || res.offline) isOffline = true;
      } catch { isOffline = true; }

      if (isOffline) {
        const existingQueue = (await readCache("offlineQueue")) || [];
        const newEntry = {
          method: "POST",
          endpoint: "my-expenses/categories/create",
          body: payload
        };
        await storeCache("offlineQueue", [...existingQueue, newEntry]);
      }
      await storeCache("newRecordAdded", true);
      showModal(isOffline ? "Category created successfully in offline mode. Avoid duplicate names to prevent conflicts." : "Category created successfully!", isOffline ? "warning" : "success", false, [
        { label: "Add More", bgColor: "bg-green-600", onPress: () => hideModal() },
        { label: "View All", bgColor: "bg-blue-600", onPress: () => { hideModal(); router.back(); } },
      ]);
    } catch (err) { showModal(err.message, "error"); }
    finally { setGlobalLoading(false); }
  };

  // 4. Update Category (Queueing + Cache logic)
  const handleUpdateCategory = async () => {
    
    if (!categoryName?.trim()) {
      setCategoryError("Field is required!");
      return;
    }

    if (!selectedIcon) {
      showModal(
        "Please select an icon that best represents this category...",
        "warning"
      );
      return;
    }
    setGlobalLoading(true);

    let currentStatus = (activeStatus && activeStatus.toLowerCase().includes("dis")) ? "disabled" : "enabled";
    const payload = { id: String(id), category: categoryName.trim(), icon: buildIconString(selectedIcon), status: currentStatus };
    let isOffline = !isConnected;

    try {
      const res = await put("my-expenses/categories/update", payload, { useBearerAuth: true });
      if (!res || res.offline) isOffline = true;
    } catch { isOffline = true; }

    // Cache Sync
    try {
      const cachedWrap = (await readCache(CACHE_KEY)) || {};
      const catTab = cachedWrap["categories"] || { enabled: [], disabled: [] };
      const updatedItem = { ...payload, pending: isOffline };

      const cleanEnabled = (catTab.enabled || []).filter(v => String(v.id) !== String(id));
      const cleanDisabled = (catTab.disabled || []).filter(v => String(v.id) !== String(id));

      if (currentStatus === "enabled") cleanEnabled.push(updatedItem);
      else cleanDisabled.push(updatedItem);

      cachedWrap["categories"] = { enabled: cleanEnabled, disabled: cleanDisabled };
      await storeCache(CACHE_KEY, cachedWrap);
    } catch (e) { console.log("Cache update fail"); }

    // Offline Queue
    if (isOffline) {
      const queue = (await readCache("offlineQueue")) || [];
      const filtered = queue.filter(q => {
        try {
          const body = typeof q.body === "string" ? JSON.parse(q.body) : q.body;
          return String(body.id) !== String(id);
        } catch { return true; }
      });
      filtered.push(
        {
          method: "put",
          endpoint: "my-expenses/categories/update",
          body: JSON.stringify(payload)
        }
      );
      await storeCache("offlineQueue", filtered);
    }

    await storeCache("recordUpdated", true);
    showModal(isOffline ? "Category was updated successfully in offline mode. Avoid duplicate names to prevent conflicts." : "Category updated Successfully!", isOffline ? "warning" : "success", false, [
      { label: "View", bgColor: "bg-green-600", onPress: () => hideModal() },
      { label: "View All", bgColor: "bg-blue-600", onPress: () => { hideModal(); router.back(); } },
    ]);
    setGlobalLoading(false);
  };


  const filterOptions = [
    { label: "Food", value: "food" },
    { label: "Retail", value: "retail" },
    { label: "Office", value: "office" },
    { label: "Supplies", value: "supplies" },
    { label: "Transport", value: "travel" },
    { label: "utilities", value: "utilities" },
    { label: "Shipping", value: "shipping" },
    { label: "Lodging", value: "lodging" },
  ]

  return (
    <SafeAreacontext bgColor="#eff6ff" className="flex-1">

      {/* Page Header */}
      <PageHeader routes={` ${id ? "Edit Category" : "Adding Category"}`} />

      {/* Keyboard handler for inputs */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >

        <ScrollView contentContainerStyle={{ padding: 12 }} >

          <ThemedView className="p-4 rounded-lg mt-2 mb-4 " style={{ elevation: 2 }} >
            <ThemedText color="#374151" className="text-lg  mb-1">
              Choose a popular category or add a new one
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
                        setCategoryName(item.label || item.category);
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
                        type="category"
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

            <ThemedText className="mb-2">Give the category a label or name:  </ThemedText>
            <Input
              placeholder="Enter vendor name here"
              value={categoryName}
              // Open icon picker from input icon *
              rightIcon={true}
              iconEvent={() => pickerRef.current?.open()}
              onchange={(val) => {
                // If value comes from picker (object), extract label
                const textValue = typeof val === 'object' ? val?.label : val;

                setCategoryName(textValue || "");

                // Set selected icon only if full object received
                if (typeof val === 'object' && val !== null) {
                  setSelectedIcon(val);
                }

                setIsFocused(true);

              }}

              inputError={categoryError}
              setInputError={setCategoryError}
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
            onClickEvent={id ? handleUpdateCategory : handleAddCategory}
          />


          {/* ---------------- Info Card ---------------- */}
          <View className="p-2 rounded-lg mt-2" >
            <ThemedText color="#374151" className="text-lg  mb-1">
              Please choose an icon that best represents this category and give it a proper name.
              This helps identify category quickly inside the app.
            </ThemedText>
          </View>

        </ScrollView>
      </KeyboardAvoidingView >

      {/* ---------------- Hidden Full Icon Picker ---------------- */}
      <View View className="opacity-0" >
        <IconPicker
          ref={pickerRef}
          label="category"
          modalTitle="Choose a category"
          inputPlaceholder="Search category......"
          items={EXPENSE_CATEGORIES_ICONS}
          value={selectedIcon}
          isPickerContentShown={true}
          filterOptions={filterOptions}
          onChange={(val) => {
            console.log("selected icon :", val);
            setCategoryName(val.label);
            setSelectedIcon(val);
            setIsPickerVisible(false);
            setIsFocused(true);
          }}
        />
      </View>

    </SafeAreacontext >
  );
};

export default CategoryPage;