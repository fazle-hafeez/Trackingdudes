
import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, } from "react-native";
import { Entypo, FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/context/ThemeProvider";


export default function Dashboard() {
  const navigation = useNavigation();
  const router = useRouter();
  const { darkMode, setTheme } = useTheme();
  const menuBorder = darkMode ? 'border-b border-gray-700' : ''
  return (
    <SafeAreaView
      className={`flex-1 relative`}
      style={{ backgroundColor: darkMode ? '#121212' : '#eff6ff' }}
    >

      {/* Fixed Header */}
      <View
        className={`${menuBorder} flex-row items-center px-5 py-3 justify-between `}
        style={[styles.menu, { backgroundColor: darkMode ? "#111" : "#00f" }]}
      >
        {/* Left: Menu */}
        <View className="flex-row items-center">
          <Entypo
            name="menu"
            size={30}
            color={darkMode ? '#9ca3af':'#fff'}
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          />
          <Text
            className={`text-xl ml-3 ${darkMode ? 'text-gray-400' :'text-white'}`}
          >
            Menu
          </Text>
        </View>

        {/* Right: Theme Toggle */}
        <View className="flex-row items-center p-0.5 rounded-full bg-blue-700">
          <TouchableOpacity
            onPress={() => setTheme(false)}
            className={`p-2 rounded-full ${!darkMode ? "bg-white" : "bg-transparent"}`}
          >
            <FontAwesome5
              name="sun"
              size={20}
              color={!darkMode ? "black" : "white"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTheme(true)}
            className={`p-2 rounded-full ${darkMode ? "bg-black" : "bg-transparent"}`}
          >
            <FontAwesome5
              name="moon"
              size={20}
              color={darkMode ? "white" : "black"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 60 }}
      >
        <Section title="Active features" darkMode={darkMode}>
          <Feature
            icon={
              <MaterialIcons
                name="access-time"
                size={40}
                color={darkMode ? "lightblue" : "blue"}
              />
            }
            label="Shifts data"
            onPress={() => router.push("/dashboard/shiftsData")}
            darkMode={darkMode}
          />
          <Feature
            icon={
              <FontAwesome5
                name="route"
                size={38}
                color={darkMode ? "lightblue" : "blue"}
              />
            }
            label="Trips data"
            onPress={() => router.push("/dashboard/tripsData")}
            darkMode={darkMode}
          />
          <Feature
            icon={
              <FontAwesome5
                name="gas-pump"
                size={38}
                color={darkMode ? "lightblue" : "blue"}
              />
            }
            label="Fuel refills"
            onPress={() => router.push("/dashboard/fuelRefills")}
            darkMode={darkMode}
          />
        </Section>

        <Section title="User preferences" darkMode={darkMode}>
          <Feature
            icon={
              <FontAwesome5
                name="car"
                size={40}
                color={darkMode ? "lightblue" : "blue"}
              />
            }
            label="My vehicles"
            onPress={() => router.push("/otherPages/vehicles/myVehicles")}
            darkMode={darkMode}
          />
          <Feature
            icon={
              <FontAwesome5
                name="file-alt"
                size={38}
                color={darkMode ? "lightblue" : "blue"}
              />
            }
            label="My projects"
            onPress={() => router.push("/otherPages/projects/myProjects")}
            darkMode={darkMode}
          />
        </Section>

        <Section title="Future features" darkMode={darkMode}>
          <Feature
            icon={
              <FontAwesome5
                name="receipt"
                size={38}
                color={darkMode ? "lightblue" : "blue"}
              />
            }
            label="Expenses"
            onPress={() => router.push("/otherPages/expenses/expensesReport")}
            darkMode={darkMode}
          />
          <Feature
            icon={
              <FontAwesome5
                name="user-clock"
                size={38}
                color={darkMode ? "lightblue" : "blue"}
              />
            }
            label="Time spent"
            onPress={() => router.push("/otherPages/timeSpent")}
            darkMode={darkMode}
          />
          <Feature
            icon={
              <FontAwesome5
                name="cubes"
                size={38}
                color={darkMode ? "lightblue" : "blue"}
              />
            }
            label="Inventory"
            onPress={() => router.push("/otherPages/inventory")}
            darkMode={darkMode}
          />
          <Feature
            icon={
              <FontAwesome6
                name="circle-dollar-to-slot"
                size={38}
                color={darkMode ? "lightblue" : "blue"}
              />
            }
            label="Savings"
            onPress={() => router.push("/otherPages/savings")}
            darkMode={darkMode}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const Section = ({ title, children, darkMode }) => (
  <View
    className={`m-3 rounded-xl p-4 shadow-md  ${darkMode ? 'border border-gray-700' : ''}`}
    style={{ backgroundColor: darkMode ? "#121212" : "white", elevation:4}}
  >
    <Text
      className={`text-2xl font-medium border-b pb-2 mb-3 
        ${darkMode ? "text-gray-400 border-gray-700" : "text-headercolor border-orange-400"
        }`}
    >
      {title}
    </Text>
    <View className="flex-row flex-wrap justify-between">{children}</View>
  </View>
);

const Feature = ({ icon, label, onPress, darkMode }) => (
  <TouchableOpacity
    className={`w-[48%] rounded-lg p-4 items-center mb-3 border mt-2 
      ${darkMode ? "border-gray-700 " : "border-gray-300 bg-white"
      }`}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {icon}
    <Text
      className={`mt-3 text-center text-xl ${darkMode ? "text-gray-400" : "text-headercolor"
        }`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  menu: {
    position: "absolute",
    top: 30,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 5,
  },
});
