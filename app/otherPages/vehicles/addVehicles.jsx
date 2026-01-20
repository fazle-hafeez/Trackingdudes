
import React, { useState, useEffect, useContext } from "react";
import { View, Text, ScrollView } from "react-native";
import { FontAwesome5, FontAwesome6 } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { router } from "expo-router";

//-------components -------------------
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import PageHeader from "../../../src/components/PageHeader";
import Input from "../../../src/components/Input";
import Button from "../../../src/components/Button";
import Select from "../../../src/components/Select";

//---------Hooks ---------------------
import { useDebounce } from "../../../src/hooks/useDebounce";
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";
import { readCache, storeCache } from "../../../src/offline/cache";
import { OfflineContext } from "../../../src/offline/OfflineProvider";

// add vehicles ==-==-=

const CACHE_KEY = "my-vehicles"

const AddVehicles = () => {
  const { id = null, activeTab, order, fetchProject } = useLocalSearchParams();
  const { get, post, put } = useApi();
  const { showModal, setGlobalLoading, hideModal } = useAuth();
  const { offlineQueue, isConnected } = useContext(OfflineContext);

  const [form, setForm] = useState({ vehicleName: "", fuelEcnomy: "", tankCapacity: "", fuelType: "gs", fuelSolid: "gal", distanceMeasurement: "mi" });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [errors, setErrors] = useState({});
  const debouncedName = useDebounce(form.vehicleName, 600);
  const [hasEdited, setHasEdited] = useState(false);

  const fuelTypes = [{ label: "Gas", value: "gs" }, { label: "Diesel", value: "ds" }, { label: "Flex", value: "flx" }, { label: "Other", value: "oth" }];
  const fuelUnits = [{ label: "Gallons", value: "gal" }, { label: "Liters", value: "ltr" }, { label: "Other Unit", value: "unit" }];
  const distanceUnits = [{ label: "Miles", value: "mi" }, { label: "Kilometers", value: "km" }];

  // --- Fetch vehicle (edit mode) ---
  const fetchVehicleDetails = async () => {
    setGlobalLoading(true);
    try {
      let vehicle = null;
      try {
        const res = await get(`my-vehicles/vehicle/?vehicle_no=${id}&_t=${Date.now()}`, { useBearerAuth: true });
        if (res?.status === "success" && res.data) vehicle = Array.isArray(res.data) ? res.data[0] : res.data;
      } catch (err) { console.log("Online fetch failed, falling back to offline", err); }

      if (!vehicle) {
        const cachedWrap = (await readCache("my-vehicles")) || { data: [] };
        const cached = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];

        const queuedCreates = (offlineQueue || [])
          .filter(q => q.endpoint && q.endpoint.includes("create-vehicle") && q.method === "post")
          .map(q => ({ ...q.body }));

        const allOffline = [...cached, ...queuedCreates];

        vehicle = allOffline.find(v => String(v.id) === String(id) || String(v.tempId) === String(id) || String(v.vehicle_no) === String(id));

        if (!vehicle) {
          console.warn("No vehicle found offline");
          setGlobalLoading(false);
          return;
        }
      }

      const formatNumber = val => { if (val === undefined || val === null) return ""; const num = parseFloat(val); return Number.isInteger(num) ? String(num) : String(num.toFixed(2)); };

      setForm({ vehicleName: vehicle.vehicle || "", fuelEcnomy: formatNumber(vehicle.distance_per_unit_fuel), tankCapacity: formatNumber(vehicle.tank_capacity), fuelType: vehicle.fuel_type || "gs", fuelSolid: vehicle.fuel_unit || "gal", distanceMeasurement: vehicle.distance_unit || "mi" });
    } catch (err) { console.error("Fetch error:", err); } finally { setGlobalLoading(false); }
  };

  useEffect(() => { if (id) fetchVehicleDetails(); }, [id]);

  // --- Name availability check (offline + online) ---
  useEffect(() => {
    if (!hasEdited) return;
    if (!debouncedName.trim()) {
      setMessage("");
      setIsError(false);
      return;
    }

    (async () => {
      setMessage("Checking...");
      let isDuplicate = false;

      // 1. ONLINE CHECK
      if (isConnected) {
        try {
          const res = await get(
            `my-vehicles/check-vehicle-availability?vehicle=${encodeURIComponent(
              debouncedName
            )}`,
            { useBearerAuth: true }
          );

          if (
            res?.status === "error"
          ) {
            setMessage(res.message || res.data || "This vehicle name already exists.");
            setIsError(true);
            isDuplicate = true;
          } else {
            setMessage(res.data || res.message || "The name is available");
            setIsError(false);
          }
        } catch (err) {
          console.log("Online check failed → fallback to offline");
        }
      }

      if (isDuplicate) return;

      // 2. OFFLINE CHECK
      const cachedWrap = (await readCache("my-vehicles")) || { data: [] };
      const cached = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];

      const queuedNames = (offlineQueue || [])
        .filter(q => q.endpoint && q.endpoint.includes("create-vehicle"))
        .map(q => q.body.vehicle);

      const allOfflineNames = [...cached.map(v => v.vehicle), ...queuedNames].filter(Boolean);

      if (allOfflineNames.some(v => String(v).trim().toLowerCase() === debouncedName.trim().toLowerCase())) {
        setMessage("You have already used this vehicle name before. Try another.");
        setIsError(true);
        return;
      }
      // 3. OFFLINE BUT NOT DUPLICATE
      if (!isConnected) {
        setMessage("The name is available but you are offline and we can't verify it online.");
        setIsError(false);
        return;
      }
    })();
  }, [debouncedName, offlineQueue, isConnected, hasEdited]);


  const validateForm = () => {
    // Reset previous errors
    const newErrors = {};

    if (form.vehicleName.trim() === "") {
      setErrors({ vehicleName: "Vehicle name required" });
      return false;
    }

    if (form.fuelEcnomy.trim() === "") {
      setErrors({ fuelEcnomy: "Fuel economy required" });
      return false;
    }

    if (form.tankCapacity.trim() === "") {
      setErrors({ tankCapacity: "Tank capacity required" });
      return false;
    }

    setErrors({});
    return true;
  };


  const resetForm = () => setForm({ vehicleName: "", fuelEcnomy: "", tankCapacity: "", fuelType: "gs", fuelSolid: "gal", distanceMeasurement: "mi" });

  // --- Save / Update ---

  const handleCreateVehicle = async () => {
    if (!validateForm()) return;

    setGlobalLoading(true);
    try {
        const tempId = Date.now().toString();
        const payload = {
            vehicle: form.vehicleName.trim(),
            fuel_type: form.fuelType,
            fuel_unit: form.fuelSolid,
            distance_unit: form.distanceMeasurement,
            distance_per_unit_fuel: parseFloat(form.fuelEcnomy),
            tank_capacity: parseFloat(form.tankCapacity),
            status: "enabled",
            tempId: tempId,
        };

        let result = null;
        let isOffline = false;

        try {
            result = await post("my-vehicles/create-vehicle", payload, { useBearerAuth: true });
            if (!result || result.offline) isOffline = true;
        } catch (err) {
            console.log("Offline detected", err);
            isOffline = true;
        }

        // --- CACHE SYNC ---
        const cachedWrapOld = (await readCache(CACHE_KEY)) || { data: [] };
        const oldData = Array.isArray(cachedWrapOld.data) ? [...cachedWrapOld.data] : [];

        const newVehicle = {
            ...payload,
            id: tempId,
            pending: true,
        };

        // Duplicate check and add
        const exists = oldData.some(i => i.vehicle === payload.vehicle);
        if (!exists) {
            oldData.unshift(newVehicle); // Top par add karein
        }


        await storeCache(CACHE_KEY, { data: oldData });
        await storeCache("newRecordAdded", true);

        showModal(
            isOffline ? "Vehicle was added successfully you are in offline mode please don't use the dublicate vehicle name it may be crashed your request (offline)" : "Vehicle added successfully!",
            isOffline ? "warning" : "success",
            false,
            [
                { label: "Add More", bgColor: "bg-green-600", onPress: () => { hideModal(); resetForm(); } },
                { label: "View All", bgColor: "bg-blue-600", onPress: () => { hideModal(); router.back(); } },
            ]
        );
    } catch (error) {
        console.error(error);
        showModal("Error creating vehicle.", "error");
    } finally {
        setGlobalLoading(false);
    }
};


const handleUpdateVehicle = async () => {
    if (!validateForm()) return;

    setGlobalLoading(true);
    try {
        const payload = {
            vehicle_no: id, // Original ID
            vehicle: form.vehicleName.trim(),
            fuel_type: form.fuelType,
            fuel_unit: form.fuelSolid,
            distance_unit: form.distanceMeasurement,
            distance_per_unit_fuel: parseFloat(form.fuelEcnomy),
            tank_capacity: parseFloat(form.tankCapacity),
            status: form.status || "enabled",
        };

        let result = null;
        let isOffline = false;

        try {
            result = await put("my-vehicles/update-vehicle", payload, { useBearerAuth: true });
            if (!result || result.offline) isOffline = true;
        } catch (err) {
            console.log("Offline detected", err);
            isOffline = true;
        }

        // --- CACHE UPDATE ---
        const cachedWrapOld = (await readCache(CACHE_KEY)) || { data: [] };
        const oldData = Array.isArray(cachedWrapOld.data) ? [...cachedWrapOld.data] : [];

        const updatedVehicle = {
            ...payload,
            id: id,
            tempId: id,
            pending: isOffline,
        };

        const idx = oldData.findIndex(i => String(i.id || i.vehicle_no || i.tempId) === String(id));
        if (idx > -1) {
            oldData[idx] = { ...oldData[idx], ...updatedVehicle };
        }

        const fetchStatus = (typeof activeTab !== 'undefined' && activeTab) ? activeTab.toLowerCase() : "enabled";
        const paginationKey = `my-vehicles?status=${fetchStatus}&order=${order || 'asc'}&limit=${fetchProject || 10}&page=1`;

        await storeCache(CACHE_KEY, { data: oldData });
        await storeCache(paginationKey, { data: oldData });
        await storeCache("recordUpdated", true);

        showModal(
            isOffline ? "Vehicle was updated successfully you are in offline mode please don't use the dublicate vehicle name it may be crashed your request (offline)" : "Vehicle updated successfully!",
            isOffline ? "warning" : "success",
            false,
            [
                { label: "Done", bgColor: "bg-green-600", onPress: () => { hideModal(); } },
                { label: "View All", bgColor: "bg-blue-600", onPress: () => { hideModal(); router.back(); } },
            ]
        );
    } catch (error) {
        console.error(error);
        showModal("Error updating vehicle.", "error");
    } finally {
        setGlobalLoading(false);
    }
};

  const fuelUnitLabels = { gal: "gallons", ltr: "liters", unit: "other Unit" };

  return (
    <SafeAreacontext bgColor={'#eff6ff'} className="flex-1">
      <PageHeader routes={id ? "Edit Vehicle" : "Add Vehicle"} />
      {/* <View className="p-4 bg-white rounded-xl mx-4 mt-2"> */}
      <ScrollView className="px-3">
        <Section
          label="Vehicle"
          icon={<FontAwesome5 name="car" size={22} />}
          input={
            <Input value={form.vehicleName}
              onchange={val => {
                setForm({ ...form, vehicleName: val });
                setHasEdited(true);
              }}
              inputError={errors.vehicleName}
              placeholder="Enter vehicle name"
            />}
          error={
            message !== "" && (
              <Text className={`${isError ? "text-red-500" : "text-green-500"} mt-2`}>
                {message}
              </Text>
            )
          }

        />
        <Section label="Fuel Type" icon={<FontAwesome6 name="gas-pump" size={22} />} input={<Select items={fuelTypes} value={form.fuelType} onChange={val => setForm({ ...form, fuelType: val })} />} />
        <Section
          label="Fuel Unit"
          icon={<FontAwesome5 name="oil-can" size={22} />}
          input={
            <Select
              items={fuelUnits}
              value={form.fuelSolid}
              onChange={val => setForm({ ...form, fuelSolid: val })} />}
        />
        <Section
          label="Distance Unit"
          icon={<FontAwesome6 name="code-compare" size={22} />}
          input={
            <Select
              items={distanceUnits}
              value={form.distanceMeasurement}
              onChange={val => setForm({ ...form, distanceMeasurement: val })} />}
        />
        <Section
          label={`Ave. fuel economy (${form.distanceMeasurement}/${form.fuelSolid})`}
          icon={<FontAwesome5 name="leaf" size={22} />}
          input={
            <Input
              value={form.fuelEcnomy}
              onchange={val => setForm({ ...form, fuelEcnomy: val })}
              inputError={errors.fuelEcnomy}
              placeholder="Enter fuel rate"
              keyboardType="numeric" />}
        />
        <Section
          label={`Tank capacity in (${fuelUnitLabels[form.fuelSolid]})`}
          icon={<FontAwesome6 name="ankh" size={22} />}
          input={
            <Input
              value={form.tankCapacity}
              onchange={val => setForm({ ...form, tankCapacity: val })}
              inputError={errors.tankCapacity}
              placeholder="Enter tank capacity"
              keyboardType="numeric" />}
        />
        <View className="mt-2">
          <Button title={id ? "Update" : "Save"} onClickEvent={id ? handleUpdateVehicle :  handleCreateVehicle} />
        </View>
        {/* </View> */}
      </ScrollView>
    </SafeAreacontext>
  );
};

const Section = ({ label, icon, input, error }) => (
  <ThemedView className="rounded-lg p-4 mt-4" style={{ elevation: 5 }}>
    <View className="flex-row items-end mb-3">
      <ThemedText className="pl-2">
        {icon}
      </ThemedText>
      <ThemedText className="text-lg font-medium ml-3">{label}</ThemedText></View>
    {input}
    {error}
  </ThemedView>
);

export default AddVehicles;
