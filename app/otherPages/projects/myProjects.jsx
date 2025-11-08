import { View, Text, TouchableOpacity, TextInput, FlatList, RefreshControl } from "react-native";
import React, { act, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6, AntDesign, Feather, Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";

//Hooks
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";

//components 
import TickCrossIndicator from '../../../src/components/TickCrossIndicator';
import CheckBox from "../../../src/components/CheckBox";
import Pagination from "../../../src/components/Pagination";
import LoadingSkeleton from "../../../src/components/LoadingSkeleton"
import Tabs from "../../../src/components/Tabs";
import PageHeader from "../../../src/components/PageHeader";
import BottomActionBar from "../../../src/components/ActionBar";

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
  const [refreshing, setRefreshing] = useState(false);
  const [order, setOrder] = useState("asc");

  //fetching the projects 
  const fetchProjects = async (pageNumber = 1, currentOrder = order) => {
    try {
      setLoading(true);
      const status = activeTab.toLowerCase();
      const result = await get(
        `my-projects?status=${status}&order=${currentOrder}&limit=15&page=${pageNumber}&_t=${Date.now()}`,
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
  }

  useFocusEffect(
    useCallback(() => {
      fetchProjects(1);
    }, [activeTab, order])
  );

  //when user pull down then call this one function
  const onRefresh = async () => {
    setRefreshing(true);
    setOrder("desc");
    await fetchProjects(1, "desc");
    setRefreshing(false);
  };

  //filter project name
  const filteredProjects = projects.filter((item) =>
    item?.project?.toLowerCase().includes(searchQuery.toLowerCase())
  );


  //toggle the project id's 
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

  // handelselect 
  const handleSelectAll = () => {
    setSelectAll((prev) => {
      const newValue = !prev;
      setSelectedProjects(newValue ? projects.map((p) => p.id) : []);
      return newValue;
    });
  };

  //delete the selected projects
  const deleteProject = async () => {
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


  //confirm delete
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

  //enabled and disbled the projects 
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

  //confirm enabled or disbled
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
      showModal("Something went wrong while updating. Please try again.", "error");
    } finally {
      setGlobalLoading(false)
      handleCancel();
    }
  };


  //handelcancel
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

          <TouchableOpacity onPress={() => router.push("/otherPages/projects/addingProject")}>
            <Ionicons name="add-circle" size={28} color="#10b981" />
          </TouchableOpacity>
        </View>

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
          <LoadingSkeleton />
        ) : filteredProjects.length > 0 ? (
          <FlatList
            data={filteredProjects}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: selectionMode ? 60 : 0, elevation: 2, }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  if (!selectionMode) {
                    router.push({
                      pathname: "/otherPages/projects/addingProject",
                      params: { id: item.id },
                    });
                  } else {
                    toggleProjectSelect(item.id);
                  }
                }}
                onLongPress={() => {
                  if (!selectionMode) {
                    setSelectionMode(true);
                    setSelectedProjects([]);
                  } else {
                    setSelectedProjects([item.id]);
                  }
                }}
                delayLongPress={1000} //  Long press after 1 sec
                className="mb-3"
              >
                <View className="bg-white rounded-xl shadow p-4">
                  {/* Header */}
                  <View className="flex-row items-center border-b border-yellow-300 pb-2 mb-2">
                    {selectionMode && (
                      <CheckBox
                        value={selectedProjects.includes(item.id)}
                        onClick={() => toggleProjectSelect(item.id)}
                      />
                    )}
                    <Text
                      className={`text-lg font-semibold text-gray-700 ${selectionMode ? "ml-2" : ""
                        }`}
                    >
                      {item?.project || ""}
                    </Text>
                  </View>

                  {/* Info Boxes */}
                  <View className="flex-row flex-wrap justify-between">
                    <View className="w-[48%] flex-row items-center mb-2">
                      <TickCrossIndicator checked={item.inShift} label="In Shifts" />
                    </View>
                    <View className="w-[48%] flex-row items-center mb-2">
                      <TickCrossIndicator checked={item.inTrips} label="In Trips" />
                    </View>
                    <View className="w-[48%] flex-row items-center mb-2">
                      <TickCrossIndicator checked={item.inTimes} label="In Times" />
                    </View>
                    <View className="w-[48%] flex-row items-center mb-2">
                      <TickCrossIndicator checked={item.inExpenses} label="In Expenses" />
                    </View>
                  </View>

                  {/* Suggestion Text */}
                  {item.suggestions && (
                    <Text className="text-lg text-gray-600 mb-2 px-1">
                      {item.suggestions}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListFooterComponent={
              <View className="items-center ">
                {/* Pagination */}
                {!loading && (
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={(newPage) => fetchProjects(newPage)}
                  />
                )}
              </View>
            }
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
        <View className="absolute bottom-0 left-0 right-0 ">
          <BottomActionBar
            activeTab={activeTab}
            toggleStatus={toggleProjectStatus}
            handleCancel={handleCancel}
            handleDelete={deleteProject}
          />
        </View>
      )}

    </SafeAreaView>
  );
};


export default MyProjects;
