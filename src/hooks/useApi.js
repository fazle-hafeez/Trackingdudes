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

        if (!response) {
          const msg = "Empty response from server.";
          showModal(msg, "error");
          setError(msg);
          return null;
        }

        if (response.status === undefined && response.error) {
          const msg = response?.message || "A server error occurred. Please try again later.";
          showModal(msg, "error");
          setError(msg);
          return null;
        }

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

  const get = useCallback(
    (endpoint, useToken = false) =>
      request(apiGet, endpoint, useToken),
    [request]
  );

  //  Now includes options parameter (for Basic Auth etc.)
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
