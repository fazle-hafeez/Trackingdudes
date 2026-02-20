import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const Pagination = ({ page, totalPages, onPageChange }) => {
  if (!totalPages || totalPages <= 1) return null;

  const renderPageButtons = () => {
    const buttons = [];

    for (let i = 1; i <= totalPages; i++) {
      // show limited pages + ellipsis for big lists
      if (
        totalPages > 5 &&
        i !== 1 &&
        i !== totalPages &&
        Math.abs(page - i) > 1
      ) {
        if (i === 2 || i === totalPages - 1) {
          buttons.push(
            <Text key={`dots-${i}`} className="text-gray-500 mx-1">
              ...
            </Text>
          );
        }
        continue;
      }

      const isActive = i == page;
      buttons.push(
        <TouchableOpacity
          key={i}
          onPress={() => onPageChange(i)}
          className={`mx-1 px-3 py-2 rounded-lg ${
            isActive ? "bg-blue-600" : "bg-gray-200"
          }`}
        >
          <Text
            className={`text-base font-semibold ${
              isActive ? "text-white" : "text-gray-800"
            }`}
          >
            {i}
          </Text>
        </TouchableOpacity>
      );
    }

    return buttons;
  };

  return (
    <View className="flex-row justify-center items-center  py-3 "
    >
      {/* Prev button */}
      <TouchableOpacity
        disabled={page <= 1}
        onPress={() => onPageChange(page - 1)}
        className={`mx-1 px-2 py-2 rounded-lg ${
          page <= 1 ? "bg-gray-300" : "bg-blue-500"
        }`}
      >
        <Ionicons name="chevron-back" size={20} color="white" />
      </TouchableOpacity>

      {/* Page number buttons */}
      {renderPageButtons()}

      {/* Next button */}
      <TouchableOpacity
        disabled={page >= totalPages}
        onPress={() => onPageChange(page + 1)}
        className={`mx-1 px-2 py-2 rounded-lg ${
          page >= totalPages ? "bg-gray-300" : "bg-blue-500"
        }`}
      >
        <Ionicons name="chevron-forward" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );
};

export default Pagination;
