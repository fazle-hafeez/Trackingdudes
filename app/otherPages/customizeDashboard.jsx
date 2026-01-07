import React, { useEffect, useState } from "react";
import { View, ScrollView, Text, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons, FontAwesome5, FontAwesome6 } from "@expo/vector-icons";
import { SafeAreacontext, ThemedText, ThemedView } from "../../src/components/ThemedColor";
import PageHeader from "../../src/components/PageHeader";
import { useTheme } from "../../src/context/ThemeProvider";

const FEATURES_MAP = {
  shifts: {
    id: "shifts",
    label: "Shifts Data",
    type: "MaterialIcons",
    icon: "access-time",
    size: 40,
    route: "/dashboard/shiftsData",
  },
  trips: {
    id: "trips",
    label: "Trips Data",
    type: "FontAwesome5",
    icon: "route",
    size: 38,
    route: "/dashboard/tripsData",
  },
  fuel: {
    id: "fuel",
    label: "Fuel Refills",
    type: "FontAwesome5",
    icon: "gas-pump",
    size: 38,
    route: "/dashboard/fuelRefills",
  },
  vehicles: {
    id: "vehicles",
    label: "My Vehicles",
    type: "FontAwesome5",
    icon: "car",
    size: 40,
    route: "/otherPages/vehicles/myVehicles",
  },
  projects: {
    id: "projects",
    label: "My Projects",
    type: "FontAwesome5",
    icon: "file-alt",
    size: 38,
    route: "/otherPages/projects/myProjects",
  },
  expenses: {
    id: "expenses",
    label: "Expenses",
    type: "FontAwesome5",
    icon: "receipt",
    size: 38,
    route: "/otherPages/expenses/expensesReport",
  },
  time: {
    id: "time",
    label: "Time Spent",
    type: "FontAwesome5",
    icon: "user-clock",
    size: 38,
  },
  inventory: {
    id: "inventory",
    label: "Inventory",
    type: "FontAwesome5",
    icon: "cubes",
    size: 38,
  },
  savings: {
    id: "savings",
    label: "Savings",
    type: "FontAwesome6",
    icon: "circle-dollar-to-slot",
    size: 38,
  },
};

const ALL_IDS = Object.keys(FEATURES_MAP);

export default function CustomizeDashboard() {
  const { darkMode } = useTheme();
  const [activeIds, setActiveIds] = useState([]);
  const darkModeBordered = darkMode ? "border-gray-700" : "border-gray-300";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const saved = await AsyncStorage.getItem("dashboard_features");
    setActiveIds(saved ? JSON.parse(saved) : []);
  };

  const saveIds = async (ids) => {
    await AsyncStorage.setItem("dashboard_features", JSON.stringify(ids));
  };

  const addIds = (id) => {
    const updated = [...activeIds, id];
    setActiveIds(updated);
    saveIds(updated);
  };

  const removeId = (id) => {
    const updated = activeIds.filter(x => x !== id);
    setActiveIds(updated);
    saveIds(updated);
  };

  const activeFeatures = activeIds.map(id => FEATURES_MAP[id]);
  const allFeatures = ALL_IDS.filter(id => !activeIds.includes(id)).map(id => FEATURES_MAP[id]);

  const RenderIcon = ({ feature }) => {
    const color = darkMode ? "lightblue" : "blue";
    if (feature.type === "MaterialIcons") return <MaterialIcons name={feature.icon} size={feature.size} color={color} />;
    if (feature.type === "FontAwesome5") return <FontAwesome5 name={feature.icon} size={feature.size} color={color} />;
    if (feature.type === "FontAwesome6") return <FontAwesome6 name={feature.icon} size={feature.size} color={color} />;
    return null;
  };

  return (
    <SafeAreacontext className="flex-1">
      <PageHeader routes={"Customize Dashboard"} />
      <ScrollView className="p-4 flex-1">

        {/* ACTIVE */}
        <ThemedView className="p-4 rounded-lg">
          <ThemedText className="text-xl font-bold mb-3">You Selected</ThemedText>
          <View className="flex-row flex-wrap justify-between">
            {activeFeatures.map(f => (
              <TouchableOpacity
                key={f.id}
                className={`w-[48%] p-4 mb-3 border ${darkModeBordered} rounded-xl items-center justify-center relative`}
                onPress={() => removeId(f.id)}
              >
                <View className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                  <Text className="text-white font-bold">−</Text>
                </View>
                <RenderIcon feature={f} />
                <ThemedText className="mt-2 text-center">{f.label}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>

        {/* OTHER */}
        <ThemedView className="p-4 my-5 rounded-lg">
          <ThemedText className="text-xl font-bold mb-3">Other Options</ThemedText>
          <View className="flex-row flex-wrap justify-between">
            {allFeatures.map(f => (
              <TouchableOpacity
                key={f.id}
                className={`w-[48%] p-4 mb-3 border ${darkModeBordered} rounded-xl items-center justify-center relative`}
                onPress={() => addIds(f.id)}
              >
                <View className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <Text className="text-white font-bold">+</Text>
                </View>
                <RenderIcon feature={f} />
                <ThemedText className="mt-2 text-center">{f.label}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>

      </ScrollView>
    </SafeAreacontext>
  );
}
