
import React, { useState } from 'react';
import { View, Text } from 'react-native'
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from '../../src/components/PageHeader';
import Tabs from '../../src/components/Tabs';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
const CURRENT_DATE = '10-13 2025';
const FuelRefills = () => {
  const [activeTimeFilter, setActiveTimeFilter] = useState('this-week');
  const timeFilters = ['this-week', 'prev-week', 'this-month', 'others'];
  const FilterChip = ({ label, iconName }) => (
    <View className="flex-row items-center bg-customBlue rounded-full px-4 py-2 mr-2 mb-2">
      {iconName && <Ionicons name={iconName} size={16} color="white" className="mr-1" />}
      <Text className="text-white text-sm font-semibold">{label}</Text>
    </View>
  );
  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <PageHeader routes={"Fuel Tracking"} />
      <View className="px-4 flex-1">
        <View className="my-4">
          <Tabs
            tabs={timeFilters}
            setActiveTab={setActiveTimeFilter}
            activeTab={activeTimeFilter}
          />
        </View>
        <View className="flex-row mb-3 items-center px-2">
          <FontAwesome6 name="sliders" size={20} color="#0000ff" />
          <Text className="text-2xl font-semibold text-customBlue ml-2">Filters</Text>
        </View>

        <View className="flex-row flex-wrap">
          <FilterChip label={`dates: ${CURRENT_DATE} to ${CURRENT_DATE}`} />
          <FilterChip label="project: all" />
        </View>
      </View>

    </SafeAreaView>
  );
}

export default FuelRefills;