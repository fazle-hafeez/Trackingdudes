import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Create context
export const ThemeContext = createContext();

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};

// Provider
export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  // Load saved theme from AsyncStorage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem("darkMode");
        if (saved !== null) setDarkMode(JSON.parse(saved));
      } catch (err) {
        console.log("Error loading theme:", err);
      }
    };
    loadTheme();
  }, []);

  // Set specific theme
  const setTheme = async (isDark) => {
    setDarkMode(isDark);
    try {
      await AsyncStorage.setItem("darkMode", JSON.stringify(isDark));
    } catch (err) {
      console.log("Error saving theme:", err);
    }
  };

  // Toggle current theme
  const toggleTheme = () => setTheme(!darkMode);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
