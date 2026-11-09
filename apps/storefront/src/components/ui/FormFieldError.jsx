import React from "react"
import { AlertCircle } from "lucide-react"

export function FormFieldError({ message, id }) {
  if (!message) return null

  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className="mt-1 flex items-center gap-1.5 text-[11px] text-rose-600 font-medium animate-in fade-in"
    >
      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}

export default FormFieldError
