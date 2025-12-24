import React, { useEffect } from "react";
import { Modal, View, ActivityIndicator, StatusBar, Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import { useTheme } from "../context/ThemeProvider";

const LoadingComponent = ({ visible }) => {
  const { darkMode } = useTheme();

  useEffect(() => {
    if (!visible) return;

    // ---- ORIGINAL COLORS BASED ON THEME ----
    const ORIGINAL_STATUSBAR_STYLE = darkMode ? "light-content" : "dark-content";
    const ORIGINAL_STATUSBAR_COLOR = darkMode ? "#121212" : "#00f"; 
    const ORIGINAL_NAVBAR_COLOR = darkMode ? "#121212" : "#00f"; 
    const ORIGINAL_NAVBUTTON_STYLE = darkMode ? "light" : "dark";

    // ---- APPLY LOADING OVERLAY ----
    try {
      StatusBar.setBarStyle("light-content", true);

      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor("rgba(0,0,0,0.85)", true);
      }

      if (Platform.OS === "android") {
        (async () => {
          try {
            await NavigationBar.setBackgroundColorAsync("rgba(0,0,0,0.85)");
            await NavigationBar.setButtonStyleAsync("light");
          } catch (e) {}
        })();
      }
    } catch (e) {}

    // ---- RESTORE SYSTEM BARS ----
    return () => {
      try {
        StatusBar.setBarStyle(ORIGINAL_STATUSBAR_STYLE, true);

        if (Platform.OS === "android") {
          StatusBar.setBackgroundColor(ORIGINAL_STATUSBAR_COLOR, true);
        }

        if (Platform.OS === "android") {
          (async () => {
            try {
              await NavigationBar.setBackgroundColorAsync(ORIGINAL_NAVBAR_COLOR);
              await NavigationBar.setButtonStyleAsync(ORIGINAL_NAVBUTTON_STYLE);
            } catch (e) {}
          })();
        }
      } catch (e) {}
    };
  }, [visible, darkMode]);

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View className="flex-1 bg-black/85 justify-center items-center">
        <ActivityIndicator size={80} color="white" />
      </View>
    </Modal>
  );
};

export default LoadingComponent;
