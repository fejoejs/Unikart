import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOrderStore } from '../store/useStore';
import api from '../lib/api';
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  ArrowRight,
  Download,
  MapPin,
  Calendar,
  CreditCard,
  ShoppingCart
} from 'lucide-react';

export default function OrderConfirmationPage() {
  const { id } = useParams();
  const { orders } = useOrderStore();

  const storeOrder = orders.find((o) => o.id === id || o.orderNumber === id || o.order_number === id) || (id ? null : orders[0]);
  const [liveOrder, setLiveOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (id) {
      setLoading(true);
      api.get(`/orders/track/${encodeURIComponent(id)}`)
        .then((res) => {
          if (isMounted && res.data) {
            setLiveOrder(res.data);
          }
        })
        .catch((err) => {
          console.warn('Could not fetch live order details for confirmation:', err);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [id]);

  const order = storeOrder || (liveOrder ? {
    id: liveOrder.order_number,
    orderNumber: liveOrder.order_number,
    totalAmount: liveOrder.total_amount_paise ? liveOrder.total_amount_paise / 100 : 0,
    paymentMethod: liveOrder.payment_method || 'Online Payment',
    paymentStatus: liveOrder.payment_status || 'PENDING',
    orderStatus: liveOrder.order_status || 'PENDING_PAYMENT',
    shippingAddress: {
      name: 'Valued Customer',
      addressLine: `Shipping to ${liveOrder.shipping_city || 'City'}`,
      city: liveOrder.shipping_city,
      pincode: liveOrder.shipping_pincode || ''
    },
    items: liveOrder.items?.map((it) => ({
      name: it.product_name,
      quantity: it.quantity,
      price: (it.unit_price_paise || 0) / 100,
      image: it.image_url || '/placeholder.png'
    })) || []
  } : null);

  const paymentStatus = liveOrder?.payment_status || order?.paymentStatus || 'PENDING';
  const isPaid = paymentStatus === 'PAID';
  const isCOD = (order?.paymentMethod || '').toLowerCase().includes('cash') || (order?.paymentMethod || '').toLowerCase().includes('cod');

  return (
    <div className="min-h-screen bg-[#F5F5F5] py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Success Banner */}
        <div className="bg-white rounded-xl border border-[#E8E8E8] p-8 text-center shadow-xs space-y-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-xs ${
            isPaid ? 'bg-emerald-100 text-emerald-600' : isCOD ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
          }`}>
            {isPaid ? <CheckCircle2 className="w-10 h-10" /> : <Clock className="w-10 h-10" />}
          </div>

          <div className="space-y-1">
            <span className={`text-xs font-bold uppercase tracking-widest ${
              isPaid ? 'text-emerald-600' : isCOD ? 'text-blue-600' : 'text-amber-600'
            }`}>
              {isPaid
                ? 'Payment Confirmed • Order Received'
                : isCOD
                ? 'Order Placed • Cash on Delivery'
                : 'Order Received • Payment Pending Authorization'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#222222] tracking-tight">
              {isPaid ? 'Thank You for Your Order!' : isCOD ? 'Order Confirmed!' : 'Order Placed Successfully'}
            </h1>
            <p className="text-xs text-gray-500">
              {isPaid
                ? 'We have dispatched your invoice & tracking updates to your registered phone & email.'
                : isCOD
                ? 'Please keep the exact amount ready upon delivery to our courier partner.'
                : 'Your order is placed. Status will update automatically once payment clears.'}
            </p>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 inline-block font-mono text-sm">
            <span className="text-gray-500">Order Reference: </span>
            <strong className="text-[#E31837] text-base">{order?.id || id}</strong>
          </div>
        </div>

        {/* Order Details Card */}
        {order && (
          <div className="bg-white rounded-xl border border-[#E8E8E8] p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-[#222222]">Order Summary</h3>
              <span className="text-xs font-bold text-[#E31837]">
                Total: ₹{(order.totalAmount || 0).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Items List */}
            {order.items && order.items.length > 0 && (
              <div className="divide-y divide-gray-100">
                {order.items.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <img src={item.image || '/placeholder.png'} alt="" className="w-12 h-12 object-contain p-1 border rounded bg-white" />
                      <div>
                        <p className="font-bold text-gray-800">{item.name}</p>
                        <p className="text-[11px] text-gray-500">Qty: {item.quantity}{item.brand ? ` • ${item.brand}` : ''}</p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900">
                      ₹{((item.price || 0) * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Delivery & Payment details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-gray-500 uppercase text-[10px]">Shipping To:</span>
                <p className="font-bold text-gray-900">{order.shippingAddress?.name || 'Customer'}</p>
                <p className="text-gray-600">
                  {order.shippingAddress?.addressLine}
                  {order.shippingAddress?.city ? `, ${order.shippingAddress.city}` : ''}
                  {order.shippingAddress?.pincode ? ` - ${order.shippingAddress.pincode}` : ''}
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-gray-500 uppercase text-[10px]">Payment Method:</span>
                <p className="font-bold text-gray-900">{order.paymentMethod}</p>
                <p className={`font-semibold ${
                  isPaid ? 'text-emerald-600' : isCOD ? 'text-blue-600' : 'text-amber-600'
                }`}>
                  {isPaid
                    ? 'Payment Status: Authorized • 100% Verified'
                    : isCOD
                    ? 'Payment Status: Cash on Delivery (Pay upon Arrival)'
                    : 'Payment Status: Pending Authorization'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Link
                to="/catalog"
                className="w-full sm:w-auto px-6 py-2 rounded-lg bg-[#E31837] hover:bg-[#C7122E] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Continue Shopping</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
