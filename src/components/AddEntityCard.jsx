import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { ThemedView, ThemedText } from './ThemedColor'
import { Ionicons, Fontisto, FontAwesome6 } from "@expo/vector-icons";

import { useTheme } from '../context/ThemeProvider';

export const AddItemCard = ({ icon, title = "", onchange, className }) => {
    return (
        <>
            <ThemedView className={`${className} rounded-md shadow-md flex-row justify-between items-center p-4`}
                style={{ elevation: 1 }}>
                <View className="flex-row items-center">
                    {icon}
                    <Text
                        preventWrap={true}
                        className="ml-2 text-lg font-medium "
                        style={{ color: '#10b981' }}>
                        {title}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => onchange()}>
                    <Ionicons name="add-circle" size={26} color="#10b981" />
                </TouchableOpacity>
            </ThemedView>
        </>
    )
}


export const AddFilterCard = ({ title = "", onchange, filterItem }) => {
    return (
        <ThemedView className="flex-row  items-center shadow-md justify-between mb-4 py-5 px-4 rounded-lg "
        >
            <View className="flex-row ">
                {/* <Ionicons name="filter-outline" size={24} color="#3b82f6" onPress={filterItem} /> */}
                {/* <Fontisto name="filter" size={20} color="#3b82f6" onPress={filterItem} /> */}
                <FontAwesome6 name="sliders" size={20} color="#3b82f6" onPress={filterItem} />
                <Text
                    preventWrap={true}
                    className="text-xl font-medium  ml-3 text-blue-500">
                    Filters
                </Text>
            </View>

            <View className="flex-row items-center">
                <Text
                    preventWrap={true}
                    className="text-green-500 font-medium text-lg">{title}</Text>
                <TouchableOpacity className="ml-2"
                    onPress={onchange} >
                    <Ionicons name="add-circle" size={22} color="#22c55e" />
                </TouchableOpacity>
            </View>
        </ThemedView>
    )
}


export const FilterChip = ({ label, iconName }) => {
    const { darkMode } = useTheme()
    const darkModeFormate = darkMode ? 'border border-blue-600' : 'bg-customBlue'
    const textColor = darkMode ? "text-blue-600" : "text-white"
    return (
        <View className={`${darkModeFormate} flex-row items-center rounded-full px-4 py-2 mr-2 `}>
            {iconName && <Ionicons name={iconName} size={16} color="white" className="mr-1" />}
            <Text
                preventWrap={true}
                className={`${textColor}  text-sm font-semibold`}>{label}</Text>
        </View>
    )
};