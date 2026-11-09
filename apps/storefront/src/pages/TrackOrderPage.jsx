import React, { useState, useEffect } from "react"
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom"
import {
  Truck,
  Package,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  KeyRound,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  Sparkles,
  RefreshCw
} from "lucide-react"
import api from "../lib/api"
import { formatINR } from "../lib/utils"

export default function TrackOrderPage() {
  const { trackingNumber } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const initialQuery = trackingNumber || searchParams.get("query") || searchParams.get("order") || ""
  const [searchInput, setSearchInput] = useState(initialQuery)
  const [trackingData, setTrackingData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery)
    }
  }, [initialQuery])

  const handleSearch = async (queryToSearch) => {
    const q = (queryToSearch || searchInput).trim()
    if (!q) return

    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/orders/track/${encodeURIComponent(q)}`)
      setTrackingData(res.data)
    } catch (err) {
      setTrackingData(null)
      setError(err.response?.data?.detail || `No live shipment or order found for '${q}'. Please verify your Order Number or Courier AWB.`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (searchInput.trim()) {
      handleSearch(searchInput.trim())
    }
  }

  return (
    <div className="bg-slate-50 min-h-screen py-10 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Truck className="w-3.5 h-3.5" />
            <span>Unikart Express Delivery Telemetry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Track Package &amp; Delivery OTP
          </h1>
          <p className="text-xs text-slate-600">
            Enter your Order ID (e.g. ORD-2026-1001) or Airway Bill (AWB) to view live delivery checkpoints.
          </p>
        </div>

        {/* Search Input Bar */}
        <div className="max-w-lg mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Order Number or Courier AWB"
                className="w-full bg-white border border-slate-300 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-mono shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchInput.trim()}
              className="bg-[#4f46e5] hover:bg-[#4338ca] disabled:opacity-50 text-slate-900 font-bold text-xs px-5 py-2.5 rounded-2xl border border-[#6366f1] shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Track"}
            </button>
          </form>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="max-w-lg mx-auto p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Tracking Details View */}
        {trackingData && (
          <div className="space-y-6">
            
            {/* Top Cards: Details & Handover OTP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Order & Courier Summary */}
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Order Reference</span>
                    <div className="font-mono font-bold text-lg text-slate-900">#{trackingData.order_number}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Placed on {trackingData.order_date} &bull; {formatINR(trackingData.total_amount_paise)}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Courier Partner</span>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1 justify-end">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span>{trackingData.courier_name}</span>
                    </div>
                    <div className="font-mono text-xs text-[#4f46e5] mt-0.5">AWB: {trackingData.tracking_number}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Destination:</span>
                    <div className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{trackingData.shipping_city} - {trackingData.shipping_pincode}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Estimated Delivery:</span>
                    <div className="font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{trackingData.estimated_delivery}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Handover OTP Card */}
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>Doorstep Handover OTP</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Show this 4-digit code to the delivery associate upon receiving your parcel.
                  </p>
                </div>

                <div className="my-3 py-2 px-3 rounded bg-white border border-amber-200 text-center shadow-inner">
                  <div className="text-2xl font-mono font-black text-slate-900 tracking-widest">
                    {trackingData.handover_otp}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Secure Handover Protection Active</span>
                </div>
              </div>
            </div>

            {/* Shipment Progress Journey */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Delivery Milestones</h3>

              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                {trackingData.milestones?.map((m) => {
                  const isDone = m.status === "COMPLETED"
                  const isCurrent = m.status === "CURRENT"

                  return (
                    <div key={m.step} className="flex flex-col text-xs space-y-1.5 border-l-2 md:border-l-0 md:border-t-2 pl-3 md:pl-0 md:pt-2 border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                          isDone
                            ? "bg-emerald-600 text-white"
                            : isCurrent
                            ? "bg-amber-500 text-slate-950 font-black animate-pulse"
                            : "bg-slate-200 text-slate-500"
                        }`}>
                          {isDone ? "✓" : m.step}
                        </div>
                        <span className={`font-bold text-xs ${isDone || isCurrent ? "text-slate-900" : "text-slate-400"}`}>
                          {m.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {m.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Checkpoint Scan Logs & Items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>Courier Checkpoints</span>
                </h3>

                <div className="space-y-3 divide-y divide-slate-100 text-xs">
                  {trackingData.events?.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">Package is being prepared at the fulfillment hub.</p>
                  ) : (
                    trackingData.events?.map((ev, idx) => (
                      <div key={idx} className="pt-2 first:pt-0 flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-900">{ev.location}</div>
                          <p className="text-slate-500 text-[11px]">{ev.description}</p>
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 shrink-0 text-right">
                          {ev.timestamp}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span>Package Items ({trackingData.items?.length || 0})</span>
                </h3>

                <div className="space-y-2 text-xs">
                  {trackingData.items?.map((it) => (
                    <div key={it.id} className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{it.product_name}</div>
                        <div className="text-slate-500 text-[11px]">Qty: {it.quantity}</div>
                      </div>
                      <div className="font-bold text-slate-900">
                        {formatINR(it.unit_price_paise * it.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  )
}
