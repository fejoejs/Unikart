import React from "react"
import { Wrench, RefreshCw, Mail } from "lucide-react"

export function MaintenanceNotice({
  title = "Scheduled System Maintenance",
  message = "Unikart is currently undergoing brief scheduled upgrades to improve our retail services. We will be back online shortly.",
  estimatedTime = "Approx. 15 minutes",
  onRetry
}) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-inner">
        <Wrench className="w-8 h-8 animate-bounce" />
      </div>

      <div className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-mono font-bold mb-2">
        HTTP 503 SERVICE MAINTENANCE
      </div>

      <h1 className="text-xl font-bold text-slate-900 mb-1.5">{title}</h1>
      <p className="text-xs text-slate-600 max-w-md leading-relaxed mb-4">{message}</p>

      {estimatedTime && (
        <div className="bg-slate-100 rounded-lg px-3 py-1.5 text-xs text-slate-600 font-medium mb-6">
          Estimated completion: <strong className="text-slate-900">{estimatedTime}</strong>
        </div>
      )}

      <div className="flex items-center gap-3">
        {onRetry ? (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Availability</span>
          </button>
        ) : (
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Page</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default MaintenanceNotice
