import React from "react"
import { Loader2 } from "lucide-react"

export function LoadingState({
  message = "Loading information...",
  subtext = "Please wait a moment while we retrieve the latest data",
  size = "md",
  fullPage = false,
  className = ""
}) {
  const spinnerSizes = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  }

  const content = (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center p-6 space-y-3 ${className}`}
    >
      <Loader2
        className={`${spinnerSizes[size] || spinnerSizes.md} text-blue-600 animate-spin`}
        aria-hidden="true"
      />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-800">{message}</p>
        {subtext && <p className="text-xs text-slate-500 max-w-sm">{subtext}</p>}
      </div>
      <span className="sr-only">{message}</span>
    </div>
  )

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 bg-white/90 flex items-center justify-center">
        {content}
      </div>
    )
  }

  return content
}

export default LoadingState
