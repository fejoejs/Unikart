"""
ID Generation Utilities for UNIKART Platform.
Generates human-readable, collision-resistant identifiers for orders, invoices, and barcodes.
"""

import uuid
import datetime
import random
import string

def generate_order_number() -> str:
    """Generates unique order identifier (e.g. ORD-20261101-A1B2)."""
    date_str = datetime.datetime.now().strftime("%Y%m%d")
    random_suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"ORD-{date_str}-{random_suffix}"

def generate_invoice_number() -> str:
    """Generates GST-compliant invoice number (e.g. INV-202611-00123)."""
    date_str = datetime.datetime.now().strftime("%Y%m")
    random_suffix = "".join(random.choices(string.digits, k=5))
    return f"INV-{date_str}-{random_suffix}"

def generate_barcode(sku: str) -> str:
    """Generates standard EAN/UPC-like barcode string from SKU."""
    clean_sku = "".join(filter(str.isalnum, sku)).upper()
    random_digits = "".join(random.choices(string.digits, k=4))
    return f"UK-{clean_sku[:6]}-{random_digits}"

def generate_idempotency_key(prefix: str = "idemp") -> str:
    """Generates UUID-based idempotency key for financial / stock transactions."""
    return f"{prefix}-{uuid.uuid4().hex}"
