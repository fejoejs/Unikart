import { create } from 'zustand';

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours strict lifetime

export const useAuthStore = create((set, get) => {
  // Prioritize Tab-Isolated sessionStorage to prevent cross-tab role leakage
  const tabToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('unikart_tab_token') : null;
  const tabUserRaw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('unikart_tab_user') : null;
  const tabLoginTimeRaw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('unikart_tab_login_time') : null;

  const storedToken = tabToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('unikart_emp_token') || localStorage.getItem('unikart_token') : null);
  const storedUserRaw = tabUserRaw || (typeof localStorage !== 'undefined' ? localStorage.getItem('unikart_user') : null);
  const storedLoginTimeRaw = tabLoginTimeRaw || (typeof localStorage !== 'undefined' ? localStorage.getItem('unikart_emp_login_time') : null);
  
  let initialUser = null;
  let isExpired = false;

  if (storedToken && storedUserRaw) {
    try {
      initialUser = JSON.parse(storedUserRaw);
      const loginTime = storedLoginTimeRaw ? parseInt(storedLoginTimeRaw, 10) : Date.now();
      if (Date.now() - loginTime > SESSION_MAX_AGE_MS) {
        // Session expired
        isExpired = true;
        initialUser = null;
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('unikart_tab_token');
          sessionStorage.removeItem('unikart_tab_user');
          sessionStorage.removeItem('unikart_tab_login_time');
        }
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('unikart_emp_token');
          localStorage.removeItem('unikart_token');
          localStorage.removeItem('unikart_user');
          localStorage.removeItem('unikart_emp_login_time');
        }
      }
    } catch {
      initialUser = null;
    }
  }

  return {
    token: isExpired ? null : storedToken,
    user: initialUser,
    isAuthenticated: !!initialUser && !isExpired,
    isSessionExpired: isExpired,
    loginTime: storedLoginTimeRaw ? parseInt(storedLoginTimeRaw, 10) : null,
    theme: localStorage.getItem('unikart_theme') || 'light',

    // Role helper
    isAdmin: () => {
      const u = get().user;
      if (!u) return false;
      if (u.email && u.email.toLowerCase() === 'inventory@unikart.in') return false;
      const roles = Array.isArray(u.roles) ? u.roles : [u.role || u.roleId].filter(Boolean);
      return (
        (u.email && u.email.toLowerCase() === 'admin@unikart.in') ||
        u.roleId === 'role-admin' ||
        u.roleId === 'role-owner' ||
        roles.includes('admin') ||
        roles.includes('owner') ||
        (Number(u.roleLevel) >= 8) ||
        (Number(u.level) >= 8)
      );
    },

    isInventoryStaff: () => {
      const u = get().user;
      if (!u) return false;
      // Strict role isolation: Admin credentials never overlap with inventory staff
      if (get().isAdmin()) return false;
      const roles = Array.isArray(u.roles) ? u.roles : [u.role || u.roleId].filter(Boolean);
      return (
        (u.email && u.email.toLowerCase() === 'inventory@unikart.in') ||
        roles.includes('inventory_staff') ||
        roles.includes('inventory') ||
        u.roleId === 'role-inventory-staff' ||
        u.roleId === 'role-inventory-manager' ||
        (Number(u.roleLevel) < 8)
      );
    },

    setAuth: (token, user) => {
      const now = Date.now();
      // Strictly scope to current tab
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('unikart_tab_token', token);
        sessionStorage.setItem('unikart_tab_user', JSON.stringify(user));
        sessionStorage.setItem('unikart_tab_login_time', now.toString());
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('unikart_emp_token', token);
        localStorage.setItem('unikart_token', token);
        localStorage.setItem('unikart_user', JSON.stringify(user));
        localStorage.setItem('unikart_emp_login_time', now.toString());
      }
      set({
        token,
        user,
        loginTime: now,
        isAuthenticated: true,
        isSessionExpired: false,
      });
    },

    checkSessionValidity: () => {
      const loginTime = get().loginTime;
      if (loginTime && Date.now() - loginTime > SESSION_MAX_AGE_MS) {
        get().handleSessionExpired();
        return false;
      }
      return true;
    },

    logout: () => {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('unikart_tab_token');
        sessionStorage.removeItem('unikart_tab_user');
        sessionStorage.removeItem('unikart_tab_login_time');
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('unikart_emp_token');
        localStorage.removeItem('unikart_token');
        localStorage.removeItem('unikart_user');
        localStorage.removeItem('unikart_emp_login_time');
      }
      set({
        token: null,
        user: null,
        loginTime: null,
        isAuthenticated: false,
        isSessionExpired: false,
      });
    },

    handleSessionExpired: () => {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('unikart_tab_token');
        sessionStorage.removeItem('unikart_tab_user');
        sessionStorage.removeItem('unikart_tab_login_time');
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('unikart_emp_token');
        localStorage.removeItem('unikart_token');
        localStorage.removeItem('unikart_user');
        localStorage.removeItem('unikart_emp_login_time');
      }
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isSessionExpired: true,
      });
    },

    restoreSession: (newToken, updatedUser) => {
      const now = Date.now();
      localStorage.setItem('unikart_emp_token', newToken);
      localStorage.setItem('unikart_token', newToken);
      if (updatedUser) {
        localStorage.setItem('unikart_user', JSON.stringify(updatedUser));
      }
      localStorage.setItem('unikart_emp_login_time', now.toString());
      set({
        token: newToken,
        user: updatedUser || get().user,
        loginTime: now,
        isAuthenticated: true,
        isSessionExpired: false,
      });
    },

    toggleTheme: () => {
      const current = get().theme;
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('unikart_theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      set({ theme: next });
    },
  };
});

export default useAuthStore;
