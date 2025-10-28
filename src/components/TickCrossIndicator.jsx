// TickCrossIndicator.jsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const TickCrossIndicator = ({ checked, label }) => (
  <View style={styles.container}>
    <Text
      style={[
        styles.icon,
        { color: checked ? "green" : "red" }
      ]}
      accessibilityLabel={checked ? "Checked" : "Not checked"}
    >
      {checked ? "✔" : "✖"}
    </Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5, 
  },
  icon: {
    fontWeight: "bold",
    fontSize: 20,
  },
  label: {
    fontSize: 16,
  },
});

export default TickCrossIndicator;
