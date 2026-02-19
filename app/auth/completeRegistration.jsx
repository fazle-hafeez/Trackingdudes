import React, { useState } from "react";
import { View, Text, TextInput, StatusBar, Platform } from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

//components
import HeaderSection from "../../src/components/HeaderSection";
import Button from "../../src/components/Button";
import PasswordInputField from "../../src/components/ToggleField";
import Input from "../../src/components/Input";
import { ThemedView, ThemedText, SafeAreacontext } from "../../src/components/ThemedColor";

//Hooks
import { useApi } from "../../src/hooks/useApi";
import { useAuth } from "../../src/context/UseAuth";
import { useTheme } from "../../src/context/ThemeProvider";

const CompleteRegistration = () => {
  const { post } = useApi();
  const { darkMode } = useTheme()
  const { showModal, hideModal, setGlobalLoading, } = useAuth();
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [password, setPassword] = useState("");
  const [passError, setPassError] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPassError, setConfirmPassError] = useState("");

  //Register the user
  const handleRegister = async () => {
    let hasError = false;

    // Validation
    if (!username.trim()) {
      setUsernameError("Field is required");
      hasError = true;
      return;
    }
    if (!password.trim()) {
      setPassError("Field is required");
      hasError = true;
      return;
    } else if (password.trim().length < 8) {
      setPassError("Password must be at least 8 characters long.");
      hasError = true;
    } else if (
      !password.trim().match(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/
      )
    ) {
      showModal(
        "Password must include at least one uppercase letter, one lowercase letter, one digit, and one special character (e.g., @, $, !, %).",
        "error"
      );
      hasError = true;
    } else {
      setPassError("");
    }

    if (!confirmPassword.trim()) {
      setConfirmPassError("Field is required");
      hasError = true;
      return;
    } else if (password !== confirmPassword) {
      setConfirmPassError("Password and Confirm Password don't match");
      hasError = true;
    }

    if (hasError) return;
    setGlobalLoading(true);

    try {
      const cleanUsername = username.trim().replace(/\s+/g, "");
      const result = await post(
        "/register/create-user",
        {
          username: cleanUsername,
          password: password.trim(),
          confirm_password: confirmPassword.trim(),
        },
        { useBearerAuth: true } // use token
      );
      if (result.status === "success") {
        showModal(result.data || "User created successfully!", "success");
        setTimeout(() => {
          hideModal();
          router.push({
            pathname: "/auth/login",
            params: { userName: cleanUsername }
          });
        }, 3000);

      } else if (result.restart === true) {
        showModal(result?.data || "Please log in again.", "error");
        setTimeout(() => router.push("/auth/login"), 2000);
      } else {
        showModal(
          result?.data || "Something went wrong. Please try again later.",
          "error"
        );
      }
    } catch (error) {
      showModal(error?.error || "Network error occurred.", "error");
    } finally {
      setGlobalLoading(false);
    }
  };


  return (
    <SafeAreacontext className="flex-1 ">
      <HeaderSection />

      <View className="flex-1  p-4">
        <ThemedView
          bgColor={'rgba(255,255,255,0.9)'}
          className={` rounded-xl p-6 ${Platform.OS === "ios" ? " shadow-sm" : ''
            }`}
          style={{ marginTop: -230, elevation: 5 }}
        >
          <View className="mb-3">
            <ThemedText color="#646060ff" className=" text-2xl font-medium">
              Complete Registration
            </ThemedText>
          </View>
          {/* Username field */}
          <ThemedText color="#646060ff" className="text-xl mb-2 ">Enter your name</ThemedText>
          <Input
            value={username}
            placeholder="Type your user name here"
            onchange={(val) => setUsername(val)}
            inputError={usernameError}
            keyboardType="email-address"
            autoCapitalize="none"
            setInputError={setUsernameError}

          />


          {/* Password field */}
          <ThemedText color="#646060ff" className="text-xl mb-2  mt-2">Enter your password</ThemedText>
          <PasswordInputField
            password={password}
            setPassword={setPassword}
            passwordError={passError}
            setPasswordError={setPassError}
            placeholder={"Type your password here"}
          />

          {/* Confirm password */}
          <ThemedText color="#646060ff" className="text-xl mb-2  mt-2">Confirm password</ThemedText>

          <PasswordInputField
            password={confirmPassword}
            setPassword={setConfirmPassword}
            passwordError={confirmPassError}
            setPasswordError={setConfirmPassError}
            placeholder={"Type your C-password here"}
          />

          {/* Submit button */}
          <View className="mt-2">
            <Button title="Submit" onClickEvent={handleRegister} />
          </View>
          <View className={`border ${darkMode ? ' border-gray-700' : ' border-gray-300'} my-2`}></View>
          <View className="flex-row flex-nowrap">
            <ThemedText color="#646060ff" className="text-xl font-medium ">Already have an account? </ThemedText>
            <Link href="/auth/signup" className="text-customBlue underline text-xl">Login</Link>
          </View>
        </ThemedView>
      </View>
    </SafeAreacontext>
  );
};

export default CompleteRegistration
