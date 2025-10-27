import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);

  // Global Loading
  const [globalLoading, setGlobalLoading] = useState(false);

  // Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [modalButtons, setModalButtons] = useState([]);
  const [autoHide, setAutoHide] = useState(true);
  const [modalTitle, setModalTitle] = useState(null); 

  // Load user session on app start
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        const storedTokens = await AsyncStorage.getItem("tokens");
        const storedKeep = await AsyncStorage.getItem("keepLoggedIn");
        setKeepLoggedIn(storedKeep === "true");

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

  // Login handler
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

    if (remember && userData?.username) {
      await AsyncStorage.setItem("rememberedUserName", userData.username);
    } else {
      await AsyncStorage.removeItem("rememberedUserName");
    }
  };

  // Logout handler
  const logout = async () => {
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

 
 /**
 * showModal(message, type?, autoHide?, buttons?, title?)
 * - If autoHide is omitted => defaults true only for success
 * - If autoHide = false => never auto-hide, show buttons/close
 * - Buttons optional, Title optional
 */
const showModal = (...args) => {
  // Default values
  let message = "";
  let type = "success";
  let title = null;
  let autoHide = true;
  let buttons = [];

  // Basic extraction
  message = args[0] ?? "";
  type = args[1] ?? "success";

  // Remaining flexible args
  const rest = args.slice(2);

  //  Smart auto-detection of parameters
  for (const arg of rest) {
    if (typeof arg === "string") {
      // Title or message fallback
      if (!title) title = arg;
    } else if (typeof arg === "boolean") {
      autoHide = arg;
    } else if (Array.isArray(arg)) {
      buttons = arg;
    }
  }

  // Default rule: success auto-hides if not explicitly set false
  if (autoHide === undefined) {
    autoHide = type === "success";
  }

  //  Apply state updates
  setModalMessage(message);
  setModalType(type);
  setModalTitle(title);
  setAutoHide(autoHide);
  setModalButtons(buttons);
  setModalVisible(true);
};


  const hideModal = () => {
    setModalVisible(false);
    setModalButtons([]);
    setModalTitle(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        login,
        logout,
        loading,
        keepLoggedIn,
        globalLoading,
        setGlobalLoading,
        modalVisible,
        modalMessage,
        modalType,
        autoHide,
        modalButtons,
        modalTitle, 
        showModal,
        hideModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
