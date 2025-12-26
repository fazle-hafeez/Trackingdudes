import { useEffect } from "react";
import { StatusBar, Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";

export const useModalBars = (visible, darkMode = false) => {
  useEffect(() => {
    if (!visible) return;

    // Save original bar style and color
    const ORIGINAL_STATUSBAR_STYLE = StatusBar._defaultBarStyle || "light-content"; // fallback
    const ORIGINAL_STATUSBAR_COLOR = Platform.OS === "android" ? darkMode ?  "#121212" :  "#00f" : undefined; // ya app default

    const applyBars = async () => {
      try {
        StatusBar.setBarStyle("light-content", true);
        if (Platform.OS === "android") {
          StatusBar.setBackgroundColor(darkMode ? "#000" : "#002", true);
          await NavigationBar.setButtonStyleAsync(darkMode ? "light" : "dark");
          await NavigationBar.setVisibilityAsync("hidden");
        }
      } catch (e) {
        console.log("NavigationBar error:", e);
      }
    };

    applyBars();

    return () => {
      const resetBars = async () => {
        try {
          StatusBar.setBarStyle(ORIGINAL_STATUSBAR_STYLE, true);
          if (Platform.OS === "android") {
            StatusBar.setBackgroundColor(ORIGINAL_STATUSBAR_COLOR, true);
            await NavigationBar.setButtonStyleAsync(darkMode ? "dark" : "light"); // original
            await NavigationBar.setVisibilityAsync("visible");
          }
        } catch (e) {
          console.log("Reset NavigationBar error:", e);
        }
      };
      resetBars();
    };
  }, [visible, darkMode]);
};
