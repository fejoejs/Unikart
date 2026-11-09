import { NO_IMAGE_PLACEHOLDER } from '../../utils/imageConstants';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Boxes,
  RefreshCw,
  Search,
  Filter,
  Plus,
  PackageCheck,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Check,
  Eye,
  SlidersHorizontal,
  LayoutGrid,
  List
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { useInventoryStore } from '../../stores/inventoryStore';

export function LowStockAlerts() {
  const navigate = useNavigate();
  const cachedProds = useInventoryStore.getState().cachedProducts || [];

  const initialAlerts = useMemo(() => {
    return cachedProds
      .filter((p) => {
        const qty = Number(p.stockQuantity ?? p.total_stock ?? 0);
        const lowThresh = Number(p.lowStockThreshold || 10);
        return qty <= lowThresh;
      })
      .map((p) => {
        const firstVariant = p.variants?.[0] || {};
        const pStock = Number(p.stockQuantity ?? p.total_stock ?? 0);
        const threshold = Number(p.lowStockThreshold || 10);
        return {
          id: firstVariant.id ? `var-${firstVariant.id}` : `prod-${p.id}`,
          productId: p.id,
          variantId: firstVariant.id || null,
          name: p.name,
          variantName: firstVariant.name || '',
          sku: firstVariant.sku || p.sku || 'SKU-NONE',
          category: p.categoryLabel || p.category || 'General',
          onHand: pStock,
          available: pStock,
          threshold: threshold,
          isOutOfStock: pStock <= 0,
          imageUrl: p.primaryImage || p.images?.[0] || NO_IMAGE_PLACEHOLDER
        };
      });
  }, [cachedProds]);

  const [loading, setLoading] = useState(initialAlerts.length === 0);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filterType, setFilterType] = useState('all'); // 'all', 'out_of_stock', 'low_stock'
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Restocking action state
  const [restockingId, setRestockingId] = useState(null);
  const [customQuantities, setCustomQuantities] = useState({});
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Load real inventory metrics & alerts
  const loadAlerts = async () => {
    if (alerts.length === 0) {
      setLoading(true);
    }
    setActionError('');
    try {
      // 1. Fetch authoritative inventory metrics
      const metricRes = await apiClient.get('/admin/inventory/metrics').catch(() => null);
      let metricAlerts = [];
      if (metricRes?.data?.low_stock_alerts && Array.isArray(metricRes.data.low_stock_alerts)) {
        metricAlerts = metricRes.data.low_stock_alerts;
      }

      // Consolidate alerts from both metrics and catalog products
      const consolidatedMap = new Map();

      // First add from metrics
      metricAlerts.forEach((a) => {
        const key = a.variant_id ? `var-${a.variant_id}` : `prod-${a.product_id}`;
        consolidatedMap.set(key, {
          id: a.id || key,
          productId: a.product_id,
          variantId: a.variant_id,
          name: a.product_name,
          variantName: a.variant_name || '',
          sku: a.sku || 'SKU-NONE',
          category: a.category || 'General',
          onHand: Number(a.on_hand || 0),
          available: Number(a.available || 0),
          threshold: Number(a.reorder_level || 10),
          isOutOfStock: Boolean(a.is_out_of_stock || Number(a.available || 0) <= 0),
          imageUrl: a.image_url || NO_IMAGE_PLACEHOLDER
        });
      });

      // Second merge cached products with zero or low stock
      initialAlerts.forEach((a) => {
        if (!consolidatedMap.has(a.id)) {
          consolidatedMap.set(a.id, a);
        }
      });

      setAlerts(Array.from(consolidatedMap.values()));
    } catch (err) {
      console.error('Failed to load low stock alerts:', err);
      setActionError('Failed to load latest inventory alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();

    // Real-Time SSE Listener
    const sseBase = import.meta.env.VITE_API_BASE_URL || "/api/v1";
    let es;
    try {
      es = new EventSource(`${sseBase}/realtime/events`);
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.event === "stock_updated" || payload.event === "order_placed" || payload.event === "catalog_updated") {
            loadAlerts();
          }
        } catch (_) {}
      };
    } catch (_) {}

    // BroadcastChannel cross-tab listener
    let bc;
    try {
      bc = new BroadcastChannel('unikart_channel');
      bc.onmessage = (e) => {
        if (e.data?.type === 'STOCK_UPDATED' || e.data?.type === 'CATALOG_UPDATED') {
          loadAlerts();
        }
      };
    } catch (_) {}

    return () => {
      if (es) es.close();
      if (bc) bc.close();
    };
  }, []);

  // Quick Restock Handler
  const handleQuickRestock = async (item, deltaUnits) => {
    const qty = parseInt(deltaUnits, 10);
    if (!qty || qty <= 0) return;

    setRestockingId(item.id);
    setActionError('');
    setActionSuccess('');

    try {
      await apiClient.post('/admin/inventory/adjust', {
        variant_id: item.variantId,
        productId: item.productId,
        quantity: qty,
        reason: `Low stock safety replenishment (+${qty} units)`,
        direction: 'ADD'
      });

      setActionSuccess(`Successfully replenished +${qty} units for "${item.name}"!`);
      setTimeout(() => setActionSuccess(''), 4000);
      await loadAlerts();
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Failed to update stock.');
    } finally {
      setRestockingId(null);
    }
  };

  // Metrics computation
  const outOfStockItems = useMemo(() => alerts.filter((a) => a.available <= 0), [alerts]);
  const lowStockItems = useMemo(() => alerts.filter((a) => a.available > 0 && a.available <= a.threshold), [alerts]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      // Status filter
      if (filterType === 'out_of_stock' && item.available > 0) return false;
      if (filterType === 'low_stock' && (item.available <= 0 || item.available > item.threshold)) return false;

      // Text search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesSku = item.sku.toLowerCase().includes(q);
        const matchesCat = item.category.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesCat) return false;
      }

      return true;
    });
  }, [alerts, filterType, search]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Live Stock Monitoring
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Threshold Buffer: 10 Units
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Low Stock &amp; Replenishment Alerts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time replenishment alerts for products with depleted or critically low inventory buffer.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadAlerts}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Alerts</span>
          </button>

          <button
            onClick={() => navigate('/inventory/products')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#E8173D] hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Boxes className="w-4 h-4" />
            <span>View Full Catalogue</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-bold flex items-center gap-2 shadow-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Critical Out of Stock */}
        <div
          onClick={() => setFilterType('out_of_stock')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            filterType === 'out_of_stock'
              ? 'bg-red-500/10 border-red-500/40 ring-2 ring-red-500/20'
              : 'bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-slate-700 hover:border-red-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-red-600 dark:text-red-400">
            <span>Critical Out of Stock</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-3xl font-black text-red-600 dark:text-red-400 mt-2">
            {outOfStockItems.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            0 units available &bull; Immediate reorder needed
          </p>
        </div>

        {/* 2. Low Stock Warning */}
        <div
          onClick={() => setFilterType('low_stock')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            filterType === 'low_stock'
              ? 'bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-slate-700 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
            <span>Low Stock Warnings</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {lowStockItems.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            1 to 10 units remaining &bull; Approaching empty
          </p>
        </div>

        {/* 3. Total Attention Needed */}
        <div
          onClick={() => setFilterType('all')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            filterType === 'all'
              ? 'bg-sky-500/10 border-sky-500/40 ring-2 ring-sky-500/20'
              : 'bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-slate-700 hover:border-sky-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400">
            <span>Total Requiring Attention</span>
            <TrendingUp className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {alerts.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            All active alerts in current catalogue
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1E1E1E] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Alerts ({alerts.length})
          </button>

          <button
            onClick={() => setFilterType('out_of_stock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterType === 'out_of_stock'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
            }`}
          >
            <span>Out of Stock ({outOfStockItems.length})</span>
          </button>

          <button
            onClick={() => setFilterType('low_stock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterType === 'low_stock'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <span>Low Stock ({lowStockItems.length})</span>
          </button>
        </div>

        {/* Search & View Mode */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by product name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 bg-slate-50 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-slate-700">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Auditing Live Product Stock Levels...
          </p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        /* Reassuring Empty State */
        <div className="w-full p-12 text-center bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs my-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {filterType === 'out_of_stock'
              ? 'Zero Out-of-Stock Products'
              : filterType === 'low_stock'
              ? 'Zero Low-Stock Warnings'
              : 'All Inventory Levels Healthy'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            {filterType === 'out_of_stock'
              ? 'Every product in your catalog currently has positive sellable inventory.'
              : filterType === 'low_stock'
              ? 'All products are currently stocked above their safety reorder threshold buffer.'
              : 'Great news! All products meet or exceed designated inventory thresholds. No replenishment is urgently required.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            {filterType !== 'all' && (
              <button
                onClick={() => setFilterType('all')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Show All Alerts
              </button>
            )}
            <button
              onClick={() => {
                const isAdminPath = window.location.pathname.startsWith('/admin');
                navigate(isAdminPath ? '/admin/products' : '/inventory/products');
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#E8173D] hover:bg-red-700 text-white shadow-xs cursor-pointer"
            >
              Go to Product Management
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW: Responsive Cards with 1:1 Aspect Ratio Images */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAlerts.map((item) => {
            const isOut = item.available <= 0;
            const customVal = customQuantities[item.id] || 10;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* 1:1 Aspect Ratio Image Container matching Ecommerce */}
                <div className="relative w-full aspect-square bg-[#F8F9FA] dark:bg-slate-800/80 overflow-hidden border-b border-slate-100 dark:border-slate-800">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover object-center"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = NO_IMAGE_PLACEHOLDER;
                    }}
                  />
                  {/* Status Badge */}
                  <span
                    className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 ${
                      isOut
                        ? 'bg-red-600 text-white'
                        : 'bg-amber-500 text-slate-900'
                    }`}
                  >
                    {isOut ? <AlertTriangle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    <span>{isOut ? 'Out of Stock' : 'Low Stock'}</span>
                  </span>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      {item.category}
                    </div>
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 leading-snug" title={item.name}>
                      {item.name}
                    </h3>

                  </div>

                  {/* Stock Metrics Box */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Current Stock:</span>
                      <span className={`font-black text-sm ${isOut ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {item.available} units
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                      <span>Safety Threshold:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{item.threshold} units</span>
                    </div>
                  </div>

                  {/* 1-Click Instant Replenish Buttons */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Quick Replenish:</span>
                      {restockingId === item.id && (
                        <span className="text-sky-500 flex items-center gap-1">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Saving...
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                      {[5, 10, 25, 50].map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          disabled={restockingId === item.id}
                          onClick={() => handleQuickRestock(item, qty)}
                          className="py-1 px-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-emerald-600 dark:bg-slate-800 dark:hover:bg-emerald-600 text-slate-700 hover:text-white dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all cursor-pointer text-center disabled:opacity-50"
                          title={`Add +${qty} units to stock`}
                        >
                          +{qty}
                        </button>
                      ))}
                    </div>

                    {/* Custom Input + Add */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={customVal}
                        onChange={(e) => setCustomQuantities({ ...customQuantities, [item.id]: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        className="w-16 px-2 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-center"
                      />
                      <button
                        type="button"
                        disabled={restockingId === item.id}
                        onClick={() => handleQuickRestock(item, customVal)}
                        className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Restock</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Safety Buffer</th>
                  <th className="py-3 px-4">Alert Status</th>
                  <th className="py-3 px-4 text-right">Quick Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredAlerts.map((item) => {
                  const isOut = item.available <= 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = NO_IMAGE_PLACEHOLDER;
                            }}
                          />
                          <span className="font-bold text-slate-900 dark:text-white line-clamp-1 max-w-xs">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      
                      <td className="py-3 px-4">{item.category}</td>
                      <td className="py-3 px-4">
                        <span className={`font-black ${isOut ? 'text-red-600' : 'text-amber-600'}`}>
                          {item.available} units
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {item.threshold} units
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isOut
                              ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400'
                          }`}
                        >
                          {isOut ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {[5, 10, 25].map((qty) => (
                            <button
                              key={qty}
                              type="button"
                              disabled={restockingId === item.id}
                              onClick={() => handleQuickRestock(item, qty)}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer"
                            >
                              +{qty}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default LowStockAlerts;
