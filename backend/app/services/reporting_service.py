import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.models.order import Order, OrderItem, Payment, Refund
from app.models.finance import Expense
from app.models.catalog import Product, ProductVariant, Price
from app.models.inventory import StockLevel

class ReportingService:
    @staticmethod
    def get_dashboard_metrics(db: Session) -> Dict[str, Any]:
        now = datetime.datetime.now(datetime.timezone.utc)
        today_start = datetime.datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=datetime.timezone.utc)
        month_start = datetime.datetime(now.year, now.month, 1, 0, 0, 0, tzinfo=datetime.timezone.utc)
        year_start = datetime.datetime(now.year, 1, 1, 0, 0, 0, tzinfo=datetime.timezone.utc)

        # Base valid orders (CONFIRMED, DELIVERED, PROCESSING, SHIPPED)
        valid_orders = db.query(Order).filter(
            Order.order_status.in_(["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"])
        ).all()

        total_orders_count = len(valid_orders)
        gross_sales_paise = sum(o.subtotal_paise for o in valid_orders)
        discounts_paise = sum(o.discount_paise for o in valid_orders)
        taxes_collected_paise = sum(o.tax_paise for o in valid_orders)
        net_sales_paise = sum(o.total_amount_paise for o in valid_orders)
        average_order_value_paise = round(net_sales_paise / total_orders_count) if total_orders_count > 0 else 0

        # Channel Breakdown
        online_sales_paise = sum(o.total_amount_paise for o in valid_orders if o.channel == "ONLINE")
        pos_sales_paise = sum(o.total_amount_paise for o in valid_orders if o.channel == "POS")

        # Period Sales
        today_sales_paise = sum(o.total_amount_paise for o in valid_orders if o.created_at.replace(tzinfo=datetime.timezone.utc) >= today_start)
        monthly_sales_paise = sum(o.total_amount_paise for o in valid_orders if o.created_at.replace(tzinfo=datetime.timezone.utc) >= month_start)
        yearly_sales_paise = sum(o.total_amount_paise for o in valid_orders if o.created_at.replace(tzinfo=datetime.timezone.utc) >= year_start)

        # Cost of Goods Sold (COGS) from immutable order items
        valid_order_ids = [o.id for o in valid_orders]
        order_items = db.query(OrderItem).filter(OrderItem.order_id.in_(valid_order_ids)).all() if valid_order_ids else []
        cogs_paise = sum((item.unit_cost_paise or 0) * item.quantity for item in order_items)

        # Gross Profit = Net Sales - COGS
        gross_profit_paise = net_sales_paise - cogs_paise

        # Operating Expenses (unreversed)
        expenses = db.query(Expense).filter(Expense.is_reversed == False).all()
        operating_expenses_paise = sum(e.amount_paise for e in expenses)

        # Net Profit = Gross Profit - Operating Expenses
        net_profit_paise = gross_profit_paise - operating_expenses_paise

        # Inventory Valuation & Low Stock (Optimized single bulk query, eliminates N+1 loop)
        stock_levels = db.query(StockLevel).all()
        low_stock_count = 0
        inventory_valuation_paise = 0

        # Bulk fetch active variant purchase costs in a single query
        prices = db.query(Price.variant_id, Price.purchase_cost_paise).filter(Price.is_active == True).all()
        price_map = {p[0]: (p[1] or 0) for p in prices}

        for stock in stock_levels:
            if stock.available <= stock.reorder_level:
                low_stock_count += 1
            cost = price_map.get(stock.variant_id, 0)
            inventory_valuation_paise += stock.on_hand * cost

        total_products_count = db.query(Product).filter(Product.is_active == True).count()

        # Top selling products & item counts map
        product_sales = {}
        items_count_map = {}
        for item in order_items:
            key = item.product_name
            product_sales[key] = product_sales.get(key, 0) + item.quantity
            items_count_map[item.order_id] = items_count_map.get(item.order_id, 0) + 1

        top_selling = [
            {"name": name, "quantity": qty}
            for name, qty in sorted(product_sales.items(), key=lambda x: x[1], reverse=True)[:5]
        ]

        # Recent orders summary
        recent_orders = [
            {
                "id": o.id,
                "order_number": o.order_number,
                "invoice_number": o.invoice_number,
                "channel": o.channel,
                "order_status": o.order_status,
                "payment_status": o.payment_status,
                "total_amount_paise": o.total_amount_paise,
                "items_count": items_count_map.get(o.id, 0),
                "created_at": o.created_at.isoformat()
            }
            for o in sorted(valid_orders, key=lambda x: x.created_at, reverse=True)[:6]
        ]

        # Sales Trend (last 7 days)
        sales_trend = []
        for i in range(6, -1, -1):
            day_dt = now - datetime.timedelta(days=i)
            day_start = datetime.datetime(day_dt.year, day_dt.month, day_dt.day, 0, 0, 0, tzinfo=datetime.timezone.utc)
            day_end = day_start + datetime.timedelta(days=1)
            day_orders = [
                o for o in valid_orders 
                if day_start <= o.created_at.replace(tzinfo=datetime.timezone.utc) < day_end
            ]
            sales_trend.append({
                "date": day_dt.strftime("%d %b"),
                "online": sum(o.total_amount_paise for o in day_orders if o.channel == "ONLINE") / 100.0,
                "pos": sum(o.total_amount_paise for o in day_orders if o.channel == "POS") / 100.0,
                "total": sum(o.total_amount_paise for o in day_orders) / 100.0
            })

        return {
            "today_sales_paise": today_sales_paise,
            "monthly_sales_paise": monthly_sales_paise,
            "yearly_sales_paise": yearly_sales_paise,
            "online_sales_paise": online_sales_paise,
            "pos_sales_paise": pos_sales_paise,
            "gross_sales_paise": gross_sales_paise,
            "discounts_paise": discounts_paise,
            "net_sales_paise": net_sales_paise,
            "taxes_collected_paise": taxes_collected_paise,
            "cogs_paise": cogs_paise,
            "gross_profit_paise": gross_profit_paise,
            "operating_expenses_paise": operating_expenses_paise,
            "net_profit_paise": net_profit_paise,
            "total_orders_count": total_orders_count,
            "average_order_value_paise": average_order_value_paise,
            "low_stock_count": low_stock_count,
            "inventory_valuation_paise": inventory_valuation_paise,
            "total_products_count": total_products_count,
            "channel_breakdown": [
                {"name": "Online Store", "value": online_sales_paise},
                {"name": "Direct Orders", "value": 0}
            ],
            "recent_orders": recent_orders,
            "top_selling_products": top_selling,
            "sales_trend": sales_trend
        }

    @staticmethod
    def get_profit_and_loss(db: Session) -> Dict[str, Any]:
        valid_orders = db.query(Order).filter(
            Order.order_status.in_(["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"])
        ).all()
        valid_order_ids = [o.id for o in valid_orders]
        
        gross_revenue_paise = sum(o.subtotal_paise for o in valid_orders)
        refunds = db.query(Refund).filter(Refund.status == "PROCESSED").all()
        returns_refunds_paise = sum(r.amount_paise for r in refunds)
        net_revenue_paise = sum(o.total_amount_paise for o in valid_orders) - returns_refunds_paise

        order_items = db.query(OrderItem).filter(OrderItem.order_id.in_(valid_order_ids)).all() if valid_order_ids else []
        cogs_paise = sum((item.unit_cost_paise or 0) * item.quantity for item in order_items)
        gross_profit_paise = net_revenue_paise - cogs_paise
        gross_margin = (gross_profit_paise / net_revenue_paise * 100.0) if net_revenue_paise > 0 else 0.0

        expenses = db.query(Expense).filter(Expense.is_reversed == False).all()
        exp_breakdown = {}
        for exp in expenses:
            exp_breakdown[exp.category] = exp_breakdown.get(exp.category, 0) + exp.amount_paise
        total_opex = sum(exp_breakdown.values())

        net_profit_paise = gross_profit_paise - total_opex
        net_margin = (net_profit_paise / net_revenue_paise * 100.0) if net_revenue_paise > 0 else 0.0

        return {
            "gross_revenue_paise": gross_revenue_paise,
            "returns_refunds_paise": returns_refunds_paise,
            "net_revenue_paise": net_revenue_paise,
            "cost_of_goods_sold_paise": cogs_paise,
            "gross_profit_paise": gross_profit_paise,
            "gross_margin_percent": round(gross_margin, 2),
            "operating_expenses_breakdown": exp_breakdown,
            "total_operating_expenses_paise": total_opex,
            "net_profit_paise": net_profit_paise,
            "net_profit_margin_percent": round(net_margin, 2),
            "notes": "Net profit is strictly Net Revenue less Cost of Goods Sold and Operating Expenses. GST/Taxes are held in liability and excluded from revenue/profit."
        }
