import { View, Text, TouchableOpacity, Platform } from 'react-native';
import React from 'react';
import { Ionicons, AntDesign, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from '../context/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BottomActionBar = ({
  activeTab,
  toggleStatus,
  handleDelete,
  handleCancel,
  handleEdit,   // NEW
  handleView    // NEW
}) => {
  const { darkMode } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{
      backgroundColor: darkMode ? "#121212" : 'white',
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 25,
      borderTopWidth: 1,
      borderTopColor: darkMode ? "#4a5568" : '#d1d5db',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 10,
      paddingBottom: Platform.OS === 'android' ? insets.bottom + 8 : insets.bottom,
    }}>

      {/* Enable / Disable */}
      {toggleStatus && (
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
      )}

      {/* Edit */}
      {handleEdit && (
        <TouchableOpacity style={{ alignItems: 'center' }} onPress={handleEdit}>
          <MaterialIcons name="edit" size={24} color="#2563eb" />
          <Text style={{ color: '#2563eb' }}>Edit</Text>
        </TouchableOpacity>
      )}

      {/* View */}
      {handleView && (
        <TouchableOpacity style={{ alignItems: 'center' }} onPress={handleView}>
          <Ionicons name="eye-outline" size={24} color="#6b7280" />
          <Text style={{ color: '#6b7280' }}>View</Text>
        </TouchableOpacity>
      )}

      {/* Delete */}
      {handleDelete && (
        <TouchableOpacity style={{ alignItems: 'center' }} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color="#dc2626" />
          <Text style={{ color: '#dc2626' }}>Delete</Text>
        </TouchableOpacity>
      )}

      {/* Cancel */}
      {handleCancel && (
        <TouchableOpacity style={{ alignItems: 'center' }} onPress={handleCancel}>
          <Ionicons name="close-circle-outline" size={22} color="#6b7280" />
          <Text style={{ color: '#6b7280' }}>Cancel</Text>
        </TouchableOpacity>
      )}

    </View>
  );
};

export default BottomActionBar;
