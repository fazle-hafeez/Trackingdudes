import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import React, { useState, useRef, useEffect, useContext } from "react";
import Checkbox from "expo-checkbox";
import {
  FontAwesome6,
  FontAwesome,
  Entypo,
  AntDesign,
} from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from "../../../src/components/PageHeader";
import Button from "../../../src/components/Button";
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";
import { useDebounce } from "../../../src/hooks/useDebounce";
import { router, useLocalSearchParams } from "expo-router";
// 🟢 OFFLINE IMPORTS
import { readCache, storeCache } from "../../../src/offline/cache";
import { OfflineContext } from "../../../src/offline/OfflineProvider";

const CACHE_KEY = "my-projects"; // Key for project cache

const AddingProject = () => {
  const { get, post, put } = useApi();
  const { showModal, setGlobalLoading, hideModal } = useAuth();
  const { offlineQueue, isConnected } = useContext(OfflineContext); // 🟢 OFFLINE CONTEXT
  const { id } = useLocalSearchParams();

  // Single project object state
  const [project, setProject] = useState({
    name: "",
    in_shifts: true,
    in_trips: true,
    in_times: true,
    in_expenses: true,
    suggestions: "",
  });

  const [message, setMessage] = useState("");
  const [messageStatus, setMessageStatus] = useState(false); // isError
  const [modalVisible, setModalVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [touchedName, setTouchedName] = useState(false);

  // Debounce project name for API check
  const debouncedName = useDebounce(project.name, 600);

  // Fetch existing project if editing
  useEffect(() => {
    if (id) fetchProjectDetail();
  }, [id]);

  // 🟢 OFFLINE FETCH LOGIC
  const fetchProjectDetail = async () => {
    setGlobalLoading(true);
    try {
      let projectDetail = null;
      let isCached = false;

      // 1. Try Online Fetch
      if (isConnected) {
        try {
          const res = await get(
            `my-projects/project?project_no=${id}&_t=${Date.now()}`,
            { useBearerAuth: true }
          );
          if (res?.status === "success" && res?.data) {
            projectDetail = res.data;
          }
        } catch (err) {
          console.log("Online fetch failed, falling back to offline", err);
        }
      }

      // 2. Fallback to Offline/Cache
      if (!projectDetail) {
        const cachedWrap = (await readCache(CACHE_KEY)) || { data: [] };
        const cached = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];

        // Check Queued Creations
        const queuedCreates = (offlineQueue || [])
          .filter(
            (q) =>
              q.endpoint &&
              q.endpoint.includes("create-project") &&
              q.method === "post"
          )
          .map((q) => ({
            ...q.body,
            id: q.body.tempId,
            pending: true,
          }));

        const allOffline = [...cached, ...queuedCreates];

        projectDetail = allOffline.find(
          (p) =>
            String(p.id) === String(id) ||
            String(p.tempId) === String(id) ||
            String(p.project_no) === String(id)
        );
        isCached = !!projectDetail;

        if (!projectDetail) {
          console.warn("No project found offline or online");
          setGlobalLoading(false);
          return;
        }
      }

      // 3. Set Form State
      setProject({
        name: projectDetail.project || "",
        in_shifts: projectDetail.in_shifts === "1" || projectDetail.in_shifts === true, // Handle boolean/string for offline/online
        in_trips: projectDetail.in_trips === "1" || projectDetail.in_trips === true,
        in_times: projectDetail.in_times === "1" || projectDetail.in_times === true,
        in_expenses: projectDetail.in_expenses === "1" || projectDetail.in_expenses === true,
        suggestions: projectDetail.suggestions || "",
      });


    } catch (err) {
      console.error("Fetch error:", err);
      showModal("Failed to load project details.", "error");
    } finally {
      setGlobalLoading(false);
    }
  };

  // 🟢 OFFLINE NAME AVAILABILITY CHECK
  useEffect(() => {
    if (!touchedName) return; // exit if user hasn't touched the name yet
    if (!debouncedName.trim()) {
      setMessage("");
      setMessageStatus(false);
      return;
    }

    (async () => {
      setMessage("Checking...");
      let isDuplicate = false;
      const currentId = String(id);
      const nameToCheck = debouncedName.trim().toLowerCase();

      // --- ONLINE CHECK ---
      if (isConnected) {
        try {
          const res = await get(
            `my-projects/check-project-availability?project=${encodeURIComponent(nameToCheck)}`,
            { useBearerAuth: true }
          );

          if (
            res?.status === "error" ||
            (res?.error && res.error.toLowerCase().includes("duplicate")) ||
            (res?.message && res.message.toLowerCase().includes("duplicate"))
          ) {
            setMessage(res.message || res.data || "This project name already exists on the server.");
            setMessageStatus(true);
            isDuplicate = true;
          } else {
            setMessage("The name is available");
            setMessageStatus(false);
          }
        } catch (err) {
          console.log("Online check failed", err);
          // Don't set offline message yet, we will check cache below
        }
      }

      if (isDuplicate) return;

      // --- OFFLINE CHECK ---
      const cachedWrap = (await readCache(CACHE_KEY)) || { data: [] };
      const cached = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];

      const queuedNames = (offlineQueue || [])
        .filter(
          (q) => q.endpoint && q.endpoint.includes("create-project") && q.method === "post"
        )
        .map((q) => q.body.project);

      const allOfflineNames = [...cached.map((v) => v.project), ...queuedNames].filter(Boolean);

      // Check for duplicates in offline cache
      const otherProjectNames = allOfflineNames.filter((v) => {
        if (id && v.trim().toLowerCase() === nameToCheck) return false; // allow current project if editing
        return v.trim().toLowerCase() === nameToCheck;
      });

      if (otherProjectNames.length > 0) {
        setMessage("You have already used this project name before (locally or cached). Try another.");
        setMessageStatus(true);
        return;
      }

      //  Only show offline fallback if user is offline and name is not a duplicate
      if (!isConnected) {
        setMessage("The name is available locally.");
        setMessageStatus(false);
      } else {
        setMessage("The name is available");
        setMessageStatus(false);
      }
    })();
  }, [debouncedName, offlineQueue, isConnected, id, touchedName]);

  const validateForm = () => {
    const newErrors = {};
    if (!project.name.trim()) newErrors.name = "Project name required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setProject({
      name: "",
      in_shifts: true,
      in_trips: true,
      in_times: true,
      in_expenses: true,
      suggestions: "",
    });
    setMessage("");
    setMessageStatus(false);
    setErrors({});
  };


  // 🟢 OFFLINE CREATE PROJECT
  const handleCreateProject = async () => {
    if (!validateForm() || messageStatus) return; // Don't allow if duplicate message is shown

    setGlobalLoading(true);
    try {
      const payload = {
        project: project.name.trim(),
        in_trips: project.in_trips,
        in_shifts: project.in_shifts,
        in_times: project.in_times,
        in_expenses: project.in_expenses,
        suggestions: project.suggestions,
        status: "enabled",
      };

      // 🟢 Add temporary ID for offline tracking
      payload.tempId = Date.now();

      const result = await post("/my-projects/create-project", payload, {
        useBearerAuth: true,
      });

      const isOffline = !!result?.offline;

      const cachedWrap = (await readCache(CACHE_KEY)) || { data: [] };
      const list = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];

      // Add/Update in local cache regardless of online status to handle instant display and temp ID association
      const existsIdx = list.findIndex(i => i.tempId === payload.tempId || (i.project && i.project.toLowerCase() === payload.project.toLowerCase()));
      if (existsIdx > -1) {
        list[existsIdx] = { ...list[existsIdx], ...payload, id: payload.tempId, tempId: payload.tempId, pending: isOffline };
      } else {
        list.push({
          ...payload,
          id: payload.tempId,
          tempId: payload.tempId,
          pending: isOffline,
          in_shifts: !!payload.in_shifts,
          in_trips: !!payload.in_trips,
          in_times: !!payload.in_times,
          in_expenses: !!payload.in_expenses,
        });

      }

      await storeCache(CACHE_KEY, { data: list });
      await storeCache("newRecordAdded", true); // For list refresh

      if (isOffline || result.status === "success") {
        showModal(
          result.message || (isOffline
            ? "The project was added locally. Server verification failed, potential conflict when back online."
            : "The project was created successfully!"),
          isOffline ? "warning" : "success",
          false,
          [
            {
              label: "Add More",
              bgColor: "bg-green-600",
              onPress: () => {
                hideModal();
                resetForm(); // Use resetForm for full reset
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
      } else {
        showModal(
          result.data ||
          "Project creation failed online. Try again later.",
          "error"
        );
      }
    } catch (error) {
      console.error(error);
      showModal(
        error.error || "A server error occurred, please try again",
        "error"
      );
    } finally {
      setGlobalLoading(false);
    }
  };

  // 🟢 OFFLINE UPDATE PROJECT
  const handleSave = async () => {
    if (!validateForm() || messageStatus) return;

    setGlobalLoading(true);
    try {
      const payload = {
        project_no: id, // Original ID
        project: project.name.trim(),
        in_shifts: project.in_shifts,
        in_trips: project.in_trips,
        in_times: project.in_times,
        in_expenses: project.in_expenses,
        suggestions: project.suggestions,
        status: "enabled", // CRITICAL: include status for offline merging
      };

      const res = await put("my-projects/update-project", payload, {
        useBearerAuth: true,
      });

      const isOffline = !!res?.offline;

      if (isOffline) {
        // 🟢 OFFLINE UPDATE: Update cache and mark as pending
        const cachedWrap = (await readCache(CACHE_KEY)) || { data: [] };
        const list = Array.isArray(cachedWrap.data) ? cachedWrap.data : [];
        const idx = list.findIndex(
          (i) =>
            String(i.id) === String(id) ||
            String(i.tempId) === String(id) ||
            String(i.project_no) === String(id)
        );

        if (idx > -1) {
          // Merge new data with existing cached data and add pending flag
          list[idx] = {
            ...list[idx],
            ...payload,
            pending: true,
            status: list[idx].status || payload.status,
            // Ensure ID/tempId are preserved
            id: list[idx].id || payload.project_no,
            tempId: list[idx].tempId || payload.project_no,
            project_no: payload.project_no
          };
          await storeCache(CACHE_KEY, { data: list });
        }

        showModal(
          "The project was updated successfully locally. You are offline. Changes will sync when online.",
          "warning",
          false,
          [
            {
              label: "View Changes",
              bgColor: "bg-green-600",
              onPress: async () => {
                hideModal();
                await fetchProjectDetail(); // Re-fetch from cache to see changes
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
      } else if (res.status === "success") {
        showModal(
          res.message || "Project was updated successfully!",
          "success",
          false,
          [
            {
              label: "View changes",
              bgColor: "bg-green-600",
              onPress: async () => {
                hideModal();
                await fetchProjectDetail();
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
      } else {
        showModal(res?.data || "Failed to update project online.", "error");
      }
    } catch (error) {
      console.error(error);
      showModal("Something went wrong while saving.", "error");
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-blue-50">
      <StatusBar barStyle="light-content" backgroundColor="#0000ff" />
      <PageHeader routes={id ? "Edit Project" : "Add Project"} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        className="flex-1"
      >
        <View className="flex-1 p-4">
          <View className="bg-white rounded-lg p-4" style={{ elevation: 5 }}>
            {/* Header */}
            <View className="flex-row items-center my-2 px-2">
              <FontAwesome6 name="file-shield" size={24} color="black" />
              <Text className="text-xl ml-2 font-medium pt-1">Project</Text>
            </View>

            {/* Project Name */}
            <TextInput
              className={`rounded-lg border ${errors.name ? "border-red-500" : "border-gray-400"
                } mt-2 px-3 py-3 text-lg`}
              placeholder="Project name for easy reference"
              value={project.name}
              onChangeText={(val) => {
                setProject((prev) => ({ ...prev, name: val }));
                setErrors((prev) => ({ ...prev, name: "" }));
                setTouchedName(true);
              }}
            />
            {errors.name && <Text className="text-red-500 mt-1">{errors.name}</Text>}
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

            <View className="mt-4">
              <Button
                title={id ? "Update" : "Save"}
                onClickEvent={id ? handleSave : handleCreateProject}
                disabled={messageStatus} // Disable button if name is a duplicate
              />
            </View>
          </View>

          <Text className="p-3 text-lg leading-7">
            Saving a project allows you to select it from the list of saved
            projects. This is useful in tracking shifts, trips, time, as well as
            fuel consumption or other expenses.
          </Text>
        </View>
      </KeyboardAvoidingView>

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