
import { View, Text,TouchableOpacity } from 'react-native'
import React from 'react'

const Tabs = ({tabs=[],activeTab,setActiveTab,}) => {
  return (
    <View className=" bg-white p-4  shadow-md rounded-lg">
      <View className="flex-row justify-between">
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={` pb-1 ${activeTab === tab ? 'border-b-2 border-blue' : ''}`}
          >
            <Text
              className={`text-lg  ${activeTab === tab ? 'text-customBlue' : 'text-headercolor'}`}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

export default Tabs

