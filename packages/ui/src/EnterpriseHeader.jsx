// packages/ui/src/EnterpriseHeader.jsx - Unified Navigation & 8-App Launcher Header
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useEnterpriseAuthStore,
  ENTERPRISE_APPS,
  getAppUrl
} from '@unikart/auth';
import AppLauncherModal from './AppLauncherModal';
import NotificationCentreDrawer from './NotificationCentreDrawer';
import UnikartLogo from './UnikartLogo';
import {
  Grid,
  ShoppingBag,
  UserCheck,
  ChevronDown,
  LogOut,
  Bell,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export default function EnterpriseHeader({ currentAppId, appTitle, subtitle }) {
  const navigate = useNavigate();
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [isStaffMenuOpen, setIsStaffMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(2);

  const { currentUser, logout } = useEnterpriseAuthStore();
  const currentApp = ENTERPRISE_APPS.find((a) => a.id === currentAppId) || ENTERPRISE_APPS[0];

  return (
    <>
      <header className="bg-[#252525] text-white border-b border-[#383838] sticky top-0 z-40 shadow-md">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 gap-3">
            
            {/* Left: UNIKART Logo + Current App Badge */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              {/* UNIKART Logo (navigates to current app root) */}
              <Link to="/" className="flex items-center py-1">
                <UnikartLogo variant="dark" size="sm" showTagline={false} />
              </Link>

              {/* Vertical divider */}
              <span className="text-gray-600 hidden sm:inline">|</span>

              {/* Active Application Label */}
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: currentApp.color || '#0284C7' }}
                />
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-bold text-white tracking-tight truncate max-w-[200px] sm:max-w-xs">
                    {appTitle || 'Inventory & Business Management'}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium hidden sm:inline truncate">
                    {subtitle || 'Single-Company Consolidated Business Suite'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Storefront Switch + Staff Role Selector + Profile */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Central Notification Centre Bell */}
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(true)}
                className="relative p-2 rounded-lg bg-[#333333] hover:bg-[#404040] text-gray-200 hover:text-white transition-all shadow-xs cursor-pointer"
                title="Central Notification Centre"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#E31837] text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse shadow-sm">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              {/* Staff Switcher Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsStaffMenuOpen(!isStaffMenuOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#333333] hover:bg-[#404040] text-left text-xs transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-[#E31837]/20 border border-[#E31837]/50 flex items-center justify-center text-[#E31837] shrink-0 font-bold text-[10px]">
                    {currentUser?.name?.slice(0, 1) || 'U'}
                  </div>
                  <div className="hidden md:flex flex-col -space-y-0.5 leading-tight">
                    <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">
                      {currentUser?.roleName || 'Staff'}
                    </span>
                    <span className="font-bold text-white truncate max-w-[110px]">
                      {currentUser?.name?.split(' ')[0] || 'User'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {/* Staff Selector Menu */}
                {isStaffMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 text-[#222222] animate-fadeIn">
                    <div className="px-3.5 py-2 border-b border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Current Active User
                      </p>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">{currentUser?.name}</p>
                      <p className="text-[11px] text-[#E31837] font-semibold">{currentUser?.roleName} ({currentUser?.code || currentUser?.id})</p>
                    </div>



                    <div className="border-t border-gray-100 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setIsStaffMenuOpen(false);
                          window.location.href = '/login';
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out to Login
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* 8-App Visual Launcher Modal */}
      <AppLauncherModal
        isOpen={isLauncherOpen}
        onClose={() => setIsLauncherOpen(false)}
        currentAppId={currentAppId}
      />

      {/* Central Omnichannel Notification Centre Drawer */}
      <NotificationCentreDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onUnreadChange={(cnt) => setUnreadNotifsCount(cnt)}
      />
    </>
  );
}

export { EnterpriseHeader };
