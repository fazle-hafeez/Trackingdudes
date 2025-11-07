import { Stack } from "expo-router";

export default function VehiclesRootLayout() {
  return (
    <Stack screenOptions={{headerShown:false}}>
        <Stack.Screen name="myVehicles"/>
        <Stack.Screen name="addVehicles"/>
    </Stack>
  );
}
