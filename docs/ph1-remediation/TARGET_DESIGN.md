# PH1 Remediation — Target Architecture & Integration Design (Step 4)

**Document ID:** `DOC-PH1-REM-004`  
**Date:** 2026-09-16  
**Source Branch:** `feature/ph1-sale-core` @ `cf918b8` (re-validated; prior freeze `ph1-bh-qlkh` @ `78d7729`)  
**Compliance Standard:** `ERP-M10-DEV-CONTRACT-2026` v1.1  
**Deliverable Type:** Step 4 Target PH1 Design Specification  
**Exit Criteria Status:** **MET (2026-09-16)** — rulings R-1…R-6 closed IR-01…IR-06; route map, API map, RBAC matrix (shipped `sales.*` namespace), and UI contract are frozen. See `INTEGRATION_REQUESTS.md` §2.

---

## 1. Frontend Target Route Map (`/sales/*`)

### 1.1 Architecture & Core Integration

**Re-validation at `cf918b8` (code-derived from `frontend/src/routes/AppRoutes.tsx`):** PH1 currently owns a standalone router with `/login`, `/dashboard`, `/customers`, `/customers/new`, `/customers/:id`, `/products`, `/sales-orders`, `/sales-orders/new` (→ redirect), `/sales-orders/:id`, `/deliveries`, `/deliveries/new` (→ redirect), `/deliveries/:id`, `/invoices`, `/invoices/new` (→ redirect), `/invoices/:id`, `/receivables`, `*` (→ `/dashboard`). Create flows for orders, deliveries and invoices are **dialogs on their list pages** (`SalesOrderCreateDialog`, `DeliveryCreateDialog`, `InvoiceCreateDialog`), so the target map must not declare `/sales/{orders,deliveries,invoices}/new` pages — it may keep those URLs as redirects for link compatibility.
The PH1 Sales module will no longer render an independent browser application, top-level `<BrowserRouter>`, or private `AppShell`. Instead, it provides a dedicated child route module:

```javascript
// Mounted in Core frontend/src/routes/AppRoutes.jsx:
<Route
  path="sales/*"
  element={
    <PermissionGuard permission="sales.view" redirect={true} fallback={<Forbidden />}>
      <SalesRoutes />
    </PermissionGuard>
  }
/>
```

Inside Core `MainLayout.jsx`, `SalesRoutes` defines all child paths relative to `/sales`:

> **Reality check at `cf918b8`:** PH1 currently has **no route-level RBAC** — `routes/ProtectedRoute.tsx:8,24-25` declares an `allowedRoles` prop that `AppRoutes.tsx` never passes, and `AppRoutes.tsx:53` swallows every unknown path with `* → Navigate(/dashboard)`. The `Access Guard` column below is therefore the **target**, not a description of current code. The `*` catch-all and the three legacy `/new` redirects (`sales-orders/new`, `deliveries/new`, `invoices/new` at `AppRoutes.tsx:42,46,50`) must **not** be exported from the Core-mounted `SalesRoutes` module — Core's router owns unmatched paths.

| Route Path | Component / Screen | Description | Access Guard |
|---|---|---|---|
| `/sales` (index) | `SalesOverviewPage` (from `pages/dashboard/DashboardPage.tsx`) | Sales summary / KPIs; must be renamed and rebranded — it may not remain a global dashboard (§1.2) | `sales.view` |
| `/sales/customers` | `CustomerListPage` | Customer table with search, filters, pagination | `sales.view` |
| `/sales/customers/new` | `CustomerCreatePage` | Customer registration form (11 fields per the zod schema) | `sales.create` |
| `/sales/customers/:id` | `CustomerDetailPage` | Customer profile with 4 tabs (`Thông tin chi tiết`, `Đơn bán hàng`, `Hóa đơn`, `Sổ công nợ`) | `sales.view` |
| `/sales/products` | `ProductListPage` | Product catalog lookup, sizing, colors, pricing | `sales.view` |
| `/sales/orders` | `SalesOrderListPage` | Sales orders list with status filters; hosts the create dialog | `sales.view` |
| *(none — dialog)* | `SalesOrderCreateDialog` | Order creation is a **dialog on the list page** at `cf918b8` (the old `SalesOrderCreatePage` was removed in `85d7262`); the legacy URL `/sales-orders/new` redirects to the list | `sales.create` (dialog action) |
| `/sales/orders/:id` | `SalesOrderDetailPage` | Order details, workflow actions (confirm, cancel, delivery) | `sales.view` |
| `/sales/deliveries` | `DeliveryListPage` | Shipping notes list with status filtering; hosts `DeliveryCreateDialog` | `sales.view` |
| `/sales/deliveries/:id` | `DeliveryDetailPage` | Delivery tracking, receiver details, status actions | `sales.view` |
| `/sales/invoices` | `InvoiceListPage` | Sales invoices list, overdue indicators, payment status; hosts `InvoiceCreateDialog` | `sales.view` |
| `/sales/invoices/:id` | `InvoiceDetailPage` | Invoice breakdown, taxes, customer credit terms | `sales.view` |
| `/sales/receivables` | `ReceivableListPage` | Accounts receivable ledger, summary cards (`sales.view`); aging report behind `accounting.receivable` (R-2) | `sales.view` |

### 1.2 Retired Standalone Routes
The following paths are permanently removed from PH1 route registrations:
- `/login` (Managed solely by Core `/login`)
- `/` (Core portal home)
- `/dashboard` (Core global dashboard)
- Root-level `/customers`, `/products`, `/sales-orders`, `/deliveries`, `/invoices`, `/receivables`

---

## 2. Backend Target API Map (`/api/v1/sales/*`)

All PH1 business endpoints are consolidated under the single `/api/v1/sales` router, mounted by Core `backend/src/app.js`:

```javascript
// backend/src/app.js
const salesRoutes = require('./routes/salesRoutes');
app.use('/api/v1/sales', salesRoutes);
```

### 2.1 Endpoint Specification

#### Khách Hàng (Customer Management)
- `GET    /api/v1/sales/khach-hang` — List customers with pagination, type, city, and status filters.
- `POST   /api/v1/sales/khach-hang` — Create new customer (validates tax code, phone, credit limit).
- `GET    /api/v1/sales/khach-hang/:id` — Full customer details.
- `PATCH  /api/v1/sales/khach-hang/:id` — Update customer general information.
- `PATCH  /api/v1/sales/khach-hang/:id/status` — Change status (`hoat_dong`, `tam_khoa`, `ngung_giao_dich`).
- `GET    /api/v1/sales/khach-hang/:id/summary` — Commercial statistics (orders count, total value, unpaid invoices, outstanding debt).
- `GET    /api/v1/sales/khach-hang/:id/receivables` — Receivables specific to customer.

#### Sản Phẩm (Product Catalog Lookup)
- `GET    /api/v1/sales/san-pham` — Query sellable products with unit, price, size, and color.
- `GET    /api/v1/sales/san-pham/:id` — Product details.

#### Đơn Bán Hàng (Sales Orders)
- `GET    /api/v1/sales/don-hang` — List orders with date range, customer, seller, and status filters.
- `POST   /api/v1/sales/don-hang` — Create order header and line items atomically.
- `GET    /api/v1/sales/don-hang/:id` — Full order details with line items and pricing breakdown.
- `PATCH  /api/v1/sales/don-hang/:id` — Update draft order (`cho_xac_nhan` only) with server-side recalculation.
- `POST   /api/v1/sales/don-hang/:id/confirm` — Confirm order with credit limit verification.
- `POST   /api/v1/sales/don-hang/:id/cancel` — Cancel order (requires reason; admin-only if already confirmed).

#### Giao Hàng (Shipping & Delivery)
- `GET    /api/v1/sales/giao-hang` — List deliveries with order, warehouse, and status filters.
- `POST   /api/v1/sales/giao-hang` — Create shipping note linked to confirmed sales order.
- `GET    /api/v1/sales/giao-hang/:id` — Delivery note details.
- `POST   /api/v1/sales/giao-hang/:id/start` — Mark shipment in transit (`dang_giao`).
- `POST   /api/v1/sales/giao-hang/:id/complete` — Mark delivery completed (`da_giao`).
- `POST   /api/v1/sales/giao-hang/:id/fail` — Record failed delivery (`that_bai`) with mandatory reason.

#### Hóa Đơn (Invoicing)
- `GET    /api/v1/sales/hoa-don` — List sales invoices with date, customer, and status filters.
- `POST   /api/v1/sales/hoa-don` — Atomic invoice issuance with row lock on order and due-date derivation.
- `GET    /api/v1/sales/hoa-don/:id` — Invoice details and tax calculations.

#### Công Nợ (Receivables Read Model)
- `GET    /api/v1/sales/cong-no` — Accounts receivable list (`phai_thu` only) with aging calculations.
- `GET    /api/v1/sales/cong-no/summary` — Total receivables, overdue amount, and collection progress.
- `GET    /api/v1/sales/cong-no/aging` — Aging analysis by buckets (Current, 1-30, 31-60, 61-90, 90+ days).

#### Tổng Quan (Sales Overview Metrics)
- `GET    /api/v1/sales/tong-quan/summary` — Sales KPI metrics for selected time window.
- `GET    /api/v1/sales/tong-quan/revenue-chart` — Periodic revenue chart (daily, monthly, quarterly).
- `GET    /api/v1/sales/tong-quan/order-status` — Order distribution breakdown by status.
- `GET    /api/v1/sales/tong-quan/top-customers` — Top customers by sales volume.
- `GET    /api/v1/sales/tong-quan/top-products` — Top products by revenue.

---

## 3. RBAC & Canonical Permission Matrix

The canonical RBAC engine from `backend/src/middlewares/auth.js` and `config/roleMapping.js` governs all endpoints:

> **Permission namespace (owner ruling R-1, 2026-09-16):** PH1 implements the **shipped** `sales.*` namespace. The frozen contract doc's `ban_hang.*` prefix is waived for PH1; no Core file is edited. Rows below are the authoritative guard map.

| Endpoint Resource | Action | Allowed Canonical Roles | Required Permission Code |
|---|---|---|---|
| `/khach-hang` | List, View | `admin`, `ban_hang`, `ke_toan` | `sales.view` |
| `/khach-hang` | Create | `admin`, `ban_hang` | `sales.create` |
| `/khach-hang/:id` | Update info | `admin`, `ban_hang` | `sales.update` |
| `/khach-hang/:id/status` | Change status | `admin` (role-restricted; `sales.approve` is held by `ban_hang` too, so the role check preserves today's behaviour) | `sales.approve` |
| `/san-pham` | Browse, View | `admin`, `ban_hang`, `kho`, `ke_toan` | `sales.view` |
| `/don-hang` | List, View | `admin`, `ban_hang`, `kho`, `ke_toan` | `sales.view` |
| `/don-hang` | Create | `admin`, `ban_hang` | `sales.create` |
| `/don-hang/:id` | Update draft | `admin`, `ban_hang` | `sales.update` |
| `/don-hang/:id/confirm` | Confirm | `admin`, `ban_hang` | `sales.approve` |
| `/don-hang/:id/cancel` | Cancel | `admin`, `ban_hang` (draft `cho_xac_nhan`) / `admin` only (confirmed) | `sales.update` (draft) / `sales.delete` (confirmed, admin-only per `roleMapping.js:136`) |
| `/giao-hang` | List, View | `admin`, `ban_hang`, `kho` | `sales.view` |
| `/giao-hang` | Create note | `admin`, `ban_hang`, `kho` | `sales.create` |
| `/giao-hang/:id/start` | Start shipment | `admin`, `kho` | Role-gated: `admin`, `kho` |
| `/giao-hang/:id/complete` | Complete | `admin`, `kho` | Role-gated: `admin`, `kho` |
| `/giao-hang/:id/fail` | Fail delivery | `admin`, `kho` | Role-gated: `admin`, `kho` |
| `/hoa-don` | List, View | `admin`, `ban_hang`, `ke_toan` | `sales.view` |
| `/hoa-don` | Issue invoice | `admin`, `ke_toan` | Role-gated: `admin`, `ke_toan` |
| `/cong-no` | View list, summary | `admin`, `ban_hang`, `ke_toan` | `sales.view` |
| `/cong-no/aging` | Aging report | `admin`, `ke_toan` | `accounting.receivable` (R-2 ruling) |
| `/overview/*` | Sales KPIs | `admin`, `ban_hang`, `ke_toan` (`kho` receives fulfillment only) | `sales.view` |

---

## 4. UI Design System V2.11 Alignment

All PH1 screens will inherit the Core V2.11 design tokens (`frontend/src/config/designTokens.js` and `frontend/src/styles/global.css`):

> **Reality check at `cf918b8`:** PH1's tokens are Tailwind-v4 `@theme` variables in `frontend/src/styles/index.css` (there is no `tailwind.config.js`): brand `#2563eb` (lines 23, 27) and radii `--radius-control: 0.5rem` / `--radius-card: 0.75rem` (lines 53-54), exposed as `rounded-control` / `rounded-card`. At HEAD there are **zero** occurrences of `rounded-2xl`, `rounded-xl`, or `#0F5FAF`. Every row below is a migration target, not current state.

- **Brand Primary:** Corporate Blue `#0F5FAF` (replaces standalone `#2563EB`).
- **Workspace Background:** Clean gray-blue `#F7FAFC`.
- **Card / Surface:** Pure white `#FFFFFF` with border `#E2EDF5`.
- **Primary Typography:** `#172033` (headings and bold labels).
- **Secondary Typography:** `#5F6F82` (captions, placeholders, metadata).
- **Border Radius:**
  - Cards, panels, tables: `rounded-2xl` (16px).
  - Controls, inputs, buttons, badges: `rounded-xl` (12px).
- **Navigation Tiers:**
  - Tier 1: Core Top Header (`Header.jsx`) with user profile and quick logout.
  - Tier 2: Core Collapsible Sidebar (`Sidebar.jsx`) with module categories.
  - No private third-tier navigation header.

---

## 5. Step 6 Preparation Findings (verified at `cf918b8`)

These affect the frontend remediation scope and were not in the original design draft:

1. **Direct `fetch` bypass in every service module.** Each of the 7 services performs its own paginated list request — `const res = await fetch(`/api/v1${endpoint}`, { headers })`, with a locally built `Authorization: Bearer ${localStorage.getItem('auth_token')}` header (`customerService.ts:22-27`, `deliveryService.ts:22-27`, `invoiceService.ts:24-29`, `orderService.ts:24-29`, `productService.ts:22-27`, `receivableService.ts:15-20`) — while detail/mutation calls go through `apiFetch` (`services/api.ts:55,74`). Both paths must migrate to the Core Axios instance (Workstream 6E); `VITE_API_BASE_URL` is honoured only by `api.ts` today.
2. **Private breadcrumb / page-header tier.** `components/common/PageScaffold.tsx` renders a module-level breadcrumb + page header above page content (`CustomerDetailPage.tsx:211-214` builds the trail) — this is the third navigation tier Workstream 6G forbids; it must be replaced by Core `Breadcrumb`/`ModuleHeader`.
3. **Delivery creation has two entry points.** `DeliveryCreateDialog` is mounted by `DeliveryListPage.tsx:232` **and** by `SalesOrderDetailPage.tsx:370` (`presetOrderId`); invoice creation is gated to `ke_toan`/`admin` at `InvoiceListPage.tsx:124-125`.
4. **Backend stub inventory.** 61 zero-byte files exist at HEAD — 49 under `backend/src` (legacy CJS routes/controllers/services/models plus `backend/src/config/database.js`), 3 under `frontend/src` (`.gitkeep` placeholders). Those Core-path placeholders were inherited from `main`; Step 5 must **delete** them, not migrate them — the integrated module carries only PH1 `.ts` sources.

---

## 6. Step 4 Sign-Off & Exit Criteria

- [x] Target `/sales/*` route map defined and aligned with Core `MainLayout`.
- [x] Target `/api/v1/sales/*` API map defined with Vietnamese canonical slugs.
- [x] RBAC permission mapping frozen on the shipped namespace: `sales.view/create/update/approve` (+ admin-only `sales.delete`); aging report `accounting.receivable` (rulings R-1/R-2).
- [x] Design tokens and layout structure aligned with Core V2.11 standard.
- [x] **Exit criterion met (2026-09-16):** Integration Owner ruled all six Integration Requests (R-1…R-6) — Step 5 (Backend Remediation) may proceed on `integration/ph1-sales-core`.

---

## 7. Step 5 As-Built Notes (backend port)

Backend port executed on `integration/ph1-sales-core` (worktree `../ph1-integration`), CommonJS under Core's conventions.

### 7.1 File layout

| Target path | Content |
|---|---|
| `backend/src/routes/salesRoutes.js` | Single mount point (`app.use('/api/v1/sales', salesRoutes)`), applies Core `requireAuth` to every sales endpoint |
| `backend/src/routes/sales/<domain>.routes.js` | `customers`, `products`, `orders`, `deliveries`, `invoices`, `receivables`, `overview` |
| `backend/src/services/sales/<domain>.service.js` | Business rules ported from the PH1 services (same method names) |
| `backend/src/repositories/sales/<domain>.repository.js` | SQL ported byte-identically from the PH1 repositories |
| `backend/src/utils/sales/{response,errors,validate,transaction,pricing,logger}.js` | Module utilities |
| `backend/src/config/sales.js` | Business policy switches only (`TAX_RATE`, `CREDIT_LIMIT_MODE`) |
| `backend/tests/test_ph1_sales_api.js` | Automated API/RBAC/envelope regression run (Gates 2-4 evidence) |

### 7.2 Deliberate deltas (review these first)

1. **`zod` replaced by a module-local validator.** Core's backend has no `zod`, and `backend/package.json` is not an approved extension point, so adding the dependency would be a frozen-file modification. `utils/sales/validate.js` reproduces the zod subset the PH1 schemas use (`optional/nullable/default/partial/min/max/int/positive/email/or/refine/superRefine/transform`) with the original Vietnamese messages. Parity is proven by the module harness (see §7.4) — notably that `.partial()` no longer re-applies field defaults, so a PATCH cannot silently zero stored columns.
2. **Response envelope switched to the contract (§9.3).** Success is `{success, message, data}`; list endpoints add `meta: {page, pageSize, total, totalPages}`. Errors come from Core's `errorHandler`: `{success:false, errorCode, message, details?}`; the PH1 envelope's `error: {code}` path is gone, so **Step 6 must read `errorCode`** when adapting the frontend client. `details` (field-level messages) is emitted only when `NODE_ENV=development` — Core behaviour, kept.
3. **Error classes expose `errorCode`** (not PH1's `code`) so Core's `errorHandler` maps status/code correctly. All PH1 error codes and Vietnamese messages are preserved (e.g. `CUSTOMER_NOT_FOUND`, `ORDER_NOT_FOUND`, `VALIDATION_ERROR`).
4. **Guard expressions.** Write actions use the shipped `sales.*` permissions (their holder set equals PH1's); reads keep PH1's role sets via `requireRoles` because the frozen Core permission matrix cannot express an accounting→sales read grant (contract §13.2 would normally add the permission to the matrix). Exact per-endpoint mapping is in each route file's header comment and §3 of this document.
5. **R-2 consequence (intentional):** `ke_toan` keeps the aging report but loses `cong-no` list/summary and customer-level receivables, because those now require `sales.view`. Confirm with the Integration Owner during Step 8 business verification.
6. **Local runtime configuration.** `backend/.env` (gitignored) points the integrated workspace at the disposable local dev database on `127.0.0.2:55432`; `erp_may10` itself was not reachable with the available credentials (28P01), and Core's `config/database.js` probes WSL for `localhost`, so an explicit loopback alias is used. Steps 10-11 need the owner's `erp_may10` credentials.

### 7.3 Retired with the port

PH1 `backend/src/{app.ts,server.ts}`, `routes/auth.routes.ts`, `services/auth.service.ts`, `middlewares/auth.middleware.ts`, `middlewares/error.middleware.ts`, `middlewares/rate-limit.middleware.ts`, `middlewares/request-id.middleware.ts`, `config/env.ts`, `config/database.ts`, `utils/{response,errors,logger,pricing}.ts`, all `models/*.ts` (types dissolve; runtime constants moved into the repositories) and the 49 zero-byte legacy stubs inherited from `main` are **not** carried into the integrated module.

### 7.4 Verification

- Validator harness: 43 assertions over coercion, defaults, partial-update semantics, enum/length/email rules, array length, refine/superRefine/transform — all pass.
- `backend/tests/test_ph1_sales_api.js`: boots Core's app in-process, mints Core-signed tokens for seeded users, and asserts 401/403/2xx per role, envelope shape, 404/422 error codes, and that a PATCH leaves omitted fields untouched — plus Core (`/api/v1/auth/me`, `/api/v1/modules`) and PH4 (`/api/v1/ton-kho`) regression checks.
- Results are recorded in `docs/ph1-remediation/BASELINE.md` §5 together with the exact commands.
