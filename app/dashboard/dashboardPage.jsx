import { View, Text, TouchableOpacity, ScrollView, StatusBar,StyleSheet } from 'react-native';
import { FontAwesome5, MaterialIcons, Entypo } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from 'expo-router';

export default function Dashboard() {
  const navigation = useNavigation();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-blue-50 relative">
      <StatusBar barStyle="light-content" backgroundColor="#0000ff" />
      {/*  Fixed Header */}
      <View
        className="flex-row items-center bg-customBlue px-5 py-3"
        style={styles.menu}
      >
        <Entypo
          name="menu"
          size={30}
          color="white"
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        />
        <Text className="text-white text-xl ml-3">Menu</Text>
      </View>

      {/*  Scrollable content below */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 60 }}
      >
        <Section title="Active features">
          <Feature
            icon={<MaterialIcons name="access-time" size={38} color="blue" />}
            label="Shifts data"
            onPress={() => router.push("/dashboard/shiftsData")}
          />
          <Feature
            icon={<FontAwesome5 name="route" size={38} color="blue" />}
            label="Trips data"
            onPress={() => router.push("/dashboard/tripsData")}
          />
          <Feature
            icon={<FontAwesome5 name="gas-pump" size={38} color="blue" />}
            label="Fuel refills"
            onPress={() => router.push("/dashboard/fuelRefills")}
          />
        </Section>

        <Section title="User preferences">
          <Feature
            icon={<FontAwesome5 name="car" size={38} color="blue" />}
            label="My vehicles"
            onPress={() => router.push("/otherPages/vehicles/myVehicles")}
          />
          <Feature
            icon={<FontAwesome5 name="file-alt" size={38} color="blue" />}
            label="My projects"
            onPress={() => router.push("/otherPages/myProjects")}
          />
        </Section>

        <Section title="Future features">
          <Feature
            icon={<FontAwesome5 name="receipt" size={38} color="blue" />}
            label="Expenses"
            onPress={() => router.push("/otherPages/expenses")}
          />
          <Feature
            icon={<FontAwesome5 name="user-clock" size={38} color="blue" />}
            label="Time spent"
            onPress={() => router.push("/otherPages/timeSpent")}
          />
          <Feature
            icon={<FontAwesome5 name="cubes" size={38} color="blue" />}
            label="Inventory"
            onPress={() => router.push("/otherPages/inventory")}
          />
          <Feature
            icon={<FontAwesome6 name="circle-dollar-to-slot" size={38} color="blue" />}
            label="Savings"
            onPress={() => router.push("/otherPages/savings")}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const Section = ({ title, children }) => (
  <View className="bg-white m-4 rounded-lg p-4">
    <Text className="text-2xl font-medium border-b text-headercolor border-orange-400 pb-2 mb-3">
      {title}
    </Text>
    <View className="flex-row flex-wrap justify-between">{children}</View>
  </View>
);

const Feature = ({ icon, label, onPress }) => (
  <TouchableOpacity
    className="w-[48%] rounded-lg p-4 items-center mb-3 border border-gray-300"
    onPress={onPress}
    activeOpacity={0.7}
  >
    {icon}
    <Text className="mt-3 text-center text-xl text-headercolor">{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 5
  }
})