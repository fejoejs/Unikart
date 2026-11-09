export const TOKEN_KEY = "unikart_token";
export const USER_KEY = "unikart_user";

export function getToken() {
  if (typeof window === "undefined") return null;
  const direct = localStorage.getItem(TOKEN_KEY) || localStorage.getItem("unikart_emp_token") || localStorage.getItem("unikart_admin_token");
  if (direct) return direct;
  try {
    const raw = localStorage.getItem("unikart_enterprise_auth_state");
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.state?.currentUser?.token || null;
    }
  } catch {}
  return null;
}

export function setToken(token) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem("unikart_emp_token", token);
}

export function removeToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("unikart_emp_token");
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("unikart_admin_token");
  localStorage.removeItem("unikart_admin_user");
}

export function getUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw);
    const adminRaw = localStorage.getItem("unikart_admin_user");
    if (adminRaw) return JSON.parse(adminRaw);
    const storeRaw = localStorage.getItem("unikart_enterprise_auth_state");
    if (storeRaw) {
      const parsed = JSON.parse(storeRaw);
      return parsed.state?.currentUser || null;
    }
  } catch {}
  return null;
}

export function setUser(user) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function hasRole(requiredRoles = []) {
  if (!requiredRoles.length) return true;
  const user = getUser();
  if (!user || !user.roles) return false;
  if (user.roles.includes("admin") || user.roles.includes("owner") || (user.roleLevel && user.roleLevel >= 9)) return true;
  return requiredRoles.some((r) => user.roles.includes(r));
}

export function hasPermission(requiredPermission) {
  if (!requiredPermission) return true;
  const user = getUser();
  if (!user) return false;
  if (user.roles?.includes("admin") || user.roles?.includes("owner") || (user.roleLevel && user.roleLevel >= 9)) return true;
  return user.permissions?.includes(requiredPermission) ?? false;
}

export { useEnterpriseAuthStore, ENTERPRISE_APPS, getAppUrl } from './useEnterpriseAuthStore.js';
export { ProtectedRoute } from './ProtectedRoute.jsx';

