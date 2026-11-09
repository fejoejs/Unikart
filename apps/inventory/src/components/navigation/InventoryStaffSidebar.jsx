import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutGrid,
  Box,
  Layers,
  AlertTriangle,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  X
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { UnikartLogo } from '@unikart/ui';

const INVENTORY_CORE_NAV = [
  { name: 'Dashboard', path: '/inventory/dashboard', icon: LayoutGrid },
  { name: 'Product Catalog', path: '/inventory/products', icon: Box },
  { name: 'Stock Adjustments', path: '/inventory/adjustments', icon: Layers },
  { name: 'Low Stock Alerts', path: '/inventory/low-stock', icon: AlertTriangle },
];

export function InventoryStaffSidebar({ collapsed, setCollapsed, mobileOpen = false, setMobileOpen }) {
  const { user, logout, theme, toggleTheme } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  const displayName = user?.name || user?.full_name || 'Staff Member';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile Drawer Backdrop (< lg) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileOpen?.(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#252525] text-gray-300 border-r border-[#1E1E1E] shadow-2xl transition-all duration-300 ${
          /* Desktop dimensions */
          collapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          /* Mobile slide-in drawer */
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#333333] bg-[#1E1E1E]">
          {!collapsed ? (
            <div className="flex items-center space-x-2.5">
              <Link
                to="/inventory/dashboard"
                onClick={handleNavClick}
                className="flex items-center"
                title="UNIKART Inventory Operations"
              >
                <UnikartLogo variant="white" size="sm" showTagline={false} />
              </Link>
            </div>
          ) : (
            <div className="mx-auto w-8 h-8 rounded-xl bg-[#E31837] flex items-center justify-center text-white font-black text-sm shadow-xs">
              U
            </div>
          )}

          {/* Desktop collapse toggle */}
          {setCollapsed && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#333333] transition-colors cursor-pointer"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen?.(false)}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#333333] transition-colors cursor-pointer"
            title="Close sidebar"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin scrollbar-thumb-gray-700">
          <div>
            {(!collapsed || mobileOpen) && (
              <h4 className="px-3 mb-2 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                OPERATIONS
              </h4>
            )}
            <div className="space-y-1">
              {INVENTORY_CORE_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                        isActive
                          ? 'bg-[#E31837] text-white shadow-sm'
                          : 'text-gray-300 hover:text-white hover:bg-[#333333]'
                      } ${collapsed && !mobileOpen ? 'justify-center' : 'space-x-3'}`
                    }
                    title={collapsed && !mobileOpen ? item.name : undefined}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {(!collapsed || mobileOpen) && <span>{item.name}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* ACCOUNT SECTION */}
          <div className="pt-3 border-t border-[#333333]">
            {(!collapsed || mobileOpen) && (
              <h4 className="px-3 mb-2 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                ACCOUNT &amp; SESSION
              </h4>
            )}
            <div className="space-y-1">
              <NavLink
                to="/inventory/profile"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                    isActive
                      ? 'bg-[#E31837] text-white shadow-sm'
                      : 'text-gray-300 hover:text-white hover:bg-[#333333]'
                  } ${collapsed && !mobileOpen ? 'justify-center' : 'space-x-3'}`
                }
                title={collapsed && !mobileOpen ? 'My Profile' : undefined}
              >
                <User className="w-4 h-4 flex-shrink-0" />
                {(!collapsed || mobileOpen) && <span>My Profile</span>}
              </NavLink>
            </div>
          </div>
        </div>

        {/* User Footer with Sign Out */}
        <div className="p-3 border-t border-[#333333] bg-[#1E1E1E]">
          {!collapsed || mobileOpen ? (
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-3 truncate">
                <div className="w-8 h-8 rounded-full bg-[#E31837] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {initial}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-white truncate leading-tight">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-gray-400">Inventory Staff</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-[#333333] transition-colors cursor-pointer"
                  title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-[#E31837] hover:bg-[#333333] transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-[#E31837] hover:bg-[#333333] transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

export default InventoryStaffSidebar;
