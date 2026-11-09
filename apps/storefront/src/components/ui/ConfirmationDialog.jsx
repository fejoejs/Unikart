import React, { useEffect } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"

export function ConfirmationDialog({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed with this action? This operation may be irreversible.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger", // danger | warning | primary
  isLoading = false,
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onCancel()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, isLoading, onCancel])

  if (!isOpen) return null

  const confirmColors = {
    danger: "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500",
    warning: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500"
  }

  const iconColors = {
    danger: "bg-rose-100 text-rose-600",
    warning: "bg-amber-100 text-amber-600",
    primary: "bg-blue-100 text-blue-600"
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 animate-in fade-in"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
        <div
          className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-inner ${
            iconColors[variant] || iconColors.danger
          }`}
        >
          <AlertTriangle className="w-7 h-7" aria-hidden="true" />
        </div>

        <div className="space-y-1.5">
          <h3 id="confirm-dialog-title" className="text-base font-bold text-slate-900">
            {title}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
              confirmColors[variant] || confirmColors.danger
            }`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isLoading ? "Processing..." : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmationDialog
