

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeProvider";
import Input from "./Input";
import { ThemedText } from "./ThemedColor";
import { useModalBars } from "../hooks/useModalBar";

const { height } = Dimensions.get("window");

const Select = ({
  items = [],
  value = null,
  onChange = () => {},
  onOpen = () => {},
  loading = false,
  placeholder = "Select item...",
  error = "",
  disabled = false,
  modalTitle = "Choose",
  emptyText = "No items found",
  message,
  iconVisibility = false, // NEW PARAMETER
}) => {
  const { darkMode } = useTheme();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState(items);

  useModalBars( open, darkMode)

  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const filtered = items.filter((item) =>
      item?.label?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredItems(filtered);
}, [searchQuery, items]);

  const isSelected = (item) => value === item.value;

  const toggleItem = (item) => {
    if (disabled) return;
    onChange(item.value);
    closeModal();
  };

 const selectedLabel = () => {
    if (!value) return placeholder;
    const sel = items.find((i) => i.value === value);
    return sel ? sel.label : value || placeholder;
};

  const openModal = () => {
    if (disabled) return;
    onOpen();
    setOpen(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 200,
        easing: Easing.in(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start(() => setOpen(false));
    setSearchQuery("");
  };

  const borderColor = error
    ? "border-red-500"
    : disabled
    ? "border-gray-300 opacity-60"
    : darkMode
    ? "border-gray-700"
    : "border-['#ccc']";

  const textColor =
    selectedLabel() === placeholder
      ? darkMode
        ? "text-gray-400"
        : "text-['#646060ff']"
      : darkMode
      ? "text-gray-400"
      : "text-['#646060ff']";

  const modalBg = darkMode ? "#1f2937" : "white";
  const modalText = darkMode ? "text-gray-300" : "text-gray-900";
  const emptyTextColor = darkMode ? "text-gray-500" : "text-gray-500";

  return (
    <View>
      {/* Select Control */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={openModal}
        className={`border rounded-md px-4 py-4 flex-row justify-between items-center ${borderColor}`}
      >
        <Text numberOfLines={1} className={`text-lg flex-1 ${textColor}`}>
          {selectedLabel()}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={darkMode ? "#aaa" : "#555"}
        />
      </TouchableOpacity>

      {error ? <Text className="text-red-500 text-sm mt-1">{error}</Text> : null}

      {/* Animated Modal */}
      {open && (
        <Modal transparent visible={open} animationType="none">
          <Animated.View
            style={{ flex: 1, backgroundColor: "black", opacity: fadeAnim }}
          />
          <Animated.View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              transform: [{ translateY: slideAnim }],
              backgroundColor: modalBg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "70%",
              padding: 16,
            }}
          >
            {/* Header */}
            <View className="flex-row justify-between items-center mb-2">
              <Text className={`text-lg font-semibold ${modalText}`}>
                {modalTitle}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Text className="text-blue-500 font-medium">Close</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            {items.length > 0  && (
              <Input
                className={"my-2"}
                placeholder="Search..."
                value={searchQuery}
                onchange={setSearchQuery}
              />
            )}

            {/* List */}
            {loading ? (
              <View className="py-10 justify-center items-center">
                <ActivityIndicator
                  size={35}
                  color={darkMode ? "#9CA3AF" : "#6B7280"}
                />
              </View>
            ) : (
              <FlatList
                data={filteredItems}
                keyExtractor={(i) => i.key || i.value?.toString() || Math.random().toString()}
                keyboardShouldPersistTaps="handled"
                numColumns={iconVisibility ? 3 : 1}
                columnWrapperStyle={iconVisibility ? { justifyContent: "space-between" } : null}
                ListEmptyComponent={() => (
                  <Text className={`text-center py-4 ${emptyTextColor}`}>
                    {emptyText}
                  </Text>
                )}
                renderItem={({ item }) => {
                  const selected = isSelected(item);
                  if (!iconVisibility) {
                    // OLD DESIGN
                    return (
                      <TouchableOpacity
                        onPress={() => toggleItem(item)}
                        className={`flex-row justify-between items-center py-3 px-3 border-b ${
                          darkMode ? "border-gray-700" : "border-gray-100"
                        } ${selected ? "bg-indigo-200" : ""}`}
                      >
                        <Text
                          className={`text-base ${
                            selected
                              ? "font-semibold text-indigo-600"
                              : darkMode
                              ? "text-gray-300"
                              : "text-gray-900"
                          }`}
                        >
                          {item.label}
                        </Text>
                        {selected && (
                          <Ionicons name="checkmark" size={18} color="#4F46E5" />
                        )}
                      </TouchableOpacity>
                    );
                  } else {
                    // NEW DESIGN - ICON + LABEL
                    return (
                      <TouchableOpacity
                        onPress={() => toggleItem(item)}
                        style={{
                          width: "30%",
                          paddingVertical: 14,
                          borderRadius: 12,
                          alignItems: "center",
                          marginBottom: 14,
                          backgroundColor: selected
                            ? darkMode
                              ? "#374151"
                              : "#E0E7FF"
                            : darkMode
                            ? "#111827"
                            : "#F3F4F6",
                          borderWidth: selected ? 1.5 : 1,
                          borderColor: selected
                            ? "#3B82F6"
                            : darkMode
                            ? "#374151"
                            : "#E5E7EB",
                        }}
                      >
                        {item.icon && (
                          <Ionicons
                            name={item.icon}
                            size={26}
                            color={darkMode ? "#D1D5DB" : "#111827"}
                          />
                        )}
                        <Text
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            color: darkMode ? "#D1D5DB" : "#374151",
                            textAlign: "center",
                          }}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                }}
              />
            )}

            {/* Bottom message */}
            {message && (
              <ThemedText
                color={"#646060ff"}
                className="mt-3 mb-2 text-lg "
              >
                {message}
              </ThemedText>
            )}
          </Animated.View>
        </Modal>
      )}
    </View>
  );
};

export default Select;
