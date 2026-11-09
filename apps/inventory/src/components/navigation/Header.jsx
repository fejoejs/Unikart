import React, { useState, useEffect } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  ShieldCheck,
  CheckCircle,
  Boxes,
  UserCheck
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../services/apiClient';
import { useNavigate } from 'react-router-dom';
import { NotificationCentreDrawer } from '@unikart/ui';

export function Header({ onOpenCommandPalette, collapsed, roleMode = 'admin' }) {
  const { theme, toggleTheme, isAdmin } = useAuthStore();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const isUserAdmin = Boolean(isAdmin && isAdmin());
  useEffect(() => {
    if (isUserAdmin) {
      apiClient.get('/superadmin/approvals?status=PENDING')
        .then((res) => {
          if (Array.isArray(res.data)) {
            setPendingApprovalsCount(res.data.length);
          }
        })
        .catch(() => {});
    }
  }, [isUserAdmin]);

  return (
    <>
      <header
        className={`fixed top-0 right-0 z-20 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 transition-all duration-300 left-0 ${
          collapsed ? 'lg:left-20' : 'lg:left-64'
        }`}
      >
        {/* Left: Quick Search */}
        <div className="flex items-center space-x-4">
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="hidden sm:flex items-center space-x-3 px-3.5 py-1.5 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search inventory, products, actions...</span>
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                Ctrl+K
              </kbd>
            </button>
          )}
        </div>

        {/* Right: Notifications Bell, Theme Toggle, 24h Session */}
        <div className="flex items-center space-x-3">
          {/* Notifications Bell */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Notification Centre"
          >
            <Bell className="w-4 h-4" />
            {(unreadCount > 0 || pendingApprovalsCount > 0) && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E8173D] ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Toggle Dark / Light theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Slide-out Unified Notification Centre */}
      <NotificationCentreDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onUnreadChange={setUnreadCount}
      />
    </>
  );
}

export default Header;
