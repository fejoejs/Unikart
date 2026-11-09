import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import ProtectedRoute from './ProtectedRoute';

// Layouts
import AdminLayout from '../layouts/AdminLayout';
import InventoryStaffLayout from '../layouts/InventoryStaffLayout';

// Core Application Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import CustomerOrders from '../pages/admin/CustomerOrders';
import EmployeeManagement from '../pages/admin/EmployeeManagement';
import MyProfile from '../pages/admin/MyProfile';
import ProductCatalog from '../pages/inventory-staff/ProductCatalog';
import InventoryStaffDashboard from '../pages/inventory-staff/InventoryStaffDashboard';
import StockAdjustment from '../pages/inventory-staff/StockAdjustment';
import LowStockAlerts from '../pages/inventory-staff/LowStockAlerts';

// Centralized Employee Login from @unikart/ui
import { EmployeeLoginPage } from '@unikart/ui';
import { Boxes } from 'lucide-react';
import { supabase } from '../services/supabase';

export function AppRoutes() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const handleLoginSuccess = ({ token, user }) => {
    setAuth(token, user);
    const roleId = user?.roleId || '';
    const roles = Array.isArray(user?.roles) ? user.roles : [user?.roles || ''];
    const isAdminUser =
      user?.roleLevel >= 8 ||
      roleId === 'role-admin' ||
      roleId === 'role-owner' ||
      roles.includes('admin') ||
      roles.includes('owner') ||
      (user?.email && user.email.toLowerCase() === 'admin@unikart.in');

    if (isAdminUser) {
      navigate('/admin/overview', { replace: true });
    } else {
      navigate('/inventory/dashboard', { replace: true });
    }
  };

  return (
    <Routes>
      {/* Initial entry point: always go to login page */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Centralized Employee Login Route */}
      <Route
        path="/login"
        element={
          <EmployeeLoginPage
            appId="inventory"
            appName="UNIKART Business Suite Login"
            appSubtitle="Sign in to Admin Governance or Authorized Inventory Workspace."
            appIcon={Boxes}
            supabaseClient={supabase}
            onLoginSuccess={handleLoginSuccess}
          />
        }
      />

      {/* ADMIN GOVERNANCE ROUTES (Protected: Admin Only) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/overview" replace />} />
        <Route path="overview" element={<AdminDashboard />} />
        <Route path="orders" element={<CustomerOrders />} />
        <Route path="products" element={<ProductCatalog />} />
        <Route path="categories" element={<ProductCatalog />} />
        <Route path="low-stock" element={<LowStockAlerts />} />
        <Route path="employees" element={<EmployeeManagement />} />
        <Route path="settings" element={<Navigate to="/admin/overview" replace />} />
        <Route path="profile" element={<MyProfile />} />
        <Route path="account" element={<MyProfile />} />

        {/* Fallbacks for older links */}
        <Route path="*" element={<Navigate to="/admin/overview" replace />} />
      </Route>

      {/* INVENTORY STAFF OPERATIONAL ROUTES (Protected: Staff & Admin) */}
      <Route
        path="/inventory"
        element={
          <ProtectedRoute requiredRole="inventory_staff">
            <InventoryStaffLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/inventory/dashboard" replace />} />
        <Route path="dashboard" element={<InventoryStaffDashboard />} />
        <Route path="products" element={<ProductCatalog />} />
        <Route path="catalog" element={<ProductCatalog />} />
        <Route path="adjustments" element={<StockAdjustment />} />
        <Route path="low-stock" element={<LowStockAlerts />} />
        <Route path="profile" element={<MyProfile />} />
        <Route path="account" element={<MyProfile />} />

        {/* Fallbacks for older links */}
        <Route path="*" element={<Navigate to="/inventory/dashboard" replace />} />
      </Route>

      {/* Global Fallback to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRoutes;
