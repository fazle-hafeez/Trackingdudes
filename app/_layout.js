import React, { useContext } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import "../global.css";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, AuthContext } from "../src/context/AuthContexts";
import ModalComponent from "../src/components/ModalComponent";
import LoadingComponent from "../src/components/LoadingComponent";

function RootLayoutContent() {
  const { tokens, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size={80} color="#0000ff" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {tokens ? <Stack.Screen name="dashboard" /> : <Stack.Screen name="auth" />}
    </Stack>
  );
}

const GlobalModal = () => {
  const { modalVisible, modalMessage, modalType, autoHide, modalButtons, hideModal,modalTitle } =
    useContext(AuthContext);

  return (
    <ModalComponent
      visible={modalVisible}
      onClose={hideModal}
      message={modalMessage}
      errorType={modalType}
      buttons={modalButtons}
      autoHideProp={autoHide}
      title={modalTitle}
    />
  );
};

const GlobalLoader = () => {
  const { globalLoading } = useContext(AuthContext);
  return <LoadingComponent visible={globalLoading} />;
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider style={{ flex: 1 }}>
        <RootLayoutContent />
        <GlobalModal />
        <GlobalLoader />
      </SafeAreaProvider>
    </AuthProvider>
  );
}
