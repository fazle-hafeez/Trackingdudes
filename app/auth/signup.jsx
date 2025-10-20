import React, { useState } from "react";
import {View,Text,TextInput,StatusBar,TouchableOpacity,Platform} from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import HeroSection from "../../src/components/HeroSection";
import Button from "../../src/components/Button";
import ModalComponent from "../../src/components/ModalComponent";
import LoadingComponent from "../../src/components/LoadingComponent";
import { useApi } from "../../src/hooks/useApi";
import { useAuth } from "../../src/context/UseAuth";

const SignUp = () => {
  const route = useLocalSearchParams();
  const router = useRouter();
  const { post} = useApi();
  const {showModal, hideModal, modalVisible,modalMessage, modalType,setGlobalLoading,globalLoading,} = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [lastSubmittedEmail, setLastSubmittedEmail] = useState("");
  const [receivedcode, setReceivedCode] = useState(false)
  const receivedCode = () => {
    router.push({
      pathname: "/auth/emailVerification",
      params: {
        enableBtn: true,
        trimmedEmail: route.trimmedEmail || trimmedEmail,
        resetEmail: route.resetEmail,
      },
    });
  };

  const handleLogin = async () => {
    let hasError = false;

    if (!name.trim()) {
      setUsernameError("Field is required");
      hasError = true;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError("Field is required");
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Email is not valid");
      hasError = true;
    } else {
      setEmailError("");
    }
    if (hasError) return;
    setGlobalLoading(true);

    try {
      const response = await post(
        "/register/register-email/",
        { name, email: trimmedEmail },
        false
      );
      console.log(response);

      if (response?.status === "success") {
        showModal(response.data || "Verification email sent successfully!", "success");
        setReceivedCode(true)
        if (response.action === "Next") {
          setTimeout(() => {
            hideModal();
            router.push({
              pathname: "/auth/emailVerification",
              params: { name, trimmedEmail },
            });
          }, 2000);
        }
        setLastSubmittedEmail("");
      } else if (response?.status === "error") {
        if (lastSubmittedEmail === trimmedEmail) {
          setTimeout(() => {
            showModal(
              "You are making too many requests in a short time. Please wait a bit before trying again.",
              "error"
            );
          }, 0)
        } else {
          setTimeout(() => {
            showModal(
              response?.data || "Another user is already registered with that email.",
              "error"
            );
          }, 0);
          setLastSubmittedEmail(trimmedEmail);
        }
      } else {
        setTimeout(() => {
          showModal(response.message || "Something went wrong. Please try again.", "error");
        }, 0);
      }
    } catch (error) {
      setTimeout(() => {
        showModal(error.error || "A server error occurred. Please try again later.", "error");
      }, 0);
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#0000ff" />
      <HeroSection />

      <View className="h-full mx-auto p-4 w-full">
        <View
          className={`bg-[rgba(255,255,255,0.9)] rounded-xl p-6 ${Platform.OS === "ios" ? "shadow-sm" : ""
            }`}
          style={{ marginTop: -200, elevation: 5 }}
        >
          <Text className="text-headercolor text-2xl font-medium mb-3">
            Register
          </Text>

          <Text className="text-xl mb-2 text-headercolor">Enter your name</Text>
          <TextInput
            className={`border ${usernameError ? "border-red-500" : "border-gray-400"
              } rounded-md text-lg text-headercolor px-3 py-3`}
            placeholder="This is to call you with, in the email"
            value={name}
            onChangeText={(val) => {
              setName(val);
              setUsernameError("");
            }}
          />
          {usernameError ? (
            <Text className="text-red-500 text-sm mt-1">{usernameError}</Text>
          ) : null}

          <Text className="text-xl my-2 text-headercolor">
            Enter your email address
          </Text>
          <TextInput
            className={`border ${emailError ? "border-red-500" : "border-gray-400"
              } rounded-md text-lg text-headercolor px-3 py-3`}
            placeholder="You will use this for account recovery"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError("");
            }}
          />
          {emailError ? (
            <Text className="text-red-500 text-sm mt-1">{emailError}</Text>
          ) : null}

          <View className="mt-2">
            <Button title="Submit" onClickEvent={handleLogin} />
          </View>

          <View className="mt-2 mb-2">
            <Text className="text-lg text-headercolor font-normal">
              Already have an account?
              <Link href="/auth/login" className="text-blue underline">
                {" "}
                Sign in
              </Link>
            </Text>
          </View>
        </View>

        {receivedcode || route.show && (
          <View className="flex-row mt-3 pl-5 ml-1 items-center">
            <Text className="text-xl font-normal text-headercolor">
              I received the code?
            </Text>
            <TouchableOpacity onPress={receivedCode}>
              <Text className="text-lg underline text-blue font-normal">
                {" "}
                Verify now
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Global modal and loading */}
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

export default SignUp;
