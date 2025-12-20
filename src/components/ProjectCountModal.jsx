import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, Modal, FlatList, Animated, Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeProvider";
import { ThemedView, ThemedText } from "./ThemedColor";

const { height } = Dimensions.get("window");

const ProjectCountModal = ({ visible, onClose, onSelect }) => {
  const options = [5, 10, 15, 20, 25];
  const [selected, setSelected] = useState(null);
  const { darkMode } = useTheme()
  const slideAnim = React.useRef(new Animated.Value(height)).current;

  // Slide animation
  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleSelect = async (value) => {
    setSelected(value);
    try {
      await AsyncStorage.setItem("@project_count", value.toString());
      onSelect(value);
      setTimeout(onClose, 200);
    } catch (e) {
      console.log("Error saving project count:", e);
    }
  };

  const renderItem = ({ item }) => {
    const isSelected = item === selected;

    return (
      <TouchableOpacity
        onPress={() => handleSelect(item)}
        activeOpacity={0.8}
        className={`flex-1 mx-1 p-4 my-2 rounded-xl  items-center
           ${isSelected ? "bg-indigo-600" : darkMode ? "border border-gray-500" : "bg-gray-200"}`}
      >
        <Text
          className={`text-lg font-semibold text-center ${isSelected ? "text-white" : darkMode ? "text-gray-400" : "text-gray-800"
            }`}
        >
          {item}
        </Text>

        {isSelected && (
          <Ionicons name="checkmark-circle" size={22} color="white" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal transparent visible={visible} animationType="none">
      <View className={`flex-1 justify-end ${darkMode ? "bg-black/70" : "bg-black/80" } `}>
        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }]
            , backgroundColor: darkMode ? "#1f2937" : 'white'
          }}
          className=" rounded-t-3xl p-6 shadow-lg max-h-[70%]"
        >
          <ThemedText color={"#111827"} className="text-xl font-bold text-center mb-5 ">
            How many projects to show?
          </ThemedText>

          <FlatList
            key={"grid-3"}
            data={options}
            keyExtractor={(item) => item.toString()}
            renderItem={renderItem}
            numColumns={3}
            columnWrapperStyle={{ justifyContent: "space-between" }}
            contentContainerStyle={{ paddingBottom: 10 }}
          />

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            className={` ${darkMode ? "border border-gray-500" : "bg-gray-200"} rounded-xl py-3 mt-4 items-center`}
          >
            <ThemedText color={"#111827"} className=" font-bold text-lg">Cancel</ThemedText>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default ProjectCountModal;
