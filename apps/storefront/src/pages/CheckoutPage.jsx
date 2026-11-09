import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import {
  useCartStore,
  useAuthStore,
  useOrderStore,
  useUIStore,
  useLocationStore,
  useCatalogStore
} from '../store/useStore';
import {
  Check,
  ShieldCheck,
  MapPin,
  Truck,
  CreditCard,
  QrCode,
  Building,
  Banknote,
  ArrowRight,
  ArrowLeft,
  Lock,
  Plus,
  Home,
  Briefcase,
  User,
  ShoppingBag
} from 'lucide-react';

const STATE_GST_CODES = {
  'JAMMU AND KASHMIR': '01',
  'HIMACHAL PRADESH': '02',
  'PUNJAB': '03',
  'CHANDIGARH': '04',
  'UTTARAKHAND': '05',
  'HARYANA': '06',
  'DELHI': '07',
  'RAJASTHAN': '08',
  'UTTAR PRADESH': '09',
  'BIHAR': '10',
  'SIKKIM': '11',
  'ARUNACHAL PRADESH': '12',
  'NAGALAND': '13',
  'MANIPUR': '14',
  'MIZORAM': '15',
  'TRIPURA': '16',
  'MEGHALAYA': '17',
  'ASSAM': '18',
  'WEST BENGAL': '19',
  'JHARKHAND': '20',
  'ODISHA': '21',
  'CHATTISGARH': '22',
  'MADHYA PRADESH': '23',
  'GUJARAT': '24',
  'DAMAN AND DIU': '25',
  'DADRA AND NAGAR HAVELI': '26',
  'MAHARASHTRA': '27',
  'ANDHRA PRADESH': '28',
  'KARNATAKA': '29',
  'GOA': '30',
  'LAKSHADWEEP': '31',
  'KERALA': '32',
  'TAMIL NADU': '33',
  'PUDUCHERRY': '34',
  'ANDAMAN AND NICOBAR ISLANDS': '35',
  'TELANGANA': '36',
  'ANDHRA PRADESH (NEW)': '37',
  'LADAKH': '38'
};

const resolveStateCode = (stateName) => {
  if (!stateName) return '29';
  const clean = stateName.trim().toUpperCase();
  return STATE_GST_CODES[clean] || '29';
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, getTotals, clearCart, appliedCoupon } = useCartStore();
  const { savedAddresses, addAddress, user, isAuthenticated } = useAuthStore();
  const { placeOrder } = useOrderStore();
  const { addToast } = useUIStore();
  const { pincode: defaultPincode, city: defaultCity, state: defaultState } = useLocationStore();
  const { products: catalogProducts } = useCatalogStore();

  const { subtotal, couponDiscount, total, totalSavings, itemCount } = getTotals();

  // 4 Steps: 1. Address, 2. Delivery, 3. Payment, 4. Review
  const [currentStep, setCurrentStep] = useState(1);

  // Authoritative Idempotency Key & Backend Quote (Durable across retries)
  const [checkoutIdempotencyKey] = useState(() => {
    try {
      const existing = sessionStorage.getItem('unikart_checkout_idempotency_key');
      if (existing) return existing;
      const newKey = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('unikart_checkout_idempotency_key', newKey);
      return newKey;
    } catch {
      return `chk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
  });
  const [backendQuote, setBackendQuote] = useState(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);

  // Step 1: Address State
  const [selectedAddressId, setSelectedAddressId] = useState(
    savedAddresses[0]?.id || 'new'
  );
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(savedAddresses.length === 0);
  const [newAddressForm, setNewAddressForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    addressLine: '',
    city: defaultCity || 'Bengaluru',
    state: defaultState || 'Karnataka',
    pincode: defaultPincode || '560001',
    type: 'Home'
  });

  // Step 2: Delivery Speed State
  const [deliveryOption, setDeliveryOption] = useState('standard'); // 'standard' (Free) | 'express' (₹99)

  // Step 3: Payment Method State
  const [paymentMethod, setPaymentMethod] = useState('cod'); // 'cod' (Active) | 'upi' | 'card' (Gateway Upgrade)
  const [upiId, setUpiId] = useState('');
  const [cardForm, setCardForm] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: ''
  });
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);


  // Address helper
  const selectedAddress =
    savedAddresses.find((a) => a.id === selectedAddressId) || newAddressForm;

  // Authoritative Backend Quote synchronization
  useEffect(() => {
    let isMounted = true;
    const fetchQuote = async () => {
      if (!items || items.length === 0) return;
      const backendItems = [];
      for (const it of items) {
        let vId = typeof it.variantId === 'number' ? it.variantId : parseInt(it.variantId, 10);
        if (isNaN(vId) || vId <= 0) {
          const catProd = (catalogProducts || []).find(
            (p) => String(p.id) === String(it.id) || String(p.productId) === String(it.id)
          );
          if (catProd && catProd.variantId) {
            vId = catProd.variantId;
          } else if (catProd && Array.isArray(catProd.variants) && catProd.variants.length > 0) {
            vId = catProd.variants[0].id;
          }
        }
        const qty = parseInt(it.quantity, 10);
        if (vId > 0 && qty > 0) {
          backendItems.push({ variant_id: vId, quantity: qty });
        }
      }

      if (backendItems.length === 0) return;

      const stateName = selectedAddress?.state || defaultState || 'Karnataka';
      setIsQuoteLoading(true);
      try {
        const res = await api.post('/checkout/quote', {
          items: backendItems,
          shipping_address: {
            recipient_name: selectedAddress?.name || user?.name || 'Customer',
            phone: selectedAddress?.phone || user?.phone || '+919876543210',
            address_line1: selectedAddress?.addressLine || 'Main Street, Flat 402',
            city: selectedAddress?.city || defaultCity || 'Bengaluru',
            state: stateName,
            state_code: resolveStateCode(stateName),
            postal_code: selectedAddress?.pincode || defaultPincode || '560001'
          },
          coupon_code: appliedCoupon?.code || null,
          delivery_option: deliveryOption
        });
        if (isMounted && res.data) {
          setBackendQuote(res.data);
        }
      } catch (err) {
        console.warn('Backend checkout quote calculation fallback:', err);
      } finally {
        if (isMounted) setIsQuoteLoading(false);
      }
    };

    fetchQuote();
    return () => {
      isMounted = false;
    };
  }, [items, selectedAddress?.state, selectedAddress?.pincode, appliedCoupon?.code, catalogProducts, deliveryOption]);

  const validateAddress = (addr) => {
    if (!addr) return { valid: false, message: 'Please provide complete delivery details.' };
    if (!addr.name || addr.name.trim().length < 2) {
      return { valid: false, message: 'Please enter recipient full name.' };
    }
    const cleanPhone = (addr.phone || '').trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      return { valid: false, message: 'Please enter a valid 10-digit Indian mobile number.' };
    }
    if (!addr.addressLine || addr.addressLine.trim().length < 5) {
      return { valid: false, message: 'Please enter street address / flat details (min 5 chars).' };
    }
    if (!addr.city || addr.city.trim().length < 2) {
      return { valid: false, message: 'Please specify the delivery city.' };
    }
    if (!addr.state || addr.state.trim().length < 2) {
      return { valid: false, message: 'Please specify the delivery state.' };
    }
    const cleanPin = (addr.pincode || '').trim().replace(/\D/g, '');
    if (!cleanPin || cleanPin.length !== 6) {
      return { valid: false, message: 'Please enter a valid 6-digit Indian PIN code.' };
    }
    return { valid: true, cleanPhone, cleanPin };
  };

  const handleAddNewAddressSubmit = (e) => {
    e.preventDefault();
    const check = validateAddress(newAddressForm);
    if (!check.valid) {
      addToast(check.message, 'error');
      return;
    }
    addAddress({ ...newAddressForm, phone: check.cleanPhone, pincode: check.cleanPin });
    addToast('Delivery address saved successfully!', 'success');
    setIsAddingNewAddress(false);
  };

  const handleProceedToDelivery = () => {
    const addrToValidate = isAddingNewAddress || savedAddresses.length === 0 ? newAddressForm : selectedAddress;
    const check = validateAddress(addrToValidate);
    if (!check.valid) {
      addToast(check.message, 'error');
      setIsAddingNewAddress(true);
      return;
    }
    if (isAddingNewAddress || savedAddresses.length === 0) {
      addAddress({ ...newAddressForm, phone: check.cleanPhone, pincode: check.cleanPin });
      setIsAddingNewAddress(false);
    }
    setCurrentStep(2);
  };

  const displaySubtotal = backendQuote ? backendQuote.subtotal_paise / 100 : subtotal;
  const displayDiscount = backendQuote ? backendQuote.discount_paise / 100 : couponDiscount;
  const finalDeliveryFee = backendQuote ? backendQuote.shipping_fee_paise / 100 : (deliveryOption === 'express' ? 99 : (subtotal < 2000 ? 150 : 0));
  const finalPayableTotal = backendQuote
    ? backendQuote.total_amount_paise / 100
    : (total + (deliveryOption === 'express' ? 99 : 0));
  const displayTax = backendQuote?.tax ? backendQuote.tax.total_tax_paise / 100 : 0;

  const handlePlaceOrder = async () => {
    if (!isAuthenticated || !user) {
      addToast('Please sign in or register to place your order.', 'error');
      navigate('/login?redirect=/checkout');
      return;
    }
    const addrCheck = validateAddress(selectedAddress);
    if (!addrCheck.valid) {
      addToast(addrCheck.message, 'error');
      setCurrentStep(1);
      setIsAddingNewAddress(true);
      return;
    }

    setIsProcessing(true);

    try {
      // Map items to backend schema with variant validation
      const backendItems = [];
      for (const it of items) {
        let vId = typeof it.variantId === 'number' ? it.variantId : parseInt(it.variantId, 10);
        if (isNaN(vId) || vId <= 0) {
          // Look up variant from catalog store
          const catProd = (catalogProducts || []).find((p) => String(p.id) === String(it.id) || String(p.productId) === String(it.id));
          if (catProd && catProd.variantId) {
            vId = catProd.variantId;
          } else if (catProd && Array.isArray(catProd.variants) && catProd.variants.length > 0) {
            vId = catProd.variants[0].id;
          }
        }
        if (isNaN(vId) || vId <= 0) {
          addToast(`Item "${it.name || 'Unknown'}" does not have a valid variant. Please re-add it from the catalog.`, 'error');
          setIsProcessing(false);
          return;
        }
        const qty = parseInt(it.quantity, 10);
        if (isNaN(qty) || qty <= 0) {
          addToast(`Invalid quantity for item "${it.name}".`, 'error');
          setIsProcessing(false);
          return;
        }
        backendItems.push({
          variant_id: vId,
          quantity: qty
        });
      }

      if (backendItems.length === 0) {
        addToast('Your cart has no valid items to order.', 'error');
        setIsProcessing(false);
        return;
      }

      if (backendQuote && backendQuote.can_proceed === false) {
        addToast(
          backendQuote.validation_messages?.join('. ') ||
            'Cannot place order: items in your cart failed server-side price/stock verification.',
          'error'
        );
        setIsProcessing(false);
        return;
      }

      const normalizedPayment =
        paymentMethod === 'cod' ? 'COD' :
        paymentMethod === 'card' ? 'CARD' :
        paymentMethod === 'netbanking' ? 'NET_BANKING' : 'UPI';

      const stateName = selectedAddress?.state || defaultState || 'Karnataka';
      const guestToken = localStorage.getItem('unikart_session_token') || null;
      const orderPayload = {
        session_token: guestToken,
        items: backendItems,
        shipping_address: {
          recipient_name: selectedAddress.name.trim(),
          phone: addrCheck.cleanPhone,
          address_line1: selectedAddress.addressLine.trim(),
          city: selectedAddress.city.trim(),
          state: stateName,
          state_code: resolveStateCode(stateName),
          postal_code: addrCheck.cleanPin
        },
        delivery_option: deliveryOption,
        payment_method: normalizedPayment,
        coupon_code: appliedCoupon?.code || null,
        idempotency_key: checkoutIdempotencyKey,
        notes: `Delivery speed: ${deliveryOption}`
      };

      // Authoritative call to FastAPI backend
      const response = await api.post('/checkout/order', orderPayload);
      if (!response.data || !response.data.order_number) {
        throw new Error('Order creation failed on server: No confirmation received.');
      }
      const placedOrderData = response.data;
      const placedOrderId = placedOrderData.order_number;

      // Record in client order history
      const clientOrder = placeOrder({
        id: placedOrderId,
        orderNumber: placedOrderId,
        items,
        userId: user?.id || 'guest',
        userEmail: user?.email || selectedAddress?.email || 'customer@unikart.in',
        totalAmount: finalPayableTotal,
        paymentStatus: placedOrderData.payment_status || (normalizedPayment === 'COD' ? 'PENDING' : 'PENDING'),
        orderStatus: placedOrderData.order_status || (normalizedPayment === 'COD' ? 'CONFIRMED' : 'PENDING_PAYMENT'),
        paymentMethod:
          paymentMethod === 'upi'
            ? `UPI (${upiId || 'PhonePe / GPay QR'})`
            : paymentMethod === 'card'
            ? 'Credit/Debit Card (Visa/Mastercard)'
            : paymentMethod === 'netbanking'
            ? `Net Banking (${selectedBank})`
            : 'Cash on Delivery',
        shippingAddress: selectedAddress
      });

      // Synchronize latest stock levels from Supabase
      useCatalogStore.getState().fetchLiveProducts();

      // Clear durable checkout idempotency key & backend cart
      try {
        sessionStorage.removeItem('unikart_checkout_idempotency_key');
      } catch {}
      api.delete('/cart').catch(() => {});

      clearCart();
      setIsProcessing(false);
      setOrderCompleted(true);
      addToast(`Order ${placedOrderId} placed successfully!`, 'success');
      navigate(`/order-confirmation/${placedOrderId}`);
    } catch (err) {
      console.error('Checkout failed:', err);
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        'Order placement failed. Please verify your items or payment details and try again.';
      addToast(errorMsg, 'error');
      setIsProcessing(false);
    }
  };

  const steps = [
    { num: 1, label: 'Delivery Address' },
    { num: 2, label: 'Delivery Speed' },
    { num: 3, label: 'Payment Method' },
    { num: 4, label: 'Review & Place Order' }
  ];

  if (items.length === 0 && !orderCompleted && !isProcessing) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-card border border-[#E8E8E8] p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-red-50 text-[#E31837] rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-slate-800">Your Cart is Empty</h2>
          <p className="text-xs text-slate-500">
            You don't have any items in your checkout session. Add products from the marketplace to proceed.
          </p>
          <div className="pt-2">
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#E31837] hover:bg-[#C7122E] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <span>Explore Products</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !orderCompleted) {
    return (
      <div className="min-h-[70vh] bg-[#F5F5F5] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-card border border-gray-200 p-8 text-center space-y-5 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-red-50 text-[#E31837] mx-auto flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Sign In Required to Place Order</h2>
            <p className="text-xs text-gray-500">
              Please sign in or create an account to proceed with checkout, link orders to your profile, and access order tracking and cancellations.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <Link
              to="/login?redirect=/checkout"
              className="w-full py-2.5 px-4 rounded-xl bg-[#E31837] hover:bg-[#C7122E] text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Sign In to Continue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/register?redirect=/checkout"
              className="w-full py-2.5 px-4 rounded-xl border border-gray-300 hover:border-gray-900 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs transition-all block cursor-pointer"
            >
              Create New Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16">
      {/* 1. Header with Security Badge */}
      <div className="bg-[#252525] text-white py-4 px-4 sm:px-6 shadow-md">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E31837] text-white font-black flex items-center justify-center text-lg shadow-sm">
              U
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              UNI<span className="text-[#E31837]">KART</span>{' '}
              <span className="text-gray-400 font-normal text-xs uppercase tracking-widest pl-1">Secure Checkout</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-gray-300 font-semibold">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">256-Bit SSL Encrypted</span>
          </div>
        </div>
      </div>

      {/* 2. Step Progress Bar */}
      <div className="bg-white border-b border-[#E8E8E8] py-4 px-4 shadow-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          {steps.map((s, idx) => (
            <React.Fragment key={s.num}>
              <div
                onClick={() => {
                  if (s.num < currentStep) setCurrentStep(s.num);
                }}
                className={`flex items-center gap-2 cursor-pointer ${
                  currentStep >= s.num ? 'text-[#222222]' : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                    currentStep > s.num
                      ? 'bg-emerald-600 text-white'
                      : currentStep === s.num
                      ? 'bg-[#E31837] text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {currentStep > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-xs ${currentStep === s.num ? 'inline font-bold text-[#E31837]' : 'hidden sm:inline font-medium'}`}>
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 sm:mx-4 transition-colors ${
                    currentStep > s.num ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 3. Main Checkout Container */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Active Step Details */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* STEP 1: Address Selection */}
            {currentStep === 1 && (
              <div className="bg-white rounded-xl border border-[#E8E8E8] p-5 sm:p-6 shadow-xs space-y-5 animate-fadeIn">
                {!isAuthenticated && (
                  <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-amber-700 shrink-0" />
                      <span className="text-xs text-amber-900 font-medium">
                        Returning customer? <strong>Sign in</strong> or <strong>create an account</strong> to use saved addresses and fast checkout.
                      </span>
                    </div>
                    <Link
                      to="/login?redirect=/checkout"
                      className="px-3 py-1.5 bg-[#252525] hover:bg-black text-white text-xs font-bold rounded-lg text-center transition-colors shrink-0"
                    >
                      Sign In / Register
                    </Link>
                  </div>
                )}

                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
                  <h2 className="text-base font-bold text-[#222222] flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#E31837]" />
                    <span>Select Delivery Address</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewAddress(!isAddingNewAddress)}
                    className="text-xs font-bold text-[#E31837] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isAddingNewAddress ? 'Cancel' : 'Add New Address'}
                  </button>
                </div>

                {!isAddingNewAddress ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {savedAddresses.map((addr) => (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          selectedAddressId === addr.id
                            ? 'border-[#E31837] bg-[#FDF2F4]/50 shadow-xs'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900">{addr.name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                              {addr.type || 'Home'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{addr.addressLine}</p>
                          <p className="text-xs text-gray-600 font-medium">{addr.city}, {addr.state} - {addr.pincode}</p>
                          <p className="text-xs text-gray-500 pt-1">Phone: {addr.phone}</p>
                        </div>

                        <div className="pt-3 flex items-center justify-end">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            selectedAddressId === addr.id ? 'border-[#E31837] bg-[#E31837]' : 'border-gray-300'
                          }`}>
                            {selectedAddressId === addr.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <form onSubmit={handleAddNewAddressSubmit} className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                        <input
                          type="text"
                          required
                          value={newAddressForm.name}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, name: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#E31837]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Phone</label>
                        <input
                          type="tel"
                          required
                          value={newAddressForm.phone}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, phone: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#E31837]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Flat / Building / Street Address</label>
                      <input
                        type="text"
                        required
                        value={newAddressForm.addressLine}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, addressLine: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#E31837]"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                        <input
                          type="text"
                          required
                          value={newAddressForm.city}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, city: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#E31837]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">State</label>
                        <input
                          type="text"
                          required
                          value={newAddressForm.state}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, state: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#E31837]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Postal Code</label>
                        <input
                          type="text"
                          maxLength={6}
                          required
                          value={newAddressForm.pincode}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, pincode: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E31837]"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="mt-2 px-5 py-2.5 rounded-lg bg-[#E31837] text-white text-xs font-bold hover:bg-[#C7122E] shadow-sm"
                    >
                      Save and Use Address
                    </button>
                  </form>
                )}

                <div className="pt-4 border-t border-[#F0F0F0] flex justify-end">
                  <button
                    type="button"
                    onClick={handleProceedToDelivery}
                    className="py-2.5 px-6 rounded-lg bg-[#E31837] hover:bg-[#C7122E] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <span>Continue to Delivery Speed</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Delivery Speed */}
            {currentStep === 2 && (
              <div className="bg-white rounded-xl border border-[#E8E8E8] p-5 sm:p-6 shadow-xs space-y-5 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
                  <h2 className="text-base font-bold text-[#222222] flex items-center gap-2">
                    <Truck className="w-5 h-5 text-[#E31837]" />
                    <span>Choose Delivery Speed</span>
                  </h2>
                  <span className="text-xs text-gray-500 font-medium">Delivering to {selectedAddress?.city || 'Your Location'}</span>
                </div>

                <div className="space-y-3">
                  <label
                    onClick={() => setDeliveryOption('standard')}
                    className={`p-4 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                      deliveryOption === 'standard'
                        ? 'border-[#E31837] bg-[#FDF2F4]/50 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">Standard Delivery</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">Free</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">Estimated delivery: Tomorrow by 2:00 PM</p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      deliveryOption === 'standard' ? 'border-[#E31837] bg-[#E31837]' : 'border-gray-300'
                    }`}>
                      {deliveryOption === 'standard' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </label>

                  <label
                    onClick={() => setDeliveryOption('express')}
                    className={`p-4 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                      deliveryOption === 'express'
                        ? 'border-[#E31837] bg-[#FDF2F4]/50 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-50 text-[#E31837] flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">Hyper-Express (2-Hour Dispatch)</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-[#E31837]">₹99</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">Guaranteed same-day priority dispatch with dedicated courier</p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      deliveryOption === 'express' ? 'border-[#E31837] bg-[#E31837]' : 'border-gray-300'
                    }`}>
                      {deliveryOption === 'express' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </label>
                </div>

                <div className="pt-4 border-t border-[#F0F0F0] flex justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 text-xs font-bold"
                  >
                    Back to Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="py-2.5 px-6 rounded-lg bg-[#E31837] hover:bg-[#C7122E] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <span>Continue to Payment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Payment Method */}
            {currentStep === 3 && (
              <div className="bg-white rounded-xl border border-[#E8E8E8] p-5 sm:p-6 shadow-xs space-y-5 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
                  <h2 className="text-base font-bold text-[#222222] flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#E31837]" />
                    <span>Select Payment Option</span>
                  </h2>
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> PCI-DSS Level 1 Safe
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Cash on Delivery (Primary Active Method) */}
                  <label
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-4 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                      paymentMethod === 'cod' ? 'border-[#E31837] bg-[#FDF2F4]/50 shadow-xs ring-1 ring-[#E31837]' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                        <Banknote className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">Cash on Delivery (Pay on Arrival)</span>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Recommended</span>
                        </div>
                        <p className="text-[11px] text-gray-500">Pay cash or scan QR using UPI to the courier agent upon doorstep delivery</p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      paymentMethod === 'cod' ? 'border-[#E31837] bg-[#E31837]' : 'border-gray-300'
                    }`}>
                      {paymentMethod === 'cod' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </label>

                  {/* UPI QR Option - Gateway Upgrade Notice */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/80 opacity-60 cursor-not-allowed">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <QrCode className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-700">UPI Instant (GPay / PhonePe / Paytm)</span>
                            <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Paused for Gateway Maintenance</span>
                          </div>
                          <p className="text-[11px] text-gray-400">Direct online UPI payments will resume once gateway provider sync completes</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">Offline</span>
                    </div>
                  </div>

                  {/* Credit / Debit Card - Gateway Upgrade Notice */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/80 opacity-60 cursor-not-allowed">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-700">Credit / Debit Card (Visa, RuPay, Mastercard)</span>
                            <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Paused for Gateway Maintenance</span>
                          </div>
                          <p className="text-[11px] text-gray-400">Direct card payments will resume once gateway provider sync completes</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">Offline</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#F0F0F0] flex justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 text-xs font-bold"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="py-2.5 px-6 rounded-lg bg-[#E31837] hover:bg-[#C7122E] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <span>Review Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Review and Place Order */}
            {currentStep === 4 && (
              <div className="bg-white rounded-xl border border-[#E8E8E8] p-5 sm:p-6 shadow-xs space-y-5 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
                  <h2 className="text-base font-bold text-[#222222]">Review &amp; Confirm Order</h2>
                  <span className="text-xs text-gray-500">{itemCount} items</span>
                </div>

                {/* Summary Info Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200">
                    <span className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Delivering To</span>
                    <p className="font-bold text-gray-900">{selectedAddress?.name} ({selectedAddress?.phone})</p>
                    <p className="text-gray-600 mt-0.5">{selectedAddress?.addressLine}, {selectedAddress?.city}, {selectedAddress?.pincode}</p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200">
                    <span className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Payment &amp; Speed</span>
                    <p className="font-bold text-gray-900 capitalize">{paymentMethod === 'cod' ? 'Cash on Delivery (Pay on Arrival)' : (paymentMethod === 'upi' ? 'UPI QR Payment' : paymentMethod)}</p>
                    <p className="text-gray-600 mt-0.5">{deliveryOption === 'express' ? 'Hyper-Express (Same Day)' : 'Standard Delivery (Tomorrow)'}</p>
                  </div>
                </div>

                {/* Cart Items list */}
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                  {items.map((item) => (
                    <div key={item.itemKey || item.id} className="p-3 flex items-center justify-between text-xs bg-white">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={item.image} alt="" className="w-10 h-10 object-contain p-1 border rounded bg-white shrink-0" />
                        <div className="truncate">
                          <p className="font-bold text-gray-800 truncate">{item.name}</p>
                          <p className="text-[11px] text-gray-400">Qty: {item.quantity} &bull; {item.color}</p>
                        </div>
                      </div>
                      <span className="font-bold text-[#E31837] shrink-0 pl-2">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-[#F0F0F0] flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 text-xs font-bold"
                  >
                    Back to Payment
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handlePlaceOrder}
                    className="py-3 px-8 rounded-xl bg-[#E31837] hover:bg-[#C7122E] disabled:opacity-50 text-white font-black text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    {isProcessing ? 'Authorizing Payment...' : `Place Order • ₹${finalPayableTotal.toLocaleString('en-IN')}`}
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Sticky Order Summary */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-[#E8E8E8] p-5 shadow-xs space-y-4 sticky top-28">
            <h3 className="text-sm font-bold text-[#222222] pb-3 border-b border-[#F0F0F0]">
              Summary ({itemCount} {itemCount === 1 ? 'item' : 'items'})
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Items Subtotal</span>
                <span className="font-semibold text-gray-900">₹{displaySubtotal.toLocaleString('en-IN')}</span>
              </div>

              {displayDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Coupon Discount</span>
                  <span>-₹{displayDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-600">
                <span>Delivery Charges</span>
                <span>
                  {finalDeliveryFee === 0 ? (
                    <span className="text-emerald-600 font-bold uppercase text-[11px]">Free</span>
                  ) : (
                    `₹${finalDeliveryFee}`
                  )}
                </span>
              </div>

              {displayTax > 0 && (
                <div className="flex justify-between text-gray-500 text-[11px]">
                  <span>GST (Included)</span>
                  <span>₹{displayTax.toLocaleString('en-IN')}</span>
                </div>
              )}

              {totalSavings > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold pt-1 border-t border-gray-100">
                  <span>Total Savings</span>
                  <span>₹{totalSavings.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-black text-[#222222] pt-3 border-t border-gray-200">
                <span>Total Payable</span>
                <span className="text-xl text-[#E31837] font-black">₹{finalPayableTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-1.5 text-[11px] text-gray-600">
              <div className="flex items-center gap-1.5 font-bold text-gray-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>UNIKART Buyer Guarantee</span>
              </div>
              <p>Every purchase comes with 100% genuine brand warranty and 7-day hassle-free replacement.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
