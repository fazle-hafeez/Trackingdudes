import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://trackingdudes.com/apis";

export const apiRequest = async (
  endpoint,
  method = "GET",
  body = null,
  useToken = false,
  isFormData = false
) => {
  const url = `${BASE_URL}${endpoint}`;
  let headers = {};

  if (!isFormData) headers["Content-Type"] = "application/json";

  if (useToken) {
    try {
      const storedTokens = await AsyncStorage.getItem("tokens");
      if (storedTokens) {
        const parsed = JSON.parse(storedTokens);
        if (parsed?.accessToken) {
          headers["Authorization"] = `Bearer ${parsed.accessToken}`;
        }
      }
    } catch (error) {
      console.warn("Failed to load token:", error);
    }
  }

  const options = { method, headers };
  if (body) options.body = isFormData ? body : JSON.stringify(body);

  try {
    const response = await fetch(url, options);
    const text = await response.text();

    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    console.log("RAW RESPONSE STATUS:", response.status);
    console.log("RAW RESPONSE BODY:", data);

    // Always return backend JSON even if status != 200
    if (!response.ok) {
      // Return full backend object (not overridden)
      return data || {
        status: "error",
        error: "Unknown server error",
        message: "Server returned an invalid response",
      };
    }

    return data;
  } catch (error) {
    return {
      status: "error",
      error: "NetworkError",
      message: "Network error, please try again later.",
    };
  }
};

export const apiGet = (endpoint, useToken = false) =>
  apiRequest(endpoint, "GET", null, useToken);

export const apiPost = (endpoint, body = null, useToken = false, isFormData = false) =>
  apiRequest(endpoint, "POST", body, useToken, isFormData);

export const apiPut = (endpoint, body = null, useToken = false, isFormData = false) =>
  apiRequest(endpoint, "PUT", body, useToken, isFormData);

export const apiDelete = (endpoint, useToken = false) =>
  apiRequest(endpoint, "DELETE", null, useToken);
