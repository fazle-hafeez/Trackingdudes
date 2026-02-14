
import { View, Text, TextInput, Animated ,TouchableOpacity} from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
import { useTheme } from '../context/ThemeProvider'
import { Feather } from "@expo/vector-icons";

const Input = ({
  value,
  icon = false,
  onchange,
  multiline = false,
  className,
  style = {},
  inputError = "",
  onFocus = () => { },
  setInputError = () => { },
  iconEvent = () => {},
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'words',
  borderColors,
  editable = true,
  rightIcon = false
}) => {

  const [focus, setFocus] = useState(false)
  const borderAnim = useRef(new Animated.Value(0)).current
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const { darkMode } = useTheme()

  const finalColor = darkMode ? '#9ca3af' : '#646060ff'
  const showError = inputError && value === ""

  const errorColor = darkMode ? '#ef4444' : '#dc3545'
  const focusColor = darkMode ? '#3b82f6' : '#0d6efd'
  const defaultColor = darkMode ? '#4a5568' : borderColors ? borderColors : '#ccc'

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
    <View className="shadow-xl">
      {/* Shadow wrapper fixes Android/iOS border bug */}
      <View
        style={{
          shadowColor: focus ? focusColor : '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 3,

        }}>
        <Animated.View
          style={{
            borderWidth: 1,
            borderRadius: 5,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderColor: borderColor,
            transform: [{ translateX: shakeAnim }],
            flexDirection: 'row',
            itemsCenter: 'center',
          }}
          className={`${className} flex-row items-center`}
        >
          {/* Left Icon */}
          {icon && <Feather name="search" size={22} color="#9ca3af" />}

          <TextInput
            placeholder={placeholder}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            placeholderTextColor={finalColor}
            multiline={multiline}
            editable={editable}
            value={value}
            onChangeText={(val) => {
              onchange(val);
              if (val !== "") setInputError('');
            }}
            onFocus={() => {
              setFocus(true);
              onFocus();
            }}
            onBlur={() => setFocus(false)}
            style={[style, { fontSize: 16, color: finalColor, flex: 1, marginLeft: icon ? 8 : 0 }]}
          />

          {rightIcon && (
            <TouchableOpacity onPress={iconEvent}>
            <Feather
              name="search"
              size={22}
              color="#9ca3af"
              style={{ marginLeft: 8 }}
            />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>

      {showError && (
        <Text className="text-sm text-red-500 mt-1">{inputError}</Text>
      )}
    </View>
  )
}

export default Input
