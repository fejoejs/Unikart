import datetime
import logging
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.inventory import StockLevel, InventoryMovement
from app.models.catalog import ProductVariant
from app.api.v1.realtime import broadcast_stock_change

logger = logging.getLogger("inventory_service")

class InventoryService:
    @staticmethod
    def adjust_stock(
        db: Session,
        variant_id: int,
        warehouse_id: Optional[int] = 1,
        quantity_delta: int = 0, # positive or negative
        movement_type: str = "ADJUSTMENT", # RECEIPT, SALE, RETURN, TRANSFER, DAMAGE, ADJUSTMENT
        reason: str = "Manual adjustment",
        reference_id: Optional[str] = None,
        reference_type: Optional[str] = None,
        user_id: Optional[int] = None
    ) -> StockLevel:
        """
        Atomically updates StockLevel with warehouse locking, maintains stock invariants,
        and writes an immutable record to the InventoryMovement ledger.
        """
        target_warehouse_id = warehouse_id if warehouse_id is not None else 1

        # Explicitly filter by both variant_id AND warehouse_id with row lock
        stock = db.query(StockLevel).filter(
            StockLevel.variant_id == variant_id,
            StockLevel.warehouse_id == target_warehouse_id
        ).with_for_update().first()

        if not stock:
            # Handle concurrent initial creation safely using nested savepoint
            try:
                with db.begin_nested():
                    stock = StockLevel(
                        variant_id=variant_id,
                        warehouse_id=target_warehouse_id,
                        on_hand=0,
                        reserved=0
                    )
                    db.add(stock)
                    db.flush()
            except Exception:
                # Concurrent transaction created it, re-query with row lock
                stock = db.query(StockLevel).filter(
                    StockLevel.variant_id == variant_id,
                    StockLevel.warehouse_id == target_warehouse_id
                ).with_for_update().first()

        prev_on_hand = stock.on_hand or 0
        reserved_count = stock.reserved or 0
        new_on_hand = prev_on_hand + quantity_delta

        if new_on_hand < 0:
            raise ValueError(
                f"Insufficient stock for variant {variant_id}. "
                f"On-hand: {prev_on_hand}, Requested delta: {quantity_delta}"
            )

        if new_on_hand < reserved_count:
            raise ValueError(
                f"Cannot reduce stock below reserved count ({reserved_count}) for variant {variant_id}. "
                f"Requested new on-hand would be {new_on_hand}."
            )

        stock.on_hand = new_on_hand
        stock.updated_at = datetime.datetime.now(datetime.timezone.utc)

        # Append-only ledger movement
        movement = InventoryMovement(
            variant_id=variant_id,
            warehouse_id=target_warehouse_id,
            movement_type=movement_type,
            quantity=quantity_delta,
            previous_on_hand=prev_on_hand,
            new_on_hand=new_on_hand,
            reference_id=reference_id,
            reference_type=reference_type,
            reason=reason,
            user_id=user_id
        )
        db.add(movement)
        db.flush()

        # Real-time notification broadcast
        try:
            variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
            sku = variant.sku if variant else f"VAR-{variant_id}"
            prod_name = variant.product.name if (variant and variant.product) else (variant.name if variant else f"Variant #{variant_id}")
            available = max(0, new_on_hand - reserved_count)
            broadcast_stock_change(
                variant_id=variant_id,
                sku=sku,
                product_name=prod_name,
                on_hand=new_on_hand,
                available=available,
                reason=reason
            )
        except Exception as e:
            logger.warning(f"Failed to broadcast stock change: {e}")

        return stock

    @staticmethod
    def reserve_stock(
        db: Session,
        variant_id: int,
        quantity: int,
        warehouse_id: Optional[int] = 1,
        reference_id: Optional[str] = None,
        reference_type: Optional[str] = "ORDER_RESERVE",
        reason: str = "Stock reserved for order",
        user_id: Optional[int] = None
    ) -> StockLevel:
        """
        Atomically reserves stock for an order without deducting on-hand units yet.
        Prevents overselling while order payment is being authorized.
        """
        target_warehouse_id = warehouse_id if warehouse_id is not None else 1
        stock = db.query(StockLevel).filter(
            StockLevel.variant_id == variant_id,
            StockLevel.warehouse_id == target_warehouse_id
        ).with_for_update().first()

        if not stock:
            raise ValueError(f"No stock record found for variant {variant_id} at warehouse {target_warehouse_id}.")

        on_hand = stock.on_hand or 0
        reserved = stock.reserved or 0
        available = on_hand - reserved

        if available < quantity:
            raise ValueError(
                f"Insufficient available stock for variant {variant_id}. "
                f"Available: {available}, Requested: {quantity}."
            )

        stock.reserved = reserved + quantity
        stock.updated_at = datetime.datetime.now(datetime.timezone.utc)

        movement = InventoryMovement(
            variant_id=variant_id,
            warehouse_id=target_warehouse_id,
            movement_type="RESERVATION",
            quantity=quantity,
            previous_on_hand=on_hand,
            new_on_hand=on_hand,
            reference_id=reference_id,
            reference_type=reference_type,
            reason=reason,
            user_id=user_id
        )
        db.add(movement)
        db.flush()

        try:
            variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
            sku = variant.sku if variant else f"VAR-{variant_id}"
            prod_name = variant.product.name if (variant and variant.product) else (variant.name if variant else f"Variant #{variant_id}")
            broadcast_stock_change(
                variant_id=variant_id,
                sku=sku,
                product_name=prod_name,
                on_hand=on_hand,
                available=max(0, on_hand - stock.reserved),
                reason=reason
            )
        except Exception as e:
            logger.warning(f"Failed to broadcast stock change: {e}")

        return stock

    @staticmethod
    def release_reservation(
        db: Session,
        variant_id: int,
        quantity: int,
        warehouse_id: Optional[int] = 1,
        reference_id: Optional[str] = None,
        reference_type: Optional[str] = "ORDER_CANCEL",
        reason: str = "Reservation released",
        user_id: Optional[int] = None
    ) -> StockLevel:
        """
        Atomically releases reserved stock back to available pool.
        Used when an order is cancelled or payment authorization fails/expires.
        """
        target_warehouse_id = warehouse_id if warehouse_id is not None else 1
        stock = db.query(StockLevel).filter(
            StockLevel.variant_id == variant_id,
            StockLevel.warehouse_id == target_warehouse_id
        ).with_for_update().first()

        if not stock:
            return None

        on_hand = stock.on_hand or 0
        stock.reserved = max(0, (stock.reserved or 0) - quantity)
        stock.updated_at = datetime.datetime.now(datetime.timezone.utc)

        movement = InventoryMovement(
            variant_id=variant_id,
            warehouse_id=target_warehouse_id,
            movement_type="RESERVATION_RELEASE",
            quantity=-quantity,
            previous_on_hand=on_hand,
            new_on_hand=on_hand,
            reference_id=reference_id,
            reference_type=reference_type,
            reason=reason,
            user_id=user_id
        )
        db.add(movement)
        db.flush()

        try:
            variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
            sku = variant.sku if variant else f"VAR-{variant_id}"
            prod_name = variant.product.name if (variant and variant.product) else (variant.name if variant else f"Variant #{variant_id}")
            broadcast_stock_change(
                variant_id=variant_id,
                sku=sku,
                product_name=prod_name,
                on_hand=on_hand,
                available=max(0, on_hand - stock.reserved),
                reason=reason
            )
        except Exception as e:
            logger.warning(f"Failed to broadcast stock change: {e}")

        return stock

    @staticmethod
    def commit_reservation_to_sale(
        db: Session,
        variant_id: int,
        quantity: int,
        warehouse_id: Optional[int] = 1,
        reference_id: Optional[str] = None,
        reference_type: Optional[str] = "ORDER",
        reason: str = "Committed reservation to sale upon confirmed order",
        user_id: Optional[int] = None
    ) -> StockLevel:
        """
        Atomically converts reserved stock into committed sold stock (deducts on_hand and clears reserved).
        """
        target_warehouse_id = warehouse_id if warehouse_id is not None else 1
        stock = db.query(StockLevel).filter(
            StockLevel.variant_id == variant_id,
            StockLevel.warehouse_id == target_warehouse_id
        ).with_for_update().first()

        if not stock:
            raise ValueError(f"No stock record found for variant {variant_id}.")

        prev_on_hand = stock.on_hand or 0
        prev_reserved = stock.reserved or 0
        if prev_reserved < quantity:
            raise ValueError(
                f"Cannot commit {quantity} units to sale: only {prev_reserved} units are reserved for variant {variant_id}."
            )
        if prev_on_hand < quantity:
            raise ValueError(
                f"Cannot commit {quantity} units to sale: only {prev_on_hand} units on hand for variant {variant_id}."
            )

        stock.reserved = prev_reserved - quantity
        stock.on_hand = prev_on_hand - quantity
        stock.updated_at = datetime.datetime.now(datetime.timezone.utc)

        movement = InventoryMovement(
            variant_id=variant_id,
            warehouse_id=target_warehouse_id,
            movement_type="SALE",
            quantity=-quantity,
            previous_on_hand=prev_on_hand,
            new_on_hand=stock.on_hand,
            reference_id=reference_id,
            reference_type=reference_type,
            reason=reason,
            user_id=user_id
        )
        db.add(movement)
        db.flush()

        try:
            variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
            sku = variant.sku if variant else f"VAR-{variant_id}"
            prod_name = variant.product.name if (variant and variant.product) else (variant.name if variant else f"Variant #{variant_id}")
            broadcast_stock_change(
                variant_id=variant_id,
                sku=sku,
                product_name=prod_name,
                on_hand=stock.on_hand,
                available=max(0, stock.on_hand - stock.reserved),
                reason=reason
            )
        except Exception as e:
            logger.warning(f"Failed to broadcast stock change: {e}")

        return stock

    @staticmethod
    def set_physical_count(
        db: Session,
        variant_id: int,
        target_on_hand: int,
        warehouse_id: Optional[int] = 1,
        reason: str = "Physical stock reconciliation",
        reference_id: Optional[str] = None,
        reference_type: str = "PHYSICAL_COUNT",
        user_id: Optional[int] = None
    ) -> StockLevel:
        """
        Atomically locks the stock row, validates reserved invariant, computes delta,
        sets exact target count, writes ledger movement, and triggers real-time broadcast.
        """
        target_warehouse_id = warehouse_id if warehouse_id is not None else 1

        stock = db.query(StockLevel).filter(
            StockLevel.variant_id == variant_id,
            StockLevel.warehouse_id == target_warehouse_id
        ).with_for_update().first()

        if not stock:
            try:
                with db.begin_nested():
                    stock = StockLevel(
                        variant_id=variant_id,
                        warehouse_id=target_warehouse_id,
                        on_hand=0,
                        reserved=0
                    )
                    db.add(stock)
                    db.flush()
            except Exception:
                stock = db.query(StockLevel).filter(
                    StockLevel.variant_id == variant_id,
                    StockLevel.warehouse_id == target_warehouse_id
                ).with_for_update().first()

        prev_on_hand = stock.on_hand or 0
        reserved_count = stock.reserved or 0
        new_on_hand = max(0, target_on_hand)

        if new_on_hand < reserved_count:
            raise ValueError(
                f"Target physical count ({new_on_hand}) cannot be less than reserved count ({reserved_count}) for variant {variant_id}."
            )

        quantity_delta = new_on_hand - prev_on_hand
        stock.on_hand = new_on_hand
        stock.updated_at = datetime.datetime.now(datetime.timezone.utc)

        if quantity_delta != 0:
            movement = InventoryMovement(
                variant_id=variant_id,
                warehouse_id=target_warehouse_id,
                movement_type="PHYSICAL_COUNT",
                quantity=quantity_delta,
                previous_on_hand=prev_on_hand,
                new_on_hand=new_on_hand,
                reference_id=reference_id,
                reference_type=reference_type,
                reason=reason,
                user_id=user_id
            )
            db.add(movement)
            db.flush()

            try:
                variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
                sku = variant.sku if variant else f"VAR-{variant_id}"
                prod_name = variant.product.name if (variant and variant.product) else (variant.name if variant else f"Variant #{variant_id}")
                available = max(0, new_on_hand - reserved_count)
                broadcast_stock_change(
                    variant_id=variant_id,
                    sku=sku,
                    product_name=prod_name,
                    on_hand=new_on_hand,
                    available=available,
                    reason=reason
                )
            except Exception as e:
                logger.warning(f"Failed to broadcast stock change: {e}")

        return {
            "stock": stock,
            "previous_on_hand": prev_on_hand,
            "new_on_hand": new_on_hand,
            "delta": quantity_delta
        }
