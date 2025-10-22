import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null); //  store both access & refresh
  const [loading, setLoading] = useState(true);

  //  Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");

  //  Global loading
  const [globalLoading, setGlobalLoading] = useState(false);

  //  Load stored session on app start
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        const storedTokens = await AsyncStorage.getItem("tokens");
        const keepLoggedIn = await AsyncStorage.getItem("keepLoggedIn");

        if (storedUser && storedTokens && keepLoggedIn === "true") {
          setUser(JSON.parse(storedUser));
          setTokens(JSON.parse(storedTokens));
        }
      } catch (err) {
        console.warn("Error loading stored session:", err);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  // 🔹 Login handler (after API success)
  const login = async (userData, tokenResponse, { remember, keepLoggedIn }) => {
    if (!tokenResponse) return;

    const newTokens = {
      access: tokenResponse?.access,
      refreshToken: tokenResponse?.refresh,
      accessExpires: tokenResponse?.accessExpires,
      refreshExpires: tokenResponse?.refreshExpires,
      issuedAt:tokenResponse?.issuedAt
    };

    setUser(userData || null);
    setTokens(newTokens);

    // Store in AsyncStorage
    await AsyncStorage.multiSet([
      ["user", JSON.stringify(userData)],
      ["tokens", JSON.stringify(newTokens)],
      ["keepLoggedIn", keepLoggedIn ? "true" : "false"],
    ]);

    // Remember username (optional)
    if (remember && userData?.username) {
      await AsyncStorage.setItem("rememberedUserName", userData.username);
    } else {
      await AsyncStorage.removeItem("rememberedUserName");
    }
  };

  //  Logout
  const logout = async () => {
    setUser(null);
    setTokens(null);
    await AsyncStorage.multiRemove([
      "user",
      "tokens",
      "keepLoggedIn",
      "rememberedUserName",
    ]);
  };

  //  Show modal
  const showModal = (message, type = "success") => {
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  //  Hide modal
  const hideModal = () => {
    setModalVisible(false);
    setModalMessage("");
  };

  //  Auto-hide success modals
  useEffect(() => {
    if (modalVisible && modalType === "success") {
      const timer = setTimeout(() => hideModal(), 2000);
      return () => clearTimeout(timer);
    }
  }, [modalVisible, modalType]);

  //  Expose everything to context consumers
  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        login,
        logout,
        loading,
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
