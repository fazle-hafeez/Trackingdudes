import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import PageHeader from '../../../src/components/PageHeader';
import { ThemedView, ThemedText, SafeAreacontext } from '../../../src/components/ThemedColor';
import { router } from 'expo-router';

const Expenses = () => {
    return (
        <SafeAreacontext className="flex-1">
            <PageHeader routes="Expenses Tracking" />
            <View className="px-4">
                <ThemedView className=" rounded-md shadow-md flex-row justify-between items-center p-4 my-4">
                    <View className="flex-row items-center">
                        <FontAwesome6 name="receipt" size={20} color="#10b981" />
                        <Text className="ml-2 text-lg font-medium "
                            style={{ color: '#10b981' }}>
                            Add  Expenses
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push("/otherPages/expenses/addExpenses")}>
                        <Ionicons name="add-circle" size={26} color="#10b981" />
                    </TouchableOpacity>
                </ThemedView>

                <ThemedView className=" rounded-lg p-4 ">
                    <ThemedText className="text-lg font-semibold mb-1">Coming soon</ThemedText>
                    <ThemedText className="text-xl">
                        This feature will allow you to track your expenses.
                    </ThemedText>
                </ThemedView>
            </View>
        </SafeAreacontext>
    )
}

export default Expenses