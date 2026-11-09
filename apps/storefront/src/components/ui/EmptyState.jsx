import React from "react"
import { Link } from "react-router-dom"
import { PackageOpen, ArrowRight } from "lucide-react"

export function EmptyState({
  icon: Icon = PackageOpen,
  title = "No Items Found",
  description = "There are no records to display at this moment.",
  actionLabel,
  onAction,
  actionHref,
  secondaryActionLabel,
  onSecondaryAction,
  className = ""
}) {
  return (
    <div
      role="region"
      aria-label={title}
      className={`min-h-[280px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
        <Icon className="w-7 h-7" aria-hidden="true" />
      </div>

      <h3 className="text-base font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-md leading-relaxed mb-6">{description}</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionHref && actionLabel && (
          <Link
            to={actionHref}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}

        {onAction && actionLabel && !actionHref && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {onSecondaryAction && secondaryActionLabel && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  )
}

export default EmptyState
