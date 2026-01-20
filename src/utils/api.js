
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Base64 } from "js-base64";
import { router } from "expo-router";

const BASE_URL = "https://trackingdudes.com/apis";
let refreshPromise = null;

/**
 * Safely joins the base URL with the endpoint, 
 * ensuring proper trailing slashes and query parameter formatting.
 */
const joinUrl = (endpoint) => {
  if (!endpoint.startsWith("/")) endpoint = "/" + endpoint;

  if (endpoint.endsWith("?")) {
    endpoint = endpoint.replace(/\/\?$/, "?");
    endpoint = endpoint.replace(/\?$/, "/?");
  } else if (endpoint.includes("?")) {
    endpoint = endpoint.replace(/([^\/])(\?)/, "$1/$2");
  } else if (!endpoint.endsWith("/")) {
    endpoint += "/";
  }

  return `${BASE_URL}${endpoint}`;
};

/**
 * Checks if the token is expired.
 * Uses a 60-second buffer to refresh the token before it actually expires.
 */
const isExpired = (timestamp) => {
  if (!timestamp) return true;
  const now = Math.floor(Date.now() / 1000);
  return now >= timestamp - 60; // 60-second safety buffer
};

class TokenError extends Error {
  constructor(message = "Session expired") {
    super(message);
    this.name = "TokenError";
  }
}

/**
 * Clears stored tokens and redirects the user to the login screen.
 */
const handleLogout = async () => {
  console.warn("Session invalid. Logging out...");
  await AsyncStorage.removeItem("tokens");
  setTimeout(() => {
    router.replace("/auth/login");
  }, 2000);
};

/**
 * Handles the Refresh Token logic. 
 * Prevents multiple simultaneous refresh calls using a shared promise.
 */
const refreshTokens = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const stored = await AsyncStorage.getItem("tokens");
      if (!stored) throw new TokenError("No stored tokens");

      const tokens = JSON.parse(stored);

      if (!tokens.refresh || isExpired(tokens.refreshExpires)) {
        throw new TokenError("Refresh token expired");
      }

      console.log("Attempting token refresh...");

      const res = await fetch(joinUrl("tokens/refresh"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.refresh}`,
        },
        body: JSON.stringify({ keep_logged_in: true }),
      });

      if (!res.ok) throw new TokenError(`Refresh failed (${res.status})`);

      const data = await res.json();
      if (data?.status !== "success" || !data?.tokens) {
        throw new TokenError("Invalid refresh response");
      }

      const t = data.tokens;
      const newTokens = {
        access: t.access,
        refresh: t.refresh,
        accessExpires: t.accessExpires,
        refreshExpires: t.refreshExpires,
        issuedAt: t.issuedAt || Math.floor(Date.now() / 1000),
      };

      await AsyncStorage.setItem("tokens", JSON.stringify(newTokens));
      console.log("Tokens refreshed successfully");

      return newTokens.access;
    } catch (err) {
      console.error("Refresh Process Error:", err.message);
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Main API request handler with automatic 401 retry and authentication logic.
 */
export const apiRequest = async (
  endpoint,
  method = "GET",
  body = null,
  useAuth = false,
  isFormData = false,
  options = {}
) => {
  const url = joinUrl(endpoint);
  const headers = {};

  if (!isFormData) headers["Content-Type"] = "application/json";

  const isLogin = endpoint.includes("tokens/new");
  const isRefresh = endpoint.includes("tokens/refresh");

  try {
    // Handle Authentication Headers
    if ((options.useBasicAuth || isLogin) && body?.username && body?.password) {
      const credentials = `${body.username}:${body.password}`;
      headers["Authorization"] = `Basic ${Base64.encode(credentials)}`;
    } else if (useAuth && !isLogin && !isRefresh) {
      const stored = await AsyncStorage.getItem("tokens");
      if (!stored) throw new TokenError();

      let tokens = JSON.parse(stored);

      // Pre-emptive Refresh: Refresh if token is about to expire
      if (isExpired(tokens.accessExpires)) {
        const newAccess = await refreshTokens();
        headers["Authorization"] = `Bearer ${newAccess}`;
      } else {
        headers["Authorization"] = `Bearer ${tokens.access}`;
      }
    }

    const config = {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    };

    let res = await fetch(url, config);

    // Reactive Retry: Handle unexpected 401 errors
    if (res.status === 401 && useAuth && !isLogin) {
      console.warn("401 detected - retrying with new token");
      const newAccess = await refreshTokens();
      if (!newAccess) throw new TokenError();

      const retryHeaders = { ...headers, Authorization: `Bearer ${newAccess}` };
      res = await fetch(url, { ...config, headers: retryHeaders });
    }

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    return data;
  } catch (err) {
    if (err instanceof TokenError) {
      await handleLogout();
      return { status: "error", error: "SessionExpired", message: "Session expired. Please login again." };
    }

    console.error("Network/API Error:", err);
    return { status: "error", error: "NetworkError", message: "Network issue. Please try again." };
  }
};

/* Shorthand Methods */
export const apiGet = (endpoint, useAuth = false, options = {}) =>
  apiRequest(endpoint, "GET", null, useAuth, false, options);

export const apiPost = (endpoint, body, useAuth = false, isFormData = false, options = {}) =>
  apiRequest(endpoint, "POST", body, useAuth, isFormData, options);

export const apiPut = (endpoint, body, useAuth = false, isFormData = false, options = {}) =>
  apiRequest(endpoint, "PUT", body, useAuth, isFormData, options);

export const apiDelete = (endpoint, body = null, useAuth = false, options = {}) =>
  apiRequest(endpoint, "DELETE", body, useAuth, false, options);