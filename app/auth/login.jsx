import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StatusBar, Platform, } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams } from "expo-router";

//Hooks
import { useApi } from "../../src/hooks/useApi";
import { useAuth } from "../../src/context/UseAuth";

//components
import CheckBox from "../../src/components/CheckBox";
import Button from "../../src/components/Button";
import PasswordInputField from "../../src/components/ToggleField";
import HeaderSection from "../../src/components/HeaderSection";
import Input from "../../src/components/Input";

const Login = () => {
  const [username, setUserName] = useState("");
  const [usernameError, setUserNameError] = useState("");
  const [password, setPassword] = useState("");
  const [passError, setPassError] = useState("");
  const [remember, setRemember] = useState(true);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [lastTriedUser, setLastTriedUser] = useState("");
  const { userName: routeUserName } = useLocalSearchParams()
  const router = useRouter();
  const { post } = useApi();
  const { showModal, setGlobalLoading, login } = useAuth();
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        //  For "Keep Logged In"
        const savedUsername = await AsyncStorage.getItem("savedUsername");
        const savedPassword = await SecureStore.getItemAsync("savedPassword");

        //  For "Remember Username"
        const rememberedUserName = await AsyncStorage.getItem("rememberedUserName");

        console.log("Saved username:", savedUsername);
        console.log("Remembered username:", rememberedUserName);

        if (savedUsername && savedPassword) {
          //  User chose "Keep Logged In"
          setUserName(savedUsername);
          setPassword(savedPassword);
          setKeepLoggedIn(true);
          setRemember(true);
        } else if (rememberedUserName) {
          //  User chose "Remember Username" only
          setUserName(rememberedUserName);
          setRemember(true);
          setKeepLoggedIn(false);
        } else {
          //  No saved info
          setUserName("");
          setPassword("");
          setKeepLoggedIn(false);
          setRemember(false);
        }
      } catch (err) {
        console.log("Error loading stored credentials:", err);
      }
    };

    loadCredentials();
  }, []);


  // handle param username
  useEffect(() => {
    if (routeUserName) {
      setUserName(routeUserName);
    }
  }, [routeUserName]);

  // Handle Login
  const handleLogin = async () => {
    let hasError = false;

    if (!username.trim()) {
      setUserNameError("Field is required");
      hasError = true;
    }
    if (!password.trim()) {
      setPassError("Field is required");
      hasError = true;
      return
    }

    if (hasError) return;

    setGlobalLoading(true);

    try {
      // const cleanUsername = username.trim().replace(/\s+/g, "");
      const cleanUsername = username.trim()
      const payload = {
        username: cleanUsername,
        password: password,
        keep_logged_in: keepLoggedIn,
      };

      const result = await post(
        "tokens/new",
        payload,
        false,
        false,
        { useBasicAuth: true }
      );
      if (result?.status === "success") {
        const userData = result?.user || { username: cleanUsername };
        //  Call global login handler
        await login(userData, result.tokens, {
          remember,
          keepLoggedIn
        });
        // Manage remembered username
        // Manage remembered credentials securely
        if (keepLoggedIn) {
          // Username → AsyncStorage (safe enough)
          await AsyncStorage.setItem("savedUsername", cleanUsername);
          // Password → SecureStore (encrypted)
          await SecureStore.setItemAsync("savedPassword", password);
        } else {
          await AsyncStorage.removeItem("savedUsername");
          await SecureStore.deleteItemAsync("savedPassword");
        }

        if (remember) {
          await AsyncStorage.setItem("rememberedUserName", cleanUsername);
        } else {
          await AsyncStorage.removeItem("rememberedUserName");
        }

        showModal(result.data || "you are  Login successful!", "success");
        setTimeout(() => {
          router.push("/dashboard/dashboardPage");
        }, 3000);
      }
      else if (result?.status === "error") {
        if (lastTriedUser === cleanUsername) {
          showModal("Too many login attempts. Please try again later.", "error");
          setTimeout(() => {
            router.push("/auth/signup")
          }, 2500);
        } else {
          showModal(result?.data || "Invalid username or password.", "error");
          setLastTriedUser(cleanUsername);
        }
      }
      else {
        showModal(result.data || "Something went wrong. Please try again.", "error");
      }
    } catch (error) {
      showModal("A server error occurred. Please try again later.", "error");
    } finally {
      setGlobalLoading(false);
    }
  };
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#0000ff" />
      <HeaderSection />

      <View className="flex-1 p-3">
        <View
          className={`bg-[rgba(255,255,255,0.9)] rounded-xl p-6 ${Platform.OS === "ios" ? " shadow-sm" : ""
            }`}
          style={{ marginTop: -230, elevation: 5 }}
        >
          <Text className="text-xl mb-2 text-headercolor">Enter your user name</Text>
          <Input
            value={username}
            placeholder="Type your username here"
            onchange={(val) => setUserName(val)}
            inputError={usernameError}
            setInputError={setUserNameError}

          />

          <Text className="text-xl mb-2 text-headercolor mt-2">Enter your password</Text>
          <PasswordInputField
            password={password}
            setPassword={setPassword}
            passwordError={passError}
            setPasswordError={setPassError}
            placeholder="Type your password here"
          />

          <View className="flex-row items-center my-3">
            <CheckBox
              value={remember}
              onClick={setRemember}
            />
            <Text className="text-lg ml-2 text-headercolor">Remember username</Text>
          </View>

          <View className="flex-row items-center">
            <CheckBox
              value={keepLoggedIn}
              onClick={setKeepLoggedIn}
            />
            <Text className="text-lg ml-2 text-headercolor">Keep logged in</Text>
          </View>

          <View className="mt-2">
            <Button title="Submit" onClickEvent={handleLogin} />
          </View>

          <View className="mt-2 items-center">
            <Text className="text-lg text-headercolor">
              No account yet?{" "}
              <Link className="text-blue-600 underline" href="/auth/signup">
                Sign up
              </Link>
            </Text>
            <Text className="mt-1 text-lg text-headercolor">
              Forgot password?{" "}
              <Link className="text-blue-600 underline" href="/auth/resetPassword">
                Reset
              </Link>
            </Text>
          </View>
        </View>

        <View className="mt-3 pl-2">
          <View className="flex-row">
            <Link href="/otherPages/home" className="text-blue-600 underline text-lg">
              Help
            </Link>
            <Link
              href="/otherPages/home"
              className="text-blue-600 underline ml-2 text-lg"
            >
              Terms of use
            </Link>
          </View>
          <Text className="text-lg text-headercolor">
            Logging into your tracker account
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Login;
