import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import AdminSidebar from '../components/navigation/AdminSidebar';
import CommandPalette from '../components/common/CommandPalette';
import OfflineBanner from '../components/common/OfflineBanner';
import SessionExpiredDialog from '../components/common/SessionExpiredDialog';
import MandatoryPasswordChangeModal from '../components/common/MandatoryPasswordChangeModal';
import PermissionDenied403 from '../components/common/PermissionDenied403';
import { useAuthStore } from '../stores/authStore';
import { Menu } from 'lucide-react';
import { UnikartLogo } from '@unikart/ui';

export function AdminLayout() {
  const location = useLocation();
  const { isAuthenticated, checkSessionValidity, isAdmin } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Strict Security Isolation: If not authenticated, redirect to login
  if (!isAuthenticated || !checkSessionValidity()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strict Role Isolation: Any non-admin attempting to enter /admin/* is blocked
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

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-[#121212] text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <OfflineBanner />
      <MandatoryPasswordChangeModal />

      {/* Mobile Sticky Top Header (< lg) */}
      <div className="lg:hidden h-14 bg-[#1E1E1E] text-white flex items-center justify-between px-4 sticky top-0 z-30 border-b border-[#333333]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-[#333333] transition-colors cursor-pointer"
            aria-label="Open Admin Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <UnikartLogo variant="white" size="sm" showTagline={false} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E31837] text-white uppercase tracking-wider">
            Admin
          </span>
        </div>
      </div>

      <AdminSidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <main
        className={`flex-1 transition-all duration-300 pl-0 ${
          collapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <div className="p-3 sm:p-6 max-w-7xl mx-auto pb-12">
          <Outlet />
        </div>
      </main>

      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
      <SessionExpiredDialog />
    </div>
  );
}

export default AdminLayout;
