import {View,Text,TextInput,TouchableOpacity,Modal,Animated,} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import Checkbox from "expo-checkbox";
import {FontAwesome6,FontAwesome,Entypo,AntDesign} from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from "../../src/components/PageHeader";
import Button from "../../src/components/Button";
import { useApi } from "../../src/hooks/useApi";
import { useAuth } from "../../src/context/UseAuth";
import { useDebounce } from "../../src/hooks/useDebounce";
import { router, useLocalSearchParams } from "expo-router";
const AddingProject = () => {
  const { get, post, put } = useApi();
  const { showModal, setGlobalLoading, hideModal } = useAuth();
  const { id } = useLocalSearchParams();

  //  Single project object state
  const [project, setProject] = useState({
    name: "",
    in_shifts: true,
    in_trips: true,
    in_times: true,
    in_expenses: true,
    suggestions: "",
  });

  const [message, setMessage] = useState("");
  const [messageStatus, setMessageStatus] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  //  Debounce project name for API check
  const debouncedName = useDebounce(project.name, 600);

  //  Fetch existing project if editing
  useEffect(() => {
    if (id) fetchProjectDetail();
  }, [id]);

  const fetchProjectDetail = async () => {
    setGlobalLoading(true);
    try {
      const res = await get(
        `my-projects/project?project_no=${id}&_t=${Date.now()}`,
        { useBearerAuth: true }
      );
      if (res?.status === "success" && res?.data) {
        const p = res.data;
        setProject({
          name: p.project || "",
          in_shifts: p.in_shifts === "1",
          in_trips: p.in_trips === "1",
          in_times: p.in_times === "1",
          in_expenses: p.in_expenses === "1",
          suggestions: p.suggestions || "",
        });
      }
    } catch (err) {
      showModal("Failed to load project details.", "error");
    } finally {
      setGlobalLoading(false);
    }
  };

  //  Check project name availability
  useEffect(() => {
    const checkAvailability = async () => {
      if (!debouncedName.trim()) {
        setMessage("");
        return;
      }

      setMessage("Checking...");
      try {
        const res = await get(
          `my-projects/check-project-availability?project=${encodeURIComponent(
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

  //  Handle create
  const handleCreateProject = async () => {
    if (!project.name.trim()) {
      setMessage("Field is required");
      setMessageStatus(true);
      return;
    }

    setGlobalLoading(true);
    try {
      const payload = {
        project: project.name,
        in_trips: project.in_trips,
        in_shifts: project.in_shifts,
        in_times: project.in_times,
        in_expenses: project.in_expenses,
        suggestions: project.suggestions,
        status: "enabled",
      };

      const result = await post("/my-projects/create-project", payload, {
        useBearerAuth: true,
      });

      if (result.status === "success" && result.action === "Next") {
        showModal(
          "Project created successfully!",
          "success",
          "Yah!!",
          false,
          [
            {
              label: "Add More",
              bgColor: "bg-green-600",
              onPress: () => hideModal(),
            },
            {
              label: "View All",
              bgColor: "bg-blue-600",
              onPress: () => {
                hideModal();
                router.push("/otherPages/myProjects");
              },
            },
          ]
        );
        setProject({
          name: "",
          in_shifts: true,
          in_trips: true,
          in_times: true,
          in_expenses: true,
          suggestions: "",
        });
      } else {
        showModal(
          result.data ||
          "You have already used the project name before. Please try another name...",
          "error"
        );
        setProject((prev) => ({ ...prev, name: "" }));
      }
    } catch (error) {
       
      showModal(
        error.error || "A server error occurred, please try again",
        "error"
      );
    } finally {
      setGlobalLoading(false);
    }
  };

  //  Handle update
  const handleSave = async () => {
    if (!project.name.trim()) {
      showModal("Project name cannot be empty.", "error");
      return;
    }

    setGlobalLoading(true);
    try {
      const payload = {
        project_no: id,
        project: project.name,
        in_shifts: project.in_shifts,
        in_trips: project.in_trips,
        in_times: project.in_times,
        in_expenses: project.in_expenses,
        suggestions: project.suggestions,
      };

      const res = await put("my-projects/update-project", payload, {
        useBearerAuth: true,
      });

      if (res.status === "success") {
        showModal("Project was updated successfully!", "success",false,
           [
            {
              label: "View changes",
              bgColor: "bg-green-600",
              onPress: async() => {
                hideModal(),
                await fetchProjectDetail()
              },
            },
            {
              label: "View All",
              bgColor: "bg-blue-600",
              onPress: () => {
                hideModal();
                router.push("/otherPages/myProjects");
              },
            },
          ]
        );

      } else {
        showModal(res?.data || "Failed to update project.", "error");
      }
    } catch {
      showModal("Something went wrong while saving.", "error");
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1">
      <PageHeader routes={id ? "Edit Project" : "Add Project"} />

      <View className="flex-1 bg-gray-100 p-4">
        <View className="bg-white rounded-lg p-4" style={{ elevation: 5 }}>
          {/* Header */}
          <View className="flex-row items-center my-2 px-2">
            <FontAwesome6 name="file-shield" size={24} color="black" />
            <Text className="text-xl ml-2 font-medium pt-1">Project</Text>
          </View>

          {/* Project Name */}
          <TextInput
            className="rounded-lg border border-gray-400 mt-2 px-3 py-3 text-lg"
            placeholder="Project name for easy reference"
            value={project.name}
            onChangeText={(val) =>
              setProject((prev) => ({ ...prev, name: val }))
            }
          />
          {message ? (
            <Text
              className={`mt-1 ${messageStatus ? "text-red-500" : "text-green-500"
                }`}
            >
              {message}
            </Text>
          ) : null}

          {/* Suggest Section */}
          <View className="flex-row items-center my-3 px-2 mt-4">
            <FontAwesome name="lightbulb-o" size={26} color="black" />
            <Text className="text-xl ml-2 font-medium pt-1">
              Where to suggest this project
            </Text>
          </View>

          <Section>
            <LabeledInput
              label="In Shift"
              value={project.in_shifts}
              onChange={(val) =>
                setProject((prev) => ({ ...prev, in_shifts: val }))
              }
            />
            <LabeledInput
              label="In Trips"
              value={project.in_trips}
              onChange={(val) =>
                setProject((prev) => ({ ...prev, in_trips: val }))
              }
            />
          </Section>

          <Section>
            <LabeledInput
              label="In Times"
              value={project.in_times}
              onChange={(val) =>
                setProject((prev) => ({ ...prev, in_times: val }))
              }
            />
            <LabeledInput
              label="In Expenses"
              value={project.in_expenses}
              onChange={(val) =>
                setProject((prev) => ({ ...prev, in_expenses: val }))
              }
            />
          </Section>

          {/* Regularly Typed Words */}
          <View className="flex-row items-center px-2 my-3">
            <Entypo name="clipboard" size={24} color="black" />
            <Text className="text-xl ml-2 font-medium pt-1">
              Regularly Typed Words
            </Text>
            <TouchableOpacity
              activeOpacity={0.6}
              className="ml-2 rounded-full bg-blue-700 w-7 h-7 flex justify-center items-center"
              onPress={() => setModalVisible(true)}
            >
              <FontAwesome name="info" size={15} color="white" />
            </TouchableOpacity>
          </View>

          <TextInput
            className="border border-gray-400 rounded-lg p-3 text-lg"
            style={{ textAlignVertical: "top" }}
            multiline
            value={project.suggestions}
            onChangeText={(val) =>
              setProject((prev) => ({ ...prev, suggestions: val }))
            }
            placeholder="This input allows you to save commonly used words or phrases for project notes. Each word or phrase should be separated by the | character."
          />

          <Button
            title={id ? "Update" : "Save"}
            onClickEvent={id ? handleSave : handleCreateProject}
          />
        </View>

        <Text className="p-3 text-lg leading-7">
          Saving a project allows you to select it from the list of saved projects.
           This is useful in tracking shifts, trips, time, as well as fuel consumption or other expenses.
        </Text>
      </View>

      <InfoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        message="You can save commonly used words or phrases for project notes here. 
        Separate each one using the | character."
      />
    </SafeAreaView>
  );
};

// --- Reusable Section ---
const Section = ({ children }) => (
  <View className="flex-row justify-between items-center gap-4">
    {children}
  </View>
);

// --- Checkbox Input ---
const LabeledInput = ({ label, value, onChange }) => (
  <View className="flex-row items-center my-2 w-[49%] px-2">
    <View className="absolute -left-1 z-10">
      <Checkbox
        value={value}
        onValueChange={onChange}
        color={value ? "#2563eb" : undefined}
        style={{
          borderWidth: 2,
          borderColor: value ? "#2563eb" : "#9ca3af",
          backgroundColor: value ? "#2563eb" : "white",
          borderRadius: 5,
          width: 21,
          height: 21,
        }}
      />
    </View>
    <TextInput
      className="border border-gray-400 rounded-lg pl-5 pr-3 py-2 text-base flex-1"
      value={label}
      editable={false}
    />
  </View>
);

// --- Info Modal ---
const InfoModal = ({ visible, onClose, message }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/80 justify-center items-center px-3">
        <Animated.View style={{ opacity, transform: [{ scale }], width: "100%" }}>
          <View className="bg-white rounded-2xl">
            <View className="flex-row justify-between items-center p-3">
              <Text className="text-xl font-medium">
                About Regularly Typed Words
              </Text>
              <TouchableOpacity className="p-1" onPress={onClose}>
                <AntDesign name="close" size={20} color="black" />
              </TouchableOpacity>
            </View>
            <View className="border-b" />
            <Text className="text-lg px-3 py-8 text-gray-700">{message}</Text>
            <View className="border-b mb-3" />
            <TouchableOpacity
              className="bg-gray-400 rounded-md py-2 px-6 self-end my-2 mx-3"
              onPress={onClose}
            >
              <Text className="text-white font-medium text-base">Close</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default AddingProject;
