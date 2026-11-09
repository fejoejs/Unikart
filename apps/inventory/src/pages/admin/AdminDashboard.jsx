import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  IndianRupee,
  ShoppingCart,
  ShoppingBag,
  Boxes,
  Store,
  Wallet,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import apiClient from '../../services/apiClient';
import { useAuthStore } from '../../stores/authStore';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import MetricFormulaTooltip from '../../components/common/MetricFormulaTooltip';

function formatINR(paise = 0) {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

const EMPTY_DASHBOARD_DATA = {
  kpis: {
    net_sales_paise: 0,
    gross_sales_paise: 0,
    cogs_paise: 0,
    gross_margin_paise: 0,
    gross_margin_pct: 0.0,
    operating_expenses_paise: 0,
    net_profit_paise: 0,
    net_profit_pct: 0.0,
    total_orders_count: 0,
    online_orders_count: 0,
    pos_orders_count: 0,
    active_stores_count: 1,
    low_stock_count: 0,
    inventory_valuation_paise: 0,
    total_units_in_stock: 0,
  },
  sales_by_store: [],
  low_stock_alerts: [],
  low_stock_items: [],
  top_products: [],
  trend_data: []
};

export function OverviewDashboardPage() {
  const { activeStoreId } = useAuthStore();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(() => {
    try {
      const cached = localStorage.getItem('unikart_admin_dashboard_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.kpis) return parsed;
      }
    } catch {}
    return EMPTY_DASHBOARD_DATA;
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchOverview = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    try {
      const params = { days };
      if (activeStoreId) params.store_id = activeStoreId;
      const res = await apiClient.get('/superadmin/overview', { params });
      if (res.data && res.data.kpis) {
        setData(res.data);
        localStorage.setItem('unikart_admin_dashboard_cache', JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn('Dashboard background sync:', err);
      setError('Could not connect to database for analytics.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [days, activeStoreId]);

  // Real-Time Control Tower Telemetry via SSE
  useEffect(() => {
    const sseBase = import.meta.env.VITE_API_BASE_URL || "/api/v1";
    const sseUrl = `${sseBase}/realtime/events`;
    let eventSource;

    try {
      eventSource = new EventSource(sseUrl);
      eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.event === "order_created" || payload.event === "order_placed" || payload.event === "stock_updated") {
            // Silently update executive metrics without full page flicker
            const params = { days };
            if (activeStoreId) params.store_id = activeStoreId;
            apiClient.get('/superadmin/overview', { params })
              .then(res => setData(res.data))
              .catch(() => {});
          }
        } catch (_) {}
      };
    } catch (_) {}

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [days, activeStoreId]);

  // Render immediately from cache/defaults with zero latency

  const kpis = data?.kpis || {};
  const salesByStore = data?.sales_by_store || [];
  const lowStock = data?.low_stock_items || data?.low_stock_alerts || [];
  const topProducts = data?.top_products || [];

  // Real trend data points from backend
  const trendData = data?.trend_data?.length ? data.trend_data : [
    { day: 'Day 1', netSales: (kpis.net_sales_paise || 0) / 100, netProfit: (kpis.net_profit_paise || 0) / 100 },
    { day: `Day ${days}`, netSales: (kpis.net_sales_paise || 0) / 100, netProfit: (kpis.net_profit_paise || 0) / 100 },
  ];

  if (loading && (!data?.kpis || data === EMPTY_DASHBOARD_DATA)) {
    return <LoadingSkeleton count={4} />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Executive Overview &bull; Control Tower
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time multi-store financials, gross margins, payroll expense deductions, and stock health.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 text-xs font-semibold">
            {[
              { label: '7 Days', val: 7 },
              { label: '30 Days', val: 30 },
              { label: '90 Days', val: 90 },
              { label: 'YTD', val: 365 },
            ].map((period) => (
              <button
                key={period.val}
                onClick={() => setDays(period.val)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  days === period.val
                    ? 'bg-admin-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchOverview(true)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-admin-600 transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Row 1: Revenue & Profitability */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Sales */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <MetricFormulaTooltip metricKey="net_sales">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Net Sales</span>
            </MetricFormulaTooltip>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {formatINR(kpis.net_sales_paise)}
          </div>
          <div className="flex items-center space-x-1 mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Realized turnover</span>
          </div>
        </div>

        {/* Cost of Goods Sold (COGS) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <MetricFormulaTooltip metricKey="cogs">
              <span className="font-semibold uppercase tracking-wider text-[11px]">COGS (Procurement)</span>
            </MetricFormulaTooltip>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {formatINR(kpis.cogs_paise)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Weighted product procurement cost
          </p>
        </div>

        {/* Gross Profit & Margin */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <MetricFormulaTooltip metricKey="gross_profit">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Gross Profit</span>
            </MetricFormulaTooltip>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-admin-100 text-admin-800 dark:bg-admin-950 dark:text-admin-300">
              {(Number(kpis.gross_margin_pct) || 0).toFixed(1)}% Margin
            </span>
          </div>
          <div className="text-2xl font-black text-admin-600 dark:text-admin-400">
            {formatINR(kpis.gross_profit_paise)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Net Sales minus inventory acquisition
          </p>
        </div>

        {/* Net Profit (Bottom line) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <MetricFormulaTooltip metricKey="net_profit">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Net Operating Profit</span>
            </MetricFormulaTooltip>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${
            (kpis.net_profit_paise || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
          }`}>
            {formatINR(kpis.net_profit_paise)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Deducting OpEx &amp; payroll vouchers
          </p>
        </div>
      </div>

      {/* KPI Cards Row 2: Basket Size, Orders, OpEx, Cash */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* AOV */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">
            <MetricFormulaTooltip metricKey="aov">Average Order Value (AOV)</MetricFormulaTooltip>
          </div>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {formatINR(kpis.aov_paise || kpis.average_order_value_paise || 0)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{kpis.total_orders || kpis.total_orders_count || 0} total transactions</p>
        </div>

        {/* Operating Expenses */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">
            <MetricFormulaTooltip metricKey="operating_expenses">Operating Expenses (OpEx)</MetricFormulaTooltip>
          </div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
            {formatINR(kpis.operating_expenses_paise || kpis.total_operating_expenses_paise || 0)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Includes rent, utilities &amp; salaries</p>
        </div>

        {/* Total Units Sold */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Total Units Sold
          </div>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {kpis.total_units_sold || 0} pcs
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Multi-category merchandise</p>
        </div>

        {/* Total Inventory Valuation */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Inventory Valuation
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatINR(kpis.inventory_valuation_paise || 0)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{kpis.total_units_in_stock ? `Total valuation (${kpis.total_units_in_stock.toLocaleString("en-IN")} units in stock)` : "Total active stock valuation"}</p>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Revenue vs Net Profit Trend (₹)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cumulative performance progression over the past {days} days
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-admin-600"></span>
                <span className="text-slate-600 dark:text-slate-400">Net Sales</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600 dark:text-slate-400">Net Profit</span>
              </span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Area type="monotone" dataKey="netSales" stroke="#7C3AED" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="netProfit" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Store Breakdown Bar Chart (1 Col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
            Store Revenue Share
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Comparison across regional branches &amp; online
          </p>

          <div className="space-y-3">
            {salesByStore.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No store transactions in selected period.</p>
            ) : (
              salesByStore.map((store, i) => {
                const total = salesByStore.reduce((a, b) => a + b.net_sales_paise, 0) || 1;
                const pct = Math.round(((store.net_sales_paise ?? store.sales_paise ?? 0) / total) * 100);
                return (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-800 dark:text-slate-200">{store.name || store.store_name || 'Flagship Store'}</span>
                      <span className="font-mono text-admin-600 dark:text-admin-400">
                        {formatINR((store.net_sales_paise ?? store.sales_paise ?? 0))} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-admin-600 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Operational Highlights: Low Stock Alert & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Warning Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Critical Low Stock Alerts
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Items below emergency reorder thresholds
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400">
              {lowStock.length} Items
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
            {lowStock.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                All inventory levels are currently above reorder limits.
              </p>
            ) : (
              lowStock.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{item.name || item.product_name || item.sku}</p>
                    <p className="text-[11px] text-slate-400 font-mono">Min buffer: {item.reorder_level} units</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-rose-500">{item.available} units</span>
                    <p className="text-[10px] text-slate-400">Min: {item.reorder_level}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Performing Products */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Top Selling Products
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Highest velocity catalog merchandise
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400">
              {topProducts.length} Items
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No product sales recorded in this period.
              </p>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{p.name || p.product_name || `Product #${p.variant_id}`}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{p.units_sold || 1} units sold</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatINR(p.revenue_paise || p.selling_price_paise || 0)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewDashboardPage;
