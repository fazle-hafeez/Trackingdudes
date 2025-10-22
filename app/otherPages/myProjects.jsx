import { View, Text, TouchableOpacity, TextInput } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from '../../src/components/PageHeader';
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from '@expo/vector-icons/Feather';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { Link,useRouter } from 'expo-router';
const MyProjects = () => {
  const tabs = ['Enabled', 'Disbled']
  const [activeTab, setActiveTab] = useState('Enabled')
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1">
      <PageHeader routes="My Projects" />
      <View className="px-4 bg-gray-100">
        <View className="bg-white rounded-lg shadow-md flex-row justify-between p-4 my-4">
          <View className="flex-row ">
            <FontAwesome6 name="file-shield" size={24} color="#198754" />
            <Link href="/dashboard/dashboardPage" className='text-lg ml-2 font-medium text-[#198754]' >
              Add a projects
            </Link>
          </View>
          <TouchableOpacity
          onPress={()=>router.push("/otherPages/addingProject")}>
            <Ionicons name="add-circle" size={26} color="#10b981" />
          </TouchableOpacity>
        </View>

        <View className="mb-4 flex-row px-16 justify-between bg-white p-4 items-center rounded-lg"
        style={{elevation:1}}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={` pb-1 ${activeTab === tab ? 'border-b-2 border-blue' : ''}`}
            >
              <Text
                className={`text-lg  ${activeTab === tab ? 'text-blue' : 'text-headercolor'}`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className=" flex-row my-1 items-center border border-gray-300 rounded-lg mb-3 bg-white "
        style={{elevation:1}}>
          <Feather name="search" size={20} color="#9ca3af" className="pl-3" />
          <TextInput
            className="flex-1  text-gray-900"
            placeholder="Search for items..."
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View className="bg-white rounded-md shadow-md px-4 py-5">
          <Text className="text-lg">You have not saved any projects under the selected status.</Text>
          <Text className="mt-4 text-lg">
            Saving a project allows you to select it from the list of saved projects. This is useful in tracking shifts, trips,
            time, as well as fuel consumption or other expenses.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default MyProjects