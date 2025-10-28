import { View, Text, TouchableOpacity, TextInput, FlatList } from "react-native";
import React, { act, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from "../../src/components/PageHeader";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Link, router } from "expo-router";
import { useApi } from "../../src/hooks/useApi";
import { useAuth } from "../../src/context/UseAuth";
import Checkbox from "expo-checkbox";
import CheckBox from "../../src/components/CheckBox";
import TickCrossIndicator from '../../src/components/TickCrossIndicator';

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
  // Fetch projects
  const fetchProjects = async () => {
    setGlobalLoading(true)
    try {
      const status = activeTab.toLowerCase()
      const result = await get(`my-projects`, { useBearerAuth: true });
      console.log(result);

      if (result?.status === "success") {
        const parsedProjects = result.data.map((p) => ({
          ...p,
          inShift: p.in_shifts === "1",
          inTrips: p.in_trips === "1",
          inTimes: p.in_times === "1",
          inExpenses: p.in_expenses === "1",
        }));
        setProjects(parsedProjects);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    } finally {
      setGlobalLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [])
  );

  useEffect(() => {
    fetchProjects();
  }, [activeTab]);



  const filteredProjects = projects.filter((item) =>
    item?.project?.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const toggleProjectSelect = (id) => {
    setSelectedProjects((prevSelected) => {
      let updated;

      if (prevSelected.includes(id)) {
        updated = prevSelected.filter((pid) => pid !== id);
      } else {
        updated = [...prevSelected, id];
      }

      return updated;
    });
  };


  const handleSelectAll = () => {
    setSelectAll((prev) => {
      const newValue = !prev;
      setSelectedProjects(newValue ? projects.map((p) => p.id) : []);
      return newValue;
    });
  };

  const deleteProject = () => {
    if (selectedProjects.length === 0) {
      showModal("Please select at least one project to delete.", "error",);
      return;
    }

    showModal("You're about to permanently remove the selected projects....", "warning",
      "Deleting the projects?",
      [
        {
          label: "Delete",
          bgColor: "bg-red-600",
          onPress: async () => {
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

  const DeleteProject = async () => {
    setGlobalLoading(true);

    try {
      const payload = { project_nos: selectedProjects };
      const res = await del("my-projects/delete-projects", payload, {useBearerAuth:true});
      console.log('projects deleted : ',res);

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
    <SafeAreaView className="flex-1 bg-blue-50">
      <PageHeader routes="My Projects" />

      <View className="px-4  flex-1">
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
          <View className="flex-row items-center mb-3 bg-white rounded-lg shadow-sm p-3 px-4">
            <CheckBox
              value={selectAll}
              onClick={handleSelectAll}
            />
            <Text className="ml-2 text-lg font-medium text-gray-800">Select All</Text>
          </View>
        )}

        {/* List */}
        {filteredProjects.length > 0 ? (
          <FlatList
            data={filteredProjects}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{
              paddingBottom: selectionMode ? 60 : 0,
              elevation: 2
            }}

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
                <View className="bg-white rounded-md shadow-md mb-3 ">
                  {/* Project title with checkbox (only visible in selection mode) */}
                  <View className="flex-row items-center border-b border-yellow-400  px-2 py-3 mx-3">
                    {selectionMode && (
                      <CheckBox
                        value={selectedProjects.includes(item.id)}
                        onClick={() => toggleProjectSelect(item.id)}
                      />
                    )}
                    <Text
                      className={`${selectionMode ? "ml-2" : ""
                        } text-lg font-semibold text-gray-600`}
                    >
                      {item?.project || 'No name'}
                    </Text>
                  </View>

                  {/* Settings sections (unchanged layout) */}
                  <View className="flex-row flex-wrap my-2 px-3 pt-3 justify-between ">

                    <View className="w-[48%] flex-row items-center mb-2">
                      <TickCrossIndicator checked={item.inShift} label="In Shifts" />
                    </View>

                    <View className="w-[48%] flex-row items-center mb-2">
                      <TickCrossIndicator checked={item.inTrips} label="In Trips" />
                    </View>

                    <View className="w-[48%] flex-row items-center">
                      <TickCrossIndicator checked={item.inTimes} label="In Times" />
                    </View>

                    <View className="w-[48%] flex-row items-center">
                      <TickCrossIndicator checked={item.inExpenses} label="In Expenses" />
                    </View>

                  </View>



                  {item.suggestions && (
                    <Text className=" text-lg px-3 mb-3">
                      {item.suggestions}
                    </Text>
                  )}

                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          <View className="bg-white rounded-md shadow-md px-4 py-5">
            <Text className="text-lg">
              You have not saved any projects under the selected status.
            </Text>
            <Text className="mt-4 text-lg">
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

const StatusLabel = ({ label, active = false, dimColor = false }) => {
  return (
    <Text
      className={`ml-2 text-lg ${dimColor
        ? "text-gray-800"
        : active
          ? "text-green-600"
          : "text-red-600"
        }`}
    >
      {label}
    </Text>
  );
};
export default MyProjects;
