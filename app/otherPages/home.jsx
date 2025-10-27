import React from "react";
import {View,Text,StatusBar,ImageBackground,TouchableOpacity,} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const Home = () => {
  const router = useRouter();
  const handleLogout = async () => {
   
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar barStyle="light-content" backgroundColor="#0000ff" />
      <ImageBackground
        source={require("../../assets/images/clean5.png")}
        className="h-[400px] w-full  relative"
      >
        <TouchableOpacity
          className="bg-customBlue w-26 rounded-md p-2 absolute bottom-28 self-center"
          onPress={handleLogout}
        >
          <View className="flex-row justify-center items-center">
            <Text className="text-white text-2xl">signUp</Text>
            <Ionicons
              className="ml-1"
              name="log-out-outline"
              size={25}
              color="white"
            />
          </View>
        </TouchableOpacity>
      </ImageBackground>

      <View className="relative bg-white">
        <View
          className="flex-row p-3 bg-customBlue m-3 rounded-xl justify-center items-center"
          style={{ marginTop: -50 }}
        >
          <TouchableOpacity className="w-1/3">
            <MaterialIcons
              name="person-add-alt-1"
              size={32}
              color="white"
              className="m-auto"

            />
            <Text className="text-white text-xl font-normal m-auto my-1">
              Sign-Up
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="w-1/3">
            <FontAwesome6
              name="hand-holding-dollar"
              size={32}
              color="white"
              className="m-auto"

            />
            <Text className="text-white text-xl font-normal m-auto my-1">
              Pricing
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="w-1/3">
            <MaterialCommunityIcons
              name="fan"
              size={32}
              color="white"
              className="m-auto"
            />
            <Text className="text-white text-xl font-normal m-auto my-1">
              More
            </Text>
          </TouchableOpacity>
        </View>
        <Text className="text-center text-2xl font-semibold pb-2">
          Tracking Dudes LLC
        </Text>
      </View>

      <View className="bg-white m-3 h-12 justify-center"></View>
      <View className="bg-white flex-1"></View>
    </SafeAreaView>
  );
};

export default Home;
