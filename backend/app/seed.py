"""
UNIKART Canonical Database Seed Script
Creates base roles, administrative and inventory staff accounts, primary warehouse,
governance feature flags, and authoritative 123 e-commerce products catalog across 14 departments
with active variants, pricing, and stock levels.
"""
import sys
import os
import re
import json
import datetime
from sqlalchemy.orm import Session

# Add backend directory to sys.path if not present
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.auth import User, Role, Permission
from app.models.catalog import Category, Brand, Product, ProductVariant, Price, ProductImage
from app.models.inventory import Warehouse, StockLevel, InventoryMovement
from app.models.hr import Employee, SalaryStructure
from app.models.governance import FeatureFlag
from app.models.cart import CartItem
from app.models.order import OrderItem

def make_ean13(idx: int) -> str:
    raw12 = f"890{idx:09d}"
    s = sum(int(raw12[i]) if i % 2 == 0 else int(raw12[i]) * 3 for i in range(12))
    check = (10 - (s % 10)) % 10
    return f"{raw12}{check}"

HSN_CODES = {
    "electronics": "85171300",
    "fashion": "62034200",
    "footwear": "64039990",
    "home-kitchen": "82055100",
    "beauty": "33049990",
    "grocery": "21069099",
    "sports": "95069990",
    "toys": "95030030",
    "furniture": "94036000",
    "books": "49019900",
    "jewellery": "71131930",
    "baby": "95030010",
    "automotive": "87082900",
    "pets": "23091000",
}

def seed_database(db: Session = None):
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # 1. System Roles
        roles_data = [
            {"name": "admin", "description": "System Administrator with full access", "is_system": True},
            {"name": "owner", "description": "Business Owner", "is_system": True},
            {"name": "inventory_staff", "description": "Inventory and fulfillment staff", "is_system": True},
            {"name": "inventory", "description": "Inventory operations", "is_system": True},
            {"name": "customer", "description": "E-Commerce retail customer", "is_system": True},
        ]
        roles_map = {}
        for r_info in roles_data:
            role = db.query(Role).filter(Role.name == r_info["name"]).first()
            if not role:
                role = Role(name=r_info["name"], description=r_info["description"], is_system=r_info["is_system"], is_active=True)
                db.add(role)
                db.flush()
            roles_map[r_info["name"]] = role

        # 2. Base Admin and Inventory Staff Users
        admin_user = db.query(User).filter(User.email == "admin@unikart.in").first()
        if not admin_user:
            admin_user = User(
                email="admin@unikart.in",
                hashed_password=get_password_hash("Admin@123"),
                full_name="System Admin",
                phone="+919876543210",
                is_active=True,
                must_change_password=False
            )
            admin_user.roles = [roles_map["admin"], roles_map["owner"]]
            db.add(admin_user)
            db.flush()

        inventory_user = db.query(User).filter(User.email == "inventory@unikart.in").first()
        if not inventory_user:
            inventory_user = User(
                email="inventory@unikart.in",
                hashed_password=get_password_hash("Inventory@123"),
                full_name="Inventory Manager",
                phone="+919876543211",
                is_active=True,
                must_change_password=False
            )
            inventory_user.roles = [roles_map["inventory_staff"], roles_map["inventory"]]
            db.add(inventory_user)
            db.flush()

        # 3. Default Warehouse
        warehouse = db.query(Warehouse).filter(Warehouse.code == "BLR-WH-01").first()
        if not warehouse:
            warehouse = Warehouse(
                name="Bangalore Central Fulfillment Center",
                code="BLR-WH-01",
                address="Unikart Logistics Park, Electronic City Phase 1",
                city="Bangalore",
                state="Karnataka",
                state_code="29",
                is_store=False,
                is_active=True
            )
            db.add(warehouse)
            db.flush()

        # 4. Employees & Salary Structures
        emp1 = db.query(Employee).filter(Employee.employee_code == "EMP-001").first()
        if not emp1:
            emp1 = Employee(
                employee_code="EMP-001",
                user_id=admin_user.id,
                full_name="System Admin",
                email="admin@unikart.in",
                phone="+919876543210",
                designation="Head of Operations",
                department="Management",
                employment_status="ACTIVE",
                is_active=True
            )
            db.add(emp1)
            db.flush()

            salary1 = SalaryStructure(
                employee_id=emp1.id,
                monthly_base_paise=8000000,
                monthly_hra_paise=3200000,
                monthly_conveyance_paise=500000,
                monthly_medical_allowance_paise=250000,
                monthly_special_allowance_paise=1000000
            )
            db.add(salary1)

        emp2 = db.query(Employee).filter(Employee.employee_code == "EMP-002").first()
        if not emp2:
            emp2 = Employee(
                employee_code="EMP-002",
                user_id=inventory_user.id,
                full_name="Inventory Manager",
                email="inventory@unikart.in",
                phone="+919876543211",
                designation="Warehouse Operations Lead",
                department="Logistics",
                employment_status="ACTIVE",
                is_active=True
            )
            db.add(emp2)
            db.flush()

            salary2 = SalaryStructure(
                employee_id=emp2.id,
                monthly_base_paise=4500000,
                monthly_hra_paise=1800000,
                monthly_conveyance_paise=300000,
                monthly_medical_allowance_paise=150000,
                monthly_special_allowance_paise=500000
            )
            db.add(salary2)

        # 5. Governance Feature Flags
        flags = [
            ("cash_on_delivery", "Cash on Delivery", "Allow Cash on Delivery checkout option", True),
            ("payment_gateway", "Online Payment Gateway", "Process live credit card and UPI transactions", True),
            ("stock_reservation", "Stock Reservation Locks", "Hold available stock during checkout", True),
        ]
        for key, name, desc, enabled in flags:
            ff = db.query(FeatureFlag).filter(FeatureFlag.key == key).first()
            if not ff:
                ff = FeatureFlag(key=key, name=name, description=desc, is_enabled=enabled)
                db.add(ff)

        # 6. E-Commerce Products & Categories
        json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "ecommerce_products.json")
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                catalog_data = json.load(f)

            categories_data = catalog_data["categories"]
            products_data = catalog_data["products"]

            # Synchronize 14 canonical categories
            cat_map = {}
            for c in categories_data:
                slug = c["slug"].strip().lower()
                name = c["name"].strip()
                desc = c.get("description", f"Premium {name} collection on UNIKART")
                img = c.get("image", None)
                existing_cat = db.query(Category).filter(Category.slug == slug).first()
                if existing_cat:
                    existing_cat.name = name
                    existing_cat.description = desc
                    existing_cat.image_url = img or existing_cat.image_url
                    existing_cat.is_active = True
                    cat_map[slug] = existing_cat
                else:
                    new_cat = Category(name=name, slug=slug, description=desc, image_url=img, is_active=True)
                    db.add(new_cat)
                    db.flush()
                    cat_map[slug] = new_cat

            # Deactivate unused old categories
            db.query(Category).filter(~Category.slug.in_(list(cat_map.keys()))).update({"is_active": False}, synchronize_session=False)

            # Synchronize Brands
            brand_names = sorted(list(set(p.get("brand", "Unikart Choice").strip() for p in products_data if p.get("brand"))))
            brand_map = {}
            for b_name in brand_names:
                b_slug = re.sub(r'[^a-z0-9]+', '-', b_name.lower()).strip('-')
                if not b_slug:
                    b_slug = f"brand-{hash(b_name) % 10000}"
                existing_b = db.query(Brand).filter((Brand.slug == b_slug) | (Brand.name.ilike(b_name))).first()
                if existing_b:
                    existing_b.is_active = True
                    brand_map[b_name] = existing_b
                else:
                    new_b = Brand(
                        name=b_name,
                        slug=b_slug,
                        logo_url="https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200",
                        is_active=True
                    )
                    db.add(new_b)
                    db.flush()
                    brand_map[b_name] = new_b

            # Synchronize 123 products
            used_slugs = set()
            barcode_counter = 1000

            for p in products_data:
                raw_name = p["name"].strip()
                cat_slug = p.get("category", "electronics").strip().lower()
                category_obj = cat_map.get(cat_slug) or cat_map.get("electronics")
                brand_name = p.get("brand", "Unikart Choice").strip()
                brand_obj = brand_map.get(brand_name)

                base_slug = re.sub(r'[^a-z0-9]+', '-', raw_name.lower()).strip('-')
                slug = base_slug
                c_s = 2
                while slug in used_slugs:
                    slug = f"{base_slug}-{c_s}"
                    c_s += 1
                used_slugs.add(slug)

                sku = p.get("id") or f"SKU-{base_slug[:20]}"
                barcode_counter += 1
                barcode = make_ean13(barcode_counter)

                selling_price_paise = int(round(float(p.get("price", 999)) * 100))
                mrp_paise = int(round(float(p.get("originalPrice", p.get("price", 999))) * 100))
                if mrp_paise < selling_price_paise:
                    mrp_paise = selling_price_paise
                cost_price_paise = int(round(selling_price_paise * 0.65))

                stock_qty = int(p.get("stockQuantity", 50))
                if stock_qty <= 0 and p.get("inStock", True):
                    stock_qty = 35

                features = p.get("features", [])
                short_desc = features[0] if features else p.get("description", "")[:200]
                hsn = HSN_CODES.get(cat_slug, "85171300")

                specs = {
                    "categoryLabel": p.get("categoryLabel", category_obj.name),
                    "subcategory": p.get("subcategory", ""),
                    "badge": p.get("badge", ""),
                    "deliveryDays": p.get("deliveryDays", 2),
                    "freeDelivery": p.get("freeDelivery", True),
                    "seller": p.get("seller", "OmniRetail Global Marketplace"),
                    "sellerId": p.get("sellerId", "seller-omni"),
                    "colors": p.get("colors", ["Standard"]),
                    "sizes": p.get("sizes", ["Standard"]),
                    "features": features,
                    "isDeal": p.get("isDeal", False),
                    "isBestseller": p.get("isBestseller", False),
                    "isTrending": p.get("isTrending", False)
                }

                # Check if product with this slug already exists
                prod = db.query(Product).filter(Product.slug == slug).first()
                if not prod:
                    prod = Product(
                        name=raw_name,
                        slug=slug,
                        description=p.get("description", ""),
                        short_description=short_desc[:490],
                        brand_id=brand_obj.id,
                        category_id=category_obj.id,
                        is_active=True,
                        requires_serial=False,
                        warranty_months=12,
                        hsn_code=hsn,
                        gst_rate=18.0,
                        rating=float(p.get("rating", 4.8)),
                        review_count=int(p.get("reviewCount", 120)),
                        specifications=specs
                    )
                    db.add(prod)
                    db.flush()

                # Check variant
                var = db.query(ProductVariant).filter(ProductVariant.product_id == prod.id).first()
                if not var:
                    colors = p.get("colors", [])
                    sizes = p.get("sizes", [])
                    primary_color = colors[0] if colors else "Standard"
                    primary_size = sizes[0] if sizes else "Standard"

                    var = ProductVariant(
                        product_id=prod.id,
                        sku=sku,
                        barcode=barcode,
                        name=f"{primary_color} / {primary_size}" if (colors or sizes) else "Standard Edition",
                        color=primary_color,
                        storage=primary_size,
                        attributes={"colors": colors, "sizes": sizes},
                        weight_grams=500,
                        is_active=True
                    )
                    db.add(var)
                    db.flush()

                # Check price
                price_obj = db.query(Price).filter(Price.variant_id == var.id).first()
                if not price_obj:
                    price_obj = Price(
                        variant_id=var.id,
                        currency="INR",
                        mrp_paise=mrp_paise,
                        selling_price_paise=selling_price_paise,
                        purchase_cost_paise=cost_price_paise,
                        is_active=True
                    )
                    db.add(price_obj)

                # Check stock level
                stock = db.query(StockLevel).filter(StockLevel.variant_id == var.id, StockLevel.warehouse_id == warehouse.id).first()
                if not stock:
                    stock = StockLevel(
                        variant_id=var.id,
                        warehouse_id=warehouse.id,
                        on_hand=stock_qty,
                        reserved=0,
                        reorder_level=10
                    )
                    db.add(stock)

                # Check images
                if not db.query(ProductImage).filter(ProductImage.product_id == prod.id).first():
                    main_img = p.get("image")
                    gallery = p.get("gallery") or []
                    if main_img and main_img not in gallery:
                        gallery = [main_img] + gallery
                    if not gallery and main_img:
                        gallery = [main_img]

                    for img_idx, img_url in enumerate(gallery):
                        if not img_url:
                            continue
                        p_img = ProductImage(
                            product_id=prod.id,
                            variant_id=var.id if img_idx == 0 else None,
                            url=img_url,
                            alt_text=f"{prod.name} image {img_idx + 1}",
                            sort_order=img_idx,
                            is_primary=(img_idx == 0)
                        )
                        db.add(p_img)

        # Seed Official Discount Coupons
        from app.models.cart import Coupon
        coupons_data = [
            {
                "code": "WELCOME500",
                "description": "₹500 flat discount on your first marketplace order",
                "discount_type": "FLAT",
                "discount_value_paise": 50000,
                "min_order_amount_paise": 199900,
                "percentage_rate": 0.0,
                "max_discount_paise": None,
                "is_active": True
            },
            {
                "code": "SUPERDEAL",
                "description": "15% instant savings up to ₹1,500",
                "discount_type": "PERCENTAGE",
                "percentage_rate": 15.0,
                "discount_value_paise": 0,
                "max_discount_paise": 150000,
                "min_order_amount_paise": 299900,
                "is_active": True
            },
            {
                "code": "FASHION100",
                "description": "₹1,000 off on apparel and footwear",
                "discount_type": "FLAT",
                "discount_value_paise": 100000,
                "min_order_amount_paise": 349900,
                "percentage_rate": 0.0,
                "max_discount_paise": None,
                "is_active": True
            },
            {
                "code": "UNIKART10",
                "description": "10% universal sitewide savings",
                "discount_type": "PERCENTAGE",
                "percentage_rate": 10.0,
                "discount_value_paise": 0,
                "max_discount_paise": 200000,
                "min_order_amount_paise": 99900,
                "is_active": True
            }
        ]
        for c_data in coupons_data:
            existing_c = db.query(Coupon).filter(Coupon.code == c_data["code"]).first()
            if not existing_c:
                db.add(Coupon(**c_data))

        db.commit()
        print("Database seeded successfully with e-commerce products and coupons!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        if close_db:
            db.close()

if __name__ == "__main__":
    seed_database()
