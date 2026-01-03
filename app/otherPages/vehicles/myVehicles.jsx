
import React, { useState, useCallback, useContext, useEffect } from "react";
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

      // Vehicles array
      let vehiclesData = Array.isArray(result?.data) ? result.data : [];

      // Set pagination
      if (isConnected) {
        setPage(result?.pagination?.current_page || pageNumber);
        setTotalPages(result?.pagination?.total_pages || 1);
      } else {
        setPage(1);
        setTotalPages(1);
      }

      // Load caches
      const cachedPendingRaw = await readCache("pendingUpdates") || {};
      const cachedPending = mergePendingAndNormalize(cachedPendingRaw);
      const allCachedWrap = await readCache(CACHE_KEY) || { data: [] };
      const allCached = Array.isArray(allCachedWrap.data) ? allCachedWrap.data : [];

      // 1) Merge pending offline posts (new records added offline)
      const offlineQueue = (await readCache("offlineQueue")) || [];
      const pendingItems = offlineQueue
        .filter(i => i.endpoint?.includes("create-vehicle") && i.method === "post")
        .map(i => ({
          ...i.body,
          tempId: i.body.tempId || i.body.id || Date.now(),
          pending: true,
          status: normalizeStatus(i.body.status) || "enabled",
        }));

      pendingItems.forEach(p => {
        const exists = vehiclesData.find(v => (v.id && p.id && v.id === p.id) || (v.tempId && p.tempId && v.tempId === p.tempId));
        if (!exists && p.status === fetchStatus) vehiclesData.push(p);
      });

      // 2) Add items moved to this tab due to pending status change
      const movedPendingItems = allCached
        .filter(item => {
          const id = item.id;
          const pendingStatus = cachedPending[id] || cachedPending[item.tempId];
          return (id || item.tempId) && pendingStatus && pendingStatus === fetchStatus;
        })
        .map(item => ({ ...item, status: cachedPending[item.id] || cachedPending[item.tempId], pending: true }));

      movedPendingItems.forEach(pItem => {
        const exists = vehiclesData.find(v => (v.id && pItem.id && v.id === pItem.id) || (v.tempId && pItem.tempId && v.tempId === pItem.tempId));
        if (!exists) vehiclesData.push(pItem);
      });

      // 3) Apply pending status to all records in the current list
      vehiclesData = vehiclesData.map(v => {
        const id = v.id || v.tempId;
        const pendingStatus = cachedPending[id] || cachedPending[v.id] || cachedPending[v.tempId];
        if (pendingStatus) return { ...v, status: pendingStatus, pending: true };
        return { ...v, status: (v.status ? String(v.status).toLowerCase() : fetchStatus) };
      });

      // 4) Final filter to ensure displayed items match current tab
      vehiclesData = vehiclesData.filter(v => String(v.status || "").toLowerCase() === fetchStatus);

      setVehicles(vehiclesData);

      // Update cache
      if (vehiclesData.length > 0 && (isConnected || shouldUpdateCache)) {
        await storeCache(CACHE_KEY, { data: vehiclesData, timestamp: Date.now() });
      }

    } catch (err) {
      console.log("API error:", err);

      // Fallback: show cache (with pending applied)
      const cachedWrap = await readCache(CACHE_KEY) || { data: [] };
      const cached = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];
      const cachedPendingRaw = await readCache("pendingUpdates") || {};
      const cachedPending = mergePendingAndNormalize(cachedPendingRaw);

      if (cached.length > 0) {
        let safeCachedData = cached.map(item => {
          const id = item.id || item.tempId;
          const pendingStatus = cachedPending[id];
          return {
            ...item,
            status: (pendingStatus || item.status || activeTab).toString().toLowerCase(),
            pending: !!pendingStatus,
          };
        });

        safeCachedData = safeCachedData.filter(item => String(item.status || "").toLowerCase() === fetchStatus);
        setVehicles(safeCachedData);
      } else {
        setVehicles([]);
      }

      setPage(1);
      setTotalPages(1); // offline fallback
    } finally {
      setLoading(false);
    }
  };


  useFocusEffect(
    useCallback(() => {
      if (!fetchProject) return;

      const restorePending = async () => {
        const cachedPending = await readCache("pendingUpdates");
        if (cachedPending) setPendingUpdates(mergePendingAndNormalize(cachedPending));
      };

      const checkActionsAndFetch = async () => {
        const newRecord = await readCache("newRecordAdded");
        const recordDeleted = await readCache("recordDeleted");

        if (newRecord || recordDeleted) {
          await fetchVehicles(1, order, true);
          if (newRecord) await storeCache("newRecordAdded", false);
          if (recordDeleted) await storeCache("recordDeleted", false);
        } else {
          await fetchVehicles(1);
        }
      };

      restorePending();
      checkActionsAndFetch();
    }, [activeTab, order, fetchProject])
  );


  // ---------------- REFRESH ----------------
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVehicles(1, "desc", true);
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
        await storeCache("recordDeleted", true);

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
          router.push({ pathname: "/otherPages/vehicles/addVehicles", params: { id: item.id, tempId: item.tempId } });
        }}
        activeOpacity={0.8}
        delayLongPress={500}
        className="mb-3"
      >
        <ThemedView className={` rounded-md shadow-sm p-4 ${isPending ? "border border-yellow-400 bg-yellow-50" : ""}`}
          style={{ elevation: 2 }}>
          <View className={`${darkMode ? 'border-gray-700' : 'border-yellow-300'} 
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

          {isPending && (
            <Text className="text-yellow-600 my-2 text-xs font-medium">⏳ Pending sync...</Text>
          )}
        </ThemedView>
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
              paddingBottom: selectionMode ? 60 : 10
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
            <Ionicons name="receipt-outline" size={58} color="#9ca3af" className="mx-auto my-4" />
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

