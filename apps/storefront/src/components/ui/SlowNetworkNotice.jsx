import React from "react"
import { Clock, Loader2, X } from "lucide-react"

export function SlowNetworkNotice({ onCancel, isFinancial = false, className = "" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`bg-slate-900 text-slate-100 p-3.5 rounded-xl border border-slate-800 shadow-xl flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4 animate-spin text-amber-400" />
        </div>
        <div>
          <p className="font-semibold text-white">Your connection is slower than usual</p>
          <p className="text-[11px] text-slate-400">
            {isFinancial
              ? "Securing transaction with payment gateway. Please do not refresh or close this tab to prevent double charges."
              : "Still loading data from Unikart servers. Thanks for your patience."}
          </p>
        </div>
      </div>

      {onCancel && !isFinancial && (
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors shrink-0 flex items-center gap-1 font-medium"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
      )}
    </div>
  )
}

export default SlowNetworkNotice
