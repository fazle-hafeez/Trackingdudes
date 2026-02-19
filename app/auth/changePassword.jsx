import React, { useState } from "react";
import { View, Text, TextInput, StatusBar, Platform } from "react-native";
import HeaderSection from "../../src/components/HeaderSection";
import Button from "../../src/components/Button";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
const ChangePasswordPage = () => {
    const router = useRouter();
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [oldPassErro, setOldPassErro] = useState("");
    const [newPassErro, setNewPassErro] = useState("");
    const handleLogin = () => {
        let hasError = false
        if (oldPassword.trim() === "") {
            setOldPassErro("field is required")
            hasError = true;
        }
        if (newPassword.trim() === "") {
            setNewPassErro("field is required");
            hasError = true;
        }

        if (hasError) return;
        router.push("/dashboard/dashboardPage")
    };

    return (
        <SafeAreaView className="flex-1 ">
            <HeaderSection />
            <View className=" flex-1 p-4 ">
                <View className={`bg-[rgba(255,255,255,0.9)] rounded-xl p-6 ${Platform.OS === "ios" ? " shadow-sm" : ''
                    }`}
                    style={{ marginTop: -200, elevation: 5 }}>
                    <View >
                        <Text className="text-headercolor text-2xl font-medium">Verify your password</Text>
                    </View>
                    <Text className="text-xl mb-2 text-headercolor mt-2">Old password</Text>
                    <TextInput
                        className={`border rounded-md text-lg text-headercolor ${oldPassErro ?
                            "border-red-500" : "border-gray-400"
                            }`}
                        placeholder="Enter your old password"
                        secureTextEntry
                        value={oldPassword}
                        onChangeText={(val) => {
                            setOldPassword(val)
                            setOldPassErro("")
                        }}
                    />
                    {
                        oldPassErro ? (
                            <Text className="text-sm text-red-500 my-1">{oldPassErro}</Text>
                        ) : ""
                    }

                    <Text className="text-xl mb-2 text-headercolor mt-2">New password</Text>
                    <TextInput
                        className={`border rounded-md text-lg text-headercolor ${newPassErro ?
                            "border-red-500" : "border-gray-400"
                            }`}
                        placeholder="Enter your new password"
                        secureTextEntry
                        value={newPassword}
                        onChangeText={(val) => {
                            setNewPassword(val)
                            setNewPassErro("")
                        }}
                    />
                    {
                        newPassErro ? (
                            <Text className="text-sm text-red-500 my-1">{newPassErro}</Text>
                        ) : ""
                    }

                    <View className="mt-2">
                        <Button title="Submit" onClickEvent={handleLogin} />
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

export default ChangePasswordPage;
