import { Link, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StatusBar, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import HeaderSection from "../../src/components/HeaderSection";
import Button from "../../src/components/Button";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApi } from "../../src/hooks/useApi";
import { useAuth } from "../../src/context/UseAuth";

const EmailVerification = () => {
  const router = useRouter();
  const { post, put } = useApi();
  const {
    showModal,
    hideModal,
    setGlobalLoading,
  } = useAuth();

  const { trimmedEmail, changePassword, enableBtn, reastartEmail, resetEmail } =
    useLocalSearchParams();

  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimer, setBlockTimer] = useState(180);
  const [resendTimer, setResendTimer] = useState(60);
  const [restartTimer, setRestartTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [canRestart, setCanRestart] = useState(false);

  const isAllDisabled = isBlocked || globalLoading;

  // Format mm:ss
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Timers
  useEffect(() => {
    const resendInterval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(resendInterval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(resendInterval);
  }, []);

  useEffect(() => {
    const restartInterval = setInterval(() => {
      setRestartTimer((prev) => {
        if (prev <= 1) {
          clearInterval(restartInterval);
          setCanRestart(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(restartInterval);
  }, []);

  // 3-min block timer
  useEffect(() => {
    let interval;
    if (isBlocked) {
      interval = setInterval(() => {
        setBlockTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsBlocked(false);
            setWrongAttempts(0);
            setBlockTimer(180);
            return 180;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isBlocked]);

  //  Submit OTP
  const submitCode = async () => {
    if (isBlocked) return;
    if (!code.trim()) {
      setOtpError("Field is required!");
      return;
    }

    setGlobalLoading(true);
    try {
      const response = await post("/register/verify-email/", { code });
      console.log(response);
      if (response.status === "success") {
        setTimeout(() => {
          showModal(response.data || "Email verified successfully!", "success");
        }, 0);

        const tokens = {
          access: response?.tokens?.access,
          accessExpires: response?.tokens?.accessExpires,
          issuedAt: response?.tokens?.issuedAt,
        };
        if (tokens) {
          await AsyncStorage.setItem("tokens", JSON.stringify(tokens));

        } else {
          await AsyncStorage.removeItem("tokens");
        }

        if (response.action === "Next") {
          setTimeout(() => {
            hideModal();
            router.push({
              pathname: changePassword
                ? "/auth/changePassword"
                : "/auth/completeRegistration",
              params: { trimmedEmail: changePassword ? resetEmail : trimmedEmail },
            });
          }, 2500);
        }
      } else if (response.status === "error") {
        setWrongAttempts((prev) => {
          const next = prev + 1;
          if (next >= 3) {
            setIsBlocked(true);
            setTimeout(() => {
              showModal(
                "You’ve entered the wrong code 3 times. Try again after 3 minutes.",
                "error"
              );
            }, 0);
          } else {
            setTimeout(() => {
              showModal(response.data || "Invalid OTP. Please try again.", "error");
            }, 0);
          }
          return next;
        });
      } else {
        setTimeout(() => {
          showModal(response.data || "Unexpected response from server.", "error");
        }, 0);
      }
    } catch (error) {
      setTimeout(() => {
        showModal(error.message || "Something went wrong. Try again later.", "error");
      }, 0);
    } finally {
      setGlobalLoading(false);
    }
  };

  // Restart
  const restart = () => {
    router.push({
      pathname: "/auth/signup",
      params: { show: true, trimmedEmail, resetEmail },
    });
  };

  // Resend email
  const sendEmailCode = async () => {
    setGlobalLoading(true);
    try {
      const result = await put("/register/resend-email/");
      if (result.status === "success") {
        setTimeout(() => {
          showModal(result.data || "Verification email sent successfully!", "success");
        }, 0);
      } else if (result.restart === true) {
        setIsBlocked(true);
        setTimeout(() => {
          showModal(
            result.data ||
              "You are making too many requests in a short time. Please wait a bit before trying again.",
            "error"
          );
        }, 0);
      } else {
        setTimeout(() => {
          showModal(result.data || "Failed to resend verification email.", "error");
        }, 0);
      }
    } catch (error) {
      setTimeout(() => {
        showModal("Failed to resend verification email. Try again later.", "error");
      }, 0);
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#0000ff" />
      <HeaderSection />

      <View className="p-4 mx-auto bg-white">
        <View
          className={`bg-[rgba(255,255,255,0.9)] rounded-xl p-6 ${
            Platform.OS === "ios" ? " shadow-sm" : ""
          }`}
          style={{ marginTop: -300, elevation: 5 }}
        >
          <Text className="text-headercolor text-2xl font-medium mb-2">
            Verify your email address
          </Text>
          <Text className="text-md text-headercolor">
            We've sent a 6-digit code to {trimmedEmail || reastartEmail || resetEmail} from
            register@trackingdudes.com. Please enter it below.
          </Text>

          <Text className="text-2xl mt-4 mb-2 text-headercolor">Enter code here</Text>
          <TextInput
            autoFocus
            keyboardType="numeric"
            maxLength={6}
            className={`text-center border rounded-md px-3 py-2 text-lg text-headercolor ${
              otpError ? "border-red-500" : "border-gray-400"
            }`}
            value={code}
            onChangeText={(text) => {
              setCode(text);
              setOtpError("");
            }}
          />

          {otpError ? <Text className="text-red-500 text-sm mt-2">{otpError}</Text> : null}

          {isBlocked && (
            <Text className="text-red-500 text-sm mt-1">
              You are blocked for {formatTime(blockTimer)} due to too many failed attempts.
            </Text>
          )}

          <View className="mt-2">
            <Button title="Submit" onClickEvent={submitCode} disabled={isAllDisabled} />
          </View>

          <View className="border border-gray-400 my-4"></View>

          <Text className="text-2xl text-headercolor mb-2">
            Didn't receive the email?
          </Text>

          <View className="flex-row justify-between items-center">
            <TouchableOpacity
              disabled={isAllDisabled || (!canResend && !enableBtn)}
              className={`border rounded-md h-12 pt-1 ${
                canResend || enableBtn ? "border-blue" : "border-gray-400"
              }`}
              onPress={sendEmailCode}
            >
              <Text
                className={`p-2 ${
                  canResend || enableBtn ? "text-customBlue" : "text-gray-400"
                }`}
              >
                Resend Email{" "}
                {!enableBtn && !canResend && `| in ${formatTime(resendTimer)}`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={isAllDisabled || (!canRestart && !enableBtn)}
              onPress={restart}
              className={`border rounded-md h-12 pt-1 ${
                canRestart || enableBtn ? "border-blue" : "border-gray-400"
              }`}
            >
              <Text
                className={`p-2 ${
                  canRestart || enableBtn ? "text-customBlue" : "text-gray-400"
                }`}
              >
                Restart {!enableBtn && !canRestart && `| in ${formatTime(restartTimer)}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-3 px-3">
          <Text className="text-2xl text-headercolor">
            Already Registered?{" "}
            <TouchableOpacity
              disabled={isAllDisabled}
              onPress={() => router.push("/otherPages/home")}
              className="pt-2"
            >
              <Text className="text-customBlue underline text-xl">Login here</Text>
            </TouchableOpacity>
          </Text>
        </View>

        <View className="px-3 mt-2">
          <Text>
            Please ensure that your email service provider does not block our
            emails. If you attempt to send emails from this page multiple times in
            a short period of time, they may end up in your spam folder. Therefore,
            please double-check all folders, including spam, before resending
            another email. Thank you.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default EmailVerification;
