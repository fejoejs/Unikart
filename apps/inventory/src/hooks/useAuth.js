import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const store = useAuthStore();

  return {
    user: store.user,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    isSessionExpired: store.isSessionExpired,
    isAdmin: store.isAdmin(),
    isInventoryStaff: store.isInventoryStaff(),
    loginTime: store.loginTime,
    setAuth: store.setAuth,
    logout: store.logout,
    checkSessionValidity: store.checkSessionValidity,
  };
}

export default useAuth;
