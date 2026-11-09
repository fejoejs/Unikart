import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useEnterpriseAuthStore } from './useEnterpriseAuthStore.js';
import { getToken, getUser } from './index.js';

export function ProtectedRoute({ children, allowedRoles = [], appId, fallbackPath = '/login' }) {
  const location = useLocation();
  const { currentUser, checkSessionExpiry } = useEnterpriseAuthStore();
  
  if (checkSessionExpiry && !checkSessionExpiry()) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  const token = getToken() || currentUser?.token;
  const user = getUser() || currentUser;

  if (!token || !user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Admin / Owner level has universal access
  const isSuper = user?.roles?.includes('admin') || user?.roles?.includes('owner') || (user?.roleLevel && user?.roleLevel >= 9);
  const roleMatch = allowedRoles.length === 0 || allowedRoles.some((r) => user?.roles?.includes(r) || user?.roleId?.includes(r));
  const appMatch = !appId || user?.permittedApps?.includes(appId) || user?.permittedApps?.includes('*');

  if (!isSuper && !roleMatch && !appMatch) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4 font-sans">
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-8 max-w-md w-full text-center shadow-md">
          <div className="w-14 h-14 rounded-full bg-red-50 text-[#E31837] flex items-center justify-center mx-auto mb-4 font-bold text-2xl border border-red-100">
            !
          </div>
          <h2 className="text-xl font-bold text-[#222222] mb-2">Access Restricted</h2>
          <p className="text-xs text-[#777777] mb-6 leading-relaxed">
            Your authenticated account (<strong className="text-gray-900">{user?.email || 'User'}</strong> - {user?.roleName || user?.roleId || 'Staff'}) does not have permission to access this operational console.
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="/login"
              className="w-full py-2.5 bg-[#E31837] text-white text-xs font-bold rounded-xl hover:bg-[#C7122E] transition-all shadow-xs"
            >
              Sign In as Authorized Employee
            </a>
            <a
              href="https://unikart-in.vercel.app"
              className="w-full py-2.5 bg-[#252525] text-white text-xs font-bold rounded-xl hover:bg-black transition-all"
            >
              Return to Customer Storefront
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;

