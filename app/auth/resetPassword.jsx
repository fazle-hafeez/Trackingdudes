import React, { useState } from "react";
import { View, Text, TextInput, StatusBar,Platform } from "react-native";
import { useRouter } from "expo-router";
import HeaderSection from "../../src/components/HeaderSection";
import Button from "../../src/components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
export default function ResetPassword() {
    const router = useRouter()
    const [resetEmail, setResetEmail] = useState("");
    const [resetEmailError, setResetEmailError] = useState(false);
    const [emailFieldMess, setEmailFieldMess] = useState("");
    const handleLogin = () => {
        let hasError = false;

        if (resetEmail.trim() === "") {
            setEmailFieldMess("Field is required");
            setResetEmailError(true);
            hasError = true
        }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim())) {
            setEmailFieldMess("invalid email address");
            setResetEmailError(true);
            hasError = true
        }
        if (hasError) return;
        router.push({ pathname: "/auth/emailVerification", params: { changePassword: true, resetEmail } })
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <HeaderSection />
            <View className="flex-1 p-4">
                <View className={`bg-[rgba(255,255,255,0.9)] rounded-xl p-6 ${Platform.OS === "ios" ? " shadow-sm" : ''
                    }`}
                    style={{ marginTop: -180, elevation: 5 }}>
                    <View >
                        <Text className="text-headercolor text-2xl font-medium">Rest password</Text>
                    </View>
                    <Text className="text-xl mb-2 text-headercolor mt-2" >Email address</Text>
                    <TextInput
                        className={`rounded-md text-lg text-headercolor border ${resetEmailError ? "border-red-500" : "border-gray-400"
                            }`}
                        placeholder="Enter your email address"
                        value={resetEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        onChangeText={(val) => {
                            setResetEmail(val);
                            setEmailFieldMess("");
                            setResetEmailError(false);
                        }}
                    />
                    {
                        resetEmailError ? (
                            <Text className="text-sm text-red-500 mt-1">{emailFieldMess}</Text>
                        ) : null
                    }
                    <View className="mt-2">
                        <Button title="Submit" onClickEvent={handleLogin} />
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

