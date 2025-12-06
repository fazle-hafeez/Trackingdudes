import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import React from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useTheme } from "../context/ThemeProvider";

const PageHeader = ({ routes }) => {
    const { darkMode } = useTheme()
    const router = useRouter();
    const darkLightBg = darkMode ? '#121212' : '#00f'
    const menuBorder = darkMode ? 'border-b border-gray-700' : ''
    const handleBack = () => {
        try {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace("/dashboard");
            }

        } catch (err) {
            console.warn("Error navigating back:", err);
            router.replace("/dashboard");
        }
    };


    return (
        <>
            <View className={`${menuBorder} flex-row justify-between items-center p-3`}
                style={{ backgroundColor: darkLightBg }}>
                <View className="flex-row items-center">
                    <MaterialIcons
                        name="keyboard-arrow-left"
                        size={30}
                        color={darkMode ? '#9ca3af' : '#fff'}
                        onPress={handleBack}
                    />
                    <Text className={`${darkMode ? 'text-gray-400' : 'text-white'} text-lg ml-1`}>{routes}</Text>
                </View>

                <TouchableOpacity className={`${darkMode ? 'bg-gray-400' : 'bg-white'} w-6 h-6 flex-row justify-center items-center rounded-full mr-3`}>
                    <Ionicons name="help" size={15} color="black" />
                </TouchableOpacity>
            </View>
        </>
    );
};

export default PageHeader;
