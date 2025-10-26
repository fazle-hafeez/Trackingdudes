import { View, Text, TouchableOpacity, TextInput, FlatList } from "react-native";
import React, { useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from "../../src/components/PageHeader";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Link, useRouter } from "expo-router";
import { useApi } from "../../src/hooks/useApi";
import { useAuth } from "../../src/context/UseAuth";
import Checkbox from "expo-checkbox";

const MyProjects = () => {
  const { get, del } = useApi();
  const { showModal, setGlobalLoading, hideModal } = useAuth();
  const tabs = ["Enabled", "Disabled"];
  const [activeTab, setActiveTab] = useState("Enabled");
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false); // when user taps a card
  const [selectedProjects, setSelectedProjects] = useState([]); // selected project IDs
  const [selectAll, setSelectAll] = useState(false);
  const [dimProjectColors, setDimProjectColors] = useState(false);
  const router = useRouter();

  // Fetch projects
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const result = await get(`my-projects/`, { useBearerAuth: true });
      if (result?.status === "success") {
        const parsedProjects = result.data.map((p) => ({
          ...p,
          inShift: p.show_in_shifts === "1",
          inTrips: p.show_in_trips === "1",
          inTimes: p.show_in_times === "1",
          inExpenses: p.show_in_expenses === "1",
        }));
        setProjects(parsedProjects);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

useFocusEffect(
  useCallback(() => {
    fetchProjects();
  }, [activeTab])
);


  const filteredProjects = projects.filter((item) =>
    item.project.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleProjectSelect = (id) => {
    setSelectedProjects((prevSelected) => {
      let updated;

      if (prevSelected.includes(id)) {
        updated = prevSelected.filter((pid) => pid !== id);
      } else {
        updated = [...prevSelected, id];
      }

      console.log('Updated Selected Projects:', updated);

      return updated;
    });
  };



  const handleSelectAll = (value) => {
    setSelectAll(value);

    setSelectedProjects((value) => {
      if (value) {
        const allIds = filteredProjects.map((p) => p.id);
        console.log("Select All IDs:", allIds);
        return allIds;
      } else {
        return [];
      }
    });
  };


  const deleteProject =  () => {
    if (selectedProjects.length === 0) {
      showModal("Please select at least one project to delete.", "error",);
      return;
    }

    showModal("You're about to permanently remove the selected projects....", "warning",
      "Deleting the projects?" ,
      [
        {
          label: "Delete",
          bgColor: "bg-red-600",
          onPress: async() => {
            hideModal()
            await DeleteProject()
          }
        },
        {
          label: "Cancel",
          bgColor: "bg-green-600",
          onPress: () => {
            hideModal();
            handleCancel()
          },
        },
      ]


    )

  };

  const DeleteProject = async() => {
    setGlobalLoading(true);

    try {
      const payload = { project_nos: selectedProjects };
      const res = await del("my-projects/delete-projects", payload, true);

      if (res?.status === "success") {
        showModal(res.data || "Projects were deleted successfully", "success");
        //  Refresh project list
        await fetchProjects();
      } else {
        showModal(res?.data || "Couldn't delete any project", "error");
      }
    } catch (err) {
      console.error(" Delete error:", err.response?.data || err.message);
      showModal("Something went wrong while deleting. Please try again.", "error");
    } finally {
      setGlobalLoading(false);
      handleCancel()
    }
  }


  const handleCancel = () => {
    setSelectionMode(false);
    setSelectedProjects([]);
    setSelectAll(false);
    setDimProjectColors(false);
    
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <PageHeader routes="My Projects" />

      <View className="px-4 bg-gray-100 flex-1">
        {/* Add project button */}
        <View className="bg-white rounded-lg shadow-md flex-row justify-between p-4 my-4">
          <View className="flex-row items-center">
            <FontAwesome6 name="file-shield" size={22} color="#198754" />
            <Link
              href="/dashboard/dashboardPage"
              className="text-lg ml-2 font-medium text-[#198754]"
            >
              Add a project
            </Link>
          </View>

          <TouchableOpacity onPress={() => router.push("/otherPages/addingProject")}>
            <Ionicons name="add-circle" size={28} color="#10b981" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View className="mb-4 flex-row justify-between bg-white p-4 items-center rounded-lg px-12">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => {
                setActiveTab(tab);
                handleCancel(); // reset on tab change
              }}
              className={`pb-1 ${activeTab === tab ? "border-b-2 border-[#007bff]" : ""}`}
            >
              <Text
                className={`text-lg ${activeTab === tab ? "text-[#007bff]" : "text-gray-600"
                  }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View className="flex-row items-center border border-gray-300 rounded-lg mb-3 bg-white px-3">
          <Feather name="search" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1  ml-2 py-3 text-lg text-[#9ca3af]"
            placeholder="Search for projects..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Select All checkbox (top) */}
        {selectionMode && filteredProjects.length > 0 && (
          <View className="flex-row items-center mb-3 bg-white rounded-lg shadow-sm p-3">
            <Checkbox
              value={selectAll}
              onValueChange={handleSelectAll}
              color={selectAll ? "#0550ff" : undefined}
            />
            <Text className="ml-2 text-lg font-medium text-gray-800">Select All</Text>
          </View>
        )}

        {/* List */}
        {loading ? (
          <View className="bg-white rounded-md shadow-md p-5 mt-3">
            <Text className="text-lg text-gray-500 text-center">Loading...</Text>
          </View>
        ) : filteredProjects.length > 0 ? (
          <FlatList
            data={filteredProjects}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (!selectionMode) {
                    setSelectionMode(true);
                    setDimProjectColors(true);
                    setSelectedProjects([]);
                  } else {
                    toggleProjectSelect(item.id);
                  }
                }}

              >
                <View className="bg-white rounded-md shadow-md mb-3">
                  {/* Project title with checkbox (only visible in selection mode) */}
                  <View className="flex-row items-center border-b border-yellow-400 py-3 px-4">
                    {selectionMode && (
                      <Checkbox
                        value={selectedProjects.includes(item.id)}
                        onValueChange={() => toggleProjectSelect(item.id)}
                        color={
                          selectedProjects.includes(item.id)
                            ? "#0550ff"
                            : undefined
                        }
                      />
                    )}
                    <Text
                      className={`${selectionMode ? "ml-2" : ""
                        } text-lg font-semibold text-gray-600`}
                    >
                      {item.project}
                    </Text>
                  </View>

                  {/* Settings sections (unchanged layout) */}
                  <View className="flex-row my-2 px-3 pt-3">
                    <View className="flex-row items-center">
                      <Checkbox
                        value={item.inShift}
                        color={
                          dimProjectColors
                            ? "#9ca3af"
                            : item.inShift
                              ? "#10b981"
                              : undefined
                        }
                      />
                      <Text className={` ml-2 ${item.inShift ? 'text-green-600':'text-red-600'}`}>In Shifts</Text>
                    </View>

                    <View className="flex-row items-center ml-12">
                      <Checkbox
                        value={item.inTrips}
                        color={
                          dimProjectColors
                            ? "#9ca3af"
                            : item.inTrips
                              ? "#10b981"
                              : undefined
                        }
                      />
                      <Text className={` ml-2 ${item.inTrips ? 'text-green-600':'text-red-600'}`}>In Trips</Text>
                    </View>
                  </View>

                  <View className="flex-row my-2 px-3 pb-3">
                    <View className="flex-row items-center">
                      <Checkbox value={item.inTimes}
                        color={
                          dimProjectColors
                            ? "#9ca3af"
                            : item.inTimes
                              ? "#10b981"
                              : undefined
                        } />
                      <Text className={` ml-2 ${item.inTimes ? 'text-green-600':'text-red-600'}`}>In Time</Text>
                    </View>

                    <View className="flex-row items-center ml-12 pl-1">
                      <Checkbox value={item.inExpenses}
                        color={
                          dimProjectColors
                            ? "#9ca3af"
                            : item.inExpenses
                              ? "#10b981"
                              : undefined
                        } />
                      <Text className={` ml-2 ${item.inExpenses ? 'text-green-600':'text-red-600'}`}>In Expenses</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          <View className="bg-white rounded-md shadow-md px-4 py-5">
            <Text className="text-lg">
              You have not saved any projects under the selected status.
            </Text>
            <Text className="mt-4 text-lg text-gray-600">
              Saving a project allows you to select it from the list of saved
              projects. This is useful in tracking shifts, trips, time, as well
              as fuel consumption or other expenses.
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Action Bar */}
      {selectionMode && (
        <View className="absolute bottom-0 left-0 right-0 bg-white shadow-lg flex-row justify-around py-3 border-t border-gray-300">
          <TouchableOpacity className="items-center">
            <Ionicons name="create-outline" size={22} color="#007bff" />
            <Text className="text-[#007bff]">Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center"
            onPress={deleteProject}>
            <Ionicons name="trash-outline" size={22} color="#dc2626" />
            <Text className="text-[#dc2626]">Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCancel} className="items-center">
            <Ionicons name="close-circle-outline" size={22} color="#6b7280" />
            <Text className="text-gray-600">Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
};

export default MyProjects;
