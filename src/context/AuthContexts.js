import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [globalLoading, setGlobalLoading] = useState(false);

  //  Load stored session when app starts
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        const storedTokens = await AsyncStorage.getItem("tokens");
        const storedKeep = await AsyncStorage.getItem("keepLoggedIn");

        setKeepLoggedIn(storedKeep === "true");

        //  Always restore session if tokens exist (until expired)
        if (storedUser && storedTokens) {
          setUser(JSON.parse(storedUser));
          setTokens(JSON.parse(storedTokens));
        }
      } catch (err) {
        console.warn("Error loading session:", err);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  //  Login handler
  const login = async (userData, tokenResponse, { remember, keepLoggedIn }) => {
    if (!tokenResponse) return;

    const newTokens = {
      access: tokenResponse?.access,
      refresh: tokenResponse?.refresh,
      accessExpires: tokenResponse?.accessExpires,
      refreshExpires: tokenResponse?.refreshExpires,
      issuedAt: tokenResponse.issuedAt || Math.floor(Date.now() / 1000),
    };

    setUser(userData || null);
    setTokens(newTokens);
    setKeepLoggedIn(keepLoggedIn);

    await AsyncStorage.multiSet([
      ["user", JSON.stringify(userData)],
      ["tokens", JSON.stringify(newTokens)],
      ["keepLoggedIn", keepLoggedIn ? "true" : "false"],
    ]);

    // Optional: remember username
    if (remember && userData?.username) {
      await AsyncStorage.setItem("rememberedUserName", userData.username);
    } else {
      await AsyncStorage.removeItem("rememberedUserName");
    }
  };

  //  Logout handler
  const logout = async () => {
    console.log("👋 User logged out");
    setUser(null);
    setTokens(null);
    setKeepLoggedIn(false);

    await AsyncStorage.multiRemove([
      "user",
      "tokens",
      "keepLoggedIn",
      "rememberedUserName",
    ]);

    router.replace("/auth/login");
  };

  //  Modal helpers
  const showModal = (message, type = "success") => {
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };
  const hideModal = () => setModalVisible(false);

  //  Auto-hide success messages
  useEffect(() => {
    if (modalVisible && modalType === "success") {
      const timer = setTimeout(() => hideModal(), 2500);
      return () => clearTimeout(timer);
    }
  }, [modalVisible, modalType]);

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        login,
        logout,
        loading,
        keepLoggedIn,
        showModal,
        hideModal,
        modalVisible,
        modalMessage,
        modalType,
        globalLoading,
        setGlobalLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
