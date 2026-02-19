import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useTheme } from "../context/ThemeProvider";

const PageHeader = ({
    routes,
    showMenu = false,
    onMenuPress = () => {},
    onHelpPress = () => {},
}) => {
    const { darkMode } = useTheme();
    const router = useRouter();

    const bgColor = darkMode ? "#121212" : "#00f";
    const border = darkMode ? "border-b border-gray-700" : "";

    const iconBg = darkMode ? "bg-gray-500" : "bg-white";

    const handleBack = () => {
        router.canGoBack()
            ? router.back()
            : router.replace("/dashboard");
    };

    return (
        <View
            className={`${border} flex-row justify-between items-center p-3`}
            style={{ backgroundColor: bgColor }}
        >
            {/* Left */}
            <View className="flex-row items-center">
                <MaterialIcons
                    name="keyboard-arrow-left"
                    size={30}
                    color={darkMode ? "#9ca3af" : "#fff"}
                    onPress={handleBack}
                />
                <Text
                    className={`${
                        darkMode ? "text-gray-400" : "text-white"
                    } text-lg ml-1`}
                >
                    {routes}
                </Text>
            </View>

            {/* Right Icon */}
            <TouchableOpacity
                onPress={showMenu ? onMenuPress : onHelpPress}
                className={`${iconBg} w-7 h-7 rounded-full items-center justify-center mr-3`}
            >
                <Ionicons
                    name={showMenu ? "ellipsis-vertical" : "help"}
                    size={showMenu ? 15 : 18}  
                    color={darkMode ? "#000" : "#000"}
                />
            </TouchableOpacity>
        </View>
    );
};

export default PageHeader;
