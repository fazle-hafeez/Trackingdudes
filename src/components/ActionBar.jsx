import { View, Text ,TouchableOpacity} from 'react-native'
import React from 'react'
import {Ionicons,AntDesign} from "@expo/vector-icons";
const BottomActionBar = ({activeTab,toggleStatus,handleDelete,handleCancel}) => {
    return (
        <View className=" bg-white shadow-lg flex-row justify-around py-3 border-t border-gray-300">
            <TouchableOpacity className="items-center" onPress={toggleStatus}>
                <AntDesign
                    name={activeTab === "Enabled" ? "eye-invisible" : "eye"}
                    size={24}
                    color="#6b7280"
                />
                <Text className="text-[#6b7280]">
                    {activeTab === "Enabled" ? "Disable" : "Enable"}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity className="items-center" onPress={handleDelete}>
                <Ionicons name="trash-outline" size={22} color="#dc2626" />
                <Text className="text-[#dc2626]">Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCancel} className="items-center">
                <Ionicons name="close-circle-outline" size={22} color="#6b7280" />
                <Text className="text-gray-600">Cancel</Text>
            </TouchableOpacity>
        </View>
    )
}

export default BottomActionBar