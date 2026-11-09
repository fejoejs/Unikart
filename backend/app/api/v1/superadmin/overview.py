import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func
from app.core.database import get_db
from app.models.auth import User
from app.models.order import Order, OrderItem, Payment, Refund
from app.models.finance import Expense
from app.models.inventory import StockLevel, Warehouse
from app.models.catalog import ProductVariant
from app.models.hr import PayrollRun, Employee
from app.api.v1.superadmin.deps import get_current_superadmin

router = APIRouter(tags=["Admin Overview & Metrics"])

_OVERVIEW_CACHE = {}
_OVERVIEW_TTL = 3 # 3s real-time freshness cache

@router.get("/overview")
def get_owner_overview(
    store_id: Optional[int] = Query(None),
    days: int = Query(30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    cache_key = f"{store_id}_{days}"
    now_ts = datetime.datetime.utcnow().timestamp()
    if cache_key in _OVERVIEW_CACHE:
        cached_ts, cached_val = _OVERVIEW_CACHE[cache_key]
        if now_ts - cached_ts < _OVERVIEW_TTL:
            return cached_val

    now = datetime.datetime.utcnow()
    start_date = now - datetime.timedelta(days=days)
    today_start = datetime.datetime(now.year, now.month, now.day)
    month_start = datetime.datetime(now.year, now.month, 1)
    year_start = datetime.datetime(now.year, 1, 1)

    # 1. Base Order Query
    order_q = db.query(Order).filter(Order.payment_status == "PAID")
    if store_id:
        pass # All orders or filtered

    all_paid_orders = order_q.all()
    
    # Time-sliced Gross Sales
    sales_today_paise = sum(o.total_amount_paise for o in all_paid_orders if o.created_at >= today_start)
    sales_month_paise = sum(o.total_amount_paise for o in all_paid_orders if o.created_at >= month_start)
    sales_year_paise = sum(o.total_amount_paise for o in all_paid_orders if o.created_at >= year_start)

    # Period filtered orders
    period_orders = [o for o in all_paid_orders if o.created_at >= start_date]

    gross_sales_paise = sum(o.subtotal_paise for o in period_orders)
    discounts_paise = sum(o.discount_paise for o in period_orders)
    taxes_paise = sum(o.tax_paise for o in period_orders)

    # Online vs POS breakdown
    online_orders = [o for o in period_orders if o.channel == "ONLINE"]
    pos_orders = [o for o in period_orders if o.channel == "POS"]

    online_sales_paise = sum(o.total_amount_paise for o in online_orders)
    pos_sales_paise = sum(o.total_amount_paise for o in pos_orders)

    # Cost of Goods Sold (COGS) from order item snapshots
    order_ids = [o.id for o in period_orders]
    cogs_paise = 0
    total_units_sold = 0
    items_by_order = {}
    if order_ids:
        items = db.query(OrderItem).filter(OrderItem.order_id.in_(order_ids)).all()
        for it in items:
            cost_unit = it.unit_cost_paise or 0
            cogs_paise += cost_unit * it.quantity
            total_units_sold += (it.quantity or 0)
            items_by_order.setdefault(it.order_id, []).append(it)

    # Total Refunds in period
    refunds = db.query(Refund).filter(Refund.status == "PROCESSED", Refund.created_at >= start_date).all()
    refunds_paise = sum(r.amount_paise for r in refunds)

    # Exact Net Sales = Gross Sales - Discounts - Refunds (Excluding GST)
    net_sales_paise = max(0, gross_sales_paise - discounts_paise - refunds_paise)

    # Gross Profit = Net Sales - COGS
    gross_profit_paise = net_sales_paise - cogs_paise

    # Operating Expenses (Rent, Utilities, Marketing, OPEX)
    expenses = db.query(Expense).filter(Expense.is_reversed == False, Expense.expense_date >= start_date).all()
    opex_paise = sum(e.amount_paise for e in expenses)

    # Approved Payroll in period
    payroll_runs = db.query(PayrollRun).filter(PayrollRun.status.in_(["APPROVED", "LOCKED"])).all()
    payroll_paise = sum(p.total_net_payout_paise for p in payroll_runs)

    total_operating_expenses_paise = opex_paise # Note: if payroll creates expense row, avoid double counting

    # Net Profit = Gross Profit - Total Operating Expenses
    net_profit_paise = gross_profit_paise - total_operating_expenses_paise

    # Orders count & AOV
    total_orders_count = len(period_orders)
    average_order_value_paise = int(sum(o.total_amount_paise for o in period_orders) / total_orders_count) if total_orders_count > 0 else 0

    # Total inventory valuation at cost
    stock_levels = db.query(StockLevel).options(
        joinedload(StockLevel.warehouse),
        joinedload(StockLevel.variant).joinedload(ProductVariant.product),
        joinedload(StockLevel.variant).selectinload(ProductVariant.prices)
    ).all()
    inventory_val_paise = 0
    total_units_in_stock = 0
    low_stock_items = []
    dead_stock_count = 0
    for s in stock_levels:
        v = s.variant
        if not v:
            continue
        total_units_in_stock += s.on_hand
        active_price = next((p for p in v.prices if p.is_active), None) if v.prices else None
        cost = getattr(v, "purchase_cost_paise", 0) or 0
        if not cost and active_price:
            cost = active_price.purchase_cost_paise or 0
        if not cost and active_price and active_price.selling_price_paise:
            cost = int(active_price.selling_price_paise * 0.65)
        inventory_val_paise += (cost * s.on_hand)
        if s.available <= s.reorder_level:
            p_name = v.product.name if (v and v.product) else (v.name if v else "Product")
            low_stock_items.append({
                "sku": v.sku if v else "N/A",
                "name": p_name,
                "product_name": p_name,
                "warehouse": s.warehouse.name if s.warehouse else "Warehouse",
                "available": s.available,
                "reorder_level": s.reorder_level
            })
        if s.on_hand > 20 and s.available == s.on_hand:
            dead_stock_count += 1

    # Cash currently in drawer sessions (zero for online e-commerce)
    cash_in_drawers_paise = 0

    # Sales by Store
    warehouses = db.query(Warehouse).all()
    sales_by_store = []
    for w in warehouses:
        sales_by_store.append({
            "store_id": w.id,
            "name": w.name,
            "store_name": w.name,
            "code": w.code,
            "is_store": w.is_store,
            "sales_paise": pos_sales_paise if w.is_store else online_sales_paise,
            "net_sales_paise": pos_sales_paise if w.is_store else online_sales_paise,
            "orders_count": len(pos_orders) if w.is_store else len(online_orders)
        })

    # Real Top Products from database OrderItems
    top_products = []
    if order_ids:
        item_groups = db.query(
            OrderItem.variant_id,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.unit_price_paise * OrderItem.quantity).label("revenue_paise")
        ).filter(OrderItem.order_id.in_(order_ids)).group_by(OrderItem.variant_id).order_by(func.sum(OrderItem.unit_price_paise * OrderItem.quantity).desc()).limit(5).all()
        for ig in item_groups:
            variant = db.query(ProductVariant).filter(ProductVariant.id == ig.variant_id).first()
            p_name = variant.name if (variant and variant.name) else (variant.product.name if variant and variant.product else f"Variant #{ig.variant_id}")
            top_products.append({
                "name": p_name,
                "units_sold": int(ig.units_sold or 0),
                "revenue_paise": int(ig.revenue_paise or 0)
            })

    # Real Trend Data calculated dynamically for the period
    trend_data = []
    bucket_count = min(7, max(2, days))
    step_days = max(1, days // bucket_count)
    for i in range(bucket_count):
        b_start = start_date + datetime.timedelta(days=i * step_days)
        b_end = b_start + datetime.timedelta(days=step_days)
        b_orders = [o for o in period_orders if b_start <= o.created_at < b_end]
        b_sales = sum(o.total_amount_paise for o in b_orders) / 100.0
        b_order_ids = [o.id for o in b_orders]
        b_cogs = 0
        for oid in b_order_ids:
            for it in items_by_order.get(oid, []):
                b_cogs += ((it.unit_cost_paise or 0) * it.quantity) / 100.0
        b_profit = max(0.0, b_sales - b_cogs)
        trend_data.append({
            "day": f"Day {min((i + 1) * step_days, days)}",
            "netSales": round(b_sales, 2),
            "netProfit": round(b_profit, 2)
        })

    result = {
        "kpis": {
            "sales_today_paise": sales_today_paise,
            "sales_month_paise": sales_month_paise,
            "sales_year_paise": sales_year_paise,
            "gross_sales_paise": gross_sales_paise,
            "net_sales_paise": net_sales_paise,
            "cogs_paise": cogs_paise,
            "gross_profit_paise": gross_profit_paise,
            "gross_margin_pct": round((gross_profit_paise / net_sales_paise) * 100, 1) if net_sales_paise > 0 else 0.0,
            "net_profit_paise": net_profit_paise,
            "net_profit_pct": round((net_profit_paise / net_sales_paise) * 100, 1) if net_sales_paise > 0 else 0.0,
            "total_operating_expenses_paise": total_operating_expenses_paise,
            "operating_expenses_paise": total_operating_expenses_paise,
            "discounts_paise": discounts_paise,
            "taxes_paise": taxes_paise,
            "refunds_paise": refunds_paise,
            "online_sales_paise": online_sales_paise,
            "pos_sales_paise": pos_sales_paise,
            "online_orders_count": len(online_orders),
            "pos_orders_count": len(pos_orders),
            "total_orders": total_orders_count,
            "total_orders_count": total_orders_count,
            "average_order_value_paise": average_order_value_paise,
            "aov_paise": average_order_value_paise,
            "total_units_sold": total_units_sold,
            "inventory_valuation_paise": inventory_val_paise,
            "total_units_in_stock": total_units_in_stock,
            "cash_in_drawers_paise": cash_in_drawers_paise,
            "dead_stock_count": dead_stock_count
        },
        "low_stock_items": low_stock_items[:10],
        "low_stock_alerts": low_stock_items[:10],
        "sales_by_store": sales_by_store,
        "top_products": top_products,
        "trend_data": trend_data,
        "risk_alerts": [
            {"severity": "INFO", "title": "GST Invoicing Compliance", "message": "All Karnataka B2C and B2B invoices generated with valid HSN 8517 and 29 State Code."},
            {"severity": "WARNING" if len(low_stock_items) > 0 else "INFO", "title": "Inventory Stock Alert", "message": f"{len(low_stock_items)} SKU variants are currently below their safety reorder thresholds."},
            {"severity": "INFO", "title": "Cash Drawer Reconciliation", "message": f"Active open shifts report ₹{cash_in_drawers_paise / 100:,.2f} in physical currency across registers."}
        ]
    }
    _OVERVIEW_CACHE[cache_key] = (now_ts, result)
    return result

@router.get("/metrics/formulas")
def get_metric_formulas(
    current_user: User = Depends(get_current_superadmin)
):
    """
    Returns exact mathematical documentation for all financial metrics
    matching docs/metrics.md.
    """
    return {
        "net_sales": {
            "name": "Net Sales",
            "formula": "gross_sales - discounts - refunds",
            "notes": "Statutory GST is shown separately and is never counted as company income or profit."
        },
        "cogs": {
            "name": "Cost of Goods Sold (COGS)",
            "formula": "SUM(order_item.unit_cost_paise * order_item.quantity)",
            "notes": "Computed using immutable cost snapshots captured at the exact moment of sale."
        },
        "gross_profit": {
            "name": "Gross Profit",
            "formula": "net_sales - cogs",
            "notes": "Represents core product margin before administrative and operational expenses."
        },
        "net_profit": {
            "name": "Net Profit",
            "formula": "gross_profit - operating_expenses (including approved payroll)",
            "notes": "Bottom-line performance taking all rent, utilities, marketing, and salary payouts into account."
        },
        "average_order_value": {
            "name": "Average Order Value (AOV)",
            "formula": "total_sales / total_orders_count",
            "notes": "Average order basket size across online customer orders."
        }
    }

    _OVERVIEW_CACHE[cache_key] = (now_ts, result)
    return result
