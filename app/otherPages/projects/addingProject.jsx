import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Animated,
} from "react-native";
import React, { useState, useRef, useEffect, useContext } from "react";
import Checkbox from "expo-checkbox";
import {
  FontAwesome6,
  FontAwesome,
  Entypo,
  AntDesign,
} from "@expo/vector-icons";
import PageHeader from "../../../src/components/PageHeader";
import Button from "../../../src/components/Button";
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";
import { useDebounce } from "../../../src/hooks/useDebounce";
import { router, useLocalSearchParams } from "expo-router";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import Input from "../../../src/components/Input"
//  OFFLINE IMPORTS
import { readCache, storeCache } from "../../../src/offline/cache";
import { OfflineContext } from "../../../src/offline/OfflineProvider";
import { useTheme } from "../../../src/context/ThemeProvider";

const CACHE_KEY = "my-projects"; // Key for project cache

const AddingProject = () => {
  const { get, post, put } = useApi();
  const { showModal, setGlobalLoading, hideModal } = useAuth();
  const { darkMode } = useTheme()
  const { offlineQueue, isConnected, queueAction } = useContext(OfflineContext); //  OFFLINE CONTEXT
  const { id, projectCount, activeTab, order } = useLocalSearchParams();

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

  //  OFFLINE FETCH LOGIC
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

  //  OFFLINE NAME AVAILABILITY CHECK
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


  //  OFFLINE CREATE PROJECT

  // const handleCreateProject = async () => {
  //   if (!validateForm() || messageStatus) return; // Don't allow if duplicate message is shown

  //   setGlobalLoading(true);
  //   try {
  //     const payload = {
  //       project: project.name.trim(),
  //       in_trips: project.in_trips,
  //       in_shifts: project.in_shifts,
  //       in_times: project.in_times,
  //       in_expenses: project.in_expenses,
  //       suggestions: project.suggestions,
  //       status: "enabled",
  //       tempId: Date.now(), // Temporary ID for offline
  //     };

  //     // Attempt online post
  //     let result = null;
  //     let isOffline = false;
  //     try {
  //       result = await post("/my-projects/create-project", payload, {
  //         useBearerAuth: true,
  //       });
  //       if (!result || result.offline) isOffline = true;
  //     } catch (err) {
  //       console.log("Offline detected or network error", err);
  //       isOffline = true;
  //     }

  //     // READ OLD CACHE
  //     const cachedWrapOld = (await readCache(CACHE_KEY)) || { data: [] };
  //     const oldData = Array.isArray(cachedWrapOld.data) ? cachedWrapOld.data : [];

  //     // PREPARE NEW PROJECT ITEM
  //     const newProject = {
  //       ...payload,
  //       id: payload.tempId,
  //       tempId: payload.tempId,
  //       pending: true, // mark as pending
  //       in_shifts: !!payload.in_shifts,
  //       in_trips: !!payload.in_trips,
  //       in_times: !!payload.in_times,
  //       in_expenses: !!payload.in_expenses,
  //     };

  //     // MERGE CACHE (duplicate-free)
  //     const mergedList = [...oldData, newProject]; // <-- yahan simple array push kar do
  //     await storeCache(CACHE_KEY, { data: mergedList });
  //     await storeCache("newRecordAdded", true); // flag list refresh ke liye

  //     // SHOW MODAL
  //     showModal(
  //       isOffline
  //         ? "Project was added successfully you are in offline mode please don't use the dublicate project name it may be crashed your request (offline)"
  //         : result?.message || "Project created successfully!",
  //       isOffline ? "warning" : "success",
  //       false,
  //       [
  //         {
  //           label: "Add More",
  //           bgColor: "bg-green-600",
  //           onPress: () => {
  //             hideModal();
  //             resetForm();
  //           },
  //         },
  //         {
  //           label: "View All",
  //           bgColor: "bg-blue-600",
  //           onPress: () => {
  //             hideModal();
  //             router.back();
  //           },
  //         },
  //       ]
  //     );
  //   } catch (error) {
  //     console.error(error);
  //     showModal(error?.error || "A server error occurred.", "error");
  //   } finally {
  //     setGlobalLoading(false);
  //   }
  // };

  const handleCreateProject = async () => {
    if (!validateForm() || messageStatus) return;

    setGlobalLoading(true);
    try {
      const tempId = `local_${Date.now()}`;
      const payload = {
        project: project.name.trim(),
        in_trips: project.in_trips,
        in_shifts: project.in_shifts,
        in_times: project.in_times,
        in_expenses: project.in_expenses,
        suggestions: project.suggestions,
        status: "enabled",
        tempId: tempId,
      };

      let isOffline = false;
      let result = null;

      if (isConnected) {
        try {
          result = await post("/my-projects/create-project", payload, { useBearerAuth: true });
          if (!result || result.offline) isOffline = true;
        } catch (err) {
          isOffline = true;
        }
      } else {
        isOffline = true;
      }

      /* 🚨 OFFLINE QUEUE (Using Context) */
      if (isOffline) {
        await queueAction({
          method: "post",
          endpoint: "/my-projects/create-project",
          body: payload,
          isFormData: false, // Kyunki projects mein image nahi hai
          useToken: true,
        });
      }

      // --- LOCAL CACHE UPDATE (Taake UI par foran dikhe) ---
      const cachedWrapOld = (await readCache(CACHE_KEY)) || { data: [] };
      const oldData = Array.isArray(cachedWrapOld.data) ? [...cachedWrapOld.data] : [];

      const newProject = {
        ...payload,
        id: tempId,
        pending: isOffline,
        in_shifts: !!payload.in_shifts,
        in_trips: !!payload.in_trips,
        in_times: !!payload.in_times,
        in_expenses: !!payload.in_expenses,
      };

      oldData.unshift(newProject);
      await storeCache(CACHE_KEY, { data: oldData });
      await storeCache("newRecordAdded", true);

      showModal(
        isOffline ? "Project saved offline. It will sync when online." : "Project created successfully!",
        isOffline ? "warning" : "success",
        false,
        [
          { label: "Add More", bgColor: "bg-green-600", onPress: () => { hideModal(); resetForm(); } },
          { label: "View All", bgColor: "bg-blue-600", onPress: () => { hideModal(); router.back(); } },
        ]
      );
    } catch (error) {
      showModal("A server error occurred.", "error");
    } finally {
      setGlobalLoading(false);
    }
  };

  //===================//
  //== Update project =//
  //==================// 

  const handleUpdateProject = async () => {
    if (!validateForm() || messageStatus) return;

    setGlobalLoading(true);
    try {
      const payload = {
        project_no: id,
        project: project.name.trim(),
        in_shifts: project.in_shifts,
        in_trips: project.in_trips,
        in_times: project.in_times,
        in_expenses: project.in_expenses,
        suggestions: project.suggestions,
        status: project.status || "enabled", // Use current status
      };

      let res = null;
      let isOffline = false;

      try {
        res = await put("my-projects/update-project", payload, { useBearerAuth: true });
        if (!res || res.offline) isOffline = true;
      } catch (err) {
        console.log("Offline detected", err);
        isOffline = true;
      }

      // --- CACHE UPDATE LOGIC ---
      const cachedWrapOld = (await readCache(CACHE_KEY)) || { data: [] };
      const oldData = Array.isArray(cachedWrapOld.data) ? [...cachedWrapOld.data] : [];

      const updatedProject = {
        ...payload,
        id: id,
        tempId: id,
        pending: isOffline, // Agar offline hai toh true
        // Flag normalization
        in_shifts: !!payload.in_shifts,
        in_trips: !!payload.in_trips,
        in_times: !!payload.in_times,
        in_expenses: !!payload.in_expenses,
        status: project.status || "enabled",
      };

      const idx = oldData.findIndex(i => String(i.id || i.project_no) === String(id));
      if (idx > -1) {
        oldData[idx] = { ...oldData[idx], ...updatedProject };
      }

      if (isOffline) {
        await queueAction({
          method: "put",
          endpoint: "my-projects/update-project",
          body: payload,
          isFormData: false,
          useToken: true,
          affectedIds: [id]
        });
      }
      // Store in all relevant keys
      const fetchStatus = activeTab.toLowerCase();
      const paginationKey = `my-projects?status=${fetchStatus}&order=${order || 'asc'}&limit=${projectCount || 10}&page=1`;

      // await storeCache(CACHE_KEY, { data: oldData });
      await storeCache(paginationKey, { data: oldData });
      await storeCache("recordUpdated", true);

      showModal(
        isOffline ? "Project was updated successfully you are in offline mode please don't use the dublicate project name it may be crashed your request (offline)" : "Project was updated successfully!",
        isOffline ? "warning" : "success",
        false,
        [
          { label: "View changes", bgColor: "bg-green-600", onPress: async () => { hideModal(); await fetchProjectDetail(); } },
          { label: "View All", bgColor: "bg-blue-600", onPress: () => { hideModal(); router.back(); } },
        ]
      );

    } catch (error) {
      console.error(error);
      showModal(error?.error || "A server error occurred.", "error");
    } finally {
      setGlobalLoading(false);
    }
  };



  return (
    <SafeAreacontext bgColor={'#eff6ff'} className="flex-1 ">
      <PageHeader routes={id ? "Edit Project" : "Add Project"} />
      <View className="flex-1 p-4">
        <ThemedView className=" rounded-lg p-4" style={{ elevation: 5 }}>
          {/* Header */}
          <View className="flex-row items-center my-2 px-2">
            <ThemedText>
              <FontAwesome6 name="file-shield" size={24} />
            </ThemedText>
            <ThemedText className="text-xl ml-2 font-medium pt-1">Project</ThemedText>
          </View>

          {/* Project Name */}
          <View className="mt-2">
            <Input
              placeholder="Project name for easy reference"
              inputError={errors.name}
              value={project.name}
              onchange={(val) => {
                setProject((prev) => ({ ...prev, name: val }));
                setErrors((prev) => ({ ...prev, name: "" }));
                setTouchedName(true);
              }}
            />
            {message ? (
              <Text
                className={`mt-1 ${messageStatus ? "text-red-500" : "text-green-500"
                  }`}
              >
                {message}
              </Text>
            ) : null}
          </View>

          {/* Suggest Section */}
          <View className="flex-row items-center my-3 px-2 mt-4">
            <ThemedText>
              <FontAwesome name="lightbulb-o" size={26} />
            </ThemedText>
            <ThemedText className="text-xl ml-2 font-medium pt-1">
              Where to suggest this project
            </ThemedText>
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
            <ThemedText>
              <Entypo name="clipboard" size={24} />
            </ThemedText>
            <ThemedText className="text-xl ml-2 font-medium pt-1">
              Regularly Typed Words
            </ThemedText>
            <TouchableOpacity
              activeOpacity={0.6}
              className="ml-2 rounded-full bg-blue-700 w-7 h-7 flex justify-center items-center"
              onPress={() => setModalVisible(true)}
            >
              <FontAwesome name="info" size={15} color="white" />
            </TouchableOpacity>
          </View>

          <Input
            style={{ textAlignVertical: "top" }}
            multiline
            value={project.suggestions}
            onchange={(val) =>
              setProject((prev) => ({ ...prev, suggestions: val }))
            }
            placeholder="This input allows you to save commonly used words or phrases for project notes. Each word or phrase should be separated by the | character."
          />

          <View className="mt-2">
            <Button
              title={id ? "Update" : "Save"}
              onClickEvent={id ? handleUpdateProject : handleCreateProject}
              disabled={messageStatus} // Disable button if name is a duplicate
            />
          </View>
        </ThemedView>

        <ThemedText className="p-3 text-lg leading-7">
          Saving a project allows you to select it from the list of saved
          projects. This is useful in tracking shifts, trips, time, as well as
          fuel consumption or other expenses.
        </ThemedText>
      </View>

      <InfoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        message="You can save commonly used words or phrases for project notes here. 
        Separate each one using the | character."
      />
    </SafeAreacontext>
  );
};

// --- Reusable Section ---
const Section = ({ children }) => (
  <View className="flex-row justify-between items-center gap-4">
    {children}
  </View>
);

// --- Checkbox Input ---
const LabeledInput = ({ label, value, onChange }) => {
  const { darkMode } = useTheme()
  const finalColor = darkMode ? '#9ca3af' : '#646060ff'
  return (
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
        placeholderTextColor={finalColor}
        style={{ color: finalColor }}
      />
    </View>
  )
}

// --- Info Modal ---
const InfoModal = ({ visible, onClose, message }) => {
  const { darkMode } = useTheme()
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const modalBg = darkMode ? " bg-black/90" : " bg-black/80"
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
      <View className={`flex-1 ${modalBg} justify-center items-center px-3`}>
        <Animated.View style={{ opacity, transform: [{ scale }], width: "100%" }}>
          <ThemedView className=" rounded-2xl">
            <View className="flex-row justify-between items-center p-3">
              <ThemedText className="text-xl font-medium">
                About Regularly Typed Words
              </ThemedText>
              <TouchableOpacity className="p-1" onPress={onClose}>
                <ThemedText>
                  <AntDesign name="close" size={20} />
                </ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedView bgColor={"#000"} className="border-b" />
            <ThemedText color={"#374151"} className="text-2xl px-3 py-8 ">{message}</ThemedText>
            <ThemedView bgColor={"#000"} className="border-b mb-3" />
            <TouchableOpacity
              className="bg-gray-400 rounded-md py-2 px-6 self-end my-2 mx-3"
              onPress={onClose}
            >
              <Text className="text-white font-medium text-base">Close</Text>
            </TouchableOpacity>
          </ThemedView>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default AddingProject;