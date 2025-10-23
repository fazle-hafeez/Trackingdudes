import AsyncStorage from "@react-native-async-storage/async-storage";
import { Base64 } from "js-base64";
import { router } from "expo-router";

const BASE_URL = "https://trackingdudes.com/apis";
let isRefreshing = false;

/**
 * Check if token timestamp is expired (with small buffer)
 */
const isExpired = (timestamp) => {
  if (!timestamp) return true;
  const time = timestamp > 9999999999 ? timestamp : timestamp * 1000;
  return Date.now() >= time - 5000; // 5 seconds buffer
};

/**
 * Handle logout and clear all tokens
 */
const handleLogout = async () => {
  console.warn("Logging out user — tokens invalid or expired");
  await AsyncStorage.multiRemove(["tokens", "user", "keepLoggedIn"]);
  router.replace("/auth/login");
};

/**
 * Refresh tokens using refresh token
 */
const refreshTokens = async () => {
  if (isRefreshing) return null;
  isRefreshing = true;

  try {
    const stored = await AsyncStorage.getItem("tokens");
    const keepLoggedIn = (await AsyncStorage.getItem("keepLoggedIn")) === "true";

    if (!stored) return null;
    const tokens = JSON.parse(stored);

    if (!tokens.refresh || isExpired(tokens.refreshExpires)) {
      console.warn("Refresh token expired → logout");
      await handleLogout();
      return null;
    }

    console.log("Refreshing tokens via /tokens/refresh/...");
    const res = await fetch(`${BASE_URL}/tokens/refresh/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.refresh}`,
      },
      body: JSON.stringify({ keep_logged_in: keepLoggedIn }),
    });

    if (!res.ok) {
      console.warn("Refresh failed:", res.status);
      await handleLogout();
      return null;
    }

    const data = await res.json();

    if (data?.status === "success" && data?.tokens) {
      const t = data.tokens;
      const newTokens = {
        access: t.access,
        refresh: t.refresh,
        accessExpires: t.accessExpires * 1000,
        refreshExpires: t.refreshExpires * 1000,
        issuedAt: t.issuedAt ? t.issuedAt * 1000 : Date.now(),
      };

      await AsyncStorage.setItem("tokens", JSON.stringify(newTokens));
      console.log(" Tokens successfully refreshed");
      return newTokens.access;
    }

    console.warn("Unexpected refresh response:", data);
    await handleLogout();
    return null;
  } catch (err) {
    console.error("Refresh error:", err);
    await handleLogout();
    return null;
  } finally {
    isRefreshing = false;
  }
};

/**
 * Core API function
 */
export const apiRequest = async (
  endpoint,
  method = "GET",
  body = null,
  useAuth = false,
  isFormData = false,
  options = {}
) => {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {};

  if (!isFormData) headers["Content-Type"] = "application/json";

  const isLogin = endpoint.includes("/tokens/new/");
  const isRefresh = endpoint.includes("/tokens/refresh/");

  //  Basic Auth for login only
  if (isLogin && body?.username && body?.password) {
    const encoded = Base64.encode(`${body.username}:${body.password}`);
    headers["Authorization"] = `Basic ${encoded}`;
  }

  //  Bearer Auth for all protected endpoints
  else if (useAuth || isRefresh) {
    const stored = await AsyncStorage.getItem("tokens");
    if (!stored) {
      await handleLogout();
      return { error: "SessionExpired", message: "Please login again" };
    }

    const tokens = JSON.parse(stored);

    if (!tokens.access || isExpired(tokens.accessExpires)) {
      console.log("Access token expired → attempting refresh...");
      const newAccess = await refreshTokens();
      if (!newAccess) {
        return { error: "SessionExpired", message: "Please login again" };
      }
      headers["Authorization"] = `Bearer ${newAccess}`;
    } else {
      headers["Authorization"] = `Bearer ${tokens.access}`;
    }
  }

  const requestOptions = {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  };

  try {
    let response = await fetch(url, requestOptions);

    // Handle expired access retry (401) once
    if (response.status === 401 && (useAuth || isRefresh)) {
      console.warn("401 detected → retrying after refresh...");
      const newAccess = await refreshTokens();
      if (newAccess) {
        headers["Authorization"] = `Bearer ${newAccess}`;
        response = await fetch(url, { ...requestOptions, headers });
      } else {
        await handleLogout();
        return { error: "SessionExpired", message: "Please login again" };
      }
    }

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    return data;
  } catch (err) {
    console.error("Network/API error:", err);
    return {
      status: "error",
      message: "Network issue. Please try again later.",
      error: "NetworkError",
    };
  }
};

/**
 * Helper shortcuts
 */
export const apiGet = (endpoint, useAuth = false) =>
  apiRequest(endpoint, "GET", null, useAuth);

export const apiPost = (endpoint, body, useAuth = false, isFormData = false, options = {}) =>
  apiRequest(endpoint, "POST", body, useAuth, isFormData, options);

export const apiPut = (endpoint, body, useAuth = false, isFormData = false, options = {}) =>
  apiRequest(endpoint, "PUT", body, useAuth, isFormData, options);

export const apiDelete = (endpoint, useAuth = false) =>
  apiRequest(endpoint, "DELETE", null, useAuth);
