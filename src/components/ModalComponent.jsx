import React, { useEffect } from "react";
import { Modal, View, Text, TouchableOpacity, Image } from "react-native";

const ModalComponent = ({ visible, onClose, message, errorType }) => {
  let imageSource;
  let autoHide = false; 

  switch (errorType) {
    case "error":
      imageSource = require("../../assets/images/cross-markup.png");
      autoHide = false; 
      break;
    case "success":
      imageSource = require("../../assets/images/check-markup.png");
      autoHide = true; 
      break;
    case "warning":
      imageSource = null;
      autoHide = false; // manual close
      break;
    default:
      imageSource = require("../../assets/images/check-markup.png");
      autoHide = true;
  }

  //  Auto-hide logic (for success only)
  useEffect(() => {
    let timer;
    if (visible && autoHide) {
      timer = setTimeout(() => {
        onClose && onClose();
      }, 2500); 
    }
    return () => clearTimeout(timer);
  }, [visible, autoHide, onClose]);

  return (
    <Modal transparent={true} visible={visible} animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/85">
        <View className="bg-[rgba(255,255,255,0.9)] p-6 rounded-2xl w-11/12 max-w-sm items-center">
          <View className="mb-1">
            {errorType === "warning" ? (
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 50,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 3,
                  borderColor: "#FFA500",
                }}
              >
                <Text style={{ fontSize: 48, color: "orange", fontWeight: "bold" }}>!</Text>
              </View>
            ) : (
              <Image source={imageSource} style={{ width: 105, height: 105 }} />
            )}
          </View>

          <Text className="text-2xl mb-3 text-headercolor font-normal text-center">
            {message}
          </Text>

          {/* Only show close button if NOT auto-hide */}
          {!autoHide && (
            <TouchableOpacity
              onPress={onClose}
              className="mt-2 w-full bg-blue p-3 rounded-md mb-1"
              activeOpacity={0.6}
            >
              <Text className="font-semibold text-white text-center text-xl">Close</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default ModalComponent;
