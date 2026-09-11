# Roles & Permission Matrix — ERP Sales & Customer Management

**Document Status:** Technical Baseline (P0 Contract)  
**Verification State:** Static SQL schema analysis verified; live PostgreSQL runtime comparison and seed linkage execution **COMPLETED 2026-09-11** against a disposable development database (see `docs/database/seed-checklist.md`, "P0 acceptance evidence").  
**Scope:** Role-Based Access Control (RBAC) definitions and permission matrices governing `/api/v1/*` endpoints.

---

## 1. Executive Summary & Verification Context

User accounts and roles are sourced from the existing `nguoi_dung` table.

- **Static Evidence:** Schema definition (`backend/database/schema.sql` line 29) confirms roles in the database:
  ```sql
  vai_tro VARCHAR(50) NOT NULL -- admin, ke_toan, ban_hang, san_xuat, kho, mua_hang
  ```
- **In-Scope Roles for Sales & CRM:**
  - `admin`: System Administrator / Executive Management
  - `ban_hang`: Sales Representative / Sales Manager
  - `kho`: Warehouse Clerk / Fulfillment Staff
  - `ke_toan`: Accountant / Credit Controller
- **Live Verification Status:** **COMPLETED 2026-09-11** against a disposable development PostgreSQL instance (see `docs/database/seed-checklist.md`).

---

## 2. Authentication & Authorization Principles

1. **Identity & State Verification:**
   - Every protected request must present a valid Bearer JWT in the `Authorization` header.
   - The user must exist in `nguoi_dung` and possess `trang_thai = 'hoat_dong'`.
   - If `trang_thai IN ('khoa', 'nghi_viec')`, reject with `403 AUTH_ACCOUNT_INACTIVE`.
2. **Strict Backend Enforcement:**
   - Authorization checks are executed in backend middleware and domain service layers.
   - Frontend navigation guards (`ProtectedRoute`, `PermissionGate`) exist solely for UX and **never** substitute for server-side enforcement.
3. **HTTP Semantics for Rejections:**
   - **401 Unauthorized (`AUTH_UNAUTHORIZED`):** Request lacks valid authentication credentials.
   - **403 Forbidden (`AUTH_FORBIDDEN`):** Request is authenticated, but user's role lacks the required capability.

---

## 3. Comprehensive RBAC Matrix

### Legend
- **Allow (Full):** Unrestricted access within the tenant/module.
- **Limited:** Constrained by row-level ownership, field restrictions, or status filters.
- **Deny:** Explicitly blocked; returns `403 AUTH_FORBIDDEN`.
- **Provisional:** Working default pending formal stakeholder confirmation.

---

### 3.1 Authentication & Profile

| Endpoint / Operation | HTTP Verb | admin | ban_hang | kho | ke_toan | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `/auth/login` | POST | Allow | Allow | Allow | Allow | Public authentication entry point |
| `/auth/me` | GET | Allow | Allow | Allow | Allow | Returns authenticated profile (excluding password) |
| `/auth/logout` | POST | Allow | Allow | Allow | Allow | Clears session/token state |

---

### 3.2 Dashboard & Reporting

| Endpoint / Operation | HTTP Verb | admin | ban_hang | kho | ke_toan | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `/dashboard/summary` | GET | Allow | Allow | Limited | Limited | `kho`: fulfillment KPIs only; `ke_toan`: financial/aging KPIs only |
| `/dashboard/revenue-chart` | GET | Allow | Allow | Deny | Allow | Revenue by month and top products |
| `/dashboard/order-status` | GET | Allow | Allow | Allow | Allow | Distribution of order statuses |

---

### 3.3 Customer Management

| Endpoint / Operation | HTTP Verb | admin | ban_hang | kho | ke_toan | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `/customers` (List) | GET | Allow | Allow | Deny | Allow | `kho` does not access customer master catalog |
| `/customers/:id` (Detail) | GET | Allow | Allow | Deny | Allow | Master profile and commercial history |
| `/customers` (Create) | POST | Allow | Allow | Deny | Deny | Sales representatives register new clients |
| `/customers/:id` (General Edit) | PATCH | Allow | Allow | Deny | Deny | Contact info, address, tax code, phone |
| `/customers/:id/credit` (Edit Limit) | PATCH | Allow | Deny | Deny | Allow (Prov.) | Credit limit & days modification reserved for Finance |
| `/customers/:id/status` (Suspend/Close) | PATCH | Allow | Deny | Deny | Allow (Prov.) | Deactivating or locking a customer requires approval |

---

### 3.4 Product Catalog (Lookup)

| Endpoint / Operation | HTTP Verb | admin | ban_hang | kho | ke_toan | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `/products` (List/Lookup) | GET | Allow | Allow | Allow | Allow | Read-only catalog access for order creation |
| `/products/:id` (Detail) | GET | Allow | Allow | Allow | Allow | Read-only product specs and price |

---

### 3.5 Sales Orders

| Endpoint / Operation | HTTP Verb | admin | ban_hang | kho | ke_toan | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `/sales-orders` (List) | GET | Allow | Allow | Limited | Allow | `kho`: sees confirmed/production orders for fulfillment |
| `/sales-orders/:id` (Detail) | GET | Allow | Allow | Limited | Allow | Header and line items |
| `/sales-orders` (Create) | POST | Allow | Allow | Deny | Deny | Commercial order entry |
| `/sales-orders/:id` (Edit Pending) | PATCH | Allow | Allow | Deny | Deny | Editable only when `cho_xac_nhan` |
| `/sales-orders/:id/confirm` | POST | Allow | Allow | Deny | Deny | Commercial confirmation & credit check |
| `/sales-orders/:id/cancel` | POST | Allow | Allow (Prov.)| Deny | Deny | Cancellation with mandatory reason |

---

### 3.6 Deliveries (Fulfillment)

| Endpoint / Operation | HTTP Verb | admin | ban_hang | kho | ke_toan | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `/deliveries` (List) | GET | Allow | Allow | Allow | Deny | Warehouse fulfillment tracking |
| `/deliveries/:id` (Detail) | GET | Allow | Allow | Allow | Deny | Delivery header and progress |
| `/deliveries` (Create) | POST | Allow | Limited | Allow | Deny | Typically initiated by Warehouse staff |
| `/deliveries/:id/start` | POST | Allow | Deny | Allow | Deny | Dispatches delivery (`dang_giao`) |
| `/deliveries/:id/complete` | POST | Allow | Deny | Allow | Deny | Confirms successful receipt (`da_giao`) |
| `/deliveries/:id/fail` | POST | Allow | Deny | Allow | Deny | Marks delivery failed (`that_bai`) |

---

### 3.7 Sales Invoices

| Endpoint / Operation | HTTP Verb | admin | ban_hang | kho | ke_toan | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `/invoices` (List) | GET | Allow | Allow | Deny | Allow | Invoice oversight |
| `/invoices/:id` (Detail) | GET | Allow | Allow | Deny | Allow | Commercial invoice view |
| `/invoices` (Create) | POST | Allow | Deny (Prov.)| Deny | Allow | Issuance reserved for Accounting |

---

### 3.8 Accounts Receivable

| Endpoint / Operation | HTTP Verb | admin | ban_hang | kho | ke_toan | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `/receivables` (List) | GET | Allow | Allow (Read)| Deny | Allow | Filtered strictly to `phai_thu` |
| `/receivables/summary` | GET | Allow | Allow (Read)| Deny | Allow | Aggregate outstanding receivables |
| `/receivables/aging` | GET | Allow | Deny | Deny | Allow | Detailed aging bucket report (Finance) |
| `/customers/:id/receivables` | GET | Allow | Allow (Read)| Deny | Allow | Customer-specific outstanding balances |

---

## 4. Field-Level Mutation Security

Certain sensitive attributes must not be editable through standard entity `PATCH` operations:

1. **Customer Credit Attributes:**
   - `han_muc_cong_no` (credit limit) and `so_ngay_cong_no` (credit terms) cannot be modified by `ban_hang`.
   - Mutations require `admin` or `ke_toan` authorization via dedicated endpoint (`PATCH /api/v1/customers/:id/credit`).
2. **Sales Order Pricing:**
   - `don_gia` on order lines is automatically populated from `san_pham.gia_ban`.
   - Ad-hoc price overrides are blocked in baseline MVP.
3. **Audit Immutability:**
   - `nguoi_tao`, `nguoi_cap_nhat`, `ngay_tao`, `ngay_cap_nhat` are stripped from all incoming payloads across all roles.

---

## 5. Open & Provisional Governance Decisions

The following permissions are designated provisional under P0 and require business stakeholder sign-off:

1. **Invoice Creation by Sales:** Can senior sales representatives generate invoices directly, or is invoice creation strictly gated to `ke_toan`? *(Default: `ke_toan` and `admin` only).*
2. **Confirmed Order Cancellation:** Can a salesperson cancel an order once it is confirmed (`da_xac_nhan`), or must cancellations be escalated to `admin`? *(Default: `admin` and `ban_hang` permitted if not yet in production).*
3. **Customer Deactivation:** Can `ke_toan` suspend customers for non-payment, or is suspension restricted to `admin`? *(Default: `admin` and `ke_toan` permitted).*
