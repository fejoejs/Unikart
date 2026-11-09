import React, { useState, useEffect } from "react"
import { WifiOff, Wifi, AlertTriangle } from "lucide-react"

export function OfflineBanner({ onStatusChange }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [justReconnected, setJustReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setJustReconnected(true)
      if (onStatusChange) onStatusChange(true)
      const timer = setTimeout(() => setJustReconnected(false), 4000)
      return () => clearTimeout(timer)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setJustReconnected(false)
      if (onStatusChange) onStatusChange(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [onStatusChange])

  if (justReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-emerald-600 text-white text-xs font-semibold py-2 px-4 text-center flex items-center justify-center gap-2 shadow-md animate-in fade-in"
      >
        <Wifi className="w-4 h-4 text-emerald-200" />
        <span>Internet Connection Restored! Connected to live Unikart servers.</span>
      </div>
    )
  }

  if (!isOnline) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="bg-amber-600 text-white text-xs font-semibold py-2 px-4 text-center flex items-center justify-center gap-2 shadow-md"
      >
        <WifiOff className="w-4 h-4 text-amber-200 animate-pulse" />
        <span>
          No Internet Connection. You are viewing cached information. Real-time pricing and checkout are paused until connectivity returns.
        </span>
      </div>
    )
  }

  return null
}

export default OfflineBanner
