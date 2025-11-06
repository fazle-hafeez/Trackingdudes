// import { View, Text, TouchableOpacity,StatusBar } from 'react-native'
// import React from 'react'
// import { SafeAreaView } from "react-native-safe-area-context"
// import PageHeader from '../../../src/components/PageHeader';
// import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
// import Ionicons from "@expo/vector-icons/Ionicons";
// import { Link ,router } from 'expo-router';
// const MyVehicles = () => {
//   return (
//     <SafeAreaView className="flex-1">
//       <StatusBar barStyle="light-content" backgroundColor="#0000ff" />
//       <PageHeader routes="My Vehicles" />
//       <View className="px-4 bg-gray-100">
//         <View className="bg-white rounded-lg shadow-md flex-row justify-between p-4 my-4">
//           <View className="flex-row ">
//             <FontAwesome5 name="car" size={24} color="#198754" />
//             <Link href="/dashboard/dashboardPage" className='text-lg ml-3 font-medium text-[#198754]' >
//              Add a vehicle 
//              </Link>
//           </View>
//           <TouchableOpacity
//           activeOpacity={0.6}>
//             <Ionicons name="add-circle" size={26} color="#10b981" onPress={()=>router.push("/otherPages/vehicles/addVehicles")}/>
//           </TouchableOpacity>
//         </View>

//          <View className="mb-2 px-2">
//            <Text className="text-lg font-medium">Your vehicles</Text>
//          </View>

//          <View className="bg-white rounded-md shadow-md p-4">
//            <Text className="text-lg">You have not saved any vehicles yet. Saving a vehicle allows you to select it from the list of saved vehicles, 
//             enabling you to track trips as well as fuel consumption</Text>
//          </View>
//       </View>
//     </SafeAreaView>
//   )
// }

// export default MyVehicles


import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome5, Ionicons, MaterialIcons,FontAwesome6 } from "@expo/vector-icons";
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";
import { useFocusEffect } from "@react-navigation/native";
import PageHeader from "../../../src/components/PageHeader";
import LoadingSkeleton from "../../../src/components/LoadingSkeleton";
import { router } from "expo-router";
const MyVehicles = () => {
  const { get } = useApi();
  const { showModal } = useAuth();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [actionModal, setActionModal] = useState(false);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const result = await get(`my-vehicles?status=enabled&order=asc&limit=5&page=1&_t=${Date.now()}`, {
        useBearerAuth: true,
      });
      console.log(result);
      
      if (result?.status === "success") setVehicles(result.data || []);
      else setVehicles([]);
    } catch (err) {
      console.log("Error fetching vehicles:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
    }, [])
  );

  const handleAction = (type) => {
    setActionModal(false);
    switch (type) {
      case "edit":
        showModal("Edit option clicked.", "success");
        break;
      case "delete":
        showModal("Vehicle deleted successfully.", "success");
        break;
      default:
        break;
    }
  };

  const renderVehicle = ({ item }) => (
    <View className="bg-white rounded-md shadow-sm p-4 mb-3">
      {/* Top Row */}
      <View className="flex-row justify-between items-center border-b border-yellow-300 pb-2 mb-2">
        <View className="flex-row items-center">
          <FontAwesome5 name="car" size={20} color="black" />
          <Text className="text-lg font-semibold text-gray-700 ml-2">
            {item.vehicle}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            setSelectedVehicle(item);
            setActionModal(true);
          }}
        >
          <MaterialIcons name="more-vert" size={22} color="#00000" />
        </TouchableOpacity>
      </View>

      {/* Vehicle Stats */}
      <View className="flex-row justify-between items-center mt-1">
        <View className="items-center flex-1">
          <FontAwesome5 name="leaf" size={20} color="#10b981" />
          <Text className="text-xs text-gray-500 mt-1">Fuel economy</Text>
          <Text className="text-base font-medium text-gray-700">
            {item.fuel_consumption_rate} /ltr
          </Text>
        </View>

        <View className="items-center flex-1">
          <FontAwesome6 name="ankh" size={20} color="#3b82f6" />
          <Text className="text-xs text-gray-500 mt-1">Tank capacity</Text>
          <Text className="text-base font-medium text-gray-700">
            {item.tank_capacity}
          </Text>
        </View>

        <View className="items-center flex-1">
          <Ionicons name="speedometer-outline" size={20} color="#a855f7" />
          <Text className="text-xs text-gray-500 mt-1">Levels/ltr</Text>
          <Text className="text-base font-medium text-gray-700">
            {item.level_raise_per_unit}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-blue-50">
      <StatusBar barStyle="light-content" backgroundColor="#0000ff" />
      <PageHeader routes="My Vehicles" />

      {/* Add another vehicle */}
      <View className="bg-white rounded-md shadow-md flex-row justify-between items-center p-4 m-4">
        <View className="flex-row items-center">
          <FontAwesome5 name="car" size={20} color="black" />
          <Text className="ml-2  text-lg font-medium">
            Add another vehicle
          </Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="add-circle" size={26} color="#198754" 
          onPress={()=>router.push("otherPages/vehicles/addVehicles")}/>
        </TouchableOpacity>
      </View>

      {/* List */}
      <View className="px-4 flex-1">
        <Text className="text-gray-700 text-xl font-medium mb-2 px-3">
          Your vehicles
        </Text>
        {loading ? (
          <LoadingSkeleton /> 
        ) : vehicles.length > 0 ? (
          <FlatList
            data={vehicles}
            renderItem={renderVehicle}
            keyExtractor={(item) => item.id.toString()}
          />
        ) : (
          <View className="bg-white rounded-md shadow-md p-4">
            <Text className="text-lg text-gray-700">
              You have not saved any vehicles yet. Saving a vehicle allows you to
              select it from the list of saved vehicles, enabling you to track trips
              as well as fuel consumption.
            </Text>
          </View>
        )}


      </View>

      {/* Action Dialog */}
      <Modal
        transparent
        visible={actionModal}
        animationType="fade"
        onRequestClose={() => setActionModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPressOut={() => setActionModal(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <View className="bg-white rounded-t-2xl p-4">
            <Text className="text-lg font-semibold mb-3 text-gray-800">
              Actions
            </Text>

            <TouchableOpacity
              onPress={() => handleAction("edit")}
              className="py-3 border-b border-gray-200"
            >
              <Text className="text-blue-600 text-base font-medium">Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleAction("delete")}
              className="py-3 border-b border-gray-200"
            >
              <Text className="text-red-600 text-base font-medium">Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActionModal(false)}
              className="py-3"
            >
              <Text className="text-gray-700 text-base font-medium">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default MyVehicles;
