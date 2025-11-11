import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
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

const AddVehicles = () => {
  const { id } = useLocalSearchParams();
  const { get, post, put } = useApi();
  const { showModal, setGlobalLoading, hideModal } = useAuth();

  const [form, setForm] = useState({
    vehicleName: "",
    fuelEcnomy: "",
    tankCapacity: "",
    fuelType: "gs",
    fuelSolid: "gal",
    distanceMeasurement: "mi",
    level_raise_per_unit: 1.2,
  });

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [errors, setErrors] = useState({});
  const debouncedName = useDebounce(form.vehicleName, 600);

  const fuelTypes = [
    { label: "Gas", value: "gs" },
    { label: "Diesel", value: "ds" },
    { label: "Flex", value: "flx" },
    { label: "Other", value: "oth" },
  ];

  const fuelUnits = [
    { label: "Gallons", value: "gal" },
    { label: "Liters", value: "ltr" },
    { label: "Other Unit", value: "unit" },
  ];

  const distanceUnits = [
    { label: "Miles", value: "mi" },
    { label: "Kilometers", value: "km" },
  ];

  // --- Fetch Vehicle (Edit Mode) ---
  useEffect(() => {
    if (!id) return;
    (async () => {
      setGlobalLoading(true);
      try {
        const res = await get(`my-vehicles/vehicles?vehicles_no=${id}`, {
          useBearerAuth: true,
        });
        if (res?.status === "success" && res.data) {
          setForm({
            vehicleName: res.vehicles || "",
            fuelEcnomy: String(res.distance_per_unit_fuel || ""),
            tankCapacity: String(res.tank_capacity || ""),
            fuelType: res.fuel_type || "gs",
            fuelSolid: res.fuel_unit || "gal",
            distanceMeasurement: res.distance_unit || "mi",
            level_raise_per_unit: res.level_raise_per_unit || 1.2,
          });
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setGlobalLoading(false);
      }
    })();
  }, [id]);

  // --- Check Vehicle Availability ---

  useEffect(() => {
    if (!debouncedName.trim()) return setMessage("");

    (async () => {
      setMessage("Checking...");
      try {
        const res = await get(
          `my-vehicles/check-vehicle-availability?vehicle=${encodeURIComponent(
            debouncedName
          )}`,
          { useBearerAuth: true }
        );
        const available = res?.status === "success";
        // Safely render only a string
        setMessage(
          typeof res.data === "object"
            ? res.data.vehicle || JSON.stringify(res.data)
            : res.data || (available ? "Available" : "Already exists")
        );
        setIsError(!available);
      } catch {
        setMessage("Error checking name");
        setIsError(true);
      }
    })();
  }, [debouncedName]);

  // --- Handle Validation ---
  const validateForm = () => {
    const newErrors = {};
    if (!form.vehicleName.trim()) newErrors.vehicleName = "Vehicle name is required";
    if (!form.fuelEcnomy.trim()) newErrors.fuelEcnomy = "Fuel economy is required";
    if (!form.tankCapacity.trim()) newErrors.tankCapacity = "Tank capacity is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- Reset Form ---
  const resetForm = () =>
    setForm({
      vehicleName: "",
      fuelEcnomy: "",
      tankCapacity: "",
      fuelType: "gs",
      fuelSolid: "gal",
      distanceMeasurement: "mi",
      level_raise_per_unit: 1.2,
    });


  // --- Handle Save/Update ---
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setGlobalLoading(true);
    try {
      if (id) {
        // ===== UPDATE VEHICLE =====
        const tankCapacity = parseFloat(form.tankCapacity);
        const payload = {
          vehicle: form.vehicleName.trim(),
          fuel_type: form.fuelType,
          fuel_unit: form.fuelSolid,
          distance_unit: form.distanceMeasurement,
          distance_per_unit_fuel: parseFloat(form.fuelEcnomy),
           level_raise_per_unit: tankCapacity ? 100 / tankCapacity : 0, // calculate here
          tank_capacity: parseFloat(form.tankCapacity),
          vehicle_no: id,
        };

        const res = await put("my-vehicles/update-vehicle", payload, { useBearerAuth: true });
        const success = res?.status === "success";

        const modalMessage = "Vehicle was updated successfully!";
        const buttons = [
          {
            label: "View Changes",
            bgColor: "bg-green-600",
            onPress: async () => {
              hideModal();
              // navigate or fetch updated vehicle detail
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
        ];

        showModal(modalMessage, success ? "success" : "error", success ? false : true, buttons);

      } else {
        // ===== ADD NEW VEHICLE =====
        const tankCapacity = parseFloat(form.tankCapacity);
        const payload = {
          vehicle: form.vehicleName.trim(),
          fuel_type: form.fuelType,
          fuel_unit: form.fuelSolid,
          distance_unit: form.distanceMeasurement,
          distance_per_unit_fuel: parseFloat(form.fuelEcnomy),
          tank_capacity: tankCapacity,
          level_raise_per_unit: tankCapacity ? 100 / tankCapacity : 0, // calculate here
          status: "enabled", // default for new
        };

        const res = await post("my-vehicles/create-vehicle", payload, { useBearerAuth: true });
        const success = res?.status === "success";

        const modalMessage = success ? "Vehicle was added successfully!" : "Something went wrong try again latter";
        const modalVisibility = success ? false : true
        const buttons = [
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
        ];

        const showButton = success ? buttons : []
        showModal(modalMessage, success ? "success" : "error", modalVisibility, showButton);
        if (success) resetForm();
      }
    } catch (err) {
      showModal(err?.error || "Something went wrong, try again later", "error");
    } finally {
      setGlobalLoading(false);
    }
  };


  return (
    <SafeAreaView className="flex-1 bg-blue-50">
      <StatusBar barStyle="light-content" backgroundColor="#0000ff" />
      <PageHeader routes={id ? "Edit Vehicle" : "Add Vehicle"} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <View className="p-4 bg-white rounded-xl mx-4 mt-2">
            <Section
              label="Vehicle"
              icon={<FontAwesome5 name="car" size={22} color="black" />}
              input={
                <Input
                  value={form.vehicleName}
                  onchange={(val) => setForm({ ...form, vehicleName: val })}
                  inputError={errors.vehicleName}
                  placeholder="Enter your vehicle name"
                />
              }
            />
            {message ? (
              <Text
                className={` ${isError ? "text-red-500" : "text-green-500"
                  }`}
              >
                {message}
              </Text>
            ) : null}

            <Section
              label="Fuel Type"
              icon={<FontAwesome6 name="gas-pump" size={22} color="black" />}
              input={
                <Select
                  items={fuelTypes}
                  value={form.fuelType}
                  onChange={(val) => setForm({ ...form, fuelType: val })}
                />
              }
            />

            <Section
              label="Fuel Unit"
              icon={<FontAwesome5 name="oil-can" size={22} color="black" />}
              input={
                <Select
                  items={fuelUnits}
                  value={form.fuelSolid}
                  onChange={(val) => setForm({ ...form, fuelSolid: val })}
                />
              }
            />

            <Section
              label="Distance Unit"
              icon={<FontAwesome6 name="code-compare" size={22} color="black" />}
              input={
                <Select
                  items={distanceUnits}
                  value={form.distanceMeasurement}
                  onChange={(val) =>
                    setForm({ ...form, distanceMeasurement: val })
                  }
                />
              }
            />

            <Section
              label="Fuel Consumption Rate"
              icon={<FontAwesome5 name="leaf" size={22} color="black" />}
              input={
                <Input
                  value={form.fuelEcnomy}
                  onchange={(val) => setForm({ ...form, fuelEcnomy: val })}
                  inputError={errors.fuelEcnomy}
                  placeholder="Enter fuel rate"
                  keyboardType="numeric"
                />
              }
            />

            <Section
              label="Tank Capacity"
              icon={<FontAwesome6 name="ankh" size={22} color="black" />}
              input={
                <Input
                  value={form.tankCapacity}
                  onchange={(val) => setForm({ ...form, tankCapacity: val })}
                  inputError={errors.tankCapacity}
                  placeholder="Enter tank capacity"
                  keyboardType="numeric"
                />
              }
            />

            <View className="mt-2">
              <Button
                title={id ? "Update" : "Save"}
                onClickEvent={handleSubmit}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const Section = ({ label, icon, input }) => (
  <View className="my-1">
    <View className="flex-row items-end mb-2">
      {icon}
      <Text className="text-lg font-medium ml-3">{label}</Text>
    </View>
    {input}
  </View>
);

export default AddVehicles;