import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  Package,
  AlertTriangle,
  Users,
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

// Admin Navigation Matrix (Unified E-Commerce Theme)
const ADMIN_NAV_GROUPS = [
  {
    title: 'CONTROL TOWER',
    items: [
      { name: 'Admin Dashboard', path: '/admin/overview', icon: LayoutDashboard },
      { name: 'Customer Orders', path: '/admin/orders', icon: Target },
    ],
  },
  {
    title: 'PRODUCT & STOCK MANAGEMENT',
    items: [
      { name: 'Product Management', path: '/admin/products', icon: Package },
      { name: 'Low Stock Alerts', path: '/admin/low-stock', icon: AlertTriangle },
    ],
  },
  {
    title: 'PEOPLE & DIRECTORY',
    items: [
      { name: 'Employee & Customer Directory', path: '/admin/employees', icon: Users },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { name: 'Admin Profile', path: '/admin/account', icon: User },
    ],
  },
];

export function AdminSidebar({ collapsed, setCollapsed, mobileOpen = false, setMobileOpen }) {
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
                to="/admin/overview"
                onClick={handleNavClick}
                className="flex items-center"
                title="UNIKART Admin Dashboard"
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
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#333333] transition-colors cursor-pointer"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

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
        <div className="flex-1 overflow-y-auto py-4 px-2.5 space-y-4 scrollbar-thin scrollbar-thumb-gray-700">
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.title}>
              {(!collapsed || mobileOpen) && (
                <h4 className="px-3 mb-1.5 text-[9px] font-bold tracking-wider text-gray-400 uppercase">
                  {group.title}
                </h4>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
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
                        } ${collapsed && !mobileOpen ? 'justify-center' : 'space-x-2.5'}`
                      }
                      title={collapsed && !mobileOpen ? item.name : undefined}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {(!collapsed || mobileOpen) && <span className="truncate">{item.name}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Footer with Sign Out */}
        <div className="p-3 border-t border-[#333333] bg-[#1E1E1E]">
          {!collapsed || mobileOpen ? (
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-3 truncate">
                <div className="w-8 h-8 rounded-full bg-[#E31837] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {user?.name?.charAt(0) || user?.full_name?.charAt(0) || 'A'}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-white truncate leading-tight">
                    {user?.name || user?.full_name || 'Admin'}
                  </span>
                  <span className="text-[10px] text-gray-400">System Administrator</span>
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

export default AdminSidebar;
