import AsyncStorage from "@react-native-async-storage/async-storage";
import { Base64 } from "js-base64";

const BASE_URL = "https://trackingdudes.com/apis";

export const apiRequest = async (
  endpoint,
  method = "GET",
  body = null,
  useBearerAuth = false,
  isFormData = false,
  options = {}
) => {
  const url = `${BASE_URL}${endpoint}`;
  let headers = {};

  if (!isFormData) headers["Content-Type"] = "application/json";

  //  Attach access token if required
  if (useBearerAuth) {
    try {
      const tokens = await AsyncStorage.getItem("tokens");
      if (tokens) {
        const parsed = JSON.parse(tokens);
        if (parsed?.access) {
          headers["Authorization"] = `Bearer ${parsed.access}`;
        }
      }
    } catch (err) {
      console.warn("Token load failed:", err);
    }
  }

  //  Handle Basic Auth (for login)
  const isLoginEndpoint = endpoint.includes("/tokens/new/");
  if ((options.useBasicAuth || isLoginEndpoint) && body?.username && body?.password) {
    const credentials = `${body.username}:${body.password}`;
    const encoded = Base64.encode(credentials);
    headers["Authorization"] = `Basic ${encoded}`;
  }

  const fetchOptions = {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  };
 console.log(fetchOptions);
 
  try {
    const response = await fetch(url, fetchOptions);
    const text = await response.text();

    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
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

// Helper functions
export const apiGet = (endpoint, useBearerAuth = false) =>
  apiRequest(endpoint, "GET", null, useBearerAuth);

export const apiPost = (
  endpoint,
  body = null,
  useBearerAuth = false,
  isFormData = false,
  options = {}
) => apiRequest(endpoint, "POST", body, useBearerAuth, isFormData, options);

export const apiPut = (
  endpoint,
  body = null,
  useBearerAuth = false,
  isFormData = false,
  options = {}
) => apiRequest(endpoint, "PUT", body, useBearerAuth, isFormData, options);

export const apiDelete = (endpoint, useBearerAuth = false) =>
  apiRequest(endpoint, "DELETE", null, useBearerAuth);



// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { Base64 } from "js-base64";

// const BASE_URL = "https://trackingdudes.com/apis";

//  //Helper: Refresh access token if expired

// const refreshAccessToken = async () => {
//   try {
//     const tokens = await AsyncStorage.getItem("tokens");
//     if (!tokens) return null;

//     const parsed = JSON.parse(tokens);
//     const refresh = parsed?.refresh;
//     if (!refresh) return null;

//     console.log(" Refreshing access token...");

//     const response = await fetch(`${BASE_URL}/tokens/refresh/`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ refresh }),
//     });

//     if (!response.ok) {
//       console.warn(" Token refresh failed:", response.status);
//       return null;
//     }

//     const data = await response.json();

//     if (data?.access) {
//       const newTokens = { ...parsed, access: data.access };
//       await AsyncStorage.setItem("tokens", JSON.stringify(newTokens));
//       console.log(" Access token refreshed");
//       return data.access;
//     }
//   } catch (err) {
//     console.warn(" Token refresh error:", err);
//   }

//   return null;
// };

// /**
//  Generic API Request Handler
//  */
// export const apiRequest = async (
//   endpoint,
//   method = "GET",
//   body = null,
//   useBearerAuth = false,
//   isFormData = false,
//   options = {}
// ) => {
//   const url = `${BASE_URL}${endpoint}`;
//   let headers = {};

//   if (!isFormData) headers["Content-Type"] = "application/json";

//   //  Add Bearer Token if required
//   if (useToken) {
//     try {
//       const tokens = await AsyncStorage.getItem("tokens");
//       if (tokens) {
//         const parsed = JSON.parse(tokens);
//         if (parsed?.access) {
//           headers["Authorization"] = `Bearer ${parsed.access}`;
//         }
//       }
//     } catch (err) {
//       console.warn(" Token load failed:", err);
//     }
//   }

//   //  Auto or Manual Basic Auth (for login)
//   const isLoginEndpoint = endpoint.includes("/tokens/new/");
//   if ((options.useBasicAuth || isLoginEndpoint) && body?.username && body?.password) {
//     const credentials = `${body.username}:${body.password}`;
//     const encoded = Base64.encode(credentials);
//     headers["Authorization"] = `Basic ${encoded}`;
//     console.log(" BASIC AUTH HEADER:", headers["Authorization"]);
//   }

//   const fetchOptions = {
//     method,
//     headers,
//     body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
//   };

//   try {
//     if (__DEV__) {
//       console.log(" FETCH OPTIONS:", { url, ...fetchOptions });
//     }

//     const response = await fetch(url, fetchOptions);
//     const text = await response.text();

//     let data;
//     try {
//       data = text ? JSON.parse(text) : null;
//     } catch {
//       data = text;
//     }

//     //  Handle expired access tokens (401)
//     if (response.status === 401 && useToken ) {
//       console.warn(" Access token expired — attempting refresh...");
//       const newAccess = await refreshAccessToken();

//       if (newAccess) {
//         headers["Authorization"] = `Bearer ${newAccess}`;
//         const retryResponse = await apiRequest(
//           endpoint,
//           method,
//           body,
//           useToken,
//           isFormData,
//           options
//         );
//         return retryResponse;
//       }
//     }

//     return data;
//   } catch (error) {
//     console.error(" Network error:", error);
//     return {
//       status: "error",
//       error: "NetworkError",
//       message: "Network error, please try again later.",
//     };
//   }
// };

// /**
//  *  Helper Methods
//  */
// export const apiGet = (endpoint, useToken = false) =>
//   apiRequest(endpoint, "GET", null, useToken);

// export const apiPost = (
//   endpoint,
//   body = null,
//   useToken = false,
//   isFormData = false,
//   options = {}
// ) => apiRequest(endpoint, "POST", body, useToken, isFormData, options);

// export const apiPut = (
//   endpoint,
//   body = null,
//   useToken = false,
//   isFormData = false,
//   options = {}
// ) => apiRequest(endpoint, "PUT", body, useToken, isFormData, options);

// export const apiDelete = (endpoint, useToken = false) =>
//   apiRequest(endpoint, "DELETE", null, useToken);
