import {
  View,
  Text,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome5, FontAwesome6 } from "@expo/vector-icons";
import PageHeader from "../../../src/components/PageHeader";
import Input from "../../../src/components/Input";
import Button from "../../../src/components/Button";
import Select from "../../../src/components/Select";
import { useDebounce } from "../../../src/hooks/useDebounce";
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";

const AddVehicles = () => {
  const { get, post } = useApi();
  const { showModal, setGlobalLoading, hideModal } = useAuth();

  const [addVehicles, setAddVehicles] = useState({
    vehicleName: "",
    fuelEcnomy: "",
    tankCapacity: "",
    fuelType: "gs",
    fuelSolid: "gal",
    distanceMeasurment: "mi",
  });

  const debouncedName = useDebounce(addVehicles.vehicleName, 600);
  const [message, setMessage] = useState("");
  const [messageStatus, setMessageStatus] = useState(false);
  const [missFieldsError, setMissFieldError] = useState({
    missVehicleName: "",
    missFuelEcnomy: "",
    missTankCapacity: "",
  });

  // --- Dropdown Options ---
  const fuelTypes = [
    { label: "Gas", value: "gs" },
    { label: "Diesel", value: "ds" },
    { label: "Flex", value: "flx" },
    { label: "Other", value: "oth" },
  ];

  const fuelSolidIn = [
    { label: "Gallons", value: "gal" },
    { label: "Liters", value: "ltr" },
    { label: "Other Unit", value: "unit" },
  ];

  const distanceMeasuredIn = [
    { label: "Miles", value: "mi" },
    { label: "Kilometers", value: "km" },
  ];

  // --- Check Vehicle Availability ---
  useEffect(() => {
    const checkAvailability = async () => {
      if (!debouncedName.trim()) {
        setMessage("");
        return;
      }

      setMessage("Checking...");
      try {
        const res = await get(
          `my-vehicles/check-vehicle-availability?vehicle=${encodeURIComponent(
            debouncedName
          )}`,
          { useBearerAuth: true }
        );

        if (res?.status === "success") {
          setMessage(res.data || "Available");
          setMessageStatus(false);
        } else {
          setMessage(res.data || "Already exists");
          setMessageStatus(true);
        }
      } catch {
        setMessage("Error checking name");
        setMessageStatus(true);
      }
    };
    checkAvailability();
  }, [debouncedName]);

  // --- Handle Save Vehicle ---
  const handleSave = async () => {
    let hasError = false;
    const updatedErrors = { ...missFieldsError };

    if (!addVehicles.vehicleName.trim()) {
      updatedErrors.missVehicleName = "Vehicle name is required";
      hasError = true;
    }
    if (!addVehicles.fuelEcnomy.trim()) {
      updatedErrors.missFuelEcnomy = "Fuel economy is required";
      hasError = true;
    }
    if (!addVehicles.tankCapacity.trim()) {
      updatedErrors.missTankCapacity = "Tank capacity is required";
      hasError = true;
    }

    setMissFieldError(updatedErrors);
    if (hasError) return;

    const payload = {
      vehicle: addVehicles.vehicleName.trim(),
      fuel_type: addVehicles.fuelType,
      fuel_unit: addVehicles.fuelSolid,
      distance_unit: addVehicles.distanceMeasurment,
      fuel_consumption_rate: parseFloat(addVehicles.fuelEcnomy),
      level_raise_per_unit: 1.2, // Default since UI doesn't capture this yet
      tank_capacity: parseFloat(addVehicles.tankCapacity),
      status:'enabled'
    };

    try {
      setGlobalLoading(true);
      console.log(payload);
      
      const res = await post("my-vehicles/create-vehicle", payload, {
        useBearerAuth: true,
      });

      console.log(res);
      

      if (res?.status === "success") {
        showModal( res.data || 'The vehicle was added successfully', 'success');

        // Reset form
        setAddVehicles({
          vehicleName: "",
          fuelEcnomy: "",
          tankCapacity: "",
          fuelType: "gs",
          fuelSolid: "gal",
          distanceMeasurment: "mi",
        });
      } else {
        showModal(res.data || 'cant saved vehicles try again','error');
      }
    } catch (error) {
      showModal(error.error || 'something went wrong try again latter')
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-blue-50">
      <StatusBar barStyle="light-content" backgroundColor="#0000ff" />
      <PageHeader routes="Adding Vehicles" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 0 }}
        >
          <View className="flex-1 px-4 py-2">
            <View className="bg-white rounded-xl px-4 pb-4">
              {/* Vehicle name */}
              <Section
                icon={<FontAwesome5 name="car" size={24} color="black" />}
                label="Vehicle"
                input={
                  <Input
                    value={addVehicles.vehicleName}
                    onchange={(val) =>
                      setAddVehicles({ ...addVehicles, vehicleName: val })
                    }
                    inputError={missFieldsError.missVehicleName}
                    setInputError={(msg) =>
                      setMissFieldError({
                        ...missFieldsError,
                        missVehicleName: msg,
                      })
                    }
                    placeholder="Enter your vehicle name"
                  />
                }
              />
              {message ? (
                <Text
                  className={`mt-1 ${
                    messageStatus ? "text-red-500" : "text-green-500"
                  }`}
                >
                  {message}
                </Text>
              ) : null}

              {/* Fuel Type */}
              <Section
                icon={<FontAwesome6 name="gas-pump" size={24} color="black" />}
                label="Fuel Type"
                input={
                  <Select
                    items={fuelTypes}
                    value={addVehicles.fuelType}
                    onChange={(val) =>
                      setAddVehicles({ ...addVehicles, fuelType: val })
                    }
                  />
                }
              />

              {/* Fuel Unit */}
              <Section
                icon={<FontAwesome5 name="oil-can" size={24} color="black" />}
                label="Fuel Unit"
                input={
                  <Select
                    items={fuelSolidIn}
                    value={addVehicles.fuelSolid}
                    onChange={(val) =>
                      setAddVehicles({ ...addVehicles, fuelSolid: val })
                    }
                  />
                }
              />

              {/* Distance Unit */}
              <Section
                icon={
                  <FontAwesome6 name="code-compare" size={24} color="black" />
                }
                label="Distance Unit"
                input={
                  <Select
                    items={distanceMeasuredIn}
                    value={addVehicles.distanceMeasurment}
                    onChange={(val) =>
                      setAddVehicles({
                        ...addVehicles,
                        distanceMeasurment: val,
                      })
                    }
                  />
                }
              />

              {/* Fuel Economy */}
              <Section
                icon={<FontAwesome5 name="leaf" size={24} color="black" />}
                label="Fuel Consumption Rate"
                input={
                  <Input
                    value={addVehicles.fuelEcnomy}
                    onchange={(val) =>
                      setAddVehicles({ ...addVehicles, fuelEcnomy: val })
                    }
                    inputError={missFieldsError.missFuelEcnomy}
                    setInputError={(msg) =>
                      setMissFieldError({
                        ...missFieldsError,
                        missFuelEcnomy: msg,
                      })
                    }
                    placeholder="Enter fuel rate"
                    keyboardType="numeric"
                  />
                }
              />

              {/* Tank Capacity */}
              <Section
                icon={<FontAwesome6 name="ankh" size={24} color="black" />}
                label="Tank Capacity"
                input={
                  <Input
                    value={addVehicles.tankCapacity}
                    onchange={(val) =>
                      setAddVehicles({ ...addVehicles, tankCapacity: val })
                    }
                    inputError={missFieldsError.missTankCapacity}
                    setInputError={(msg) =>
                      setMissFieldError({
                        ...missFieldsError,
                        missTankCapacity: msg,
                      })
                    }
                    placeholder="Enter tank capacity"
                    keyboardType="numeric"
                  />
                }
              />

              <View className="my-2">
                <Button title="Save" onClickEvent={handleSave} />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const Section = ({ label, icon, input, className }) => (
  <View className={className}>
    <View className="flex-row items-end my-3">
      {icon}
      <Text className="text-lg font-medium ml-3">{label}</Text>
    </View>
    {input}
  </View>
);

export default AddVehicles;
