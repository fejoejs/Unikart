from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import or_
from app.core.database import get_db
from app.models.catalog import Category, Brand, Product, ProductVariant, Price, ProductImage, ProductReview
from app.models.inventory import StockLevel
from app.schemas.catalog import CategoryResponse, BrandResponse, ProductResponse, ProductVariantResponse, PriceResponse, ProductImageResponse, ProductReviewCreate, ProductReviewResponse
from app.api.v1.deps import get_current_user_optional, get_current_user
from app.models.auth import User

router = APIRouter(prefix="/products", tags=["Catalog"])

@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).filter(Category.is_active == True, Category.slug != "all").all()

@router.get("/brands", response_model=List[BrandResponse])
def list_brands(db: Session = Depends(get_db)):
    return db.query(Brand).filter(Brand.is_active == True).all()

@router.get("", response_model=List[ProductResponse])
def list_products(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Search term for name, description, SKU or brand"),
    search: Optional[str] = Query(None, description="Alias for search term"),
    category: Optional[str] = Query(None, description="Category slug"),
    brand: Optional[str] = Query(None, description="Brand slug"),
    min_price: Optional[int] = Query(None, description="Minimum price in paise"),
    max_price: Optional[int] = Query(None, description="Maximum price in paise"),
    in_stock: Optional[bool] = Query(None, description="Filter only in-stock products"),
    include_inactive: bool = Query(False, description="Whether to include inactive products (staff only)"),
    sort: Optional[str] = Query("popular", description="Sort: popular, price_asc, price_desc, rating, newest"),
    skip: int = 0,
    limit: int = 500,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    # Guard include_inactive strictly behind authorized staff roles
    user_roles = [r.name for r in current_user.roles] if (current_user and getattr(current_user, "roles", None)) else []
    is_staff = any(r in ["admin", "manager", "inventory_staff", "owner"] for r in user_roles)
    if include_inactive and not is_staff:
        include_inactive = False

    query = db.query(Product).options(
        joinedload(Product.brand),
        joinedload(Product.category),
        selectinload(Product.images),
        selectinload(Product.variants).selectinload(ProductVariant.prices),
        selectinload(Product.variants).selectinload(ProductVariant.stock_levels),
    )
    if not include_inactive:
        query = query.filter(Product.is_active == True)

    if isinstance(category, str) and category and category.lower() != "all":
        clean_cat = category.strip().lower()
        if clean_cat == "electronics":
            query = query.join(Product.category).filter(
                Category.slug.in_(["electronics", "smartphones", "laptops", "audio", "tablets", "gaming", "accessories", "tv-home", "cameras", "wearables"]) |
                Category.name.ilike("%electronic%")
            )
        else:
            query = query.join(Product.category).filter(
                (Category.slug == clean_cat) | (Category.name.ilike(f"%{clean_cat}%"))
            )

    if isinstance(brand, str) and brand:
        query = query.join(Brand).filter(Brand.slug == brand)

    search_term = q or search
    if isinstance(search_term, str) and search_term.strip():
        st = f"%{search_term.strip()}%"
        query = query.outerjoin(Product.variants).outerjoin(Product.brand).filter(
            or_(
                Product.name.ilike(st),
                Product.description.ilike(st),
                Product.short_description.ilike(st),
                ProductVariant.sku.ilike(st),
                Brand.name.ilike(st)
            )
        ).distinct()

    # Pre-sort deterministically in SQL before offset/limit pagination
    if sort == "newest":
        query = query.order_by(Product.id.desc())
    elif sort == "rating":
        query = query.order_by(Product.rating.desc().nullslast(), Product.id.asc())
    else:
        query = query.order_by(Product.id.asc())

    products = query.offset(skip).limit(limit).all()

    # Hydrate current prices and stock availability
    results = []
    for prod in products:
        variant_responses = []
        for v in prod.variants:
            active_price = next((p for p in v.prices if p.is_active), None)
            total_on_hand = sum(s.on_hand for s in v.stock_levels)
            total_avail = sum(s.available for s in v.stock_levels)
            
            # Apply price filter if provided
            if isinstance(min_price, int) and active_price and active_price.selling_price_paise < min_price:
                continue
            if isinstance(max_price, int) and active_price and active_price.selling_price_paise > max_price:
                continue
            if in_stock and total_avail <= 0:
                continue

            variant_responses.append(ProductVariantResponse(
                id=v.id,
                product_id=v.product_id,
                sku=v.sku,
                barcode=v.barcode,
                name=v.name,
                color=v.color,
                storage=v.storage,
                weight_grams=v.weight_grams,
                is_active=v.is_active,
                prices=[PriceResponse.model_validate(p) for p in v.prices if p.is_active],
                current_price=PriceResponse.model_validate(active_price) if active_price else None,
                stock_on_hand=total_on_hand,
                stock_available=total_avail
            ))

        if not variant_responses and (min_price is not None or max_price is not None or in_stock):
            continue

        first_vr = next((vr for vr in variant_responses if vr.is_active), None) or (variant_responses[0] if variant_responses else None)
        calc_sp = round(first_vr.current_price.selling_price_paise / 100, 2) if (first_vr and first_vr.current_price) else 0.0
        calc_mrp = round(first_vr.current_price.mrp_paise / 100, 2) if (first_vr and first_vr.current_price) else calc_sp
        calc_stock = sum((vr.stock_available or 0) for vr in variant_responses)
        calc_cost = (first_vr.current_price.purchase_cost_paise / 100.0) if (is_staff and first_vr and getattr(first_vr.current_price, "purchase_cost_paise", None)) else 0.0
        calc_status = "out_of_stock" if calc_stock <= 0 else ("low_stock" if calc_stock <= 10 else "in_stock")

        p_dict = ProductResponse(
            id=prod.id,
            name=prod.name,
            slug=prod.slug,
            description=prod.description or prod.short_description or "",
            short_description=prod.short_description or prod.description or "",
            brand_id=prod.brand_id,
            category_id=prod.category_id,
            brand=BrandResponse.model_validate(prod.brand) if prod.brand else None,
            category=CategoryResponse.model_validate(prod.category) if prod.category else None,
            is_active=prod.is_active,
            requires_serial=prod.requires_serial,
            warranty_months=prod.warranty_months,
            hsn_code=prod.hsn_code,
            gst_rate=prod.gst_rate,
            rating=prod.rating,
            review_count=prod.review_count,
            specifications=prod.specifications,
            variants=variant_responses,
            images=[ProductImageResponse.model_validate(img) for img in sorted(prod.images, key=lambda x: (not x.is_primary, x.sort_order, x.id))],
            primary_image=sorted(prod.images, key=lambda x: (not x.is_primary, x.sort_order, x.id))[0].url if prod.images else None,
            price=calc_sp,
            selling_price=calc_sp,
            originalPrice=calc_mrp,
            mrp=calc_mrp,
            purchase_cost=calc_cost,
            purchaseCost=calc_cost,
            total_stock=calc_stock,
            stock_quantity=calc_stock,
            stock_status=calc_status
        )
        results.append(p_dict)

    if sort == "price_asc":
        results.sort(key=lambda x: x.variants[0].current_price.selling_price_paise if (x.variants and x.variants[0].current_price) else 0)
    elif sort == "price_desc":
        results.sort(key=lambda x: x.variants[0].current_price.selling_price_paise if (x.variants and x.variants[0].current_price) else 0, reverse=True)

    return results

@router.get("/{identifier}", response_model=ProductResponse)
def get_product_by_slug(identifier: str, db: Session = Depends(get_db)):
    query = db.query(Product).filter(Product.is_active == True)
    if identifier.isdigit():
        prod = query.filter((Product.id == int(identifier)) | (Product.slug == identifier)).first()
    else:
        prod = query.filter(Product.slug == identifier).first()
    if not prod:
        raise HTTPException(status_code=404, detail=f"Product '{identifier}' not found.")

    variant_responses = []
    for v in prod.variants:
        active_price = next((p for p in v.prices if p.is_active), None)
        total_on_hand = sum(s.on_hand for s in v.stock_levels)
        total_avail = sum(s.available for s in v.stock_levels)
        
        variant_responses.append(ProductVariantResponse(
            id=v.id,
            product_id=v.product_id,
            sku=v.sku,
            barcode=v.barcode,
            name=v.name,
            color=v.color,
            storage=v.storage,
            weight_grams=v.weight_grams,
            is_active=v.is_active,
            prices=[PriceResponse.model_validate(p) for p in v.prices if p.is_active],
            current_price=PriceResponse.model_validate(active_price) if active_price else None,
            stock_on_hand=total_on_hand,
            stock_available=total_avail
        ))

    first_var_model = next((v for v in prod.variants if v.is_active), None) or (prod.variants[0] if prod.variants else None)
    active_pr = next((pr for pr in first_var_model.prices if pr.is_active), None) if first_var_model else None
    top_price = (active_pr.selling_price_paise / 100.0) if active_pr else 0.0
    top_mrp = (active_pr.mrp_paise / 100.0) if active_pr else top_price
    top_cost = (active_pr.purchase_cost_paise / 100.0) if (active_pr and getattr(active_pr, "purchase_cost_paise", None)) else 0.0
    top_stock = sum((v.stock_available or 0) for v in variant_responses)
    top_status = "out_of_stock" if top_stock <= 0 else ("low_stock" if top_stock <= 10 else "in_stock")

    return ProductResponse(
        id=prod.id,
        name=prod.name,
        slug=prod.slug,
        description=prod.description,
        short_description=prod.short_description,
        brand_id=prod.brand_id,
        category_id=prod.category_id,
        brand=BrandResponse.model_validate(prod.brand) if prod.brand else None,
        category=CategoryResponse.model_validate(prod.category) if prod.category else None,
        is_active=prod.is_active,
        requires_serial=prod.requires_serial,
        warranty_months=prod.warranty_months,
        hsn_code=prod.hsn_code,
        gst_rate=prod.gst_rate,
        rating=prod.rating,
        review_count=prod.review_count,
        specifications=prod.specifications,
        price=top_price,
        selling_price=top_price,
        originalPrice=top_mrp,
        mrp=top_mrp,
        purchase_cost=top_cost,
        purchaseCost=top_cost,
        total_stock=top_stock,
        stock_quantity=top_stock,
        stock_status=top_status,
        variants=variant_responses,
        images=[ProductImageResponse.model_validate(img) for img in sorted(prod.images, key=lambda x: (not x.is_primary, x.sort_order, x.id))],
        primary_image=sorted(prod.images, key=lambda x: (not x.is_primary, x.sort_order, x.id))[0].url if prod.images else None
    )

@router.get("/{id_or_slug}/reviews", response_model=List[ProductReviewResponse])
def get_product_reviews(
    id_or_slug: str,
    db: Session = Depends(get_db)
):
    prod = None
    if id_or_slug.isdigit():
        prod = db.query(Product).filter(Product.id == int(id_or_slug)).first()
    if not prod:
        prod = db.query(Product).filter(Product.slug == id_or_slug).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found.")

    reviews = db.query(ProductReview).filter(ProductReview.product_id == prod.id).order_by(ProductReview.created_at.desc()).all()
    return reviews

@router.post("/{id_or_slug}/reviews", response_model=ProductReviewResponse)
def submit_product_review(
    id_or_slug: str,
    review_in: ProductReviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    prod = None
    if id_or_slug.isdigit():
        prod = db.query(Product).filter(Product.id == int(id_or_slug)).first()
    if not prod:
        prod = db.query(Product).filter(Product.slug == id_or_slug).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found.")

    if review_in.rating < 1 or review_in.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5 stars.")

    # Prevent duplicate reviews from the same user on the same product
    existing_review = db.query(ProductReview).filter(
        ProductReview.product_id == prod.id,
        ProductReview.user_id == user.id
    ).first()
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already submitted a review for this product.")

    # Check whether the customer actually purchased and completed an order for this product
    from app.models.customer import Customer
    from app.models.order import Order, OrderItem
    user_customers = db.query(Customer).filter((Customer.user_id == user.id) | (Customer.email == user.email)).all()
    user_cust_ids = [c.id for c in user_customers]

    is_verified = False
    if user_cust_ids:
        variant_ids = [v.id for v in prod.variants]
        if variant_ids:
            qualifying = db.query(OrderItem).join(Order).filter(
                Order.customer_id.in_(user_cust_ids),
                Order.payment_status == "PAID",
                OrderItem.variant_id.in_(variant_ids)
            ).first()
            if qualifying:
                is_verified = True

    author = user.full_name or (user.email.split("@")[0] if user.email else "Verified Customer")

    new_review = ProductReview(
        product_id=prod.id,
        user_id=user.id,
        author_name=author,
        rating=review_in.rating,
        title=review_in.title.strip() if review_in.title else None,
        comment=review_in.comment.strip(),
        is_verified_purchase=is_verified,
    )
    db.add(new_review)
    db.flush()

    # Recalculate authoritative average rating and review count
    all_reviews = db.query(ProductReview).filter(ProductReview.product_id == prod.id).all()
    prod.review_count = len(all_reviews)
    prod.rating = round(sum(r.rating for r in all_reviews) / len(all_reviews), 1)

    db.commit()
    db.refresh(new_review)
    return new_review

