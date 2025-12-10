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
  const [activeTab, setActiveTab] = useState('Pending');

  const timeFilters = ['this-week', 'prev-week', 'this-month', 'others'];

  const tabs = ['Open', 'Pending', 'Closed', 'All', 'Missed'];
  const message = `It seems that you have selected an incorrect set of projects, or you may not have saved any projects, or the projects might have been discontinued. Please review the applied filters...`



  const TabContent = () => {
    if (activeTab === 'Open') {
      return (
        <ThemedView className="mt-4 p-4  rounded-lg shadow-sm border ">
          <ThemedText color={"#374151"} className=" text-lg">
            {message}
          </ThemedText>
        </ThemedView>
      );
    }

    if (activeTab === 'Pending') {
      return (
        <ThemedView className="mt-4 p-4  rounded-lg shadow-sm border ">
          <ThemedText color={"#374151"} className=" text-lg">
            {message}
          </ThemedText>
        </ThemedView>
      );
    }

    if (activeTab === 'Closed') {
      return (
        <ThemedView className="mt-4 p-4  rounded-lg shadow-sm border ">
          <ThemedText color={"#374151"} className=" text-lg">
            {message}
          </ThemedText>
        </ThemedView>
      );
    }

    if (activeTab === 'All') {
      return (
        <ThemedView className="mt-4 p-4  rounded-lg shadow-sm border ">
          <ThemedText color={"#374151"} className=" text-lg">
            {message}
          </ThemedText>
        </ThemedView>
      );
    }

    // Default return for 'Last' or any unhandled tab
    return (
      <ThemedView className="mt-4 p-4  rounded-lg shadow-sm border ">
        <ThemedText color={"#374151"} className=" text-lg">
          {message}
        </ThemedText>
      </ThemedView>
    );
  };


  const TabsHeader = ({ label }) => {
    return (
      <ThemedText color={"#1f2937"} className="text-lg font-bold px-2 mt-2">
        {label}
      </ThemedText>
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
    <SafeAreacontext bgColor={"#eff6ff"} className="flex-1">
      <PageHeader routes="Shift Tracking" />
      <View className="px-3 flex-1">
        <View className="my-4">
          <Tabs
            tabs={timeFilters}
            activeTab={activeTimeFilter}
            setActiveTab={setActiveTimeFilter}
          />
        </View>

        <AddFilterCard
          title='Add shift'
          onchange={() => router.push("/dashboard")}
        />


        <View className="flex-row flex-wrap mb-4">
          <FilterChip label={`dates: ${CURRENT_DATE} to ${CURRENT_DATE}`} />
          <FilterChip label="project: all" />
        </View>


        <View className="">
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