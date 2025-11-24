
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Base64 } from "js-base64";
import { router } from "expo-router";

const BASE_URL = "https://trackingdudes.com/apis";
let isRefreshing = false;

/* -------------------------------------------------------------
   Join base URL + endpoint safely
------------------------------------------------------------- */
const joinUrl = (endpoint) => {
  if (!endpoint.startsWith("/")) endpoint = "/" + endpoint;

  // Handle GET: if ends with "?", add "/?"
  if (endpoint.endsWith("?")) {
    endpoint = endpoint.replace(/\/\?$/, "?"); // Remove any trailing "/" before the "?" for uniform replacement code
    endpoint = endpoint.replace(/\?$/, "/?"); //end goal adds /? at the end if the url ends with ?
  } else if (endpoint.includes("?")) {
    // Insert "/" before "?" if it's not already there
    endpoint = endpoint.replace(/([^\/])(\?)/, "$1/$2");
  } else if (!endpoint.endsWith("/")) {
    endpoint += "/";
  }

  return `${BASE_URL}${endpoint}`;
};

/* -------------------------------------------------------------
   Expiry check helper
------------------------------------------------------------- */
const isExpired = (timestamp) => {
  if (!timestamp) return true;
  return Math.floor(Date.now() / 1000) >= timestamp - 5;
};

/* -------------------------------------------------------------
   Token error class
------------------------------------------------------------- */
class TokenError extends Error {
  constructor(message = "Session expired") {
    super(message);
    this.name = "TokenError";
  }
}

/* -------------------------------------------------------------
   Secure logout
------------------------------------------------------------- */
const handleLogout = async () => {
  console.warn("Logging out — token invalid or expired");
  await AsyncStorage.removeItem("tokens");
  setTimeout(() => {
    router.replace("/auth/login");
  }, 2500);
};

/* -------------------------------------------------------------
   Refresh tokens
------------------------------------------------------------- */
const refreshTokens = async () => {
  if (isRefreshing) return null;
  isRefreshing = true;

  try {
    const stored = await AsyncStorage.getItem("tokens");
    if (!stored) throw new TokenError();

    const tokens = JSON.parse(stored);
    const keepLoggedIn = (await AsyncStorage.getItem("keepLoggedIn")) === "true";
    const now = Math.floor(Date.now() / 1000);

    if (!tokens.refresh || isExpired(tokens.refreshExpires) || now < tokens.issuedAt) {
      throw new TokenError("Refresh token expired or invalid");
    }

    console.log("Refreshing tokens...");
    const res = await fetch(joinUrl("tokens/refresh"), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.refresh}`,
      },
      body: JSON.stringify({ keep_logged_in: keepLoggedIn }),
    });

    if (!res.ok) throw new TokenError(`Refresh failed (${res.status})`);

    const data = await res.json();
    if (data?.status === "success" && data?.tokens) {
      const t = data.tokens;
      const newTokens = {
        access: t.access,
        refresh: t.refresh,
        accessExpires: t.accessExpires,
        refreshExpires: t.refreshExpires,
        issuedAt: t.issuedAt || Math.floor(Date.now() / 1000),
      };
      await AsyncStorage.setItem("tokens", JSON.stringify(newTokens));
      console.log(" Tokens refreshed successfully");
      return newTokens.access;
    }

    throw new TokenError("Unexpected token refresh response");
  } catch (err) {
    if (err instanceof TokenError) throw err;
    console.error("Token refresh error:", err);
    throw new TokenError("Unable to refresh tokens");
  } finally {
    isRefreshing = false;
  }
};

/* -------------------------------------------------------------
   Unified API Request
------------------------------------------------------------- */
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
    // BASIC AUTH
    if ((options.useBasicAuth || isLogin) && body?.username && body?.password) {
      const credentials = `${body.username}:${body.password}`;
      headers["Authorization"] = `Basic ${Base64.encode(credentials)}`;
    } else if ((options.useBasicAuth || isLogin) && (!body?.username || !body?.password)) {
      return { error: "FieldRequired", message: "Username and password required" };
    }

    // BEARER AUTH
    else if (useAuth && !isLogin && !isRefresh) {
      const stored = await AsyncStorage.getItem("tokens");
      if (!stored) throw new TokenError();

      const tokens = JSON.parse(stored);
      if (!tokens.access || isExpired(tokens.accessExpires)) {
        const newAccess = await refreshTokens();
        if (!newAccess) throw new TokenError("Refresh failed");
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
    // Retry on 401
    if (res.status === 401 && useAuth) {
      console.warn("401 detected — retrying after token refresh");
      const newAccess = await refreshTokens();
      if (!newAccess) throw new TokenError();
      headers["Authorization"] = `Bearer ${newAccess}`;
      res = await fetch(url, { ...config, headers });
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
      return { error: "SessionExpired", message: "Your session was expired  Please login again" };
    }

    console.error("Network/API error:", err);
    return {
      status: "error",
      message: "Network issue. Please try again later.",
      error: "NetworkError",
    };
  }
};

/* -------------------------------------------------------------
   Shorthand Methods (with fixed params)
------------------------------------------------------------- */
export const apiGet = (endpoint, useAuth = false, options = {}) =>
  apiRequest(endpoint, "GET", null, useAuth, false, options);

export const apiPost = (endpoint, body, useAuth = false, isFormData = false, options = {}) =>
  apiRequest(endpoint, "POST", body, useAuth, isFormData, options);

export const apiPut = (endpoint, body, useAuth = false, isFormData = false, options = {}) =>
  apiRequest(endpoint, "PUT", body, useAuth, isFormData, options);

export const apiDelete = (endpoint, body = null, useAuth = false, options = {}) =>
  apiRequest(endpoint, "DELETE", body, useAuth, false, options);