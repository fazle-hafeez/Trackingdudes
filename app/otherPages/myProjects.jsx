import { View, Text, TouchableOpacity, TextInput, FlatList } from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from "../../src/components/PageHeader";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Link, useRouter } from "expo-router";
import { useApi } from "../../src/hooks/useApi";
import Checkbox from "expo-checkbox";

const MyProjects = () => {
  const { get } = useApi();
  const tabs = ["Enabled", "Disabled"];
  const [activeTab, setActiveTab] = useState("Enabled");
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Fetch projects
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const result = await get(`my-projects/`, { useBearerAuth: true });
      console.log(result);

      if (result?.status === "success") {
        // Convert "1"/"0" to booleans for checkboxes
        const parsedProjects = result.data.map((p) => ({
          ...p,
          inShift: p.show_in_shifts === "1",
          inTrips: p.show_in_trips === "1",
          inTimes: p.show_in_times === "1",
          inExpenses: p.show_in_expenses === "1",
        }));
        setProjects(parsedProjects);
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
    fetchProjects();
  }, [activeTab]);

  const filteredProjects = projects.filter((item) =>
    item.project.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <PageHeader routes="My Projects" />

      <View className="px-4 bg-gray-100 flex-1">
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
              onPress={() => setActiveTab(tab)}
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
            className="flex-1 text-gray-900 ml-2 py-3"
            placeholder="Search for projects..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* List */}
        {loading ? (
          <View className="bg-white rounded-md shadow-md p-5 mt-3">
            <Text className="text-lg text-gray-500 text-center">Loading...</Text>
          </View>
        ) : filteredProjects.length > 0 ? (
          <FlatList
            data={filteredProjects}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 10 }}
            renderItem={RenterItems}
          />
        ) : (
          <View className="bg-white rounded-md shadow-md px-4 py-5">
            <Text className="text-lg">
              You have not saved any projects under the selected status.
            </Text>
            <Text className="mt-4 text-lg text-gray-600">
              Saving a project allows you to select it from the list of saved
              projects. This is useful in tracking shifts, trips, time, as well
              as fuel consumption or other expenses.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};



const RenterItems = ({ item }) => {
  return (
    <View className="bg-white rounded-md shadow-md  mb-3 ">
      {/* Project title with checkbox */}
      <View className="flex-row items-center  border-b border-yellow-400 py-3 px-4">
        <Checkbox
          value={item.status === "a"} // active project
          color={item.status === "a" ? "#10b981" : "#ffffff"}
        />
        <Text className="ml-2 text-lg font-semibold text-gray-800">
          {item.project}
        </Text>
      </View>

      {/* Settings sections */}
      <View className="flex-row my-2 px-3 pt-3">
        <View className="flex-row items-center">
          <Checkbox value={item.inShift} color={item.inShift ? "#10b981" : ""} />
          <Text className="ml-2 text-gray-700">In Shifts</Text>
        </View>

        <View className="flex-row items-center ml-12">
          <Checkbox value={item.inTrips} color={item.inTrips ? "#10b981" : ""} />
          <Text className="ml-2 text-gray-700">In Trips</Text>
        </View>
      </View>

      <View className="flex-row my-2 px-3 pb-3">
        <View className="flex-row items-center">
          <Checkbox value={item.inTimes} color={item.inTimes ? "#10b981" : ""} />
          <Text className="ml-2 text-gray-700">In Time</Text>
        </View>

        <View className="flex-row items-center ml-12 pl-1">
          <Checkbox value={item.inExpenses} color={item.inExpenses ? "#10b981" : ""} />
          <Text className="ml-2 text-gray-700">In Expenses</Text>
        </View>
      </View>
    </View>
  )
}
export default MyProjects;
