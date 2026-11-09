import React, { useEffect } from 'react';
import { useCatalogStore, useCartStore, useAuthStore } from './store/useStore';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './services/supabase';

// Navigation & Layout Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MobileBottomNav from './components/MobileBottomNav';

// Global Overlays & Modals
import CartDrawer from './components/CartDrawer';
import LocationModal from './components/LocationModal';
import SearchModal from './components/SearchModal';
import QuickViewModal from './components/QuickViewModal';
import ToastContainer from './components/ToastContainer';

// Pages
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import AccountPage from './pages/AccountPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TrackOrderPage from './pages/TrackOrderPage';
import ComparePage from './pages/ComparePage';
import NotFoundPage from './components/ui/NotFoundPage';

function RedirectToInventory({ defaultPath }) {
  useEffect(() => {
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const targetBase = isLocalhost ? 'http://localhost:5177' : (import.meta.env?.VITE_INVENTORY_URL || 'https://unikart-inventory.vercel.app');
    const path = window.location.pathname.length > 1 ? window.location.pathname : defaultPath;
    window.location.replace(`${targetBase}${path}${window.location.search}`);
  }, [defaultPath]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
      <h2 className="text-lg font-bold text-slate-800">Redirecting to UNIKART Business Suite...</h2>
      <p className="text-xs text-slate-500 mt-1">Opening Admin Governance &amp; Inventory Workspace</p>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Listen to real-time inventory updates and initialize backend cart
  useEffect(() => {
    // Initial fetch of authoritative server-side cart
    useCartStore.getState().fetchBackendCart();

    const handleSync = () => {
      useCatalogStore.getState().refresh();
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('unikart_catalog_updated', handleSync);

    let bc;
    try {
      bc = new BroadcastChannel('unikart_channel');
      bc.onmessage = (e) => {
        if (e.data?.type === 'CATALOG_UPDATED' || e.data?.type === 'STOCK_UPDATED') {
          handleSync();
        }
      };
    } catch {}

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('unikart_catalog_updated', handleSync);
      if (bc) bc.close();
    };
  }, []);

    // Synchronize Supabase OAuth session (Google Sign-In) ONLY on explicit OAuth callback
  useEffect(() => {
    if (!supabase) return;

    const hasOAuthHash = typeof window !== 'undefined' && window.location.hash.includes('access_token');
    const hasOAuthCode = typeof window !== 'undefined' && window.location.search.includes('code=');
    const isOAuthCallback = hasOAuthHash || hasOAuthCode;

    // Do NOT auto-login from cached sessions if user has signed out or is visiting login/register normally
    if (!isOAuthCallback) {
      const authState = useAuthStore.getState();
      if (!authState.isAuthenticated) {
        supabase.auth.signOut().catch(() => {});
      }
      return;
    }

    const processSession = async (session) => {
      if (!session?.user) return;
      const u = session.user;
      const email = u.email;
      if (!email) return;

      const name = u.user_metadata?.full_name || u.user_metadata?.name || email.split('@')[0];
      const authState = useAuthStore.getState();

      if (!authState.isAuthenticated || authState.user?.email !== email) {
        authState.setOAuthProcessing?.(true);
        const result = await authState.oauthLogin({
          provider: 'google',
          email,
          token: session.access_token,
          full_name: name,
          phone: u.phone || null
        });

        // Clean up hash fragment (e.g. #access_token=...) once parsed
        if (window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        // If on login or register, forward to target redirect or home
        if (result?.success) {
          const currentPath = window.location.pathname;
          if (currentPath === '/login' || currentPath === '/register') {
            const params = new URLSearchParams(window.location.search);
            const rawTarget = params.get('redirect');
            const target = (rawTarget && rawTarget !== '/account') ? rawTarget : '/';
            navigate(target, { replace: true });
          }
        }
      }
    };

    // Check session only during active OAuth callback
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        processSession(session);
      }
    }).catch(err => console.warn('Supabase getSession error:', err));

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        await processSession(session);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };  }, [navigate]);

  // Determine if on checkout or auth page
  const isCheckout = location.pathname.startsWith('/checkout');
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const hideFooter = isCheckout || isAuthPage;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#172033] font-sans antialiased selection:bg-red-100 selection:text-red-900">
      {/* 1. Global Navigation (Consumer marketplace routes) */}
      <Navbar />

      {/* 2. Main Page View Routing */}
      <main className="flex-1 flex flex-col">
        <Routes>
          {/* Consumer Marketplace Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/category/:category" element={<CatalogPage />} />
          <Route path="/deals" element={<CatalogPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmation/:id" element={<OrderConfirmationPage />} />
          <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmationPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/*" element={<AccountPage />} />
          <Route path="/wishlist" element={<AccountPage defaultTab="wishlist" />} />
          <Route path="/track-order" element={<TrackOrderPage />} />
          <Route path="/track-order/:trackingNumber" element={<TrackOrderPage />} />
          <Route path="/compare" element={<ComparePage />} />

          {/* Authentication */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Cross-Application Redirection to Admin & Inventory Portal */}
          <Route path="/admin" element={<RedirectToInventory defaultPath="/admin/overview" />} />
          <Route path="/admin/*" element={<RedirectToInventory defaultPath="/admin/overview" />} />
          <Route path="/inventory" element={<RedirectToInventory defaultPath="/inventory/dashboard" />} />
          <Route path="/inventory/*" element={<RedirectToInventory defaultPath="/inventory/dashboard" />} />

          {/* Fallback to Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {/* 3. Global Footer */}
      {!hideFooter && <Footer />}

      {/* 4. Mobile Bottom Sticky Navigation */}
      {!hideFooter && <MobileBottomNav />}

      {/* 5. Global Interactive Overlays */}
      <CartDrawer />
      <LocationModal />
      <SearchModal />
      <QuickViewModal />
      <ToastContainer />
    </div>
  );
}
