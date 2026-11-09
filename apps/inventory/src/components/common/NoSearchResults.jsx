import React from 'react';
import { SearchX } from 'lucide-react';

export function NoSearchResults({ query = '', onClear, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center p-10 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-3">
        <SearchX className="w-6 h-6" />
      </div>
      <h3 className="text-base font-medium text-slate-800 dark:text-slate-200 mb-1">
        No results found for &ldquo;<span className="text-admin-600 dark:text-admin-400 font-semibold">{query}</span>&rdquo;
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm">
        Check your spelling, clear any applied status filters, or try a broader search term.
      </p>
      {onClear && (
        <button
          onClick={onClear}
          className="text-xs font-medium text-admin-600 dark:text-admin-400 hover:underline"
        >
          Clear search query
        </button>
      )}
    </div>
  );
}

export default NoSearchResults;
