import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StatusBar, Platform, } from "react-native";
import Checkbox from "expo-checkbox";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import HeroSection from "../../src/components/HeroSection";
import Button from "../../src/components/Button";
import ModalComponent from "../../src/components/ModalComponent";
import LoadingComponent from "../../src/components/LoadingComponent";
import PasswordInputField from "../../src/components/ToggleField";
import { useApi } from "../../src/hooks/useApi";
import { useAuth } from "../../src/context/UseAuth";

const Login = () => {
  const [username, setUserName] = useState("");
  const [usernameError, setUserNameError] = useState("");
  const [password, setPassword] = useState("");
  const [passError, setPassError] = useState("");
  const [remember, setRemember] = useState(true);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [lastTriedUser, setLastTriedUser] = useState("");

  const router = useRouter();
  const { post,put} = useApi();
  const { showModal, hideModal, modalVisible, modalMessage, modalType, setGlobalLoading, globalLoading, } = useAuth();

  //  Load saved username
  useEffect(() => {
    (async () => {
      try {
        const savedName = await AsyncStorage.getItem("rememberedUserName");
        if (savedName) setUserName(savedName);
      } catch (err) {
        console.warn("Failed to load remembered username:", err);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const savedName = await AsyncStorage.getItem("user");
        const parsed = JSON.parse(savedName)
        if (parsed) setUserName(parsed.username);
      } catch (err) {
        console.warn("Failed to load remembered username:", err);
      }
    })();
  }, []);
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
      const cleanUsername = username.trim().replace(/\s+/g, "");
      const payload = {
        username: cleanUsername,
        password,
        keep_logged_in: keepLoggedIn,
      };

      const result = await put("/tokens/refresh/", payload);

      if (result?.status === "success") {
        await AsyncStorage.setItem("tokens", JSON.stringify(result.tokens));

        if (remember) {
          await AsyncStorage.setItem("rememberedUserName", cleanUsername);
        } else {
          await AsyncStorage.removeItem("rememberedUserName");
        }

        showModal(result.data || "you are  Login successful!", "success");
        setTimeout(() => {
          hideModal();
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
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#0000ff" />
      <HeroSection />

      <View className="flex-1 p-4">
        <View
          className={`bg-[rgba(255,255,255,0.9)] rounded-xl p-6 ${Platform.OS === "ios" ? " shadow-sm" : ""
            }`}
          style={{ marginTop: -230, elevation: 5 }}
        >
          <Text className="text-xl mb-2 text-headercolor">Enter your user name</Text>
          <TextInput
            className={`rounded-md text-lg text-headercolor border ${usernameError ? "border-red-500" : "border-gray-400"
              }`}
            placeholder="Type your username here"
            keyboardType="email-address"
            autoCapitalize="none"
            value={username}
            onChangeText={(val) => {
              setUserName(val);
              setUserNameError("");
            }}
          />
          {usernameError && (
            <Text className="text-sm text-red-500 my-1">{usernameError}</Text>
          )}

          <Text className="text-xl mb-2 text-headercolor mt-2">Enter your password</Text>
          <PasswordInputField
            password={password}
            setPassword={setPassword}
            passwordError={passError}
            setPasswordError={setPassError}
            placeholder="Type your password here"
          />

          <View className="flex-row items-center my-3">
            <Checkbox
              value={remember}
              onValueChange={setRemember}
              color={remember ? "#0000ff" : ""}
            />
            <Text className="text-lg ml-2 text-headercolor">Remember username</Text>
          </View>

          <View className="flex-row items-center">
            <Checkbox
              value={keepLoggedIn}
              onValueChange={setKeepLoggedIn}
              color={keepLoggedIn ? "#0000ff" : ""}
            />
            <Text className="text-lg ml-2 text-headercolor">Keep logged in</Text>
          </View>

          <View className="mt-2">
            <Button title="Submit" onClickEvent={handleLogin} />
          </View>

          <View className="mt-2 items-center">
            <Text className="text-lg text-headercolor">
              No account yet?{" "}
              <Link className="text-blue underline" href="/auth/signup">
                Sign up
              </Link>
            </Text>
            <Text className="mt-1 text-lg text-headercolor">
              Forgot password?{" "}
              <Link className="text-blue underline" href="/auth/resetPassword">
                Reset
              </Link>
            </Text>
          </View>
        </View>

        <View className="mt-3 pl-2">
          <View className="flex-row">
            <Link href="/otherPages/home" className="text-blue underline text-lg">
              Help
            </Link>
            <Link
              href="/otherPages/home"
              className="text-blue underline ml-2 text-lg"
            >
              Terms of use
            </Link>
          </View>
          <Text className="text-lg text-headercolor">
            Logging into your tracker account
          </Text>
        </View>
      </View>

      <ModalComponent
        visible={modalVisible}
        onClose={hideModal}
        message={modalMessage}
        errorType={modalType}
      />
      <LoadingComponent visible={globalLoading} />
    </SafeAreaView>
  );
};

export default Login;
