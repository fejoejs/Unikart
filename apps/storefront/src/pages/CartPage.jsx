import { NO_IMAGE_PLACEHOLDER } from "../data/appConfig";
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore, useWishlistStore, useUIStore } from '../store/useStore';
import { COUPONS } from '../data/appConfig';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Heart,
  ArrowRight,
  ShieldCheck,
  Truck,
  Tag,
  CheckCircle2,
  X,
  ArrowLeft
} from 'lucide-react';

export default function CartPage() {
  const navigate = useNavigate();
  const {
    items,
    removeFromCart,
    updateQuantity,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    getTotals
  } = useCartStore();
  const { toggleWishlist } = useWishlistStore();
  const { addToast } = useUIStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  const {
    subtotal,
    originalTotal,
    couponDiscount,
    deliveryFee,
    total,
    totalSavings,
    itemCount
  } = getTotals();

  const freeDeliveryThreshold = 2000;
  const remainingForFree = Math.max(0, freeDeliveryThreshold - subtotal);
  const progressPercent = Math.min(100, (subtotal / freeDeliveryThreshold) * 100);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    try {
      const res = await applyCoupon(couponInput.trim().toUpperCase());
      if (res && res.success) {
        addToast(res.message, 'success');
        setCouponError('');
        setCouponInput('');
      } else {
        const msg = res?.message || 'Invalid coupon code.';
        setCouponError(msg);
        addToast(msg, 'error');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to apply coupon.';
      setCouponError(msg);
      addToast(msg, 'error');
    }
  };

  const handleMoveToWishlist = (item) => {
    toggleWishlist(item);
    removeFromCart(item.itemKey || item.id);
    addToast(`${item.name} moved to Wishlist!`, 'info');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] py-6 sm:py-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Header Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#222222] tracking-tight">
              Shopping Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
            </h1>
            <p className="text-xs text-[#777777]">
              Review your selected marketplace products before proceeding to secure checkout
            </p>
          </div>
          <Link
            to="/catalog"
            className="text-xs font-bold text-[#E31837] hover:underline flex items-center gap-1.5 self-start"
          >
            <ArrowLeft className="w-4 h-4" /> Continue Shopping
          </Link>
        </div>

        {items.length === 0 ? (
          /* Empty Cart State */
          <div className="bg-white rounded-xl border border-[#E8E8E8] p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-50 text-[#E31837] flex items-center justify-center mx-auto">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#222222]">Your Cart is Empty</h2>
              <p className="text-xs text-[#777777]">
                You haven't added any items to your cart yet. Explore our latest flagship releases!
              </p>
            </div>
            <Link
              to="/catalog"
              className="inline-block px-6 py-2.5 rounded-lg bg-[#E31837] hover:bg-[#C7122E] text-white text-xs font-bold shadow-sm transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Cart Items List */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* Free Delivery Banner */}
              <div className="bg-white rounded-xl border border-[#E8E8E8] p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="flex items-center gap-1.5 text-gray-800">
                    <Truck className="w-4 h-4 text-[#E31837]" />
                    {remainingForFree === 0 ? (
                      <span className="text-emerald-700 font-bold">You unlocked FREE Delivery!</span>
                    ) : (
                      <span>
                        Add <strong className="text-[#E31837]">₹{remainingForFree.toLocaleString('en-IN')}</strong> more for{' '}
                        <strong>FREE Delivery</strong>
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-bold text-[#E31837]">{Math.round(progressPercent)}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E31837] transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Items Card */}
              <div className="bg-white rounded-xl border border-[#E8E8E8] shadow-xs divide-y divide-[#F0F0F0] overflow-hidden">
                {items.map((item) => (
                  <div key={item.itemKey || item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
                    {/* Item Image */}
                    <img
                      src={item.image || NO_IMAGE_PLACEHOLDER}
                      onError={(e) => { e.currentTarget.src = NO_IMAGE_PLACEHOLDER; }}
                      alt={item.name}
                      className="w-24 h-24 object-contain p-2 rounded-lg border border-gray-100 bg-white shrink-0 self-center sm:self-start"
                    />

                    {/* Item Details */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {item.brand}
                        </span>
                        <span className="text-base font-black text-[#E31837]">
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[#222222] truncate">
                        <Link to={`/product/${item.id}`} className="hover:text-[#E31837] transition-colors">
                          {item.name}
                        </Link>
                      </h3>

                      <div className="text-xs text-gray-500 flex items-center gap-3">
                        {item.color && <span>Color: <strong>{item.color}</strong></span>}
                        {item.size && <span>Spec: <strong>{item.size}</strong></span>}
                        <span className="text-gray-400">Unit: ₹{item.price.toLocaleString('en-IN')}</span>
                      </div>

                      {/* Stepper & Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                          <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.itemKey || item.id, item.quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-black cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-[#222222]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.itemKey || item.id, item.quantity + 1)}
                              className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-black cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleMoveToWishlist(item)}
                            className="text-xs text-gray-500 hover:text-[#E31837] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Heart className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Move to </span>Wishlist
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.itemKey || item.id)}
                          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Order Summary & Coupon */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Coupon Code Input */}
              <div className="bg-white rounded-xl border border-[#E8E8E8] p-4 sm:p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#222222] flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#E31837]" /> Apply Promo Voucher
                </h3>

                {appliedCoupon ? (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-800">Coupon "{appliedCoupon.code}" Applied</p>
                      <p className="text-[11px] text-emerald-600">Saved ₹{couponDiscount.toLocaleString('en-IN')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-xs text-red-500 font-bold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="e.g. UNIKART10"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-[#E31837]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#252525] hover:bg-[#1C1C1C] text-white text-xs font-bold shrink-0 transition-colors"
                    >
                      Apply
                    </button>
                  </form>
                )}

                {couponError && <p className="text-[11px] text-red-600 font-semibold">{couponError}</p>}

                {/* Available Coupons list */}
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Available Offers:
                  </span>
                  <div className="space-y-1.5 mt-1.5">
                    {(Array.isArray(COUPONS) ? COUPONS : Object.values(COUPONS)).map((c) => (
                      <div
                        key={c.code}
                        onClick={async () => {
                          const res = await applyCoupon(c.code);
                          if (res && res.success) {
                            addToast(`Applied coupon ${c.code}!`, 'success');
                          } else {
                            addToast(res?.error || `Could not apply coupon ${c.code}.`, 'error');
                          }
                        }}
                        className="p-2 rounded-md bg-gray-50 hover:bg-[#FDF2F4] border border-dashed border-gray-300 hover:border-[#E31837] cursor-pointer text-xs flex justify-between items-center transition-colors"
                      >
                        <span className="font-mono font-bold text-[#E31837]">{c.code}</span>
                        <span className="text-[11px] text-gray-600">{c.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Summary Box */}
              <div className="bg-white rounded-xl border border-[#E8E8E8] p-4 sm:p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#222222] pb-3 border-b border-[#F0F0F0]">
                  Order Summary
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Items Subtotal ({itemCount})</span>
                    <span className="font-semibold text-gray-900">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>

                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Coupon Discount</span>
                      <span>-₹{couponDiscount.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-600">
                    <span>Standard Delivery</span>
                    <span>
                      {deliveryFee === 0 ? (
                        <span className="text-emerald-600 font-bold uppercase text-[11px]">Free</span>
                      ) : (
                        `₹${deliveryFee}`
                      )}
                    </span>
                  </div>

                  {totalSavings > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold pt-1 border-t border-gray-100">
                      <span>Total Savings on MRP</span>
                      <span>₹{totalSavings.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-base font-black text-[#222222] pt-3 border-t border-gray-200">
                    <span>Final Payable</span>
                    <span className="text-xl text-[#E31837] font-black">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/checkout')}
                  className="w-full py-3 px-4 rounded-xl bg-[#E31837] hover:bg-[#C7122E] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>256-Bit SSL Encrypted Payment Gateway</span>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
