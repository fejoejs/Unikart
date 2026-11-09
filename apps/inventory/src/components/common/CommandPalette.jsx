import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Boxes,
  Store,
  ShieldCheck,
  Users,
  CalendarCheck,
  CalendarDays,
  FileCheck2,
  Sliders,
  Flag,
  History,
  Activity,
  User,
  Moon,
  Sun,
  X,
  CreditCard,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const COMMANDS = [
  { id: 'overview', title: 'Owner Overview Dashboard', path: '/overview', category: 'Navigation', icon: LayoutDashboard },
  { id: 'inventory', title: 'Inventory & Stock Overview', path: '/inventory', category: 'Navigation', icon: Boxes },
  { id: 'stores', title: 'Stores & Locations', path: '/admin/stores', category: 'Navigation', icon: Store },
  { id: 'roles', title: 'Users, Roles & Permission Matrix', path: '/roles', category: 'Governance', icon: ShieldCheck },
  { id: 'employees', title: 'HR: Employees & KYC Directory', path: '/hr/employees', category: 'HR & Payroll', icon: Users },
  { id: 'attendance', title: 'HR: Attendance & Shifts Log', path: '/hr/attendance', category: 'HR & Payroll', icon: CalendarCheck },
  { id: 'leave', title: 'HR: Leave Requests & Balance', path: '/hr/leave', category: 'HR & Payroll', icon: CalendarDays },
  { id: 'payroll', title: 'HR: 4-Step Payroll Wizard', path: '/hr/payroll', category: 'HR & Payroll', icon: CreditCard },
  { id: 'approvals', title: 'Approvals Center (Discounts/Returns/PO)', path: '/approvals', category: 'Governance', icon: FileCheck2 },
  { id: 'settings', title: 'Global Platform Settings', path: '/settings', category: 'Settings', icon: Sliders },
  { id: 'flags', title: 'Feature Flags & Kill Switches', path: '/flags', category: 'Settings', icon: Flag },
  { id: 'audit', title: 'Master Immutable Audit Log', path: '/audit', category: 'Governance', icon: History },
  { id: 'health', title: 'System Health & Backups', path: '/health', category: 'Settings', icon: Activity },
  { id: 'account', title: 'My Account & 2FA Setup', path: '/account', category: 'Settings', icon: User },
];

export function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { toggleTheme } = useAuthStore();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onClose(); // toggle or let header manage
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = COMMANDS.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (cmd) => {
    navigate(cmd.path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-transparent animate-fadeIn">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a page name or command... (e.g. Payroll, Employees, Audit, Flags)"
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/50">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No matching pages or commands found.
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-admin-50 dark:bg-admin-950/60 text-admin-600 dark:text-admin-400 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-admin-600 dark:group-hover:text-admin-400">
                      {item.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">ESC</kbd> to close</span>
          <span>Navigation Quick Launcher</span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
