import { View, Text, TouchableOpacity, Platform } from 'react-native';
import React from 'react';
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeProvider';

const BottomActionBar = ({ activeTab, toggleStatus, handleDelete, handleCancel }) => {
  const insets = useSafeAreaInsets(); // bottom safe area
  const {darkMode} = useTheme()

  return (
    <View style={{
      backgroundColor: darkMode ? "#121212" : 'white',
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: darkMode ? "#4a5568": '#d1d5db',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 10,
      paddingBottom: Platform.OS === 'android' ? insets.bottom + 5 : insets.bottom, // safe bottom
    }}>
      <TouchableOpacity style={{ alignItems: 'center' }} onPress={toggleStatus}>
        <AntDesign
          name={activeTab === "Enabled" ? "eye-invisible" : "eye"}
          size={24}
          color="#6b7280"
        />
        <Text style={{ color: '#6b7280' }}>
          {activeTab === "Enabled" ? "Disable" : "Enable"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={{ alignItems: 'center' }} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={22} color="#dc2626" />
        <Text style={{ color: '#dc2626' }}>Delete</Text>
      </TouchableOpacity>

      <TouchableOpacity style={{ alignItems: 'center' }} onPress={handleCancel}>
        <Ionicons name="close-circle-outline" size={22} color="#6b7280" />
        <Text style={{ color: '#6b7280' }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  )
}

export default BottomActionBar;
