import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="signup" />
      <Stack.Screen name="login" />
      <Stack.Screen name="changePassword" />
      <Stack.Screen name="resetPassword" />
      <Stack.Screen name="emailVerification" />
      <Stack.Screen name="completeRegistration" />

    </Stack>
  );
}
