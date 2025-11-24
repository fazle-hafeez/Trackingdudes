import React, { useContext, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, usePathname } from "expo-router";
import "../global.css";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, AuthContext } from "../src/context/AuthContexts";
import { OfflineProvider } from "../src/offline/OfflineProvider"; 
import ModalComponent from "../src/components/ModalComponent";
import LoadingComponent from "../src/components/LoadingComponent";
// import { SyncStatus } from "../src/components/SyncStatus"; // optional, shows pending offline actions

//  Handles remembering last visited path automatically
const NavigationPathSaver = () => {
  const { saveLastPath, loading, tokens, isRedirecting, lastVisitedPath } = useContext(AuthContext);
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (loading || isRedirecting) return;

    if (lastVisitedPath === pathname) return;
    if (pathname === "/" || pathname === "/dashboard" || pathname === "/auth") return;

    const isAuthPath = pathname.startsWith("/auth");

    if (tokens && !isAuthPath) {
      saveLastPath(pathname);
      console.log(" Saved PROTECTED path:", pathname);
    } else if (!tokens && isAuthPath) {
      saveLastPath(pathname);
      console.log(" Saved AUTH path:", pathname);
    }
  }, [pathname, loading, tokens, isRedirecting, lastVisitedPath]);

  return null;
};

//  Manages switching between dashboard and auth
function RootLayoutContent() {
  const { tokens, user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size={80} color="#0000ff" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {tokens && user ? <Stack.Screen name="dashboard" /> : <Stack.Screen name="auth" />}
    </Stack>
  );
}

// Global modal connected to AuthContext
const GlobalModal = () => {
  const { modalVisible, modalMessage, modalType, autoHide, modalButtons, hideModal, modalTitle } =
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

//  Global loader
const GlobalLoader = () => {
  const { globalLoading } = useContext(AuthContext);
  return <LoadingComponent visible={globalLoading} />;
};

//  Root app entry — wraps everything with OfflineProvider + AuthProvider
export default function RootLayout() {
  return (
    <OfflineProvider>
      <AuthProvider>
        <SafeAreaProvider style={{ flex: 1 }}>
          <RootLayoutContent />
          <NavigationPathSaver />
          <GlobalModal />
          <GlobalLoader />
          {/* <SyncStatus /> optional UI for pending offline actions */}
        </SafeAreaProvider>
      </AuthProvider>
    </OfflineProvider>
  );
}
