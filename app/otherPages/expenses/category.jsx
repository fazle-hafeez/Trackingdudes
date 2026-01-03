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
import { useLocalSearchParams } from "expo-router";
import { router } from "expo-router";

const CACHE_KEY = "expense_cache_data"; // same cache key as Expense page

const CategoryPage = () => {
  const { showModal, setGlobalLoading, hideModal } = useAuth();
  const { isConnected } = useContext(OfflineContext);
  const { post } = useApi();
  const { id = null } = useLocalSearchParams();

  const [categoryName, setCategoryName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("");
  const [message, setMessage] = useState("");
  const [messageStatus, setMessageStatus] = useState(false);
  const [categoryList, setCategoryList] = useState([]);
  const [isFocused, setIsFocused] = useState(false);

  const iconOptions = [
    { icon: "briefcase-outline", label: "Office" },
    { icon: "airplane-outline", label: "Travel" },
    { icon: "flash-outline", label: "Utility" },
    { icon: "cart-outline", label: "Shopping" },
    { icon: "restaurant-outline", label: "Food" },
    { icon: "heart-outline", label: "Health" },
  ];

  // Load cached categories & edit mode
  useEffect(() => {
    (async () => {
      const cachedWrap = (await readCache(CACHE_KEY)) || {};
      const cachedCategories = Array.isArray(cachedWrap.category) ? cachedWrap.category : [];
      setCategoryList(cachedCategories);

      if (id) {
        const old = cachedCategories.find((c) => c.id.toString() === id.toString());
        if (old) {
          setCategoryName(old.label);
          setSelectedIcon(old.icon);
        }
      }
    })();
  }, []);

  // Check name availability
  useEffect(() => {
    if (!isFocused) return;

    if (!categoryName?.trim()) {
      setMessage("");
      setMessageStatus(false);
      return;
    }

    const duplicate = categoryList.some((c) => {
      if (id && c.id.toString() === id.toString()) return false;
      return c.label.toLowerCase() === categoryName.trim().toLowerCase();
    });

    if (duplicate) {
      setMessage("This name is already used");
      setMessageStatus(true);
    } else {
      setMessage("Name is available");
      setMessageStatus(false);
    }
  }, [categoryName, categoryList]);

  // ADD Category
  const handleAddCategory = async () => {
    if (!categoryName.trim() || !selectedIcon) {
      showModal("Enter category name & select icon", "error");
      return;
    }
    if (messageStatus) {
      showModal("Duplicate name, choose another", "error");
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
        pending: !isConnected,
        serverId: null,
        type: "category",
      };

      setCategoryList((prev) => [...prev, newCategory]);
      setCategoryName("");
      setSelectedIcon("");
      setMessage("");
      setMessageStatus(false);

      const cachedWrap = (await readCache(CACHE_KEY)) || {};
      const prevList = Array.isArray(cachedWrap.category) ? cachedWrap.category : [];
      cachedWrap.category = [...prevList, newCategory];
      await storeCache(CACHE_KEY, cachedWrap);

      let isOffline = false;

      if (isConnected) {
        try {
          const res = await post("/category/create", {
            label: newCategory.label,
            value: newCategory.value,
            icon: newCategory.icon,
          });
          newCategory.serverId = res?.data?.id ?? null;
          newCategory.pending = false;
        } catch {
          isOffline = true;
        }
      } else {
        isOffline = true;
      }

      cachedWrap.category = cachedWrap.category.map((c) =>
        c.id === newCategory.id ? newCategory : c
      );
      await storeCache(CACHE_KEY, cachedWrap);

      showModal(
        isOffline
          ? "Category saved locally. Will sync when online."
          : "Category saved successfully online!",
        isOffline ? "warning" : "success",
        false,
        [
          {
            label: "Add More",
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
        ]
      );
    } finally {
      setGlobalLoading(false);
    }
  };

  // UPDATE Category
  const handleUpdateCategory = async () => {
    if (!categoryName.trim() || !selectedIcon) {
      showModal("Enter category name & select icon", "error");
      return;
    }
    if (messageStatus) {
      showModal("Duplicate name, choose another", "error");
      return;
    }

    setGlobalLoading(true);

    try {
      const cachedWrap = (await readCache(CACHE_KEY)) || {};
      const list = Array.isArray(cachedWrap.category) ? cachedWrap.category : [];
      const old = list.find((c) => c.id.toString() === id.toString());

      if (!old) {
        showModal("Category not found", "error");
        return;
      }

      const updated = {
        ...old,
        label: categoryName.trim(),
        name: categoryName.trim(),
        value: categoryName.trim().toLowerCase().replace(/\s/g, "-"),
        icon: selectedIcon,
        pending: !isConnected,
      };

      const updatedList = list.map((c) => (c.id === old.id ? updated : c));
      cachedWrap.category = updatedList;
      await storeCache(CACHE_KEY, cachedWrap);
      setCategoryList(updatedList);

      let isOffline = false;
      if (isConnected) {
        try {
          await post("/category/update", {
            id: old.serverId ?? id,
            label: updated.label,
            value: updated.value,
            icon: updated.icon,
          });
          updated.pending = false;
        } catch {
          isOffline = true;
        }
      } else {
        isOffline = true;
      }

      cachedWrap.category = cachedWrap.category.map((c) =>
        c.id === updated.id ? updated : c
      );
      await storeCache(CACHE_KEY, cachedWrap);

      showModal(
        isOffline
          ? "Category updated locally. Will sync when online."
          : "Category updated successfully!",
        "success",
        false,
        [
          { label: "View", bgColor: "bg-green-600", onPress: () => hideModal() },
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
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <SafeAreacontext className="flex-1" bgColor="#eff6ff">
      <PageHeader routes={`${id ? "Edit" : "Adding"} Category`} />
      <View className="p-4 flex-1">
        <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
          <ThemedText color="#374151" className="text-center text-lg font-medium mb-1">
            {id ? "Edit Category" : "Add Category"}
          </ThemedText>
        </ThemedView>

        <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
          <ThemedText className="mb-1">Category:</ThemedText>
          <Input
            placeholder="Enter category name"
            value={categoryName}
            onchange={setCategoryName}
            onFocus={() => setIsFocused(true)}
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

        <Button
          title={id ? "Update" : "Save"}
          onClickEvent={id ? handleUpdateCategory : handleAddCategory}
        />

        <ThemedText color="#374151" className="mt-4 text-lg">
          Please choose an icon that best represents this category. This helps identify categories quickly in the app.
        </ThemedText>
      </View>
    </SafeAreacontext>
  );
};

export default CategoryPage;
