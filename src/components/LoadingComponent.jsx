import React, { useEffect } from "react";
import { Modal, View, ActivityIndicator, StatusBar, Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import { useTheme } from "../context/ThemeProvider";
import { useModalBars } from "../hooks/useModalBar";

const LoadingComponent = ({ visible }) => {
  const { darkMode } = useTheme();
    useModalBars(visible,darkMode)
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View className="flex-1 bg-black/85 justify-center items-center">
        <ActivityIndicator size={80} color="white" />
      </View>
    </Modal>
  );
};

export default LoadingComponent;
