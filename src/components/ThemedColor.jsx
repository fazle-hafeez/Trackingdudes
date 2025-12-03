import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "../context/ThemeProvider";

// Themed container
export const ThemedView = ({
  children,
  style = {},
  bgColor,
  darkBgColor,
  ...props
}) => {
  const { darkMode } = useTheme();

  const finalBgColor = darkMode
    ? darkBgColor || "#111"   // dark mode bg
    : bgColor || "#fff";      // light mode bg

  return (
    <View
      style={[
        {
          backgroundColor: finalBgColor,
          borderWidth: darkMode ? 1 : 0,
          borderColor: darkMode ? "#4a5568" : "transparent",
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

// Themed text
/**
 * @param color - optional, normal color for light mode
 * @param darkColor - optional, color for dark mode
 */

export const ThemedText = ({ children, style, color, darkColor, ...props }) => {
  const { darkMode } = useTheme();

  const textColor = darkMode
    ? darkColor ?? "#fff" // dark mode default
    : color ?? "#111";    // light mode default

  return (
    <Text style={[{ color: textColor }, style]} {...props}>
      {children}
    </Text>
  );
};
