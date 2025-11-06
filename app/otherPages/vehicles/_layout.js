import { Stack } from "expo-router";

export default function OtherPages() {
  return (
    <Stack screenOptions={{headerShown:false}}>
        <Stack.Screen name="myVehicles"/>
    </Stack>
  );
}
