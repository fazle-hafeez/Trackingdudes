import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

  const isSelected = (item) => value === item.value;

  const toggleItem = (item) => {
    if (disabled) return;
    onChange(item.value);
    setOpen(false);
  };

  const selectedLabel = () => {
    const sel = items.find((i) => i.value === value);
    return sel ? sel.label : placeholder;
  };

  return (
    <View className="mb-2">
      {/* Select Control */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => !disabled && setOpen(true)}
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

        {/* Arrow changes up/down */}
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

      {/* Modal */}
      <Modal visible={open} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-4 max-h-[70%]">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-lg font-semibold">{modalTitle}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
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
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Select;
