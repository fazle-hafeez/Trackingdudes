import { Stack } from "expo-router";

export default function ExpensesRootLayout() {
  return (
    <Stack screenOptions={{headerShown:false}}>
        <Stack.Screen name="expensesReport"/>
        <Stack.Screen name="addExpenses"/>
        <Stack.Screen name="expense"/>
        <Stack.Screen name="vendor"/>
        <Stack.Screen name="paymentType"/>
        <Stack.Screen name="reporting"/>
        <Stack.Screen name="category"/>
    </Stack>
  );
}
