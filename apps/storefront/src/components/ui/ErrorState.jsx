import React from "react"
import { AlertCircle, RefreshCw, ArrowLeft, Home } from "lucide-react"

export function ErrorState({
  title = "Unable to Load Data",
  message = "A temporary network or server error prevented this request from completing. Please try again.",
  errorCode,
  onRetry,
  onBack,
  showHome = false,
  className = ""
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`min-h-[280px] flex flex-col items-center justify-center p-8 text-center bg-rose-50/60 rounded-2xl border border-rose-200 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
        <AlertCircle className="w-7 h-7" aria-hidden="true" />
      </div>

      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {errorCode && (
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rose-200/80 text-rose-800 font-semibold">
            {errorCode}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-600 max-w-md leading-relaxed mb-6">{message}</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        )}

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
        )}

        {showHome && (
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return Home</span>
          </a>
        )}
      </div>
    </div>
  )
}

export default ErrorState
