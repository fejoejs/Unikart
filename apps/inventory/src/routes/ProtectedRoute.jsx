import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import PermissionDenied403 from '../components/common/PermissionDenied403';

export function ProtectedRoute({ children, requiredRole = 'staff' }) {
  const location = useLocation();
  const { isAuthenticated, checkSessionValidity, isAdmin, isInventoryStaff } = useAuthStore();

  if (!isAuthenticated || !checkSessionValidity()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strict Admin Isolation: Admin routes can ONLY be accessed by Admin credentials
  if (requiredRole === 'admin') {
    if (!isAdmin()) {
      return (
        <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 flex items-center justify-center p-6">
          <PermissionDenied403
            resourceName="Admin Governance Suite"
            requiredRole="System Administrator"
          />
        </div>
      );
    }
  }

  // Inventory Staff routes: Accessible by Inventory Staff and System Administrators
  if (requiredRole === 'inventory_staff') {
    if (!isInventoryStaff() && !isAdmin()) {
      return (
        <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 flex items-center justify-center p-6">
          <PermissionDenied403
            resourceName="Inventory Operations Workspace"
            requiredRole="Authorized Inventory Staff"
          />
        </div>
      );
    }
  }

  return children;
}

export const RoleRoute = ProtectedRoute;
export default ProtectedRoute;
