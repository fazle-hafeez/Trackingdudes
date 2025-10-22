import React, { useState } from "react";
import { View, Text, TextInput, StatusBar, Platform } from "react-native";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import HeroSection from "../../src/components/HeroSection";
import Button from "../../src/components/Button";
import ModalComponent from "../../src/components/ModalComponent";
import LoadingComponent from "../../src/components/LoadingComponent";
import PasswordInputField from "../../src/components/ToggleField";
import { useApi } from "../../src/hooks/useApi";
import { useAuth } from "../../src/context/UseAuth";
const CompleteRegistration = () => {
  const router = useRouter();
  const { post } = useApi();
  const {
    showModal,
    hideModal,
    modalVisible,
    modalMessage,
    modalType,
    setGlobalLoading,
    globalLoading,
  } = useAuth();
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
    }
    if (!password.trim()) {
      setPassError("Field is required");
      hasError = true;
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
    } else if (password !== confirmPassword) {
      setConfirmPassError("Password and Confirm Password don't match");
      hasError = true;
    }

    if (hasError) return;
    setGlobalLoading(true);

    try {
      const cleanUsername = username.trim().replace(/\s+/g, "");
      const result = await post(
        "/register/create-user/",
        {
          username: cleanUsername,
          password: password.trim(),
          confirm_password: confirmPassword.trim(),
        },
       { useBearerAuth:true} // use token
      );
   console.log("complete registration result :", result);
   
      if (result.status === "success") {
        showModal(result.data || "User created successfully!", "success");
        setTimeout(() => {
          hideModal();
          router.push({
            pathname:"/auth/login",
            params:{userName:cleanUsername}
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
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#0000ff" />
      <HeroSection />

      <View className="flex-1  p-4">
        <View
          className={`bg-[rgba(255,255,255,0.9)] rounded-xl p-6 ${Platform.OS === "ios" ? " shadow-sm" : ''
            }`}
          style={{ marginTop: -230, elevation: 5 }}
        >
          <View className="mb-3">
            <Text className="text-headercolor text-2xl font-medium">
              Complete Registration
            </Text>
          </View>
          {/* Username field */}
          <Text className="text-xl mb-2 text-headercolor">Enter your name</Text>
          <TextInput
            className={`rounded-md text-lg text-headercolor border ${usernameError ? "border-red-500" : "border-gray-400"
              }`}
            placeholder="Type your name here"
            autoFocus
            keyboardType="email-address"
            autoCapitalize="none"
            value={username}
            onChangeText={(val) => {
              setUsername(val);
              setUsernameError("");
            }}
          />
          {usernameError ? (
            <Text className="text-sm text-red-500 my-1">{usernameError}</Text>
          ) : null}

          {/* Password field */}
          <Text className="text-xl mb-2 text-headercolor mt-2">Enter your password</Text>
          <PasswordInputField
            password={password}
            setPassword={setPassword}
            passwordError={passError}
            setPasswordError={setPassError}
            placeholder={"Type your password here"}
          />

          {/* Confirm password */}
          <Text className="text-xl mb-2 text-headercolor mt-2">Confirm password</Text>

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
          <View className="border border-gray-200 my-2"></View>
          <View className="flex-row flex-nowrap">
            <Text className="text-xl font-medium text-headercolor">Already have an account? </Text>
            <Link href="/auth/signup" className="text-blue underline text-xl">Login</Link>
          </View>
        </View>
      </View>

      {/* Modal */}
      <ModalComponent
        visible={modalVisible}
        onClose={hideModal}
        message={modalMessage}
        errorType={modalType}
      />
      {/*loading modal */}
      <LoadingComponent
        visible={globalLoading}
      />
    </SafeAreaView>
  );
};

export default CompleteRegistration
