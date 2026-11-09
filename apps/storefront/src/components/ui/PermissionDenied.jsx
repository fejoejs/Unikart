import React from "react"
import { ShieldAlert, ArrowLeft, Home, Lock } from "lucide-react"

export function PermissionDenied({
  role = "User",
  requiredPermission,
  returnUrl = "/",
  onReturn,
  className = ""
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`min-h-[380px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg mx-auto my-8 ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-inner">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="flex items-center gap-2 mb-1.5">
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-300">
          HTTP 403
        </span>
      </div>

      <p className="text-xs text-slate-600 max-w-sm leading-relaxed mb-4">
        Your account role (<strong className="text-slate-800">{role}</strong>) does not have authorization to view this resource or perform this administrative action.
      </p>

      {requiredPermission && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[11px] text-slate-500 font-mono mb-6 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Required permission: {requiredPermission}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {onReturn ? (
          <button
            onClick={onReturn}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </button>
        ) : (
          <a
            href={returnUrl}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Safe Page</span>
          </a>
        )}
      </div>
    </div>
  )
}

export default PermissionDenied
