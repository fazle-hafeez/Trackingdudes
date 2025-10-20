import React from "react";
import { Modal, View, ActivityIndicator } from "react-native";

const LoadingComponent = ({ visible }) => {
  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
    >
      <View className="flex-1 bg-black/85 justify-center items-center">
        <View className="">
          <ActivityIndicator size={80} color="white" />
        </View>
      </View>
    </Modal>
  );
};

export default LoadingComponent;
