import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { ThemedView } from "./ThemedColor";
import { useTheme } from "../context/ThemeProvider";

const Tabs = ({ tabs = [], activeTab, setActiveTab }) => {
  // Dynamic padding based on number of tabs
  const containerPadding = tabs.length === 2 ? "px-12" : tabs.length === 3 ? "px-8" : "";
  const { darkMode } = useTheme();

  return (
    <ThemedView className={`p-4 shadow-md rounded-lg`}>
      <View className={`flex-row justify-between ${containerPadding}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab;

          // Text color dynamically set
          const textColor = isActive
            ? darkMode
              ? "#fff"
              : "#0d6efd"
            : darkMode
            ? "#9ca3af"
            : "#646060ff";

          // Border bottom dynamically set
          const borderStyle = isActive
            ? { borderBottomWidth: 2, borderBottomColor:textColor  }
            : {};

          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[{ paddingBottom: 4, alignItems: "center" }, borderStyle]}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "500",
                  color: textColor,
                }}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ThemedView>
  );
};

export default Tabs;
