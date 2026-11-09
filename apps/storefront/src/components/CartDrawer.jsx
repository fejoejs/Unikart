import { NO_IMAGE_PLACEHOLDER } from "../data/appConfig";
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore, useUIStore } from '../store/useStore';
import { X, ShoppingCart, Plus, Minus, Trash2, ArrowRight, Truck, ShieldCheck } from 'lucide-react';

export default function CartDrawer() {
  const { isCartDrawerOpen, closeCartDrawer } = useUIStore();
  const { items, removeFromCart, updateQuantity, getTotals } = useCartStore();
  const navigate = useNavigate();

  if (!isCartDrawerOpen) return null;

  const { subtotal, total, deliveryFee, totalSavings, itemCount } = getTotals();
  const freeDeliveryThreshold = 499;
  const remainingForFree = Math.max(0, freeDeliveryThreshold - subtotal);
  const progressPercent = Math.min(100, (subtotal / freeDeliveryThreshold) * 100);

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn">
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={closeCartDrawer} />

      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col relative z-10 animate-slideLeft">
        {/* Header */}
        <div className="p-4 px-5 bg-[#252525] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#E31837] flex items-center justify-center text-white">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Shopping Cart</h3>
              <p className="text-[11px] text-gray-400">{itemCount} {itemCount === 1 ? 'item' : 'items'} added</p>
            </div>
          </div>
          <button
            onClick={closeCartDrawer}
            className="p-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Delivery Meter */}
        <div className="p-3 bg-[#FDF2F4] border-b border-red-100">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
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
            <span className="text-[11px] text-gray-500 font-bold">{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full h-1.5 bg-red-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E31837] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-100">
          {items.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
                <ShoppingCart className="w-8 h-8 text-[#E31837]" />
              </div>
              <h4 className="text-base font-bold text-gray-800 mb-1">Your cart is empty</h4>
              <p className="text-xs text-gray-500 mb-6">
                Explore smartphones, ANC audio, 4K TVs, and smart appliances.
              </p>
              <button
                onClick={() => {
                  closeCartDrawer();
                  navigate('/catalog');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#E31837] text-white text-xs font-bold hover:bg-[#C7122E] transition-all shadow-sm"
              >
                Start Shopping Now
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.itemKey || item.id} className="pt-3 first:pt-0 flex gap-3">
                <img
                  src={item.image || NO_IMAGE_PLACEHOLDER}
                  onError={(e) => { e.currentTarget.src = NO_IMAGE_PLACEHOLDER; }}
                  alt={item.name}
                  className="w-16 h-16 object-contain p-1 rounded-xl border border-gray-200 bg-white shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {item.brand}
                  </div>
                  <h4 className="text-xs font-bold text-[#222222] truncate">{item.name}</h4>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {item.color} {item.size ? `• ${item.size}` : ''}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center border border-gray-200 rounded-md bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.itemKey || item.id, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-black"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold text-[#222222]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.itemKey || item.id, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-black"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.itemKey || item.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-[#E31837]">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Summary & Checkout CTA */}
        {items.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3 pb-safe">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span>
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-600 font-bold uppercase text-[11px]">Free</span>
                  ) : (
                    `₹${deliveryFee}`
                  )}
                </span>
              </div>
              {totalSavings > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold text-[11px]">
                  <span>Total Savings</span>
                  <span>-₹{totalSavings.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-[#222222] pt-2 border-t border-gray-200">
                <span>Total Amount</span>
                <span className="text-[#E31837] text-base font-black">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  closeCartDrawer();
                  navigate('/cart');
                }}
                className="py-2.5 rounded-xl border border-gray-300 hover:border-gray-400 bg-white text-gray-800 text-xs font-bold transition-all text-center"
              >
                View Full Cart
              </button>
              <button
                type="button"
                onClick={() => {
                  closeCartDrawer();
                  navigate('/checkout');
                }}
                className="py-2.5 rounded-xl bg-[#E31837] hover:bg-[#C7122E] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-all"
              >
                <span>Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Verified Secure Transactions</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
