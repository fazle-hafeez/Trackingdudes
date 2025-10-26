// import { View, Text, TextInput, TouchableOpacity, Modal, Animated } from "react-native";
// import React, { useState, useRef, useEffect } from "react";
// import Checkbox from "expo-checkbox";
// import { FontAwesome6, FontAwesome, Entypo, AntDesign } from "@expo/vector-icons";
// import { SafeAreaView } from "react-native-safe-area-context";
// import PageHeader from "../../src/components/PageHeader";
// import Button from "../../src/components/Button";
// import { useApi } from "../../src/hooks/useApi";
// import { useAuth } from "../../src/context/UseAuth";
// import { router } from "expo-router";

// const AddingProject = () => {
//   const { post, get } = useApi();
//   const { showModal, setGlobalLoading, hideModal } = useAuth();
//   const [inShift, setInShift] = useState(true);
//   const [shiftInput, setShiftInput] = useState("In Shift");
//   const [inTrips, setInTrips] = useState(true);
//   const [inTripsInput, setInTripsInput] = useState("In Trips");
//   const [inTimes, setInTimes] = useState(true);
//   const [inTimsInput, setInTimsInput] = useState("In Times");
//   const [inExpenses, setInExpenses] = useState(true);
//   const [inExpensesInput, setInExpensesInput] = useState("In Expenses");
//   const [projectName, setProjectName] = useState("");
//   const [debouncedName, setDebouncedName] = useState("");
//   const [modalVisiblity, setModalVisible] = useState(false);
//   const [textArea, setTextArea] = useState("");
//   const [message, setMessage] = useState("");
//   const [messageStatus, setmessStatus] = useState(false)
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setDebouncedName(projectName.trim());
//     }, 600); // wait 600ms after typing stops
//     return () => clearTimeout(timer);
//   }, [projectName]);

//   useEffect(() => {
//     const checkAvailability = async () => {
//       if (!debouncedName) {
//         setMessage("");
//         return;
//       }
//       setMessage("Checking...");
//       try {
//         const res = await get(
//           `my-projects/check-project-availability?project=${encodeURIComponent(debouncedName)}`,
//           { useBearerAuth: true }
//         );
//         if (res?.status === "success") {
//           setMessage(res.data || "Available");
//           setmessStatus(false);
//         } else {
//           setMessage(res.data || "Already exists");
//           setmessStatus(true);
//         }
//       } catch (err) {
//         setMessage("Error checking name");
//         setmessStatus(true);
//       }
//     };

//     checkAvailability();
//   }, [debouncedName]);

//   const handleCreateProject = async () => {
//     let hasError = false;
//     if (!projectName.trim()) {
//       setMessage("Field is required")
//       setmessStatus(true)
//       hasError = true
//       return
//     }

//     if (hasError) return;
//     setGlobalLoading(true)
//     try {
//       const payload = {
//         project: projectName,
//         show_in_trips: inTrips,
//         show_in_shifts: inShift,
//         show_in_times: inTimes,
//         show_in_expenses: inExpenses,
//         suggestions: textArea,
//         status: 'enabled'
//       }
//       const result = await post(
//         "/my-projects/create-project/",
//         payload,
//         { useBearerAuth: true }
//       );
//       console.log(result);
//       if (result.status === "success") {
//         showModal(result.data || "Project created successfully!", "apisuccess", { apiSuccess: true }, {
//           onAddMore: () => hideModal(),
//           onViewAll: () => {
//             hideModal();
//             router.replace("/otherPages/myProjects");
//           }
//         });
//         setProjectName("")
//         setTextArea("")

//       }
//       else {
//         showModal(result.data || "You have already used the project name before. Please, try another name... ", "error")
//         setProjectName("")
//       }
//     } catch (error) {
//       showModal(error.error || " A server error accoured plz try again ", "error")
//     } finally {
//       setGlobalLoading(false)
//     }
//   }

//   return (
//     <SafeAreaView className="flex-1">
//       <PageHeader routes="Add Project" />
//       <View className="flex-1 bg-gray-100 p-4">
//         <View className="bg-white rounded-lg p-4" style={{ elevation: 5 }}>
//           {/* Header */}
//           <View className="flex-row items-center my-2 px-2">
//             <FontAwesome6 name="file-shield" size={24} color="black" />
//             <Text className="text-xl ml-2 font-medium pt-1">Project</Text>
//           </View>

//           <TextInput
//             className="rounded-lg border border-gray-400 mt-2 px-3 py-3 text-lg"
//             placeholder="Project name for easy reference"
//             value={projectName}
//             onChangeText={setProjectName}
//           />
//           {message ? (
//             <Text className={`mt-1 ${messageStatus ? "text-red-500" : "text-green-500"}`}>{message}</Text>
//           ) : null}

//           {/* Suggest Section */}
//           <View className="flex-row items-center my-3 px-2 mt-4">
//             <FontAwesome name="lightbulb-o" size={26} color="black" />
//             <Text className="text-xl ml-2 font-medium pt-1">
//               Where to suggest this project
//             </Text>
//           </View>

//           <Section>
//             <LabeledInput
//               checkVal={inShift}
//               setCheckVal={setInShift}
//               inputValue={shiftInput}
//               setInputVal={setShiftInput}
//             />
//             <LabeledInput
//               checkVal={inTrips}
//               setCheckVal={setInTrips}
//               inputValue={inTripsInput}
//               setInputVal={setInTripsInput}
//             />
//           </Section>

//           <Section>
//             <LabeledInput
//               checkVal={inTimes}
//               setCheckVal={setInTimes}
//               inputValue={inTimsInput}
//               setInputVal={setInTimsInput}
//             />
//             <LabeledInput
//               checkVal={inExpenses}
//               setCheckVal={setInExpenses}
//               inputValue={inExpensesInput}
//               setInputVal={setInExpensesInput}
//             />
//           </Section>

//           {/* Regularly Typed Words */}
//           <View className="flex-row items-center px-2 my-3">
//             <Entypo name="clipboard" size={24} color="black" />
//             <Text className="text-xl ml-2 font-medium pt-1">
//               Regularly Typed Words
//             </Text>
//             <TouchableOpacity
//               activeOpacity={0.6}
//               className="ml-2"
//               onPress={() => setModalVisible(true)}
//             >
//               <FontAwesome name="info-circle" size={24} color="blue" />
//             </TouchableOpacity>
//           </View>

//           <View className="my-2">
//             <TextInput
//               className="border border-gray-400 rounded-lg p-3 text-lg pb-9"
//               multiline
//               onChangeText={setTextArea}
//               value={textArea}
//               placeholder="Save commonly used words or phrases for project notes. Separate each with | character."
//             />
//           </View>

//           <Button title="Save" onClickEvent={handleCreateProject} />
//         </View>

//         <Text className="p-3 text-lg leading-6">
//           Saving a project allows you to select it from the list of saved projects.
//           This is useful in tracking shifts, trips,
//           time, as well as fuel consumption or other expenses.</Text>
//       </View>

//       <InfoModal
//         visible={modalVisiblity}
//         onClose={() => setModalVisible(false)}
//         message="This input allows you to save commonly used words or phrases for project notes. Each word or phrase should be separated by the | character."
//       />
//     </SafeAreaView>
//   );
// };

// // --- Section Component ---
// const Section = ({ children }) => (
//   <View className="flex-row justify-between items-center gap-4">{children}</View>
// );

// const LabeledInput = ({ checkVal, setCheckVal, inputValue, setInputVal }) => {
//   return (
//     <View className="flex-row items-center my-2 w-[49%] px-2">
//       <View className="absolute -left-1 z-10">
//         <Checkbox
//           value={checkVal}
//           onValueChange={setCheckVal}
//           color={checkVal ? "#2563eb" : ""}
//         />
//       </View>

//       <TextInput
//         className="border border-gray-400 rounded-lg pl-5 pr-3 py-2 text-base flex-1"
//         value={inputValue}
//         onChangeText={setInputVal}
//         editable={false}
//       />
//     </View>
//   );
// };

// // --- Centered Modal with Fade + Scale Animation ---
// const InfoModal = ({ visible, onClose, message }) => {
//   const opacity = useRef(new Animated.Value(0)).current;
//   const scale = useRef(new Animated.Value(0.8)).current;

//   useEffect(() => {
//     if (visible) {
//       Animated.parallel([
//         Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
//         Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
//       ]).start();
//     } else {
//       Animated.parallel([
//         Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
//         Animated.timing(scale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
//       ]).start();
//     }
//   }, [visible]);

//   return (
//     <Modal transparent visible={visible} animationType="none">
//       <View className="flex-1 bg-black/80 justify-center items-center px-3">
//         <Animated.View
//           style={{
//             opacity,
//             transform: [{ scale }],
//             width: "100%",
//           }}
//         >
//           <View className="bg-white rounded-2xl">
//             <View className="flex-row justify-between items-center p-3">
//               <Text className="text-xl font-medium">About Regularly Typed Words</Text>
//               <TouchableOpacity
//                 className="border border-gray-400 rounded-lg p-1"
//                 onPress={onClose}
//               >
//                 <AntDesign name="close" size={20} color="black" />
//               </TouchableOpacity>
//             </View>
//             <View className="border-b" />
//             <Text className="text-2xl font-normal p-3">{message}</Text>
//             <View className="border-b mb-3" />
//             <TouchableOpacity
//               className="bg-gray-400 rounded-md py-2 px-5 self-end my-2 mx-3"
//               onPress={onClose}
//             >
//               <Text className="text-white font-medium text-base">Close</Text>
//             </TouchableOpacity>
//           </View>
//         </Animated.View>
//       </View>
//     </Modal>
//   );
// };

// export default AddingProject;

import { View, Text, TextInput, TouchableOpacity, Modal, Animated } from "react-native";
import React, { useState, useRef, useEffect } from "react";
import Checkbox from "expo-checkbox";
import { FontAwesome6, FontAwesome, Entypo, AntDesign } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from "../../src/components/PageHeader";
import Button from "../../src/components/Button";
import { useApi } from "../../src/hooks/useApi";
import { useAuth } from "../../src/context/UseAuth";
import { router } from "expo-router";

const AddingProject = () => {
  const { post, get } = useApi();
  const { showModal, setGlobalLoading, hideModal } = useAuth();

  const [inShift, setInShift] = useState(true);
  const [shiftInput, setShiftInput] = useState("In Shift");
  const [inTrips, setInTrips] = useState(true);
  const [inTripsInput, setInTripsInput] = useState("In Trips");
  const [inTimes, setInTimes] = useState(true);
  const [inTimsInput, setInTimsInput] = useState("In Times");
  const [inExpenses, setInExpenses] = useState(true);
  const [inExpensesInput, setInExpensesInput] = useState("In Expenses");

  const [projectName, setProjectName] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const [textArea, setTextArea] = useState("");
  const [message, setMessage] = useState("");
  const [messageStatus, setMessStatus] = useState(false);
  const [modalVisibility, setModalVisible] = useState(false);

  // Debounce project name check
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(projectName.trim());
    }, 600);
    return () => clearTimeout(timer);
  }, [projectName]);

  // Check project name availability
  useEffect(() => {
    const checkAvailability = async () => {
      if (!debouncedName) {
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
          setMessStatus(false);
        } else {
          setMessage(res.data || "Already exists");
          setMessStatus(true);
        }
      } catch (err) {
        setMessage("Error checking name");
        setMessStatus(true);
      }
    };
    checkAvailability();
  }, [debouncedName]);

  // Handle project creation
  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      setMessage("Field is required");
      setMessStatus(true);
      return;
    }

    setGlobalLoading(true);
    try {
      const payload = {
        project: projectName,
        show_in_trips: inTrips,
        show_in_shifts: inShift,
        show_in_times: inTimes,
        show_in_expenses: inExpenses,
        suggestions: textArea,
        status: "enabled",
      };

      const result = await post("/my-projects/create-project/", payload, {
        useBearerAuth: true,
      });

      if (result.status === "success") {
        // Show dynamic buttons using new modal system
        showModal(
          result.data || "Project created successfully!",
          "success",
          false,
          [
            {
              label: "Add More",
              bgColor: "bg-green-600",
              onPress: () => hideModal(),
            },
            {
              label: "View All",
              bgColor: "bg-blue",
              onPress: () => {
                hideModal();
                router.replace("/otherPages/myProjects");
              },
            },
          ]
        );
        setProjectName("")
        setInShift(true)
        setInExpenses(true)
        setInTimes(true)
        setInTrips(true)
        setTextArea("");
      } else {
        showModal(
          result.data ||
          "You have already used the project name before. Please try another name...",
          "error"
        );
        setProjectName("");
      }
    } catch (error) {
      showModal(error.error || "A server error occurred, please try again", "error");
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1">
      <PageHeader routes="Add Project" />
      <View className="flex-1 bg-gray-100 p-4">
        <View className="bg-white rounded-lg p-4" style={{ elevation: 5 }}>
          {/* Header */}
          <View className="flex-row items-center my-2 px-2">
            <FontAwesome6 name="file-shield" size={24} color="black" />
            <Text className="text-xl ml-2 font-medium pt-1">Project</Text>
          </View>

          <TextInput
            className="rounded-lg border border-gray-400 mt-2 px-3 py-3 text-lg"
            placeholder="Project name for easy reference"
            value={projectName}
            onChangeText={setProjectName}
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
              checkVal={inShift}
              setCheckVal={setInShift}
              inputValue={shiftInput}
              setInputVal={setShiftInput}
            />
            <LabeledInput
              checkVal={inTrips}
              setCheckVal={setInTrips}
              inputValue={inTripsInput}
              setInputVal={setInTripsInput}
            />
          </Section>

          <Section>
            <LabeledInput
              checkVal={inTimes}
              setCheckVal={setInTimes}
              inputValue={inTimsInput}
              setInputVal={setInTimsInput}
            />
            <LabeledInput
              checkVal={inExpenses}
              setCheckVal={setInExpenses}
              inputValue={inExpensesInput}
              setInputVal={setInExpensesInput}
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
              className="ml-2"
              onPress={() => setModalVisible(true)}
            >
              <FontAwesome name="info-circle" size={24} color="blue" />
            </TouchableOpacity>
          </View>

          <View className="my-2">
            <TextInput
              className="border border-gray-400 rounded-lg p-3 text-lg pb-9"
              multiline
              onChangeText={setTextArea}
              value={textArea}
              placeholder="Save commonly used words or phrases for project notes. Separate each with | character."
            />
          </View>

          <Button title="Save" onClickEvent={handleCreateProject} />
        </View>

        <Text className="p-3 text-lg leading-6">
          Saving a project allows you to select it from the list of saved projects.
          This is useful in tracking shifts, trips, time, as well as fuel consumption or other expenses.
        </Text>
      </View>

      <InfoModal
        visible={modalVisibility}
        onClose={() => setModalVisible(false)}
        message="This input allows you to save commonly used words or phrases for project notes. Each word or phrase should be separated by the | character."
      />
    </SafeAreaView>
  );
};

// --- Section Component ---
const Section = ({ children }) => (
  <View className="flex-row justify-between items-center gap-4">{children}</View>
);

const LabeledInput = ({ checkVal, setCheckVal, inputValue, setInputVal }) => {
  return (
    <View className="flex-row items-center my-2 w-[49%] px-2">
      <View className="absolute -left-1 z-10">
        <Checkbox value={checkVal} onValueChange={setCheckVal} color={checkVal ? "#2563eb" : ""} />
      </View>

      <TextInput
        className="border border-gray-400 rounded-lg pl-5 pr-3 py-2 text-base flex-1"
        value={inputValue}
        onChangeText={setInputVal}
        editable={false}
      />
    </View>
  );
};

// --- Centered Modal with Fade + Scale Animation ---
const InfoModal = ({ visible, onClose, message }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none">
      <View className="flex-1 bg-black/80 justify-center items-center px-3">
        <Animated.View style={{ opacity, transform: [{ scale }], width: "100%" }}>
          <View className="bg-white rounded-2xl">
            <View className="flex-row justify-between items-center p-3">
              <Text className="text-xl font-medium">About Regularly Typed Words</Text>
              <TouchableOpacity className="border border-gray-400 rounded-lg p-1" onPress={onClose}>
                <AntDesign name="close" size={20} color="black" />
              </TouchableOpacity>
            </View>
            <View className="border-b" />
            <Text className="text-2xl font-normal p-3">{message}</Text>
            <View className="border-b mb-3" />
            <TouchableOpacity className="bg-gray-400 rounded-md py-2 px-5 self-end my-2 mx-3" onPress={onClose}>
              <Text className="text-white font-medium text-base">Close</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default AddingProject;
