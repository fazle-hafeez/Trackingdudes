import React, { useEffect, useMemo, useState } from "react";
import { Modal, View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { playSound } from "../hooks/useSound";
import { useTheme } from "../context/ThemeProvider";
import { ThemedView, ThemedText } from "./ThemedColor";

const ModalComponent = ({
  visible,
  onClose,
  message,
  errorType = "success",
  buttons = [],
  title,
  autoHideProp,
}) => {
  const { darkMode } = useTheme()
  const [imageSource, setImageSource] = useState(null);
  const [autoHide, setAutoHide] = useState(false);
  const buttonColored = darkMode ? "border border-gray-500" : "bg-customBlue"

  // Handle image and sound based on errorType
  useEffect(() => {
    if (!visible) return; // Only play when modal opens

    let img, hide = false;

    switch (errorType) {
      case "error":
        img = require("../../assets/images/cross-markup.png");
        playSound("error");
        break;
      case "success":
        img = require("../../assets/images/check-markup.png");
        hide = autoHideProp === undefined ? true : autoHideProp;
        playSound("success");
        break;
      case "warning":
        img = null;
        playSound("warning");
        break;
      default:
        img = require("../../assets/images/check-markup.png");
    }

    setImageSource(img);
    setAutoHide(hide);
  }, [visible, errorType, autoHideProp]);


  // Auto-hide logic
  useEffect(() => {
    if (visible && autoHide) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, autoHide, onClose]);

  // Render Modal
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View className={`flex-1 justify-center items-center bg-black/85`}>
        <ThemedView darkBgColor={"#1f2937"} bgColor={"rgba(255,255,255,0.9)"}
          className="p-4 rounded-2xl w-11/12 max-w-sm items-center">

          {/* Icon */}
          <View className="mb-1">
            {errorType === "warning" ? (
              <View className="justify-center items-center mt-2 mb-4" style={styles.warningIcon}>
                <Text style={{ fontSize: 48, color: "orange", fontWeight: "bold" }}>!</Text>
              </View>
            ) : (
              imageSource && (
                <Image source={imageSource} style={{ width: 105, height: 105 }} />
              )
            )}
          </View>

          {/* Title */}
          {title && (
            <ThemedText color={"#646060ff"} className=" text-3xl font-medium text-center my-2">
              {title}
            </ThemedText>
          )}

          {/* Message */}
          {message ? (
            <ThemedText color={"#646060ff"} className="text-2xl mb-4  font-medium text-center">
              {message}
            </ThemedText>
          ) : null}

          {/* Buttons */}
          {buttons.length > 0 ? (
            <View className="flex-row justify-between w-full mt-3 mb-2">
              {buttons.map((btn, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={btn.onPress}
                  className={`flex-1 p-3 rounded-md ${btn.bgColor || "bg-customBlue"} ${index > 0 ? "ml-3" : ""
                    }`}
                  activeOpacity={0.6}
                >
                  <Text className="font-semibold text-white text-center text-xl">
                    {btn.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            !autoHide && (
              <TouchableOpacity
                onPress={onClose}
                className={`mt-2 w-full ${buttonColored} p-3 rounded-md mb-1`}
                activeOpacity={0.6}
              >
                <ThemedText color={"white"} className="font-semibold  text-center text-xl">Close</ThemedText>
              </TouchableOpacity>
            )
          )}
        </ThemedView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  warningIcon: {
    width: 70,
    height: 70,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#FFA500",
  },
});

export default ModalComponent;
