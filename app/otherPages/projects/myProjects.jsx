import { View, Text, TouchableOpacity, TextInput, FlatList, RefreshControl } from "react-native";
import React, { useCallback, useState, useEffect ,useContext} from "react";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6, Feather, Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";

// Hooks
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";
import { readCache, storeCache } from "../../../src/offline/cache";
import { OfflineContext } from "../../../src/offline/OfflineProvider";
// Components
import TickCrossIndicator from '../../../src/components/TickCrossIndicator';
import CheckBox from "../../../src/components/CheckBox";
import Pagination from "../../../src/components/Pagination";
import LoadingSkeleton from "../../../src/components/LoadingSkeleton";
import Tabs from "../../../src/components/Tabs";
import PageHeader from "../../../src/components/PageHeader";
import BottomActionBar from "../../../src/components/ActionBar";

const MyProjects = () => {
  const { get, del, put } = useApi();
  const { showModal, setGlobalLoading, hideModal } = useAuth();
  const { isConnected } = useContext(OfflineContext);

  const tabs = ["Enabled", "Disabled"];
  const [activeTab, setActiveTab] = useState("Enabled");
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [order, setOrder] = useState("asc");

  // Track pending offline updates (project id -> true)
  const [pendingUpdates, setPendingUpdates] = useState({});

  // -------------------- FETCH PROJECTS --------------------
  const fetchProjects = async (pageNumber = 1, currentOrder = order) => {
    try {
      setLoading(true);
      const status = activeTab.toLowerCase();
      const result = await get(
        `my-projects?status=${status}&order=${currentOrder}&limit=15&page=${pageNumber}&_t=${Date.now()}`,
        true
      );

      let projectsData = [];
      if (result?.offline) {
        projectsData = Array.isArray(result.data) ? result.data : [];
      } else if (result?.status === "success") {
        projectsData = Array.isArray(result.data) ? result.data : [];
      }

      const parsedProjects = projectsData.map((p) => ({
        ...p,
        inShift: p.in_shifts === "1",
        inTrips: p.in_trips === "1",
        inTimes: p.in_times === "1",
        inExpenses: p.in_expenses === "1",
      }));

      setProjects(parsedProjects);
      setPage(result?.pagination?.current_page || 1);
      setTotalPages(result?.pagination?.total_pages || 1);

    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // -------------------- USE FOCUS EFFECT --------------------
  useFocusEffect(
    useCallback(() => {
      const restorePending = async () => {
        const cachedPending = await readCache("pendingUpdates");
        if (cachedPending) setPendingUpdates(cachedPending);
      };
      restorePending();
      fetchProjects(1);
    }, [activeTab, order])
  );

  // -------------------- PULL TO REFRESH --------------------
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjects(1, "desc");
    setRefreshing(false);
  };

  // -------------------- FILTER PROJECTS --------------------
  const filteredProjects = projects.filter((item) =>
    item?.project?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // -------------------- SELECTION --------------------
  const toggleProjectSelect = (id) => {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectAll(prev => {
      const newValue = !prev;
      setSelectedProjects(newValue ? projects.map(p => p.id) : []);
      return newValue;
    });
  };

  const handleCancel = () => {
    setSelectionMode(false);
    setSelectedProjects([]);
    setSelectAll(false);
  };

  // -------------------- DELETE PROJECTS --------------------
  const deleteProject = async () => {
    if (selectedProjects.length === 0) {
      showModal("You must choose at least one project to carry out this action", "error");
      return;
    }

    showModal(
      "You're about to permanently remove the selected projects....",
      "warning",
      "Deleting the projects?",
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
      const payload = { project_nos: selectedProjects };
      setSelectedProjects([]);
      const res = await del("my-projects/delete-projects", payload, { useBearerAuth: true });
      if (res?.offline) {
        showModal("Cannot delete items while offline.", "error");
        return;
      }
      if (res.status === "success") {
        showModal(res.data || "Projects deleted successfully", "success");
        setTimeout(() => fetchProjects(), 1500);
      } else {
        showModal(res?.data || "Couldn't delete projects", "error");
      }
    } catch (err) {
      console.error("Delete error:", err.message || err);
      showModal("Something went wrong while deleting. Please try again.", "error");
    } finally {
      setGlobalLoading(false);
      handleCancel();
    }
  };

  // -------------------- ENABLE/DISABLE --------------------
  const toggleProjectStatus = async () => {
    if (selectedProjects.length === 0) {
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
      setGlobalLoading(true);
      const payload = { status, project_nos: selectedProjects };

      // Keep track of which projects are pending offline sync
      const pendingIds = [...selectedProjects];
      setPendingUpdates(prev => {
        const updated = { ...prev };
        pendingIds.forEach(id => updated[id] = true);
        return updated;
      });

      // Update UI immediately
      setProjects(prev =>
        prev.map(item =>
          pendingIds.includes(item.id) ? { ...item, status } : item
        )
      );

      setSelectedProjects([]);
      const res = await put("my-projects/mark-projects", payload, { useBearerAuth: true });

      if (res?.offline) {
        showModal(`The projects was ${status} successfully (offline mode)`, "success");
      } else if (res.status === "success") {
        showModal(res.data || `Projects ${status} successfully.`, "success");
        setTimeout(() => fetchProjects(), 1000);
      } else {
        showModal(res.data || "Failed to update project status.", "error");
      }

    } catch (error) {
      showModal("Something went wrong while updating. Please try again.", "error");
    } finally {
      setGlobalLoading(false);
      handleCancel();
    }
  };

  // -------------------- RENDER PROJECT CARD --------------------
  const renderProject = ({ item }) => {
    const isPending = !!item.pending || !!pendingUpdates[item.id || item.tempId];
    return (
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
            setSelectedProjects([item.id]);
          }
        }}
        delayLongPress={1000}
        className="mb-3"
      >
        <View className={`bg-white rounded-xl shadow p-4 ${isPending ? "border border-yellow-400" : ""}`}>
          {/* Header */}
          <View className="flex-row items-center border-b border-yellow-300 pb-2 mb-2">
            {selectionMode && <CheckBox value={selectedProjects.includes(item.id)} onClick={() => toggleProjectSelect(item.id)} />}
            <Text className={`text-lg font-semibold text-gray-700 ${selectionMode ? "ml-2" : ""}`}>
              {item?.project || ""}
            </Text>
          </View>

          {/* Info Boxes */}
          <View className="flex-row flex-wrap justify-between">
            <View className="w-[48%] flex-row items-center mb-2"><TickCrossIndicator checked={item.inShift} label="In Shifts" /></View>
            <View className="w-[48%] flex-row items-center mb-2"><TickCrossIndicator checked={item.inTrips} label="In Trips" /></View>
            <View className="w-[48%] flex-row items-center mb-2"><TickCrossIndicator checked={item.inTimes} label="In Times" /></View>
            <View className="w-[48%] flex-row items-center mb-2"><TickCrossIndicator checked={item.inExpenses} label="In Expenses" /></View>
          </View>

          {item.suggestions && <Text className="text-lg text-gray-600 mb-2 px-1">{item.suggestions}</Text>}
          {/* Pending Sync */}
          {isPending && (
            <Text className="text-yellow-600 my-2 text-xs font-medium">
              ⏳ Pending sync...
            </Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-50">
      <PageHeader routes="My Projects" />

      <View className="px-4 flex-1">
        {/* Add project button */}
        <View className="bg-white rounded-lg shadow-md flex-row justify-between p-4 my-4">
          <View className="flex-row items-center">
            <FontAwesome6 name="file-shield" size={22} color="#198754" />
            <Link href="/dashboard/dashboardPage" className="text-lg ml-2 font-medium text-[#198754]">Add a project</Link>
          </View>
          <TouchableOpacity onPress={() => router.push("/otherPages/projects/addingProject")}>
            <Ionicons name="add-circle" size={28} color="#10b981" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Search */}
        <View className="flex-row items-center border border-gray-300 rounded-lg mb-3 bg-white px-3 mt-4">
          <Feather name="search" size={20} color="#9ca3af" />
          <TextInput className="flex-1 ml-2 py-3 text-lg text-[#9ca3af]" placeholder="Search for projects..." placeholderTextColor="#9ca3af" value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        {/* Select All */}
        {selectionMode && filteredProjects.length > 0 && (
          <View className="flex-row items-center mb-3 bg-white rounded-lg shadow-sm p-3 px-4">
            <CheckBox value={selectAll} onClick={handleSelectAll} />
            <Text className="ml-2 text-lg font-medium text-gray-800">Select All</Text>
          </View>
        )}

        {/* List */}
        {loading ? (
          <LoadingSkeleton />
        ) : filteredProjects.length > 0 ? (
          <FlatList
            data={filteredProjects}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: selectionMode ? 60 : 0 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={renderProject}
            ListFooterComponent={
              <View className="items-center">
                {!loading && <Pagination page={page} totalPages={totalPages} onPageChange={(newPage) => fetchProjects(newPage)} />}
              </View>
            }
          />
        ) : (
          <View className="bg-white rounded-md shadow-md px-4 py-5">
            <Text className="text-lg">You have not saved any projects under the selected status.</Text>
            <Text className="mt-4 text-lg">
              Saving a project allows you to select it from the list of saved projects. This is useful in tracking shifts, trips, time, as well as fuel consumption or other expenses.
            </Text>
          </View>
        )}
      </View>

      {selectionMode && (
        <View className="absolute bottom-0 left-0 right-0">
          <BottomActionBar activeTab={activeTab} toggleStatus={toggleProjectStatus} handleCancel={handleCancel} handleDelete={deleteProject} />
        </View>
      )}
    </SafeAreaView>
  );
};

export default MyProjects;
