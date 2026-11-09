import axios from "axios";

const getApiBaseUrl = () => {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== "undefined") {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!isLocal) {
      return (typeof import.meta !== "undefined" && import.meta.env?.VITE_RENDER_API_URL) || "https://unikart-backend.onrender.com/api/v1";
    }
  }
  return "http://localhost:8000/api/v1";
};

export const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json"
  }
});

// Request interceptor: attach bearer token and session header
apiClient.interceptors.request.use((config) => {
  config.metadata = { startTime: Date.now() };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("unikart_token") || localStorage.getItem("unikart_emp_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    let sessionToken = localStorage.getItem("unikart_session_token");
    if (!sessionToken) {
      sessionToken = `sess_${Math.random().toString(36).substring(2)}${Date.now()}`;
      localStorage.setItem("unikart_session_token", sessionToken);
    }
    config.headers["X-Session-Token"] = sessionToken;
  }

  return config;
});

// Response interceptor: handle token expiry & format errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail || error.response?.data?.error;

    let userMessage = "An unexpected error occurred. Please try again.";

    if (!error.response) {
      userMessage = "Unable to connect to UNIKART servers. Please check your network connection.";
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("unikart:network-offline"));
      }
    } else if (status === 401) {
      userMessage = "Your session has expired. Please sign in again.";
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("unikart:session-expired", { detail: { returnUrl: window.location.pathname } }));
      }
    } else if (status === 403) {
      userMessage = "You do not have permission to perform this action.";
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("unikart:permission-denied"));
      }
    } else if (typeof detail === "string") {
      userMessage = detail;
    } else if (Array.isArray(detail)) {
      userMessage = detail.map((d) => d.msg || "Invalid parameter").join(", ");
    }

    error.userMessage = userMessage;
    return Promise.reject(error);
  }
);

export default apiClient;
