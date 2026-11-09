import React from 'react';
import { useUIStore } from '../store/useStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-50 flex flex-col space-y-3 pointer-events-none sm:max-w-sm w-auto sm:w-full">
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        let colorClasses = 'bg-[#252525] text-white border-blue-500/30';
        let iconColor = 'text-emerald-400';

        if (toast.type === 'error') {
          colorClasses = 'bg-rose-950 text-white border-rose-800';
          iconColor = 'text-rose-400';
          Icon = AlertCircle;
        } else if (toast.type === 'info') {
          colorClasses = 'bg-slate-900 text-white border-slate-700';
          iconColor = 'text-blue-400';
          Icon = Info;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl border text-sm transition-all duration-300 animate-slideUp ${colorClasses}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 text-xs font-medium leading-relaxed">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors p-0.5 rounded"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
