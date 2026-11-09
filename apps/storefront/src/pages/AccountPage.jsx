import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  useAuthStore,
  useOrderStore,
  useWishlistStore,
  useCartStore,
  useUIStore
} from '../store/useStore';
import {
  User,
  ArrowRight,
  Package,
  Heart,
  MapPin,
  LogOut,
  Truck,
  CheckCircle2,
  Plus,
  Trash2,
  Check,
  Mail,
  Phone,
  ShoppingBag,
  Edit2,
  X,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Clock,
  Sparkles,
  LifeBuoy
} from 'lucide-react';

export default function AccountPage({ defaultTab }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || defaultTab || (window.location.pathname.includes('/wishlist') ? 'wishlist' : 'profile');
  const navigate = useNavigate();

  const {
    user,
    logout,
    updateProfile,
    savedAddresses,
    addAddress,
    removeAddress,
    setDefaultAddress,
    fetchAddresses,
    isOAuthProcessing
  } = useAuthStore();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState({ type: '', msg: '' });

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      if (fetchAddresses) fetchAddresses();
    }
  }, [user?.id, user?.email]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setProfileFeedback({ type: 'error', msg: 'Full name cannot be empty.' });
      return;
    }
    setSavingProfile(true);
    setProfileFeedback({ type: '', msg: '' });
    const res = await updateProfile({ name: profileName.trim(), phone: profilePhone.trim() });
    setSavingProfile(false);
    if (res.success) {
      setProfileFeedback({ type: 'success', msg: 'Profile updated successfully!' });
      setIsEditingProfile(false);
      setTimeout(() => setProfileFeedback({ type: '', msg: '' }), 4000);
    } else {
      setProfileFeedback({ type: 'error', msg: res.message || 'Failed to update profile.' });
    }
  };

  const { orders } = useOrderStore();
  const userOrders = useMemo(() => {
    if (!user?.email) return [];
    return (orders || []).filter(
      (o) => o.userEmail && o.userEmail.toLowerCase() === user.email.toLowerCase()
    );
  }, [orders, user?.email]);

  const [backendOrders, setBackendOrders] = useState([]);

  // Fetch orders silently in background - NO loading screen or UI freezing
  useEffect(() => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('unikart_token') : null;
    if (!token || !user?.id) return;

    let isMounted = true;
    api
      .get('/orders')
      .then((res) => {
        if (isMounted && Array.isArray(res.data)) {
          setBackendOrders(res.data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.email]);

  const combinedOrders = useMemo(() => {
    if (backendOrders.length > 0) {
      return backendOrders.map((bo) => ({
        id: bo.order_number || `ORD-${bo.id}`,
        dbId: bo.id,
        createdAt: bo.created_at,
        date: bo.created_at
          ? new Date(bo.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })
          : 'Recently',
        status: bo.order_status || 'CONFIRMED',
        paymentStatus: bo.payment_status || 'PAID',
        totalAmount: (bo.total_amount_paise || 0) / 100,
        paymentMethod: bo.payment_method || 'Online Payment',
        shippingAddress: bo.shipping_address,
        estimatedDelivery: 'Expected in 2-4 business days',
        trackingEvents: [
          { label: 'Order Confirmed', time: 'Completed', done: true },
          { label: 'Payment Verified', time: 'Completed', done: true },
          {
            label: 'Packed at Hub',
            time: bo.order_status !== 'CONFIRMED' ? 'Completed' : 'In Progress',
            done: ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(bo.order_status)
          },
          {
            label: 'With Courier',
            time: ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(bo.order_status) ? 'Completed' : 'Pending',
            done: ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(bo.order_status)
          },
          {
            label: 'Out for Delivery',
            time: ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(bo.order_status) ? 'Completed' : 'Pending',
            done: ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(bo.order_status)
          },
          {
            label: 'Delivered',
            time: bo.order_status === 'DELIVERED' ? 'Completed' : 'Pending',
            done: bo.order_status === 'DELIVERED'
          }
        ],
        items: (bo.items || []).map((it) => ({
          id: it.variant_id,
          name: it.product_name,
          variantName: it.variant_name,
          price: (it.unit_price_paise || 0) / 100,
          quantity: it.quantity,
          sku: it.sku,
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop&q=80'
        }))
      }));
    }
    return userOrders;
  }, [backendOrders, userOrders]);

  const { items: wishlistItems, toggleWishlist } = useWishlistStore();
  const { addToCart } = useCartStore();
  const { openCartDrawer, addToast } = useUIStore();

  const [expandedTrackingId, setExpandedTrackingId] = useState(null);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [orderToCancel, setOrderToCancel] = useState(null);

  const handleCancelClick = (e, ord) => {
    e.stopPropagation();
    setOrderToCancel(ord);
  };

  const handleConfirmCancelOrder = async () => {
    if (!orderToCancel) return;
    const ord = orderToCancel;
    setOrderToCancel(null);
    setCancellingOrderId(ord.id);
    try {
      if (ord.dbId) await api.post(`/orders/${ord.dbId}/cancel`);
      addToast(`Order ${ord.id} has been cancelled.`, 'success');
      const res = await api.get('/orders');
      if (Array.isArray(res.data)) setBackendOrders(res.data);
    } catch {
      addToast('Could not cancel order. Please contact customer support.', 'error');
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Address form state
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    addressLine: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    type: 'Home'
  });

  const handleSetTab = (tab) => {
    setSearchParams({ tab });
  };

  const handleAddNewAddress = async (e) => {
    e.preventDefault();
    if (!addressForm.addressLine.trim()) return;
    await addAddress(addressForm);
    addToast('Delivery address saved successfully!', 'success');
    setIsAddingAddress(false);
    setAddressForm({
      name: user?.name || '',
      phone: user?.phone || '',
      addressLine: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      type: 'Home'
    });
  };

  if (isOAuthProcessing || (typeof window !== 'undefined' && window.location.hash.includes('access_token'))) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-3 border-red-200 border-t-[#E31837] animate-spin mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Signing in...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 bg-[#F8F9FA]">
        <div className="w-full max-w-sm text-center space-y-5 bg-white p-8 rounded-3xl border border-slate-200/90 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-red-50 text-[#E31837] mx-auto flex items-center justify-center">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-1">
              Access your orders, saved addresses, and wishlist.
            </p>
          </div>
          <div className="space-y-2">
            <Link
              to="/login?redirect=/account"
              className="w-full py-2.5 px-4 rounded-xl bg-[#E31837] hover:bg-[#C7122E] text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/register?redirect=/"
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-800 text-slate-700 font-bold text-xs transition-all block"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const defaultAddr = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 pt-4 sm:pt-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">

        {/* ================= MODEL 1: HERO ACCOUNT PASSPORT ================= */}
        <div className="bg-[#18181B] text-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
          {/* Subtle brand glow accent */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-tr from-[#E31837] to-rose-500 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shrink-0 shadow-lg shadow-red-900/30">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {user?.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Customer
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium">
                  {user?.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      {user.email}
                    </span>
                  )}
                  {user?.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      {user.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center">
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================= MODEL 2: STUDIO DUAL-PANEL LAYOUT ================= */}
        {/* Mobile Interactive Tab Strip (< lg) */}
        <div className="lg:hidden flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'orders', label: 'Orders', icon: Package, count: combinedOrders.length },
            { id: 'addresses', label: 'Addresses', icon: MapPin, count: savedAddresses.length },
            { id: 'wishlist', label: 'Wishlist', icon: Heart, count: wishlistItems.length }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSetTab(item.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#E31837] text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Interactive Navigation Strip (4 Cols, hidden on < lg) */}
          <aside className="hidden lg:block lg:col-span-4 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-3 shadow-xs space-y-1.5">
              {[
                { id: 'profile', label: 'Profile Details', icon: User, desc: 'Name, phone & credentials' },
                { id: 'orders', label: 'My Orders & Tracking', icon: Package, count: combinedOrders.length, desc: 'Real-time logistics & dispatch' },
                { id: 'addresses', label: 'Saved Addresses', icon: MapPin, count: savedAddresses.length, desc: 'Delivery locations & hubs' },
                { id: 'wishlist', label: 'Saved Wishlist', icon: Heart, count: wishlistItems.length, desc: 'Products saved for later' }
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSetTab(item.id)}
                    className={`w-full text-left p-3.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-[#E31837] text-white shadow-md shadow-red-500/20'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">{item.label}</div>
                        <div
                          className={`text-[10px] mt-0.5 ${
                            isActive ? 'text-white/80' : 'text-slate-400'
                          }`}
                        >
                          {item.desc}
                        </div>
                      </div>
                    </div>

                    {item.count !== undefined && item.count > 0 && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Customer Care Pill */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3 text-xs">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <LifeBuoy className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900">Need Help?</div>
                <div className="text-[11px] text-slate-500">24/7 dedicated customer assistance</div>
              </div>
            </div>
          </aside>

          {/* Right Column: Active Workspace Panel (8 Cols) */}
          <main className="lg:col-span-8">
            
            {/* ================= SECTION: PERSONAL PROFILE ================= */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs min-h-[360px] flex flex-col justify-between h-auto transition-all">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
                    <p className="text-xs text-slate-500">
                      Manage your official customer identity and contact info
                    </p>
                  </div>
                  {!isEditingProfile && (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#E31837] bg-red-50 hover:bg-red-100 border border-red-200/80 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>
                  )}
                </div>

                {profileFeedback.msg && (
                  <div
                    className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 ${
                      profileFeedback.type === 'error'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <span>{profileFeedback.msg}</span>
                    <button onClick={() => setProfileFeedback({ type: '', msg: '' })}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {isEditingProfile ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Full Legal Name *</label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          required
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E31837]"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
                        <input
                          type="tel"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E31837] font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Email (Account ID)</label>
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#E31837] hover:bg-[#C7122E] transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {savingProfile ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfileName(user?.name || '');
                          setProfilePhone(user?.phone || '');
                        }}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="divide-y divide-slate-100 text-xs">
                      <div className="py-3.5 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Full Name</span>
                        <span className="font-semibold text-slate-900">{user?.name}</span>
                      </div>

                      <div className="py-3.5 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Primary Email</span>
                        <span className="font-semibold text-slate-900">{user?.email}</span>
                      </div>

                      <div className="py-3.5 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Mobile Phone</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          {user?.phone || 'Not added'}
                        </span>
                      </div>

                      <div className="py-3.5 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Account Status</span>
                        <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active &bull; Verified Customer
                        </span>
                      </div>

                      <div className="py-3.5 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Default Delivery</span>
                        <span className="font-semibold text-slate-900 text-right">
                          {defaultAddr ? `${defaultAddr.city}, ${defaultAddr.state} (${defaultAddr.pincode})` : 'None configured'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================= SECTION: MY ORDERS & TRACKING ================= */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs min-h-[360px] flex flex-col h-auto transition-all">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-2">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Orders &amp; Live Tracking</h2>
                      <p className="text-xs text-slate-500">
                        View shipment checkpoints and order status
                      </p>
                    </div>
                    <Link
                      to="/catalog"
                      className="text-xs font-bold text-[#E31837] hover:underline flex items-center gap-1"
                    >
                      <span>Continue Shopping</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Instant rendering - ZERO delay or loading lock */}
                  {combinedOrders.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-3">
                      <div className="w-12 h-12 bg-red-50 text-[#E31837] rounded-full flex items-center justify-center mx-auto">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800">No orders placed yet</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        When you purchase items on UNIKART, you can track real-time logistics and dispatch here.
                      </p>
                      <div className="pt-1">
                        <Link
                          to="/catalog"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E31837] hover:bg-[#C7122E] text-white text-xs font-bold transition-all shadow-xs"
                        >
                          <span>Explore Marketplace</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {combinedOrders.map((ord) => {
                        const isTrackingOpen = expandedTrackingId === ord.id;
                        const canCancel = !['DELIVERED', 'CANCELLED'].includes(ord.status);
                        return (
                          <div
                            key={ord.id}
                            className="rounded-2xl border border-slate-200 p-5 space-y-4 transition-all hover:border-slate-300"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900">{ord.id}</span>
                                <span className="text-slate-400">&bull;</span>
                                <span className="text-slate-500">{ord.date}</span>
                                <span
                                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                    ord.status === 'DELIVERED'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : ord.status === 'CANCELLED'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                                  }`}
                                >
                                  {ord.status.replace(/_/g, ' ')}
                                </span>
                              </div>

                              <div className="text-sm font-bold text-slate-900">
                                ₹{ord.totalAmount?.toLocaleString('en-IN')}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-3 overflow-x-auto py-1">
                                {ord.items?.map((it, idx) => (
                                  <img
                                    key={idx}
                                    src={it.image}
                                    alt=""
                                    className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                                  />
                                ))}
                                <div>
                                  <div className="text-xs font-semibold text-slate-800 line-clamp-1">
                                    {ord.items[0]?.name}
                                  </div>
                                  {ord.items.length > 1 && (
                                    <div className="text-[11px] text-slate-400">
                                      +{ord.items.length - 1} more items
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedTrackingId(isTrackingOpen ? null : ord.id)
                                  }
                                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-800 text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <span>{isTrackingOpen ? 'Hide Tracking' : 'Track Order'}</span>
                                  {isTrackingOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>

                                {canCancel && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleCancelClick(e, ord)}
                                    disabled={cancellingOrderId === ord.id}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    {cancellingOrderId === ord.id ? 'Cancelling...' : 'Cancel'}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Expandable Logistics Tracking Timeline */}
                            {isTrackingOpen && (
                              <div className="pt-4 border-t border-slate-100 space-y-3 animate-fadeIn">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-900">Shipment Timeline</span>
                                  <span className="text-emerald-700 font-semibold">{ord.estimatedDelivery}</span>
                                </div>

                                <div className="space-y-3 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                                  {ord.trackingEvents?.map((ev, idx) => (
                                    <div key={idx} className="relative flex items-center gap-3">
                                      <div
                                        className={`absolute -left-6 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                          ev.done
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-200 text-slate-400'
                                        }`}
                                      >
                                        {ev.done ? <Check className="w-2.5 h-2.5" /> : idx + 1}
                                      </div>
                                      <div className="text-xs">
                                        <span className={ev.done ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                                          {ev.label}
                                        </span>
                                        <span className="text-[11px] text-slate-400 ml-2">({ev.time})</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================= SECTION: SAVED ADDRESSES ================= */}
            {activeTab === 'addresses' && (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs min-h-[360px] flex flex-col h-auto transition-all">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Delivery Addresses</h2>
                    <p className="text-xs text-slate-500">Manage multiple home and office locations</p>
                  </div>

                  {!isAddingAddress && (
                    <button
                      onClick={() => setIsAddingAddress(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#E31837] hover:bg-[#C7122E] text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Address</span>
                    </button>
                  )}
                </div>

                {isAddingAddress && (
                  <form onSubmit={handleAddNewAddress} className="p-5 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">New Address Details</h4>
                      <button
                        type="button"
                        onClick={() => setIsAddingAddress(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <input
                        type="text"
                        required
                        placeholder="Recipient Full Name"
                        value={addressForm.name}
                        onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-300"
                      />
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="10-digit Phone Number"
                        value={addressForm.phone}
                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono"
                      />
                    </div>

                    <input
                      type="text"
                      required
                      placeholder="Street Address / Flat / Building / Landmark"
                      value={addressForm.addressLine}
                      onChange={(e) => setAddressForm({ ...addressForm, addressLine: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <input
                        type="text"
                        required
                        placeholder="City"
                        value={addressForm.city}
                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-300"
                      />
                      <input
                        type="text"
                        required
                        placeholder="State"
                        value={addressForm.state}
                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-300"
                      />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="6-digit PIN code"
                        value={addressForm.pincode}
                        onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-[#E31837] text-white text-xs font-bold"
                      >
                        Save Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingAddress(false)}
                        className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {savedAddresses.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-2">
                    <div className="w-11 h-11 rounded-full bg-slate-50 text-slate-400 mx-auto flex items-center justify-center border border-slate-100">
                      <MapPin className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="font-semibold text-slate-700 text-sm">No saved addresses</div>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Add delivery addresses to speed up future checkouts.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {savedAddresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="p-5 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                              {addr.type || 'Home'}
                            </span>
                            {addr.isDefault && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-bold text-slate-900">{addr.name}</div>
                          <div className="text-xs text-slate-600 mt-1">{addr.addressLine}</div>
                          <div className="text-xs text-slate-600">
                            {addr.city}, {addr.state} - {addr.pincode}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-1">{addr.phone}</div>
                        </div>

                        <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-xs">
                          {!addr.isDefault && (
                            <button
                              onClick={() => setDefaultAddress(addr.id)}
                              className="text-[#E31837] font-semibold hover:underline cursor-pointer"
                            >
                              Set as Default
                            </button>
                          )}
                          <button
                            onClick={() => removeAddress(addr.id)}
                            className="text-rose-600 font-semibold hover:underline ml-auto cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ================= SECTION: SAVED WISHLIST ================= */}
            {activeTab === 'wishlist' && (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs min-h-[360px] flex flex-col h-auto transition-all">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Saved Wishlist</h2>
                    <p className="text-xs text-slate-500">
                      {wishlistItems.length} items saved for future purchase
                    </p>
                  </div>
                  {wishlistItems.length > 0 && (
                    <Link to="/catalog" className="text-xs font-bold text-[#E31837] hover:underline">
                      Explore More &rarr;
                    </Link>
                  )}
                </div>

                {wishlistItems.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
                    {wishlistItems.map((prod) => (
                      <div
                        key={prod.id}
                        className="p-3 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-2 relative group"
                      >
                        <button
                          onClick={() => toggleWishlist(prod)}
                          className="absolute top-2.5 right-2.5 p-1 rounded-full bg-white/90 text-rose-600 shadow-xs hover:scale-110 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full aspect-square object-cover rounded-xl border border-slate-100"
                        />

                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            {prod.brand}
                          </div>
                          <Link
                            to={`/product/${prod.id}`}
                            className="text-xs font-semibold text-slate-900 hover:text-[#E31837] line-clamp-1"
                          >
                            {prod.name}
                          </Link>
                          <div className="text-xs font-bold text-slate-900 mt-1">
                            ₹{prod.price?.toLocaleString('en-IN')}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            addToCart(prod, 1);
                            addToast(`${prod.name} added to cart!`, 'success');
                            openCartDrawer();
                          }}
                          className="w-full py-2 rounded-xl bg-[#E31837] hover:bg-[#C7122E] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                        >
                          Move to Cart
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-3">
                    <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                      <Heart className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">Your wishlist is empty</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Save items you love to your wishlist and revisit them anytime.
                    </p>
                    <div className="pt-1">
                      <Link
                        to="/catalog"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E31837] hover:bg-[#C7122E] text-white text-xs font-bold transition-all shadow-xs"
                      >
                        <span>Explore Catalog</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

      </div>

      {/* Sleek Custom Order Cancellation Modal (no browser alert) */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleIn">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Cancel Order {orderToCancel.id}?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to cancel this order? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelOrder}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#E31837] hover:bg-[#C7122E] transition-all cursor-pointer shadow-xs"
              >
                Yes, Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
