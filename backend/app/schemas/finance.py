from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ExpenseCreate(BaseModel):
    category: str
    amount_paise: int = Field(..., gt=0)
    payment_method: str = "BANK_TRANSFER"
    notes: Optional[str] = None
    attachment_url: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: int
    expense_number: str
    category: str
    amount_paise: int
    payment_method: str
    expense_date: Any
    notes: Optional[str] = None
    recorded_by_name: Optional[str] = None
    is_reversed: bool
    reversal_reason: Optional[str] = None

    class Config:
        from_attributes = True

class DashboardMetricsResponse(BaseModel):
    today_sales_paise: int
    monthly_sales_paise: int
    yearly_sales_paise: int
    online_sales_paise: int
    pos_sales_paise: int
    gross_sales_paise: int
    discounts_paise: int
    net_sales_paise: int
    taxes_collected_paise: int
    cogs_paise: int
    gross_profit_paise: int
    operating_expenses_paise: int
    net_profit_paise: int
    total_orders_count: int
    average_order_value_paise: int
    low_stock_count: int
    inventory_valuation_paise: int
    total_products_count: int
    channel_breakdown: List[Dict[str, Any]] = []
    recent_orders: List[Dict[str, Any]] = []
    top_selling_products: List[Dict[str, Any]] = []
    sales_trend: List[Dict[str, Any]] = []

class SalesReportResponse(BaseModel):
    period: str
    gross_sales_paise: int
    discount_paise: int
    net_sales_paise: int
    tax_paise: int
    orders_count: int
    records: List[Dict[str, Any]] = []

class ProfitLossResponse(BaseModel):
    gross_revenue_paise: int
    returns_refunds_paise: int
    net_revenue_paise: int
    cost_of_goods_sold_paise: int
    gross_profit_paise: int
    gross_margin_percent: float
    operating_expenses_breakdown: Dict[str, int]
    total_operating_expenses_paise: int
    net_profit_paise: int
    net_profit_margin_percent: float
    notes: str = "Net profit is strictly Net Revenue less Cost of Goods Sold and Operating Expenses. GST/Taxes are held in liability and excluded from revenue/profit."
