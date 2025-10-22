import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from '../../src/components/PageHeader';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from 'expo-router';
const MyVehicles = () => {
  return (
    <SafeAreaView className="flex-1">
      <PageHeader routes="My Vehicles" />
      <View className="px-4 bg-gray-100">
        <View className="bg-white rounded-lg shadow-md flex-row justify-between p-4 my-4">
          <View className="flex-row ">
            <FontAwesome5 name="car" size={24} color="#198754" />
            <Link href="/dashboard/dashboardPage" className='text-lg ml-3 font-medium text-[#198754]' >
             Add a vehicle 
             </Link>
          </View>
          <TouchableOpacity
          activeOpacity={0.6}>
            <Ionicons name="add-circle" size={26} color="#10b981" />
          </TouchableOpacity>
        </View>
         
         <View className="mb-2 px-2">
           <Text className="text-lg font-medium">Your vehicles</Text>
         </View>

         <View className="bg-white rounded-md shadow-md p-4">
           <Text className="text-lg">You have not saved any vehicles yet. Saving a vehicle allows you to select it from the list of saved vehicles, 
            enabling you to track trips as well as fuel consumption</Text>
         </View>
      </View>
    </SafeAreaView>
  )
}

export default MyVehicles