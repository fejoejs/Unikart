import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export function PermissionDenied403({
  resourceName = 'Admin Governance Suite',
  requiredRole = 'System Administrator',
  className = '',
}) {
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();

  const handleReturn = () => {
    if (isAdmin()) {
      navigate('/admin/overview', { replace: true });
    } else {
      navigate('/inventory/dashboard', { replace: true });
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-[60vh] p-8 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 border border-amber-500/20">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 mb-2">
        HTTP 403 FORBIDDEN
      </span>
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
        Access Restricted
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">
        Your signed-in account privileges do not allow access to {resourceName}.
        Only accounts with <strong className="text-red-600 dark:text-red-400">{requiredRole}</strong> authorization can view or manage these resources.
      </p>
      <button
        onClick={handleReturn}
        className="inline-flex items-center space-x-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 transition-all shadow-md cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Authorized Workspace</span>
      </button>
    </div>
  );
}

export default PermissionDenied403;
