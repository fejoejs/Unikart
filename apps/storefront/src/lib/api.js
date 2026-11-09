import axios from "axios"

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      return import.meta.env.VITE_RENDER_API_URL || 'https://unikart-api.onrender.com/api/v1';
    }
  }
  return '/api/v1';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach Auth & Session Tokens + Request Timing
api.interceptors.request.use((config) => {
  config.metadata = { startTime: Date.now() }

  const token = localStorage.getItem("unikart_token") || localStorage.getItem("unikart_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Session token for anonymous cart tracking
  let sessionToken = localStorage.getItem("unikart_session_token")
  if (!sessionToken) {
    sessionToken = `sess_${Math.random().toString(36).substring(2)}${Date.now()}`
    localStorage.setItem("unikart_session_token", sessionToken)
  }
  config.headers["X-Session-Token"] = sessionToken

  return config
})

// Response Interceptor: Slow Network Detection & Standardized Error Sanitization
api.interceptors.response.use(
  (response) => {
    const duration = Date.now() - (response.config?.metadata?.startTime || Date.now())
    if (duration > 3500) {
      window.dispatchEvent(
        new CustomEvent("unikart:slow-network", {
          detail: { duration, url: response.config?.url }
        })
      )
    }
    return response
  },
  (error) => {
    // Determine status & sanitize user message
    const status = error.response?.status
    const detail = error.response?.data?.detail

    let userMessage = "An unexpected error occurred. Please try again."

    if (!error.response) {
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        userMessage = "Request timed out. The server took too long to respond."
        window.dispatchEvent(new CustomEvent("unikart:slow-network", { detail: { timedOut: true } }))
      } else {
        userMessage = "Unable to connect to Unikart servers. Please check your internet connection."
        window.dispatchEvent(new CustomEvent("unikart:network-offline"))
      }
    } else if (status === 401) {
      userMessage = "Your session has expired. Please sign in again."
      window.dispatchEvent(
        new CustomEvent("unikart:session-expired", {
          detail: { returnUrl: window.location.pathname }
        })
      )
    } else if (status === 403) {
      userMessage = "You do not have permission to perform this action."
      window.dispatchEvent(new CustomEvent("unikart:permission-denied"))
    } else if (status === 404) {
      userMessage = typeof detail === "string" ? detail : "The requested resource could not be found."
    } else if (status === 429) {
      userMessage = "Too many requests. Please wait a moment before trying again."
      window.dispatchEvent(new CustomEvent("unikart:rate-limited"))
    } else if (status === 503) {
      userMessage = "Unikart is currently undergoing brief maintenance. Please try again shortly."
      window.dispatchEvent(new CustomEvent("unikart:maintenance"))
    } else if (status >= 500) {
      userMessage = "A server error occurred. Our technical team has been notified."
    } else if (typeof detail === "string") {
      userMessage = detail
    } else if (Array.isArray(detail)) {
      // Pydantic validation error list formatting
      userMessage = detail.map((d) => d.msg || "Invalid value").join(", ")
    }

    error.userMessage = userMessage
    return Promise.reject(error)
  }
)

export default api
