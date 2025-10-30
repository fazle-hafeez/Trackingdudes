import { useState, useCallback } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../utils/api";
import { useAuth } from "../context/UseAuth";

export const useApi = () => {
  const { showModal } = useAuth();
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  //  Fresh Request Function (No Cache at all)
  const request = useCallback(
    async (apiFunc, ...args) => {
      setError(null);
      try {
        const response = await apiFunc(...args);

        // If API returns empty or malformed response
        if (!response) {
          const msg = "Empty response from server.";
          showModal(msg, "error");
          setError(msg);
          return null;
        }

        // If API returns known error pattern
        if (response.status === undefined && response.error) {
          const msg = response?.message || "A server error occurred.";
          showModal(msg, "error");
          setError(msg);
          return null;
        }

        setData(response);
        return response;
      } catch (err) {
        const msg = err?.message || "A network/server error occurred.";
        showModal(msg, "error");
        setError(msg);
        return null;
      }
    },
    [showModal]
  );

  // ---- GET / POST / PUT / DELETE wrappers ----
  const get = useCallback(
    (endpoint, config = {}) =>
      request(apiGet, endpoint, config.useBearerAuth || false, config.options || {}),
    [request]
  );

  const post = useCallback(
    (endpoint, body = null, useToken = false, isFormData = false, options = {}) =>
      request(apiPost, endpoint, body, useToken, isFormData, options),
    [request]
  );

  const put = useCallback(
    (endpoint, body = null, useToken = false, isFormData = false, options = {}) =>
      request(apiPut, endpoint, body, useToken, isFormData, options),
    [request]
  );

  const del = useCallback(
    (endpoint, body = null, useToken = false, options = {}) =>
      request(apiDelete, endpoint, body, useToken, options),
    [request]
  );

  return { get, post, put, del, error, data };
};
