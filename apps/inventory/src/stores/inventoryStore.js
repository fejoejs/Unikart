import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useInventoryStore = create(
  persist(
    (set, get) => ({
      searchQuery: '',
      selectedCategory: 'all',
      stockFilter: 'ALL', // 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK'
      cachedProducts: [],
      cachedCategories: [],
      lastUpdated: null,

      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedCategory: (category) => set({ selectedCategory: category }),
      setStockFilter: (filter) => set({ stockFilter: filter }),
      resetFilters: () => set({ searchQuery: '', selectedCategory: 'all', stockFilter: 'ALL' }),

      setCachedProducts: (products) => {
        const sanitized = (products || []).map((p) => {
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
        set({ cachedProducts: sanitized, lastUpdated: Date.now() });
      },

      setCachedCategories: (categories) => set({ cachedCategories: categories }),

      updateProductStock: (productId, newStock, variantId) => {
        const { cachedProducts } = get();
        const pIdStr = String(productId);
        const updated = cachedProducts.map((p) => {
          if (String(p.id) === pIdStr || String(p.productId) === pIdStr || String(p.sku) === pIdStr) {
            let updatedVariants = p.variants;
            if (variantId && Array.isArray(p.variants)) {
              updatedVariants = p.variants.map((v) => {
                if (String(v.id) === String(variantId)) {
                  const currentLevels = v.stock_levels || [];
                  const updatedLevels = currentLevels.length > 0 
                    ? [{ ...currentLevels[0], on_hand: Number(newStock) }] 
                    : [{ on_hand: Number(newStock), reserved: 0 }];
                  return { ...v, stock_levels: updatedLevels, inventory: Number(newStock), stock: Number(newStock) };
                }
                return v;
              });
            }
            let stockQty = Number(newStock);
            if (Array.isArray(updatedVariants) && updatedVariants.length > 0) {
              stockQty = updatedVariants.reduce((sum, v) => {
                const vStock = v.stock ?? v.stock_levels?.[0]?.on_hand ?? v.inventory ?? 0;
                return sum + Number(vStock || 0);
              }, 0);
            }
            const lowThresh = p.lowStockThreshold || 10;
            return {
              ...p,
              variants: updatedVariants,
              stockQuantity: stockQty,
              total_stock: stockQty,
              stockStatus: stockQty <= 0 ? 'out_of_stock' : stockQty <= lowThresh ? 'low_stock' : 'in_stock'
            };
          }
          return p;
        });
        set({ cachedProducts: updated, lastUpdated: Date.now() });
      }
    }),
    {
      name: 'unikart-inventory-cache',
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.cachedProducts)) {
          state.cachedProducts = state.cachedProducts.map((p) => {
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
        }
      },
      partialize: (state) => ({
        cachedProducts: state.cachedProducts,
        cachedCategories: state.cachedCategories,
        lastUpdated: state.lastUpdated
      })
    }
  )
);

export default useInventoryStore;
