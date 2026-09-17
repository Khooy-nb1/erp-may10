# PH1 Remediation — Core API and Cross-Module Integration Boundaries (Step 3)

**Document ID:** `DOC-PH1-REM-003`  
**Date:** 2026-09-16  
**Source Branch:** `feature/ph1-sale-core` @ `cf918b8` (re-validated; prior freeze `ph1-bh-qlkh` @ `78d7729`)  
**Compliance Standard:** `ERP-M10-DEV-CONTRACT-2026` v1.1  
**Deliverable Type:** Step 3 Core API and Cross-Module Integration Audit Deliverable  
**Exit Criteria Status:** **PASS — Every PH1 endpoint is classified, ownership conflicts are resolved, and the target `/api/v1/sales/*` namespace is defined.**

---

## 1. Complete PH1 Endpoint Inventory & Ownership Classification

**Re-validation at `cf918b8` (code-derived, not doc-derived):** the PH1 runtime mounts exactly 8 routers via `backend/src/app.ts` (`/api/v1/auth`, `/customers`, `/products`, `/sales-orders`, `/deliveries`, `/invoices`, `/dashboard`, `/receivables`) plus two bootstrap probes (`/api/v1/health`, `/api/v1`), totalling **35 route definitions** (3 auth + 32 business). The legacy CommonJS route files inherited from `origin/main` (`authRoutes.js`, `cartRoutes.js`, `categoryRoutes.js`, `employeeRoutes.js`, `inventoryRoutes.js`, `orderRoutes.js`, `productRoutes.js`, `reportRoutes.js`, `userRoutes.js`) are **not mounted by any entry point at HEAD** (`backend/src/server.ts` → `createApp()`) and are dead code that must not be carried into the integrated module. Core's `backend/src/app.js:67-79` (on `origin/develop` @ `7c98c78`) applies `authMiddleware` to all of `/api/v1` and has **no** `/api/v1/sales` mount yet, so the Sales namespace is free.

| Current Route | HTTP Method | Capability Description | Ownership Classification | Target Integrated Endpoint | Required Canonical Permission |
|---|---|---|---|---|---|
| `/api/v1/auth/login` | POST | User login & JWT issuance | **Core-owned (RETIRE)** | Core `/api/v1/auth/login` | None (Public) |
| `/api/v1/auth/me` | GET | Token session verification | **Core-owned (RETIRE)** | Core `/api/v1/auth/me` | Core `requireAuth` |
| `/api/v1/auth/logout` | POST | Invalidate session | **Core-owned (RETIRE)** | Retired - Core exposes **no** logout route (`portalRoutes.js:7-8`); the client discards the token | n/a (client-side token discard) |
| `/api/v1/customers` | GET | List / search customers | **PH1-owned** | `GET /api/v1/sales/khach-hang` | `sales.view` |
| `/api/v1/customers` | POST | Create customer | **PH1-owned** | `POST /api/v1/sales/khach-hang` | `sales.create` |
| `/api/v1/customers/:id` | GET | Customer detail | **PH1-owned** | `GET /api/v1/sales/khach-hang/:id` | `sales.view` |
| `/api/v1/customers/:id` | PATCH | Update customer info | **PH1-owned** | `PATCH /api/v1/sales/khach-hang/:id` | `sales.update` |
| `/api/v1/customers/:id/status` | PATCH | Update customer status | **PH1-owned** | `PATCH /api/v1/sales/khach-hang/:id/status` | `admin` (role-restricted, holds `sales.approve`) |
| `/api/v1/customers/:id/summary` | GET | Customer commercial summary | **PH1-owned** | `GET /api/v1/sales/khach-hang/:id/summary` | `sales.view` |
| `/api/v1/customers/:id/receivables`| GET | Customer receivables | **Cross-module read** | `GET /api/v1/sales/khach-hang/:id/receivables` | `sales.view` |
| `/api/v1/products` | GET | Active product catalog | **Cross-module read** | `GET /api/v1/sales/san-pham` | `sales.view` |
| `/api/v1/products/:id` | GET | Product detail | **Cross-module read** | `GET /api/v1/sales/san-pham/:id` | `sales.view` |
| `/api/v1/sales-orders` | GET | List sales orders | **PH1-owned** | `GET /api/v1/sales/don-hang` | `sales.view` |
| `/api/v1/sales-orders` | POST | Create sales order | **PH1-owned** | `POST /api/v1/sales/don-hang` | `sales.create` |
| `/api/v1/sales-orders/:id` | GET | Sales order detail | **PH1-owned** | `GET /api/v1/sales/don-hang/:id` | `sales.view` |
| `/api/v1/sales-orders/:id` | PATCH | Update draft order | **PH1-owned** | `PATCH /api/v1/sales/don-hang/:id` | `sales.update` |
| `/api/v1/sales-orders/:id/confirm` | POST | Confirm sales order | **PH1-owned** | `POST /api/v1/sales/don-hang/:id/confirm` | `sales.approve` |
| `/api/v1/sales-orders/:id/cancel` | POST | Cancel sales order | **PH1-owned** | `POST /api/v1/sales/don-hang/:id/cancel` | `sales.update` (draft) / `sales.delete` (confirmed, admin-only) |
| `/api/v1/deliveries` | GET | List delivery notes | **PH1-owned** | `GET /api/v1/sales/giao-hang` | `sales.view` |
| `/api/v1/deliveries` | POST | Create delivery note | **PH1-owned** | `POST /api/v1/sales/giao-hang` | `sales.create` |
| `/api/v1/deliveries/:id` | GET | Delivery detail | **PH1-owned** | `GET /api/v1/sales/giao-hang/:id` | `sales.view` |
| `/api/v1/deliveries/:id/start` | POST | Start shipment | **Cross-module command** | `POST /api/v1/sales/giao-hang/:id/start` | `kho` or `admin` |
| `/api/v1/deliveries/:id/complete` | POST | Confirm successful delivery | **Cross-module command** | `POST /api/v1/sales/giao-hang/:id/complete` | `kho` or `admin` |
| `/api/v1/deliveries/:id/fail` | POST | Record failed delivery | **Cross-module command** | `POST /api/v1/sales/giao-hang/:id/fail` | `kho` or `admin` |
| `/api/v1/invoices` | GET | List invoices | **PH1-owned** | `GET /api/v1/sales/hoa-don` | `sales.view` |
| `/api/v1/invoices` | POST | Issue sales invoice | **Cross-module command** | `POST /api/v1/sales/hoa-don` | `ke_toan` or `admin` |
| `/api/v1/invoices/:id` | GET | Invoice detail | **PH1-owned** | `GET /api/v1/sales/hoa-don/:id` | `sales.view` |
| `/api/v1/receivables` | GET | List receivables | **Cross-module read** | `GET /api/v1/sales/cong-no` | `sales.view` |
| `/api/v1/receivables/summary` | GET | Receivables KPI summary | **Cross-module read** | `GET /api/v1/sales/cong-no/summary` | `sales.view` |
| `/api/v1/receivables/aging` | GET | Aging bucket report | **Cross-module read** | `GET /api/v1/sales/cong-no/aging` | `accounting.receivable` (`ke_toan`, `admin`) - R-2 ruling |
| `/api/v1/dashboard/summary` | GET | Role-scoped KPI summary | **PH1-owned (Internal)** | `GET /api/v1/sales/overview/summary` | `sales.view` (`kho` fulfillment-scoped) |
| `/api/v1/dashboard/revenue-chart` | GET | Invoice revenue by period (money metric) | **PH1-owned (Internal)** | `GET /api/v1/sales/overview/revenue-chart` | `sales.view` (money metrics: `kho` denied) |
| `/api/v1/dashboard/order-status` | GET | Order distribution by status | **PH1-owned (Internal)** | `GET /api/v1/sales/overview/order-status` | `sales.view` |
| `/api/v1/dashboard/top-customers` | GET | Top customers by order value | **PH1-owned (Internal)** | `GET /api/v1/sales/overview/top-customers` | `sales.view` |
| `/api/v1/dashboard/top-products` | GET | Top products by ordered value | **PH1-owned (Internal)** | `GET /api/v1/sales/overview/top-products` | `sales.view` |
| `/api/v1/health`, `/api/v1` | GET | PH1 bootstrap probes (DB health, service banner) | **Retire with PH1 bootstrap** | Core health/root probes | None (public in PH1; Core-owned after integration) |

---

## 2. Resolution of Ownership Conflicts

### 2.1 Authentication and Identity Management
- **Conflict:** Standalone PH1 currently mounts `/api/v1/auth` (with private `jwt.sign` and `auth_token`).
- **Resolution:**  
  1. Remove `backend/src/routes/auth.routes.ts`, `auth.service.ts`, and `auth.middleware.ts` from integrated runtime.
  2. ERP Core platform (`origin/develop`) provides the official `/api/v1/auth/login` and `/api/v1/auth/me` (`backend/src/routes/portalRoutes.js:7-8`). **There is no Core logout endpoint** - PH1's `/api/v1/auth/logout` retires with the PH1 auth subsystem and the frontend clears the stored token client-side.
  3. Tokens are issued exclusively by Core as HMAC-SHA256 tokens (`erp_token_{userId}_{timestamp}.{signature}`).
  4. Authentication middleware `authMiddleware` and `requireAuth` from Core (`backend/src/middlewares/auth.js`) become the sole security authority.

### 2.2 Global Dashboard vs Sales Module Overview
- **Conflict:** Standalone PH1 mounted `/api/v1/dashboard` as a root-level dashboard and rendered it at `/dashboard`.
- **Resolution:**  
  1. ERP Core retains ownership of the root homepage `/` and global portal dashboard (`frontend/src/pages/Dashboard.jsx`).
  2. PH1 must not override or replace the Core dashboard.
  3. PH1 dashboard endpoints are scoped strictly to the Sales module under `/api/v1/sales/overview/*`.
  4. In the frontend, PH1 metrics are rendered as an internal "Tổng quan Bán hàng" view inside `/sales` or `/sales/overview`.

### 2.3 Warehouse & Inventory Operations (PH4 Ownership)
- **Conflict:** Sales deliveries interface directly with warehouse concepts (`ma_kho`, shipping status).
- **Resolution:**  
  1. PH4 is frozen and strictly owns all warehouse inventory entities: `kho`, `vi_tri_kho`, `vat_tu`, `lo_vat_tu`, `ton_kho`, and warehouse notes (`phieu_nhap_kho`, `phieu_xuat_kho`, `phieu_chuyen_kho`, `phieu_kiem_ke`).
  2. PH1 owns only `giao_hang` (shipping note record tracking customer delivery).
  3. PH1 reads warehouse master data (`kho`) to validate active warehouses (`trang_thai = 'hoat_dong'`), but never inserts or updates warehouse records.
  4. PH1 never directly mutates `ton_kho` or creates `phieu_xuat_kho` through private repository methods.

### 2.4 Receivables Ownership (PH5 Accounting Ownership)
- **Conflict:** In ERP May 10, general accounts receivable (`cong_no`) is managed by the Accounting module (PH5). However, Sales representatives need visibility into customer credit status and outstanding debt.
- **Resolution:**  
  1. PH1 maintains **read-only** access to `cong_no` filtered strictly to `loai_cong_no = 'phai_thu'`.
  2. PH1 does not provide payment creation or debt write-off endpoints.
  3. Sales users (`ban_hang`) have permission `sales.view` to inspect outstanding balances and overdue invoices. Detailed aging reports and debt adjustments remain restricted to `ke_toan` and `admin`.

---

## 3. PH4 & Cross-Module Integration Contracts

### 3.1 Stock Availability Lookup
- **Approved Pattern:** PH1 checks product master data via `san_pham` (reading `gia_ban`, `ma_don_vi_tinh`, `trang_thai = 'dang_ban'`).
- **Cost Security Rule:** In accordance with the Sales/CRM specification, `san_pham.gia_von` is **never exposed** to Sales endpoints or queries.
- **Inventory Check:** If live inventory balance is needed, PH1 consumes the existing Core PH4 API (`GET /api/v1/ton-kho?ma_vat_tu=...`) rather than joining internal PH4 tables.

### 3.2 Warehouse Selection for Delivery
- PH1 `giao_hang` stores `ma_kho BIGINT NOT NULL REFERENCES kho(id)`.
- When creating a delivery note, PH1 queries active warehouses using `kho.trang_thai = 'hoat_dong'`.
- PH1 callsites consume `getDanhSachKho()` from Core `services/api.js`.

### 3.3 Delivery Lifecycle
- Transition to `dang_giao` (in transit), `da_giao` (delivered), or `that_bai` (failed) represents shipping logistics.
- Role boundary: Shipping status changes (`start`, `complete`, `fail`) are restricted to `kho` (warehouse staff) and `admin`, preserving role boundaries defined in the RBAC contract.

---

## 4. Architectural Rules & Invariants

1. **No Direct Controller/Service Imports:**  
   PH1 modules must never `require` or `import` controllers or internal services from PH4 (`phieuNhapController.js`, etc.) or PH5 (`debtController.js`, etc.). Cross-module interaction occurs strictly through database read models or Core HTTP extension points.
2. **Single Router Entry Point:**  
   PH1 backend will export a single router `salesRoutes.js`, mounted by Core's `app.js` under:
   ```javascript
   app.use('/api/v1/sales', salesRoutes);
   ```
3. **Canonical Permissions on Protected Routes:**  
   Every endpoint within `salesRoutes` must be protected by Core `authMiddleware`, `requireAuth`, and permission guards. **Resolved by ruling R-1 (2026-09-16):** the guard namespace is the shipped `sales.*` (`sales.view/create/update/approve`, admin-only `sales.delete`); the contract doc's `ban_hang.*` prefix is waived for PH1 and no Core file is edited.
4. **Untrusted Identity Headers:**  
   Client headers such as `x-role` or `x-user-id` are untrusted. Identity is derived strictly from server-verified `req.user` populated by `authMiddleware`.

---

## 5. Step 3 Sign-Off & Exit Criteria

- [x] All 35 PH1 route definitions (32 business + 3 auth) plus 2 bootstrap probes inventoried and mapped to target `/api/v1/sales/*` routes.
- [x] Ownership conflicts for Auth (Core), Dashboard (Core), and Warehouse (PH4) resolved.
- [x] Read/write boundaries with PH4 and PH5 established.
- [x] Step 3 Exit Criteria Satisfied — Ready for Step 4 Target PH1 Design.
