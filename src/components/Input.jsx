import { View, Text, TextInput, Animated } from 'react-native'
import React, { useState, useRef, useEffect } from 'react'

const Input = ({
  value,
  onchange,
  inputError = "",
  setInputError = () => {},
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'words',
}) => {
  const [focus, setFocus] = useState(false)
  const borderAnim = useRef(new Animated.Value(0)).current // 0 = gray, 1 = blue, 2 = red

  const showError = inputError && value === ""

  // Animate border color
  useEffect(() => {
    let toValue = 0
    if (showError) toValue = 2
    else if (focus) toValue = 1

    Animated.timing(borderAnim, {
      toValue,
      duration: 250,
      useNativeDriver: false,
    }).start()
  }, [focus, showError])

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['#ccc', '#0d6efd', '#dc3545'], // gray, bootstrap blue, red
  })

  return (
    <View className="">
      <Animated.View
        style={{
          borderWidth: 1,
          borderRadius: 5,
          borderColor,
          paddingHorizontal:5,
          paddingVertical: 2,
          shadowColor: focus ? '#0d6efd' : '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          backgroundColor: '#fff',
        }}
      >
        <TextInput
          placeholder={placeholder}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          value={value}
          onChangeText={(val) => {
            onchange(val)
            if (val !== "") setInputError('')
          }}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{ fontSize: 16 }}
        />
      </Animated.View>
      {showError && (
        <Text className="text-sm text-red-500 mt-1">{inputError}</Text>
      )}
    </View>
  )
}

export default Input
