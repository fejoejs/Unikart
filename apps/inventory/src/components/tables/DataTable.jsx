import React from 'react';
import LoadingSkeleton from '../common/LoadingSkeleton';
import EmptyState from '../common/EmptyState';

export function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = 'No data available',
  emptyDescription = 'There are no records to display at this time.',
  keyExtractor = (item, idx) => item.id || idx,
}) {
  if (loading) {
    return <LoadingSkeleton count={5} />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
          <tr>
            {columns.map((col, idx) => (
              <th key={col.key || idx} className={`px-4 py-3.5 ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
          {data.map((row, rowIdx) => (
            <tr key={keyExtractor(row, rowIdx)} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors">
              {columns.map((col, colIdx) => (
                <td key={col.key || colIdx} className={`px-4 py-3 text-slate-700 dark:text-slate-200 ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.cellClassName || ''}`}>
                  {col.render ? col.render(row, rowIdx) : row[col.accessor || col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
