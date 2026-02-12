
import React, { useState, useCallback, useContext, useEffect, act } from "react";
import { View, Text, TouchableOpacity, FlatList, RefreshControl } from "react-native";
import { FontAwesome5, FontAwesome6 } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ---------Components -------------------
import ProjectCountModal from "../../../src/components/ProjectCountModal";
import PageHeader from "../../../src/components/PageHeader";
import LoadingSkeleton from "../../../src/components/LoadingSkeleton";
import Pagination from "../../../src/components/Pagination";
import BottomActionBar from "../../../src/components/ActionBar";
import Tabs from "../../../src/components/Tabs";
import CheckBox from "../../../src/components/CheckBox";
import Input from "../../../src/components/Input";
import { AddItemCard } from "../../../src/components/AddEntityCard";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";

// ----------------Hooks --------------------
import { useTheme } from "../../../src/context/ThemeProvider";
import { readCache, storeCache } from "../../../src/offline/cache";
import { OfflineContext } from "../../../src/offline/OfflineProvider";
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";
import { normalizeStatus, mergePendingAndNormalize } from "../../../src/helper";
import usePersistentValue from "../../../src/hooks/usePersistentValue";


const CACHE_KEY = "my-vehicles";

const MyVehicles = () => {
  const { get, put, del } = useApi();
  const { showModal, hideModal, setGlobalLoading } = useAuth();
  const { isConnected } = useContext(OfflineContext);
  const { darkMode } = useTheme()
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
  const [pendingUpdates, setPendingUpdates] = useState({});
  const [fetchProject, setFetchProject] = useState(false)
  const inputBgColor = darkMode ? 'bg-transparent' : 'bg-white'

  //--------------------Fetch project in every page -------

  const {
    modalVisible,
    storedValue: projectCount,
    saveValue: setProjectCount,
    setModalVisible
  } = usePersistentValue("@my-vehicles");

  useEffect(() => {
    if (projectCount) setFetchProject(true);
  }, [projectCount]);
  // ---------------- FETCH VEHICLES ----------------
    const fetchVehicles = async (pageNumber = 1, currentOrder = order, shouldUpdateCache = false) => {
      const fetchStatus = activeTab.toLowerCase();
      try {
          setLoading(true);

          const result = await get(
              `my-vehicles?status=${fetchStatus}&order=${currentOrder}&limit=${projectCount}&page=${pageNumber}&_t=${isConnected ? Date.now() : 0}`,
              { useBearerAuth: true }
          );

          let vehiclesData = Array.isArray(result?.data) ? result.data : [];
          console.log( 'apis:',result);


          if (isConnected && result?.pagination) {
              setPage(result?.pagination?.current_page || pageNumber);
              setTotalPages(result?.pagination?.total_pages || 1);
          } else {
              setPage(1);
              setTotalPages(1);
          }

          // --- LOAD CACHES ---
          const cachedPendingRaw = await readCache("pendingUpdates") || {};
          const cachedPending = mergePendingAndNormalize(cachedPendingRaw);
          const allCachedWrap = await readCache(CACHE_KEY) || { data: [] };
          const allCached = Array.isArray(allCachedWrap.data) ? allCachedWrap.data : [];
          const offlineQueue = (await readCache("offlineQueue")) || [];

          // --- OFFLINE DATA FILTERS ---

          // 1) New Vehicles added offline
          const pendingAdds = offlineQueue
              .filter(i => i.endpoint?.includes("create-vehicle") && i.method === "post")
              .map(i => ({
                  ...i.body,
                  tempId: i.body.tempId || i.body.id || `local_v_${Date.now()}`,
                  pending: true,
                  status: normalizeStatus(i.body.status) || "enabled",
              }));

          // 2) Vehicle Edits/Updates made offline
          const offlineUpdates = offlineQueue
              .filter(i => i.endpoint?.includes("update-vehicle") && i.method === "put")
              .map(i => ({
                  ...i.body,
                  id: i.body.vehicle_no || i.body.id, // Vehicle ID field ensure karein
                  pending: true
              }));

          // --- MERGING LOGIC (Using Map) ---
          const mergedMap = new Map();

          // Step 1: Online Data
          vehiclesData.forEach(v => {
              const key = String(v.id || v.tempId);
              mergedMap.set(key, { ...v, pending: false, status: normalizeStatus(v.status) || fetchStatus });
          });

          // Step 2: Merge Offline Updates (Edits)
          offlineUpdates.forEach(upd => {
              const key = String(upd.id);
              if (mergedMap.has(key)) {
                  mergedMap.set(key, { ...mergedMap.get(key), ...upd, pending: true });
              } else if (!isConnected) {
                  mergedMap.set(key, { ...upd, pending: true, status: normalizeStatus(upd.status) || fetchStatus });
              }
          });

          // Step 3: Merge New Offline Additions
          pendingAdds.forEach(p => {
              const key = String(p.tempId);
              if (!mergedMap.has(key)) {
                  mergedMap.set(key, { ...p, pending: true, status: normalizeStatus(p.status) || fetchStatus });
              }
          });

          // Step 4: Pending Status Updates (Tab Movements)
          allCached.forEach(item => {
              const id = String(item.id || item.tempId);
              const pendingStatus = cachedPending[id];
              if (id && pendingStatus) {
                  mergedMap.set(id, { ...item, status: pendingStatus, pending: true });
              }
          });

          // --- FINAL LISTING & FILTERING ---
          const finalList = Array.from(mergedMap.values())
              .map(v => ({
                  ...v,
                  // Vehicle specific flags agar hain (example: isActive, isService)
                  pending: !!v.pending,
                  status: normalizeStatus(v.status) || fetchStatus,
              }))
              .filter(v => normalizeStatus(v.status) === fetchStatus);

          setVehicles(finalList);

          if (isConnected || shouldUpdateCache) {
              await storeCache(CACHE_KEY, { data: finalList, timestamp: Date.now() });
          }

      } catch (err) {
          console.log("Error fetching vehicles, falling back to cache:", err);

          // --- OFFLINE FALLBACK ---
          const cachedWrap = await readCache(CACHE_KEY) || { data: [] };
          const cached = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];
          const offlineQueue = (await readCache("offlineQueue")) || [];

          const pendingAdds = offlineQueue
              .filter(i => i.endpoint?.includes("create-vehicle") && i.method === "post")
              .map(i => ({
                  ...i.body,
                  tempId: i.body.tempId || i.body.id || `local_v_${Date.now()}`,
                  pending: true,
              }));

          const mergedMap = new Map();
          cached.forEach(v => mergedMap.set(String(v.id || v.tempId), v));
          pendingAdds.forEach(p => mergedMap.set(String(p.tempId), p));

          const finalList = Array.from(mergedMap.values())
              .map(v => ({
                  ...v,
                  pending: !!v.pending,
                  status: normalizeStatus(v.status) || fetchStatus,
              }))
              .filter(v => normalizeStatus(v.status) === fetchStatus);

          setVehicles(finalList);
          setPage(1);
          setTotalPages(1);
      } finally {
          setLoading(false);
      }
  };


  useFocusEffect(
    useCallback(() => {
      if (!fetchProject) return;

      const checkActionsAndFetch = async () => {
        try {
          // Read action flags
          const newRecord = await readCache("newRecordAdded");
          const recordDeleted = await readCache("recordDeleted");
          const recordUpdated = await readCache("recordUpdated");

          // If any action happened, force cache update
          if (newRecord || recordDeleted || recordUpdated) {
            await fetchVehicles(1, order, true); // Force cache refresh

            // Reset flags after fetch
            if (newRecord) await storeCache("newRecordAdded", false);
            if (recordDeleted) await storeCache("recordDeleted", false);
            if (recordUpdated) await storeCache("recordUpdated", false);
          } else {
            await fetchVehicles(1); // normal fetch
          }
        } catch (err) {
          console.error("Focus fetch error:", err);
        }
      };

      checkActionsAndFetch();
    }, [activeTab, order, fetchProject, isConnected])
  );

  // ---------------- REFRESH ----------------
  const onRefresh = async () => {
    setRefreshing(true);
    setOrder("desc")
    await fetchVehicles(1, order, true);
    setRefreshing(false);
  };

  // ---------------- SELECTION ----------------
  const handleSelectAll = () => {
    setSelectAll(prev => {
      const newValue = !prev;
      setSelectedVehicles(newValue ? filteredVehicles.map(v => v.id).filter(Boolean) : []);
      return newValue;
    });
  };

  const toggleVehicleSelect = (id) => {
    setSelectedVehicles((prev) => {
      const updated = prev.includes(id) ? prev.filter(vid => vid !== id) : [...prev, id]
      const allIds = vehicles.filter((item) => item.vehicle.toLowerCase().includes(searchQuery.toLowerCase()))
      setSelectAll(updated.length === allIds.length)
      return updated

    })
  };

  const handleCancel = () => {
    setSelectionMode(false);
    setSelectedVehicles([]);
    setSelectAll(false);
  };

  // ---------------- ENABLE / DISABLE ----------------
  const toggleVehicleStatus = async () => {
    if (selectedVehicles.length <= 0) {
      showModal("You must choose at least one vehicle.", "error");
      return;
    }

    const validSelection = selectedVehicles.filter(id => id);
    if (validSelection.length === 0) {
      showModal("Selected item is pending sync and cannot be updated yet.", "error");
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
            await changeVehicleStatus(newStatus, validSelection);
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

  const changeVehicleStatus = async (status, selectedIds) => {
    try {
      setGlobalLoading(true);
      const payload = { status, vehicle_nos: selectedIds };
      const newStatusLower = String(status).toLowerCase();
      const result = await put("my-vehicles/mark-vehicles", payload, { useBearerAuth: true });

      if (result?.offline) {
        const updatedPendingRaw = await readCache("pendingUpdates") || {};
        const updatedPending = mergePendingAndNormalize(updatedPendingRaw);

        selectedIds.forEach(id => { updatedPending[id] = newStatusLower; });
        setPendingUpdates(updatedPending);
        await storeCache("pendingUpdates", updatedPending);

        // Update UI: remove items from current tab view
        setVehicles(prev => prev.filter(item => !selectedIds.includes(item.id)));

        // Update m
        // ain cache so other tab can pick it up
        const cachedWrap = await readCache(CACHE_KEY) || { data: [] };
        let cachedList = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];
        cachedList = cachedList.map(item => selectedIds.includes(item.id) ? { ...item, status: newStatusLower, pending: true } : item);
        await storeCache(CACHE_KEY, { data: cachedList, timestamp: Date.now() });
        await storeCache("recordUpdated", true);

        showModal(`Vehicles status updated to ${status} (offline). They will sync when online.`, "success");
        handleCancel();
        return;
      }

      if (result.status === "success") {
        const updatedPendingRaw = await readCache("pendingUpdates") || {};
        const updatedPending = mergePendingAndNormalize(updatedPendingRaw);
        selectedIds.forEach(id => delete updatedPending[id]);
        await storeCache("pendingUpdates", updatedPending);
        setPendingUpdates(updatedPending);

        setVehicles(prev => prev.filter(item => !selectedIds.includes(item.id)));

        const cachedWrap = await readCache(CACHE_KEY) || { data: [] };
        let cachedList = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];
        cachedList = cachedList.map(item => selectedIds.includes(item.id) ? { ...item, status: newStatusLower, pending: false } : item);
        await storeCache(CACHE_KEY, { data: cachedList, timestamp: Date.now() });

        showModal(result.data || `Vehicles ${status} successfully.`, "success");
        handleCancel();
      } else {
        showModal("Failed to update vehicle status.", "error");
      }

    } catch (err) {
      showModal("Something went wrong. Please try again.", "error");
    } finally {
      setGlobalLoading(false);
    }
  };


  // ---------------- DELETE VEHICLES ----------------
  const deleteVehicles = async () => {
    if (selectedVehicles.length === 0) {
      showModal("Please select at least one vehicle to delete.", "error");
      return;
    }

    const validSelection = selectedVehicles.filter(id => id);
    if (validSelection.length === 0) {
      showModal("Selected item is pending sync and cannot be deleted yet.", "error");
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
            await confirmDelete(validSelection);
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

  const confirmDelete = async (selectedIds) => {
    try {
      setGlobalLoading(true);
      const payload = { vehicle_nos: selectedIds };
      const res = await del("my-vehicles/delete-vehicles", payload, { useBearerAuth: true });

      if (res?.offline) {
        showModal("Cannot delete in offline mode", "error");
        return;
      }

      if (res.status === "success") {
        setVehicles(prev => prev.filter(v => !selectedIds.includes(v.id)));
        const cachedWrap = await readCache(CACHE_KEY) || { data: [] };
        const cachedList = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];
        const updatedCache = cachedList.filter(v => !selectedIds.includes(v.id));
        await storeCache(CACHE_KEY, { data: updatedCache, timestamp: Date.now() });
        await storeCache("recordDeleted", true);
        showModal(res.data || "Vehicles deleted successfully.", "success");
        handleCancel();
      } else {
        showModal(res?.data || "Couldn't delete vehicles.", "error");
      }

    } catch (err) {
      console.error("Delete error:", err);
      showModal("Something went wrong while deleting.", "error");
    } finally {
      setGlobalLoading(false);
    }
  };

  // ---------------- HELPERS ----------------
  const removeDecimal = val => val ? parseFloat(val) : null;

  const convertToFullName = item => {
    const map = { gs: "gas", ds: "diesel", flx: "flex", oth: "other", gal: "gals", ltr: "ltrs", unit: "other" };
    return map[item] || null;
  };

  const filteredVehicles = vehicles.filter((item) =>
    item?.vehicle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderVehicle = ({ item }) => {
    const key = item.id || item.tempId;
    const isPending = !!item.pending || (item.id && !!pendingUpdates[item.id]) || (!!pendingUpdates[item.tempId]);
    const isSelected = selectedVehicles.includes(item.id)

    return (
      <TouchableOpacity
        onLongPress={() => {
          if (key) {
            if (!selectionMode) {
              setSelectionMode(true);
              if (item.id) setSelectedVehicles([item.id]);
            } else {
              if (item.id) toggleVehicleSelect(item.id);
            }
          }
        }}
        onPress={() => {
          router.push({
            pathname: "/otherPages/vehicles/addVehicles", params: {
              id: item.id, tempId: item.tempId, activeTab, order, fetchProject
            }
          });
        }}
        activeOpacity={0.8}
        delayLongPress={500}
        className="mb-3"
      >
        <View
          className={`p-4  rounded-lg mb-2 border shadow ${isSelected ? darkMode ? 'border-blue-500 ' : "border-blue-500 bg-blue-50" : item.pending ? "border-yellow-300 " : darkMode ? "border-gray-700" : "bg-white border-gray-100"}`}>
          <View className={`${darkMode ? item.pending ? 'border-yellow-200' : 'border-gray-700' : item.pending ? 'border-yellow-200' : 'border-yellow-300'} 
             flex-row items-center border-b  pb-2 mb-2`}>
            <View className="flex-row items-center">
              {selectionMode && (
                <CheckBox value={item.id ? selectedVehicles.includes(item.id) : false} onClick={() => item.id && toggleVehicleSelect(item.id)} />
              )}
              <ThemedText className="ml-2">
                <FontAwesome5 name="car" size={20} className="ml-2" />
              </ThemedText>
              <ThemedText color="#374151" className="text-lg font-semibold  ml-2">{item.vehicle}</ThemedText>
            </View>
          </View>

          <View className="flex-row justify-between items-center my-3">
            <View className="items-center flex-1">
              <FontAwesome5 name="leaf" size={20} color="#10b981" />
              <ThemedText color="#6b7280" className="text-xs  mt-1">Fuel economy</ThemedText>
              <ThemedText color="#374151" className="text-base font-medium ">
                {removeDecimal(item.distance_per_unit_fuel)} {item.distance_unit} / {item.fuel_unit}
              </ThemedText>
            </View>

            <View className="items-center flex-1">
              <FontAwesome6 name="ankh" size={20} color="#3b82f6" />
              <ThemedText color="#6b7280" className="text-xs  mt-1">Tank capacity</ThemedText>
              <ThemedText color="#374151" className="text-base font-medium">
                {removeDecimal(item.tank_capacity)} {convertToFullName(item.fuel_unit)}
              </ThemedText>
            </View>

            <View className="items-center flex-1">
              <ThemedText darkColor={'#6b7280'} color={'#00000'}>
                <FontAwesome6 name="gas-pump" size={20} />
              </ThemedText>
              <ThemedText color="#6b7280" className="text-xs  mt-1">Fuel type</ThemedText>
              <ThemedText color={'#374151'} className="text-base font-medium ">
                {convertToFullName(item.fuel_type)}
              </ThemedText>
            </View>
          </View>

          {item.pending && (
            <Text className="text-yellow-600 my-2 text-xs font-medium">
              ⏳ Sync pending...
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreacontext bgColor="#eff6ff" className="flex-1 ">
      <PageHeader routes="My Vehicles" />

      <View className="px-3 flex-1">

        <AddItemCard
          className="my-4"
          title="Add another vehicle"
          onchange={() => router.push("otherPages/vehicles/addVehicles")}
          icon={<FontAwesome5 name="car" size={20} color="#10b981" />}
        />

        <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

        <Input
          className={`${inputBgColor} my-4 `}
          placeholder="Search  vehicles..."
          icon={true}
          borderColors={"#ddd"}
          value={searchQuery}
          onchange={setSearchQuery}
        />

        {selectionMode && filteredVehicles.length > 0 && (
          <ThemedView className="flex-row items-center mb-3  rounded-lg shadow-sm p-3 px-4">
            <CheckBox value={selectAll} onClick={handleSelectAll} />
            <ThemedText color="#1f2937" className="ml-2 text-lg font-medium ">Select All ({selectedVehicles.length})</ThemedText>
          </ThemedView>
        )}

        {loading ? (
          <LoadingSkeleton height={98} spacing={15} />
        ) : filteredVehicles.length > 0 ? (
          <FlatList
            data={filteredVehicles}
            renderItem={renderVehicle}
            keyExtractor={(item) => (item.id || item.tempId)?.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{
              paddingBottom: selectionMode ? 90 : 10
            }}
            ListFooterComponent={
              isConnected && totalPages > 1 ? (
                <View className="items-center mb-2">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={(newPage) => fetchVehicles(newPage)}
                  />
                </View>
              ) : null
            }
          />

        ) : (
          <ThemedView className=" rounded-md shadow-md p-4">
            <Ionicons name="receipt-outline" size={60} color="#9ca3af" className="mx-auto my-4" />
            <ThemedText color="#374151" className="text-lg ">
              You have not saved any vehicles yet. Saving a vehicle allows you to select it from the list of saved vehicles, enabling you to track trips as well as fuel consumption
            </ThemedText>
          </ThemedView>
        )}
      </View>

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

      <ProjectCountModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={(val) => {
          setProjectCount(val);
          setFetchProject(true)
          setModalVisible(false)
        }}
      />
    </SafeAreacontext>
  );
};

export default MyVehicles;
