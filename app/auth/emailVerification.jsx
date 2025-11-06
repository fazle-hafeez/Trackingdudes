import { Link, useLocalSearchParams, router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import HeaderSection from "../../src/components/HeaderSection";
import Button from "../../src/components/Button";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApi } from "../../src/hooks/useApi";
import { useAuth } from "../../src/context/UseAuth";

const EmailVerification = () => {
  const { post, put } = useApi();
  const { showModal, hideModal, setGlobalLoading } = useAuth();
  const { trimmedEmail, changePassword, enableBtn, reastartEmail, resetEmail } = useLocalSearchParams();

  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimer, setBlockTimer] = useState(0);
  const [lockoutEndTime, setLockoutEndTime] = useState(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [restartTimer, setRestartTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [canRestart, setCanRestart] = useState(false);

  const isAllDisabled = isBlocked;

  // Format time mm:ss
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  //  Load lockout state on mount
  useEffect(() => {
    const loadLockoutState = async () => {
      const storedEndTime = await AsyncStorage.getItem("lockoutEndTime");
      if (storedEndTime) {
        const endTime = parseInt(storedEndTime);
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        if (remaining > 0) {
          setIsBlocked(true);
          setLockoutEndTime(endTime);
          setBlockTimer(remaining);
        } else {
          await AsyncStorage.removeItem("lockoutEndTime");
        }
      }
    };
    loadLockoutState();
  }, []);

  // Save lockoutEndTime when blocked
  useEffect(() => {
    if (lockoutEndTime && isBlocked) {
      AsyncStorage.setItem("lockoutEndTime", lockoutEndTime.toString());
    } else if (!isBlocked) {
      AsyncStorage.removeItem("lockoutEndTime");
    }
  }, [isBlocked, lockoutEndTime]);

  // Resend timer
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

  // Restart timer
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

  // Lockout countdown
  useEffect(() => {
    let interval;
    if (isBlocked && lockoutEndTime) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((lockoutEndTime - Date.now()) / 1000));
        setBlockTimer(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          setIsBlocked(false);
          setWrongAttempts(0);
          setLockoutEndTime(null);
          AsyncStorage.removeItem("lockoutEndTime");
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isBlocked, lockoutEndTime]);

  //  Submit OTP
  const submitCode = async () => {
    if (isBlocked) return;
    if (!code.trim()) {
      setOtpError("Field is required!");
      return;
    }

    setGlobalLoading(true);
    try {
      const response = await post("register/verify-email", { code });
      const msg = response?.data || response?.message || "Unexpected response.";

      if (response?.status === "success") {
        showModal(msg, "success");

        if (response?.tokens) {
          await AsyncStorage.setItem("tokens", JSON.stringify(response.tokens));
        } else {
          await AsyncStorage.removeItem("tokens");
        }

        if (response?.action === "Next") {
          setTimeout(() => {
            hideModal();
            router.push({
              pathname: changePassword
                ? "/auth/changePassword"
                : "/auth/completeRegistration",
              params: { trimmedEmail: changePassword ? resetEmail : trimmedEmail },
            });
          }, 2000);
        }
      } else if (response?.status === "error") {
        if (response?.action === "LockOut") {
          const duration = response?.lockoutDuration || 180;
          setIsBlocked(true);
          setLockoutEndTime(Date.now() + duration * 1000);
          showModal(
            response?.data || `You are locked out. Try again in ${duration} seconds.`,
            "error"
          );
        } else {
          setWrongAttempts((prev) => {
            const next = prev + 1;
            if (next >= 3) {
              const fallbackDuration = 180;
              setIsBlocked(true);
              setLockoutEndTime(Date.now() + fallbackDuration * 1000);
              showModal(
                "You’ve entered the wrong code 3 times. Try again after 3 minutes.",
                "error"
              );
            } else {
              showModal(msg || "Invalid OTP. Please try again.", "error");
            }
            return next;
          });
        }
      } else {
        showModal(msg, "error");
      }
    } catch (error) {
      showModal(error?.message || "Something went wrong. Try again later.", "error");
    } finally {
      setGlobalLoading(false);
    }
  };

  // Restart signup
  const restart = () => {
    router.push({
      pathname: "auth/signup",
      params: { show: true, trimmedEmail, resetEmail },
    });
  };

  // Resend email
  const sendEmailCode = async () => {
    setGlobalLoading(true);
    try {
      const result = await put("register/resend-email");
      const msg = result?.data || result?.message || "Unexpected response.";
      if (result?.status === "success") {
        showModal(msg, "success");
      } else if (result?.restart === true) {
        const duration = result?.lockoutDuration || 180;
        setIsBlocked(true);
        setLockoutEndTime(Date.now() + duration * 1000);
        showModal(
          msg || "Too many resend attempts. Please wait before trying again.",
          "error"
        );
      } else {
        showModal(msg, "error");
      }
    } catch (error) {
      showModal(error?.message || "Failed to resend verification email.", "error");
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#0000ff" />
      <HeaderSection />

      <View style={{marginTop:-320}} className="p-4">
        <View
          className={`bg-[rgba(255,255,255,0.9)] rounded-2xl p-6 mt-6 ${
            Platform.OS === "ios" ? "shadow-sm" : ""
          }`}
          style={{ elevation: 5 }}
        >
          <Text className="text-headercolor text-2xl font-medium mb-2">
            Verify your email address
          </Text>
          <Text className="text-md text-headercolor">
            We've sent a 6-digit code to{" "}
            {trimmedEmail || reastartEmail || resetEmail} from{" "}
            <Text className="font-medium">register@trackingdudes.com</Text>. Please
            enter it below.
          </Text>

          <Text className="text-xl mt-4 mb-2 text-headercolor">Enter code here</Text>
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
            <Text className="text-red-500 text-sm mt-2">
              You are locked out for {formatTime(blockTimer)}. Please wait.
            </Text>
          )}

          <View className="mt-3">
            <Button title="Submit" onClickEvent={submitCode} disabled={isAllDisabled} />
          </View>

          <View className="border border-gray-300 my-4"></View>

          <Text className="text-xl text-headercolor mb-2">
            Didn't receive the email?
          </Text>

          <View className="flex-row justify-between">
            <TouchableOpacity
              disabled={isAllDisabled || (!canResend && !enableBtn)}
              onPress={sendEmailCode}
              className={`border rounded-md h-12 justify-center px-3 ${
                canResend || enableBtn ? "border-blue" : "border-gray-400"
              }`}
            >
              <Text
                className={`${
                  canResend || enableBtn ? "text-customBlue" : "text-gray-400"
                }`}
              >
                Resend Email {!enableBtn && !canResend && `| in ${formatTime(resendTimer)}`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={isAllDisabled || (!canRestart && !enableBtn)}
              onPress={restart}
              className={`border rounded-md h-12 justify-center px-3 ${
                canRestart || enableBtn ? "border-blue" : "border-gray-400"
              }`}
            >
              <Text
                className={`${
                  canRestart || enableBtn ? "text-customBlue" : "text-gray-400"
                }`}
              >
                Restart {!enableBtn && !canRestart && `| in ${formatTime(restartTimer)}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/*  Info Text Below Card */}
        <View className="mt-3">
          <Text className="text-gray-600 text-lg leading-6 text-justify">
            Please ensure that your email service provider does not block our emails. If
            you attempt to send emails from this page multiple times in a short period,
            they may end up in your spam folder. Therefore, please double-check all
            folders, including spam, before resending another email. Thank you.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default EmailVerification;
