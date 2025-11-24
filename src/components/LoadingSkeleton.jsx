import { Animated, View, Text } from "react-native";
import React, { useEffect, useRef } from "react";

const LoadingSkeleton = () => {
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

  return (
    <>
      {[1, 2, 3,4].map((_, index) => (
        <Animated.View
          key={index}
          style={{
            opacity: fadeAnim,
            backgroundColor: "white",
            borderRadius: 12,
            marginVertical: 8,
            padding: 15,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 5,
            elevation: 3,
          }}
        >
          <View
            style={{
              height: 18,
              backgroundColor: "#D1D1D1",
              borderRadius: 5,
              width: "80%",
              marginBottom: 10,
            }}
          />
          <View
            style={{
              height: 14,
              backgroundColor: "#D1D1D1",
              borderRadius: 5,
              width: "60%",
              marginBottom:10
            }}
          />
           <View
            style={{
              height: 12,
              backgroundColor: "#D1D1D1",
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