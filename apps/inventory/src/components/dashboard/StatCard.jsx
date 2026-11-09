import React from 'react';
import clsx from 'clsx';

export function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue, className }) {
  return (
    <div className={clsx('bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm', className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p>
        {Icon && (
          <div className="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-3">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{value}</h3>
        {(subtitle || trend) && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            {trend && (
              <span className={clsx('font-medium', trend === 'up' ? 'text-emerald-600' : 'text-rose-600')}>
                {trend === 'up' ? '↑' : '↓'} {trendValue}
              </span>
            )}
            {subtitle && <span className="text-slate-500 dark:text-slate-400">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default StatCard;
