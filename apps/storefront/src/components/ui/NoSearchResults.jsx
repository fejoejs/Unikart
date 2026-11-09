import React from "react"
import { SearchX, FilterX, Sparkles } from "lucide-react"

export function NoSearchResults({
  query = "",
  onClearFilters,
  onSelectCategory,
  className = ""
}) {
  return (
    <div
      role="region"
      aria-label="No search results"
      className={`min-h-[320px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4 shadow-inner">
        <SearchX className="w-7 h-7" aria-hidden="true" />
      </div>

      <h3 className="text-base font-bold text-slate-900 mb-1">
        {query ? (
          <span>
            No matching products for <span className="text-blue-600 font-extrabold">"{query}"</span>
          </span>
        ) : (
          "No products match your selected filters"
        )}
      </h3>

      <p className="text-xs text-slate-500 max-w-md leading-relaxed mb-4">
        We couldn't find any electronics matching your criteria. Try adjusting your search query or filters.
      </p>

      {/* Helpful suggestions box */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-sm w-full text-left mb-6 space-y-1.5 text-xs text-slate-600">
        <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Suggestions to try:</span>
        </div>
        <ul className="list-disc pl-4 space-y-1 text-[11px]">
          <li>Check your spelling for any typos</li>
          <li>Try more general search terms (e.g. "Laptop" instead of "M3 Max 64GB")</li>
          <li>Remove price range or brand filters</li>
          <li>Search by SKU or model number if known</li>
        </ul>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <FilterX className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default NoSearchResults
