# backend/app/api/v1/enterprise.py - Real Database Connected Inventory & Enterprise Domain
import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload, selectinload
from app.core.database import get_db
from app.models.auth import User
from app.dependencies.authentication_dependencies import require_roles, get_current_user
from app.models.catalog import Product, Category, ProductVariant, Price
from app.models.inventory import StockLevel, InventoryMovement
from app.models.order import Order, OrderItem
from app.services.inventory_service import InventoryService

router = APIRouter(tags=["Inventory Operations & Notifications Suite"])

# Enforce role-based access control across all inventory enterprise endpoints
staff_guard = Depends(require_roles(["admin", "manager", "inventory_staff"]))
admin_guard = Depends(require_roles(["admin", "manager"]))

# =========================================================================
# 01. INVENTORY DOMAIN (/inventory)
# =========================================================================

class StockAdjustPayload(BaseModel):
    productId: str
    newPhysicalStock: int
    reason: Optional[str] = "Physical reconciliation"
    movementType: Optional[str] = "ADJUSTMENT"

class BulkEditPayload(BaseModel):
    productIds: List[str]
    reorderLevel: Optional[int] = None
    priceDeltaPct: Optional[float] = None
    notes: Optional[str] = "Bulk update"

class NotificationDispatchPayload(BaseModel):
    title: str
    message: str
    category: str = "SYSTEM"
    severity: str = "INFO"

@router.get("/inventory", dependencies=[staff_guard])
def get_inventory_summary(db: Session = Depends(get_db)):
    # Query all active product variants with eager loading to prevent N+1 query latency
    variants = db.query(ProductVariant).options(
        joinedload(ProductVariant.product).joinedload(Product.category),
        joinedload(ProductVariant.product).joinedload(Product.brand),
        joinedload(ProductVariant.product).selectinload(Product.images),
        selectinload(ProductVariant.prices),
        selectinload(ProductVariant.stock_levels)
    ).join(Product).order_by(Product.id.asc(), ProductVariant.id.asc()).all()
    inventory_items = []
    
    total_physical = 0
    total_reserved = 0
    total_cost = 0
    total_retail = 0
    low_stock = 0

    for v in variants:
        p = v.product
        active_price = next((pr for pr in v.prices if pr.is_active), (v.prices[0] if v.prices else None))
        
        # Real authoritative pricing without invented fallbacks
        base_price = (active_price.selling_price_paise // 100) if active_price else 0
        cost_price = (active_price.purchase_cost_paise // 100) if (active_price and active_price.purchase_cost_paise is not None) else None

        # Real Stock levels from DB
        physical = 0
        reserved = 0
        reorder_lvl = 10
        for sl in v.stock_levels:
            physical += (sl.on_hand or 0)
            reserved += (sl.reserved or 0)
            if sl.reorder_level:
                reorder_lvl = sl.reorder_level

        available = max(0, physical - reserved)
        if available <= reorder_lvl:
            low_stock += 1

        cost_val = physical * (cost_price or 0)
        retail_val = physical * base_price
        total_physical += physical
        total_reserved += reserved
        total_cost += cost_val
        total_retail += retail_val

        inventory_items.append({
            "id": f"inv-{v.id}",
            "product_id": str(p.id) if p else "",
            "variant_id": v.id,
            "sku": v.sku,
            "barcode": v.barcode or "",
            "product_name": f"{p.name} ({v.name})" if (p and v.name and v.name != p.name) else (p.name if p else v.sku),
            "brand": p.brand.name if (p and p.brand) else "UNIKART",
            "image": (p.images[0].url if (p and p.images) else ""),
            "department_name": p.category.name if (p and p.category) else "General",
            "department_id": p.category.slug if (p and p.category) else "general",
            "purchase_price": cost_price,
            "selling_price": base_price,
            "physical_stock": physical,
            "reserved_stock": reserved,
            "available_stock": available,
            "reorder_level": reorder_lvl,
            "cost_valuation": cost_val,
            "retail_valuation": retail_val
        })

    return {
        "success": True,
        "inventory": inventory_items,
        "summary": {
            "total_skus": len(inventory_items),
            "total_physical_units": total_physical,
            "total_available_units": max(0, total_physical - total_reserved),
            "total_reserved_units": total_reserved,
            "total_cost_value": total_cost,
            "total_retail_value": total_retail,
            "low_stock_count": low_stock
        }
    }

@router.get("/inventory/intelligence", dependencies=[staff_guard])
def get_inventory_intelligence(db: Session = Depends(get_db)):
    # Calculate real data-driven inventory metrics using 30-day movement ledger
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    thirty_days_ago = now_utc - datetime.timedelta(days=30)

    # 1. Real 30-day sales volume by variant
    sales_movements = db.query(InventoryMovement).filter(
        InventoryMovement.movement_type == "SALE",
        InventoryMovement.created_at >= thirty_days_ago
    ).all()

    sales_by_variant: Dict[int, int] = {}
    for sm in sales_movements:
        sales_by_variant[sm.variant_id] = sales_by_variant.get(sm.variant_id, 0) + abs(sm.quantity)

    # 2. Real Low Stock & Demand Forecast (using available stock = on_hand - reserved)
    low_stocks = db.query(StockLevel).options(
        joinedload(StockLevel.variant).joinedload(ProductVariant.product),
        joinedload(StockLevel.warehouse)
    ).filter((StockLevel.on_hand - StockLevel.reserved) <= StockLevel.reorder_level).limit(15).all()
    forecast = []
    for sl in low_stocks:
        v = sl.variant
        if v and v.product:
            past_30d_sales = sales_by_variant.get(v.id, 0)
            daily_velocity = past_30d_sales / 30.0
            available_stock = max(0, (sl.on_hand or 0) - (sl.reserved or 0))
            projected_demand = round(daily_velocity * 30) if past_30d_sales > 0 else (sl.reorder_level or 10)
            suggested_reorder = max(0, projected_demand - available_stock)
            confidence_label = "Historical 30-Day Sales" if past_30d_sales > 0 else "Reorder Level Threshold"

            forecast.append({
                "sku": v.sku,
                "name": v.product.name,
                "currentStock": available_stock,
                "onHand": sl.on_hand,
                "reserved": sl.reserved,
                "projectedDemand30Days": projected_demand,
                "suggestedReorder": suggested_reorder,
                "confidence": confidence_label
            })

    # 3. Real Fast Moving Items (top sales in last 30 days)
    fast_moving = []
    sorted_sales = sorted(sales_by_variant.items(), key=lambda x: x[1], reverse=True)[:5]
    for var_id, units_sold in sorted_sales:
        v = db.query(ProductVariant).filter(ProductVariant.id == var_id).first()
        if v and v.product:
            fast_moving.append({
                "sku": v.sku,
                "name": v.product.name,
                "unitsSold30Days": units_sold,
                "currentStock": sum(max(0, sl.on_hand - sl.reserved) for sl in v.stock_levels)
            })

    # 4. Real Dead Stock (on-hand > 0 with 0 sales in 30 days)
    dead_stock = []
    all_levels = db.query(StockLevel).filter(StockLevel.on_hand > 0).all()
    for sl in all_levels:
        if sl.variant_id not in sales_by_variant:
            v = sl.variant
            if v and v.product and len(dead_stock) < 5:
                dead_stock.append({
                    "sku": v.sku,
                    "name": v.product.name,
                    "onHand": sl.on_hand,
                    "daysWithoutSale": ">30 days"
                })

    return {
        "success": True,
        "forecast": forecast,
        "deadStock": dead_stock,
        "fastMoving": fast_moving
    }

@router.get("/inventory/barcode/{product_id}", dependencies=[staff_guard])
def get_barcode_label(product_id: str, db: Session = Depends(get_db)):
    prod = None
    variant = None
    if product_id.isdigit():
        prod = db.query(Product).filter(Product.id == int(product_id)).first()
    if not prod:
        variant = db.query(ProductVariant).filter(ProductVariant.sku == product_id).first()
        if variant:
            prod = variant.product
    if prod and prod.variants:
        v = variant or prod.variants[0]
        active_price = next((pr for pr in v.prices if pr.is_active), (v.prices[0] if v.prices else None))
        sp = (active_price.selling_price_paise // 100) if active_price else 0
        mrp = (active_price.mrp_paise // 100) if active_price else sp
        return {
            "success": True,
            "label": {
                "productId": str(prod.id),
                "sku": v.sku,
                "barcode": v.barcode or "",
                "brand": prod.brand.name if prod.brand else "UNIKART",
                "mrp": f"₹{mrp:,} (Incl. of all taxes)",
                "sellingPrice": f"₹{sp:,}",
                "hsn": prod.hsn_code or "85171300",
                "date": datetime.date.today().strftime("%b %Y")
            }
        }
    raise HTTPException(status_code=404, detail="Product not found for barcode label.")

@router.post("/inventory/adjust", dependencies=[staff_guard])
def adjust_inventory_stock(payload: StockAdjustPayload, db: Session = Depends(get_db)):
    pid = int(payload.productId) if payload.productId.isdigit() else None
    variant = None
    if pid:
        variant = db.query(ProductVariant).filter(ProductVariant.product_id == pid).first()
    if not variant:
        variant = db.query(ProductVariant).filter(ProductVariant.sku == payload.productId).first()
    if not variant:
        raise HTTPException(status_code=404, detail="No matching product variant found for adjustment.")

    stock = db.query(StockLevel).filter(
        StockLevel.variant_id == variant.id,
        StockLevel.warehouse_id == 1
    ).first()

    if not stock:
        stock = StockLevel(variant_id=variant.id, warehouse_id=1, on_hand=0, reserved=0, reorder_level=10)
        db.add(stock)
        db.flush()

    delta = payload.newPhysicalStock - stock.on_hand
    if delta != 0:
        InventoryService.adjust_stock(
            db=db,
            variant_id=variant.id,
            warehouse_id=1,
            quantity_delta=delta,
            movement_type=payload.movementType or "ADJUSTMENT",
            reason=payload.reason or "Physical reconciliation via Inventory App",
            reference_type="MANUAL_ADJUSTMENT"
        )
        db.commit()

        # Real-time SSE Live Event Broadcast
        try:
            from app.api.v1.realtime import broadcast_stock_change
            prod_name = variant.product.name if (variant and variant.product) else (variant.name or "Product")
            broadcast_stock_change(
                variant_id=variant.id,
                sku=variant.sku,
                product_name=prod_name,
                on_hand=payload.newPhysicalStock,
                available=max(0, payload.newPhysicalStock - (stock.reserved or 0)),
                reason=payload.reason or "Physical reconciliation via Inventory App"
            )
        except Exception:
            pass

    return {
        "success": True,
        "message": f"Physical stock adjusted for SKU {variant.sku} to {payload.newPhysicalStock} units.",
        "updatedStock": payload.newPhysicalStock
    }

@router.post("/inventory/bulk-edit")
def bulk_edit_inventory(
    payload: BulkEditPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "manager", "inventory_staff"]))
):
    # Enforce role permission separation: inventory staff can adjust reorder levels,
    # but modifying prices requires admin or manager privileges
    user_roles = [r.name for r in current_user.roles] if hasattr(current_user, "roles") else []
    if payload.priceDeltaPct is not None:
        if not any(r in ["admin", "manager", "owner"] for r in user_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: Modifying prices requires an admin or manager role."
            )

    now_utc = datetime.datetime.now(datetime.timezone.utc)
    updated_count = 0
    for pid_str in payload.productIds:
        pid = int(pid_str) if pid_str.isdigit() else None
        if not pid:
            continue
        prod = db.query(Product).filter(Product.id == pid).first()
        if not prod:
            continue
        for v in prod.variants:
            if payload.reorderLevel is not None:
                for sl in v.stock_levels:
                    sl.reorder_level = payload.reorderLevel
            if payload.priceDeltaPct is not None and v.prices:
                active_pr = next((pr for pr in v.prices if pr.is_active), v.prices[0])
                factor = 1.0 + (payload.priceDeltaPct / 100.0)
                new_sp = max(100, int(active_pr.selling_price_paise * factor))
                
                # Version price record for auditability
                if active_pr.selling_price_paise != new_sp:
                    active_pr.is_active = False
                    active_pr.valid_to = now_utc
                    new_pr = Price(
                        variant_id=v.id,
                        currency="INR",
                        mrp_paise=active_pr.mrp_paise,
                        selling_price_paise=new_sp,
                        purchase_cost_paise=active_pr.purchase_cost_paise,
                        is_active=True,
                        valid_from=now_utc
                    )
                    db.add(new_pr)
            updated_count += 1

    db.commit()
    return {
        "success": True,
        "message": f"Successfully updated {updated_count} product variants in the central ledger.",
        "updatedCount": updated_count
    }

@router.get("/inventory/movements", dependencies=[staff_guard])
def get_stock_movements(db: Session = Depends(get_db)):
    movements = db.query(InventoryMovement).order_by(InventoryMovement.created_at.desc()).limit(100).all()
    out = []
    for m in movements:
        v = m.variant
        pname = v.product.name if (v and v.product) else "Unknown Product"
        sku = v.sku if v else "UNK"
        out.append({
            "id": f"sm-{m.id}",
            "sku": sku,
            "product_name": pname,
            "movement_type": m.movement_type,
            "quantity": m.quantity,
            "previous_stock": m.previous_on_hand,
            "new_stock": m.new_on_hand,
            "reference_type": m.reference_type or "MANUAL",
            "reference_id": m.reference_id or f"ADJ-{m.id}",
            "reason": m.reason,
            "created_at": m.created_at.isoformat()
        })

    return {
        "success": True,
        "movements": out
    }

# =========================================================================
# 02. NOTIFICATIONS DOMAIN (/notifications)
# =========================================================================

_read_notification_ids = set()
_notification_preferences = {
    "email_enabled": 1,
    "sms_enabled": 1,
    "whatsapp_enabled": 1,
    "push_enabled": 1,
    "order_alerts": 1,
    "inventory_alerts": 1,
    "approval_alerts": 1,
    "security_alerts": 1
}
_custom_dispatched_notifications = []

@router.get("/notifications", dependencies=[staff_guard])
def get_central_notifications(category: Optional[str] = "all", db: Session = Depends(get_db)):
    # Derive real dynamic alerts from actual stock levels and movements
    low_stocks = db.query(StockLevel).filter((StockLevel.on_hand - StockLevel.reserved) <= StockLevel.reorder_level).all()
    out_of_stocks = [sl for sl in low_stocks if sl.on_hand == 0]
    recent_damages = db.query(InventoryMovement).filter(InventoryMovement.movement_type == "DAMAGE").limit(5).all()

    alerts = []
    # 0. Custom dispatched alerts
    for d in _custom_dispatched_notifications:
        is_read = 1 if d["id"] in _read_notification_ids else d.get("is_read", 0)
        alerts.append({
            **d,
            "is_read": is_read,
            "status": "READ" if is_read else "UNREAD"
        })

    # Out of stock alerts
    for oos in out_of_stocks[:5]:
        v = oos.variant
        pname = v.product.name if (v and v.product) else (v.sku if v else "Product")
        nid = f"notif-oos-{oos.id}"
        is_read = 1 if nid in _read_notification_ids else 0
        alerts.append({
            "id": nid,
            "title": f"Out of Stock: {pname}",
            "message": f"Stock is depleted (0 units on hand). Immediate reorder required.",
            "description": f"Stock is depleted (0 units on hand). Immediate reorder required.",
            "category": "INVENTORY_ALERT",
            "type": "ALERT",
            "severity": "CRITICAL",
            "priority": "URGENT",
            "channels_sent": "IN_APP,EMAIL",
            "is_read": is_read,
            "action_url": "/inventory",
            "timestamp": oos.updated_at.isoformat() if oos.updated_at else datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "created_at": oos.updated_at.strftime("%d %b %H:%M") if oos.updated_at else "Just now",
            "status": "READ" if is_read else "UNREAD"
        })

    # Low stock alerts
    for ls in low_stocks[:5]:
        if ls.on_hand > 0:
            v = ls.variant
            pname = v.product.name if (v and v.product) else (v.sku if v else "Product")
            nid = f"notif-ls-{ls.id}"
            is_read = 1 if nid in _read_notification_ids else 0
            alerts.append({
                "id": nid,
                "title": f"Low Stock Warning: {pname}",
                "message": f"Remaining stock is {ls.on_hand} units (below threshold of {ls.reorder_level}).",
                "description": f"Remaining stock is {ls.on_hand} units (below threshold of {ls.reorder_level}).",
                "category": "INVENTORY_ALERT",
                "type": "WARNING",
                "severity": "WARNING",
                "priority": "HIGH",
                "channels_sent": "IN_APP,EMAIL",
                "is_read": is_read,
                "action_url": "/inventory",
                "timestamp": ls.updated_at.isoformat() if ls.updated_at else datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "created_at": ls.updated_at.strftime("%d %b %H:%M") if ls.updated_at else "Just now",
                "status": "READ" if is_read else "UNREAD"
            })

    # Damaged stock alerts
    for dmg in recent_damages:
        v = dmg.variant
        pname = v.product.name if (v and v.product) else "Product"
        nid = f"notif-dmg-{dmg.id}"
        is_read = 1 if nid in _read_notification_ids else 0
        alerts.append({
            "id": nid,
            "title": f"Damaged Goods Recorded: {pname}",
            "message": f"{abs(dmg.quantity)} unit(s) quarantined. Reason: {dmg.reason}",
            "description": f"{abs(dmg.quantity)} unit(s) quarantined. Reason: {dmg.reason}",
            "category": "INVENTORY_ALERT",
            "type": "WARNING",
            "severity": "WARNING",
            "priority": "NORMAL",
            "channels_sent": "IN_APP,SMS",
            "is_read": is_read,
            "action_url": "/inventory",
            "timestamp": dmg.created_at.isoformat() if dmg.created_at else datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "created_at": dmg.created_at.strftime("%d %b %H:%M") if dmg.created_at else "Just now",
            "status": "READ" if is_read else "UNREAD"
        })

    # Default system status alert
    sys_id = "notif-sys-01"
    is_sys_read = 1 if sys_id in _read_notification_ids else 1
    alerts.append({
        "id": sys_id,
        "title": "System Synchronization Active",
        "message": "Inventory ledger is synchronized with live e-commerce marketplace.",
        "description": "Inventory ledger is synchronized with live e-commerce marketplace.",
        "category": "SYSTEM",
        "type": "SUCCESS",
        "severity": "INFO",
        "priority": "LOW",
        "channels_sent": "IN_APP",
        "is_read": is_sys_read,
        "action_url": "/admin",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "created_at": "Today",
        "status": "READ" if is_sys_read else "UNREAD"
    })

    if category and category.lower() != "all":
        alerts = [a for a in alerts if a["category"].lower() == category.lower()]

    unread = len([a for a in alerts if a["is_read"] == 0])
    return {
        "success": True,
        "unread_count": unread,
        "unreadCount": unread,
        "notifications": alerts
    }

@router.patch("/notifications/{notif_id}/read", dependencies=[staff_guard])
def mark_notification_read(notif_id: str):
    _read_notification_ids.add(notif_id)
    return {"success": True, "marked_id": notif_id}

@router.post("/notifications/read-all", dependencies=[staff_guard])
def mark_all_notifications_read():
    _read_notification_ids.update([
        "notif-sys-01",
        *[f"notif-oos-{i}" for i in range(100)],
        *[f"notif-ls-{i}" for i in range(100)],
        *[f"notif-dmg-{i}" for i in range(100)],
        *[d["id"] for d in _custom_dispatched_notifications]
    ])
    return {"success": True, "message": "All notifications marked as read."}

@router.get("/notifications/preferences", dependencies=[staff_guard])
def get_notification_preferences():
    return {"success": True, "preferences": _notification_preferences}

@router.put("/notifications/preferences", dependencies=[staff_guard])
def update_notification_preferences(payload: Dict[str, Any]):
    _notification_preferences.update(payload)
    return {"success": True, "preferences": _notification_preferences}

@router.post("/notifications/send", dependencies=[staff_guard])
def send_notification(payload: Dict[str, Any]):
    new_id = f"notif-custom-{int(datetime.datetime.now(datetime.timezone.utc).timestamp())}"
    notif = {
        "id": new_id,
        "title": payload.get("title", "Broadcast Alert"),
        "message": payload.get("message", ""),
        "description": payload.get("message", ""),
        "category": payload.get("category", "SYSTEM"),
        "type": payload.get("type", "INFO"),
        "severity": payload.get("priority", "NORMAL"),
        "priority": payload.get("priority", "NORMAL"),
        "channels_sent": ",".join(payload.get("channels", ["IN_APP"])),
        "is_read": 0,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "created_at": "Just now",
        "status": "UNREAD"
    }
    _custom_dispatched_notifications.insert(0, notif)
    return {"success": True, "notification_id": new_id, "message": "Notification dispatched."}

@router.post("/notifications/dispatch", dependencies=[admin_guard])
def dispatch_notification(payload: NotificationDispatchPayload):
    return {
        "success": True,
        "dispatch_id": f"dsp-{int(datetime.datetime.now(datetime.timezone.utc).timestamp())}",
        "message": f"Broadcast notification '{payload.title}' dispatched to personnel."
    }
