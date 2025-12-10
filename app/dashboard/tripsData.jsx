import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from 'expo-router';
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from '../../src/components/PageHeader';
import Tabs from '../../src/components/Tabs';
import { AddFilterCard, FilterChip, AddItemCard } from '../../src/components/AddEntityCard';
import { ThemedView, ThemedText, SafeAreacontext } from '../../src/components/ThemedColor';
const CURRENT_DATE = '10-13 2025';

export default function ShiftsData() {
    const router = useRouter();
    const [activeTimeFilter, setActiveTimeFilter] = useState('this-week');
    const [activeTab, setActiveTab] = useState('In-progress');

    const timeFilters = ['this-week', 'prev-week', 'this-month', 'others'];

    const tabs = ['In-progress', 'Summary', 'Audit', 'Last'];
    
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
        <ThemedText color={"#1f2937"} className="text-lg font-bold  ">
            {label}       
        </ThemedText>
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
        <SafeAreacontext bgColor={"#eff6ff"} className="flex-1 ">
          <PageHeader routes={"Trips Tracking"}/>   
           <View className="p-4 flex-1">
            <View className="mb-6">
                <View className="flex-row items-center">
                    <Ionicons name="filter" size={24} color="#3b82f6" />
                    <Text className="text-xl font-medium text-['#3b82f6'] ml-2">Filters</Text>
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


            <AddItemCard 
             title='Trip tracking'
             onchange={()=>console.log('starting working on it soon')}
            />

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

        </SafeAreacontext>
    );
}