import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Animated,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

const ProjectCountModal = ({ visible, onClose, onSelect }) => {
  const options = [5, 10, 15, 20, 25];
  const [selected, setSelected] = useState(null);
  const slideAnim = React.useRef(new Animated.Value(height)).current;

  // Slide-up animation
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
        className={`flex-row justify-between items-center p-4 my-2 rounded-xl shadow ${
          isSelected ? "bg-indigo-600" : "bg-gray-100"
        }`}
      >
        <Text className={`text-lg font-semibold ${isSelected ? "text-white" : "text-gray-800"}`}>
          {item} Projects
        </Text>
        {isSelected && <Ionicons name="checkmark-circle" size={22} color="white" />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal transparent visible={visible} animationType="none">
      <View className="flex-1 justify-end bg-black/40">
        <Animated.View
          style={{ transform: [{ translateY: slideAnim }] }}
          className="bg-white rounded-t-3xl p-6 shadow-lg max-h-[70%]"
        >
          <Text className="text-xl font-bold text-center mb-5 text-gray-900">
            How many projects to show?
          </Text>

          <FlatList
            data={options}
            keyExtractor={(item) => item.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 10 }}
          />

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            className="bg-gray-200 rounded-xl py-3 mt-4 items-center"
          >
            <Text className="text-gray-900 font-bold text-lg">Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default ProjectCountModal;
