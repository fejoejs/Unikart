import { NO_IMAGE_PLACEHOLDER } from '../../utils/imageConstants';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  AlertTriangle,
  PackageCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { useAuthStore } from '../../stores/authStore';
import { useInventoryStore } from '../../stores/inventoryStore';

export function InventoryStaffDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const cachedProds = useInventoryStore.getState().cachedProducts || [];

  // Compute instantaneous metrics from cache if available
  const initialMetrics = React.useMemo(() => {
    if (!cachedProds.length) {
      return {
        totalProducts: 0,
        activeProducts: 0,
        unitsInStock: 0,
        outOfStockItems: 0,
        lowStockItems: 0,
        recentMovements: []
      };
    }
    const totalProds = cachedProds.length;
    const activeProds = cachedProds.filter((p) => p.isActive !== false).length;
    let totalUnits = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;

    cachedProds.forEach((p) => {
      const pStock = Number(p.stockQuantity ?? p.total_stock ?? 0);
      totalUnits += pStock;
      const lowThresh = Number(p.lowStockThreshold || 10);
      const isOutOfStock = pStock <= 0 || (Array.isArray(p.variants) && p.variants.length > 0 && p.variants.every((v) => Number(v.stock_on_hand ?? v.stock ?? v.on_hand ?? 0) <= 0));
      const isLowStock = !isOutOfStock && (pStock <= lowThresh || (Array.isArray(p.variants) && p.variants.some((v) => {
        const vs = Number(v.stock_on_hand ?? v.stock ?? v.on_hand ?? 0);
        return vs > 0 && vs <= lowThresh;
      })));
      if (isOutOfStock) {
        outOfStockCount++;
      } else if (isLowStock) {
        lowStockCount++;
      }
    });

    return {
      totalProducts: totalProds,
      activeProducts: activeProds,
      unitsInStock: totalUnits,
      outOfStockItems: outOfStockCount,
      lowStockItems: lowStockCount,
      recentMovements: []
    };
  }, [cachedProds]);

  const [loading, setLoading] = useState(cachedProds.length === 0);
  const [metrics, setMetrics] = useState(initialMetrics);

  const loadData = async () => {
    try {
      // 1. Fetch metrics and full product catalog concurrently in background
      const [metricRes, prodRes] = await Promise.all([
        apiClient.get('/admin/inventory/metrics').catch(() => null),
        cachedProds.length === 0
          ? apiClient.get('/products?limit=500').catch(() => null)
          : Promise.resolve(null)
      ]);

      let productsList = cachedProds;
      if (prodRes && Array.isArray(prodRes.data)) {
        productsList = prodRes.data.map((p) => {
          const firstVariant = p.variants?.[0] || {};
          const currentPrice = firstVariant.current_price || firstVariant.prices?.find((price) => price.is_active) || {};
          const rawImages = Array.isArray(p.images) ? p.images : [];
          const sortedImages = [...rawImages].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || (a.sort_order || 0) - (b.sort_order || 0));
          const images = sortedImages
            .map((image) => typeof image === 'string' ? image : image?.url)
            .filter(Boolean);
          const categorySlug = p.category_slug || p.category?.slug || (typeof p.category === 'string' ? p.category.toLowerCase() : 'electronics');
          const categoryName = p.category_label || p.category?.name || (typeof p.category === 'string' ? p.category : 'Electronics');
          const brandName = p.brand?.name || (typeof p.brand === 'string' ? p.brand : 'Unikart Choice');

          let rawSellingPrice = null;
          if (p.price != null && !isNaN(Number(p.price)) && Number(p.price) > 0) {
            rawSellingPrice = Number(p.price);
          } else if (p.selling_price != null && !isNaN(Number(p.selling_price)) && Number(p.selling_price) > 0) {
            rawSellingPrice = Number(p.selling_price);
          } else if (p.selling_price_paise != null && !isNaN(Number(p.selling_price_paise)) && Number(p.selling_price_paise) > 0) {
            rawSellingPrice = Number(p.selling_price_paise) / 100;
          } else if (firstVariant.selling_price_paise != null && !isNaN(Number(firstVariant.selling_price_paise)) && Number(firstVariant.selling_price_paise) > 0) {
            rawSellingPrice = Number(firstVariant.selling_price_paise) / 100;
          } else if (currentPrice.selling_price_paise != null && !isNaN(Number(currentPrice.selling_price_paise)) && Number(currentPrice.selling_price_paise) > 0) {
            rawSellingPrice = Number(currentPrice.selling_price_paise) / 100;
          }
          const sellingPrice = rawSellingPrice !== null ? rawSellingPrice : 999;

          let rawCost = null;
          if (p.purchase_cost != null && !isNaN(Number(p.purchase_cost)) && Number(p.purchase_cost) > 0) {
            rawCost = Number(p.purchase_cost);
          } else if (p.purchaseCost != null && !isNaN(Number(p.purchaseCost)) && Number(p.purchaseCost) > 0) {
            rawCost = Number(p.purchaseCost);
          } else if (p.purchase_cost_paise != null && !isNaN(Number(p.purchase_cost_paise)) && Number(p.purchase_cost_paise) > 0) {
            rawCost = Number(p.purchase_cost_paise) / 100;
          } else if (firstVariant.purchase_cost_paise != null && !isNaN(Number(firstVariant.purchase_cost_paise)) && Number(firstVariant.purchase_cost_paise) > 0) {
            rawCost = Number(firstVariant.purchase_cost_paise) / 100;
          }
          const purchaseCost = rawCost !== null ? Math.round(rawCost) : Math.round(sellingPrice * 0.65);

          let totalStock = 0;
          if (Array.isArray(p.variants) && p.variants.length > 0) {
            totalStock = p.variants.reduce((sum, v) => {
              const vStock = v.stock_on_hand ?? v.stock ?? v.on_hand ?? v.available ?? v.stock_available ?? v.inventory ?? (v.stock_levels?.[0]?.on_hand ?? 0);
              return sum + (Number(vStock) || 0);
            }, 0);
          }
          if (totalStock === 0) {
            totalStock = Number(p.total_stock ?? p.stockQuantity ?? p.stock_on_hand ?? p.stock ?? 0);
          }

          return {
            ...p,
            id: p.id,
            name: p.name,
            slug: p.slug,
            brand: brandName,
            brandId: p.brand_id || p.brand?.id,
            category: categorySlug,
            categorySlug: categorySlug,
            categoryId: p.category_id || p.category?.id,
            categoryLabel: categoryName,
            sku: p.primary_sku || firstVariant.sku || `SKU-${p.id}`,
            barcode: p.primary_barcode || firstVariant.barcode || '',
            price: sellingPrice,
            sellingPrice: sellingPrice,
            originalPrice: p.originalPrice || p.mrp || sellingPrice,
            mrp: p.mrp || p.originalPrice || sellingPrice,
            purchaseCost: purchaseCost,
            stockQuantity: totalStock,
            total_stock: totalStock,
            lowStockThreshold: 5,
            stockStatus: totalStock <= 0 ? 'out_of_stock' : (totalStock <= 10 ? 'low_stock' : 'in_stock'),
            isActive: p.is_active !== false,
            images,
            primaryImage: p.primary_image || images[0] || NO_IMAGE_PLACEHOLDER,
            description: p.description || p.short_description || '',
            variants: p.variants || []
          };
        });
        useInventoryStore.getState().setCachedProducts(productsList);
      }

      const totalProds = productsList.length;
      const activeProds = productsList.filter((p) => p.isActive !== false).length;
      let totalUnits = 0;
      let outOfStockCount = 0;
      let lowStockCount = 0;

      productsList.forEach((p) => {
        const pStock = Number(p.stockQuantity ?? p.total_stock ?? 0);
        totalUnits += pStock;
        const lowThresh = Number(p.lowStockThreshold || 10);
        const isOutOfStock = pStock <= 0 || (Array.isArray(p.variants) && p.variants.length > 0 && p.variants.every((v) => Number(v.stock_on_hand ?? v.stock ?? v.on_hand ?? 0) <= 0));
        const isLowStock = !isOutOfStock && (pStock <= lowThresh || (Array.isArray(p.variants) && p.variants.some((v) => {
          const vs = Number(v.stock_on_hand ?? v.stock ?? v.on_hand ?? 0);
          return vs > 0 && vs <= lowThresh;
        })));
        if (isOutOfStock) {
          outOfStockCount++;
        } else if (isLowStock) {
          lowStockCount++;
        }
      });

      setMetrics({
        totalProducts: totalProds,
        activeProducts: activeProds,
        unitsInStock: totalUnits,
        outOfStockItems: outOfStockCount,
        lowStockItems: lowStockCount,
        recentMovements: Array.isArray(metricRes?.data?.recent_movements) ? metricRes.data.recent_movements : []
      });
    } catch (err) {
      console.error('Failed to load authoritative inventory metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const [liveConnected, setLiveConnected] = useState(false);

  useEffect(() => {
    loadData();

    // Real-Time SSE Listener
    const sseBase = import.meta.env.VITE_API_BASE_URL || "/api/v1";
    let es;
    try {
      es = new EventSource(`${sseBase}/realtime/events`);
      es.onopen = () => setLiveConnected(true);
      es.onerror = () => setLiveConnected(false);
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.event === "stock_updated" || payload.event === "order_placed" || payload.event === "catalog_updated") {
            loadData();
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
          loadData();
        }
      };
    } catch (_) {}

    return () => {
      if (es) es.close();
      if (bc) bc.close();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time catalogue product management, live stock adjustments, and replenishments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => navigate('/inventory/products')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#E8173D] hover:bg-red-700 text-white shadow-xs transition-all cursor-pointer"
          >
            <Boxes className="w-4 h-4" />
            <span>Manage Products</span>
          </button>
        </div>
      </div>

      {/* 4 Synchronized Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Products */}
        <div
          onClick={() => navigate('/inventory/products')}
          className="bg-white dark:bg-[#1E1E1E] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-sky-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Total Products</span>
            <Boxes className="w-4 h-4 text-sky-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {loading ? '...' : metrics.totalProducts}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {metrics.activeProducts ?? metrics.totalProducts} Active in catalogue &rarr;
          </p>
        </div>

        {/* 2. Units in Stock */}
        <div
          onClick={() => navigate('/inventory/products')}
          className="bg-white dark:bg-[#1E1E1E] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-emerald-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Units in Stock</span>
            <PackageCheck className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {loading ? '...' : (metrics.unitsInStock || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
            Total physical inventory &rarr;
          </p>
        </div>

        {/* 3. Out of Stock */}
        <div
          onClick={() => navigate('/inventory/products')}
          className="bg-white dark:bg-[#1E1E1E] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-red-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-red-600 dark:text-red-400">
            <span>Out of Stock</span>
            <AlertTriangle className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-black text-red-600 dark:text-red-400 mt-2">
            {loading ? '...' : (metrics.outOfStockItems || 0)}
          </div>
          <p className="text-[11px] text-red-600/80 dark:text-red-400/80 font-medium mt-1">
            0 units available &bull; Needs stock &rarr;
          </p>
        </div>

        {/* 4. Low Stock Buffer */}
        <div
          onClick={() => navigate('/inventory/products')}
          className="bg-white dark:bg-[#1E1E1E] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
            <span>Low Stock (1-10)</span>
            <AlertCircle className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {loading ? '...' : (metrics.lowStockItems || 0)}
          </div>
          <p className="text-[11px] text-amber-600/90 dark:text-amber-400/90 font-medium mt-1">
            Below safety buffer &rarr;
          </p>
        </div>
      </div>

      {/* Quick Operations */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Quick Operations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/inventory/products')}
            className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-slate-700 hover:border-[#E8173D] text-left transition-all group shadow-xs cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/50 text-[#E8173D] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Product Management</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Browse full catalogue, search products, adjust stock quantities, and edit pricing.
            </p>
          </button>

          <div
            className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <PackageCheck className="w-4 h-4 text-emerald-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Live Storefront Sync</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                All inventory quantities synchronize instantaneously with the storefront customer catalog and order checkout.
              </p>
            </div>
            <div className={`mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] font-mono font-bold ${
              liveConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {liveConnected ? '● Live Real-Time Stream Connected' : '○ Real-Time Sync Ready'}
            </div>
          </div>
        </div>
      </div>

      {/* Real Dashboard Activity: Recent Stock Movements */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recent Inventory Ledger Movements</h3>
          </div>
          <button
            onClick={() => navigate('/inventory/products')}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Manage Products &rarr;
          </button>
        </div>

        {metrics.recentMovements && metrics.recentMovements.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {metrics.recentMovements.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {item.product_name || 'Stock Adjustment'}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {item.reason || item.movement_type}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-black ${item.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {item.quantity > 0 ? `+${item.quantity}` : item.quantity} units
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    Balance: {item.new_on_hand}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            Inventory ledger is up to date and synchronized with the storefront.
          </div>
        )}
      </div>
    </div>
  );
}

export default InventoryStaffDashboard;
