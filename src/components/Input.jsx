
import { View, Text, TextInput, Animated } from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
import { useTheme } from '../context/ThemeProvider'

const Input = ({
  value,
  onchange,
  multiline = false,
  inputError = "",
  onFocus = () => { },
  setInputError = () => { },
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'words',
}) => {

  const [focus, setFocus] = useState(false)
  const borderAnim = useRef(new Animated.Value(0)).current
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const { darkMode } = useTheme()

  const finalColor = darkMode ? '#9ca3af' : '#646060ff'
  const showError = inputError && value === ""

  const errorColor = darkMode ? '#ef4444' : '#dc3545'
  const focusColor = darkMode ? '#3b82f6' : '#0d6efd'
  const defaultColor = darkMode ? '#6b7280' : '#ccc'

  useEffect(() => {
    let toValue = 0;

    if (showError) toValue = 2;
    else if (focus) toValue = 1;

    // Border color animation
    Animated.timing(borderAnim, {
      toValue,
      duration: 250,
      useNativeDriver: false,
    }).start();

    //  Shake ONLY when real error & empty value
    if (showError) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 70, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 70, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 70, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 70, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: false }),
      ]).start();
    }

  }, [focus, showError]);



  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [defaultColor, focusColor, errorColor],
  })

  return (
    <View className="">
      {/* Shadow wrapper fixes Android/iOS border bug */}
      <View style={{
        shadowColor: focus ? focusColor : '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      }}>
        <Animated.View
          style={{
            borderWidth: 1,
            borderRadius: 5,
            paddingHorizontal: 5,
            paddingVertical: 2,
            borderColor: borderColor,
            transform: [{ translateX: shakeAnim }],
          }}
        >
          <TextInput
            placeholder={placeholder}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            placeholderTextColor={finalColor}
            multiline = {multiline}
            value={value}
            onChangeText={(val) => {
              onchange(val)
              if (val !== "") setInputError('')
            }}
            onFocus={() => {
              setFocus(true)
              onFocus();
            }}
            onBlur={() => setFocus(false)}
            style={{ fontSize: 16, color: finalColor }}
          />
        </Animated.View>
      </View>

      {showError && (
        <Text className="text-sm text-red-500 mt-1">{inputError}</Text>
      )}
    </View>
  )
}

export default Input
