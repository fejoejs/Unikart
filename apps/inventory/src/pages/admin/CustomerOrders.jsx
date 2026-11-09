import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  Package,
  Layers,
  ArrowRight,
  Eye,
  X,
  Truck,
  Check,
  CreditCard
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { supabase } from '../../services/supabase';

export function CustomerOrdersReservationsPage() {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'reservations', 'returns'
  const [orders, setOrders] = useState(() => {
    try {
      const cached = localStorage.getItem('unikart_orders_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [reservations, setReservations] = useState(() => {
    try {
      const cached = localStorage.getItem('unikart_reservations_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('unikart_orders_cache');
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return true;
    }
  });
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [statusFeedback, setStatusFeedback] = useState('');

  const loadData = async () => {
    if (orders.length === 0) {
      setLoading(true);
    }
    try {
      const [orderRes, resRes, retRes] = await Promise.all([
        apiClient.get('/orders').catch(() => null),
        apiClient.get('/admin/inventory/reservations').catch(() => null),
        apiClient.get('/admin/rma/claims').catch(() => null)
      ]);

      if (orderRes && Array.isArray(orderRes.data)) {
        setOrders(orderRes.data);
        try {
          localStorage.setItem('unikart_orders_cache', JSON.stringify(orderRes.data));
        } catch {}
      }
      if (resRes && Array.isArray(resRes.data?.reservations)) {
        setReservations(resRes.data.reservations);
        try {
          localStorage.setItem('unikart_reservations_cache', JSON.stringify(resRes.data.reservations));
        } catch {}
      }
      if (retRes && Array.isArray(retRes.data)) {
        setReturns(retRes.data);
      }
    } catch (err) {
      console.error('Failed to load orders/reservations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // 1. SSE Real-Time Listener
    const sseBase = import.meta.env.VITE_API_BASE_URL || "/api/v1";
    let es;
    try {
      es = new EventSource(`${sseBase}/realtime/events`);
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.event === "order_created" || payload.event === "order_placed" || payload.event === "order_updated" || payload.event === "payment_updated") {
            loadData();
          }
        } catch (_) {}
      };
    } catch (_) {}

    // 2. Supabase Realtime (if configured)
    let channel;
    if (supabase) {
      try {
        channel = supabase
          .channel('orders_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
            loadData();
          })
          .subscribe();
      } catch (_) {}
    }

    // 3. BroadcastChannel cross-tab listener
    let bc;
    try {
      bc = new BroadcastChannel('unikart_channel');
      bc.onmessage = (e) => {
        if (e.data?.type === 'ORDER_PLACED' || e.data?.type === 'ORDER_UPDATED') {
          loadData();
        }
      };
    } catch (_) {}

    return () => {
      if (es) es.close();
      if (channel && supabase) {
        try { supabase.removeChannel(channel); } catch (_) {}
      }
      if (bc) bc.close();
    };
  }, []);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    setStatusFeedback('');

    const fulfilmentMapping = {
      'CONFIRMED': 'UNFULFILLED',
      'PROCESSING': 'PROCESSING',
      'SHIPPED': 'SHIPPED',
      'DELIVERED': 'DELIVERED',
      'CANCELLED': 'CANCELLED'
    };

    const targetFulfilment = fulfilmentMapping[newStatus] || newStatus;

    // Instant optimistic update in 0ms!
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, order_status: newStatus, status: newStatus, fulfilment_status: targetFulfilment }
          : o
      )
    );

    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => ({
        ...prev,
        order_status: newStatus,
        status: newStatus,
        fulfilment_status: targetFulfilment
      }));
    }

    setStatusFeedback(`Order status updated to "${newStatus}".`);
    setTimeout(() => setStatusFeedback(''), 4000);

    try {
      await apiClient.patch(`/orders/${orderId}/status`, {
        order_status: newStatus,
        fulfilment_status: targetFulfilment
      });
    } catch (err) {
      setStatusFeedback(err.response?.data?.detail || 'Failed to update order status.');
      loadData();
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const st = (o.status || o.order_status || '').toLowerCase();
    const orderNum = (o.order_number || '').toLowerCase();
    const recipient = typeof o.shipping_address === 'object' && o.shipping_address?.recipient_name
      ? o.shipping_address.recipient_name.toLowerCase()
      : '';
    return orderNum.includes(q) || st.includes(q) || recipient.includes(q);
  });

  const formatAddress = (addr) => {
    if (!addr) return 'Storefront Pickup';
    if (typeof addr === 'string') return addr;
    const parts = [
      addr.recipient_name,
      addr.address_line1,
      addr.city,
      addr.state,
      addr.postal_code || addr.pincode
    ].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
              E-Commerce Storefront Synchronization
            </span>
            <span className="text-xs font-mono text-slate-400">
              Live Order Stream ({orders.length} Total)
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Customer Orders &amp; Fulfillment
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time customer orders placed on storefront with stock reservation locks and live delivery fulfillment.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Status Feedback */}
      {statusFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
          <span>{statusFeedback}</span>
          <button onClick={() => setStatusFeedback('')} className="text-xs hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'orders'
              ? 'border-[#E8173D] text-[#E8173D]'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          Customer Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('reservations')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'reservations'
              ? 'border-[#E8173D] text-[#E8173D]'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          Stock Reservations ({reservations.length})
        </button>
        <button
          onClick={() => setActiveTab('returns')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'returns'
              ? 'border-[#E8173D] text-[#E8173D]'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          Returns &amp; Refunds ({returns.length})
        </button>
      </div>

      {/* Search Input for orders */}
      {activeTab === 'orders' && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID, customer name, status..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
          />
        </div>
      )}

      {/* Tab 1: Orders Table */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          {filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-5 py-3.5">Order Number</th>
                    <th className="px-4 py-3.5">Customer &amp; Shipping</th>
                    <th className="px-4 py-3.5">Items</th>
                    <th className="px-4 py-3.5 text-center">Total Amount</th>
                    <th className="px-4 py-3.5 text-center">Fulfillment Status</th>
                    <th className="px-4 py-3.5 text-center">Payment</th>
                    <th className="px-4 py-3.5 text-center">Update Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredOrders.map((o) => {
                    const currentStatus = o.order_status || o.status || 'CONFIRMED';
                    return (
                      <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3 font-mono font-bold text-slate-900 dark:text-white">
                          <div>{o.order_number || `ORD-${o.id}`}</div>
                          <div className="text-[10px] text-slate-400 font-sans font-normal">
                            {o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Recent'}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {typeof o.shipping_address === 'object' && o.shipping_address?.recipient_name
                              ? o.shipping_address.recipient_name
                              : 'Registered Customer'}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs" title={formatAddress(o.shipping_address)}>
                            {formatAddress(o.shipping_address)}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {o.items?.length || o.items_count || (o.order_items ? o.order_items.length : 1)} product(s)
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-white font-mono">
                          ₹{Number((o.total_amount_paise ? o.total_amount_paise / 100 : o.total_amount) || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              currentStatus === 'CANCELLED'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                : currentStatus === 'DELIVERED'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : currentStatus === 'SHIPPED' || currentStatus === 'PROCESSING'
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {currentStatus}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              o.payment_status === 'PAID'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {o.payment_status || 'PAID'}
                          </span>
                        </td>

                        {/* Status Quick Changer Dropdown */}
                        <td className="px-4 py-3 text-center">
                          <select
                            value={currentStatus}
                            disabled={updatingOrderId === o.id}
                            onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                            className="px-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none"
                          >
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="PROCESSING">Processing</option>
                            <option value="SHIPPED">Shipped</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </td>

                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="View Full Order Details & Items"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No Orders Found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Orders placed by customers on storefront will appear here with live inventory synchronization.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Stock Reservations */}
      {activeTab === 'reservations' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-300">
            <strong>Stock Reservation Lock:</strong> Units reserved for active checkout processing or confirmed customer orders cannot be sold twice. Stock is automatically deducted when fulfilled or released upon cancellation.
          </div>

          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            {reservations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-5 py-3.5">Hold ID</th>
                    <th className="px-4 py-3.5">Product Item</th>
                    <th className="px-4 py-3.5 text-center">Reserved Units</th>
                    <th className="px-4 py-3.5 text-center">On-Hand Total</th>
                    <th className="px-4 py-3.5 text-center">Free Available</th>
                    <th className="px-4 py-3.5">Reservation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reservations.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-mono font-bold text-slate-400">{r.id}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 dark:text-white block">{r.product_name}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {r.reserved_units} units locked
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-600 dark:text-slate-300">
                        {r.on_hand}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {r.available}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No Active Stock Reservations</p>
                <p className="text-[11px] text-slate-400 mt-0.5">All physical on-hand inventory is currently free and available for sale.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Returns & Refunds */}
      {activeTab === 'returns' && (
        <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          {returns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5">RMA / Return ID</th>
                  <th className="px-4 py-3.5">Issue &amp; Reason</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Date Claimed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-mono font-bold text-slate-900 dark:text-white">
                      {ret.rma_number || `RMA-${ret.id}`}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {ret.issue_description || 'Customer Return'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                        {ret.status || 'PENDING'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-[11px] text-slate-400">
                      {ret.claimed_at ? new Date(ret.claimed_at).toLocaleDateString() : 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <RotateCcw className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No Return Claims</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Customer replacement and refund requests will appear here for physical inventory disposition.</p>
            </div>
          )}
        </div>
      )}

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">
                  E-Commerce Order Details
                </span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedOrder.order_number || `ORD-${selectedOrder.id}`}
                </h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Payable</span>
                <span className="text-base font-black text-slate-900 dark:text-white mt-0.5 block font-mono">
                  ₹{Number((selectedOrder.total_amount_paise ? selectedOrder.total_amount_paise / 100 : selectedOrder.total_amount) || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Fulfillment</span>
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 mt-1 block uppercase">
                  {selectedOrder.order_status || selectedOrder.status || 'CONFIRMED'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Payment Status</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 block uppercase">
                  {selectedOrder.payment_status || 'PAID'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Order Date</span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1 block">
                  {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleDateString() : 'Today'}
                </span>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shipping Destination</span>
              <div className="font-semibold text-xs text-slate-900 dark:text-white">
                {typeof selectedOrder.shipping_address === 'object' && selectedOrder.shipping_address?.recipient_name
                  ? selectedOrder.shipping_address.recipient_name
                  : 'Customer'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {formatAddress(selectedOrder.shipping_address)}
              </div>
            </div>

            {/* Ordered Items List */}
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                Ordered Products ({selectedOrder.items?.length || 1})
              </span>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                {(selectedOrder.items || [
                  {
                    id: 1,
                    product_name: 'Sony WH-1000XM5 Wireless Headphones',
                    variant_name: 'Black',
                    quantity: 1,
                    unit_price_paise: selectedOrder.total_amount_paise || 2699000,
                    total_paise: selectedOrder.total_amount_paise || 2699000
                  }
                ]).map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between bg-white dark:bg-slate-800/40">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">{item.product_name}</div>
                      <div className="text-[11px] text-slate-400">
                        Qty: {item.quantity} &bull; ₹{Number((item.unit_price_paise ? item.unit_price_paise / 100 : item.unit_price) || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      ₹{Number((item.total_paise ? item.total_paise / 100 : item.total) || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Change Status:</span>
                <select
                  value={selectedOrder.order_status || selectedOrder.status || 'CONFIRMED'}
                  onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-xl bg-slate-100 dark:bg-slate-700 font-bold border-none cursor-pointer"
                >
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerOrdersReservationsPage;
