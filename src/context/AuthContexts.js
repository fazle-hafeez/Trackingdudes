import React, { createContext, useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, usePathname } from "expo-router";

export const AuthContext = createContext(null);
const LAST_ROUTE_KEY = "LAST_ROUTE";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [modalButtons, setModalButtons] = useState([]);
  const [autoHide, setAutoHide] = useState(true);
  const [modalTitle, setModalTitle] = useState(null);
  const [lastVisitedPath, setLastVisitedPath] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const restoreDone = useRef(false);
  const pathname = usePathname();

  // Load session data
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        const storedTokens = await AsyncStorage.getItem("tokens");
        const storedKeep = await AsyncStorage.getItem("keepLoggedIn");
        const storedPath = await AsyncStorage.getItem(LAST_ROUTE_KEY);

        console.log("LAST VISITED PATH on STARTUP:", storedPath);
        setLastVisitedPath(storedPath);
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

  // Restore once after load
  useEffect(() => {
    if (loading || restoreDone.current) return;
    if (!lastVisitedPath) return;

    const restore = async () => {
      restoreDone.current = true;
      setIsRedirecting(true);

      // Don’t redirect if already on same path
      if (pathname === lastVisitedPath) {
        console.log(" Already on last path, skip redirect");
        setIsRedirecting(false);
        return;
      }

      const isAuthPath = lastVisitedPath.startsWith("/auth");

      setTimeout(() => {
        try {
          if (tokens && !isAuthPath) {
            console.log("➡️ Restoring protected path:", lastVisitedPath);
            router.replace(lastVisitedPath);
          } else if (!tokens && isAuthPath) {
            console.log("➡️ Restoring auth path:", lastVisitedPath);
            router.replace(lastVisitedPath);
          }
        } catch (e) {
          console.warn("Redirect failed:", e);
        } finally {
          setTimeout(() => setIsRedirecting(false), 500);
        }
      }, 300);
    };

    restore();
  }, [loading, tokens, lastVisitedPath]);

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
    await Promise.all([
      AsyncStorage.setItem("user", JSON.stringify(userData)),
      AsyncStorage.setItem("tokens", JSON.stringify(newTokens)),
      AsyncStorage.setItem("keepLoggedIn", keepLoggedIn ? "true" : "false"),
    ]);

    if (remember && userData?.username) {
      await AsyncStorage.setItem("rememberedUserName", userData.username);
    } else {
      await AsyncStorage.removeItem("rememberedUserName");
    }
  };

  const saveLastPath = async (path) => {
    try {
      await AsyncStorage.setItem(LAST_ROUTE_KEY, path);
      setLastVisitedPath(path);
    } catch (e) {
      console.error("Error saving path:", e);
    }
  };

  const logout = async () => {
    setTokens(null);
    setUser(null);
    setLastVisitedPath(null);
    restoreDone.current = false;
    await AsyncStorage.multiRemove(["tokens", "user", LAST_ROUTE_KEY]);
    router.replace("/auth/login");
  };

  const showModal = (...args) => {
    let message = "";
    let type = "success";
    let title = null;
    let autoHide = true;
    let buttons = [];

    message = args[0] ?? "";
    type = args[1] ?? "success";
    const rest = args.slice(2);
    for (const arg of rest) {
      if (typeof arg === "string") {
        if (!title) title = arg;
      } else if (typeof arg === "boolean") {
        autoHide = arg;
      } else if (Array.isArray(arg)) {
        buttons = arg;
      }
    }
    if (autoHide === undefined) autoHide = type === "success";

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
        lastVisitedPath,
        saveLastPath,
        isRedirecting,
        setIsRedirecting,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
