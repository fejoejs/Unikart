import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.cart import Cart, CartItem, Coupon
from app.models.catalog import ProductVariant, Price, ProductImage
from app.schemas.cart import CartResponse, CartItemCreate, CartItemUpdate, CartItemResponse, CouponApplyRequest
from app.api.v1.deps import get_current_user_optional
from app.models.auth import User
from app.models.customer import Customer

router = APIRouter(prefix="/cart", tags=["Shopping Cart"])

def get_or_create_cart(db: Session, session_token: Optional[str] = None, user: Optional[User] = None) -> Cart:
    customer_id = None
    if user:
        if hasattr(user, "customer") and user.customer:
            customer_id = user.customer.id
        else:
            cust = db.query(Customer).filter(Customer.user_id == user.id).first()
            if cust:
                customer_id = cust.id

    if customer_id:
        # Authenticated customer: retrieve customer's authoritative cart
        cart = db.query(Cart).filter(Cart.customer_id == customer_id).first()
        
        # Check if an anonymous guest cart exists with items to merge
        if session_token:
            guest_cart = db.query(Cart).filter(
                Cart.session_token == session_token,
                Cart.customer_id.is_(None)
            ).first()
            if guest_cart and guest_cart.items:
                if not cart:
                    # Validate items against available stock before claiming
                    for g_item in list(guest_cart.items):
                        v = db.query(ProductVariant).filter(ProductVariant.id == g_item.variant_id).first()
                        if not v or not v.is_active:
                            db.delete(g_item)
                            continue
                        avail = sum(s.available for s in v.stock_levels)
                        if avail <= 0:
                            db.delete(g_item)
                        elif g_item.quantity > avail:
                            g_item.quantity = avail
                    guest_cart.customer_id = customer_id
                    db.commit()
                    db.refresh(guest_cart)
                    return guest_cart
                else:
                    # Merge guest items into existing customer cart with available stock validation
                    for g_item in list(guest_cart.items):
                        v = db.query(ProductVariant).filter(ProductVariant.id == g_item.variant_id).first()
                        if not v or not v.is_active:
                            continue
                        avail = sum(s.available for s in v.stock_levels)
                        if avail <= 0:
                            continue

                        existing = db.query(CartItem).filter(
                            CartItem.cart_id == cart.id,
                            CartItem.variant_id == g_item.variant_id
                        ).first()
                        if existing:
                            existing.quantity = min(existing.quantity + g_item.quantity, avail)
                        else:
                            db.add(CartItem(
                                cart_id=cart.id,
                                variant_id=g_item.variant_id,
                                quantity=min(g_item.quantity, avail)
                            ))
                    db.delete(guest_cart)
                    db.commit()
                    db.refresh(cart)

        if not cart:
            token = f"cust_sess_{uuid.uuid4().hex}"
            cart = Cart(session_token=token, customer_id=customer_id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
        return cart

    # Guest user: ONLY match carts where customer_id is None
    # NEVER allow a guest session token to access or hijack a customer-owned cart
    cart = None
    if session_token:
        cart = db.query(Cart).filter(
            Cart.session_token == session_token,
            Cart.customer_id.is_(None)
        ).first()

    if not cart:
        token = session_token if (session_token and not session_token.startswith("cust_sess_")) else f"sess_{uuid.uuid4().hex}"
        # Ensure token uniqueness
        existing_any = db.query(Cart).filter(Cart.session_token == token).first()
        if existing_any:
            token = f"sess_{uuid.uuid4().hex}"
        cart = Cart(session_token=token, customer_id=None)
        db.add(cart)
        db.commit()
        db.refresh(cart)

    return cart

def verify_cart_ownership(db: Session, cart: Cart, user: Optional[User], session_token: Optional[str]):
    customer_id = None
    if user:
        if hasattr(user, "customer") and user.customer:
            customer_id = user.customer.id
        else:
            cust = db.query(Customer).filter(Customer.user_id == user.id).first()
            if cust:
                customer_id = cust.id

    if cart.customer_id is not None:
        if not customer_id or cart.customer_id != customer_id:
            raise HTTPException(status_code=403, detail="Access denied: You do not own this cart.")
        return

    # For guest carts (customer_id is None):
    if not session_token or cart.session_token != session_token:
        raise HTTPException(status_code=403, detail="Access denied: Cart verification failed.")

def build_cart_response(db: Session, cart: Cart) -> CartResponse:
    item_responses = []
    subtotal_paise = 0
    total_qty = 0

    for item in cart.items:
        v = item.variant
        price_rec = db.query(Price).filter(Price.variant_id == v.id, Price.is_active == True).first()
        unit_price = price_rec.selling_price_paise if price_rec else 0
        mrp_price = price_rec.mrp_paise if price_rec else unit_price
        line_total = unit_price * item.quantity
        subtotal_paise += line_total
        total_qty += item.quantity

        img = db.query(ProductImage).filter(ProductImage.product_id == v.product_id, ProductImage.is_primary == True).first()
        img_url = img.url if img else (v.product.images[0].url if (v.product and v.product.images) else None)
        avail = sum(s.available for s in v.stock_levels)
        item_in_stock = (avail >= item.quantity) and (v.is_active if hasattr(v, 'is_active') else True)

        item_responses.append(CartItemResponse(
            id=item.id,
            variant_id=item.variant_id,
            product_id=v.product_id,
            product_name=v.product.name if v.product else "Unknown Product",
            variant_name=v.name,
            sku=v.sku,
            unit_price_paise=unit_price,
            mrp_paise=mrp_price,
            quantity=item.quantity,
            total_price_paise=line_total,
            line_total_paise=line_total,
            image_url=img_url,
            in_stock=item_in_stock,
            available_qty=avail
        ))

    # Calculate coupon
    discount_paise = 0
    coupon_code = None
    if cart.coupon_id:
        coupon = db.query(Coupon).filter(Coupon.id == cart.coupon_id, Coupon.is_active == True).first()
        if coupon and subtotal_paise >= coupon.min_order_amount_paise:
            coupon_code = coupon.code
            if coupon.discount_type == "PERCENTAGE":
                pct = coupon.percentage_rate or 0.0
                disc = round(subtotal_paise * (pct / 100.0))
                if coupon.max_discount_paise:
                    disc = min(disc, coupon.max_discount_paise)
                discount_paise = disc
            else:
                discount_paise = min(coupon.discount_value_paise or 0, subtotal_paise)

    # Tax estimate (18% standard)
    tax_estimate_paise = round((subtotal_paise - discount_paise) * 0.18 / 1.18) if subtotal_paise > discount_paise else 0
    estimated_total_paise = max(0, subtotal_paise - discount_paise)

    return CartResponse(
        id=cart.id,
        session_token=cart.session_token,
        items=item_responses,
        coupon_code=coupon_code,
        discount_paise=discount_paise,
        subtotal_paise=subtotal_paise,
        estimated_tax_paise=tax_estimate_paise,
        estimated_total_paise=estimated_total_paise,
        total_price_paise=estimated_total_paise,
        total_items_count=total_qty
    )

@router.get("", response_model=CartResponse)
def get_cart(
    session_token: Optional[str] = Query(None),
    x_session_token: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    token = session_token or x_session_token
    cart = get_or_create_cart(db, token, user)
    verify_cart_ownership(db, cart, user, token or cart.session_token)
    return build_cart_response(db, cart)

@router.delete("", response_model=CartResponse)
def clear_cart(
    session_token: Optional[str] = Query(None),
    x_session_token: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    token = session_token or x_session_token
    cart = get_or_create_cart(db, token, user)
    verify_cart_ownership(db, cart, user, token or cart.session_token)
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    cart.coupon_id = None
    db.commit()
    return build_cart_response(db, cart)

@router.post("/items", response_model=CartResponse)
def add_cart_item(
    item_in: CartItemCreate,
    session_token: Optional[str] = Query(None),
    x_session_token: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    token = session_token or x_session_token
    cart = get_or_create_cart(db, token, user)
    verify_cart_ownership(db, cart, user, token or cart.session_token)

    # Check variant exists and is active
    variant = db.query(ProductVariant).filter(ProductVariant.id == item_in.variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Product variant not found.")

    if hasattr(variant, 'is_active') and not variant.is_active:
        raise HTTPException(status_code=400, detail="This product variant is currently unavailable.")
    if variant.product and hasattr(variant.product, 'is_active') and not variant.product.is_active:
        raise HTTPException(status_code=400, detail="This product is currently inactive.")

    existing_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.id,
        CartItem.variant_id == item_in.variant_id
    ).first()

    # Available stock validation
    avail = sum(s.available for s in variant.stock_levels)
    target_qty = (existing_item.quantity + item_in.quantity) if existing_item else item_in.quantity
    if target_qty > avail:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot add {item_in.quantity} items. Only {avail} unit(s) available in stock." if avail > 0 else "This product is currently out of stock."
        )

    if existing_item:
        existing_item.quantity += item_in.quantity
    else:
        new_item = CartItem(
            cart_id=cart.id,
            variant_id=item_in.variant_id,
            quantity=item_in.quantity
        )
        db.add(new_item)

    db.commit()
    db.refresh(cart)
    return build_cart_response(db, cart)

@router.patch("/items/{item_id}", response_model=CartResponse)
@router.put("/items/{item_id}", response_model=CartResponse)
def update_cart_item(
    item_id: int,
    item_update: CartItemUpdate,
    session_token: Optional[str] = Query(None),
    x_session_token: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    item = db.query(CartItem).filter(CartItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found.")

    token = session_token or x_session_token
    cart = item.cart or db.query(Cart).filter(Cart.id == item.cart_id).first()
    verify_cart_ownership(db, cart, user, token)

    if item_update.quantity <= 0:
        cart_id = item.cart_id
        db.delete(item)
        db.commit()
        cart = db.query(Cart).filter(Cart.id == cart_id).first()
        return build_cart_response(db, cart)

    variant = item.variant
    avail = sum(s.available for s in variant.stock_levels)
    if item_update.quantity > avail:
        raise HTTPException(
            status_code=400,
            detail=f"Only {avail} unit(s) available in stock." if avail > 0 else "This product is currently out of stock."
        )

    item.quantity = item_update.quantity
    db.commit()
    cart = db.query(Cart).filter(Cart.id == item.cart_id).first()
    return build_cart_response(db, cart)

@router.delete("/items/{item_id}", response_model=CartResponse)
def delete_cart_item(
    item_id: int,
    session_token: Optional[str] = Query(None),
    x_session_token: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    item = db.query(CartItem).filter(CartItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found.")

    token = session_token or x_session_token
    cart = item.cart or db.query(Cart).filter(Cart.id == item.cart_id).first()
    verify_cart_ownership(db, cart, user, token)

    cart_id = item.cart_id
    db.delete(item)
    db.commit()
    cart = db.query(Cart).filter(Cart.id == cart_id).first()
    return build_cart_response(db, cart)

@router.post("/coupon", response_model=CartResponse)
def apply_coupon(
    req: CouponApplyRequest,
    session_token: Optional[str] = Query(None),
    x_session_token: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    token = session_token or x_session_token
    cart = get_or_create_cart(db, token, user)
    verify_cart_ownership(db, cart, user, token or cart.session_token)

    target_code = (req.coupon_code or req.code or "").strip().upper()
    if not target_code:
        raise HTTPException(status_code=400, detail="Coupon code is required.")

    coupon = db.query(Coupon).filter(
        Coupon.code == target_code,
        Coupon.is_active == True
    ).first()

    if not coupon:
        raise HTTPException(status_code=400, detail="Invalid or expired coupon code.")

    cart.coupon_id = coupon.id
    db.commit()
    return build_cart_response(db, cart)

@router.delete("/coupon", response_model=CartResponse)
def remove_coupon(
    session_token: Optional[str] = Query(None),
    x_session_token: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    token = session_token or x_session_token
    cart = get_or_create_cart(db, token, user)
    verify_cart_ownership(db, cart, user, token or cart.session_token)

    cart.coupon_id = None
    db.commit()
    return build_cart_response(db, cart)
