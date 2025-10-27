
import Checkbox from "expo-checkbox";
import React from "react";

const CheckBox = ({ value, onClick, color, dimColor = false }) => {
  const activeColor = dimColor ? "#9ca3af" : (color || "#2563eb");

  return (
    <Checkbox
      value={value}
      onValueChange={onClick}
      color={value ? activeColor : undefined}
      style={{
        borderWidth: 2,
        borderColor: value ? activeColor : "#9ca3af",
        backgroundColor: value ? activeColor : "white",
        borderRadius: 5,
        width: 21,
        height: 21,
        opacity: dimColor ? 0.7 : 1, 
      }}
    />
  );
};

export default CheckBox;
