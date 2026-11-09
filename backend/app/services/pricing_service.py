import datetime
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.catalog import ProductVariant, Price, Product
from app.models.cart import Coupon

class PricingService:
    @staticmethod
    def calculate_cart_or_order_pricing(
        db: Session,
        items_requested: List[Dict[str, int]], # [{"variant_id": 1, "quantity": 1}]
        destination_state_code: str = "29",
        coupon_code: Optional[str] = None,
        delivery_option: Optional[str] = "standard"
    ) -> Dict[str, Any]:
        """
        Recalculates exact pricing on the server. Never trusts browser input.
        All currency calculations use exact integer paise.
        """
        if not items_requested:
            raise ValueError("Cannot calculate pricing for an empty items list.")

        subtotal_paise = 0
        raw_items = []
        is_interstate = (str(destination_state_code).strip() != str(settings.STORE_STATE_CODE).strip())

        for req in items_requested:
            variant_id = req.get("variant_id")
            quantity = int(req.get("quantity", 1))
            if quantity <= 0:
                raise ValueError("Item quantity must be a positive integer greater than zero.")

            variant = None
            if variant_id:
                variant = db.query(ProductVariant).filter(
                    ProductVariant.id == variant_id,
                    ProductVariant.is_active == True
                ).first()

            if not variant:
                p_id = req.get("product_id") or req.get("id")
                if p_id:
                    if isinstance(p_id, int) or (isinstance(p_id, str) and p_id.isdigit()):
                        variant = db.query(ProductVariant).filter(
                            ProductVariant.product_id == int(p_id),
                            ProductVariant.is_active == True
                        ).first()
                    elif isinstance(p_id, str):
                        variant = db.query(ProductVariant).filter(
                            (ProductVariant.sku == p_id) | (ProductVariant.name == p_id),
                            ProductVariant.is_active == True
                        ).first()

            if not variant:
                raise ValueError(f"Product variant ID {variant_id or req.get('product_id') or req.get('id')} is invalid or inactive.")

            # Get active price
            price_rec = db.query(Price).filter(
                Price.variant_id == variant.id,
                Price.is_active == True
            ).first()
            if not price_rec:
                raise ValueError(f"No active price configured for variant {variant.sku}.")

            unit_selling_price_paise = price_rec.selling_price_paise
            unit_cost_paise = price_rec.purchase_cost_paise
            line_subtotal_paise = unit_selling_price_paise * quantity
            subtotal_paise += line_subtotal_paise
            gst_rate = float(variant.product.gst_rate) if variant.product and variant.product.gst_rate is not None else settings.DEFAULT_GST_RATE_PERCENT

            raw_items.append({
                "variant": variant,
                "variant_id": variant.id,
                "product_name": variant.product.name if variant.product else variant.name,
                "variant_name": variant.name,
                "sku": variant.sku,
                "barcode": variant.barcode,
                "hsn_code": variant.product.hsn_code if variant.product else "8517",
                "quantity": quantity,
                "unit_price_paise": unit_selling_price_paise,
                "unit_cost_paise": unit_cost_paise,
                "mrp_paise": price_rec.mrp_paise,
                "line_subtotal_paise": line_subtotal_paise,
                "gst_rate": gst_rate
            })

        # Calculate and validate Coupon Discount
        discount_paise = 0
        applied_coupon = None
        if coupon_code and coupon_code.strip():
            clean_code = coupon_code.strip().upper()
            coupon = db.query(Coupon).filter(
                Coupon.code == clean_code,
                Coupon.is_active == True
            ).first()
            if not coupon:
                raise ValueError(f"Coupon code '{clean_code}' is invalid or expired.")

            now_utc = datetime.datetime.now(datetime.timezone.utc)
            if coupon.valid_from:
                v_from = coupon.valid_from if coupon.valid_from.tzinfo else coupon.valid_from.replace(tzinfo=datetime.timezone.utc)
                if now_utc < v_from:
                    raise ValueError(f"Coupon code '{clean_code}' is not valid yet.")
            if coupon.valid_to:
                v_to = coupon.valid_to if coupon.valid_to.tzinfo else coupon.valid_to.replace(tzinfo=datetime.timezone.utc)
                if now_utc > v_to:
                    raise ValueError(f"Coupon code '{clean_code}' has expired.")

            if coupon.usage_limit is not None and coupon.times_used >= coupon.usage_limit:
                raise ValueError(f"Coupon code '{clean_code}' has reached its usage limit.")

            if subtotal_paise < coupon.min_order_amount_paise:
                min_amt = coupon.min_order_amount_paise / 100.0
                raise ValueError(f"Coupon '{clean_code}' requires a minimum order of ₹{min_amt:,.2f}.")

            if coupon.discount_type == "PERCENTAGE":
                calc_discount = round(subtotal_paise * (coupon.percentage_rate / 100.0))
                if coupon.max_discount_paise:
                    calc_discount = min(calc_discount, coupon.max_discount_paise)
                discount_paise = min(calc_discount, subtotal_paise)
            else:
                discount_paise = min(coupon.discount_value_paise, subtotal_paise)

            applied_coupon = coupon.code

        # Pro-rata apportion coupon discount to line items, then compute GST
        total_tax_paise = 0
        cgst_paise = 0
        sgst_paise = 0
        igst_paise = 0
        validated_items = []
        remaining_discount = discount_paise

        for i, it in enumerate(raw_items):
            if subtotal_paise > 0 and discount_paise > 0:
                if i == len(raw_items) - 1:
                    item_discount_paise = remaining_discount
                else:
                    item_discount_paise = round(discount_paise * (it["line_subtotal_paise"] / subtotal_paise))
                    item_discount_paise = min(item_discount_paise, remaining_discount)
                    remaining_discount -= item_discount_paise
            else:
                item_discount_paise = 0

            net_line_paise = max(0, it["line_subtotal_paise"] - item_discount_paise)
            gst_rate = it["gst_rate"]
            line_base_price_paise = round(net_line_paise / (1 + (gst_rate / 100.0)))
            line_tax_paise = net_line_paise - line_base_price_paise

            if is_interstate:
                line_cgst = 0
                line_sgst = 0
                line_igst = line_tax_paise
            else:
                line_cgst = round(line_tax_paise / 2)
                line_sgst = line_tax_paise - line_cgst
                line_igst = 0

            total_tax_paise += line_tax_paise
            cgst_paise += line_cgst
            sgst_paise += line_sgst
            igst_paise += line_igst

            it_copy = dict(it)
            it_copy.update({
                "discount_paise": item_discount_paise,
                "line_tax_paise": line_tax_paise,
                "line_cgst_paise": line_cgst,
                "line_sgst_paise": line_sgst,
                "line_igst_paise": line_igst,
                "total_paise": net_line_paise
            })
            validated_items.append(it_copy)

        # Shipping Policy: Free standard delivery on orders >= ₹2,000 (200000 paise), else ₹150 (15000 paise)
        shipping_fee_paise = 0
        if subtotal_paise > 0 and subtotal_paise < 200000:
            shipping_fee_paise = 15000
        
        # Express delivery surcharge: ₹99 (9900 paise)
        if delivery_option and delivery_option.strip().lower() == "express":
            shipping_fee_paise += 9900

        final_payable_paise = max(0, subtotal_paise - discount_paise + shipping_fee_paise)

        return {
            "subtotal_paise": subtotal_paise,
            "discount_paise": discount_paise,
            "shipping_fee_paise": shipping_fee_paise,
            "total_tax_paise": total_tax_paise,
            "cgst_paise": cgst_paise,
            "sgst_paise": sgst_paise,
            "igst_paise": igst_paise,
            "is_interstate": is_interstate,
            "total_amount_paise": final_payable_paise,
            "coupon_applied": applied_coupon,
            "items": validated_items
        }
