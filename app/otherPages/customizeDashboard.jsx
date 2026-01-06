import React, { useEffect, useState } from "react";
import { View, ScrollView, Text, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons, FontAwesome5,FontAwesome6 } from "@expo/vector-icons";
import { SafeAreacontext, ThemedText, ThemedView } from "../../src/components/ThemedColor";
import PageHeader from "../../src/components/PageHeader";
import { useTheme } from "../../src/context/ThemeProvider";

const defaultFeatures = [
  { id: "shifts", label: "Shifts Data", type: "MaterialIcons", icon: "access-time", size: 40 ,route:"/dashboard/shiftsData"},
  { id:"trips",label: "Trips Data", type: "FontAwesome5", icon: "route", size: 38,route:"/dashboard/tripsData" },
  { id: "fuel", label: "Fuel Refills", type: "FontAwesome5", icon: "gas-pump", size: 38,route:"/dashboard/fuelRefills"   },
  { id: "vehicles", label: "My Vehicles", type: "FontAwesome5", icon: "car", size: 40,route:"/otherPages/vehicles/myVehicles" },
  { id: "projects", label: "My Projects", type: "FontAwesome5", icon: "file-alt", size: 38 ,route:"/otherPages/projects/myProjects"},
  { id: "expenses", label: "Expenses", type: "FontAwesome5", icon: "receipt", size: 38 ,route:"/otherPages/expenses/expensesReport"   },
  { id: "time", label: "Time Spent", type: "FontAwesome5", icon: "user-clock", size: 38 },
  { id: "inventory", label: "Inventory", type: "FontAwesome5", icon: "cubes", size: 38 },
  { id:"savings",label: "Savings", type: "FontAwesome6", icon: "circle-dollar-to-slot", size: 38 }
];

export default function CustomizeDashboard() {
  const {darkMode} = useTheme()
  const [activeFeatures, setActiveFeatures] = useState([]);
  const darkModeBordered = darkMode ? 'border-gray-700' : 'border-gray-300'

  // Load active features from AsyncStorage
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const saved = await AsyncStorage.getItem("dashboard_features");
      const active = saved ? JSON.parse(saved) : [];
      setActiveFeatures(Array.isArray(active) ? active : []);
    } catch (error) {
      console.log("Failed to load features:", error);
      setActiveFeatures([]);
    }
  };

  // Save only active features
  const saveData = async (active) => {
    try {
      await AsyncStorage.setItem("dashboard_features", JSON.stringify(active));
    } catch (error) {
      console.log("Failed to save features:", error);
    }
  };

  const addFeature = (feature) => {
    const newActive = [...activeFeatures, feature];
    setActiveFeatures(newActive);
    saveData(newActive);
  };

  const removeFeature = (feature) => {
    const newActive = activeFeatures.filter(f => f.id !== feature.id);
    setActiveFeatures(newActive);
    saveData(newActive);
  };

  // Derive allFeatures dynamically
  const allFeatures = defaultFeatures.filter(
    f => !activeFeatures.some(a => a.id === f.id)
  );

  const RenderIcon = ({ feature }) => {
    const color = darkMode ? "lightblue" : "blue";
    if (feature.type === "MaterialIcons") return <MaterialIcons name={feature.icon} size={feature.size} color={color} />;
    if (feature.type === "FontAwesome5") return <FontAwesome5 name={feature.icon} size={feature.size} color={color} />
    if (feature.type === "FontAwesome6") return <FontAwesome6 name={feature.icon} size={feature.size} color={color} />;
    ;
    return null;
  };

  return (
    <SafeAreacontext className="flex-1">
      <PageHeader routes={"Customize Dashboard"} />
      <ScrollView className="p-4 flex-1">
        {/* Active Features */}
        <ThemedView className="p-4 rounded-lg">
          <ThemedText className="text-xl font-bold mb-3">Active Features</ThemedText>
          <View className="flex-row flex-wrap justify-between">
            {activeFeatures.length === 0 ? (
              <ThemedText className="text-gray-500 ">No active features</ThemedText>
            ) : (
              activeFeatures.map(f => (
                <TouchableOpacity
                  key={f.id}
                  className={`w-[48%] p-4 mb-3 border ${darkModeBordered} rounded-xl items-center justify-center relative `}
                  onPress={() => removeFeature(f)}
                >
                  <View className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                    <Text className="text-white font-bold">−</Text>
                  </View>
                  <RenderIcon feature={f} />
                  <ThemedText className="mt-2 text-center">{f.label}</ThemedText>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ThemedView>

        {/* All Features */}
        <ThemedView className="p-4 my-5 rounded-lg">
          <ThemedText className="text-xl font-bold mb-3">All Features</ThemedText>
          <View className="flex-row flex-wrap justify-between">
            {allFeatures.length === 0 ? (
              <ThemedText className="text-gray-500 ">No features </ThemedText>
            ) :(
            allFeatures.map(f => (
              <TouchableOpacity
                key={f.id}
                className={`w-[48%] p-4 mb-3 border ${darkModeBordered} rounded-xl items-center justify-center relative`}
                onPress={() => addFeature(f)}
              >
                <View className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <Text className="text-white font-bold">+</Text>
                </View>
                <RenderIcon feature={f} />
                <ThemedText className="mt-2 text-center">{f.label}</ThemedText>
              </TouchableOpacity>
            )))}
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreacontext>
  );
}
