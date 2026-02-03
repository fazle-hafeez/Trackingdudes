import React, { useState, useCallback } from "react";
import { View, ScrollView, Text, TouchableOpacity } from "react-native";
import { Entypo, FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useNavigation, DrawerActions, useFocusEffect } from "@react-navigation/native";
import { useRouter, Link } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../src/context/ThemeProvider";
import { SafeAreacontext, ThemedText } from "../../src/components/ThemedColor";

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

const ALL_FEATURES = Object.values(FEATURES_MAP);

export default function DashboardPage() {
  const navigation = useNavigation();
  const router = useRouter();
  const { darkMode, setTheme } = useTheme();

  //  ONLY IDS
  const [activeIds, setActiveIds] = useState([]);

  const menuBorder = darkMode ? "border-b border-gray-700" : "";

  // Load active feature IDS
  const loadActive = async () => {
    try {
      const saved = await AsyncStorage.getItem("dashboard_features");
      const ids = saved ? JSON.parse(saved) : [];
      setActiveIds(Array.isArray(ids) ? ids : []);
    } catch (err) {
      console.log("Dashboard feature load error:", err);
      setActiveIds([]);
    }
  };

  // Proper focus lifecycle
  useFocusEffect(
    useCallback(() => {
      loadActive();
    }, [])
  );

  //  FILTER USING ID + MAP
  const displayedFeatures =
    activeIds.length > 0
      ? activeIds.map(id => FEATURES_MAP[id]).filter(Boolean)
      : ALL_FEATURES;

  const RenderIcon = ({ item }) => {
    const color = darkMode ? "lightblue" : "blue";
    if (item.type === "MaterialIcons")
      return <MaterialIcons name={item.icon} size={item.size} color={color} />;
    if (item.type === "FontAwesome5")
      return <FontAwesome5 name={item.icon} size={item.size} color={color} />;
    if (item.type === "FontAwesome6")
      return <FontAwesome6 name={item.icon} size={item.size} color={color} />;
    return null;
  };

  return (
    <SafeAreacontext bgColor={"#eff6ff"} className="flex-1 relative">
      {/* Header */}
      <View
        className={`${menuBorder} flex-row items-center px-5 py-3 justify-between`}
        style={{
          position: "absolute",
          top: 30,
          left: 0,
          right: 0,
          zIndex: 20,
          backgroundColor: darkMode ? "#121212" : "#00f",
        }}
      >
        <View className="flex-row items-center">
          <Entypo
            name="menu"
            size={30}
            color={darkMode ? "#9ca3af" : "#fff"}
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          />
          <Text
            preventWrap={true}
            className={`text-xl ml-3 ${darkMode ? "text-gray-400" : "text-white"}`}>
            Menu
          </Text>
        </View>

        {/* Theme Toggle */}
        <View className="flex-row items-center p-0.5 rounded-full bg-blue-700">
          <TouchableOpacity
            onPress={() => setTheme(false)}
            className={`p-2 rounded-full ${!darkMode ? "bg-white" : ""}`}
          >
            <FontAwesome5 name="sun" size={20} color={!darkMode ? "black" : "white"} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTheme(true)}
            className={`p-2 rounded-full ${darkMode ? "bg-black" : ""}`}
          >
            <FontAwesome5 name="moon" size={20} color={darkMode ? "white" : "black"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={{ paddingTop: 80, paddingHorizontal: 12 }}>
        <View className={`rounded-xl px-4 pb-5 shadow-lg ${darkMode ? "border border-gray-700" : "bg-white"}`}>
          <View className="flex-row flex-wrap justify-between pt-6">
            {displayedFeatures.map(item => (
              <TouchableOpacity
                key={item.id}
                className={`w-[48%] rounded-lg p-4 items-center mb-3 border ${darkMode ? "border-gray-700" : "border-gray-300 bg-white"
                  }`}
                onPress={() => item.route && router.push(item.route)}
              >
                <RenderIcon item={item} />
                <Text className={`mt-3 text-center text-lg ${darkMode ? "text-gray-400" : "text-black"}`}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ThemedText className="px-2 text-lg mt-4 ">
          You are using customized dashboard, manage items{" "}
          <Link preventWrap={true} href="/otherPages/customizeDashboard" className="underline" style={{ color: "#007AFF" }}>
            here
          </Link>
        </ThemedText>
      </ScrollView>
    </SafeAreacontext>
  );
}
