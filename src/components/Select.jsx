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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

const Select = ({
  items = [],
  value = null,
  onChange = () => {},
  placeholder = "Select item...",
  error = "",
  disabled = false,
  modalTitle = "Choose",
  emptyText = "No items found",
}) => {
  const [open, setOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(height)).current; // modal starts off-screen
  const fadeAnim = useRef(new Animated.Value(0)).current; // background opacity

  const isSelected = (item) => value === item.value;

  const toggleItem = (item) => {
    if (disabled) return;
    onChange(item.value);
    closeModal();
  };

  const selectedLabel = () => {
    const sel = items.find((i) => i.value === value);
    return sel ? sel.label : placeholder;
  };

  const openModal = () => {
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
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 200,
        easing: Easing.in(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start(() => setOpen(false));
  };

  return (
    <View className="mb-2">
      {/* Select Control */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => !disabled && openModal()}
        className={`border rounded-md px-3 py-3 flex-row justify-between items-center ${
          error
            ? "border-red-500"
            : disabled
            ? "border-gray-300 opacity-60"
            : "border-gray-400"
        }`}
      >
        <Text
          numberOfLines={1}
          className={`text-base flex-1 ${
            selectedLabel() === placeholder ? "text-gray-400" : "text-gray-900"
          }`}
        >
          {selectedLabel()}
        </Text>

        <View className="ml-2">
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={20}
            color="#555"
          />
        </View>
      </TouchableOpacity>

      {error ? (
        <Text className="text-red-500 text-sm mt-1">{error}</Text>
      ) : null}

      {/* Animated Modal */}
      {open && (
        <Modal transparent visible={open} animationType="none">
          <Animated.View
            style={{
              flex: 1,
              backgroundColor: "black",
              opacity: fadeAnim,
            }}
          />
          <Animated.View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              transform: [{ translateY: slideAnim }],
              backgroundColor: "white",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "70%",
              padding: 16,
            }}
          >
            {/* Header */}
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-lg font-semibold">{modalTitle}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Text className="text-blue-500 font-medium">Close</Text>
              </TouchableOpacity>
            </View>

            {/* List */}
            <FlatList
              data={items}
              keyExtractor={(i) => i.value.toString()}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={() => (
                <Text className="text-gray-500 text-center py-4">
                  {emptyText}
                </Text>
              )}
              renderItem={({ item }) => {
                const selected = isSelected(item);
                return (
                  <TouchableOpacity
                    onPress={() => toggleItem(item)}
                    className={`flex-row justify-between items-center py-3 px-3 border-b border-gray-100 ${
                      selected ? "bg-indigo-50" : ""
                    }`}
                  >
                    <Text
                      className={`text-base ${
                        selected ? "font-semibold text-indigo-600" : ""
                      }`}
                    >
                      {item.label}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark" size={18} color="#4F46E5" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Animated.View>
        </Modal>
      )}
    </View>
  );
};

export default Select;
