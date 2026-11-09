import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

export function SuccessModal({
  isOpen,
  title = 'Action Completed',
  message = 'The operation was processed successfully.',
  onClose,
  confirmText = 'Done',
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fadeIn">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
          {title}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          {message}
        </p>
        <button
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl font-medium text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
}

export default SuccessModal;
