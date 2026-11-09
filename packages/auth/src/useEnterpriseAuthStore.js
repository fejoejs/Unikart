// packages/auth/src/useEnterpriseAuthStore.js - Consolidated 2-App RBAC for UNIKART
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '@unikart/api-client';

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours strict lifetime

export const ENTERPRISE_APPS = [
  {
    id: 'storefront',
    number: '01',
    name: 'Customer E-Commerce Storefront',
    shortName: 'Storefront',
    route: '/',
    port: 5173,
    subdomain: 'storefront.unikart.com',
    icon: 'ShoppingBag',
    color: '#E31837',
    description: 'Online customer shopping catalog, cart, and checkout.',
    primaryRole: 'Customer'
  },
  {
    id: 'inventory',
    number: '02',
    name: 'Inventory & Business Management',
    shortName: 'Inventory / Business',
    route: '/',
    port: 5177,
    subdomain: 'inventory.unikart.com',
    icon: 'Boxes',
    color: '#0284C7',
    description: 'Consolidated management: Admin company governance and authorized Inventory Staff operations.',
    primaryRole: 'Admin & Inventory Staff'
  }
];

export function getAppUrl(appId) {
  const target = ENTERPRISE_APPS.find((a) => a.id === appId);
  if (!target) return '/';

  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      return `http://localhost:${target.port}/`;
    }
    if (appId === 'storefront' && typeof import.meta !== 'undefined' && import.meta.env?.VITE_STOREFRONT_URL) {
      return import.meta.env.VITE_STOREFRONT_URL;
    }
    if (appId === 'inventory' && typeof import.meta !== 'undefined' && import.meta.env?.VITE_INVENTORY_URL) {
      return import.meta.env.VITE_INVENTORY_URL;
    }
    if (appId === 'storefront') return 'https://unikart-in.vercel.app/';
    if (appId === 'inventory') return 'https://unikart-inventory.vercel.app/';
    return `https://${target.subdomain}/`;
  }
  return target.route;
}

export const useEnterpriseAuthStore = create(
  persist(
    (set, get) => ({
      currentUser: null,
      userType: 'GUEST',
      isVerifying: false,

      checkSessionExpiry: () => {
        const u = get().currentUser;
        if (u && u.loginTime && Date.now() - u.loginTime > SESSION_MAX_AGE_MS) {
          get().logout();
          return false;
        }
        return true;
      },

      loginStaff: async ({ email, employeeId, password }) => {
        try {
          const res = await apiClient.post('/auth/login', {
            email: email || employeeId,
            password
          });
          if (res.data?.access_token) {
            const token = res.data.access_token;
            const now = Date.now();
            const rawUser = res.data.user || {};
            const roles = rawUser.roles || res.data.roles || ['inventory_staff'];
            const isAdminUser = roles.includes('admin');

            const user = {
              id: rawUser.id || res.data.user_id,
              name: rawUser.name || rawUser.fullName || res.data.full_name,
              email: rawUser.email || res.data.email,
              roleLevel: isAdminUser ? 9 : 5,
              roles: isAdminUser ? ['admin'] : ['inventory_staff'],
              roleName: isAdminUser ? 'Admin' : 'Inventory Staff',
              roleId: isAdminUser ? 'role-admin' : 'role-inventory-staff',
              permissions: isAdminUser ? ['*'] : ['inventory:*', 'catalog:read', 'orders:read'],
              permittedApps: ['storefront', 'inventory'],
              loginTime: now
            };

            localStorage.setItem('unikart_token', token);
            localStorage.setItem('unikart_emp_token', token);
            localStorage.setItem('unikart_user', JSON.stringify({ ...user, token }));
            localStorage.setItem('unikart_emp_login_time', now.toString());

            set({
              currentUser: { ...user, token },
              userType: 'EMPLOYEE'
            });
            return { success: true, user };
          }
          return { success: false, error: 'Login failed' };
        } catch (err) {
          return { success: false, error: err.response?.data?.detail || err.message || 'Staff authentication error' };
        }
      },

      

      logout: () => {
        localStorage.removeItem('unikart_token');
        localStorage.removeItem('unikart_emp_token');
        localStorage.removeItem('unikart_user');
        localStorage.removeItem('unikart_emp_login_time');
        set({
          currentUser: null,
          userType: 'GUEST'
        });
      },

      hasAppAccess: (appId) => {
        const user = get().currentUser;
        if (!user) return false;
        if (user.roles?.includes('admin') || user.roleLevel >= 8) return true;
        return user.permittedApps?.includes(appId) ?? false;
      }
    }),
    {
      name: 'unikart_enterprise_auth_state',
      partialize: (state) => ({
        currentUser: state.currentUser,
        userType: state.userType
      })
    }
  )
);

export default useEnterpriseAuthStore;
