import { View, Text, TouchableOpacity } from "react-native";
import React from "react";

const Tabs = ({ tabs = [], activeTab, setActiveTab }) => {
  // Dynamic padding based on number of tabs
  const containerPadding = tabs.length === 2 ? "px-12" : "";

  return (
    <View className={`bg-white p-4 shadow-md rounded-lg`}>
      <View className={`flex-row justify-between ${containerPadding}`}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`pb-1 ${
              activeTab === tab ? "border-b-2 border-blue-600" : ""
            }`}
          >
            <Text
              className={`text-lg font-medium ${
                activeTab === tab ? "text-blue-600" : ""
              }`}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default Tabs;
