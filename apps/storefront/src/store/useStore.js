import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { COUPONS, PINCODES } from '../data/appConfig';
import { resolvePincodePrefix } from '../lib/pincodeResolver';
import { supabase, subscribeToCatalogChanges } from '../services/supabase';
import api from '../lib/api';

export function matchCatalogProduct(product, key) {
  if (!product || key == null) return false;
  const k = String(key);
  return [product.id, product.productId, product.sku, product.slug, product.variantId]
    .some((value) => value != null && String(value) === k);
}

// ---------------- UI & TOAST STORE ----------------
export const useUIStore = create((set) => ({
  isCartDrawerOpen: false,
  isLocationModalOpen: false,
  isSearchModalOpen: false,
  quickViewProduct: null,
  toasts: [],

  openCartDrawer: () => set({ isCartDrawerOpen: true }),
  closeCartDrawer: () => set({ isCartDrawerOpen: false }),
  toggleCartDrawer: () => set((state) => ({ isCartDrawerOpen: !state.isCartDrawerOpen })),

  openLocationModal: () => set({ isLocationModalOpen: true }),
  closeLocationModal: () => set({ isLocationModalOpen: false }),

  openSearchModal: () => set({ isSearchModalOpen: true }),
  closeSearchModal: () => set({ isSearchModalOpen: false }),

  setQuickViewProduct: (product) => set({ quickViewProduct: product }),
  closeQuickView: () => set({ quickViewProduct: null }),

  addToast: (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 3500);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
}));

// ---------------- DELIVERY LOCATION STORE ----------------
export const useLocationStore = create(
  persist(
    (set) => ({
      pincode: '695001',
      city: 'Thiruvananthapuram',
      place: 'Palayam',
      state: 'Kerala',
      stateCode: '32',
      isExpressAvailable: true,

      setLocation: (pin, customCity = null, customState = null, customPlace = null) => {
        const clean = String(pin || '').trim();
        const info = PINCODES[clean] || resolvePincodePrefix(clean) || {
          city: customCity || 'India',
          place: customPlace || '',
          state: customState || 'All States',
          stateCode: '99',
          isExpressAvailable: true
        };
        set({
          pincode: clean,
          city: customCity || info.city,
          place: customPlace !== null ? customPlace : (info.place || ''),
          state: customState || info.state,
          stateCode: info.stateCode || '29',
          isExpressAvailable: info.expressAvailable ?? true
        });
      }
    }),
    { name: 'unikart-location' }
  )
);

// ---------------- CART STORE (BACKEND-CONNECTED & REAL-TIME) ----------------
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      appliedCoupon: null,
      serverTotals: null,
      isLoading: false,

      // Sync latest cart from FastAPI & Supabase backend
      fetchBackendCart: async () => {
        try {
          const res = await api.get('/cart');
          if (res.data) {
            const backendCart = res.data;
            const mappedItems = (backendCart.items || []).map((it) => ({
              id: it.id,
              cartItemId: it.id,
              variantId: it.variant_id,
              itemKey: `cart-${it.variant_id}`,
              name: it.product_name,
              brand: 'Unikart',
              price: Math.round(it.unit_price_paise / 100),
              originalPrice: Math.round((it.mrp_paise || it.unit_price_paise) / 100),
              image: it.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80',
              quantity: it.quantity,
              inStock: it.in_stock,
              availableQty: it.available_qty
            }));

            // Only overwrite items if the backend returned items
            if (mappedItems.length > 0) {
              set({
                items: mappedItems,
                appliedCoupon: backendCart.coupon_code ? { code: backendCart.coupon_code } : null,
                serverTotals: {
                  subtotal: Math.round((backendCart.subtotal_paise || 0) / 100),
                  discount: Math.round((backendCart.discount_paise || 0) / 100),
                  tax: Math.round((backendCart.estimated_tax_paise || 0) / 100),
                  total: Math.round((backendCart.estimated_total_paise || 0) / 100),
                  itemCount: backendCart.total_items_count
                }
              });
            }
          }
        } catch (err) {
          console.warn('Could not sync backend cart:', err);
        }
      },

      addToCart: async (product, quantity = 1, color = null, size = null) => {
        let vId = Number(product.variantId);
        if (!Number.isInteger(vId) || vId <= 0) {
          if (Array.isArray(product.variants) && product.variants.length > 0) {
            const activeV = product.variants.find((v) => v.is_active !== false) || product.variants[0];
            vId = Number(activeV?.id);
          }
        }
        if (!Number.isInteger(vId) || vId <= 0) {
          const numericId = parseInt(product.productId || product.id, 10);
          vId = (Number.isInteger(numericId) && numericId > 0) ? numericId : 1;
        }

        const qtyToAdd = Math.max(1, quantity);
        const itemKey = `item_${product.id}_${vId}`;
        const prevItems = [...get().items];
        const existingIdx = prevItems.findIndex((i) => i.itemKey === itemKey || (i.id === product.id && i.variantId === vId));

        // Ultra-snappy optimistic UI update (0ms instant response)
        let optimisticItems;
        if (existingIdx >= 0) {
          optimisticItems = prevItems.map((item, idx) =>
            idx === existingIdx ? { ...item, quantity: item.quantity + qtyToAdd } : item
          );
        } else {
          optimisticItems = [
            ...prevItems,
            {
              id: product.id,
              cartItemId: null,
              variantId: vId,
              name: product.name,
              variantName: product.variantName || product.name,
              sku: product.sku || '',
              price: product.price || 0,
              mrp: product.originalPrice || product.mrp || product.price || 0,
              quantity: qtyToAdd,
              image: product.image || (Array.isArray(product.images) ? product.images[0] : null),
              inStock: true,
              availableQty: 99,
              itemKey
            }
          ];
        }
        set({ items: optimisticItems });

        // Asynchronous non-blocking background server sync (0ms instant response)
        api.post('/cart/items', {
          variant_id: vId,
          quantity: qtyToAdd
        }).then((res) => {
          if (res.data) {
            const backendCart = res.data;
            const mappedItems = (backendCart.items || []).map((it) => ({
              id: it.product_id,
              cartItemId: it.id,
              variantId: it.variant_id,
              name: it.product_name,
              variantName: it.variant_name,
              sku: it.sku,
              price: it.unit_price_paise / 100,
              mrp: it.mrp_paise ? it.mrp_paise / 100 : it.unit_price_paise / 100,
              quantity: it.quantity,
              image: it.image_url,
              inStock: it.in_stock,
              availableQty: it.available_qty,
              itemKey: item__
            }));
            const bSubtotal = Math.round((backendCart.subtotal_paise || 0) / 100);
            const bDiscount = Math.round((backendCart.discount_paise || 0) / 100);
            const bTax = Math.round((backendCart.estimated_tax_paise || 0) / 100);
            const bTotal = Math.round((backendCart.estimated_total_paise || 0) / 100);
            set({
              items: mappedItems.length > 0 ? mappedItems : optimisticItems,
              appliedCoupon: backendCart.coupon_code ? { code: backendCart.coupon_code } : null,
              serverTotals: {
                subtotal: bSubtotal,
                discount: bDiscount,
                tax: bTax,
                total: bTotal,
                itemCount: backendCart.total_items_count
              }
            });
          }
        }).catch((err) => {
          if (err.response?.status === 400 && err.response?.data?.detail?.toLowerCase().includes('stock')) {
            set({ items: prevItems });
            useUIStore.getState().addToast(err.response.data.detail, 'error');
          } else {
            console.warn('Backend cart sync note (retained local cart):', err.message);
          }
        });

        return { success: true };
      },

      removeFromCart: async (itemId) => {
        const prevItems = [...get().items];
        const item = prevItems.find((i) => i.id === itemId || i.cartItemId === itemId || i.itemKey === itemId);
        // Ultra-snappy optimistic removal
        set({ items: prevItems.filter((i) => i.id !== itemId && i.cartItemId !== itemId && i.itemKey !== itemId) });

        const serverItemId = item?.cartItemId || (typeof item?.id === 'number' ? item.id : null);
        if (serverItemId) {
          try {
            await api.delete(`/cart/items/${serverItemId}`);
            get().fetchBackendCart();
          } catch (err) {
            console.warn('Failed to delete cart item on server:', err);
          }
        }
      },

      updateQuantity: async (itemId, qty) => {
        if (qty <= 0) {
          return get().removeFromCart(itemId);
        }
        const prevItems = [...get().items];
        const item = prevItems.find((i) => i.id === itemId || i.cartItemId === itemId || i.itemKey === itemId);
        // Ultra-snappy optimistic quantity update
        set({
          items: prevItems.map((i) =>
            (i.id === itemId || i.cartItemId === itemId || i.itemKey === itemId)
              ? { ...i, quantity: qty }
              : i
          )
        });

        const serverItemId = item?.cartItemId || (typeof item?.id === 'number' ? item.id : null);
        if (serverItemId) {
          try {
            await api.patch(`/cart/items/${serverItemId}`, { quantity: qty });
            get().fetchBackendCart();
          } catch (err) {
            console.warn('Failed to update cart item quantity on server:', err);
          }
        }
      },

      clearCart: () => set({ items: [], appliedCoupon: null, serverTotals: null }),

      applyCoupon: async (code) => {
        try {
          const res = await api.post('/cart/coupon', { coupon_code: code.trim().toUpperCase() });
          if (res.data) {
            await get().fetchBackendCart();
            return { success: true, message: `Coupon ${code} applied successfully!` };
          }
        } catch (err) {
          const detail = err.response?.data?.detail || 'Invalid or expired coupon code.';
          return { success: false, message: detail };
        }
      },

      removeCoupon: async () => {
        try {
          await api.delete('/cart/coupon');
          await get().fetchBackendCart();
        } catch {
          set({ appliedCoupon: null });
        }
      },

      getTotals: () => {
        const { items, appliedCoupon, serverTotals } = get();
        const computedSubtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
        const originalTotal = items.reduce((sum, item) => sum + (Number(item.originalPrice) || Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

        const subtotal = (serverTotals && Number(serverTotals.subtotal) > 0 && Math.abs(serverTotals.subtotal - computedSubtotal) < (computedSubtotal * 0.5))
          ? serverTotals.subtotal
          : computedSubtotal;

        let couponDiscount = 0;
        if (serverTotals && typeof serverTotals.discount === 'number' && serverTotals.discount > 0) {
          couponDiscount = serverTotals.discount;
        } else if (appliedCoupon?.discount) {
          couponDiscount = Number(appliedCoupon.discount) || 0;
        } else if (appliedCoupon?.percent && subtotal > 0) {
          couponDiscount = Math.round(subtotal * (Number(appliedCoupon.percent) / 100));
        }

        const freeDeliveryThreshold = 499;
        const deliveryFee = (subtotal === 0 || subtotal >= freeDeliveryThreshold) ? 0 : 49;
        const total = Math.max(0, subtotal - couponDiscount) + deliveryFee;
        const totalSavings = Math.max(0, (originalTotal - subtotal) + couponDiscount);
        const itemCount = items.reduce((cnt, item) => cnt + (Number(item.quantity) || 1), 0);

        return {
          subtotal,
          originalTotal,
          couponDiscount,
          deliveryFee,
          total,
          totalSavings,
          itemCount
        };
      }
    }),
    { name: 'unikart-cart' }
  )
);

export function normalizeAddress(backendAddr) {
  if (!backendAddr) return null;
  return {
    id: backendAddr.id,
    name: backendAddr.recipient_name || backendAddr.name || '',
    phone: backendAddr.phone || '',
    type: backendAddr.address_type === 'billing' ? 'Office' : (backendAddr.type || 'Home'),
    addressLine: backendAddr.address_line1 || backendAddr.addressLine || '',
    address_line2: backendAddr.address_line2 || '',
    landmark: backendAddr.landmark || '',
    city: backendAddr.city || '',
    state: backendAddr.state || '',
    state_code: backendAddr.state_code || '29',
    pincode: backendAddr.postal_code || backendAddr.pincode || '',
    isDefault: Boolean(backendAddr.is_default ?? backendAddr.isDefault)
  };
}

// ---------------- WISHLIST STORE ----------------
export const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      fetchWishlist: async () => {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('unikart_token') : null;
        if (!token) return;
        try {
          set({ isLoading: true });
          const res = await api.get('/auth/wishlist');
          if (Array.isArray(res.data)) {
            set({ items: res.data });
          }
        } catch (err) {
          console.warn('Could not fetch server wishlist:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      toggleWishlist: async (product) => {
        const { items } = get();
        const exists = items.some((i) => i.id === product.id);
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('unikart_token') : null;

        // Optimistic update
        if (exists) {
          set({ items: items.filter((i) => i.id !== product.id) });
        } else {
          set({
            items: [
              ...items,
              {
                id: product.id,
                name: product.name,
                brand: product.brand,
                price: product.price,
                originalPrice: product.originalPrice,
                image: product.image,
                rating: product.rating,
                reviewCount: product.reviewCount,
                inStock: product.inStock
              }
            ]
          });
        }

        if (token) {
          try {
            await api.post('/auth/wishlist', { product_id: product.id });
          } catch (err) {
            console.error('Failed to sync wishlist with backend:', err);
          }
        }
        return !exists;
      },

      isInWishlist: (productId) => {
        return get().items.some((i) => i.id === productId);
      }
    }),
    { name: 'unikart-wishlist' }
  )
);

// ---------------- AUTH STORE (MULTI-USER SUPPORT) ----------------
const PRESEEDED_CUSTOMER_ACCOUNTS = [
  {
    id: 'cust-1',
    name: 'Rahul Sharma',
    email: 'customer@unikart.in',
    phone: '+91 98765 43210',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    memberSince: 'October 2023',
    addresses: [
      {
        id: 'addr-1',
        name: 'Rahul Sharma',
        phone: '+91 98765 43210',
        type: 'Home',
        addressLine: 'Flat 402, Prestige Lakeside Habitat, Varthur Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        isDefault: true
      },
      {
        id: 'addr-2',
        name: 'Rahul Sharma (Office)',
        phone: '+91 98765 43210',
        type: 'Office',
        addressLine: 'Level 5, Tower B, Global Tech Park, Outer Ring Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560103',
        isDefault: false
      }
    ]
  },
  {
    id: 'cust-2',
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    phone: '+91 98111 22334',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    memberSince: 'March 2024',
    addresses: [
      {
        id: 'addr-3',
        name: 'Priya Patel',
        phone: '+91 98111 22334',
        type: 'Home',
        addressLine: 'A-204, Lodha Bellissimo, Apollo Mills Compound, Mahalaxmi',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400011',
        isDefault: true
      }
    ]
  }
];

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null, // Logged out by default for real-time customer experience
      savedAddresses: [],
      token: typeof localStorage !== 'undefined' ? localStorage.getItem('unikart_token') : null,
      isAuthenticated: typeof localStorage !== 'undefined' ? !!localStorage.getItem('unikart_token') : false,
      isOAuthProcessing: false,
      setOAuthProcessing: (val) => set({ isOAuthProcessing: !!val }),

      oauthLogin: async ({ provider = 'google', email, token, full_name, phone }) => {
        const normalizedEmail = (email || '').trim().toLowerCase();
        set({ isOAuthProcessing: true });
        try {
          const res = await api.post('/auth/oauth', {
            provider,
            email: normalizedEmail,
            token,
            full_name: full_name || normalizedEmail.split('@')[0],
            phone: phone || null
          });

          const { access_token, user_id, full_name: name, roles, permissions } = res.data;
          if (typeof localStorage !== 'undefined' && access_token) {
            localStorage.setItem('unikart_token', access_token);
          }

          const loggedInUser = {
            id: user_id,
            name: name || full_name || normalizedEmail.split('@')[0],
            email: normalizedEmail,
            role: (roles && roles[0]) || 'customer',
            roles: roles || ['customer'],
            permissions: permissions || [],
            memberSince: 'Member',
            avatar: null
          };

          set({
            user: loggedInUser,
            token: access_token,
            isAuthenticated: true,
            isOAuthProcessing: false
          });

          setTimeout(() => {
            get().fetchAddresses();
            useWishlistStore.getState().fetchWishlist();
          }, 0);

          return { success: true, user: loggedInUser };
        } catch (err) {
          set({ isOAuthProcessing: false });
          const errMsg = err.response?.data?.detail || 'Google OAuth sign-in failed.';
          return { success: false, message: errMsg };
        }
      },

      // Register a new customer account securely with FastAPI backend
      register: async ({ name, email, phone, password, address = null }) => {
        const normalizedEmail = (email || '').trim().toLowerCase();
        try {
          const res = await api.post('/auth/register', {
            email: normalizedEmail,
            password,
            full_name: name.trim(),
            phone: phone.trim()
          });

          const { access_token, user_id, full_name, roles } = res.data;
          if (typeof localStorage !== 'undefined' && access_token) {
            localStorage.setItem('unikart_token', access_token);
          }

          const initialAddresses = address && address.addressLine ? [
            {
              id: `addr-${Date.now()}`,
              name: name.trim(),
              phone: phone.trim(),
              type: address.type || 'Home',
              addressLine: address.addressLine,
              city: address.city || 'Bengaluru',
              state: address.state || 'Karnataka',
              pincode: address.pincode || '560001',
              isDefault: true
            }
          ] : [];

          const newUser = {
            id: user_id,
            name: full_name || name.trim(),
            email: normalizedEmail,
            phone: phone.trim(),
            role: (roles && roles[0]) || 'customer',
            memberSince: 'Member',
            avatar: null,
            addresses: initialAddresses
          };

          set({
            user: newUser,
            savedAddresses: initialAddresses,
            token: access_token,
            isAuthenticated: true
          });

          return { success: true, user: newUser };
        } catch (err) {
          const errMsg = err.response?.data?.detail || 'Registration failed. Please check your details.';
          return { success: false, message: errMsg };
        }
      },

      // Sign In with email & password securely via FastAPI backend
      login: async (email, password, role = 'customer') => {
        const normalizedEmail = (email || '').trim().toLowerCase();
        try {
          const res = await api.post('/auth/login', {
            email: normalizedEmail,
            password
          });

          const { access_token, user_id, full_name, roles } = res.data;
          if (typeof localStorage !== 'undefined' && access_token) {
            localStorage.setItem('unikart_token', access_token);
          }

          const loggedInUser = {
            id: user_id,
            name: full_name || normalizedEmail.split('@')[0],
            email: normalizedEmail,
            role: (roles && roles[0]) || role || 'customer',
            memberSince: 'Member',
            avatar: null
          };

          set({
            user: loggedInUser,
            token: access_token,
            isAuthenticated: true
          });

          // Hydrate user addresses and wishlist from database
          setTimeout(() => {
            get().fetchAddresses();
            useWishlistStore.getState().fetchWishlist();
          }, 0);

          return { success: true, user: loggedInUser };
        } catch (err) {
          const errMsg = err.response?.data?.detail || 'Invalid email or password.';
          return { success: false, message: errMsg };
        }
      },

      logout: async () => {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('unikart_token');
            Object.keys(localStorage).forEach((key) => {
              if (key.startsWith('sb-') || key.toLowerCase().includes('supabase')) {
                localStorage.removeItem(key);
              }
            });
          }
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.clear();
          }
          if (supabase?.auth?.signOut) {
            await supabase.auth.signOut();
          }
        } catch (err) {
          console.warn('Logout signOut cleanup:', err);
        }
        set({ user: null, token: null, isAuthenticated: false, savedAddresses: [], isOAuthProcessing: false });
      },

      fetchAddresses: async () => {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('unikart_token') : null;
        if (!token) return;
        try {
          const res = await api.get('/auth/addresses');
          if (Array.isArray(res.data)) {
            const mapped = res.data.map(normalizeAddress).filter(Boolean);
            const { user } = get();
            set({
              savedAddresses: mapped,
              user: user ? { ...user, addresses: mapped } : null
            });
          }
        } catch (err) {
          console.warn('Could not fetch database addresses:', err);
        }
      },

      updateProfile: async (profileUpdates) => {
        const { user } = get();
        if (!user) return { success: false, message: 'Not signed in' };
        try {
          const res = await api.patch('/auth/profile', {
            full_name: profileUpdates.name || profileUpdates.full_name,
            phone: profileUpdates.phone
          });
          const updatedUser = {
            ...user,
            ...profileUpdates,
            name: res.data?.full_name || res.data?.name || profileUpdates.name || user.name,
            phone: res.data?.phone !== undefined ? res.data.phone : (profileUpdates.phone || user.phone)
          };
          set({ user: updatedUser });
          return { success: true, user: updatedUser };
        } catch (err) {
          console.error('Failed to update profile on backend:', err);
          // Fallback to local state if offline
          const updatedUser = { ...user, ...profileUpdates };
          set({ user: updatedUser });
          return { success: false, message: err.response?.data?.detail || 'Failed to sync with database' };
        }
      },

      addAddress: async (address) => {
        const { user, savedAddresses } = get();
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('unikart_token') : null;

        let createdAddr = null;
        if (token) {
          try {
            const payload = {
              recipient_name: address.name || address.recipient_name || '',
              phone: address.phone || '',
              address_line1: address.addressLine || address.address_line1 || '',
              address_line2: address.address_line2 || '',
              landmark: address.landmark || '',
              city: address.city || '',
              state: address.state || '',
              state_code: address.state_code || '29',
              postal_code: address.pincode || address.postal_code || '',
              address_type: (address.type || '').toLowerCase() === 'office' ? 'billing' : 'shipping',
              is_default: Boolean(address.isDefault || savedAddresses.length === 0)
            };
            const res = await api.post('/auth/addresses', payload);
            if (res.data) {
              createdAddr = normalizeAddress(res.data);
            }
          } catch (err) {
            console.error('Failed to persist address to database:', err);
          }
        }

        const newAddr = createdAddr || {
          ...address,
          id: `addr-${Date.now()}`,
          isDefault: savedAddresses.length === 0
        };

        const updatedAddresses = [...savedAddresses, newAddr];
        const updatedUser = user ? { ...user, addresses: updatedAddresses } : null;

        set({
          savedAddresses: updatedAddresses,
          user: updatedUser
        });
        return newAddr;
      },

      removeAddress: async (id) => {
        const { user, savedAddresses } = get();
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('unikart_token') : null;

        if (token && typeof id === 'number') {
          try {
            await api.delete(`/auth/addresses/${id}`);
          } catch (err) {
            console.error('Failed to delete address from database:', err);
          }
        }

        const updatedAddresses = savedAddresses.filter((a) => a.id !== id);
        const updatedUser = user ? { ...user, addresses: updatedAddresses } : null;

        set({
          savedAddresses: updatedAddresses,
          user: updatedUser
        });
      },

      setDefaultAddress: async (id) => {
        const { user, savedAddresses } = get();
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('unikart_token') : null;

        if (token && typeof id === 'number') {
          try {
            await api.patch(`/auth/addresses/${id}/default`);
          } catch (err) {
            console.error('Failed to update default address on database:', err);
          }
        }

        const updatedAddresses = savedAddresses.map((a) => ({
          ...a,
          isDefault: a.id === id
        }));
        const updatedUser = user ? { ...user, addresses: updatedAddresses } : null;

        set({
          savedAddresses: updatedAddresses,
          user: updatedUser
        });
      }
    }),
    {
      name: 'unikart-auth',
      partialize: (state) => ({
        user: state.user,
        savedAddresses: state.savedAddresses,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

// ---------------- ORDERS STORE ----------------
export const useOrderStore = create(
  persist(
    (set, get) => ({
      orders: [],

      placeOrder: (orderPayload) => {
        const orderId = orderPayload.id || orderPayload.orderNumber || `ORD-${Date.now()}`;
        const now = new Date();
        const formattedDate = `${now.getDate()} ${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        const activeUser = useAuthStore.getState().user;
        const newOrder = {
          id: orderId,
          orderNumber: orderId,
          userId: orderPayload.userId || activeUser?.id || 'guest',
          userEmail: orderPayload.userEmail || activeUser?.email || 'customer@unikart.in',
          customerName: orderPayload.shippingAddress?.recipient_name || orderPayload.shippingAddress?.name || activeUser?.name || 'Customer',
          date: formattedDate,
          items: orderPayload.items,
          totalAmount: orderPayload.totalAmount,
          paymentMethod: orderPayload.paymentMethod || 'UPI',
          paymentStatus: orderPayload.paymentStatus || (String(orderPayload.paymentMethod).toUpperCase().includes('COD') ? 'PENDING' : 'PENDING_PAYMENT'),
          shippingAddress: orderPayload.shippingAddress,
          status: 'ORDER_PLACED',
          trackingEvents: [
            { stage: 'ORDER_PLACED', label: 'Order Placed Successfully', time: formattedDate, done: true },
            { stage: 'CONFIRMED', label: 'Order Processing', time: 'Estimated in 15 mins', done: false },
            { stage: 'PACKED', label: 'Packaging & Quality Check', time: 'Pending', done: false },
            { stage: 'SHIPPED', label: 'Handover to Logistics', time: 'Pending', done: false },
            { stage: 'OUT_FOR_DELIVERY', label: 'Courier Partner Out for Delivery', time: 'Pending', done: false },
            { stage: 'DELIVERED', label: 'Package Delivery & OTP Verification', time: 'Pending', done: false }
          ],
          estimatedDelivery: '2 - 3 Business Days'
        };

        set({ orders: [newOrder, ...get().orders] });
        return newOrder;
      },

      updateOrderStatus: (orderId, newStatus) => {
        set({
          orders: get().orders.map((o) => {
            if (o.id !== orderId) return o;
            const stages = ['ORDER_PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
            const targetIdx = stages.indexOf(newStatus);
            const updatedTracking = o.trackingEvents.map((t, idx) => ({
              ...t,
              done: idx <= targetIdx,
              time: idx <= targetIdx && t.time.includes('Pending') ? 'Just now' : t.time
            }));
            return {
              ...o,
              status: newStatus,
              trackingEvents: updatedTracking
            };
          })
        });
      }
    }),
    { name: 'unikart-orders' }
  )
);

// Seller store removed - UNIKART is not a multi-vendor marketplace



// ---------------- CATALOG STORE (Authoritative Supabase & Real-Time Sync) ----------------
export function adaptBackendProduct(prod) {
  const activeVariants = (prod.variants || []).filter((v) => v.is_active !== false);
  const primaryVariant = activeVariants[0] || (prod.variants && prod.variants[0]) || null;
  const activePrice = primaryVariant?.current_price || (primaryVariant?.prices && primaryVariant.prices[0]) || null;
  const sellingPrice = activePrice
    ? Math.round(activePrice.selling_price_paise / 100)
    : (typeof prod.price === 'number' ? Math.round(prod.price) : 0);
  const mrp = activePrice
    ? Math.round(activePrice.mrp_paise / 100)
    : (typeof prod.mrp === 'number' ? Math.round(prod.mrp) : sellingPrice);
  const discount = mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;
  
  const stockOnHand = primaryVariant
    ? (primaryVariant.stock_available ?? primaryVariant.available ?? 0)
    : (prod.stock_available ?? prod.stockQuantity ?? (typeof prod.stock_quantity === 'number' ? prod.stock_quantity : 0));
  const inStock = stockOnHand > 0;
  const specs = prod.specifications || {};

  const imageList = (Array.isArray(prod.images) && prod.images.length > 0)
    ? prod.images.map((img) => (typeof img === 'string' ? img : img.url))
    : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'];

  const sku = primaryVariant?.sku || prod.slug || String(prod.id);

  const allVariants = activeVariants.map((v) => {
    const vPrice = v.current_price || (v.prices && v.prices[0]) || null;
    const vSell = vPrice ? Math.round(vPrice.selling_price_paise / 100) : sellingPrice;
    const vMrp = vPrice ? Math.round(vPrice.mrp_paise / 100) : mrp;
    const vStock = v.stock_available ?? v.available ?? 0;
    return {
      id: v.id,
      sku: v.sku,
      barcode: v.barcode,
      name: v.name,
      color: v.color || '',
      storage: v.storage || '',
      price: vSell,
      originalPrice: vMrp,
      stock: vStock,
      inStock: vStock > 0
    };
  });

  const availableColors = Array.from(new Set(allVariants.map((v) => v.color).filter(Boolean)));
  const availableSizes = Array.from(new Set(allVariants.map((v) => v.storage).filter(Boolean)));

  return {
    id: sku,
    productId: prod.id,
    sku,
    variantId: primaryVariant ? primaryVariant.id : null,
    variants: allVariants,
    name: prod.name,
    slug: prod.slug,
    description: prod.description || prod.short_description || '',
    shortDescription: prod.short_description || '',
    brand: typeof prod.brand === 'object' && prod.brand ? prod.brand.name : (prod.brand || 'Unikart'),
    category: typeof prod.category === 'object' && prod.category ? prod.category.slug : (prod.category || 'all'),
    categoryLabel: typeof prod.category === 'object' && prod.category ? prod.category.name : (prod.category || 'General'),
    price: sellingPrice,
    originalPrice: mrp,
    discount,
    isDeal: discount >= 10,
    isTrending: (prod.rating || 0) >= 4.7,
    isBestseller: (prod.review_count || 0) >= 500,
    stock: stockOnHand,
    stockQuantity: stockOnHand,
    inStock,
    rating: prod.rating || 0,
    reviewCount: prod.review_count || 0,
    image: prod.primary_image || imageList[0],
    images: imageList,
    gallery: imageList,
    colors: availableColors.length > 0 ? availableColors : (specs.colors || ['Default']),
    sizes: availableSizes.length > 0 ? availableSizes : (specs.sizes || ['Standard']),
    badge: inStock ? (discount >= 20 ? `${discount}% OFF` : 'In Stock') : 'Out of Stock'
  };
}

export const useCatalogStore = create(
  persist(
    (set, get) => ({
      products: [],
      loading: false,
      error: null,

      fetchLiveProducts: async () => {
        const hasExisting = (get().products || []).length > 0;
        if (!hasExisting) set({ loading: true });
        try {
          const res = await api.get('/products?limit=500');
          const data = res.data;
          if (Array.isArray(data)) {
            const adapted = data.map(adaptBackendProduct);
            set({ products: adapted, loading: false, error: null });
            return adapted;
          }
          throw new Error('Catalog API returned an unexpected response.');
        } catch (e) {
          console.warn('Could not fetch products from backend catalog.', e);
          set({
            products: hasExisting ? get().products : [],
            loading: false,
            error: hasExisting ? null : (e.message || 'Could not load the product catalog.')
          });
          return get().products || [];
        }
      },

      refresh: () => {
        get().fetchLiveProducts();
      }
    }),
    {
      name: 'unikart-catalog-cache',
      partialize: (state) => ({ products: state.products })
    }
  )
);

// Auto-hydrate from backend on load & real-time sync with Supabase and Inventory
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useCatalogStore.getState().fetchLiveProducts();
  }, 50);

  // Re-fetch on focus throttled to once every 2s to guarantee fresh catalog on tab return
  let lastFocusFetch = 0;
  window.addEventListener('focus', () => {
    if (Date.now() - lastFocusFetch > 2000) {
      lastFocusFetch = Date.now();
      useCatalogStore.getState().fetchLiveProducts();
    }
  });

  // 1. Supabase Realtime subscription (database-level changes)
  try {
    subscribeToCatalogChanges(() => {
      useCatalogStore.getState().fetchLiveProducts();
    });
  } catch {}

  // 2. Cross-tab BroadcastChannel fallback for instant real-time sync
  try {
    const bc = new BroadcastChannel('unikart_channel');
    bc.onmessage = (msg) => {
      if (msg.data?.type === 'CATALOG_UPDATED' || msg.data?.type === 'STOCK_UPDATED') {
        if (msg.data?.type === 'STOCK_UPDATED' && (msg.data?.productId || msg.data?.sku) && msg.data?.newStock !== undefined) {
          const { products } = useCatalogStore.getState();
          const pId = String(msg.data.productId || '');
          const pSku = String(msg.data.sku || '');
          const newQty = Number(msg.data.newStock);
          const updated = products.map((p) => {
            if (
              (pId && (String(p.productId) === pId || String(p.id) === pId)) ||
              (pSku && (String(p.sku) === pSku || String(p.id) === pSku))
            ) {
              return {
                ...p,
                stock: newQty,
                stockQuantity: newQty,
                inStock: newQty > 0,
                badge: newQty > 0 ? (p.discount >= 20 ? `${p.discount}% OFF` : 'In Stock') : 'Out of Stock'
              };
            }
            return p;
          });
          useCatalogStore.setState({ products: updated });
        }
        useCatalogStore.getState().fetchLiveProducts();
      }
    };
  } catch {}
}
