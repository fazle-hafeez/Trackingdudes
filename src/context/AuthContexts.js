import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  //  Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");

  //  Global loading
  const [globalLoading, setGlobalLoading] = useState(false);

  //  Load user on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        const storedToken = await AsyncStorage.getItem("token");
        const keepLoggedIn = await AsyncStorage.getItem("keepLoggedIn");

        if (storedUser && storedToken && keepLoggedIn === "true") {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        }
      } catch (err) {
        console.warn("Error loading user/token", err);
      } finally {
        setLoading(false);
        setModalVisible(false);
        setModalMessage("");
        setModalType("");
      }
    };
    loadUser();
  }, []);

  //  Login
  const login = async (userData, accessToken, { remember, keepLoggedIn }) => {
    setUser(userData);
    setToken(accessToken || null);

    if (userData) {
      await AsyncStorage.setItem("user", JSON.stringify(userData));
    }

    if (accessToken) {
      await AsyncStorage.setItem("token", accessToken);
    } else {
      await AsyncStorage.removeItem("token");
    }

    if (remember && userData?.username) {
      await AsyncStorage.setItem("rememberedUserName", userData.username);
    } else {
      await AsyncStorage.removeItem("rememberedUserName");
    }

    if (keepLoggedIn) {
      await AsyncStorage.setItem("keepLoggedIn", "true");
    } else {
      await AsyncStorage.removeItem("keepLoggedIn");
    }
  };

  // Logout
  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.multiRemove([
      "user",
      "token",
      "keepLoggedIn",
      "rememberedUserName",
    ]);
  };

  //  Global modal helpers
  const showModal = (message, type = "success") => {
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
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
