import React from "react"
import { LogIn, Clock, ShieldCheck } from "lucide-react"

export function SessionExpiredDialog({
  isOpen,
  onLogin,
  returnUrl = window.location.pathname,
  loginPath = "/login"
}) {
  if (!isOpen) return null

  const handleRedirect = () => {
    if (onLogin) {
      onLogin()
    } else {
      window.location.href = `${loginPath}?returnUrl=${encodeURIComponent(returnUrl)}`
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 animate-in fade-in"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-inner">
          <Clock className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h3 id="session-expired-title" className="text-base font-bold text-slate-900">
            Session Expired
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your login session has expired for your account security. Your current cart and safe work have been preserved. Please sign in again to continue.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleRedirect}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Continue</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default SessionExpiredDialog
