import { View, Text, TextInput } from 'react-native'
import React from 'react'

const Input = ({ value, onchange, inputError, setInputError, placeholder, keyboardType = "default", autoCapitalize = "sentences" }) => {
    return (
        <View>
            <TextInput
                className={`rounded-md text-lg text-headercolor border px-2 ${inputError ? "border-red-500" : "border-gray-400"
                    }`}
                placeholder={placeholder}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                value={value}
                onChangeText={(val) => {
                    onchange(val);
                    setInputError("");
                }}
            />
            {inputError && (
                <Text className="text-sm text-red-500 my-1">{inputError}</Text>
            )}
        </View>
    )
}

export default Input