import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export function ToastNotification({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 3500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast || !toast.message) return null;

  const isSuccess = toast.type === 'success' || !toast.type;
  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';
  const isInfo = toast.type === 'info';

  let Icon = CheckCircle2;
  let iconBg = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400';
  let badgeColor = 'text-emerald-700 dark:text-emerald-300';
  let borderColor = 'border-emerald-200/80 dark:border-emerald-800/80';
  let defaultTitle = 'Success';

  if (isError) {
    Icon = AlertCircle;
    iconBg = 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400';
    badgeColor = 'text-rose-700 dark:text-rose-300';
    borderColor = 'border-rose-200/80 dark:border-rose-800/80';
    defaultTitle = 'Error';
  } else if (isWarning) {
    Icon = AlertTriangle;
    iconBg = 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400';
    badgeColor = 'text-amber-700 dark:text-amber-300';
    borderColor = 'border-amber-200/80 dark:border-amber-800/80';
    defaultTitle = 'Notice';
  } else if (isInfo) {
    Icon = Info;
    iconBg = 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400';
    badgeColor = 'text-blue-700 dark:text-blue-300';
    borderColor = 'border-blue-200/80 dark:border-blue-800/80';
    defaultTitle = 'Information';
  }

  return (
    <div className="fixed top-4 sm:top-6 right-4 sm:right-6 left-4 sm:left-auto z-[10000] flex flex-col space-y-2 pointer-events-none sm:max-w-sm w-auto sm:w-full animate-slideDown">
      <div
        className={`pointer-events-auto bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl border ${borderColor} p-4 flex items-start gap-3.5 transition-all transform hover:scale-[1.01]`}
      >
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${badgeColor}`}>
              {toast.title || defaultTitle}
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Just now</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-200 font-medium mt-0.5 leading-relaxed break-words">
            {toast.message}
          </p>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default ToastNotification;
