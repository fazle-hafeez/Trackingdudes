import { View, Text, TextInput, TouchableOpacity, Modal, Animated } from "react-native";
import React, { useState, useRef, useEffect } from "react";
import Checkbox from "expo-checkbox";
import { FontAwesome6, FontAwesome, Entypo, AntDesign } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from "../../src/components/PageHeader";
import Button from "../../src/components/Button";
import ModalComponent from "../../src/components/ModalComponent";
import LoadingComponent from "../../src/components/LoadingComponent";
import { useApi } from "../../src/hooks/useApi";
import { useAuth } from "../../src/context/UseAuth";

const AddingProject = () => {
    const { post,get} = useApi();
      const {showModal, hideModal, modalVisibel,modalMessage, modalType,setGlobalLoading,globalLoading,} = useAuth();
  const [inShift, setInShift] = useState(true);
  const [shiftInput, setShiftInput] = useState("In Shift");
  const [inTrips, setInTrips] = useState(true);
  const [inTripsInput, setInTripsInput] = useState("In Trips");
  const [inTimes, setInTimes] = useState(true);
  const [inTimsInput, setInTimsInput] = useState("In Times");
  const [inExpenses, setInExpenses] = useState(true);
  const [inExpensesInput, setInExpensesInput] = useState("In Expenses");
  const [projectName, setProjectName] = useState("");
  const [modalVisiblity, setModalVisible] = useState(false);
  const [textArea, setTextArea] = useState("");
   const [message, setMessage] = useState("");
   const [messageStatus,setmessStatus] = useState(false)
//   GET /apis/my-projects/check-project-availability?project=Weekly%20Reports
// Authorization: Bearer <access_token>
 const handleChange = async (text) => {
    setProjectName(text);

    if (text.trim() === "") {
      setMessage("");
      return;
    }

    try {
      const res = await get(
        `/my-projects/check-project-availability?project=${encodeURIComponent(text)}`,
        { useBearerAuth:true}
      );
  console.log(res);
      if (res?.status === "success") {
        setMessage( res.data||" Available");
        setmessStatus(false)
      } else {
        setMessage( res.data ||"Already exists");
        setmessStatus(true)
      }
    } catch (err) {
      console.log(err);
      setMessage("Error checking name");
      setMessage(true)
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
            className="rounded-lg border border-gray-400 my-2 px-3 py-3 text-lg"
            placeholder="Project name for easy reference"
            value={projectName}
            onChangeText={handleChange}
          />
          {message ? (
        <Text className={`${messageStatus ? 'text-red-500' :'text-green-500'}`}>{message}</Text>
      ) : null}

          {/* Suggest Section */}
          <View className="flex-row items-center my-3 px-2">
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

          <Button title="Save" onClickEvent={() => console.log("Save clicked")} />
        </View>

        <Text className="p-3 text-lg leading-6">
            Saving a project allows you to select it from the list of saved projects. 
            This is useful in tracking shifts, trips, 
            time, as well as fuel consumption or other expenses.</Text>
      </View>

      <InfoModal
        visible={modalVisiblity}
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
        <Checkbox
          value={checkVal}
          onValueChange={setCheckVal}
          color={checkVal ? "#2563eb" : ""}
        />
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
        <Animated.View
          style={{
            opacity,
            transform: [{ scale }],
            width: "100%",
          }}
        >
          <View className="bg-white rounded-2xl">
            <View className="flex-row justify-between items-center p-3">
              <Text className="text-xl font-medium">About Regularly Typed Words</Text>
              <TouchableOpacity
                className="border border-gray-400 rounded-lg p-1"
                onPress={onClose}
              >
                <AntDesign name="close" size={20} color="black" />
              </TouchableOpacity>
            </View>
            <View className="border-b" />
            <Text className="text-2xl font-normal p-3">{message}</Text>
            <View className="border-b mb-3" />
            <TouchableOpacity
              className="bg-gray-400 rounded-md py-2 px-5 self-end my-2 mx-3"
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
