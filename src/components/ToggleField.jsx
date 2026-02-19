import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeProvider";

const PasswordInputField = ({
  passwordError,
  password,
  setPassword,
  setPasswordError,
  placeholder,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [focus, setFocus] = useState(false);

  const borderAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const { darkMode } = useTheme();

  const defaultColor = darkMode ? "#6b7280" : "#9ca3af"; // gray
  const focusColor = "#0d6efd"; // blue
  const errorColor = "#ef4444"; // red

  // 🔥 Animate Border Color Based on State
  useEffect(() => {
    let toValue = 0;

    if (passwordError) toValue = 2;
    else if (focus) toValue = 1;

    Animated.timing(borderAnim, {
      toValue,
      duration: 200,
      useNativeDriver: false,  
    }).start();

    // 🔥 Shake Effect on Error
    if (passwordError) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 70, useNativeDriver: false }), // FIX
        Animated.timing(shakeAnim, { toValue: -10, duration: 70, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 70, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 70, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: false }),
      ]).start();
    }
  }, [focus, passwordError]);

  // 🔥 Interpolated Border Color
  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [defaultColor, focusColor, errorColor],
  });

  return (
    <View>
      <Animated.View
        style={[
          styles.inputWrapper,
          {
            borderColor,
            transform: [{ translateX: shakeAnim }],
          },
        ]}
      >
        <TextInput
          placeholder={placeholder}
          secureTextEntry={!showPassword}
          value={password}
          placeholderTextColor={darkMode ? '#9ca3af' : '#646060ff'}
          onChangeText={(val) => {
            setPassword(val);
            setPasswordError("");
          }}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          autoCapitalize="none"
          style={[styles.input,{color:darkMode ? '#9ca3af' : '#646060ff'}]}
        />

        {/* 👁 Eye Button */}
        <TouchableOpacity
          onPress={() => setShowPassword((prev) => !prev)}
          style={styles.iconButton}
        >
          <Ionicons
            name={showPassword ? "eye" : "eye-off"}
            size={24}
            color={darkMode ? "#d1d5db" : "#646060ff"}
          />
        </TouchableOpacity>
      </Animated.View>

      {passwordError ? (
        <Text style={styles.errorText}>{passwordError}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  inputWrapper: {
    borderWidth: 1,
    borderRadius: 8,
    position: "relative",
    paddingRight: 40,
  },
  input: {
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  iconButton: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: [{ translateY: -14 }],
    padding: 4,
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
    marginTop: 4,
  },
});

export default PasswordInputField;
