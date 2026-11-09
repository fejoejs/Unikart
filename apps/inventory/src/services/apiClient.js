import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      return import.meta.env.VITE_RENDER_API_URL || 'https://unikart-backend.onrender.com/api/v1';
    }
  }
  return '/api/v1';
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 25000,
});

apiClient.interceptors.request.use(
  (config) => {
    // 24-hour session check before request
    const authStore = useAuthStore.getState();
    if (!authStore.checkSessionValidity()) {
      return Promise.reject(new Error('Session has exceeded maximum 24-hour lifetime.'));
    }

    const token =
      authStore.token ||
      (typeof window !== 'undefined'
        ? sessionStorage.getItem('unikart_tab_token') ||
          localStorage.getItem('unikart_emp_token') ||
          localStorage.getItem('unikart_token')
        : null);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.metadata = { startTime: new Date() };
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response;
      if (status === 401) {
        useAuthStore.getState().handleSessionExpired();
      } else if (status === 403) {
        if (!useAuthStore.getState().isAdmin()) {
          if (window.location.pathname.startsWith('/admin')) {
            window.location.replace('/inventory/dashboard');
          }
        } else {
          if (window.location.pathname.startsWith('/inventory')) {
            window.location.replace('/admin/overview');
          }
        }
      }
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('Network Error')) {
      window.dispatchEvent(new CustomEvent('app:network-error', { detail: error }));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
