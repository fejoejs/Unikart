import React from "react"
import { CheckCircle, AlertCircle, Clock, RefreshCw, ArrowLeft, ExternalLink } from "lucide-react"

export function PaymentStatusPanel({
  status = "PENDING", // SUBMITTING | PENDING | SUCCESS | FAILED | CANCELLED
  orderNumber,
  paymentId,
  amountFormatted,
  errorMessage,
  onRetry,
  onCancel,
  onViewOrder
}) {
  if (status === "SUBMITTING") {
    return (
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 text-blue-600 flex items-center justify-center animate-spin">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">Contacting Payment Gateway...</h3>
        <p className="text-xs text-slate-500">
          Connecting to secure Indian banking channels. Please do not close or reload this window.
        </p>
      </div>
    )
  }

  if (status === "PENDING") {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center animate-pulse">
          <Clock className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900">Payment Pending Bank Confirmation</h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            Your UPI/Card payment was initiated. We are awaiting final settlement confirmation from your bank.
          </p>
        </div>
        {paymentId && (
          <p className="text-[11px] font-mono text-slate-500">Transaction Ref: {paymentId}</p>
        )}
      </div>
    )
  }

  if (status === "SUCCESS") {
    return (
      <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
          <CheckCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-200/60 px-2 py-0.5 rounded-full">
            Payment Verified
          </span>
          <h3 className="text-base font-bold text-slate-900 mt-1">Payment Successful!</h3>
          <p className="text-xs text-slate-600">
            {amountFormatted ? `Amount ${amountFormatted} received.` : "Transaction confirmed by bank."}
          </p>
        </div>

        <div className="bg-white border border-emerald-100 rounded-xl p-3 text-xs text-left space-y-1 font-mono">
          {orderNumber && (
            <div className="flex justify-between">
              <span className="text-slate-500">Order ID:</span>
              <span className="font-bold text-slate-900">{orderNumber}</span>
            </div>
          )}
          {paymentId && (
            <div className="flex justify-between">
              <span className="text-slate-500">Gateway Ref:</span>
              <span className="text-slate-700">{paymentId}</span>
            </div>
          )}
        </div>

        {onViewOrder && (
          <button
            onClick={onViewOrder}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
          >
            <span>View Order & Tax Invoice</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    )
  }

  if (status === "FAILED" || status === "CANCELLED") {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">
            {status === "CANCELLED" ? "Payment Cancelled" : "Payment Authorization Failed"}
          </h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            {errorMessage ||
              "Your bank was unable to authorize the charge. No money was deducted. You can retry or choose an alternate payment method."}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Payment</span>
            </button>
          )}

          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Choose Another Method</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  return null
}

export default PaymentStatusPanel
