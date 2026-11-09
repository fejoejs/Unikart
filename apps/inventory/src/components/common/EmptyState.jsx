import React from 'react';
import { Inbox, Plus } from 'lucide-react';

export function EmptyState({
  title = 'No records found',
  description = 'There is currently no data to display in this section.',
  actionLabel,
  onAction,
  icon: Icon = Inbox,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl my-4 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-admin-50 dark:bg-admin-950/40 text-admin-600 dark:text-admin-400 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg bg-admin-600 hover:bg-admin-700 text-white shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}

export default EmptyState;
