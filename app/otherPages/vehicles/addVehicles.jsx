
import React, { useState, useEffect, useContext } from "react";
import { View, Text, StatusBar, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome5, FontAwesome6 } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { router } from "expo-router";
import PageHeader from "../../../src/components/PageHeader";
import Input from "../../../src/components/Input";
import Button from "../../../src/components/Button";
import Select from "../../../src/components/Select";
import { useDebounce } from "../../../src/hooks/useDebounce";
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";
import { readCache, storeCache } from "../../../src/offline/cache";
import { OfflineContext } from "../../../src/offline/OfflineProvider";

const AddVehicles = () => {
  const { id } = useLocalSearchParams();
  const { get, post, put } = useApi();
  const { showModal, setGlobalLoading, hideModal } = useAuth();
  const { offlineQueue, isConnected } = useContext(OfflineContext);

  const [form, setForm] = useState({ vehicleName: "", fuelEcnomy: "", tankCapacity: "", fuelType: "gs", fuelSolid: "gal", distanceMeasurement: "mi" });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [errors, setErrors] = useState({});
  const debouncedName = useDebounce(form.vehicleName, 600);

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
    if (!debouncedName.trim()) {
      setMessage("");
      setIsError(false);
      return;
    }

    (async () => {
      setMessage("Checking...");
      let isDuplicate = false;

      // ------------------------
      // 🔵 1. CHECK ONLINE FIRST
      // ------------------------
      if (isConnected) {
        try {
          const res = await get(
            `my-vehicles/check-vehicle-availability?vehicle=${encodeURIComponent(
              debouncedName
            )}`,
            { useBearerAuth: true }
          );

          if (
            res?.status === "error" ||
            (res?.error && res.error.toLowerCase().includes("duplicate"))
          ) {
            // Duplicate ONLINE
            setMessage(res.message || "This vehicle name already exists.");
            setIsError(true);
            isDuplicate = true;
          } else {
            // Available ONLINE ✔
            setMessage("The name is available");
            setIsError(false);
          }
        } catch (err) {
          console.log("Online check failed → fallback to offline");
        }
      }

      // If online duplicate found → stop here
      if (isDuplicate) return;

      // ---------------------------------
      // 🔵 2. OFFLINE DUPLICATE CHECK
      // ---------------------------------
      const cachedWrap = (await readCache("my-vehicles")) || { data: [] };
      const cached = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];

      const queuedNames = (offlineQueue || [])
        .filter(
          (q) => q.endpoint && q.endpoint.includes("create-vehicle")
        )
        .map((q) => q.body.vehicle);

      const allOfflineNames = [
        ...cached.map((v) => v.vehicle),
        ...queuedNames,
      ].filter(Boolean);

      // Duplicate OFFLINE
      if (
        allOfflineNames.some(
          (v) =>
            String(v).trim().toLowerCase() ===
            debouncedName.trim().toLowerCase()
        )
      ) {
        setMessage(
          "You have already used this vehicle name before. Try another."
        );
        setIsError(true);
        return;
      }

      // ---------------------------------
      //  3. OFFLINE BUT NOT DUPLICATE
      // ---------------------------------
      if (!isConnected) {
        setMessage(
          "The name is availble but You are offline and we can't verify name availability."
        );
        setIsError(false);
        return;
      }
    })();
  }, [debouncedName, offlineQueue, isConnected]);


  const validateForm = () => {
    const newErrors = {};
    if (!form.vehicleName.trim()) newErrors.vehicleName = "Vehicle name required";
    if (!form.fuelEcnomy.trim()) newErrors.fuelEcnomy = "Fuel economy required";
    if (!form.tankCapacity.trim()) newErrors.tankCapacity = "Tank capacity required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => setForm({ vehicleName: "", fuelEcnomy: "", tankCapacity: "", fuelType: "gs", fuelSolid: "gal", distanceMeasurement: "mi" });

  // --- Save / Update ---
  const handleSubmit = async () => {
    if (!validateForm()) return;
    setGlobalLoading(true);
    try {
      const payload = {
        vehicle: form.vehicleName.trim(),
        fuel_type: form.fuelType,
        fuel_unit: form.fuelSolid,
        distance_unit: form.distanceMeasurement,
        distance_per_unit_fuel: parseFloat(form.fuelEcnomy),
        tank_capacity: parseFloat(form.tankCapacity),
        status: "enabled" // <-- CRITICAL: include status for offline merging
      };

      if (id) {
        payload.vehicle_no = id;
        const res = await put("my-vehicles/update-vehicle", payload, { useBearerAuth: true });

        if (res?.offline) {
          const cachedWrap = (await readCache("my-vehicles")) || { data: [] };
          const list = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];
          const idx = list.findIndex(i => String(i.id) === String(id) || String(i.tempId) === String(id));
          if (idx > -1) {
            list[idx] = { ...list[idx], ...payload, pending: true, status: list[idx].status || payload.status };
            await storeCache("my-vehicles", { data: list });
          }
          showModal("The vehicle was updated successfully you are in offline mode please don't use the dublicate project name it may be crashed your request (offline)", "success",
            false, [
            { label: "View Changes", bgColor: "bg-green-600", onPress: async () => { hideModal(); await fetchVehicleDetails(); } },
            { label: "View All", bgColor: "bg-blue-600", onPress: () => { hideModal(); router.back(); } },
          ]);
        } else if (res?.status === "success") {
          showModal(res.message || "The vehicle was updated successfully", "success", false, [
            { label: "View Changes", bgColor: "bg-green-600", onPress: async () => { hideModal(); await fetchVehicleDetails(); } },
            { label: "View All", bgColor: "bg-blue-600", onPress: () => { hideModal(); router.back(); } },
          ]);
        } else {
          showModal(res.message || "Update failed", "error");
        }
      } else {
        payload.tempId = Date.now();
        const res = await post("my-vehicles/create-vehicle", payload, { useBearerAuth: true });

        const cachedWrap = (await readCache("my-vehicles")) || { data: [] };
        const list = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];

        const existsIdx = list.findIndex(i => i.tempId === payload.tempId || (i.vehicle && i.vehicle.toLowerCase() === payload.vehicle.toLowerCase()));
        if (existsIdx > -1) {
          list[existsIdx] = { ...list[existsIdx], ...payload, id: payload.tempId, tempId: payload.tempId, pending: !!res?.offline };
        } else {
          list.push({ ...payload, id: payload.tempId, tempId: payload.tempId, pending: !!res?.offline });
        }

        await storeCache("my-vehicles", { data: list });
        // Notify list screen to refresh and pick up the new cached item
        await storeCache("newRecordAdded", true);

        const isOffline = !!res?.offline;

        showModal(
          res.message || (isOffline
            ? "The  vehicle  was added locally. You're offline, so we can't verify if this name already exists on the server. It may conflict when back online."
            : "The vehicle was added successfully!"),
          isOffline ? "warning" : "success",
          false,
          [
            {
              label: "Add More",
              bgColor: "bg-green-600",
              onPress: () => {
                hideModal();
                resetForm();
              },
            },
            {
              label: "View All",
              bgColor: "bg-blue-600",
              onPress: () => {
                hideModal();
                router.back();
              },
            },
          ]
        );

      }
    } catch (err) {
      console.error(err);
      showModal(err?.error || "Something went wrong", "error");
    } finally {
      setGlobalLoading(false);
    }
  };

  const fuelUnitLabels = { gal: "gallons", ltr: "liters", unit: "other Unit" };

  return (
    <SafeAreaView className="flex-1 bg-blue-50">
      <StatusBar barStyle="light-content" backgroundColor="#0000ff" />
      <PageHeader routes={id ? "Edit Vehicle" : "Add Vehicle"} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0} className="flex-1">
        <View>
          <View className="p-4 bg-white rounded-xl mx-4 mt-2">
            <Section label="Vehicle" icon={<FontAwesome5 name="car" size={22} color="black" />} input={<Input value={form.vehicleName} onchange={val => setForm({ ...form, vehicleName: val })} inputError={errors.vehicleName} placeholder="Enter vehicle name" />} />
            {message && <Text className={isError ? "text-red-500" : "text-green-500"}>{message}</Text>}
            <Section label="Fuel Type" icon={<FontAwesome6 name="gas-pump" size={22} color="black" />} input={<Select items={fuelTypes} value={form.fuelType} onChange={val => setForm({ ...form, fuelType: val })} />} />
            <Section label="Fuel Unit" icon={<FontAwesome5 name="oil-can" size={22} color="black" />} input={<Select items={fuelUnits} value={form.fuelSolid} onChange={val => setForm({ ...form, fuelSolid: val })} />} />
            <Section label="Distance Unit" icon={<FontAwesome6 name="code-compare" size={22} color="black" />} input={<Select items={distanceUnits} value={form.distanceMeasurement} onChange={val => setForm({ ...form, distanceMeasurement: val })} />} />
            <Section label={`Ave. fuel economy (${form.distanceMeasurement}/${form.fuelSolid})`} icon={<FontAwesome5 name="leaf" size={22} color="black" />} input={<Input value={form.fuelEcnomy} onchange={val => setForm({ ...form, fuelEcnomy: val })} inputError={errors.fuelEcnomy} placeholder="Enter fuel rate" keyboardType="numeric" />} />
            <Section label={`Tank capacity in (${fuelUnitLabels[form.fuelSolid]})`} icon={<FontAwesome6 name="ankh" size={22} color="black" />} input={<Input value={form.tankCapacity} onchange={val => setForm({ ...form, tankCapacity: val })} inputError={errors.tankCapacity} placeholder="Enter tank capacity" keyboardType="numeric" />} />
            <View className="mt-2">
              <Button title={id ? "Update" : "Save"} onClickEvent={handleSubmit} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const Section = ({ label, icon, input }) => (
  <View className="my-1">
    <View className="flex-row items-end mb-2">{icon}<Text className="text-lg font-medium ml-3">{label}</Text></View>
    {input}
  </View>
);

export default AddVehicles;
