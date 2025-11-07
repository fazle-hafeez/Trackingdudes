import { Stack } from "expo-router";

export default function ProjectRootLayout() {
  return (
    <Stack screenOptions={{headerShown:false}}>
        <Stack.Screen name="myProjects"/>
        <Stack.Screen name="addingProject"/>
    </Stack>
  );
}
