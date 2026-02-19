import { View, Text } from 'react-native'
import React from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from '../../src/components/PageHeader';

const Savings = () => {
  return (
    <SafeAreaView className="flex-1">
      <PageHeader routes="Savings Tracking" />
      <View className="px-4">
        <View className="bg-white rounded-lg p-4 my-3">
          <Text className="text-lg font-semibold mb-1">Coming soon</Text>
          <Text className="text-xl">
            This feature will allow you to track your savings.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default Savings