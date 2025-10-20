import { useState, useCallback } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../utils/api";
import { useAuth } from "../context/UseAuth";

export const useApi = () => {
  const { showModal } = useAuth();
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const request = useCallback(
    async (apiFunc, ...args) => {
      setError(null);

      try {
        const response = await apiFunc(...args);
        //  Preserve backend response (even if it contains "error" key)
        if (!response) {
          const msg = "Empty response from server.";
          showModal(msg, "error");
          setError(msg);
          return null;
        }

        // Only show modal for fetch-level errors (no status)
        if (response.status === undefined && response.error) {
          const msg = response?.message || "A server error occurred. Please try again later.";
          showModal(msg, "error");
          setError(msg);
          return null;
        }

        //  Save and return backend response as-is
        setData(response);
        return response;
      } catch (err) {
        const msg = err?.message || "A server error occurred. Please try again later.";
        showModal(msg, "error");
        setError(msg);
        return null;
      }
    },
    [showModal]
  );

  const get = useCallback((endpoint, useToken = false) => request(apiGet, endpoint, useToken), [request]);
  const post = useCallback(
    (endpoint, body, useToken = false, isFormData = false) =>
      request(apiPost, endpoint, body, useToken, isFormData),
    [request]
  );
  const put = useCallback(
    (endpoint, body, useToken = false, isFormData = false) =>
      request(apiPut, endpoint, body, useToken, isFormData),
    [request]
  );
  const del = useCallback((endpoint, useToken = false) => request(apiDelete, endpoint, useToken), [request]);
  return { get, post, put, del,  error, data };
};
