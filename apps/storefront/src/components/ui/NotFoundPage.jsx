import React from "react"
import { Link } from "react-router-dom"
import { FileQuestion, Home, ShoppingBag, ArrowLeft } from "lucide-react"

export function NotFoundPage({
  title = "Page Not Found",
  message = "The page or electronics product you are looking for does not exist, has been moved, or is temporarily unavailable.",
  showCatalogLink = true
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mb-4 shadow-inner">
        <FileQuestion className="w-8 h-8" />
      </div>

      <div className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-bold mb-2">
        HTTP 404
      </div>

      <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">{title}</h1>
      <p className="text-xs text-slate-500 max-w-md leading-relaxed mb-8">{message}</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Home className="w-4 h-4" />
          <span>Return to Homepage</span>
        </Link>

        {showCatalogLink && (
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Browse All Electronics</span>
          </Link>
        )}
      </div>
    </div>
  )
}

export default NotFoundPage
