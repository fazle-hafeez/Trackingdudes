import React, { useContext, useEffect } from "react";
import { View, ActivityIndicator, StatusBar, useColorScheme, Platform } from "react-native";
import { Stack, usePathname } from "expo-router";
import "../global.css";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, AuthContext } from "../src/context/AuthContexts";
import { OfflineProvider } from "../src/offline/OfflineProvider";
import ModalComponent from "../src/components/ModalComponent";
import LoadingComponent from "../src/components/LoadingComponent";
import { ThemeProvider, useTheme } from "../src/context/ThemeProvider";
import * as NavigationBar from 'expo-navigation-bar';

// -----------------------------
// Remember last visited path
// -----------------------------
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
      console.log("Saved PROTECTED path:", pathname);
    } else if (!tokens && isAuthPath) {
      saveLastPath(pathname);
      console.log("Saved AUTH path:", pathname);
    }
  }, [pathname, loading, tokens, isRedirecting, lastVisitedPath]);

  return null;
};

// -----------------------------
// Dashboard vs Auth stack
// -----------------------------
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

// -----------------------------
// Global Modal
// -----------------------------
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

// -----------------------------
// Global Loader
// -----------------------------
const GlobalLoader = () => {
  const { globalLoading } = useContext(AuthContext);
  return <LoadingComponent visible={globalLoading} />;
};

// -----------------------------
// Global StatusBar & NavigationBar
// -----------------------------
const GlobalSystemBars = () => {
  const { darkMode: themeDarkMode } = useTheme(); // app theme
  const colorScheme = useColorScheme(); // system theme
  const darkMode = themeDarkMode ?? colorScheme === "dark";

  useEffect(() => {
    const statusBarBg = darkMode ? "#111" : "#00f"; // StatusBar bg
    const navBarBg = darkMode ? "#111" : "#00f"; // NavigationBar bg
    const statusBarStyle = "light-content";
    const navButtonStyle = darkMode ? "light" : "dark";

    // StatusBar
    StatusBar.setBarStyle(statusBarStyle);
    if (Platform.OS === "android") StatusBar.setBackgroundColor(statusBarBg);

    // NavigationBar (Android)
    if (Platform.OS === "android") {
      (async () => {
        try {
          await NavigationBar.setBackgroundColorAsync(navBarBg);
          await NavigationBar.setButtonStyleAsync(navButtonStyle);
        } catch (e) {
          console.log("NavigationBar warning (Expo Go may not support):", e);
        }
      })();
    }
  }, [darkMode]);

  return null;
};

// -----------------------------
// Root Layout
// -----------------------------
export default function RootLayout() {
  return (
    <OfflineProvider>
      <AuthProvider>
        <ThemeProvider>
          <SafeAreaProvider style={{ flex: 1 }}>
            <GlobalSystemBars /> {/* Status + Navigation bars */}
            <RootLayoutContent />
            <NavigationPathSaver />
            <GlobalModal />
            <GlobalLoader />
          </SafeAreaProvider>
        </ThemeProvider>
      </AuthProvider>
    </OfflineProvider>
  );
}
