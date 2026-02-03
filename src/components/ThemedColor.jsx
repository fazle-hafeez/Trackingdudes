import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "../context/ThemeProvider";
import { SafeAreaView } from "react-native-safe-area-context";

// safeAreacontext -----

const wrapStringsWithText = (children) => {
  return React.Children.map(children, (child) => {
    // 1. Agar string/number hai, wrap it
    if (typeof child === "string" || typeof child === "number") {
      return <ThemedText>{child}</ThemedText>;
    }

    if (React.isValidElement(child)) {
      // 2. AGAR humne manually kaha hai ke wrap mat karo (preventWrap)
      // Ya agar component ka naam 'Text' ya 'ThemedText' hai
      if (child.props?.preventWrap || child.type?.displayName === "Text" || child.type === Text) {
        return child; // Return as is, don't look inside
      }

      // 3. Recursive check for other containers (View, View, etc.)
      if (child.props.children) {
        return React.cloneElement(child, {
          ...child.props,
          children: wrapStringsWithText(child.props.children),
        });
      }
    }
    return child;
  });
};


export const SafeAreacontext = ({ children, style = {}, bgColor, ...props }) => {
  const { darkMode } = useTheme();
  const finalBgColor = darkMode ? "#121212" : bgColor || "#eff6ff";

  return (
    <SafeAreaView
      style={[{ backgroundColor: finalBgColor }, style]}
      {...props}
    >
      {wrapStringsWithText(children)}
    </SafeAreaView>
  );
};

// Themed container

export const ThemedView = ({ children, style = {}, bgColor, darkBgColor, ...props }) => {
  const { darkMode } = useTheme();

  const finalBgColor = darkMode ? darkBgColor || "#121212" : bgColor || "#fff";

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
      {wrapStringsWithText(children)}
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

  // Agar style mein color maujood hai toh wahi use karo, warna theme wala
  const hasStyleColor = style?.color || (Array.isArray(style) && style.some(s => s?.color));

  const textColor = hasStyleColor ? undefined : (darkMode
    ? darkColor ?? "#9ca3af"
    : color ?? "#111");

  return (
    <Text style={[{ color: textColor }, style]} {...props}>
      {children}
    </Text>
  );
};
