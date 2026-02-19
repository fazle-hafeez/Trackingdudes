import { Animated, View } from "react-native";
import React, { useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeProvider";

const LoadingSkeleton = ({
  count = 4,       
  spacing = 8,  
  height = 90,  
}) => {
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

  const cardBg = darkMode ? "#1f2937" : "#ffffff";
  const shimmerColor = darkMode ? "#374151" : "#D1D1D1";

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Animated.View
          key={index}
          style={{
            opacity: fadeAnim,
            backgroundColor: cardBg,
            borderRadius: 14,
            marginBottom: spacing,
            padding: 16,
            height,
            shadowColor: "#000",
            shadowOpacity: darkMode ? 0 : 0.1,
            shadowRadius: 6,
            elevation: darkMode ? 0 : 3,
          }}
        >
          {/* Line 1 */}
          <View
            style={{
              height: 16,
              backgroundColor: shimmerColor,
              borderRadius: 6,
              width: "75%",
              marginBottom: 10,
            }}
          />

          {/* Line 2 */}
          <View
            style={{
              height: 14,
              backgroundColor: shimmerColor,
              borderRadius: 6,
              width: "55%",
              marginBottom: 10,
            }}
          />

          {/* Line 3 */}
          <View
            style={{
              height: 12,
              backgroundColor: shimmerColor,
              borderRadius: 6,
              width: "35%",
            }}
          />
        </Animated.View>
      ))}
    </>
  );
};

export default LoadingSkeleton;
