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
    const [activeTab, setActiveTab] = useState('In-progress');

    const timeFilters = ['this-week', 'prev-week', 'this-month', 'others'];

    const tabs = ['In-progress', 'Summary', 'Audit', 'Last'];

    const FilterChip = ({ label, iconName }) => (
        <View className="flex-row items-center bg-customBlue rounded-full px-4 py-2 mr-2 mb-2">
            {iconName && <Ionicons name={iconName} size={16} color="white" className="mr-1" />}
            <Text className="text-white text-sm font-semibold">{label}</Text>
        </View>
    );
    
    const TabContent = () => {
        if (activeTab === 'In-progress') {
            return (
                <View className="mt-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                    <Text className="text-gray-700 text-base">
                        No trips in progress
                    </Text>
                </View>
            );
        }

        if (activeTab === 'Summary') {
            return (
                <View className="mt-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                    <Text className="text-gray-700 text-base">
                        No such projects exist
                    </Text>
                </View>
            );
        }

        if (activeTab === 'Audit') {
            return (
                <View className="mt-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                    <Text className="text-gray-700 text-base">
                        No vehicle found
                    </Text>
                </View>
            );
        }
    
        // Default return for 'Last' or any unhandled tab
        return (
            <View className="mt-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <Text className="text-gray-700 text-base">
                    No data found for the last tab
                </Text>
            </View>
        );
    };


    const TabsHeader = ({label}) => {
      return(
        <Text className="text-lg font-bold text-gray-800 ">
            {label}       
        </Text>
      )
    }

    const ShowTabsHeaders = () => {
        if(activeTab === "In-progress"){
          return(<TabsHeader label="In progress trips"/>) // Corrected label to match screenshot
        }
        else if (activeTab === "Summary"){
          return(<TabsHeader label="Summary trips"/>)
        }
        else if (activeTab === "Audit"){
          return(<TabsHeader label="Audit trips"/>)
        }
        // FIX: The final block must explicitly return the component.
        else {
          return(<TabsHeader label="Last trips"/>)
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
          <PageHeader routes={"Trips Tracking"}/>   
           <View className="p-4 flex-1">
            <View className="mb-6">
                <View className="flex-row items-center">
                    <Ionicons name="filter" size={24} color="#3b82f6" />
                    <Text className="text-2xl font-bold text-gray-800 ml-2">Filters</Text>
                </View>
                
                <View className="my-4">
                    <Tabs 
                      tabs={timeFilters}
                      setActiveTab={setActiveTimeFilter}
                      activeTab={activeTimeFilter}
                    />
                </View>

              
                <View className="flex-row flex-wrap">
                    <FilterChip label={`dates: ${CURRENT_DATE} to ${CURRENT_DATE}`} />
                    <FilterChip label="project: all" />
                    <FilterChip label="vehicle: all" />
                </View>
            </View>

            
            <View className="bg-white px-3 py-4 rounded-lg shadow-md border border-gray-200">
                <View className="flex-row justify-between items-center">
                    <Text className="text-xl font-bold text-gray-800">Trip tracking</Text>
                    <TouchableOpacity>
                        <Ionicons name="add-circle" size={24} color="#10b981" />
                    </TouchableOpacity>
                </View>
            </View>

             <View className="my-4">
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