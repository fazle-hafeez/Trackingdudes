import React, { useState, useEffect, useContext } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { useDebounce } from "../../../src/hooks/useDebounce";
import { parseIconString } from "../../../src/helper";

const CACHE_KEY = "expense_cache_data";

// Helper to build icon string like "Ion:cart"
const buildIconString = (iconObj) => iconObj ? `${iconObj.prefix}:${iconObj.icon}` : "";

const CategoryPage = () => {
  const { showModal, setGlobalLoading, hideModal } = useAuth();
  const { isConnected } = useContext(OfflineContext);
  const { id = null, activeStatus } = useLocalSearchParams(); // activeStatus helps in logic
  const { post, put, get } = useApi();

  const [categoryName, setCategoryName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [message, setMessage] = useState("");
  const [messageStatus, setMessageStatus] = useState(false);
  const [categoryList, setCategoryList] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const debouncedName = useDebounce(categoryName, 600);

  const iconOptions = [
    // --- Food & Dining ---
    { icon: "fast-food", label: "Food / Snacks", type: "Ionicons", prefix: "Ion" },
    { icon: "restaurant", label: "Dining Out", type: "Ionicons", prefix: "Ion" },
    { icon: "coffee", label: "Coffee/Tea", type: "FontAwesome", prefix: "font" },
    { icon: "pizza", label: "Fast Food", type: "Ionicons", prefix: "Ion" },
    { icon: "ice-cream", label: "Desserts", type: "Ionicons", prefix: "Ion" },
    { icon: "wine", label: "Drinks/Bar", type: "Ionicons", prefix: "Ion" },

    // --- Shopping & Lifestyle ---
    { icon: "cart", label: "Grocery/Shopping", type: "Ionicons", prefix: "Ion" },
    { icon: "shopping-bag", label: "Clothing/Fashion", type: "FontAwesome", prefix: "font" },
    { icon: "gift", label: "Gifts/Donations", type: "FontAwesome", prefix: "font" },
    { icon: "gem", label: "Jewelry/Luxury", type: "FontAwesome5", prefix: "font5" },
    { icon: "cut", label: "Salon/Barber", type: "FontAwesome", prefix: "font" },

    // --- Home & Utilities ---
    { icon: "home", label: "Rent/Mortgage", type: "FontAwesome", prefix: "font" },
    { icon: "flash", label: "Electricity", type: "Ionicons", prefix: "Ion" },
    { icon: "water", label: "Water Bill", type: "Ionicons", prefix: "Ion" },
    { icon: "local-gas-station", label: "Gas/Fuel", type: "MaterialIcons", prefix: "mater" },
    { icon: "trash", label: "Maintenance", type: "FontAwesome", prefix: "font" },
    { icon: "hammer", label: "Repairs", type: "Ionicons", prefix: "Ion" },
    { icon: "bed", label: "Furniture", type: "FontAwesome", prefix: "font" },

    // --- Transport & Travel ---
    { icon: "bus", label: "Public Transport", type: "FontAwesome", prefix: "font" },
    { icon: "car-sport", label: "Car Expense", type: "Ionicons", prefix: "Ion" },
    { icon: "bicycle", label: "Bike/Cycle", type: "Ionicons", prefix: "Ion" },
    { icon: "airplane", label: "Travel/Flights", type: "Ionicons", prefix: "Ion" },
    { icon: "subway", label: "Metro/Train", type: "Ionicons", prefix: "Ion" },
    { icon: "map", label: "Tours", type: "FontAwesome", prefix: "font" },

    // --- Health & Fitness ---
    { icon: "medical", label: "Doctor/Medicine", type: "Ionicons", prefix: "Ion" },
    { icon: "fitness", label: "Gym/Workout", type: "Ionicons", prefix: "Ion" },
    { icon: "heart", label: "Personal Care", type: "FontAwesome", prefix: "font" },
    { icon: "bandage", label: "First Aid", type: "Ionicons", prefix: "Ion" },

    // --- Education & Work ---
    { icon: "book", label: "Education/Fees", type: "FontAwesome", prefix: "font" },
    { icon: "briefcase", label: "Business/Work", type: "FontAwesome", prefix: "font" },
    { icon: "laptop", label: "Electronics/Tech", type: "FontAwesome", prefix: "font" },
    { icon: "pencil", label: "Stationary", type: "FontAwesome", prefix: "font" },
    { icon: "newspaper", label: "Subscriptions", type: "Ionicons", prefix: "Ion" },

    // --- Entertainment ---
    { icon: "game-controller", label: "Gaming", type: "Ionicons", prefix: "Ion" },
    { icon: "film", label: "Movies/Cinema", type: "FontAwesome", prefix: "font" },
    { icon: "musical-notes", label: "Music/Events", type: "Ionicons", prefix: "Ion" },
    { icon: "camera", label: "Photography", type: "FontAwesome", prefix: "font" },

    // --- Finance & Bills ---
    { icon: "bank", label: "Banking/Taxes", type: "FontAwesome", prefix: "font" },
    { icon: "card", label: "Credit Card Bill", type: "Ionicons", prefix: "Ion" },
    { icon: "shield-checkmark", label: "Insurance", type: "Ionicons", prefix: "Ion" },
    { icon: "wallet", label: "Savings", type: "Ionicons", prefix: "Ion" },
    { icon: "cash", label: "Loan/EMI", type: "Ionicons", prefix: "Ion" },

    // --- Miscellaneous ---
    { icon: "paw", label: "Pets", type: "FontAwesome", prefix: "font" },
    { icon: "leaf", label: "Garden/Plants", type: "FontAwesome", prefix: "font" },
    { icon: "help-circle", label: "Other/Misc", type: "Ionicons", prefix: "Ion" },
  ];

  const getFullIconObject = (iconStr) => {
    if (!iconStr) return null;
    const parsed = parseIconString(iconStr);
    return iconOptions.find(opt => opt.prefix === parsed.prefix && opt.icon === parsed.icon) ||
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
          : "The category is available (Offline)"
      );
      setMessageStatus(duplicate);
    };

    checkAvailability();
  }, [debouncedName, isConnected, isFocused, categoryList, id]);

  // 3. Create Category
  const handleAddCategory = async () => {
    if (!categoryName?.trim() || !selectedIcon) { showModal("Enter name and select icon", "error"); return; }
    setGlobalLoading(true);
    const iconString = buildIconString(selectedIcon);
    const payload = { category: categoryName.trim(), icon: iconString, status: "enabled" };

    try {
      let isOffline = false;
      try {
        const res = await post("my-expenses/categories/create", payload, { useBearerAuth: true });
        if (!res || res.offline) isOffline = true;
      } catch { isOffline = true; }

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
    if (!categoryName?.trim() || !selectedIcon || messageStatus) return;
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
      filtered.push({ method: "put", endpoint: "my-expenses/categories/update", body: JSON.stringify(payload) });
      await storeCache("offlineQueue", filtered);
    }

    await storeCache("recordUpdated", true);
    showModal(isOffline ? "Category was updated successfully in offline mode. Avoid duplicate names to prevent conflicts." : "Category updated Successfully!", isOffline ? "warning" : "success", false, [
      { label: "View", bgColor: "bg-green-600", onPress: () => hideModal() },
      { label: "View All", bgColor: "bg-blue-600", onPress: () => { hideModal(); router.back(); } },
    ]);
    setGlobalLoading(false);
  };

  const RenderIcon = ({ item, size = 26, color = "#000" }) => {
    if (!item) return null;
    switch (item.type) {
      case "FontAwesome": return <FontAwesome name={item.icon} size={size} color={color} />;
      case "FontAwesome5": return <FontAwesome5 name={item.icon} size={size} color={color} />;
      case "MaterialIcons": return <MaterialIcons name={item.icon} size={size} color={color} />;
      default: return <Ionicons name={item.icon} size={size} color={color} />;
    }
  };

  return (
    <SafeAreacontext bgColor="#eff6ff" className="flex-1">
      <PageHeader routes={` ${id ? "Edit Category" : "Adding Category"}`} />
      <View className="p-4 flex-1">
        <ThemedView className="p-4 rounded-lg mb-5 shadow-md">
          <ThemedText className="text-center text-lg font-medium">{id ? "Edit Category" : "Add Category"}</ThemedText>
        </ThemedView>

        <ThemedView className="p-4 rounded-lg mb-5 shadow-md">
          <ThemedText className="mb-1 font-medium">Category Name:</ThemedText>
          <Input placeholder="Enter category label" value={categoryName} onchange={(v) => { setCategoryName(v); setIsFocused(true); }} />
          {message ? (
            <Text
              preventWrap={true}
              style={{
                marginTop: 4,
                fontWeight: '400',
                color: messageStatus ? '#dc2626' : '#16a34a' // Pure Red and Pure Green
              }}
            >
              {message}
            </Text>
          ) : null}
        </ThemedView>

        <ThemedView className="p-4 rounded-lg  shadow-md">
          <ThemedText className="mb-2 font-medium">Choose an icon:</ThemedText>
          <Select
            items={iconOptions.map(i => ({ label: i.label, value: i.icon, icon: i.icon, type: i.type, prefix: i.prefix }))}
            value={selectedIcon?.icon || ""}
            onChange={(val) => setSelectedIcon(iconOptions.find(i => i.icon === val))}
            iconVisibility={true}
            placeholder="Select icon"
          />
        </ThemedView>

        {categoryName && selectedIcon && (
          <ThemedView className="flex-row items-center p-4 shadow-md rounded-lg my-4 border-blue-500 border bg-blue-50">
            <RenderIcon item={selectedIcon} color="#2563eb" size={28} />
            <ThemedText className="text-base font-bold ml-3 text-blue-700">{categoryName}</ThemedText>
          </ThemedView>
        )}

        <Button title={id ? "Update" : "Save"} onClickEvent={id ? handleUpdateCategory : handleAddCategory} />
        <ThemedText color="#374151" className="mt-3 text-lg">

          Please choose an icon that best represents this category. This helps identify category quickly in the app.

        </ThemedText>
      </View>
    </SafeAreacontext>
  );
};

export default CategoryPage;