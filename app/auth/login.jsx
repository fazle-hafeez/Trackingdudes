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
import { useTheme } from "../../src/context/ThemeProvider";

//components
import CheckBox from "../../src/components/CheckBox";
import Button from "../../src/components/Button";
import PasswordInputField from "../../src/components/ToggleField";
import HeaderSection from "../../src/components/HeaderSection";
import Input from "../../src/components/Input";
import { ThemedView, ThemedText, SafeAreacontext } from "../../src/components/ThemedColor";

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
        }, 2500);
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
    <SafeAreacontext className="flex-1">
      <HeaderSection />

      <View className="flex-1 p-3">
        <ThemedView
          bgColor={'rgba(255,255,255,0.9)'}
          className={` rounded-xl p-6 ${Platform.OS === "ios" ? " shadow-sm" : ""
            }`}
          style={{ marginTop: -230, elevation: 5 }}
        >
          <ThemedText color="#646060ff" className="text-xl mb-2 ">Enter your user name</ThemedText>
          <Input
            value={username}
            placeholder="Type your username here"
            onchange={(val) => setUserName(val)}
            inputError={usernameError}
            setInputError={setUserNameError}

          />

          <ThemedText color="#646060ff" className="text-xl mb-2  mt-2">Enter your password</ThemedText>
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
            <ThemedText color="#646060ff" className="text-lg ml-2">Remember username</ThemedText>
          </View>

          <View className="flex-row items-center">
            <CheckBox
              value={keepLoggedIn}
              onClick={setKeepLoggedIn}
            />
            <ThemedText color="#646060ff" className="text-lg ml-2 ">Keep logged in</ThemedText>
          </View>

          <View className="mt-2">
            <Button title="Submit" onClickEvent={handleLogin} />
          </View>

          <View className="mt-2 items-center">
            <ThemedText color="#646060ff" className="text-lg ">
              No account yet?{" "}
              <Link className="text-blue-600 underline" href="/auth/signup">
                Sign up
              </Link>
            </ThemedText>
            <ThemedText color="#646060ff" className="mt-1 text-lg ">
              Forgot password?{" "}
              <Link className="text-blue-600 underline" href="/auth/resetPassword">
                Reset
              </Link>
            </ThemedText>
          </View>
        </ThemedView>

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
          <ThemedText color="#646060ff" className="text-lg ">
            Logging into your tracker account
          </ThemedText>
        </View>
      </View>
    </SafeAreacontext>
  );
};

export default Login;
