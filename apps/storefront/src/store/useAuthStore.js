import { create } from "zustand"
import api from "../lib/api"

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem("unikart_token") || localStorage.getItem("unikart_token") || null,
  isAuthenticated: !!(localStorage.getItem("unikart_token") || localStorage.getItem("unikart_token")),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const res = await api.post("/auth/login", { email, password })
      const { access_token, user_id, full_name, roles, permissions } = res.data
      localStorage.setItem("unikart_token", access_token)
      localStorage.setItem("unikart_token", access_token)
      set({
        token: access_token,
        isAuthenticated: true,
        user: { id: user_id, email, full_name, roles, permissions },
        isLoading: false
      })
      return { success: true }
    } catch (err) {
      set({ isLoading: false })
      return { success: false, error: err.response?.data?.detail || "Login failed" }
    }
  },

  register: async (email, password, fullName, phone) => {
    set({ isLoading: true })
    try {
      const res = await api.post("/auth/register", {
        email,
        password,
        full_name: fullName,
        phone
      })
      const { access_token, user_id, full_name, roles } = res.data
      localStorage.setItem("unikart_token", access_token)
      localStorage.setItem("unikart_token", access_token)
      set({
        token: access_token,
        isAuthenticated: true,
        user: { id: user_id, email, full_name, roles },
        isLoading: false
      })
      return { success: true }
    } catch (err) {
      set({ isLoading: false })
      return { success: false, error: err.response?.data?.detail || "Registration failed" }
    }
  },

  logout: () => {
    localStorage.removeItem("unikart_token")
    set({ user: null, token: null, isAuthenticated: false })
  },

  oauthLogin: async ({ provider = "google", email, token, full_name, phone }) => {
    set({ isLoading: true })
    try {
      const res = await api.post("/auth/oauth", {
        provider,
        email,
        token,
        full_name,
        phone
      })
      const { access_token, user_id, full_name: name, roles, permissions } = res.data
      localStorage.setItem("unikart_token", access_token)
      set({
        token: access_token,
        isAuthenticated: true,
        user: { id: user_id, email, full_name: name, roles, permissions },
        isLoading: false
      })
      return { success: true }
    } catch (err) {
      set({ isLoading: false })
      return { success: false, error: err.response?.data?.detail || "OAuth sign-in failed" }
    }
  },

  fetchProfile: async () => {
    const token = localStorage.getItem("unikart_token") || localStorage.getItem("unikart_token")
    if (!token) return
    try {
      const res = await api.get("/auth/me")
      set({ user: res.data, isAuthenticated: true })
    } catch {
      localStorage.removeItem("unikart_token")
      localStorage.removeItem("unikart_token")
      set({ user: null, token: null, isAuthenticated: false })
    }
  }
}))
