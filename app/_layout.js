import React, { useContext } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { AuthProvider, AuthContext } from "../src/context/AuthContexts";
import "../global.css";
import { SafeAreaProvider } from "react-native-safe-area-context";
function RootLayoutContent() {
  const { tokens, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size={80} color="#0000ff" />
      </View>
    );
  }

  //  Show different stacks depending on auth state
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {tokens ? (
        // When logged in → go to dashboard layout
        <Stack.Screen name="dashboard" />
      ) : (
        // When not logged in → go to the public/index.js file
        <Stack.Screen name="auth" />
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider style={{flex:1}}>
      <RootLayoutContent />
      </SafeAreaProvider>
    </AuthProvider>
  );
}
