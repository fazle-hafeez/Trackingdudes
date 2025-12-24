import React, { useState, useEffect, useContext } from "react";
import { View } from "react-native";
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

const CACHE_KEY = "expense_cache_data"; // same cache key as Expense page

const CategoryPage = () => {
  const { showModal, setGlobalLoading } = useAuth();
  const { offlineQueue, isConnected } = useContext(OfflineContext);
  const { post } = useApi();

  const [categoryName, setCategoryName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("");
  const [message, setMessage] = useState("");
  const [messageStatus, setMessageStatus] = useState(false);
  const [categoryList, setCategoryList] = useState([]);

  const iconOptions = [
    { icon: "briefcase-outline", label: "Office" },
    { icon: "airplane-outline", label: "Travel" },
    { icon: "flash-outline", label: "Utility" },
    { icon: "cart-outline", label: "Shopping" },
    { icon: "restaurant-outline", label: "Food" },
    { icon: "heart-outline", label: "Health" },
  ];

  // Load cached categories on mount
  useEffect(() => {
    (async () => {
      const cachedWrap = (await readCache(CACHE_KEY)) || {};
      const cachedCategories = Array.isArray(cachedWrap.category) ? cachedWrap.category : [];
      setCategoryList(cachedCategories);
    })();
  }, []);

  // Check name availability
  useEffect(() => {
    if (!categoryName?.trim()) {
      setMessage("");
      setMessageStatus(false);
      return;
    }
    const duplicate = categoryList.some(
      (c) => c?.label?.toLowerCase() === categoryName.trim().toLowerCase()
    );
    if (duplicate) {
      setMessage("This name is already used");
      setMessageStatus(true);
    } else {
      setMessage("Name is available");
      setMessageStatus(false);
    }
  }, [categoryName, categoryList]);

  const handleAddCategory = async () => {
    if (!categoryName?.trim() || !selectedIcon) {
      showModal("Enter category name and select icon", "error");
      return;
    }
    if (messageStatus) {
      showModal("Name already used, choose another", "error");
      return;
    }

    setGlobalLoading(true);
    try {
      const newCategory = {
        id: Date.now().toString(),
        label: categoryName.trim(),
        name: categoryName.trim(),
        value: categoryName.trim().toLowerCase().replace(/\s/g, "-"),
        icon: selectedIcon,
        pending: true,
        type: "category",
      };

      // Update UI immediately
      setCategoryList((prev) => [...prev, newCategory]);
      setCategoryName("");
      setSelectedIcon("");
      setMessage("");
      setMessageStatus(false);

      // Update cache
      const cachedWrap = (await readCache(CACHE_KEY)) || {};
      const prevCategories = Array.isArray(cachedWrap.category) ? cachedWrap.category : [];
      cachedWrap.category = [...prevCategories, newCategory];
      await storeCache(CACHE_KEY, cachedWrap);

      // Attempt online save
      let isOffline = false;
      if (isConnected) {
        try {
          await post("/category/create", {
            label: newCategory.label,
            value: newCategory.value,
            icon: newCategory.icon,
          });
          newCategory.pending = false;
        } catch (err) {
          isOffline = true;
        }
      } else {
        isOffline = true;
      }

      // Update cache with online status
      cachedWrap.category = cachedWrap.category.map((c) =>
        c.id === newCategory.id ? newCategory : c
      );
      await storeCache(CACHE_KEY, cachedWrap);

      showModal(
        isOffline
          ? "Category saved locally. It will sync when online."
          : "Category saved successfully online!",
        isOffline ? "warning" : "success"
      );
    } catch (err) {
      console.error(err);
      showModal("Failed to save category", "error");
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <SafeAreacontext className="flex-1" bgColor="#eff6ff">
      <PageHeader routes="Adding Category" />
      <View className="p-4 flex-1">
        <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
          <ThemedText color="#374151" className="text-center text-lg font-medium mb-1">
            Add Category
          </ThemedText>
        </ThemedView>

        <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
          <ThemedText className="mb-1">Category:</ThemedText>
          <Input
            placeholder="Enter category name"
            value={categoryName}
            onchange={setCategoryName}
          />
          {message ? (
            <ThemedText className="mt-1" color={messageStatus ? "#dc2626" : "#16a34a"}>
              {message}
            </ThemedText>
          ) : null}
        </ThemedView>

        <ThemedView className="p-4 rounded-lg mb-3" style={{ elevation: 2 }}>
          <ThemedText className="mb-2">Choose an icon:</ThemedText>
          <Select
            items={iconOptions.map((icon) => ({
              label: icon.label,
              value: icon.icon,
              icon: icon.icon,
            }))}
            value={selectedIcon}
            onChange={setSelectedIcon}
            iconVisibility={true}
            placeholder="Select icon"
          />
        </ThemedView>

        {categoryName && selectedIcon && (
          <ThemedView
            className="flex-row items-center p-4 rounded-xl mb-3"
            style={{ elevation: 5, borderColor: "#2563eb", borderWidth: 1 }}
          >
            <Ionicons name={selectedIcon} size={28} color="#2563eb" className="mr-3" />
            <ThemedText className="text-base font-semibold">{categoryName}</ThemedText>
          </ThemedView>
        )}

        <Button title="Save" onClickEvent={handleAddCategory} />

        <ThemedText color="#374151" className="mt-4 text-lg">
          Please choose an icon that best represents this category.
          This helps identify categories quickly in the app.
        </ThemedText>
      </View>
    </SafeAreacontext>
  );
};

export default CategoryPage;
