import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import React from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";

const PageHeader = ({ routes }) => {
    const router = useRouter();

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
            <StatusBar barStyle="light-content" backgroundColor="#0000ff" />

            <View className="bg-customBlue flex-row justify-between items-center p-3">
                <View className="flex-row items-center">
                    <MaterialIcons
                        name="keyboard-arrow-left"
                        size={30}
                        color="white"
                        onPress={handleBack}
                    />
                    <Text className="text-white text-lg ml-1">{routes}</Text>
                </View>

                <TouchableOpacity className="bg-white w-6 h-6 flex-row justify-center items-center rounded-full mr-3">
                    <Ionicons name="help" size={15} color="black" />
                </TouchableOpacity>
            </View>
        </>
    );
};

export default PageHeader;
