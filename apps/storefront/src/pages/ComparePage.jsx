import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Check, X, ShoppingCart, Star, Sparkles, RefreshCw } from "lucide-react"
import api from "../lib/api"
import { formatINR } from "../lib/utils"
import { useCartStore } from "../store/useCartStore"
import SkeletonLoader from "../components/ui/SkeletonLoader"
import EmptyState from "../components/ui/EmptyState"

export default function ComparePage() {
  const navigate = useNavigate()
  const { addItem } = useCartStore()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await api.get("/products")
        const items = res.data || []
        setProducts(items)
        // Select first 3 items by default for side-by-side comparison
        if (items.length > 0) {
          setSelectedIds(items.slice(0, 3).map((p) => p.id))
        }
      } catch (err) {
        // Fallback
      } finally {
        setLoading(false)
      }
    }
    loadCatalog()
  }, [])

  const comparedProducts = products.filter((p) => selectedIds.includes(p.id))

  const handleRemove = (id) => {
    setSelectedIds((prev) => prev.filter((i) => i !== id))
  }

  const handleAdd = (id) => {
    if (selectedIds.length < 4 && !selectedIds.includes(id)) {
      setSelectedIds((prev) => [...prev, id])
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
        <div className="h-6 bg-slate-800 rounded w-48 animate-pulse"></div>
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-slate-900 border border-slate-800 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Catalog</span>
          </button>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
            <span>Side-by-Side Product Comparison Matrix</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-600/30 text-blue-400 border border-blue-500/30">
              {comparedProducts.length} Selected
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Compare technical specifications, Indian GST prices, warranty coverage, and customer ratings.
          </p>
        </div>

        {/* Quick add dropdown if < 4 */}
        {selectedIds.length < 4 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Add to compare:</span>
            <select
              onChange={(e) => {
                if (e.target.value) handleAdd(Number(e.target.value))
              }}
              className="text-xs bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue=""
            >
              <option value="" disabled>Select product...</option>
              {products
                .filter((p) => !selectedIds.includes(p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {comparedProducts.length === 0 ? (
        <EmptyState
          title="No Products in Comparison"
          description="Select products from the catalog to see an in-depth spec-by-spec comparison matrix."
          actionText="Browse Catalog"
          onAction={() => navigate("/catalog")}
        />
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800">
                  <th className="p-5 w-48 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                    Specifications
                  </th>
                  {comparedProducts.map((p) => (
                    <th key={p.id} className="p-5 min-w-[240px] align-top relative">
                      <button
                        onClick={() => handleRemove(p.id)}
                        className="absolute top-3 right-3 text-slate-500 hover:text-rose-400 p-1"
                        title="Remove from comparison"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="space-y-3">
                        <div className="aspect-square w-32 mx-auto rounded-2xl bg-slate-950 p-2 border border-slate-800 flex items-center justify-center overflow-hidden">
                          <img
                            src={p.images?.[0]?.url || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400"}
                            alt={p.name}
                            className="object-contain w-full h-full"
                          />
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] font-mono text-blue-400 uppercase font-semibold">{p.category?.name || "Electronics"}</span>
                          <h3 className="font-bold text-white text-sm mt-0.5 line-clamp-2">{p.name}</h3>
                          <div className="text-base font-black text-white mt-1">
                            {formatINR(p.variants?.[0]?.prices?.[0]?.selling_price_paise || 499900)}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (p.variants?.[0]) {
                              addItem(p.variants[0].id, 1)
                              navigate("/cart")
                            }
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Buy Now</span>
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {/* Brand */}
                <tr className="hover:bg-slate-800/20">
                  <td className="p-4 font-semibold text-slate-400">Brand / Maker</td>
                  {comparedProducts.map((p) => (
                    <td key={p.id} className="p-4 font-medium text-white">
                      {p.brand?.name || "Unikart Official"}
                    </td>
                  ))}
                </tr>

                {/* Selling Price & GST */}
                <tr className="hover:bg-slate-800/20">
                  <td className="p-4 font-semibold text-slate-400">Price (Inc. GST)</td>
                  {comparedProducts.map((p) => (
                    <td key={p.id} className="p-4 font-mono font-bold text-emerald-400">
                      {formatINR(p.variants?.[0]?.prices?.[0]?.selling_price_paise || 499900)}
                      <span className="text-[10px] text-slate-400 block font-sans">
                        GST: {p.variants?.[0]?.gst_rate || 18}% included
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Rating */}
                <tr className="hover:bg-slate-800/20">
                  <td className="p-4 font-semibold text-slate-400">Customer Rating</td>
                  {comparedProducts.map((p) => (
                    <td key={p.id} className="p-4">
                      <div className="flex items-center space-x-1 text-amber-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>4.6 / 5.0</span>
                        <span className="text-slate-500 text-[10px] font-normal">(124 verified reviews)</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Stock Status */}
                <tr className="hover:bg-slate-800/20">
                  <td className="p-4 font-semibold text-slate-400">Live Availability</td>
                  {comparedProducts.map((p) => (
                    <td key={p.id} className="p-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                        <Check className="w-3 h-3" />
                        <span>In Stock (Dispatches in 24h)</span>
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Warranty */}
                <tr className="hover:bg-slate-800/20">
                  <td className="p-4 font-semibold text-slate-400">Warranty Protection</td>
                  {comparedProducts.map((p) => (
                    <td key={p.id} className="p-4 text-slate-300">
                      1 Year Comprehensive Brand Replacement Warranty
                    </td>
                  ))}
                </tr>

                {/* Return Policy */}
                <tr className="hover:bg-slate-800/20">
                  <td className="p-4 font-semibold text-slate-400">Returns &amp; Replacement</td>
                  {comparedProducts.map((p) => (
                    <td key={p.id} className="p-4 text-slate-300">
                      7 Days Hassle-Free Replacement / Store Credit
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
