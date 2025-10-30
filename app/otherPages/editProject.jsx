import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useApi } from "../../src/hooks/useApi";
import { useAuth } from "../../src/context/UseAuth";
import CheckBox from "../../src/components/CheckBox";
import PageHeader from "../../src/components/PageHeader";
const EditProject = () => {
  const { id } = useLocalSearchParams(); // id from route
  const { get, put } = useApi();
  const { showModal, setGlobalLoading } = useAuth();
  const [projectName, setProjectName] = useState("");
  const [inShift, setInShift] = useState(false);
  const [inTrips, setInTrips] = useState(false);
  const [inTimes, setInTimes] = useState(false);
  const [inExpenses, setInExpenses] = useState(false);
  const [textArea, setTextArea] = useState("");
  

  useEffect(() => {
    fetchProjectDetail();
  }, []);

  const fetchProjectDetail = async () => {
    setGlobalLoading(true);
    try {
      const res = await get(`my-projects/${id}`, { useBearerAuth: true });
      if (res?.status === "success" && res?.data) {
        const p = res.data;
        setProjectName(p.project || "");
        setInShift(p.in_shifts === "1" ? true : false);
        setInTrips(p.in_trips === "1" ? true : false);
        setInTimes(p.in_times === "1" ? true : false);
        setInExpenses(p.in_expenses === "1" ? true : false);
        setTextArea(p.suggestions || '')
      }
    } catch (err) {
      console.error(err);
      showModal("Failed to load project details.", "error");
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleSave = async () => {
    if (!projectName.trim()) {
      showModal("Project name cannot be empty.", "error");
      return;
    }
    setGlobalLoading(true);
    try {
      const payload = {
        project_no: id,
        project: projectName,
        in_shifts: inShift,
        in_trips: inTrips,
        in_times: inTimes,
        in_expenses: inExpenses,
        suggestions:textArea
      };

      const res = await put(`my-projects/update-project`, payload, { useBearerAuth: true });
      if (res.status === "success") {
        showModal("Project updated successfully!", "success");
        router.back();
      } else {
        showModal(res?.data || "Failed to update project.", "error");
      }
    } catch (err) {
      console.error(err);
      showModal("Something went wrong while saving.", "error");
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-blue-50 ">
      <PageHeader routes='Edit Project' />
      <View className="flex-1 justify-center items-center px-4">
      <View className="bg-white w-full max-w-md rounded-2xl shadow-lg p-6 mx-4 ">
        <Text className="text-2xl font-semibold text-center text-gray-700 mb-5">
          Edit Project
        </Text>

        {/* Project name input */}
        <View className="mb-6">
          <Text className="text-lg font-medium text-gray-700 mb-2">Project Name</Text>
          <TextInput
            value={projectName}
            onChangeText={setProjectName}
            placeholder="Enter project name"
            className="border border-gray-300 rounded-lg px-4 py-3 text-lg"
          />
        </View>

        {/* Checkboxes (2 per row) */}
        <View className="flex-row justify-between mb-4">
          <View className="flex-row items-center w-[48%]">
            <CheckBox value={inShift} onClick={() => setInShift(!inShift)} />
            <Text className="ml-2 text-lg text-gray-700">In Shifts</Text>
          </View>
          <View className="flex-row items-center w-[48%]">
            <CheckBox value={inTrips} onClick={() => setInTrips(!inTrips)} />
            <Text className="ml-2 text-lg text-gray-700">In Trips</Text>
          </View>
        </View>

        <View className="flex-row justify-between mb-4">
          <View className="flex-row items-center w-[48%]">
            <CheckBox value={inTimes} onClick={() => setInTimes(!inTimes)} />
            <Text className="ml-2 text-lg text-gray-700">In Times</Text>
          </View>
          <View className="flex-row items-center w-[48%]">
            <CheckBox value={inExpenses} onClick={() => setInExpenses(!inExpenses)} />
            <Text className="ml-2 text-lg text-gray-700">In Expenses</Text>
          </View>

        </View>

        <View className="mb-6">
          <TextInput
            className="border border-gray-400 rounded-lg p-3 text-lg"
            style={{ textAlignVertical: "top" }}
            multiline
            onChangeText={setTextArea}
            value={textArea}
            placeholder="Save commonly used words or phrases for project notes. Separate each with | character."
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          className="bg-green-500 rounded-xl py-3 flex-row justify-center items-center"
        >
          <Ionicons name="save-outline" size={22} color="white" />
          <Text className="text-white text-lg font-semibold ml-2">Save Changes</Text>
        </TouchableOpacity>
      </View>
      </View>
    </SafeAreaView>
  );
};

export default EditProject;
