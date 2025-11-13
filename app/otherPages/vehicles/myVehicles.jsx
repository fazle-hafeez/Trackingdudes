import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, StatusBar, TextInput,RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome5, Ionicons, FontAwesome6, Feather, AntDesign } from "@expo/vector-icons";
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";
import { useFocusEffect } from "@react-navigation/native";
import PageHeader from "../../../src/components/PageHeader";
import LoadingSkeleton from "../../../src/components/LoadingSkeleton";
import Pagination from "../../../src/components/Pagination";
import CheckBox from "../../../src/components/CheckBox";
import { router } from "expo-router";
import Tabs from "../../../src/components/Tabs";
import BottomActionBar from "../../../src/components/ActionBar";
const MyVehicles = () => {
  const { get, put, del } = useApi();
  const { showModal, hideModal, setGlobalLoading } = useAuth();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Enabled");
  const tabs = ["Enabled", "Disabled"];
  const [order, setOrder] = useState("asc");
  const [refreshing, setRefreshing] = useState(false);

  //  Fetch vehicles list
  const fetchVehicles = async (pageNumber = 1, currentOrder = order) => {
    try {
      setLoading(true);
      const status = activeTab.toLowerCase();
      const result = await get(
        `my-vehicles?status=${status}&order=${currentOrder}&limit=15&page=${pageNumber}&_t=${Date.now()}`,
        { useBearerAuth: true }
      );
      console.log(result)
      if (result?.status === "success") {
        setVehicles(result.data || []);
        setPage(result.pagination?.current_page || 1);
        setTotalPages(result.pagination?.total_pages || 1);
      } else {
        setVehicles([]);
      }
    } catch (err) {
      console.log("Error fetching vehicles:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVehicles(1);
    }, [activeTab, order])
  );

  //when user pull down then call this one function
  const onRefresh = async () => {
    setRefreshing(true);
    setOrder("desc");
    await fetchVehicles(1, "desc");
    setRefreshing(false);
  };

  //  Filter vehicles by search text
  const filteredVehicles = vehicles.filter((item) =>
    item?.vehicle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  //  Select / Deselect all
  const handleSelectAll = () => {
    setSelectAll((prev) => {
      const newValue = !prev;
      setSelectedVehicles(newValue ? vehicles.map((v) => v.id) : []);
      return newValue;
    });
  };

  //  Toggle single selection
  const toggleVehicleSelect = (id) => {
    setSelectedVehicles((prev) =>
      prev.includes(id)
        ? prev.filter((vid) => vid !== id)
        : [...prev, id]
    );
  };

  //  Cancel selection mode
  const handleCancel = () => {
    setSelectionMode(false);
    setSelectedVehicles([]);
    setSelectAll(false);
  };

  //  Toggle enable/disable
  const toggleVehicleStatus = async () => {
    if (selectedVehicles.length <= 0) {
      showModal("You must choose at least one vehicle.", "error");
      return;
    }

    const isEnabled = activeTab.toLowerCase() === "enabled";
    const newStatus = isEnabled ? "disabled" : "enabled";
    const actionWord = isEnabled ? "Disable" : "Enable";

    showModal(
      `You're about to ${actionWord.toLowerCase()} the selected vehicles. Do you want to continue?`,
      "warning",
      `${actionWord} Vehicles`,
      [
        {
          label: `Yes, ${actionWord}`,
          bgColor: "bg-red-600",
          onPress: async () => {
            hideModal();
            await changeVehicleStatus(newStatus);
          },
        },
        {
          label: "Back",
          bgColor: "bg-green-600",
          onPress: () => {
            hideModal();
            handleCancel();
          },
        },
      ]
    );
  };

  //  Change vehicle status (enable/disable)
  const changeVehicleStatus = async (status) => {
    try {
      setGlobalLoading(true);
      const payload = {
        status,
        vehicle_nos: selectedVehicles,
      };
      setSelectedVehicles([]);

      const result = await put("my-vehicles/mark-vehicles", payload, {
        useBearerAuth: true,
      });

      if (result.status === "success") {
        showModal(result.data || `Vehicles ${status} successfully.`, "success");
        setTimeout(() => fetchVehicles(), 2000);
      } else {
        showModal("Failed to update vehicle status.", "error");
      }
    } catch (error) {
      showModal("Something went wrong. Please try again.", "error");
    } finally {
      setGlobalLoading(false);
      handleCancel();
    }
  };

  //  Delete selected vehicles
  const deleteVehicles = async () => {
    if (selectedVehicles.length === 0) {
      showModal("Please select at least one vehicle to delete.", "error");
      return;
    }

    showModal(
      "You're about to permanently remove the selected vehicles...",
      "warning",
      "Deleting Vehicles?",
      [
        {
          label: "Delete",
          bgColor: "bg-red-600",
          onPress: async () => {
            hideModal();
            await confirmDelete();
          },
        },
        {
          label: "Cancel",
          bgColor: "bg-green-600",
          onPress: () => {
            hideModal();
            handleCancel();
          },
        },
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      setGlobalLoading(true);
      const payload = { vehicle_nos: selectedVehicles };
      const res = await del("my-vehicles/delete-vehicles", payload, {
        useBearerAuth: true,
      });

      if (res.status === "success") {
        showModal(res.data || "Vehicles deleted successfully.", "success");
        setTimeout(() => fetchVehicles(), 2000);
      } else {
        showModal(res?.data || "Couldn't delete vehicles.", "error");
      }
    } catch (err) {
      console.error("Delete error:", err);
      showModal("Something went wrong while deleting.", "error");
    } finally {
      setGlobalLoading(false);
      handleCancel();
    }
  };

  const removeDecimal = (val) => {
    return val ? parseFloat(val) : null
  }

  //convert to full name 

  const convertToFullName = (item) => {
    const map = {
      gs: "gas",
      ds: "diesel",
      flx: "flex",
      oth: "other fuel type",
    };
    return map[item] || null;
  };

  //  Vehicle item render
  const renderVehicle = ({ item }) => (
    <TouchableOpacity
      onLongPress={() => {
        if (!selectionMode) {
          setSelectionMode(true);
          setSelectedVehicles([]);
        } else {
          setSelectedVehicles([item.id]);
        }
      }}
      onPress={() => {
        router.push({
          pathname: "/otherPages/vehicles/addVehicles",
          params: { id: item.id }
        })
      }}
      activeOpacity={0.8}
      delayLongPress={1000}
      className="mb-3"
    >
      <View className="bg-white rounded-md shadow-sm p-4">
        {/*  Title row */}
        <View className="flex-row items-center border-b border-yellow-300 pb-2 mb-2">
          <View className="flex-row items-center">
            {selectionMode && (
              <CheckBox
                value={selectedVehicles.includes(item.id)}
                onClick={() => toggleVehicleSelect(item.id)}
              />
            )}
            <FontAwesome5 name="car" size={20} color="black" className="ml-2" />
            <Text className="text-lg font-semibold text-gray-700 ml-2">
              {item.vehicle}
            </Text>
          </View>
        </View>

        {/*  Vehicle Stats */}
        <View className="flex-row justify-between items-center my-3">
          <View className="items-center flex-1">
            <FontAwesome5 name="leaf" size={20} color="#10b981" />
            <Text className="text-xs text-gray-500 mt-1">Fuel economy</Text>
            <Text className="text-base font-medium text-gray-700">
              {removeDecimal(item.distance_per_unit_fuel)} /ltr
            </Text>
          </View>

          <View className="items-center flex-1">
            <FontAwesome6 name="ankh" size={20} color="#3b82f6" />
            <Text className="text-xs text-gray-500 mt-1">Tank capacity</Text>
            <Text className="text-base font-medium text-gray-700">
              {removeDecimal(item.tank_capacity)}
            </Text>
          </View>

          <View className="items-center flex-1">
            <FontAwesome6 name="gas-pump" size={20} color="black" />
            <Text className="text-xs text-gray-500 mt-1">Fuel type</Text>
            <Text className="text-base font-medium text-gray-700">
              {convertToFullName(item.fuel_type)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-blue-50">
      <StatusBar barStyle="light-content" backgroundColor="#0000ff" />
      <PageHeader routes="My Vehicles" />

      {/*  Add Vehicle */}
      <View className="bg-white rounded-md shadow-md flex-row justify-between items-center p-4 m-4">
        <View className="flex-row items-center">
          <FontAwesome5 name="car" size={20} color="#198754" />
          <Text className="ml-2 text-lg font-medium text-[#198754]">Add another vehicle</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("otherPages/vehicles/addVehicles")}
        >
          <Ionicons name="add-circle" size={26} color="#198754" />
        </TouchableOpacity>
      </View>

      {/*  Vehicle List */}
      <View className="px-4 flex-1">

        {/* Tabs */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Search */}
        <View className="flex-row items-center border border-gray-300 rounded-lg mb-3 bg-white px-3 mt-4">
          <Feather name="search" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 py-3 text-lg text-[#9ca3af]"
            placeholder="Search vehicles..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Select All (when active) */}
        {selectionMode && filteredVehicles.length > 0 && (
          <View className="flex-row items-center mb-3 bg-white rounded-lg shadow-sm p-3 px-4">
            <CheckBox value={selectAll} onClick={handleSelectAll} />
            <Text className="ml-2 text-lg font-medium text-gray-800">
              Select All
            </Text>
          </View>
        )}

        {/* Main List */}
        {loading ? (
          <LoadingSkeleton />
        ) : filteredVehicles.length > 0 ? (
          <FlatList
            data={filteredVehicles}
            renderItem={renderVehicle}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListFooterComponent={
              <View className="items-center">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={(newPage) => fetchVehicles(newPage)}
                />
              </View>
            }
          />
        ) : (
          <View className="bg-white rounded-md shadow-md p-4">
            <Text className="text-lg text-gray-700">
              You have not saved any vehicles yet. Saving a vehicle allows you
              to select it from the list of saved vehicles, enabling you to
              track trips and fuel consumption.
            </Text>
          </View>
        )}
      </View>

      {/*  Bottom Action Bar */}
      {selectionMode && (
        <View className="absolute bottom-0 left-0 right-0 ">
          <BottomActionBar
            activeTab={activeTab}
            toggleStatus={toggleVehicleStatus}
            handleCancel={handleCancel}
            handleDelete={deleteVehicles}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

export default MyVehicles;
