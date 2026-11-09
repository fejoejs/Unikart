import ToastNotification from '../../components/common/ToastNotification';
import ConfirmModal from '../../components/common/ConfirmModal';
import { NO_IMAGE_PLACEHOLDER } from '../../utils/imageConstants';
import { subscribeToCatalogChanges } from '../../services/supabase';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Boxes,
  Search,
  Filter,
  Barcode,
  RefreshCw,
  Printer,
  Download,
  FileUp,
  FileSpreadsheet,
  X,
  Check,
  Loader2,
  Plus,
  Minus,
  Image as ImageIcon,
  Images,
  Edit3,
  Trash2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Eye,
  Upload,
  Link as LinkIcon,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  ArrowUpDown,
  LayoutGrid,
  List,
  Shield,
  Layers,
  Archive,
  ArrowLeft,
  ArrowRight,
  Tag,
  DollarSign
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { useAuthStore } from '../../stores/authStore';
import { useInventoryStore } from '../../stores/inventoryStore';

const ELECTRONICS_SLUGS = [
  'electronics',
  'smartphones',
  'laptops',
  'audio',
  'tablets',
  'gaming',
  'accessories',
  'tv-home',
  'cameras',
  'wearables',
  'appliances',
  'smart-home',
  'networking',
  'storage',
  'computer-peripherals'
];

// Valid GS1 India EAN-13 Barcode Generator with Modulo-10 Check Digit
export const generateEAN13Barcode = (prefix = '890') => {
  const raw12 = prefix + String(Math.floor(100000000 + Math.random() * 900000000));
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(raw12[i], 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return raw12 + String(checkDigit);
};

export const parsePrice = (val, fallback = 0) => {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? fallback : num;
  }
  return fallback;
};

export const formatPrice = (val, fallback = '999') => {
  if (val === null || val === undefined || val === '' || isNaN(Number(val)) || Number(val) <= 0) return fallback;
  const num = parsePrice(val, 999);
  if (isNaN(num) || num <= 0) return fallback;
  return num.toLocaleString('en-IN');
};


const STANDARD_CATEGORIES = [
  { id: 1, slug: 'electronics', name: 'Electronics' },
  { id: 2, slug: 'fashion', name: 'Fashion & Clothing' },
  { id: 3, slug: 'home-kitchen', name: 'Home & Kitchen' },
  { id: 4, slug: 'beauty', name: 'Beauty & Personal Care' },
  { id: 5, slug: 'grocery', name: 'Grocery & Food' },
  { id: 6, slug: 'sports', name: 'Sports & Fitness' },
  { id: 7, slug: 'toys', name: 'Toys & Games' },
  { id: 8, slug: 'furniture', name: 'Furniture & Home Decor' },
  { id: 9, slug: 'books', name: 'Books & Stationery' },
  { id: 10, slug: 'footwear', name: 'Footwear' },
  { id: 11, slug: 'jewellery', name: 'Jewellery & Accessories' },
  { id: 12, slug: 'baby', name: 'Baby & Kids Products' },
  { id: 13, slug: 'automotive', name: 'Automotive Accessories' },
  { id: 14, slug: 'pets', name: 'Pet Supplies' }
];

export function ProductsCatalogPage() {
  const { user, isAdmin } = useAuthStore();
  const rawCachedProds = useInventoryStore.getState().cachedProducts || [];
  const cachedProds = rawCachedProds.map((p) => {
    let price = Number(p.price || p.selling_price || p.sellingPrice || 0);
    if (price <= 0) {
      const v0 = p.variants?.[0];
      const sp = v0?.selling_price_paise || v0?.current_price?.selling_price_paise;
      price = sp ? Math.round(Number(sp) / 100) : (Number(v0?.price || p.mrp || p.originalPrice || 0) || 999);
    }
    let mrp = Number(p.originalPrice || p.mrp || 0);
    if (mrp <= 0) mrp = price;
    let cost = Number(p.purchaseCost || p.purchase_cost || 0);
    if (cost <= 0) cost = Math.round(price * 0.65);
    return {
      ...p,
      price,
      sellingPrice: price,
      originalPrice: mrp,
      mrp,
      purchaseCost: cost,
    };
  });
  const cachedCats = useInventoryStore.getState().cachedCategories || [];
  const [products, setProducts] = useState(cachedProds);
  const [loading, setLoading] = useState(cachedProds.length === 0);
  const [loadError, setLoadError] = useState('');
  const [categoriesList, setCategoriesList] = useState(cachedCats);
  const [brandsList, setBrandsList] = useState([]);

  // Search, Filters & View Mode
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive, low_stock, out_of_stock
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [sortBy, setSortBy] = useState('catalog'); // storefront order by default
  const [viewMode, setViewMode] = useState('grid'); // grid, list

  // Modals & Drawers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState(null);


  // Quick Stock Adjust Modal State
  const [quickAdjustProduct, setQuickAdjustProduct] = useState(null);
  const [quickVariantId, setQuickVariantId] = useState('');
  const [quickDelta, setQuickDelta] = useState(1);
  const [quickDirection, setQuickDirection] = useState('ADD');
  const [quickReason, setQuickReason] = useState('Physical stock correction');
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickSuccessMsg, setQuickSuccessMsg] = useState('');
  const [quickErrorMsg, setQuickErrorMsg] = useState('');

  // Form State
  const [activeTab, setActiveTab] = useState('basic'); // basic, images, identification, pricing
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    brand: '',
    category: 'electronics',
    categoryLabel: 'Electronics',
    sku: '',
    barcode: '',
    sellingPrice: '',
    mrp: '',
    purchaseCost: '',
    stockQuantity: 0,
    lowStockThreshold: 5,
    hsn_code: '8517',
    gst_rate: 18.0,
    warranty_months: 12,
    requires_serial: false,
    isActive: true,
    images: [],
    description: '',
    variants: []
  });

  // Image Upload / URL Input State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [validatingUrl, setValidatingUrl] = useState(false);
  const [imageError, setImageError] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success', title = null) => {
    setToast({ message, type, title });
  };
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDanger: false,
    onConfirm: () => {}
  });
  const fileInputRef = useRef(null);

  // Check if current user can view purchase price
  const canViewPurchasePrice = useMemo(() => {
    if (isAdmin()) return true;
    const permissions = user?.permissions || [];
    return permissions.includes('inventory:view_cost') || permissions.includes('admin');
  }, [user, isAdmin]);

  // Full product management enabled for Inventory & Admin: Add, Edit, Delete, Stock Update
  const canManageProducts = true;

  // Load categories & brands
  useEffect(() => {
    apiClient.get('/products/categories')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setCategoriesList(res.data);
        } else {
          setCategoriesList([]);
        }
      })
      .catch(() => setCategoriesList([]));

    apiClient.get('/products/brands')
      .then((res) => {
        if (Array.isArray(res.data)) setBrandsList(res.data);
      })
      .catch(() => {});
  }, []);

  // Load products from backend and sync with shared live storage
  const loadProducts = async (forceSpinner = false) => {
    if (forceSpinner || (!products || products.length === 0)) {
      setLoading(true);
    }
    setLoadError('');
    try {
      // Query administrative products API if admin, or public products API if staff
      let catalogResponse;
      const isAdminUser = useAuthStore.getState().isAdmin();
      if (isAdminUser) {
        try {
          catalogResponse = await apiClient.get('/admin/products?limit=500&sort=catalog');
        } catch {
          catalogResponse = await apiClient.get('/products?limit=500&include_inactive=true');
        }
      } else {
        try {
          catalogResponse = await apiClient.get('/products?limit=500&include_inactive=true');
        } catch {
          catalogResponse = await apiClient.get('/products?limit=500');
        }
      }
      const data = Array.isArray(catalogResponse.data) ? catalogResponse.data : [];

      const mapped = data.map((p) => {
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

        // Robust price parsing across all possible backend and cache representations
        let rawSellingPrice = null;
        if (p.price != null && !isNaN(Number(p.price))) {
          rawSellingPrice = Number(p.price);
        } else if (p.selling_price != null && !isNaN(Number(p.selling_price))) {
          rawSellingPrice = Number(p.selling_price);
        } else if (p.sellingPrice != null && !isNaN(Number(p.sellingPrice))) {
          rawSellingPrice = Number(p.sellingPrice);
        } else if (p.selling_price_paise != null && !isNaN(Number(p.selling_price_paise))) {
          rawSellingPrice = Number(p.selling_price_paise) / 100;
        } else if (firstVariant.selling_price_paise != null && !isNaN(Number(firstVariant.selling_price_paise))) {
          rawSellingPrice = Number(firstVariant.selling_price_paise) / 100;
        } else if (firstVariant.price != null && !isNaN(Number(firstVariant.price))) {
          rawSellingPrice = Number(firstVariant.price);
        } else if (currentPrice.selling_price_paise != null && !isNaN(Number(currentPrice.selling_price_paise))) {
          rawSellingPrice = Number(currentPrice.selling_price_paise) / 100;
        }
        let sellingPrice = (rawSellingPrice != null && !isNaN(rawSellingPrice) && Number(rawSellingPrice) > 0)
          ? parsePrice(rawSellingPrice, 999)
          : (Number(firstVariant.selling_price_paise || currentPrice.selling_price_paise || 0) > 0
              ? Math.round(Number(firstVariant.selling_price_paise || currentPrice.selling_price_paise) / 100)
              : 999);
        if (!sellingPrice || sellingPrice <= 0) sellingPrice = 999;

        let rawMrp = null;
        if (p.originalPrice != null && !isNaN(Number(p.originalPrice))) {
          rawMrp = Number(p.originalPrice);
        } else if (p.mrp != null && !isNaN(Number(p.mrp))) {
          rawMrp = Number(p.mrp);
        } else if (p.mrp_paise != null && !isNaN(Number(p.mrp_paise))) {
          rawMrp = Number(p.mrp_paise) / 100;
        } else if (firstVariant.mrp_paise != null && !isNaN(Number(firstVariant.mrp_paise))) {
          rawMrp = Number(firstVariant.mrp_paise) / 100;
        } else if (currentPrice.mrp_paise != null && !isNaN(Number(currentPrice.mrp_paise))) {
          rawMrp = Number(currentPrice.mrp_paise) / 100;
        }
        const mrp = parsePrice(rawMrp, sellingPrice);

        // Robust total stock calculation across variants and properties
        let totalStock = 0;
        if (Array.isArray(p.variants) && p.variants.length > 0) {
          totalStock = p.variants.reduce((sum, v) => {
            const vStock = v.stock_on_hand ?? v.stock ?? v.on_hand ?? v.available ?? v.stock_available ?? v.inventory ?? (v.stock_levels?.[0]?.on_hand ?? 0);
            return sum + (Number(vStock) || 0);
          }, 0);
        }
        if (totalStock === 0) {
          if (p.total_stock != null && !isNaN(Number(p.total_stock)) && Number(p.total_stock) > 0) {
            totalStock = Number(p.total_stock);
          } else if (p.stockQuantity != null && !isNaN(Number(p.stockQuantity)) && Number(p.stockQuantity) > 0) {
            totalStock = Number(p.stockQuantity);
          } else if (p.stock_on_hand != null && !isNaN(Number(p.stock_on_hand)) && Number(p.stock_on_hand) > 0) {
            totalStock = Number(p.stock_on_hand);
          } else if (p.stock != null && !isNaN(Number(p.stock)) && Number(p.stock) > 0) {
            totalStock = Number(p.stock);
          }
        }

        // Purchase cost (Admin / Inventory Staff)
        let rawCost = null;
        if (p.purchase_cost != null && !isNaN(Number(p.purchase_cost)) && Number(p.purchase_cost) > 0) {
          rawCost = Number(p.purchase_cost);
        } else if (p.purchaseCost != null && !isNaN(Number(p.purchaseCost)) && Number(p.purchaseCost) > 0) {
          rawCost = Number(p.purchaseCost);
        } else if (p.purchase_cost_paise != null && !isNaN(Number(p.purchase_cost_paise)) && Number(p.purchase_cost_paise) > 0) {
          rawCost = Number(p.purchase_cost_paise) / 100;
        } else if (firstVariant.purchase_cost_paise != null && !isNaN(Number(firstVariant.purchase_cost_paise)) && Number(firstVariant.purchase_cost_paise) > 0) {
          rawCost = Number(firstVariant.purchase_cost_paise) / 100;
        } else if (currentPrice.purchase_cost_paise != null && !isNaN(Number(currentPrice.purchase_cost_paise)) && Number(currentPrice.purchase_cost_paise) > 0) {
          rawCost = Number(currentPrice.purchase_cost_paise) / 100;
        }
        const purchaseCost = rawCost !== null && !isNaN(rawCost) ? Math.round(rawCost) : Math.round(sellingPrice * 0.65);

        return {
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
          originalPrice: mrp,
          purchaseCost: purchaseCost,
          canViewPurchasePrice: p.can_view_purchase_price,
          stockQuantity: totalStock,
          lowStockThreshold: 5,
          stockStatus: p.stock_status || (totalStock <= 0 ? 'out_of_stock' : (totalStock <= 10 ? 'low_stock' : 'in_stock')),
          isActive: p.is_active !== false,
          images,
          primaryImage: p.primary_image || images[0] || NO_IMAGE_PLACEHOLDER,
          description: p.description || p.short_description || '',
          variants: (p.variants || []).map((v) => ({
            ...v,
            stock: v.on_hand ?? v.stock_on_hand ?? v.stock ?? 0,
            on_hand: v.on_hand ?? v.stock_on_hand ?? v.stock ?? 0,
            available: v.available ?? v.stock_available ?? v.stock ?? 0,
            reserved: v.reserved ?? 0
          }))
        };
      });
      setProducts(mapped);
      useInventoryStore.getState().setCachedProducts(mapped);
    } catch (err) {
      console.error('Failed to load products from API:', err);
      if (products.length === 0) {
        setProducts([]);
        setLoadError(err.response?.data?.detail || 'Could not load products. Check your sign-in and connection, then try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();

    // 1. Supabase Realtime subscription (database changes)
    let unsubscribeSupabase = () => {};
    try {
      unsubscribeSupabase = subscribeToCatalogChanges(() => {
        loadProducts();
      });
    } catch {}

    // 2. Listen to cross-app BroadcastChannel events with instant optimistic updates
    let bc;
    try {
      bc = new BroadcastChannel('unikart_channel');
      bc.onmessage = (msg) => {
        if (msg.data?.type === 'STOCK_UPDATED') {
          const { productId, sku, newStock } = msg.data;
          if ((productId || sku) && newStock !== undefined) {
            setProducts((prev) =>
              prev.map((p) => {
                if (
                  (productId && (String(p.id) === String(productId) || String(p.productId) === String(productId))) ||
                  (sku && String(p.sku) === String(sku))
                ) {
                  const qty = Number(newStock);
                  return {
                    ...p,
                    stockQuantity: qty,
                    total_stock: qty,
                    stockStatus: qty <= 0 ? 'out_of_stock' : qty <= (p.lowStockThreshold || 10) ? 'low_stock' : 'in_stock'
                  };
                }
                return p;
              })
            );
          }
          loadProducts();
        } else if (msg.data?.type === 'CATALOG_UPDATED') {
          loadProducts();
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
            loadProducts();
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

  // Quick Stock Adjustment Handler
  const handleOpenQuickAdjust = (product) => {
    setQuickAdjustProduct(product);
    const initialVId = product.variants?.[0]?.id ? String(product.variants[0].id) : '';
    setQuickVariantId(initialVId);
    setQuickDelta(1);
    setQuickDirection('ADD');
    setQuickReason('Physical stock correction');
    setQuickSuccessMsg('');
    setQuickErrorMsg('');
  };

  const handleSaveQuickAdjust = async (e) => {
    e.preventDefault();
    if (!quickAdjustProduct) return;
    const variants = quickAdjustProduct.variants || [];
    const activeVariant = variants.find((v) => String(v.id) === String(quickVariantId)) || variants[0];
    const vId = activeVariant?.id;
    const variantStock = activeVariant?.stock ?? activeVariant?.stock_levels?.[0]?.on_hand ?? (Number(quickAdjustProduct.stockQuantity) || 0);

    const qty = Math.max(1, parseInt(quickDelta, 10) || 1);
    if (quickDirection === 'SUBTRACT' && qty > variantStock) {
      setQuickErrorMsg(`Cannot decrease stock below 0. Variant on hand is ${variantStock} units.`);
      return;
    }

    const effectiveDelta = quickDirection === 'ADD' ? qty : -qty;
    const newVariantStock = Math.max(0, variantStock + effectiveDelta);
    const targetProduct = { ...quickAdjustProduct };

    // 1. INSTANT OPTIMISTIC UI: Update in-memory state in 0 milliseconds
    setProducts((prev) =>
      prev.map((p) => {
        if (String(p.id) === String(targetProduct.id)) {
          let updatedVariants = p.variants;
          let newTotal = newVariantStock;
          if (vId && Array.isArray(p.variants)) {
            updatedVariants = p.variants.map((v) =>
              String(v.id) === String(vId)
                ? {
                    ...v,
                    stock_levels: [{ on_hand: newVariantStock, reserved: 0 }],
                    stock: newVariantStock,
                    inventory: newVariantStock
                  }
                : v
            );
            newTotal = updatedVariants.reduce((sum, v) => {
              const s = v.stock ?? v.stock_levels?.[0]?.on_hand ?? v.inventory ?? 0;
              return sum + Number(s || 0);
            }, 0);
          }
          return {
            ...p,
            variants: updatedVariants,
            stockQuantity: newTotal,
            total_stock: newTotal,
            isActive: effectiveDelta > 0 ? true : p.isActive,
            stockStatus: newTotal <= 0 ? 'out_of_stock' : newTotal <= (p.lowStockThreshold || 10) ? 'low_stock' : 'in_stock'
          };
        }
        return p;
      })
    );

    // 2. Instant cache update in Zustand
    useInventoryStore.getState().updateProductStock(targetProduct.id, newVariantStock, vId);

    // 3. Instant cross-tab real-time sync
    try {
      const bc = new BroadcastChannel('unikart_channel');
      bc.postMessage({
        type: 'STOCK_UPDATED',
        productId: Number(targetProduct.id),
        variantId: vId,
        sku: activeVariant?.sku || targetProduct.sku,
        newStock: newVariantStock
      });
      bc.close();
    } catch {}

    // 4. INSTANT CLOSE & TOAST (0ms lag!)
    setQuickAdjustProduct(null);
    setQuickSaving(false);
    showToast(`Stock updated! ${targetProduct.name} is now ${newVariantStock} units.`, 'success', 'Stock Adjusted');

    if (effectiveDelta > 0 && statusFilter === 'out_of_stock') {
      setStatusFilter('active');
    }

    // 5. Fire backend API in background without blocking user UI
    const payload = {
      variant_id: vId,
      product_id: Number(targetProduct.id),
      quantity: effectiveDelta,
      movement_type: 'ADJUSTMENT',
      reason: quickReason
    };

    apiClient.post('/admin/inventory/adjust', payload)
      .then(() => {
        // Background soft re-sync without spinner
        loadProducts(false).catch(() => {});
      })
      .catch((err) => {
        console.error('Background stock adjustment failed:', err);
        showToast(err.response?.data?.detail || 'Failed to sync stock adjustment with database.', 'error', 'Adjustment Sync Failed');
        loadProducts(false).catch(() => {});
      });
  };

// High-Accuracy Stock Status Evaluators
const isLowStockProduct = (p) => {
  const qty = Number(p.stockQuantity ?? p.total_stock ?? 0);
  const lowThresh = Number(p.lowStockThreshold || 10);
  if (qty > 0 && qty <= lowThresh) return true;
  if (Array.isArray(p.variants) && p.variants.some((v) => {
    const vs = Number(v.stock ?? v.on_hand ?? v.stock_on_hand ?? 0);
    const rl = Number(v.reorder_level || lowThresh);
    return vs > 0 && vs <= rl;
  })) return true;
  return false;
};

const isOutOfStockProduct = (p) => {
  const qty = Number(p.stockQuantity ?? p.total_stock ?? 0);
  if (qty <= 0) return true;
  if (Array.isArray(p.variants) && p.variants.length > 0 && p.variants.every((v) => Number(v.stock ?? v.on_hand ?? v.stock_on_hand ?? 0) <= 0)) return true;
  return false;
};

  // Dynamically aggregated categories and brands from both API and loaded catalogue
  const allAvailableCategories = useMemo(() => {
    const map = new Map();
    STANDARD_CATEGORIES.forEach((c) => {
      map.set(c.slug, c);
    });
    (categoriesList || []).forEach((c) => {
      const slug = (c.slug || c.name || '').toLowerCase().trim();
      if (slug && slug !== 'all' && slug !== 'all categories') {
        map.set(slug, { id: c.id, slug, name: c.name || slug });
      }
    });
    (products || []).forEach((p) => {
      const slug = (p.categorySlug || p.category || '').toLowerCase().trim();
      const label = p.categoryLabel || p.category || slug;
      if (slug && !map.has(slug)) {
        map.set(slug, { id: p.categoryId, slug, name: label });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [categoriesList, products]);

  const allAvailableBrands = useMemo(() => {
    const map = new Map();
    (brandsList || []).forEach((b) => {
      if (b.name && b.name.trim()) map.set(b.name.toLowerCase().trim(), b.name.trim());
    });
    (products || []).forEach((p) => {
      if (p.brand && p.brand.trim()) {
        map.set(p.brand.toLowerCase().trim(), p.brand.trim());
      }
    });
    return Array.from(map.values()).sort();
  }, [brandsList, products]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {

    let result = [...products];

    // Deep search (name, primary SKU, barcode, category, brand, and all variant attributes)
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((p) => {
        const matchesPrimary =
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.categorySlug && p.categorySlug.toLowerCase().includes(q)) ||
          (p.categoryLabel && p.categoryLabel.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q));
        if (matchesPrimary) return true;

        if (Array.isArray(p.variants)) {
          return p.variants.some((v) =>
            (v.sku && v.sku.toLowerCase().includes(q)) ||
            (v.barcode && v.barcode.toLowerCase().includes(q)) ||
            (v.name && v.name.toLowerCase().includes(q)) ||
            (v.color && v.color.toLowerCase().includes(q)) ||
            (v.storage && v.storage.toLowerCase().includes(q))
          );
        }
        return false;
      });
    }

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter((p) => p.isActive);
    } else if (statusFilter === 'inactive') {
      result = result.filter((p) => !p.isActive);
    } else if (statusFilter === 'low_stock') {
      result = result.filter(isLowStockProduct);
    } else if (statusFilter === 'out_of_stock') {
      result = result.filter(isOutOfStockProduct);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      const sel = selectedCategory.toLowerCase().trim();
      result = result.filter((p) => {
        const cat = (p.category || '').toLowerCase();
        const catSlug = (p.categorySlug || '').toLowerCase();
        const catLabel = (p.categoryLabel || '').toLowerCase();
        const subcat = (p.subcategory || p.specifications?.subcategory || '').toLowerCase();
        const catId = String(p.categoryId || '');
        if (sel === 'electronics') {
          return (
            cat === 'electronics' ||
            catSlug === 'electronics' ||
            ELECTRONICS_SLUGS.includes(cat) ||
            ELECTRONICS_SLUGS.includes(catSlug) ||
            catLabel.includes('electronic') ||
            catLabel.includes('smartphones') ||
            catLabel.includes('mobile') ||
            catLabel.includes('laptop') ||
            catLabel.includes('audio') ||
            catLabel.includes('headphones') ||
            subcat.includes('smartphone') ||
            subcat.includes('5g') ||
            catId === '16'
          );
        }
        return (
          cat === sel ||
          catSlug === sel ||
          catLabel === sel ||
          catId === sel ||
          cat.includes(sel) ||
          catLabel.includes(sel) ||
          subcat.includes(sel)
        );
      });
    }

    // Brand filter
    if (selectedBrand !== 'all') {
      const sel = selectedBrand.toLowerCase().trim();
      result = result.filter((p) => p.brand?.toLowerCase() === sel || String(p.brandId) === sel);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
      if (sortBy === 'oldest') return (a.id || 0) - (b.id || 0);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'stock_asc') return (a.stockQuantity || 0) - (b.stockQuantity || 0);
      if (sortBy === 'stock_desc') return (b.stockQuantity || 0) - (a.stockQuantity || 0);
      return (a.id || 0) - (b.id || 0);
    });

    return result;
  }, [products, search, statusFilter, selectedCategory, selectedBrand, sortBy]);

  // Handle Open Create Modal
    // CSV Export
  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'SKU', 'Barcode', 'Category', 'Brand', 'Selling Price (INR)', 'MRP (INR)', 'Stock', 'Status'];
    const rows = filteredProducts.map(p => [
      `"${p.id}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.sku || ''}"`,
      `"${p.barcode || ''}"`,
      `"${p.categoryLabel || p.category || ''}"`,
      `"${p.brand || ''}"`,
      p.price || 0,
      p.originalPrice || 0,
      p.stockQuantity || 0,
      p.isActive ? 'Active' : 'Inactive'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `unikart_catalog_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setImageError('');
    setUrlInput('');
    setFeedbackMsg('');
    setActiveTab('basic');
    setFormData({
      id: '',
      name: '',
      brand: brandsList[0]?.name || '',
      category: categoriesList[0]?.slug || 'electronics',
      categoryLabel: categoriesList[0]?.name || 'Electronics',
      sku: '',
      barcode: '',
      sellingPrice: '',
      mrp: '',
      purchaseCost: '',
      stockQuantity: 0,
      lowStockThreshold: 5,
      hsn_code: '8517',
      gst_rate: 18.0,
      warranty_months: 12,
      requires_serial: false,
      isActive: true,
      images: [],
      description: '',
      variants: []
    });
    setIsModalOpen(true);
  };

  // Handle Open Edit Modal
  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setImageError('');
    setUrlInput('');
    setFeedbackMsg('');
    setActiveTab('basic');
    setFormData({
      id: product.id,
      name: product.name || '',
      brand: product.brand || '',
      category: product.category || 'electronics',
      categoryLabel: product.categoryLabel || 'Electronics',
      sku: product.sku || `SKU-${product.id}`,
      barcode: product.barcode || '',
      sellingPrice: product.price ?? '',
      mrp: product.originalPrice ?? product.price ?? '',
      purchaseCost: product.purchaseCost ?? '',
      stockQuantity: product.stockQuantity ?? 0,
      lowStockThreshold: product.lowStockThreshold || 5,
      hsn_code: product.hsn_code || '8517',
      gst_rate: product.gst_rate ?? 18.0,
      warranty_months: product.warranty_months ?? 12,
      requires_serial: Boolean(product.requires_serial),
      isActive: product.isActive !== false,
      images: Array.isArray(product.images) && product.images.length > 0 ? [...product.images] : (product.primaryImage ? [product.primaryImage] : []),
      description: product.description || '',
      variants: product.variants || []
    });
    setIsModalOpen(true);
  };

  // Handle Method 1: File Upload (Multi-image, JPEG/PNG/WEBP, size & MIME check)
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setImageError('');
    setUploadingImage(true);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

    for (const file of files) {
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        setImageError(`File "${file.name}" is not a supported format. Please use JPG, PNG, or WEBP.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setImageError(`File "${file.name}" exceeds 5MB size limit.`);
        continue;
      }

      try {
        const uploadData = new FormData();
        uploadData.append('file', file);

        const res = await apiClient.post('/admin/images/upload', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data?.url) {
          setFormData((prev) => ({
            ...prev,
            images: [...prev.images, res.data.url]
          }));
        }
      } catch (err) {
        const uploadErr = err.response?.data?.detail || err.message || 'Image upload failed. Please try again.';
        setImageError(`Upload error for "${file.name}": ${uploadErr}`);
      }
    }

    setUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Method 2: Validate & Add Image URL (with backend SSRF check)
  const handleAddImageUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;

    setImageError('');
    setValidatingUrl(true);

    try {
      const res = await apiClient.post('/admin/images/validate-url', { url });
      if (res.data?.valid) {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, url]
        }));
        setUrlInput('');
      } else {
        setImageError(res.data?.detail || 'Unable to verify image URL. Please ensure the link is publicly accessible.');
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Image URL verification failed.';
      setImageError(detail);
    } finally {
      setValidatingUrl(false);
    }
  };

  // Image manipulation in form
  const handleSetPrimaryImage = (index) => {
    if (index === 0) return;
    setFormData((prev) => {
      const newImages = [...prev.images];
      const [selected] = newImages.splice(index, 1);
      newImages.unshift(selected);
      return { ...prev, images: newImages };
    });
  };

  const handleRemoveImage = (index) => {
    setFormData((prev) => {
      const newImages = prev.images.filter((_, i) => i !== index);
      return { ...prev, images: newImages };
    });
  };

  const handleMoveImage = (index, direction) => {
    setFormData((prev) => {
      const newImages = [...prev.images];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= newImages.length) return prev;
      const temp = newImages[index];
      newImages[index] = newImages[targetIndex];
      newImages[targetIndex] = temp;
      return { ...prev, images: newImages };
    });
  };

  // Save Product (Create or Edit) with zero-latency optimistic UI updates
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setImageError('');
    setFeedbackMsg('');

    if (!formData.name.trim()) {
      setImageError('Product Name is required.');
      return;
    }
    if (!formData.sku || !formData.sku.trim()) {
      formData.sku = 'PROD-' + Date.now();
    }
    if (!formData.images.length) {
      setImageError('At least one product image is required.');
      return;
    }

    setIsSaving(true);

    try {
      const primaryImg = formData.images[0];
      const stock = Number(formData.stockQuantity) || 0;
      const sellingPrice = formData.sellingPrice !== '' ? Number(formData.sellingPrice) : 0;
      const mrp = formData.mrp !== '' ? Number(formData.mrp) : sellingPrice;
      const purchaseCost = formData.purchaseCost !== '' && !isNaN(Number(formData.purchaseCost))
        ? Number(formData.purchaseCost)
        : null;

      const matchedBrand = brandsList.find((b) => b.name?.toLowerCase() === formData.brand?.trim()?.toLowerCase());
      const brandId = matchedBrand?.id || (brandsList && brandsList.length > 0 ? brandsList[0].id : 1);
      const categoryId = allAvailableCategories.find((c) => c.slug === formData.category || c.name === formData.categoryLabel)?.id ||
        categoriesList.find((c) => c.slug === formData.category || c.name === formData.categoryLabel)?.id ||
        (categoriesList && categoriesList.length > 0 ? categoriesList[0].id : 1);

      const hasExistingVariants = editingProduct && Array.isArray(editingProduct.variants) && editingProduct.variants.length > 0;
      const variantsPayload = hasExistingVariants
        ? editingProduct.variants.map((v, idx) => ({
            id: v.id,
            name: v.name,
            sku: idx === 0 ? (formData.sku?.trim() || ('SKU-' + Date.now())) : v.sku,
            barcode: idx === 0 ? (formData.barcode?.trim() || null) : v.barcode,
            color: v.color,
            storage: v.storage,
            selling_price_paise: idx === 0 ? Math.round(sellingPrice * 100) : (v.selling_price_paise || (v.price ? Math.round(v.price * 100) : 0)),
            mrp_paise: idx === 0 ? Math.round(mrp * 100) : (v.mrp_paise || (v.originalPrice ? Math.round(v.originalPrice * 100) : 0)),
            purchase_cost_paise: idx === 0 && purchaseCost !== null ? Math.round(purchaseCost * 100) : (v.purchase_cost_paise || null),
            reorder_level: Number(formData.lowStockThreshold) || 5
          }))
        : [
            {
              id: editingProduct?.variants?.[0]?.id,
              name: formData.name,
              sku: formData.sku?.trim() || ('SKU-' + Date.now()),
              barcode: formData.barcode?.trim() || null,
              selling_price_paise: Math.round(sellingPrice * 100),
              mrp_paise: Math.round(mrp * 100),
              purchase_cost_paise: purchaseCost !== null ? Math.round(purchaseCost * 100) : null,
              ...(editingProduct ? {} : { initial_stock: stock }),
              reorder_level: Number(formData.lowStockThreshold) || 5
            }
          ];

      const sanitizedImages = (formData.images || []).filter(
        (img) => typeof img === 'string' && !img.startsWith('data:') && img.length <= 500
      );

      const payload = {
        name: formData.name.trim(),
        slug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        description: formData.description,
        short_description: formData.name,
        brand_id: brandId,
        category_id: categoryId,
        requires_serial: formData.requires_serial || false,
        warranty_months: Number(formData.warranty_months) || 12,
        hsn_code: formData.hsn_code || '8517',
        gst_rate: Number(formData.gst_rate) || 18.0,
        images: sanitizedImages,
        variants: variantsPayload
      };

      if (editingProduct) {
        const oldStock = Number(editingProduct.stockQuantity || 0);
        const newStock = Number(formData.stockQuantity);
        const willBeActive = (newStock > 0 || oldStock > 0) ? (formData.isActive !== false) : formData.isActive;

        // Synchronize stock in variant payload directly
        const variantsWithStock = variantsPayload.map((v, i) => i === 0 ? { ...v, on_hand: newStock, stockQuantity: newStock } : v);

        // 1. Instant 0ms Optimistic Update: close modal and update table immediately
        const updatedItem = {
          ...editingProduct,
          name: formData.name.trim(),
          description: formData.description,
          short_description: formData.name.trim(),
          brand: formData.brand || editingProduct.brand,
          category: formData.category || editingProduct.category,
          categoryLabel: formData.categoryLabel || editingProduct.categoryLabel,
          sku: formData.sku.trim(),
          barcode: formData.barcode?.trim() || null,
          price: sellingPrice,
          sellingPrice: sellingPrice,
          originalPrice: mrp,
          mrp: mrp,
          purchaseCost: purchaseCost,
          stockQuantity: newStock,
          total_stock: newStock,
          stock_on_hand: newStock,
          stockStatus: newStock <= 0 ? 'out_of_stock' : (newStock <= 10 ? 'low_stock' : 'in_stock'),
          isActive: willBeActive,
          images: formData.images,
          primaryImage: primaryImg,
          variants: variantsWithStock
        };

        const originalProduct = editingProduct;
        setProducts((prev) => prev.map((p) => String(p.id) === String(editingProduct.id) ? updatedItem : p));
        if (detailsProduct && String(detailsProduct.id) === String(editingProduct.id)) {
          setDetailsProduct(updatedItem);
        }
        useInventoryStore.getState().setCachedProducts(
          products.map((p) => String(p.id) === String(editingProduct.id) ? updatedItem : p)
        );

        setIsModalOpen(false);
        setEditingProduct(null);
        setIsSaving(false);
        showToast('Product updated successfully!', 'success', 'Catalog Updated');

        // Broadcast real-time event across tabs
        try {
          const bc = new BroadcastChannel('unikart_channel');
          bc.postMessage({ type: 'CATALOG_UPDATED' });
          if (!isNaN(newStock) && newStock !== oldStock) {
            bc.postMessage({
              type: 'STOCK_UPDATED',
              productId: Number(editingProduct.id),
              variantId: editingProduct.variants?.[0]?.id,
              sku: formData.sku.trim(),
              newStock: newStock
            });
          }
          bc.close();
        } catch {}

        // 2. Perform fast background server sync without blocking the user interface
        apiClient.patch(`/admin/products/${originalProduct.id}`, {
          name: formData.name.trim(),
          description: formData.description,
          is_active: willBeActive,
          brand_id: brandId || originalProduct.brandId,
          category_id: categoryId || originalProduct.categoryId,
          requires_serial: formData.requires_serial || false,
          warranty_months: Number(formData.warranty_months) || 12,
          hsn_code: formData.hsn_code || '8517',
          gst_rate: Number(formData.gst_rate) || 18.0,
          images: formData.images.filter(img => typeof img === 'string' && !img.startsWith('data:')),
          variants: variantsWithStock
        }).catch((err) => {
          // Revert optimistic update if an unexpected network error occurs
          setProducts((prev) => prev.map((p) => String(p.id) === String(originalProduct.id) ? originalProduct : p));
          const errMsg = err.response?.data?.detail || err.message || 'Failed to save product changes to server.';
          showToast(errMsg, 'error', 'Update Failed');
        });
      } else {
        // Create new product
        const res = await apiClient.post('/admin/products', payload);
        setIsModalOpen(false);
        setEditingProduct(null);
        showToast('Product created successfully and live in storefront!', 'success', 'Product Published');
        setTimeout(() => setFeedbackMsg(''), 3000);

        try {
          const bc = new BroadcastChannel('unikart_channel');
          bc.postMessage({ type: 'CATALOG_UPDATED' });
          bc.close();
        } catch {}

        await loadProducts();
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || 'Failed to save product.';
      setImageError(errMsg);
      showToast(errMsg, 'error', 'Save Failed');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Product Active / Inactive Status (Instant Live Sync)
  const handleToggleProductStatus = async (productId, targetState) => {
    try {
      // Optimistically update local state immediately
      setProducts((prev) =>
        prev.map((p) => (String(p.id) === String(productId) ? { ...p, isActive: targetState } : p))
      );
      if (detailsProduct && String(detailsProduct.id) === String(productId)) {
        setDetailsProduct((prev) => ({ ...prev, isActive: targetState }));
      }

      await apiClient.post(`/admin/products/${productId}/toggle-status`).catch(async () => {
        await apiClient.patch(`/admin/products/${productId}`, { is_active: targetState });
      });

      showToast(`Product marked as ${targetState ? 'Active' : 'Inactive'} and synced live!`, 'success', 'Status Updated');
      setTimeout(() => setFeedbackMsg(''), 3000);

      // Broadcast to storefront to instantly show or hide product
      try {
        const bc = new BroadcastChannel('unikart_channel');
        bc.postMessage({ type: 'CATALOG_UPDATED' });
        bc.close();
      } catch {}
    } catch (err) {
      console.error('Failed to toggle product status:', err);
      await loadProducts();
      showToast(err.response?.data?.detail || 'Failed to update product active status.', 'error', 'Action Failed');
    }
  };

  // Safe Archive Product with Attractive In-App Dialog
  const handleArchiveProduct = (productOrId) => {
    const prod = typeof productOrId === 'object' && productOrId !== null
      ? productOrId
      : products.find((p) => String(p.id) === String(productOrId));

    const pName = prod ? prod.name : 'this product';
    const pId = prod ? prod.id : productOrId;

    setConfirmDialog({
      isOpen: true,
      title: 'Deactivate Product?',
      message: `Are you sure you want to deactivate "${pName}"? It will be immediately hidden from the storefront catalog but preserved in your inventory records.`,
      confirmText: 'Deactivate Product',
      cancelText: 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await handleToggleProductStatus(pId, false);
        showToast(`"${pName}" has been deactivated and hidden from storefront.`, 'info', 'Product Deactivated');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Actions */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">

            <span className="text-xs font-mono text-slate-400">
              {filteredProducts.length} of {products.length} Products
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Product Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage catalogue products, images, stock status, and pricing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadProducts}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Refresh product list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Export catalogue to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>



          {canManageProducts && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#E8173D] hover:bg-red-700 text-white shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Search, Filter Controls & View Mode Toggle */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        {/* Search Bar (Prompt Section 6 Placeholder) */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, category or brand..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D] placeholder-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          {/* Status Tabs with Live Inventory Counts */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `All Products (${products.length})` },
              { id: 'active', label: `Active (${products.filter((p) => p.isActive).length})` },
              { id: 'inactive', label: `Inactive (${products.filter((p) => !p.isActive).length})` },
              { id: 'low_stock', label: `Low Stock (${products.filter(isLowStockProduct).length})` },
              { id: 'out_of_stock', label: `Out of Stock (${products.filter(isOutOfStockProduct).length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#E31837] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#252525] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2e2e2e]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Category, Brand, Sort, and View Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown (All Dynamic Categories) */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories ({allAvailableCategories.length})</option>
              {allAvailableCategories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Brand Dropdown (All Dynamic Brands) */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All Brands ({allAvailableBrands.length})</option>
              {allAvailableBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="catalog">Storefront Catalog Order</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Product Name (A-Z)</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="stock_asc">Stock: Low to High</option>
              <option value="stock_desc">Stock: High to Low</option>
            </select>

            {/* Grid / List View Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Products Display (Grid or List View) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-4 border border-slate-200 dark:border-slate-700 animate-pulse space-y-3">
              <div className="w-full aspect-square bg-slate-200 dark:bg-slate-800 rounded-xl" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="w-full bg-white dark:bg-[#1E1E1E] rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700 my-6 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-700">
            {statusFilter === 'low_stock' ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            ) : statusFilter === 'out_of_stock' ? (
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            ) : (
              <Boxes className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            )}
          </div>
          
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {loadError
              ? 'Products Could Not Be Loaded'
              : statusFilter === 'low_stock'
              ? 'Zero Low-Stock Items'
              : statusFilter === 'out_of_stock'
              ? 'No Out-of-Stock Items'
              : statusFilter === 'inactive'
              ? 'No Inactive Products'
              : products.length
              ? 'No Matching Products Found'
              : 'No Products in Catalogue'}
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            {loadError
              ? loadError
              : statusFilter === 'low_stock'
              ? 'All catalog items currently have inventory quantities above their designated minimum reorder thresholds.'
              : statusFilter === 'out_of_stock'
              ? 'Every product in your catalog currently has available sellable inventory.'
              : statusFilter === 'inactive'
              ? 'All products are currently marked active and published to the customer catalog.'
              : products.length
              ? `No products match your current search "${search}" or active filter filters.`
              : 'Products added to the storefront catalog will appear here automatically.'}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#E8173D] text-white hover:bg-red-700 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>View All Products ({products.length})</span>
              </button>
            )}

            {(search || selectedCategory !== 'all' || selectedBrand !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('all');
                  setSelectedBrand('all');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                Reset Search & Dropdowns
              </button>
            )}

            {loadError && (
              <button
                onClick={loadProducts}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#E8173D] text-white hover:bg-red-700 transition-all cursor-pointer shadow-xs"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW: Responsive Cards with IDENTICAL Aspect Ratio Images */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const hasMultipleImages = Array.isArray(product.images) && product.images.length > 1;
            const isOutOfStock = (product.stockQuantity || 0) <= 0;
            const isLowStock = !isOutOfStock && (product.stockQuantity || 0) <= (product.lowStockThreshold || 10);

            return (
              <div
                key={product.id}
                className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
              >
                {/* Product Card Image: STRICT 1:1 Aspect Ratio Matching Ecommerce Dimensions */}
                <div className="relative w-full aspect-square bg-[#F8F9FA] dark:bg-slate-800/80 overflow-hidden border-b border-slate-100 dark:border-slate-800">
                  <img
                    src={product.primaryImage || (product.images && product.images[0]) || NO_IMAGE_PLACEHOLDER}
                    alt={product.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = NO_IMAGE_PLACEHOLDER;
                    }}
                  />

                  {/* Multi-Image Badge */}
                  {hasMultipleImages && (
                    <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-bold flex items-center gap-1">
                      <Images className="w-3 h-3" />
                      <span>{product.images.length}</span>
                    </div>
                  )}

                  {/* Stock Status Badge */}
                  <div className="absolute top-2.5 right-2.5">
                    {isOutOfStock ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900">
                        Out of Stock
                      </span>
                    ) : isLowStock ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                        Low Stock ({product.stockQuantity})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                        In Stock ({product.stockQuantity})
                      </span>
                    )}
                  </div>

                  {/* Active / Inactive Badge & Instant Reactivate */}
                  {!product.isActive ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleProductStatus(product.id, true);
                      }}
                      className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                      title="Click to reactivate this product"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span>Inactive &bull; Reactivate</span>
                    </button>
                  ) : (
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[9px] font-bold uppercase tracking-wider shadow-xs">
                      Active
                    </span>
                  )}
                </div>

                {/* Product Card Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Brand & Category */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-1">
                      <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {product.brand || 'Unikart'}
                      </span>
                      <span>{product.categoryLabel || product.category}</span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 leading-snug" title={product.name}>
                      {product.name}
                    </h3>


                  </div>

                  {/* Pricing Section (Selling Price + Permission-Gated Cost) */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          ₹{formatPrice(product.price)}
                        </span>
                        {product.originalPrice && parsePrice(product.originalPrice) > parsePrice(product.price) && (
                          <span className="text-[11px] text-slate-400 line-through ml-1.5">
                            ₹{formatPrice(product.originalPrice)}
                          </span>
                        )}
                      </div>

                      {/* Purchase Cost (Permission-Gated) */}
                      {canViewPurchasePrice && product.purchaseCost !== null && product.purchaseCost !== undefined && (
                        <div className="text-right text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                          Cost: ₹{formatPrice(product.purchaseCost)}
                        </div>
                      )}
                    </div>

                    {/* Actions: View Details, Quick Adjust, & Edit */}
                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => setDetailsProduct(product)}
                        className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        title="View Product Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>

                      <button
                        onClick={() => handleOpenQuickAdjust(product)}
                        className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500 text-amber-700 dark:text-amber-400 hover:text-white border border-amber-500/30 transition-all cursor-pointer"
                        title="Adjust Stock"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Adjust</span>
                      </button>

                      {canManageProducts && (
                        <button
                          onClick={() => handleOpenEditModal(product)}
                          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-bold bg-[#E8173D]/10 hover:bg-[#E8173D] text-[#E8173D] hover:text-white border border-[#E8173D]/30 transition-all cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW: Structured Table View */
        <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Selling Price</th>
                  {canViewPurchasePrice && <th className="py-3 px-4">Purchase Cost</th>}
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#F8F9FA] dark:bg-slate-800 shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                          <img
                            src={p.primaryImage || p.images?.[0] || NO_IMAGE_PLACEHOLDER}
                            alt={p.name}
                            className="w-full h-full object-cover object-center"
                            loading="lazy"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = NO_IMAGE_PLACEHOLDER;
                            }}
                          />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{p.brand}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {p.categoryLabel || p.category}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      ₹{formatPrice(p.price)}
                    </td>
                    {canViewPurchasePrice && (
                      <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                        {p.purchaseCost !== null ? `₹${formatPrice(p.purchaseCost)}` : '—'}
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <span className={`font-bold ${p.stockQuantity <= 0 ? 'text-red-600' : p.stockQuantity <= 10 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
                        {p.stockQuantity} units
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {p.stockQuantity <= 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">Out of Stock</span>
                      ) : p.stockQuantity <= 10 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Low Stock</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">In Stock</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setDetailsProduct(p)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenQuickAdjust(p)}
                          className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                          title="Quick Stock Adjust"
                        >
                          <Layers className="w-3.5 h-3.5" />
                        </button>

                        {canManageProducts && (
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 rounded-lg text-[#E8173D] hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. ADD / EDIT PRODUCT MODAL (Section 8) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingProduct ? 'Update catalogue metadata, variants, or images.' : 'Create a new marketplace product with multi-image support.'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="px-4 sm:px-6 pt-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-4 text-xs font-bold overflow-x-auto">
              {[
                { id: 'basic', label: 'Basic Info' },
                { id: 'images', label: `Images (${formData.images.length})` },
                { id: 'pricing', label: 'Pricing & Stock' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`pb-2.5 transition-all cursor-pointer border-b-2 ${
                    activeTab === t.id
                      ? 'border-[#E8173D] text-[#E8173D]'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Feedback Alert */}
              {feedbackMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{feedbackMsg}</span>
                </div>
              )}
              {imageError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{imageError}</span>
                </div>
              )}

              {/* TAB 1: Basic Information */}
              {activeTab === 'basic' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Category *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => {
                          const cat = allAvailableCategories.find((c) => (c.slug || c.id) === e.target.value) || categoriesList.find((c) => (c.slug || c.id) === e.target.value);
                          setFormData({
                            ...formData,
                            category: e.target.value,
                            categoryLabel: cat?.name || e.target.value
                          });
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D] cursor-pointer"
                      >
                        {allAvailableCategories.map((c) => (
                          <option key={c.id || c.slug} value={c.slug || c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Brand *
                      </label>
                      <input
                        type="text"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        placeholder="e.g. Sony, Apple, Nike"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Product Description
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detailed features, specifications, box contents..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="isActiveToggle"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-[#E8173D] rounded border-slate-300 focus:ring-[#E8173D]"
                    />
                    <label htmlFor="isActiveToggle" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      Product is Active and Visible in Marketplace
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: Multi-Image Studio (Section 8.B Dual Method) */}
              {activeTab === 'images' && (
                <div className="space-y-4">
                  {/* Method 1: File Upload */}
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      className="hidden"
                      id="productImageFiles"
                    />
                    <label
                      htmlFor="productImageFiles"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white hover:border-[#E8173D] cursor-pointer shadow-xs transition-all"
                    >
                      <Upload className="w-4 h-4 text-[#E8173D]" />
                      <span>{uploadingImage ? 'Uploading & Inspecting...' : 'Upload Image Files (JPG, PNG, WEBP)'}</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Multiple images supported. Max 5MB per image. Image dimensions verified server-side.
                    </p>
                  </div>

                  {/* Method 2: Paste Image URL */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/20 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Paste Product Image URL (SSRF Protected)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://images.example.com/product.jpg"
                        className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                      />
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        disabled={validatingUrl || !urlInput.trim()}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-[#E8173D] hover:bg-red-700 disabled:opacity-50 text-white transition-all cursor-pointer shrink-0"
                      >
                        {validatingUrl ? 'Validating...' : 'Add Image URL'}
                      </button>
                    </div>
                  </div>

                  {/* Image Thumbnails Gallery with Reorder & Primary Selection */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Product Gallery ({formData.images.length} images) &bull; First Image is Primary
                    </h3>

                    {formData.images.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No images added yet. Upload files or paste a valid URL.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {formData.images.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-xl border relative flex flex-col items-center justify-between gap-2 ${
                              idx === 0
                                ? 'border-[#E8173D] bg-red-50/20 dark:bg-red-950/20'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {/* Primary Badge */}
                            {idx === 0 && (
                              <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#E8173D] text-white">
                                Primary
                              </span>
                            )}

                            {/* Thumbnail Image */}
                            <div className="w-full aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden flex items-center justify-center">
                              <img
                                src={imgUrl}
                                alt={`Product thumbnail ${idx + 1}`}
                                className="w-full h-full object-contain"
                              />
                            </div>

                            {/* Thumbnail Actions */}
                            <div className="w-full flex items-center justify-between gap-1 pt-1 border-t border-slate-100 dark:border-slate-700">
                              <div className="flex items-center gap-1">
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveImage(idx, -1)}
                                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                    title="Move Left"
                                  >
                                    <ArrowLeft className="w-3 h-3" />
                                  </button>
                                )}
                                {idx < formData.images.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveImage(idx, 1)}
                                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                    title="Move Right"
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                {idx !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetPrimaryImage(idx)}
                                    className="text-[10px] font-bold text-sky-600 hover:underline cursor-pointer"
                                  >
                                    Make Primary
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(idx)}
                                  className="p-1 rounded text-red-500 hover:text-red-700 cursor-pointer"
                                  title="Remove Image"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}



              {/* TAB 4: Pricing & Inventory */}
              {activeTab === 'pricing' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Selling Price (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={formData.sellingPrice}
                        onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Maximum Retail Price / MRP (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formData.mrp}
                        onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                      />
                    </div>

                    {/* Purchase Cost (Permission-Gated) */}
                    {canViewPurchasePrice && (
                      <div>
                        <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                          Purchase Cost (₹) &bull; Admin
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={formData.purchaseCost}
                          onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Available Stock Quantity (Units)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stockQuantity}
                        onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Low Stock Alert Threshold
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.lowStockThreshold}
                        onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#E8173D] hover:bg-red-700 disabled:opacity-60 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSaving ? (editingProduct ? 'Updating...' : 'Saving...') : (editingProduct ? 'Update Product' : 'Save & Publish Product')}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. PRODUCT DETAILS DRAWER / MODAL (Section 9) */}
      {detailsProduct && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={(e) => { if (e.target === e.currentTarget) setDetailsProduct(null); }}>
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scaleIn">
            {/* Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Product Specifications
                </span>
                <h2 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {detailsProduct.name}
                </h2>
              </div>
              <button
                onClick={() => setDetailsProduct(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Image Gallery Hero */}
              <div className="space-y-3">
                <div className="w-full h-64 bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 flex items-center justify-center border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <img
                    src={detailsProduct.primaryImage || detailsProduct.images?.[0] || NO_IMAGE_PLACEHOLDER}
                    alt={detailsProduct.name}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = NO_IMAGE_PLACEHOLDER;
                    }}
                  />
                </div>

                {Array.isArray(detailsProduct.images) && detailsProduct.images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {detailsProduct.images.map((img, i) => (
                      <div
                        key={i}
                        onClick={() => setDetailsProduct({ ...detailsProduct, primaryImage: img })}
                        className={`w-16 h-16 rounded-xl border p-1 bg-slate-50 dark:bg-slate-800 overflow-hidden cursor-pointer shrink-0 ${
                          detailsProduct.primaryImage === img ? 'border-[#E8173D] ring-2 ring-red-400/40' : 'border-slate-200'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-contain" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Selling Price</span>
                  <span className="text-base font-black text-slate-900 dark:text-white mt-1 block">
                    ₹{formatPrice(detailsProduct.price)}
                  </span>
                </div>

                {canViewPurchasePrice && (
                  <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase block">Purchase Cost</span>
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-400 mt-1 block">
                      {detailsProduct.purchaseCost !== null ? `₹${formatPrice(detailsProduct.purchaseCost)}` : '—'}
                    </span>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Available Stock</span>
                  <span className="text-base font-black text-slate-900 dark:text-white mt-1 block">
                    {detailsProduct.stockQuantity} units
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Catalogue Status</span>
                  <span className={`text-xs font-black uppercase mt-1 block ${detailsProduct.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {detailsProduct.isActive ? 'Active' : 'Archived'}
                  </span>
                </div>
              </div>

              {/* Description */}
              {detailsProduct.description && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Description</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    {detailsProduct.description}
                  </p>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <button
                onClick={() => setDetailsProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {isAdmin() && detailsProduct.isActive && (
                  <button
                    onClick={() => handleArchiveProduct(detailsProduct.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-red-100 text-slate-700 hover:text-red-700 transition-colors cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Safe Archive</span>
                  </button>
                )}

                {canManageProducts && (
                  <button
                    onClick={() => {
                      const p = detailsProduct;
                      setDetailsProduct(null);
                      handleOpenEditModal(p);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#E8173D] hover:bg-red-700 text-white transition-all cursor-pointer shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Product</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attractive Global Toast Notification */}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      {/* Attractive Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        isDanger={confirmDialog.isDanger}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* 6. QUICK REAL-TIME STOCK ADJUSTMENT MODAL */}
      {quickAdjustProduct && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={(e) => { if (e.target === e.currentTarget) setQuickAdjustProduct(null); }}>
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scaleIn">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quick Stock Adjustment</h3>
                  <p className="text-[11px] text-slate-400">Real-time ledger synchronized adjustment</p>
                </div>
              </div>
              <button
                onClick={() => setQuickAdjustProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickAdjust} className="p-6 space-y-4">
              {quickSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{quickSuccessMsg}</span>
                </div>
              )}

              {quickErrorMsg && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{quickErrorMsg}</span>
                </div>
              )}

              {/* Product Info */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{quickAdjustProduct.name}</p>
                  <p className="text-[10px] text-slate-400">{quickAdjustProduct.categoryLabel || quickAdjustProduct.brand}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Stock</span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                    {quickAdjustProduct.stockQuantity || 0}
                  </span>
                </div>
              </div>

              {/* Variant Selector if multi-variant */}
              {quickAdjustProduct.variants && quickAdjustProduct.variants.length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Variant to Adjust
                  </label>
                  <select
                    value={quickVariantId}
                    onChange={(e) => setQuickVariantId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E31837]"
                  >
                    {quickAdjustProduct.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name || 'Standard'} (Current: {v.stock ?? v.stock_levels?.[0]?.on_hand ?? 0} units)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Direction Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Adjustment Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickDirection('ADD')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                      quickDirection === 'ADD'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Stock</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickDirection('SUBTRACT')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                      quickDirection === 'SUBTRACT'
                        ? 'bg-red-600 text-white border-red-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Reduce Stock</span>
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Quantity</label>
                  <span className="text-xs font-mono text-slate-500">
                    New total: <strong className="text-slate-900 dark:text-white">
                      {quickDirection === 'ADD'
                        ? (Number(quickAdjustProduct.stockQuantity) || 0) + (parseInt(quickDelta, 10) || 0)
                        : Math.max(0, (Number(quickAdjustProduct.stockQuantity) || 0) - (parseInt(quickDelta, 10) || 0))}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={quickDelta}
                    onChange={(e) => setQuickDelta(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                    required
                  />
                  <div className="flex gap-1">
                    {[1, 5, 10].map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setQuickDelta(step)}
                        className="px-2 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400"
                      >
                        +{step}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Reason</label>
                <select
                  value={quickReason}
                  onChange={(e) => setQuickReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="Physical stock correction">Physical stock correction</option>
                  <option value="Stock discrepancy">Stock discrepancy</option>
                  <option value="Damaged stock correction">Damaged stock correction</option>
                  <option value="Missing stock">Missing stock</option>
                  <option value="Cycle count reconciliation">Cycle count reconciliation</option>
                </select>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickAdjustProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickSaving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#E8173D] hover:bg-red-700 text-white shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {quickSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{quickSaving ? 'Saving...' : 'Apply Real-Time Adjustment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

          </div>
  );
}

export default ProductsCatalogPage;
