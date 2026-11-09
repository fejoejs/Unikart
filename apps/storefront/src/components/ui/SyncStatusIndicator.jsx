import React from "react"
import { CheckCircle2, Clock, AlertTriangle, RefreshCw } from "lucide-react"

export function SyncStatusIndicator({
  status = "SYNCED", // SYNCED | PENDING | CONFLICT | SYNCING
  pendingCount = 0,
  conflictCount = 0,
  onSync,
  lastSyncedAt,
  className = ""
}) {
  if (status === "SYNCING") {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 ${className}`}>
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>Synchronizing with cloud...</span>
      </div>
    )
  }

  if (status === "CONFLICT" || conflictCount > 0) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}>
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
        <span>Sync Conflict ({conflictCount})</span>
      </div>
    )
  }

  if (status === "PENDING" || pendingCount > 0) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 ${className}`}>
        <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
        <span>{pendingCount} Pending Sync</span>
        {onSync && (
          <button
            onClick={onSync}
            className="ml-1 text-[10px] bg-amber-200 hover:bg-amber-300 text-amber-900 px-1.5 py-0.5 rounded font-bold transition-colors"
          >
            Sync Now
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
      <span>Cloud Synced</span>
      {lastSyncedAt && (
        <span className="text-[10px] text-emerald-600/80">({lastSyncedAt})</span>
      )}
    </div>
  )
}

export default SyncStatusIndicator
