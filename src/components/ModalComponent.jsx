import React, { useEffect, useState, useRef } from "react";
import { Modal, View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from "react-native";
import { playSound } from "../hooks/useSound";
import { useTheme } from "../context/ThemeProvider";
import { ThemedView, ThemedText } from "./ThemedColor";
import { useModalBars } from "../hooks/useModalBar";
import CustomConffeti from "./CustomConffeti";

const { height, width } = Dimensions.get("window");

const ModalComponent = ({
  visible,
  onClose,
  message,
  errorType = "success",
  buttons = [],
  title,
  autoHideProp,
}) => {
  const { darkMode } = useTheme();
  const [imageSource, setImageSource] = useState(null);
  const [autoHide, setAutoHide] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);

  // Refs for both cannons
  const confettiLeftRef = useRef(null);
  const confettiRightRef = useRef(null);

  const buttonColored = darkMode ? "border border-gray-500" : "bg-customBlue";

  useModalBars(visible, darkMode);

  // Main Logic Effect
  useEffect(() => {
    if (!visible) return;

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

        // Sync both cannons and fire from bottom
        setConfettiKey(Date.now());
        setTimeout(() => {
          confettiLeftRef.current?.start();
          confettiRightRef.current?.start();
        }, 150);
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

  // Auto Hide Effect
  useEffect(() => {
    if (visible && autoHide) {
      const timer = setTimeout(onClose, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible, autoHide, onClose]);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/85">

        {visible && errorType === "success" && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} pointerEvents="none">
            {/* Bottom Left Burst */}
            <CustomConffeti trigger={visible} />
          </View>
        )}

        <ThemedView
          darkBgColor={"#1f2937"}
          bgColor={"rgba(255,255,255,0.9)"}
          className="p-4 rounded-2xl w-11/12 max-w-sm items-center"
        >
          {/* Icon */}
          <View className="mb-2">
            {errorType === "warning" ? (
              <View style={styles.warningIcon} className="justify-center items-center mt-2 mb-4">
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
          {message && (
            <ThemedText color={"#646060ff"} className="text-2xl mb-4 font-medium text-center">
              {message}
            </ThemedText>
          )}

          {/* Buttons */}
          {buttons.length > 0 ? (
            <View className="flex-row justify-between w-full mt-3 mb-2">
              {buttons.map((btn, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={btn.onPress}
                  className={`flex-1 p-3 rounded-md ${btn.bgColor || "bg-customBlue"} ${index > 0 ? "ml-3" : ""}`}
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
              >
                <ThemedText color={"white"} className="font-semibold text-center text-xl">
                  Close
                </ThemedText>
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