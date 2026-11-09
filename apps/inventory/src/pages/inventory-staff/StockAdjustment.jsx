import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  History,
  RefreshCw,
  Search,
  Barcode,
  Layers,
  ArrowRight,
  Split
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { useAuthStore } from '../../stores/authStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { subscribeToCatalogChanges } from '../../services/supabase';

const ADJUSTMENT_REASONS = [
  'Physical stock correction',
  'Stock discrepancy',
  'Damaged stock correction',
  'Missing stock',
  'Cycle count reconciliation',
  'Data correction',
  'Other'
];

export function StockAdjustmentsPage() {
  const cachedProds = useInventoryStore.getState().cachedProducts || [];
  const [products, setProducts] = useState(cachedProds);
  const [selectedProductId, setSelectedProductId] = useState(cachedProds[0]?.id ? String(cachedProds[0].id) : '');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [deltaQty, setDeltaQty] = useState(1);
  const [direction, setDirection] = useState('ADD'); // 'ADD' or 'SUBTRACT'
  const [reason, setReason] = useState(ADJUSTMENT_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(cachedProds.length === 0);
  const [adjustmentHistory, setAdjustmentHistory] = useState([]);

  // Fetch products and recent movements directly from the authoritative database
  const loadProductsAndHistory = async () => {
    try {
      if (!products || products.length === 0) {
        setFetching(true);
      }
      const prodEndpoint = useAuthStore.getState().isAdmin()
        ? '/admin/products?limit=500&sort=catalog'
        : '/products?limit=500';

      const [prodRes, movRes] = await Promise.all([
        apiClient.get(prodEndpoint).catch(() => apiClient.get('/products?limit=500')),
        apiClient.get('/admin/inventory/movements?limit=25').catch(() => null)
      ]);

      if (prodRes && Array.isArray(prodRes.data)) {
        const mappedList = prodRes.data.map((p) => {
          const firstVariant = p.variants?.[0] || {};
          const currentPrice = firstVariant.current_price || firstVariant.prices?.find((price) => price.is_active) || {};
          const rawImages = Array.isArray(p.images) ? p.images : [];
          const sortedImages = [...rawImages].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || (a.sort_order || 0) - (b.sort_order || 0));
          const images = sortedImages
            .map((image) => typeof image === 'string' ? image : image?.url)
            .filter(Boolean);
          const categorySlug = p.category_slug || p.category?.slug || (typeof p.category === 'string' ? p.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : 'electronics');
          const categoryName = p.category_label || p.category?.name || (typeof p.category === 'string' ? p.category : 'Electronics');
          const brandName = p.brand?.name || (typeof p.brand === 'string' ? p.brand : 'Unikart Choice');

          let rawSellingPrice = p.price ?? p.selling_price ?? p.sellingPrice ?? (p.selling_price_paise ? p.selling_price_paise / 100 : null) ?? (firstVariant.selling_price_paise ? firstVariant.selling_price_paise / 100 : 999);
          let sellingPrice = Number(rawSellingPrice) || 999;
          let mrp = Number(p.originalPrice ?? p.mrp ?? (p.mrp_paise ? p.mrp_paise / 100 : null) ?? sellingPrice) || sellingPrice;
          let purchaseCost = Number(p.purchaseCost ?? p.purchase_cost ?? (p.purchase_cost_paise ? p.purchase_cost_paise / 100 : null) ?? Math.round(sellingPrice * 0.65)) || Math.round(sellingPrice * 0.65);

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
            originalPrice: mrp,
            mrp: mrp,
            purchaseCost: purchaseCost,
            stockQuantity: totalStock,
            total_stock: totalStock,
            variants: p.variants || []
          };
        });

        setProducts(mappedList);
        useInventoryStore.getState().setCachedProducts(mappedList);
        if (mappedList.length > 0) {
          if (!selectedProductId || !mappedList.some((p) => String(p.id) === String(selectedProductId))) {
            setSelectedProductId(String(mappedList[0].id));
          }
        }
      }

      if (movRes && Array.isArray(movRes.data)) {
        setAdjustmentHistory(movRes.data);
      }
    } catch (err) {
      console.error('Failed to load inventory data:', err);
      if (products.length === 0) {
        setErrorMsg('Failed to connect to the database. Please check your connection.');
      }
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadProductsAndHistory();

    // 1. Supabase Realtime subscription
    let unsubscribeSupabase = () => {};
    try {
      unsubscribeSupabase = subscribeToCatalogChanges(() => {
        loadProductsAndHistory();
      });
    } catch {}

    // 2. Real-time Cross-tab broadcast listener
    let bc;
    try {
      bc = new BroadcastChannel('unikart_channel');
      bc.onmessage = (msg) => {
        if (msg.data?.type === 'STOCK_UPDATED') {
          const { productId, newStock, variantId } = msg.data;
          if (productId && newStock !== undefined) {
            setProducts((prev) =>
              prev.map((p) => {
                if (String(p.id) === String(productId)) {
                  let updatedVariants = p.variants;
                  let newTotalStock = Number(newStock);
                  if (variantId && Array.isArray(p.variants)) {
                    updatedVariants = p.variants.map((v) =>
                      String(v.id) === String(variantId)
                        ? {
                            ...v,
                            stock_levels: [{ on_hand: Number(newStock), reserved: 0 }],
                            stock: Number(newStock),
                            inventory: Number(newStock)
                          }
                        : v
                    );
                    newTotalStock = updatedVariants.reduce((sum, v) => {
                      const vStock = v.stock ?? v.stock_levels?.[0]?.on_hand ?? v.inventory ?? 0;
                      return sum + Number(vStock || 0);
                    }, 0);
                  }
                  return {
                    ...p,
                    variants: updatedVariants,
                    total_stock: newTotalStock,
                    stockQuantity: newTotalStock
                  };
                }
                return p;
              })
            );
          }
          apiClient
            .get('/admin/inventory/movements?limit=25')
            .then((res) => {
              if (Array.isArray(res.data)) setAdjustmentHistory(res.data);
            })
            .catch(() => {});
        } else if (msg.data?.type === 'CATALOG_UPDATED') {
          loadProductsAndHistory();
        }
      };
    } catch {}

    // 3. Server-Sent Events (SSE) Live Stream
    const sseBase = import.meta.env.VITE_API_BASE_URL || "/api/v1";
    let es;
    try {
      es = new EventSource(`${sseBase}/realtime/events`);
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.event === "stock_updated" || payload.event === "order_placed" || payload.event === "catalog_updated") {
            loadProductsAndHistory();
          }
        } catch (_) {}
      };
    } catch (_) {}

    return () => {
      if (unsubscribeSupabase) unsubscribeSupabase();
      if (bc) bc.close();
      if (es) es.close();
    };
  }, []);

    // Aggregate dynamic categories for dropdown filter
  const categoriesList = useMemo(() => {
    const map = new Map();
    const STANDARD_CATS = [
      { slug: 'smartphones', name: 'Smartphones & Mobiles' },
      { slug: 'laptops', name: 'Laptops & Computers' },
      { slug: 'audio', name: 'Audio & Headphones' },
      { slug: 'tablets', name: 'Tablets & iPads' },
      { slug: 'gaming', name: 'Gaming & Consoles' },
      { slug: 'accessories', name: 'Accessories & Power' },
      { slug: 'tv-home', name: 'TV & Home Entertainment' },
      { slug: 'wearables', name: 'Smartwatches & Fitness' },
      { slug: 'electronics', name: 'Electronics' },
      { slug: 'fashion', name: 'Fashion & Apparel' },
      { slug: 'home-kitchen', name: 'Home & Kitchen' },
      { slug: 'beauty', name: 'Beauty & Personal Care' },
      { slug: 'grocery', name: 'Grocery & Gourmet' },
      { slug: 'sports', name: 'Sports & Fitness' },
    ];
    STANDARD_CATS.forEach((c) => map.set(c.slug, c));
    (products || []).forEach((p) => {
      const slug = (p.category_slug || p.categorySlug || p.category?.slug || (typeof p.category === 'string' ? p.category : '')).toLowerCase().trim();
      const name = p.category_label || p.categoryLabel || p.category?.name || (typeof p.category === 'string' ? p.category : slug);
      if (slug && !map.has(slug)) map.set(slug, { slug, name });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // Filter products for search selector (by name, SKU, barcode, or category)
  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory !== 'all') {
      const catFilter = selectedCategory.toLowerCase().trim();
      list = list.filter((p) => {
        const cSlug = (p.category_slug || p.categorySlug || p.category?.slug || (typeof p.category === 'string' ? p.category : '')).toLowerCase();
        const cLabel = (p.category_label || p.categoryLabel || p.category?.name || (typeof p.category === 'string' ? p.category : '')).toLowerCase();
        return cSlug.includes(catFilter) || cLabel.includes(catFilter) || catFilter.includes(cSlug);
      });
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(q);
      const skuMatch =
        p.primary_sku?.toLowerCase().includes(q) ||
        p.variants?.some((v) => v.sku?.toLowerCase().includes(q));
      const barcodeMatch = p.variants?.some((v) => v.barcode?.toLowerCase().includes(q));
      const catMatch =
        (p.category || '').toLowerCase().includes(q) ||
        (p.categoryLabel || '').toLowerCase().includes(q);
      return nameMatch || skuMatch || barcodeMatch || catMatch;
    });
  }, [products, searchQuery, selectedCategory]);

  // Selected product details
  const selectedProd = useMemo(() => {
    return products.find((p) => String(p.id) === String(selectedProductId));
  }, [products, selectedProductId]);

  // Update selected variant when product changes
  useEffect(() => {
    if (selectedProd?.variants && selectedProd.variants.length > 0) {
      setSelectedVariantId(String(selectedProd.variants[0].id));
    } else {
      setSelectedVariantId('');
    }
  }, [selectedProductId, selectedProd]);

  // Selected variant details
  const selectedVariant = useMemo(() => {
    if (!selectedProd?.variants || selectedProd.variants.length === 0) return null;
    return (
      selectedProd.variants.find((v) => String(v.id) === String(selectedVariantId)) ||
      selectedProd.variants[0]
    );
  }, [selectedProd, selectedVariantId]);

  // Variant-specific metrics using authoritative API contract (on_hand, reserved, available)
  const variantOnHand = useMemo(() => {
    if (!selectedVariant) return selectedProd?.total_stock ?? 0;
    if (selectedVariant.on_hand !== undefined && selectedVariant.on_hand !== null) {
      return Number(selectedVariant.on_hand);
    }
    if (selectedVariant.stock_levels && selectedVariant.stock_levels.length > 0) {
      return Number(selectedVariant.stock_levels[0].on_hand ?? 0);
    }
    return 0; // Strictly return 0 when variant data is missing, never fall back to product total!
  }, [selectedVariant, selectedProd]);

  const variantReserved = useMemo(() => {
    if (!selectedVariant) return 0;
    if (selectedVariant.reserved !== undefined && selectedVariant.reserved !== null) {
      return Number(selectedVariant.reserved);
    }
    if (selectedVariant.stock_levels && selectedVariant.stock_levels.length > 0) {
      return Number(selectedVariant.stock_levels[0].reserved ?? 0);
    }
    return 0;
  }, [selectedVariant]);

  const variantAvailable = useMemo(() => {
    if (!selectedVariant) return 0;
    if (selectedVariant.available !== undefined && selectedVariant.available !== null) {
      return Number(selectedVariant.available);
    }
    return Math.max(0, variantOnHand - variantReserved);
  }, [selectedVariant, variantOnHand, variantReserved]);
  const activeSku = selectedVariant?.sku || selectedProd?.primary_sku || `SKU-${selectedProd?.id || '00'}`;
  const barcode = selectedVariant?.barcode || selectedProd?.variants?.[0]?.barcode || '';

  // Calculate new expected stock
  const qtyNum = Math.max(1, parseInt(deltaQty, 10) || 1);
  const expectedNewStock = direction === 'ADD' ? variantOnHand + qtyNum : variantOnHand - qtyNum;

  // Handle Form Submission
  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!selectedProd) {
      setErrorMsg('Please select a product to adjust.');
      return;
    }

    const vId = selectedVariant?.id || selectedProd.variants?.[0]?.id;
    if (!vId) {
      setErrorMsg('No valid product variant found to adjust.');
      return;
    }

    if (direction === 'SUBTRACT') {
      if (qtyNum > variantOnHand) {
        setErrorMsg(`Cannot decrease stock below 0. Variant on-hand is only ${variantOnHand} units.`);
        return;
      }
      if (variantOnHand - qtyNum < variantReserved) {
        setErrorMsg(
          `Cannot reduce stock below reserved orders (${variantReserved} reserved units). Max allowed reduction is ${variantAvailable} units.`
        );
        return;
      }
    }

    const effectiveDelta = direction === 'ADD' ? qtyNum : -qtyNum;
    const updatedNewStock = Math.max(0, expectedNewStock);

    // 1. INSTANT OPTIMISTIC UI: Update in-memory state in 0 milliseconds
    setProducts((prev) =>
      prev.map((p) => {
        if (String(p.id) === String(selectedProd.id)) {
          let updatedVariants = p.variants;
          let newTotalStock = updatedNewStock;
          if (vId && Array.isArray(p.variants)) {
            updatedVariants = p.variants.map((v) =>
              String(v.id) === String(vId)
                ? {
                    ...v,
                    stock_levels: [{ on_hand: updatedNewStock, reserved: variantReserved }],
                    stock: updatedNewStock,
                    inventory: updatedNewStock
                  }
                : v
            );
            newTotalStock = updatedVariants.reduce((sum, v) => {
              const vStock = v.stock ?? v.stock_levels?.[0]?.on_hand ?? v.inventory ?? 0;
              return sum + Number(vStock || 0);
            }, 0);
          }
          return {
            ...p,
            variants: updatedVariants,
            total_stock: newTotalStock,
            stockQuantity: newTotalStock
          };
        }
        return p;
      })
    );

    // 2. Update persistent inventory cache
    useInventoryStore.getState().updateProductStock(selectedProd.id, updatedNewStock, vId);

    // 3. Real-time broadcast to all open storefront & inventory tabs!
    try {
      const bc = new BroadcastChannel('unikart_channel');
      bc.postMessage({
        type: 'STOCK_UPDATED',
        productId: Number(selectedProd.id),
        variantId: Number(vId),
        sku: activeSku,
        newStock: updatedNewStock
      });
      bc.close();
    } catch {}

    setSuccessMsg(
      `Stock updated in real-time! ${selectedProd.name} (${selectedVariant?.name || activeSku}) is now ${updatedNewStock} units (${effectiveDelta > 0 ? `+${effectiveDelta}` : effectiveDelta}).`
    );
    setDeltaQty(1);
    setNotes('');

    // 4. Background network sync without blocking user interaction
    const payload = {
      variant_id: Number(vId),
      product_id: Number(selectedProd.id),
      quantity: effectiveDelta,
      movement_type: 'ADJUSTMENT',
      reason: notes.trim() ? `${reason} - ${notes.trim()}` : reason,
      notes: notes.trim()
    };

    apiClient.post('/admin/inventory/adjust', payload)
      .then(() => {
        loadProductsAndHistory();
      })
      .catch((err) => {
        console.error('Failed to sync adjustment:', err);
        setErrorMsg(err.response?.data?.detail || 'Failed to sync adjustment with database.');
        loadProductsAndHistory();
      });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-[#E31837]" />
            Stock Adjustment
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Increase or decrease physical stock count at the specific variant level with authoritative ledger logging.
          </p>
        </div>

        <button
          onClick={loadProductsAndHistory}
          disabled={fetching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
          title="Refresh products and stock movements from database"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${fetching ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Form and Product Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Selection & Adjustment Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
            {/* Feedback Banners */}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span className="font-medium leading-relaxed">{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span className="font-medium leading-relaxed">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              {/* Step 1: Search & Select Product */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Search &amp; Select Product
                </label>

                                {/* Search & Category Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by product name, SKU..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E31837]"
                    />
                  </div>

                  <div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E31837] cursor-pointer"
                    >
                      <option value="all">All Categories ({categoriesList.length})</option>
                      {categoriesList.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dropdown Selector */}
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E31837] cursor-pointer"
                  required
                >
                  {filteredProducts.length === 0 ? (
                    <option value="">No matching products found</option>
                  ) : (
                    filteredProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — Total Stock: {p.total_stock ?? 0} units
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Step 1b: Variant Selection (When multiple variants exist) */}
              {selectedProd?.variants && selectedProd.variants.length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Split className="w-3.5 h-3.5 text-[#E31837]" />
                    <span>Select Specific Variant</span>
                  </label>
                  <select
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl bg-amber-50/50 dark:bg-slate-800 border border-amber-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E31837] cursor-pointer"
                  >
                    {selectedProd.variants.map((v) => {
                      const vStock = v.on_hand !== undefined ? v.on_hand : (v.stock_levels?.[0]?.on_hand ?? 0);
                      return (
                        <option key={v.id} value={v.id}>
                          {v.name || 'Default Variant'} — Variant On-Hand: {vStock} units
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Step 2: Selected Product & Variant Details */}
              {selectedProd && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      {selectedProd.name} {selectedVariant ? `— ${selectedVariant.name}` : ''}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="capitalize">{selectedProd.category || 'General'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <div className="shrink-0 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                        On-Hand
                      </span>
                      <span className="text-lg font-black font-mono text-slate-900 dark:text-white">
                        {variantOnHand} <span className="text-xs font-normal text-slate-500">units</span>
                      </span>
                    </div>
                    {variantReserved > 0 && (
                      <div className="shrink-0 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                        <span className="text-[10px] text-amber-600 uppercase tracking-wider font-semibold block">
                          Reserved
                        </span>
                        <span className="text-sm font-black font-mono text-amber-700 dark:text-amber-300">
                          {variantReserved}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3 & 4: Direction and Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Direction Toggle */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    2. Select Adjustment Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDirection('ADD')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                        direction === 'ADD'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Increase Stock</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDirection('SUBTRACT')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                        direction === 'SUBTRACT'
                          ? 'bg-red-600 text-white border-red-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>Decrease Stock</span>
                    </button>
                  </div>
                </div>

                {/* Quantity Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    3. Adjustment Quantity
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={deltaQty}
                      onChange={(e) => setDeltaQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E31837] font-mono font-bold"
                      required
                    />
                    <div className="shrink-0 text-xs text-slate-500 font-mono">
                      &rarr; New: <strong className={expectedNewStock < 0 ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}>{expectedNewStock}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 5: Reason for Adjustment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  4. Reason for Adjustment
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E31837] cursor-pointer"
                  required
                >
                  {ADJUSTMENT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 6: Optional Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  5. Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional details or context..."
                  rows="2"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E31837]"
                />
              </div>

              {/* Step 7: Submit Button */}
              <button
                type="submit"
                disabled={loading || (products.length === 0 && fetching) || !selectedProd}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#E31837] hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Adjustment...</span>
                  </>
                ) : (
                  <span>Save Adjustment</span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Summary Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#E31837]" />
              Adjustment Preview
            </h3>

            {selectedProd ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Product:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                      {selectedProd.name}
                    </span>
                  </div>
                  {selectedVariant && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Variant:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                        {selectedVariant.name || 'Default Variant'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Variant On-Hand:</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{variantOnHand} units</span>
                  </div>
                  {variantReserved > 0 && (
                    <div className="flex justify-between">
                      <span className="text-amber-600 dark:text-amber-400">Reserved for Orders:</span>
                      <span className="font-bold font-mono text-amber-600 dark:text-amber-400">{variantReserved} units</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Adjustment:</span>
                    <span className={`font-bold font-mono ${direction === 'ADD' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {direction === 'ADD' ? `+${qtyNum}` : `-${qtyNum}`} units
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold">
                    <span className="text-slate-700 dark:text-slate-300">New Expected Stock:</span>
                    <span className={`font-mono text-sm ${expectedNewStock < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {expectedNewStock} units
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1">
                  <p>&bull; Reason: <strong className="text-slate-600 dark:text-slate-300">{reason}</strong></p>
                  {notes && <p>&bull; Notes: <span className="text-slate-600 dark:text-slate-300">{notes}</span></p>}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">Select a product to view the preview.</p>
            )}
          </div>
        </div>
      </div>

      {/* Authoritative Recent Stock Adjustments Table */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#E31837]" />
            <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Recent Stock Adjustments
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {adjustmentHistory.length} recorded
          </span>
        </div>

        {fetching && adjustmentHistory.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading adjustments...</div>
        ) : adjustmentHistory.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No stock adjustments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Product / Variant</th>
                  <th className="py-2.5 px-3 text-right">Previous Stock</th>
                  <th className="py-2.5 px-3 text-center">Adjustment</th>
                  <th className="py-2.5 px-3 text-right">New Stock</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Date &amp; Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {adjustmentHistory.map((entry) => {
                  const qty = entry.quantity ?? 0;
                  const isPositive = qty > 0;
                  const dateStr = entry.created_at
                    ? new Date(entry.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Just now';

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {entry.product_name || `Product Variant #${entry.variant_id}`}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {entry.previous_on_hand ?? '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            isPositive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          }`}
                        >
                          {isPositive ? `+${qty}` : qty}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {entry.new_on_hand ?? '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={entry.reason}>
                        {entry.reason || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">
                        {entry.movement_type || 'ADJUSTMENT'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-400">
                        {dateStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default StockAdjustmentsPage;
