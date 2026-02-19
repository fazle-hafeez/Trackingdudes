import React, { useState } from "react";
import { View, Text, StatusBar, TouchableOpacity, Platform } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";


//Hooks
import { useApi } from "../../src/hooks/useApi";
import { useAuth } from "../../src/context/UseAuth";
import { useTheme } from "../../src/context/ThemeProvider";

//components
import HeaderSection from "../../src/components/HeaderSection";
import Button from "../../src/components/Button"
import Input from "../../src/components/Input";
import { ThemedView,ThemedText,SafeAreacontext } from "../../src/components/ThemedColor";

const SignUp = () => {
  const route = useLocalSearchParams();
  const {darkMode} = useTheme()
  const router = useRouter();
  const { post } = useApi();
  const { showModal, hideModal, setGlobalLoading, } = useAuth();

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
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError("Field is required");
      hasError = true;
      return;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Email is not valid");
      hasError = true;
      return;
    } else {
      setEmailError("");
    }
    if (hasError) return;
    setGlobalLoading(true);

    try {
      const response = await post(
        "/register/register-email",
        { name, email: trimmedEmail },
        false
      );
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
          showModal("You are making too many requests in a short time. Please wait a bit before trying again.", "error");
        } else {
          showModal(response?.data || "Another user is already registered with that email.", "error");
          setLastSubmittedEmail(trimmedEmail);
        }
      } else {
        showModal(response.message || "Something went wrong. Please try again.", "error");
      }
    } catch (error) {
      showModal(error.error || "A server error occurred. Please try again later.", "error");
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <SafeAreacontext className="flex-1 ">
      <HeaderSection />

      <View className="flex-1 p-3">
        <ThemedView
        bgColor={'rgba(255,255,255,0.9)'}
          className={` rounded-xl p-6 ${Platform.OS === "ios" ? "shadow-sm" : ""
            }`}
          style={{ marginTop: -200, elevation: 5 }}
        >
          <ThemedText color={'#646060ff'} className="text-headercolor text-2xl font-medium mb-3">
            Register
          </ThemedText>

          <ThemedText color={'#646060ff'} className="text-xl mb-2 text-headercolor">Enter your name</ThemedText>
          <Input
            value={name}
            placeholder="This is to call you with, in the email"
            onchange={(val) => setName(val)}
            inputError={usernameError}
            setInputError={setUsernameError}

          />

          <ThemedText color={'#646060ff'} className="text-xl my-3 text-headercolor">
            Enter your email address
          </ThemedText>

          <Input
            placeholder="You will use this for account recovery"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onchange={(val) => setEmail(val)}
            inputError={emailError}
            setInputError={setEmailError}
          />

          <View className="mt-2">
            <Button title="Submit" onClickEvent={handleLogin} />
          </View>

          <View className="mt-2 mb-2">
            <ThemedText color={'#646060ff'} className="text-lg text-headercolor font-normal">
              Already have an account?
              <Link href="/auth/login" className="text-blue-600 underline">
                {" "}
                Sign in
              </Link>
            </ThemedText>
          </View>
        </ThemedView>

        {receivedcode || route.show && (
          <View className="flex-row mt-3 pl-5 ml-1 items-center">
            <ThemedText color={'#646060ff'} className="text-xl font-normal text-headercolor">
              I received the code?
            </ThemedText>
            <TouchableOpacity onPress={receivedCode}>
              <Text className="text-lg underline text-customBlue font-normal">
                {" "}
                Verify now
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreacontext>
  );
};

export default SignUp;
