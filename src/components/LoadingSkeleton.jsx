import { Animated, View } from "react-native";
import React, { useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeProvider"; 

const LoadingSkeleton = () => {
  const { darkMode } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Colors based on theme
  const cardBg = darkMode ? "#1f2937" : "#fff"; // dark card bg
  const shimmerColor = darkMode ? "#374151" : "#D1D1D1"; // dark/light shimmer

  return (
    <>
      {[1, 2, 3, 4].map((_, index) => (
        <Animated.View
          key={index}
          style={{
            opacity: fadeAnim,
            backgroundColor: cardBg,
            borderRadius: 12,
            marginVertical: 8,
            padding: 15,
            shadowColor: darkMode ? "#000" : "#000",
            shadowOpacity: 0.1,
            shadowRadius: 5,
            elevation: 3,
          }}
        >
          <View
            style={{
              height: 18,
              backgroundColor: shimmerColor,
              borderRadius: 5,
              width: "80%",
              marginBottom: 10,
            }}
          />
          <View
            style={{
              height: 14,
              backgroundColor: shimmerColor,
              borderRadius: 5,
              width: "60%",
              marginBottom: 10,
            }}
          />
          <View
            style={{
              height: 12,
              backgroundColor: shimmerColor,
              borderRadius: 5,
              width: "40%",
            }}
          />
        </Animated.View>
      ))}
    </>
  );
};

export default LoadingSkeleton;
