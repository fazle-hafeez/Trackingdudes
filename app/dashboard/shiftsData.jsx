import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from 'expo-router';
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from '../../src/components/PageHeader';
import Tabs from '../../src/components/Tabs';
const CURRENT_DATE = '10-13 2025';

export default function ShiftsData() {
  const router = useRouter();
  const [activeTimeFilter, setActiveTimeFilter] = useState('this-week');
  const [activeTab, setActiveTab] = useState('Pending');

  const timeFilters = ['this-week', 'prev-week', 'this-month', 'others'];

  const tabs = ['Open', 'Pending', 'Closed', 'All', 'Missed'];
  const message = `It seems that you have selected an incorrect set of projects, or you may not have saved any projects, or the projects might have been discontinued. Please review the applied filters...`
  const FilterChip = ({ label, iconName }) => (
    <View className="flex-row items-center bg-customBlue rounded-full px-4 py-2 mr-2 ">
      {iconName && <Ionicons name={iconName} size={16} color="white" className="mr-1" />}
      <Text className="text-white text-sm font-semibold">{label}</Text>
    </View>
  );


  const TabContent = () => {
    if (activeTab === 'Open') {
      return (
        <View className="mt-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <Text className="text-gray-700 text-lg">
            {message}
          </Text>
        </View>
      );
    }

    if (activeTab === 'Pending') {
      return (
        <View className="mt-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <Text className="text-gray-700 text-lg">
             {message}
          </Text>
        </View>
      );
    }

    if (activeTab === 'Closed') {
      return (
        <View className="mt-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <Text className="text-gray-700 text-lg">
             {message}
          </Text>
        </View>
      );
    }

    if (activeTab === 'All') {
      return (
        <View className="mt-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <Text className="text-gray-700 text-lg">
             {message}
          </Text>
        </View>
      );
    }

    // Default return for 'Last' or any unhandled tab
    return (
      <View className="mt-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
        <Text className="text-gray-700 text-lg">
             {message}
        </Text>
      </View>
    );
  };


  const TabsHeader = ({ label }) => {
    return (
      <Text className="text-lg font-bold text-gray-800 px-2 mt-2">
        {label}
      </Text>
    )
  }

  const ShowTabsHeaders = () => {
    if (activeTab === "Open") {
      return (<TabsHeader label="Open Shifts" />) // Corrected label to match screenshot
    }
    else if (activeTab === "Pending") {
      return (<TabsHeader label="Pending Shifts" />)
    }
    else if (activeTab === "Closed") {
      return (<TabsHeader label="Closed Shifts" />)
    }
    else if (activeTab === "All") {
      return (<TabsHeader label="All Shifts" />)
    }
    // FIX: The final block must explicitly return the component.
    else {
      return (<TabsHeader label="Last trips" />)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <PageHeader  routes="Shift Tracking"/>
      <View className="px-3 flex-1">
          <View className="my-4">
           <Tabs 
             tabs={timeFilters}
             activeTab={activeTimeFilter}
             setActiveTab={setActiveTimeFilter}
           />
           </View>

          <View className="flex-row items-center justify-between mb-4 px-2">
            <View className="flex-row">
              <Ionicons name="filter" size={24} color="#3b82f6" />
              <Text className="text-2xl font-semibold text-headercolor ml-2">Filters</Text>
            </View>

            <View className="flex-row items-center">
              <Text className="text-green-500 font-semibold text-lg">add shift</Text>
              <TouchableOpacity className="ml-2">
                <Ionicons name="add-circle" size={22} color="#10b981" />
              </TouchableOpacity>
            </View>
          </View>


          <View className="flex-row flex-wrap mb-4">
            <FilterChip label={`dates: ${CURRENT_DATE} to ${CURRENT_DATE}`} />
            <FilterChip label="project: all" />
          </View>


        <View className="bg-white px-3 py-4 rounded-lg shadow-md border border-gray-200">
          <View className="flex-row justify-between items-center">
            <Text className="text-xl font-bold text-gray-800">Trip tracking</Text>
            <TouchableOpacity>
              <Ionicons name="add-circle" size={24} color="#10b981" />
            </TouchableOpacity>
          </View>
        </View>

         
         <View className="mt-4">
          <Tabs 
           tabs={tabs}
           activeTab={activeTab}
           setActiveTab={setActiveTab}   
          />
         </View>
        <View className="mt-2">
          {/* FIX 1: The Tabs Header is now correctly rendered */}
          <ShowTabsHeaders />
          {/* FIX 2: Call the TabContent component to show the main content area */}
          <TabContent />
        </View>
         </View>
    </SafeAreaView>
  );
}