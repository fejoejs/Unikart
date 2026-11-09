import React from "react"

export function SkeletonLoader({ type = "product-card", count = 1, className = "" }) {
  const items = Array.from({ length: count }, (_, i) => i)

  if (type === "product-card") {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
        {items.map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 animate-pulse shadow-sm"
          >
            <div className="w-full h-44 bg-slate-200 rounded-xl"></div>
            <div className="space-y-2">
              <div className="h-3 bg-slate-200 rounded w-1/3"></div>
              <div className="h-4 bg-slate-200 rounded w-4/5"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            </div>
            <div className="pt-2 flex items-center justify-between">
              <div className="h-5 bg-slate-200 rounded w-2/5"></div>
              <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === "table-row") {
    return (
      <div className={`divide-y divide-slate-100 ${className}`}>
        {items.map((i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3 w-1/3">
              <div className="w-10 h-10 bg-slate-200 rounded-lg shrink-0"></div>
              <div className="space-y-1.5 w-full">
                <div className="h-3.5 bg-slate-200 rounded w-3/4"></div>
                <div className="h-2.5 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="h-3 bg-slate-200 rounded w-24"></div>
            <div className="h-3 bg-slate-200 rounded w-16"></div>
            <div className="h-4 bg-slate-200 rounded w-20"></div>
          </div>
        ))}
      </div>
    )
  }

  if (type === "detail-page") {
    return (
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse ${className}`}>
        <div className="space-y-4">
          <div className="w-full h-96 bg-slate-200 rounded-2xl"></div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="w-20 h-20 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="h-8 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="h-10 bg-slate-200 rounded w-1/3 my-4"></div>
          <div className="h-24 bg-slate-200 rounded-xl"></div>
          <div className="h-12 bg-slate-200 rounded-xl w-full"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-2.5 animate-pulse ${className}`}>
      {items.map((i) => (
        <div key={i} className="h-4 bg-slate-200 rounded w-full"></div>
      ))}
    </div>
  )
}

export default SkeletonLoader
