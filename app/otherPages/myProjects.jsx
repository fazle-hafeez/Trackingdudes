import { View, Text, TouchableOpacity, TextInput, FlatList } from "react-native";
import React, { act, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from "../../src/components/PageHeader";
import { FontAwesome6, AntDesign, Feather, Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useApi } from "../../src/hooks/useApi";
import { useAuth } from "../../src/context/UseAuth";
import CheckBox from "../../src/components/CheckBox";
import TickCrossIndicator from '../../src/components/TickCrossIndicator';
import Pagination from "../../src/components/Pagination";
const MyProjects = () => {
  const { get, del, put } = useApi();
  const { showModal, setGlobalLoading, hideModal } = useAuth();
  const tabs = ["Enabled", "Disabled"];
  const [activeTab, setActiveTab] = useState("Enabled");
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false); // when user taps a card
  const [selectedProjects, setSelectedProjects] = useState([]); // selected project IDs
  const [selectAll, setSelectAll] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const fetchProjects = async (pageNumber = 1) => {
    try {
      setLoading(true);
      const status = activeTab.toLowerCase();
      const result = await get(
        `my-projects?status=${status}&order=asc&limit=2&page=${pageNumber}&_t=${Date.now()}`,
        { useBearerAuth: true }
      );

      if (result?.status === "success") {
        const parsedProjects = result.data.map((p) => ({
          ...p,
          inShift: p.in_shifts === "1",
          inTrips: p.in_trips === "1",
          inTimes: p.in_times === "1",
          inExpenses: p.in_expenses === "1",
        }));

        setProjects(parsedProjects);
        setPage(result.pagination?.current_page || 1);
        setTotalPages(result.pagination?.total_pages || 1);
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

  useEffect(() => {
    fetchProjects(1);
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
      showModal("You must choose at least one project to carry out this action", "error",);
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
    try {
      setGlobalLoading(true)
      const payload = { project_nos: selectedProjects };
      setSelectedProjects([])
      const res = await del("my-projects/delete-projects", payload, { useBearerAuth: true });
      if (res.status === "success") {
        setProjects([])
        showModal(res.data || "Projects were deleted successfully", "success");
        setTimeout(async () => {
          await fetchProjects();
        }, 2500);
      } else {
        showModal(res?.data || "Couldn't delete any project", "error");
      }
    } catch (err) {
      console.error(" Delete error:", err.response?.data || err.message);
      showModal("Something went wrong while deleting. Please try again.", "error");
    } finally {
      setGlobalLoading(false)
      handleCancel()
    }
  }

  const toggleProjectStatus = async () => {
    if (selectedProjects.length <= 0) {
      showModal("You must choose at least one project to carry out this action", "error");
      return;
    }
    const isCurrentlyEnabled = activeTab.toLowerCase() === "enabled";
    const newStatus = isCurrentlyEnabled ? "disabled" : "enabled";
    const actionWord = isCurrentlyEnabled ? "Disable" : "Enable";

    showModal(
      `You're about to ${actionWord.toLowerCase()} the selected project(s). Do you want to continue?`,
      "warning",
      `${actionWord} the projects?`,
      [
        {
          label: `Yes, ${actionWord}`,
          bgColor: "bg-red-600",
          onPress: async () => {
            hideModal();
            await changeProjectStatus(newStatus);
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

  const changeProjectStatus = async (status) => {
    try {
      setGlobalLoading(true)
      const payload = {
        status,
        project_nos: selectedProjects,
      }
      setSelectedProjects([])
      const result = await put("my-projects/mark-projects", payload, { useBearerAuth: true });
      if (result.status === "success") {
        setProjects([])
        showModal(result.data || `Projects ${status} successfully.`, "success");
        setTimeout(async () => {
          await fetchProjects();
        }, 2500);
      } else {

        showModal(result.data || "Failed to update project status.", "error");
      }
    } catch (error) {
      console.log(error);
      showModal("Something went wrong while updating. Please try again.", "error");
    } finally {
      setGlobalLoading(false)
      handleCancel();
    }
  };

  const editProjects = () => {
    if (selectedProjects.length !== 1) {
      showModal("Please select exactly one project to edit.", "error");
      return;
    }

    const projectId = selectedProjects[0];
    router.push({
      pathname: "/otherPages/editProject",
      params: { id: projectId },
    });
    handleCancel();
  };

  const handleCancel = () => {
    setSelectionMode(false);
    setSelectedProjects([]);
    setSelectAll(false);

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
        {loading ? (
          // Loading Card
          <View className="bg-white rounded-md shadow-md px-4 py-6 items-center justify-center mt-3">
            <Text className="text-lg font-medium text-gray-600">Loading your projects...</Text>
            <Text className="text-base text-gray-500 mt-2">Please wait a moment</Text>
          </View>
        ) : filteredProjects.length > 0 ? (
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
                    setSelectedProjects([]);
                  } else {
                    toggleProjectSelect(item.id);
                  }
                }}
              >
                <View className="bg-white rounded-md shadow-md mb-3 ">
                  <View className="flex-row items-center border-b border-yellow-400 px-2 py-3 mx-3">
                    {selectionMode && (
                      <CheckBox
                        value={selectedProjects.includes(item.id)}
                        onClick={() => toggleProjectSelect(item.id)}
                      />
                    )}
                    <Text
                      className={`${selectionMode ? "ml-2" : ""} text-lg font-semibold text-gray-600`}
                    >
                      {item?.project || 'No name'}
                    </Text>
                  </View>

                  <View className="flex-row flex-wrap my-2 px-3 pt-3 justify-between">
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
                    <Text className="text-lg px-3 mb-3">{item.suggestions}</Text>
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


        {/* Pagination Controls */}
        {!loading && (
          <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={(newPage) => {
            fetchProjects(newPage);
          }}
        />
        )}

      </View>

      {/* Bottom Action Bar */}
      {selectionMode && (
        <View className="absolute bottom-0 left-0 right-0 bg-white shadow-lg flex-row justify-around py-3 border-t border-gray-300">

          <TouchableOpacity
            onPress={editProjects}
            className="items-center">
            <Ionicons name="create-outline" size={24} color="#16a34a" />
            <Text className="text-[#16a34a]">Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center"
            onPress={toggleProjectStatus}
          >
            <AntDesign
              name={activeTab === "Enabled" ? "eye-invisible" : "eye"}
              size={24}
              color="#6b7280"
            />
            <Text className="text-[#6b7280]">
              {activeTab === "Enabled" ? "Disable" : "Enable"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center"
            onPress={deleteProject}>
            <Ionicons
              name="trash-outline" size={22} color="#dc2626" />
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
