<div align="center">

# 🛒 UNIKART - **E-Commerce Platform**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)

<p align="center">
  An E-commerce platform built with a high-performance Python FastAPI engine, Supabase PostgreSQL with real-time replication, and a clean 2-application React architecture.
</p>

### 🔗 Live Applications

| Application | Direct URL | Description |
| :--- | :--- | :--- |
| **Customer Storefront** | [**unikart-in.vercel.app**](https://unikart-in.vercel.app) | Online Shopping, Real-Time Cart & Checkout |
| **Inventory Management** | [**unikart-inventory.vercel.app**](https://unikart-inventory.vercel.app) | Catalog Oversight, Stock Control & Admin Dashboard |

</div>

---

## 🌟 Key Features

* **Strict 2-Application Core**: Clean, modular monorepo isolating the customer-facing **Storefront** from the internal **Inventory Management** console.
* **Single-Shop Invariant**: Exactly one centralized warehouse and catalog operation, ensuring consistent prices, stock counts, and imagery across all channels.
* **Doorstep Handover OTP**: High-value security delivery workflow requiring courier partners to verify a customer OTP before marking orders as delivered.
* **Secure Password Reset**: Single-use 6-digit numeric OTP sent via transactional email relay with timing-safe verification and attempt limits.
* **Server-Side Google SSO**: Google identity verification with server-side token validation, role resolution, and staff workspace access for promoted accounts.
* **Real-Time Live Synchronization**: Bidirectional Supabase Realtime WebSocket synchronization across products, variants, prices, stock levels, and images.
* **GST & Indian Postal Engine**: Automated GST calculations (CGST, SGST, IGST) with an integrated PIN resolver mapping all 28 States and 8 Union Territories.
* **Role-Based Access Control (RBAC)**: Distinct permissions for Administrators, Inventory Staff, and Customers with cryptographic JWT session management.

---

## 📱 The 2 Maintained Applications

| # | Application | Target Users | Core Capabilities |
| :-: | :--- | :--- | :--- |
| **01** | **Customer Storefront** | Shoppers & Customers | • 14-Department catalog with instant search and multi-facet filtering.<br/>• Delivery address validation with 6-digit PIN circle detection.<br/>• Real-time cart calculations, dynamic free-shipping thresholds, and Cash on Delivery (COD) checkout.<br/>• Order tracking timeline, customer wishlist, and verified reviews. |
| **02** | **Inventory Management** | Managers & Inventory Staff | • **Admin Dashboard**: Revenue metrics, order dispatch, delivery OTP verification, and employee directory.<br/>• **Inventory Operations**: Stock adjustments, low-stock threshold monitoring, and SKU catalog management. |
| **API** | **Central Backend Engine** | Core Services | • Interactive OpenAPI / Swagger documentation at `/docs`.<br/>• Automated database schema synchronization.<br/>• Transactional email relay pipeline and Supabase PostgreSQL replication. |

---

## 🛡️ Security & Compliance Highlights

1. **Doorstep Handover OTP**:
   Every placed order generates a secure 6-digit OTP stored as a salted cryptographic hash with expiration and attempt limiting. Deliveries cannot be marked completed without valid customer OTP verification.
2. **Hardened Password Reset**:
   Password reset requests verify account existence, generate single-use 6-digit numeric OTPs with a 15-minute expiry, and dispatch them via transactional email. Raw tokens are never exposed in responses or logs.
3. **Verified Google SSO**:
   Client-side password synthesis is replaced with server-side token verification, issuing genuine JWT bearer tokens. Privileged administrative and inventory roles can be granted to verified Google accounts with automatic workspace routing.
4. **GST Tax Engine**:
   Compliant with Indian Goods and Services Tax requirements. Automatically determines inter-state (IGST) versus intra-state (CGST + SGST) sales based on destination state codes.
5. **Session Expiration**:
   Internal staff tokens expire automatically after 24 hours to maintain strict session security.

---
    