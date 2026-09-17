# PH1 Sales & Customer Management — ERP Core Compatibility Remediation Plan

**Repository:** `Khooy-nb1/erp-may10`  
**Original working branch:** `ph1-bh-qlkh` — **current baseline:** `feature/ph1-sale-core` @ `cf918b8`  
**Integration branch (R-3):** `integration/ph1-sales-core`, cut from `origin/develop` @ `7c98c78`  
**Module:** PH1 — Sales & Customer Management  
**Plan language:** English  
**Primary authority:** `ERP-M10-DEV-CONTRACT-2026`, Version `1.1 — VIETNAMESE RBAC STANDARDIZED RELEASE`  
**Plan purpose:** Convert the current standalone PH1 implementation into a native ERP Core module without modifying frozen Core Foundation or PH4 behavior.

> **AMENDMENTS — Integration Owner rulings, 2026-09-16.** Full log: `docs/ph1-remediation/INTEGRATION_REQUESTS.md` §2. Where this plan's text conflicts with a ruling below, the ruling wins.
>
> - **R-1 (permissions):** the contract's `ban_hang.*` namespace is **waived for PH1**. The shipped Core namespace is authoritative: `sales.view`, `sales.create`, `sales.update`, `sales.approve` (held by `admin` + `ban_hang`) and `sales.delete` (admin-only, `roleMapping.js:136`). Every `ban_hang.*` string still visible in prose below is superseded by its `sales.*` equivalent; the mapping tables that PH1 implements have been converted.
> - **R-2 (receivables):** PH1 stays read-only on `cong_no`: list + customer summary behind `sales.view`, aging report behind `accounting.receivable` (`ke_toan`, `admin`).
> - **R-3 (branch):** integration happens **only** on `integration/ph1-sales-core` cut from `origin/develop`; `ph1-bh-qlkh` and `main` are never integration targets.
> - **R-4 (TypeScript):** PH1 retains `.ts`/`.tsx`. Core verification of the integrated module is `vite build` only; PH1 keeps a module-local `tsc --noEmit` gate against React 18 type packages. No Core dependency or tooling change.
> - **R-5 (router):** the baseline is `react-router-dom` `^7.18.3` — verified identical to Core (`origin/develop:frontend/package.json:17`); the "Core v6" wording in the alignment table is revoked.
> - **R-6 (roles):** `ke_toan_truong` is treated as an alias of canonical `ke_toan`; PH1 uses only the six canonical role codes.

---

## 1. Objective

The current `ph1-bh-qlkh` branch implements a functional standalone Sales/CRM application, but it conflicts with the frozen ERP Core in several architectural areas: frontend runtime versions, routing, UI shell, login/authentication, backend module system, API namespace, and module routing.

The objective of this remediation is **not to redesign PH1 business logic from zero**. The objective is to:

1. Preserve validated PH1 business behavior wherever it is compatible.
2. Remove standalone application responsibilities that belong to ERP Core.
3. Align PH1 with the frozen Core technology, UI, authentication, RBAC, routing, API, and database contracts.
4. Integrate PH1 only through approved extension points.
5. Protect Core Foundation and PH4 from PH1-specific changes.
6. Produce a handover package that can pass the ERP integration acceptance gates.

The target end state is:

> **ERP Core owns platform concerns; PH1 owns Sales business concerns.**

---

## 2. Source-of-Truth Hierarchy

When implementation details conflict, use the following priority order:

1. **Frozen ERP Core source code and lockfiles on the Integration Owner's approved integration baseline.**
2. **ERP Module Development Contract `ERP-M10-DEV-CONTRACT-2026` v1.1.**
3. **Approved cross-module integration documents and current Core API contracts.**
4. **PH1 business requirements and existing PH1 automated tests.**
5. **Current implementation details in branch `ph1-bh-qlkh`.**

The PH1 branch must adapt to Core. Core must not be modified to accommodate the PH1 standalone architecture.

---

## 3. Current PH1 Baseline

The current branch contains a complete standalone frontend/backend structure.

### 3.1 Frontend baseline

Current implementation includes:

- React `19.x`
- React Router `7.x`
- Tailwind CSS `4.x`
- Vite `8.x`
- A private `AppShell.tsx`
- A private `LoginPage.tsx`
- A private `AuthContext.tsx`
- A private API client based on `fetch`
- Authentication state stored as `auth_token` / `auth_user`
- Standalone routes such as:
  - `/dashboard`
  - `/customers`
  - `/products`
  - `/sales-orders`
  - `/deliveries`
  - `/invoices`
  - `/receivables`
- Module pages and services for:
  - customers
  - products
  - sales orders
  - deliveries
  - invoices
  - receivables
  - dashboard

### 3.2 Backend baseline

Current implementation includes:

- TypeScript
- ESM (`"type": "module"`)
- Express 4
- JWT authentication using `jsonwebtoken`
- Bearer token verification with HS256 JWT
- PH1-owned authentication middleware
- Role checking through `requireRole(...)`
- API routes currently mounted independently under:
  - `/api/v1/auth`
  - `/api/v1/customers`
  - `/api/v1/products`
  - `/api/v1/sales-orders`
  - `/api/v1/deliveries`
  - `/api/v1/invoices`
  - `/api/v1/dashboard`
  - `/api/v1/receivables`
- Layered organization:
  - routes
  - services
  - repositories
  - validators
  - PostgreSQL access
- Existing automated tests across route/service/middleware layers.

### 3.3 Database baseline

The PH1 development environment currently assumes a standalone local database named approximately:

`erp_sales_crm_dev`

The ERP Core contract instead defines:

- database: `erp_may10`
- schema: `public`
- Vietnamese entity naming
- canonical Vietnamese role codes
- shared master data
- frozen PH4 tables and behavior.

The existing PH1 database scripts must therefore be treated as **development references**, not as the final integration source of truth.

---

## 4. Compatibility Gap Matrix

| Area | Current PH1 | ERP Core Target | Required Action | Severity |
|---|---|---|---|---|
| React | React 19 | React 18 | Pin PH1-compatible dependencies to the exact Core version | Critical |
| React Router | v7 | Core v6 baseline | Refactor route definitions/hooks only where incompatible and mount under Core router. **R-5 (2026-09-16): revoked — Core is on `^7.18.3`, identical to PH1; no version work is needed.** | Critical |
| Tailwind | v4 | v3.4.x | Remove v4-only setup/classes and use Core Tailwind configuration | Critical |
| Vite | v8 | Core Vite 6.x | Use Core build configuration; do not maintain a second application build pipeline | High |
| UI shell | `AppShell.tsx` | Core `MainLayout.jsx`, `Header.jsx`, `Sidebar.jsx`, `Breadcrumb.jsx` | Remove PH1 shell ownership and render PH1 pages inside Core shell | Critical |
| Login | `LoginPage.tsx` | Frozen Core `/login` | Remove PH1 login route/page from integrated module | Critical |
| Frontend auth | `AuthContext.tsx`, `auth_token` | Frozen Core AuthContext + `erp_token` | Consume Core auth/RBAC only; no parallel auth state | Critical |
| API client | local `fetch` wrapper | Core Axios instance | Migrate PH1 services to Core API client | High |
| Backend module format | TypeScript + ESM | Core Node.js + CommonJS | Convert PH1 backend integration layer to Core module convention | Critical |
| Auth mechanism | JWT HS256 | Core HMAC-SHA256 `erp_token` | Remove PH1 token issuing/verification and use Core middleware | Critical |
| Authorization | role-only checks | Core `requireAuth`, `requireRoles`, `requirePermission` | Enforce canonical Vietnamese permissions on every protected endpoint | Critical |
| API namespace | multiple root resources | `/api/v1/sales/*` | Remount all PH1 business APIs under Sales namespace | High |
| Frontend namespace | standalone root pages | `/sales/*` | Move all PH1 screens under `/sales/*` | High |
| Dashboard | PH1 private `/dashboard` | Frozen Core Dashboard | Do not replace Core dashboard; expose PH1 summary only inside Sales module if required | Critical |
| Database | standalone dev DB | shared `erp_may10.public` | Rebind repositories to Core database and verify schema compatibility | Critical |
| Roles | flexible string role checks | six canonical Vietnamese roles | Use `admin`, `ban_hang`, `san_xuat`, `mua_hang`, `kho`, `ke_toan` only | Critical |
| Permissions | absent/incomplete | `sales.*` | Map each PH1 action to canonical permissions | Critical |
| PH4 access | direct PH1 delivery concepts may overlap inventory | PH4 frozen | Use approved PH4 API/view integration only | Critical |

---

## 5. Non-Negotiable Constraints

### 5.1 Frozen Core files must not be modified by the PH1 team

PH1 remediation must not change the behavior of:

- Core `/login`
- Core `/`
- `Header.jsx`
- `Sidebar.jsx`
- `MainLayout.jsx`
- `Breadcrumb.jsx`
- Core `AuthContext.jsx`
- Core global Dashboard
- Core RBAC engine
- Core UI design tokens

If a change to those files is unavoidable, stop implementation and raise an Integration Request to the Integration Owner.

### 5.2 PH4 is frozen

PH1 must not directly modify:

- PH4 frontend screens
- PH4 controllers
- PH4 services
- PH4 routes
- inventory tables
- warehouse receipt/issue/transfer/count structures

PH1-to-PH4 interaction must use an approved API, view, or documented integration boundary.

### 5.3 Canonical roles are fixed

Only these six database role codes are valid:

- `admin`
- `ban_hang`
- `san_xuat`
- `mua_hang`
- `kho`
- `ke_toan`

Do not introduce English role codes or `warehouse_manager`.

**R-6 (2026-09-16):** `ke_toan_truong` is treated as an alias of `ke_toan` for PH1 — the module never branches on the 7th code.

### 5.4 Permission naming is fixed

PH1 permissions must use (**R-1, 2026-09-16** — the contract's `ban_hang.*` namespace is waived for PH1; the shipped Core namespace is authoritative, and no frozen Core file may be edited to satisfy the contract text):

- `sales.view`
- `sales.create`
- `sales.update`
- `sales.delete` (admin-only)
- `sales.approve`

Any additional permission requires Integration Owner approval before implementation.

### 5.5 Database naming is fixed

- Database: `erp_may10`
- Schema: `public`
- Table/column naming: Vietnamese, lowercase, snake_case
- No destructive changes to other modules.
- No renaming shared database entities to English.

---

## 6. Integration Strategy

Use a **module extraction and transplant strategy**, not a full-application merge.

### Keep from PH1 where compatible

Preserve and adapt:

- business services
- repository queries
- validation rules
- order calculations
- state-transition rules
- customer logic
- product lookup logic
- order logic
- delivery business logic that belongs to PH1
- invoice logic that belongs to PH1
- receivables read logic that is contractually assigned to PH1
- reusable PH1 UI screens/components
- useful automated tests

### Remove or retire from the integrated PH1 module

Do not carry the following standalone responsibilities into Core:

- PH1 `AppShell`
- PH1 login page
- PH1 authentication context
- PH1 token storage conventions
- PH1 token generation/verification
- PH1 global dashboard replacement
- PH1 application bootstrap/server ownership
- PH1 top-level router ownership
- duplicate Core layout/navigation
- duplicate Core security middleware
- duplicate global API client.

### Principle

The integrated module should resemble:

```text
ERP Core
├── Frozen platform
│   ├── login
│   ├── global layout
│   ├── global navigation
│   ├── auth
│   ├── RBAC
│   ├── API client
│   └── shared database pool
│
└── PH1 Sales module
    ├── /sales/* frontend screens
    ├── /api/v1/sales/* backend endpoints
    ├── PH1 business services
    ├── PH1 repositories
    ├── PH1 validators
    └── PH1 tests
```

---

# 7. Execution Plan — Aligned With the Official 13-Step Workflow

## Step 1 — Contract Compliance Freeze

### Goal

Establish an integration baseline before editing code.

### Actions

1. Create a remediation working branch from `ph1-bh-qlkh`.
2. Record the current branch commit SHA.
3. Record current frontend/backend build and test results.
4. Obtain the exact approved ERP Core integration commit SHA.
5. Record exact Core dependency versions from Core lockfiles.
6. Mark all Core/PH4 frozen paths in the implementation checklist.
7. Create a change boundary document:
   - files PH1 may change
   - files PH1 may add
   - files PH1 must not change.
8. Do not begin dependency migration until the Core baseline is identified.

### Deliverable

`docs/ph1-remediation/BASELINE.md`

### Exit criteria

- PH1 baseline reproducible.
- Core baseline reproducible.
- Frozen path list approved.

---

## Step 2 — Database Compatibility Audit

### Goal

Make `erp_may10.public` the only integration database source of truth.

### Actions

1. Compare PH1 `schema.sql` against the approved Core `erp_may10` schema.
2. Build a table/column compatibility matrix for:
   - `nguoi_dung`
   - `khach_hang`
   - `san_pham`
   - `don_vi_tinh`
   - `don_ban_hang`
   - `chi_tiet_don_ban_hang`
   - `giao_hang`
   - `hoa_don_ban_hang`
   - `cong_no`
   - any PH4 references needed by delivery.
3. Verify:
   - primary keys
   - foreign keys
   - status values
   - numeric precision
   - audit columns
   - timestamps/time zones
   - unique constraints
   - nullability.
4. Remove assumptions tied only to `erp_sales_crm_dev`.
5. Update repository SQL only when the Core schema proves a mismatch.
6. Do not alter PH4 schema.
7. Do not run destructive migration commands.
8. If PH1 requires a missing database field, document it as an Integration Request before any DDL change.

### Deliverable

`docs/ph1-remediation/DB_COMPATIBILITY_MATRIX.md`

### Exit criteria

All PH1 repository operations can be mapped to the existing `erp_may10.public` schema or have an approved migration request.

---

## Step 3 — Core API and Cross-Module Integration Audit

### Goal

Define exactly which capabilities PH1 owns and which must be consumed from Core/PH4.

### Actions

1. Inventory all existing PH1 endpoints.
2. Classify each endpoint as:
   - PH1-owned
   - Core-owned
   - PH4-owned
   - cross-module read
   - cross-module command.
3. Remove ownership conflicts.
4. In particular:
   - Core owns login/auth.
   - Core owns the global dashboard.
   - PH4 owns warehouse/inventory operations.
5. Document required PH4 integration points for:
   - stock availability lookup
   - warehouse reference data
   - delivery/stock issue linkage if required.
6. PH1 must not import PH4 controllers/services directly.

### Deliverable

`docs/ph1-remediation/INTEGRATION_BOUNDARIES.md`

### Exit criteria

Every current PH1 endpoint has one clear owner and target namespace.

---

## Step 4 — Target PH1 Design

### Goal

Freeze the integration design before large code changes.

### 4.1 Frontend target route map

Proposed module routing:

```text
/sales
/sales/customers
/sales/customers/new
/sales/customers/:id
/sales/products
/sales/orders
/sales/orders/new
/sales/orders/:id
/sales/deliveries
/sales/deliveries/:id
/sales/invoices
/sales/invoices/:id
/sales/receivables
```

If the Core route registry uses different approved slugs, the Core convention wins.

The PH1 module must not register:

```text
/login
/
/dashboard
/customers
/products
/sales-orders
/deliveries
/invoices
/receivables
```

as standalone global routes.

### 4.2 Backend target API map

Use a single PH1 namespace:

```text
/api/v1/sales/*
```

Recommended resource mapping:

```text
GET    /api/v1/sales/khach-hang
POST   /api/v1/sales/khach-hang
GET    /api/v1/sales/khach-hang/:id
PUT    /api/v1/sales/khach-hang/:id

GET    /api/v1/sales/san-pham

GET    /api/v1/sales/don-hang
POST   /api/v1/sales/don-hang
GET    /api/v1/sales/don-hang/:id
PUT    /api/v1/sales/don-hang/:id
POST   /api/v1/sales/don-hang/:id/phe-duyet
POST   /api/v1/sales/don-hang/:id/huy

GET    /api/v1/sales/giao-hang
GET    /api/v1/sales/giao-hang/:id

GET    /api/v1/sales/hoa-don
GET    /api/v1/sales/hoa-don/:id

GET    /api/v1/sales/cong-no
```

Do not finalize endpoint names until compared with the current Core API naming registry. Namespace compliance is mandatory; exact approved resource slugs are an integration decision.

### 4.3 RBAC map

Baseline mapping (**R-1 applied** — the shipped `sales.*` namespace replaces the contract's `ban_hang.*`):

| PH1 Capability | Required Permission |
|---|---|
| List/view customers | `sales.view` |
| View products for sales | `sales.view` |
| View orders | `sales.view` |
| Create customer | `sales.create` |
| Create sales order | `sales.create` |
| Update draft customer/order | `sales.update` |
| Cancel/delete eligible draft order | `sales.delete` |
| Approve order | `sales.approve` |
| View deliveries | `sales.view` |
| View invoices | `sales.view` |
| View receivables | list + customer summary `sales.view`; aging report `accounting.receivable` (R-2) |

Receivables ownership is **resolved by ruling R-2 (2026-09-16)**: PH1 keeps read-only customer receivable visibility (list/summary behind `sales.view`, aging behind `accounting.receivable`); PH5 retains all accounting write ownership.

### Deliverables

- route specification
- API specification draft
- RBAC matrix draft
- UI screen map
- PH4 integration map.

### Exit criteria

Integration Owner has no unresolved architecture objection.

---

## Step 5 — Backend Remediation

### Goal

Convert PH1 from a standalone TypeScript/ESM backend into a Core-compatible Sales module.

### Workstream 5A — Remove standalone application ownership

Retire integrated use of:

- `backend/src/server.ts`
- PH1-owned global `app.ts` route bootstrap
- PH1 `/auth` route
- PH1 global `/dashboard` route
- PH1 auth token generation
- PH1 auth middleware as the production security authority.

Business-unit tests may temporarily keep test harness adapters, but final Core runtime must use Core bootstrap and middleware.

### Workstream 5B — Module-system alignment

Current PH1 uses ESM. Target Core uses CommonJS.

Actions:

1. Convert PH1 integration modules to the Core CommonJS convention.
2. Remove `"type": "module"` assumptions from the integrated backend package.
3. Replace ESM-only imports/exports with the exact Core pattern.
4. Do not create a parallel Node runtime for PH1.
5. Keep conversion commits mechanical where possible:
   - syntax first
   - behavior changes second.

### Workstream 5C — Core authentication and RBAC

Remove:

- JWT issuance for PH1 runtime
- JWT verification in PH1 middleware
- `auth_token`
- PH1-owned identity fallback logic
- authorization based only on UI visibility.

Use:

```text
requireAuth
requireRoles
requirePermission
```

from Core.

Every protected PH1 endpoint must implement:

```text
No token           -> 401
Invalid token      -> 401
Valid unauthorized -> 403
Valid authorized   -> 200/201
```

Identity must come from server-validated Core authentication and database state.

### Workstream 5D — API namespace migration

Move current route mounts:

```text
/api/v1/customers
/api/v1/products
/api/v1/sales-orders
/api/v1/deliveries
/api/v1/invoices
/api/v1/receivables
```

under:

```text
/api/v1/sales/*
```

Create one module router entry point that Core can mount.

Example concept:

```text
salesRouter
├── customer routes
├── product lookup routes
├── order routes
├── delivery routes
├── invoice routes
└── receivable routes
```

### Workstream 5E — Business logic ownership

Preserve the rule:

> Client input is untrusted; the backend recalculates and validates authoritative business values.

Review especially:

- line totals
- order subtotal
- discounts
- tax
- credit limit
- status changes
- invoice values
- receivable balances.

### Workstream 5F — Transactions

Any operation updating multiple tables must use one ACID transaction.

Mandatory review targets:

- create order header + lines
- update order + lines
- approve order when it creates dependent records
- delivery operations that create/update linked data
- invoice generation if multi-table
- receivable mutation if any.

Failure at any step must roll back the entire operation.

### Workstream 5G — Concurrency

For finite shared resources, use the approved locking strategy.

Examples:

- customer credit exposure
- stock availability when PH1 owns a reservation step
- duplicate document number generation.

If stock mutation belongs to PH4, PH1 must call the PH4 contract rather than directly locking/changing PH4 tables.

### Exit criteria

- Core can mount the PH1 router.
- No PH1 auth subsystem is required at runtime.
- All PH1 APIs are namespaced.
- All protected APIs enforce Core RBAC.
- Unit/integration tests pass in Core-compatible runtime.

### Status — **COMPLETE (2026-09-16, `integration/ph1-sales-core`)**

| Exit criterion | Evidence |
|---|---|
| Core mounts the router | `backend/src/app.js:82` -> `backend/src/routes/salesRoutes.js`; 32 routes registered under `/api/v1/sales` |
| No PH1 auth subsystem | PH1 `auth.middleware`/JWT/`auth_token` retired; module uses Core `requireAuth`/`requireRoles`/`requirePermission` |
| APIs namespaced | `/khach-hang`, `/san-pham`, `/don-hang`, `/giao-hang`, `/hoa-don`, `/cong-no`, `/tong-quan` (matches `TARGET_DESIGN.md` §2) |
| Core RBAC enforced | `node backend/tests/test_ph1_sales_api.js` -> 123 checks, 0 failures (401/403/200 matrix per role, per domain) |
| Tests pass in the Core runtime | same run; SQL parity recorded in `docs/ph1-remediation/STEP5_BACKEND_EVIDENCE.md` (§2), gaps/defects in `KNOWN_GAPS.md` |

#### Follow-up — request-validation hardening (2026-09-17)

Step 5D/5E "client input is untrusted" was tightened after the port, keeping PH1 business behaviour:

- Path ids must be plain decimal integers (`utils/sales/request.js::parseIdParam`) — `Number('abc')` used to reach a
  `BIGINT` comparison and answer 500.
- PH1's bilingual aliases (`ma_don_ban_hang`/`orderId`, `ma_kho`/`warehouseId`, ...) may no longer disagree: a
  payload carrying both spellings with different values is rejected with `422` instead of silently resolving.
- Dates must be real `YYYY-MM-DD` calendar days; `2026-02-30` no longer normalises into March, and the order
  date rule now also survives a missing date (previously `undefined.split()` -> 500).
- `overdueOnly` is parsed strictly (`KNOWN_GAPS.md` G-3 now FIXED); bounds/array caps added on every field;
  field messages are Vietnamese throughout.
- Unknown keys stay **stripped** and a forbidden `sortBy` keeps falling back to the default order — PH1 parity,
  pinned by the parity suite (`KNOWN_GAPS.md` G-9).

Evidence: `backend/tests/test_ph1_validation.js` (69 checks, no database), `backend/tests/test_ph1_sales_api.js`
(123 checks), `backend/tests/test_ph1_business_parity.js` (70 checks), `frontend` `npm run build` exit 0.

---

## Step 6 — Frontend Remediation

### Goal

Convert the standalone PH1 SPA into a native route subtree rendered by ERP Core.

### Workstream 6A — Dependency alignment

Target the exact Core versions. Based on the approved compatibility baseline, expected direction is:

- React 19 -> React 18
- React Router 7 -> Core React Router 6
- Tailwind 4 -> Tailwind 3.4.x
- Vite 8 -> Core Vite 6.x

Rules:

1. Use the exact Core package versions and lockfile constraints.
2. Do not maintain a separate PH1 React root.
3. Do not introduce dependency aliases to keep two React versions.
4. Do not retain Tailwind v4-only directives or utilities.
5. Run a compile checkpoint after each dependency family migration.

### Workstream 6B — Remove private shell

Retire:

`frontend/src/components/common/AppShell.tsx`

PH1 pages must render inside Core:

- `MainLayout`
- `Header`
- `Sidebar`
- `Breadcrumb`
- `ModuleHeader`.

The PH1 team must not recreate these components under new names.

### Workstream 6C — Remove private login

Retire integrated use of:

`frontend/src/pages/auth/LoginPage.tsx`

The module must depend on Core `/login`.

There must be exactly one login flow.

### Workstream 6D — Remove private AuthContext

Retire integrated use of:

`frontend/src/context/AuthContext.tsx`

Do not keep:

- `auth_token`
- `auth_user`
- duplicated session hydration
- duplicated logout
- duplicated identity cache.

Consume Core AuthContext and RBAC guards.

### Workstream 6E — Replace private API client

Retire integrated use of the PH1 `fetch`-based `api.ts`.

PH1 services must call the Core Axios instance so that:

- `Authorization: Bearer <erp_token>` is attached consistently
- authentication failure handling remains centralized
- base URL is centralized
- response/error normalization follows Core
- no PH1 code reads token storage directly.

### Workstream 6F — Route integration

Current standalone paths must move under:

```text
/sales/*
```

PH1 should contribute child routes to the Core router instead of creating an independent root `<Routes>` application.

### Workstream 6G — Navigation integration

PH1 must not render a private left sidebar.

Sales navigation entries must be registered using the Core-approved menu configuration/extension mechanism.

Expected PH1 menu concepts:

- Sales overview
- Customers
- Products
- Sales orders
- Deliveries
- Invoices
- Receivables

There must be no third horizontal navigation tier between `ModuleHeader` and page content.

### Workstream 6H — Core Design System V2.11

Refactor PH1 presentation to use Core tokens and shared components.

Required visual contract includes:

- Corporate Blue `#0F5FAF`
- workspace background `#F7FAFC`
- border `#E2EDF5`
- primary text `#172033`
- secondary text `#5F6F82`
- `rounded-2xl` cards/tables
- `rounded-xl` form controls/buttons
- Core status badge patterns
- responsive support:
  - Desktop >= 1024px
  - Tablet 768–1023px
  - Mobile < 768px.

### Workstream 6I — TypeScript compatibility decision

The PH1 business UI is currently TypeScript/TSX.

Before changing it:

1. Confirm whether the frozen Core Vite build accepts `.ts/.tsx`.
2. If yes, PH1 may retain TypeScript for module-owned components.
3. If no, translate PH1 components to the Core-supported JSX convention.
4. Do not modify Core build tooling merely to preserve PH1 TypeScript.

### Exit criteria

- PH1 loads at `/sales/*`.
- Core shell remains unchanged.
- Core login remains the only login.
- Core auth remains the only auth context.
- No duplicate sidebar/header.
- PH1 frontend production build passes using Core dependencies.

### Status — **COMPLETE (2026-09-16, `integration/ph1-sales-core`)**

- All twelve PH1 screens render at `/sales/*` inside Core's shell, auth and RBAC: **70 module files / 8 452 lines** under `frontend/src/sales/`, plus three wiring edits (route mount, menu, module stylesheet) and the token map `docs/ph1-remediation/FRONTEND_TOKEN_MAP.md`.
- Exit criteria: production build `✓ 1815 modules transformed, built in 4.18s`; unauthenticated `/sales` → Core `/login`; single sidebar/header; module contains no private auth, API client, shell or login.
- Runtime verification (backend `:5000` + Vite `:5174`, Postgres `erp_may10`): all 12 routes + 4 detail pages loaded real data with **zero console errors**; order-create dialog opens/locks scroll/closes on Escape; `ban_hang` is denied the aging report client-side (ruling R-2).
- Module regression: `node tests/test_ph1_sales_api.js` → **115 passed, 0 failed**.
- Evidence: `docs/ph1-remediation/STEP6_FRONTEND_EVIDENCE.md`. Open owner decision: **G-7** (`kho` holds no `sales.view`, so warehouse accounts cannot reach `/sales*` despite the backend serving them a fulfillment-scoped dashboard).

---

## Step 7 — RBAC Integration

### Goal

Make authorization consistent with the canonical Vietnamese RBAC contract.

### Backend requirements

All PH1 business endpoints must use Core server-side authorization.

Do not rely on:

- route names
- frontend hiding
- `x-role`
- `x-user-id`
- client-provided identity.

### Frontend requirements

Use Core:

- `ProtectedRoute`
- `PermissionGuard`
- `RoleGuard`

only for UX/access presentation.

Backend remains authoritative.

### Test matrix per protected endpoint

At minimum:

1. no token -> 401
2. tampered/invalid token -> 401
3. valid user without permission -> 403
4. `ban_hang` with required permission -> expected success
5. `admin` -> expected success where contract grants full access.

### Exit criteria

RBAC tests pass across all major PH1 routes.

### Status — **COMPLETE (2026-09-17, `integration/ph1-sales-core`)**

| Requirement | Evidence |
|---|---|
| Backend authority only (no `x-role`/`x-user-id`/client identity) | `backend/tests/test_rbac_security.js` -> 27/27 (spoofing scenarios rejected); parity suite pins `identity headers cannot escalate a token` |
| Test matrix 1–5 per protected endpoint | `backend/tests/test_ph1_sales_api.js` -> 115 checks (401 no/forged token, 403 wrong role, 200 for allowed role) across customers, products, orders, deliveries, invoices, receivables, dashboard |
| Frontend guards are presentation-only | `frontend/src/sales/SalesRoutes.jsx` + `PermissionGuard`/`RoleGuard` usage; server re-checks every call (403s reproduced with valid tokens) |
| Canonical roles/permissions | `PH1_HANDOVER/RBAC.md`; rulings R-1 (namespace) and R-6 (`ke_toan_truong` ≡ `ke_toan`) |
| Role-scoped dashboard scopes | parity suite: `ke_toan` financial key set, `kho` fulfillment key set, `san_xuat` 403 |

---

## Step 8 — Internal Business Verification

### Goal

Confirm migration did not change business behavior.

### Required business test areas

#### Customers

- create
- update
- duplicate code prevention
- validation
- credit data
- audit fields.

#### Products

- active-product lookup
- unit display
- paging/filtering
- no PH1 mutation of unrelated inventory master data.

#### Sales orders

- create header + lines atomically
- backend recalculates totals
- invalid product/customer rejection
- state machine validation
- draft update rules
- approval rules
- cancellation rules
- credit limit policy.

#### Deliveries

- correct linkage to sales order
- allowed status transitions
- clear ownership boundary with PH4
- no direct PH4 modification.

#### Invoices

- valid source sales order/delivery relationship
- server-side totals
- duplicate prevention
- status rules.

#### Receivables

- correct customer/invoice linkage
- correct balance interpretation
- permission ownership confirmed with PH5 contract.

### Exit criteria

All preserved PH1 business tests pass after architecture migration.

### Status — **COMPLETE (2026-09-17, `integration/ph1-sales-core`)**

| Area | Evidence |
|---|---|
| Customers / products / orders / deliveries / invoices / receivables | `backend/tests/test_ph1_business_parity.js` -> **70 checks, 0 failures** (successor of the retired PH1 vitest suites; mapping in `STEP8_BUSINESS_PARITY_EVIDENCE.md` §3) |
| Credit policy, state machines, duplicate protection, server-authoritative totals | same suite (`CUSTOMER_CREDIT_LIMIT_EXCEEDED` acknowledgment flow, `cho_giao→dang_giao→da_giao/that_bai`, invoice guards, per-line half-up pricing) |
| Receivables permission ownership (R-2 confirmation) | parity suite pins `ke_toan 403 / ban_hang 200` on ledger list+summary while aging stays `accounting.receivable`; `STEP8_BUSINESS_PARITY_EVIDENCE.md` §4 |
| Ledger ↔ dashboard consistency | parity: aging bands exact at 1/30/31/60/61/90/91-day boundaries; overdue bands == summary `totalOverdue`; dashboard money == ledger money |
| Regression suites | API 115/0 · RBAC 27/27 · cross-module 8/8 · audit complete · PH4 16/16 (`PH1_HANDOVER/TEST_REPORT.md`) |

---

## Step 9 — Security Verification

Execute the contract security checklist, including:

- unauthenticated rejection
- invalid/tampered token rejection
- expired token rejection
- `x-role` spoofing rejection
- `x-user-id` spoofing rejection
- 403 for unauthorized roles/permissions
- parameterized SQL
- FK integrity
- strict input validation
- duplicate-document protection
- mass-assignment protection
- no password/hash leakage
- no stack trace leakage
- no raw SQL leakage
- CORS not configured as wildcard for authenticated operations.

### Additional PH1 checks

- no `auth_token` reads remain in integrated module
- no JWT secret remains required by PH1 module runtime
- no private login endpoint remains mounted
- no permissive fallback user exists
- no client-submitted total is accepted as authoritative.

### Exit criteria

All security acceptance tests pass.

### Status — **COMPLETE (2026-09-17, `integration/ph1-sales-core`)**

| Checklist group | Evidence |
|---|---|
| 401 family (missing/forged/expired/future token) | RBAC suite + parity (`expired and future-dated tokens -> 401`); Core 24 h max-age + skew guard |
| 403 family + no client identity trust | RBAC suite; parity (`identity headers cannot escalate a token`, `san_xuat` 403, R-2 `ke_toan` 403) |
| Injection / FK / validation / duplicates / mass assignment | parity (sortBy injection probe + table integrity, PATCH whitelist, 422 field details), cross-module TEST 08, smoke duplicate-invoice 409 |
| Leakage (stack, SQL, hash) | parity scans 17 error payloads; production-mode handler check omits `details`; module SQL never selects `mat_khau` |
| CORS | parity: unlisted origin receives no ACAO header; allow-listed origin echoed |
| PH1-specific checks (no `auth_token`, no JWT secret, no private login, no fallback user, no client totals) | `docs/ph1-remediation/STEP9_SECURITY_EVIDENCE.md` §2 |

---

## Step 10 — Production Build Verification

Run from the integrated Core workspace:

```bash
npm install
npm run build
```

and all approved backend checks.

Required:

- exit code 0
- no React version duplication
- no router version duplication
- no Tailwind compiler mismatch
- no unresolved ESM/CommonJS boundary
- no TypeScript/JSX build mismatch
- no broken Core routes
- no PH4 build regression.

Also run a clean install/build, not only an incremental local build.

### Exit criteria

A clean production build succeeds from the approved Core baseline.

### Status — **COMPLETE (2026-09-17, `integration/ph1-sales-core`)**

| Requirement | Evidence |
|---|---|
| Clean install + build exit 0 | `frontend/`: `rm -rf node_modules && npm ci` (210 packages) `&& npm run build` -> **exit 0**, 1815 modules, `dist/assets/index-D3m5CKc7.js` 854.93 kB (215.60 kB gzip) |
| No React / router duplication, no Tailwind mismatch, no ESM/CJS or TSX build mismatch | `npm ls` full tree: react/react-dom 18.3.1 only, react-router-dom 7.18.3 only, tailwindcss 3.4.19, vite 6.4.3; TSX compiled by Vite/esbuild (R-4) |
| No broken Core routes / PH4 build regression | single SPA bundle; backend suites re-run green in the same session (`PH1_HANDOVER/TEST_REPORT.md`) |
| Full log | `docs/ph1-remediation/STEP10_BUILD_EVIDENCE.md` (incl. the Windows file-lock note about stopping the two Vite dev-server processes before a clean install) |

---

## Step 11 — Cross-Module Integration Verification

### Goal

Validate PH1 behavior against PH4 without violating ownership boundaries.

Test at least:

1. sales user can view approved stock availability through the sanctioned interface.
2. PH1 cannot directly mutate PH4 protected tables through its own repository layer.
3. delivery flow passes the correct sales-order reference to the approved PH4 integration point where applicable.
4. insufficient stock returns the expected conflict/business result.
5. concurrent stock-related operations cannot create negative inventory.
6. PH4 regression suite remains green.

If the existing PH4 contract cannot provide required data, stop and create an Integration Request.

### Exit criteria

PH1 ↔ PH4 integration tests pass and PH4 source remains unchanged.

### Status — **COMPLETE (2026-09-17, `integration/ph1-sales-core`)**

| Required test | Evidence |
|---|---|
| 1. Stock availability through the sanctioned interface | PH4 read-only joins in the sales repositories; `PH4 /api/v1/ton-kho still reachable -> 200` (smoke suite) |
| 2. No direct PH4 mutation by the module | write-surface audit: only sales-owned tables are written (`STEP11_CROSS_MODULE_EVIDENCE.md` §2) |
| 3. Delivery carries the sales-order reference | smoke suite + parity (delivery created/linked to the order; state machine asserted) |
| 4. Insufficient stock → expected conflict | cross-module scenario 5 → **HTTP 409** |
| 5. Concurrent stock operations cannot go negative | cross-module scenario 7 (row lock) |
| 6. PH4 regression remains green | `backend/tests/test_ph4_api.js` -> **16/16**; 8/8 cross-module scenarios; audit script complete |

Test-side note: both cross-module scripts were modernised to Core token auth (scenarios unchanged) — `STEP11_CROSS_MODULE_EVIDENCE.md` §1.1.

---

## Step 12 — Handover Package

Prepare:

```text
PH1_HANDOVER/
├── README.md
├── API_SPEC.md
├── RBAC.md
├── BUSINESS_RULES.md
├── TEST_REPORT.md
├── INTEGRATION.md
├── frontend/
├── backend/
└── database/
    ├── schema.sql
    └── seed.sql
```

For this remediation, `database/schema.sql` must contain only approved PH1-owned additive DDL, if any. It must not reproduce destructive changes against frozen/shared objects.

### Additional recommended document

```text
PH1_HANDOVER/COMPATIBILITY_REPORT.md
```

Include:

- original PH1 vs Core gap matrix
- files removed/retired
- files migrated
- dependency version results
- route migration map
- API migration map
- auth/RBAC migration evidence
- Core/PH4 regression results.

### Exit criteria

Handover package is reproducible by another engineer.

### Status — **COMPLETE (2026-09-17, `integration/ph1-sales-core`)**

| Deliverable | Location |
|---|---|
| Handover package index + reproduction steps | `PH1_HANDOVER/README.md` |
| Test report (suite inventory, results, data policy) | `PH1_HANDOVER/TEST_REPORT.md` |
| Compatibility report (gap matrix, retirements, dependency results, route/API maps, regression) | `PH1_HANDOVER/COMPATIBILITY_REPORT.md` |
| Module maps | `PH1_HANDOVER/backend/README.md`, `PH1_HANDOVER/frontend/README.md` |
| Database stance (0 additive DDL, 0 seed) | `PH1_HANDOVER/database/{README.md,schema.sql,seed.sql}` |
| Step evidence (existing + new) | `docs/ph1-remediation/STEP5_BACKEND_EVIDENCE.md`, `STEP6_FRONTEND_EVIDENCE.md`, `STEP8_BUSINESS_PARITY_EVIDENCE.md`, `STEP9_SECURITY_EVIDENCE.md`, `STEP10_BUILD_EVIDENCE.md`, `STEP11_CROSS_MODULE_EVIDENCE.md` |

---

## Step 13 — Integration Owner Acceptance

The final package must pass four gates.

### Gate 1 — Core/PH4 preservation

Pass conditions:

- no unauthorized Core source changes
- no unauthorized PH4 source changes
- no destructive shared DB changes
- Core login/shell/dashboard still work.

### Gate 2 — UI V2.11

Pass conditions:

- PH1 uses Core layout
- two-level navigation only
- correct Core design tokens
- no private shell
- responsive screens.

### Gate 3 — Security/RBAC

Pass conditions:

- Core `erp_token`
- HMAC-SHA256 validation through Core
- canonical Vietnamese roles
- canonical `sales.*` permissions
- correct 401/403 behavior.

### Gate 4 — Automated regression

Pass conditions:

- production build passes
- PH1 tests pass
- Core regression passes
- PH4 regression passes
- integration tests pass.

Only after all four gates pass should PH1 be merged.

### Status (2026-09-17, `integration/ph1-sales-core`)

| Gate | Status | Evidence |
|---|---|---|
| 1 — Core/PH4 preservation | **PASS** | Only the three approved seams modified (`backend/src/app.js`, `frontend/src/routes/AppRoutes.jsx`, `frontend/src/config/menu.js`); zero PH4 paths touched; 0 DDL (schema blob identical to Core) |
| 2 — UI V2.11 | **PASS** | `STEP6_FRONTEND_EVIDENCE.md`: Core layout/Header/Sidebar tokens, two-level navigation, no private shell/login; responsive screens verified in-browser during Step 6 |
| 3 — Security/RBAC | **PASS** | `STEP9_SECURITY_EVIDENCE.md`: Core `erp_token` HMAC, canonical Vietnamese roles, `sales.*` permissions, 401/403 matrix (RBAC 27/27, API 115/0, parity security section) |
| 4 — Automated regression | **PASS** | `PH1_HANDOVER/TEST_REPORT.md`: production build exit 0 (clean install), API 115/0, parity 70/0, RBAC 27/27, cross-module 8/8, audit complete, PH4 16/16 |

Two owner-visible items remain before merge sign-off (not blockers of the four gates' test criteria): the module gate `sales.view` keeps `kho`/`ke_toan` out of the Sales UI (`KNOWN_GAPS.md` G-7) and ruling R-2's consequence for `ke_toan` reads (confirmed in `STEP8_BUSINESS_PARITY_EVIDENCE.md` §4).

---

# 8. File-Level Remediation Map

The exact destination paths must follow the approved Core repository structure. The table below defines intent.

| Current PH1 path | Action | Target responsibility |
|---|---|---|
| `frontend/src/components/common/AppShell.tsx` | Retire | Core `MainLayout/Header/Sidebar/Breadcrumb` |
| `frontend/src/pages/auth/LoginPage.tsx` | Retire | Core `/login` |
| `frontend/src/context/AuthContext.tsx` | Retire | Core AuthContext |
| `frontend/src/routes/AppRoutes.tsx` | Refactor | Export `/sales/*` child routes only |
| `frontend/src/routes/ProtectedRoute.tsx` | Retire/refactor | Use Core `ProtectedRoute` |
| `frontend/src/services/api.ts` | Retire | Use Core Axios instance |
| `frontend/src/services/customerService.ts` | Adapt | Core API client + `/api/v1/sales/*` |
| `frontend/src/services/productService.ts` | Adapt | Core API client + `/api/v1/sales/*` |
| `frontend/src/services/orderService.ts` | Adapt | Core API client + `/api/v1/sales/*` |
| `frontend/src/services/deliveryService.ts` | Adapt | Core API client + `/api/v1/sales/*` |
| `frontend/src/services/invoiceService.ts` | Adapt | Core API client + `/api/v1/sales/*` |
| `frontend/src/services/receivableService.ts` | Adapt | Core API client + `/api/v1/sales/*` |
| `frontend/src/pages/dashboard/*` | Retire or convert to Sales-only overview | Never replace Core Dashboard |
| `backend/src/server.ts` | Retire from integration | Core server/bootstrap |
| `backend/src/app.ts` | Refactor | PH1 exports router, Core mounts it |
| `backend/src/routes/auth.routes.ts` | Retire | Core auth routes |
| `backend/src/services/auth.service.ts` | Retire | Core HMAC auth |
| `backend/src/middlewares/auth.middleware.ts` | Retire | Core security middleware |
| PH1 business `*.routes.*` | Adapt | `/api/v1/sales/*` |
| PH1 business `*.service.*` | Preserve/adapt | PH1 business logic |
| PH1 business `*.repository.*` | Audit/adapt | `erp_may10.public` |
| PH1 business validators | Preserve/adapt | Server-side validation |
| `backend/database/schema.sql` | Audit only | Core DB is authoritative |
| `docker-compose.yml` | Do not use as integration architecture | Use Core environment |

---

# 9. Recommended Migration Order

Do not perform all changes in one commit.

Recommended sequence:

```text
R0  Baseline and compatibility documentation
R1  Dependency alignment only
R2  Frontend route namespace migration
R3  Remove PH1 shell/login/auth context
R4  Replace frontend API client with Core client
R5  Backend CommonJS/module-entry migration
R6  Replace PH1 auth with Core auth/RBAC
R7  API namespace migration
R8  Database repository compatibility fixes
R9  Business transaction/concurrency hardening
R10 Core UI V2.11 remediation
R11 Automated tests and security tests
R12 PH4 integration verification
R13 Handover documentation
```

Each remediation commit should have:

- one architectural purpose
- passing build/tests relevant to that purpose
- no unrelated formatting churn.

This makes rollback and review substantially safer.

---

# 10. Detailed Dependency Migration Rules

## 10.1 React

Do not simply edit `package.json` and hope the application works.

Procedure:

1. pin exact Core React/ReactDOM versions.
2. delete PH1-specific lockfile state in the integration workspace only when approved.
3. reinstall using Core package manager.
4. check:
   - root rendering
   - context behavior
   - strict mode behavior
   - form libraries
   - React Query compatibility
   - Radix compatibility if any approved PH1 component still depends on it.
5. remove duplicate React copies.

## 10.2 React Router

Refactor against the Core router, not against a private PH1 BrowserRouter.

Review:

- nested routes
- `Navigate`
- `Outlet`
- `useNavigate`
- `useParams`
- `useLocation`
- route registration.

PH1 exports route elements/configuration for `/sales/*`; Core owns the router root.

## 10.3 Tailwind

Remove Tailwind v4-specific configuration and directives.

Use Core:

- `tailwind.config.*`
- PostCSS/Vite integration
- design tokens
- content scanning
- class conventions.

Search PH1 for v4-only utility behavior before downgrade.

## 10.4 Vite

PH1 must use Core Vite.

Do not preserve a standalone PH1 `vite.config.js` if the module is compiled inside Core.

Any alias/env variable required by PH1 must be proposed as a Core-compatible addition rather than silently replacing Core config.

---

# 11. Authentication Migration Design

## Current problem

The PH1 branch currently has two platform-level responsibilities that conflict with Core:

1. it issues/validates its own JWT.
2. it stores/loads its own `auth_token`.

Both must be removed from the integrated runtime.

## Target request flow

```text
Core Login
    ↓
Core stores/manages erp_token
    ↓
Core Axios instance
    ↓
Authorization: Bearer <erp_token>
    ↓
Core requireAuth
    ↓
DB validation against nguoi_dung
    ↓
Core permission middleware
    ↓
PH1 route handler
    ↓
PH1 service/repository
```

PH1 must never parse the token client-side to establish authority.

---

# 12. API Migration Design

## Rule

The API namespace change must be done **server and client together**.

For every existing PH1 endpoint create a migration table:

| Old endpoint | New endpoint | Permission | Client caller | Test |
|---|---|---|---|---|
| `/api/v1/customers` | `/api/v1/sales/khach-hang` | `sales.view/create` | customer service | required |
| `/api/v1/products` | `/api/v1/sales/san-pham` | `sales.view` | product service | required |
| `/api/v1/sales-orders` | `/api/v1/sales/don-hang` | `sales.*` | order service | required |
| `/api/v1/deliveries` | `/api/v1/sales/giao-hang` | `sales.view/...` | delivery service | required |
| `/api/v1/invoices` | `/api/v1/sales/hoa-don` | role-gated `admin`/`ke_toan` on issue; `sales.view` on read | invoice service | required |
| `/api/v1/receivables` | `/api/v1/sales/cong-no` | `sales.view` on list/summary; `accounting.receivable` on aging (R-2) | receivable service | required |

Do not create permanent duplicate old/new routes unless the Integration Owner explicitly requires a temporary compatibility window.

---

# 13. Database and Data-Safety Plan

Before any integration test that writes data:

1. use a dedicated integration database/transactional test environment based on the Core schema.
2. back up or snapshot test data.
3. verify PH1 repositories use parameterized SQL.
4. verify no migration contains:
   - `DROP TABLE`
   - destructive `TRUNCATE`
   - unauthorized shared-table `ALTER TABLE`.
5. verify audit fields use authenticated Core user IDs.
6. verify status strings match actual Core database constraints.
7. verify document-number uniqueness.
8. verify all monetary columns preserve required precision.
9. verify transaction rollback with forced failure tests.
10. verify PH4 tables are not directly written by PH1 unless explicitly allowed by contract.

---

# 14. Test Strategy

## 14.1 Static/build checks

- frontend clean install
- frontend production build
- backend startup/module load
- lint if Core has lint configured
- typecheck only if TypeScript remains supported by Core.

## 14.2 Unit tests

Preserve/refactor PH1 service and validator tests.

Focus on:

- calculations
- validation
- status transitions
- permission-to-action mapping.

## 14.3 API tests

Cover all main routes and HTTP codes:

- 200
- 201
- 400
- 401
- 403
- 404
- 409
- 422 where applicable.

## 14.4 RBAC tests

Every protected endpoint gets at least:

- anonymous
- unauthorized role
- authorized `ban_hang`
- `admin`.

## 14.5 Transaction tests

Inject a controlled failure after the first database update and prove rollback.

## 14.6 Concurrency tests

Where PH1 controls a finite resource:

- send concurrent requests
- prove row-lock/constraint behavior
- prove no invalid negative/over-limit state.

## 14.7 UI tests

Verify:

- no private shell
- no private login
- no third navigation layer
- correct Core header/sidebar/breadcrumb
- correct ModuleHeader
- correct responsive behavior.

## 14.8 Regression tests

Must include:

- Core login
- Core home/dashboard
- Core navigation
- Core RBAC
- PH4 warehouse screens
- PH4 APIs
- PH1 module.

---

# 15. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| React 19 -> 18 breaks third-party dependencies | High | Pin Core versions first; remove/replace incompatible PH1-only packages |
| Router 7 -> 6 changes API behavior | Medium/High | Refactor child-route registration and test every route |
| Tailwind 4 -> 3 causes visual/class failures | High | Audit v4-only syntax before downgrade; use Core tokens |
| TSX not supported by Core build | High | Gate decision early; convert PH1-owned UI to JSX if required |
| ESM -> CommonJS conversion introduces runtime bugs | High | Separate mechanical conversion from behavior changes |
| JWT removal breaks all API auth tests | Expected | Rebuild tests around Core `erp_token` fixtures/middleware |
| API namespace migration breaks frontend callers | High | Use endpoint migration matrix and migrate client/server in same slice |
| PH1 receivables overlap PH5 ownership | High | Obtain Integration Owner decision before final permission mapping |
| Delivery overlaps PH4 inventory ownership | Critical | Integrate via PH4 contract only |
| Standalone schema differs from Core schema | Critical | Complete DB matrix before repository changes |
| Core file edited accidentally | Critical | Path guard/check in PR review/CI |
| Hidden duplicate auth remains | Critical | Repository-wide search for `auth_token`, JWT secret, login routes, token parsing |

---

# 16. Stop Conditions

Stop implementation and request Integration Owner clarification if any of the following occurs:

1. PH1 requires modification of a frozen Core file.
2. PH1 requires modification of PH4 implementation.
3. PH1 requires a new role.
4. PH1 requires a permission not in the approved contract.
5. PH1 requires destructive shared-schema change.
6. Core route/API conventions differ from assumptions in this plan.
7. Receivables ownership between PH1 and PH5 is unresolved.
8. Delivery requires direct inventory mutation that is not exposed by PH4.
9. Core build does not support PH1 TSX and conversion scope materially affects schedule.
10. A Core regression appears after PH1 integration.

Do not work around these conditions locally.

---

# 17. Definition of Done

PH1 compatibility remediation is complete only when all items below are true.

## Platform compatibility

- [ ] React version matches Core.
- [ ] React Router version matches Core.
- [ ] Tailwind version matches Core.
- [ ] Vite/build pipeline matches Core.
- [ ] No independent PH1 application shell remains.
- [ ] No independent PH1 login remains.
- [ ] No independent PH1 AuthContext remains.
- [ ] No independent PH1 token format remains.
- [ ] No duplicate React/router runtime exists.

## Frontend integration

- [ ] PH1 exists only under `/sales/*`.
- [ ] Core Header is reused.
- [ ] Core Sidebar is reused.
- [ ] Core MainLayout is reused.
- [ ] Core Breadcrumb is reused.
- [ ] Core ModuleHeader/design tokens are used.
- [ ] No third navigation tier exists.
- [ ] Core API client is used.
- [ ] PH1 does not read/write authentication storage directly.
- [ ] Responsive UI passes desktop/tablet/mobile review.

## Backend integration

- [ ] PH1 follows Core CommonJS convention.
- [ ] Core server owns startup/bootstrap.
- [ ] PH1 exports module router(s).
- [ ] PH1 APIs are under `/api/v1/sales/*`.
- [ ] Core `requireAuth` is used.
- [ ] Core `requireRoles`/`requirePermission` are used.
- [ ] No PH1 JWT auth runtime remains.
- [ ] No spoofable identity header is trusted.
- [ ] Correct 401/403 behavior is verified.
- [ ] All authoritative calculations occur server-side.

## Database

- [ ] Integration uses `erp_may10.public`.
- [ ] Canonical Vietnamese roles are preserved.
- [ ] Vietnamese table/column naming is preserved.
- [ ] PH4 schema remains unchanged.
- [ ] No unauthorized shared schema changes exist.
- [ ] Multi-table writes are transactional.
- [ ] Required concurrency protections are tested.

## Verification

- [ ] PH1 business tests pass.
- [ ] PH1 API tests pass.
- [ ] RBAC tests pass.
- [ ] transaction rollback tests pass.
- [ ] concurrency tests pass where applicable.
- [ ] production build passes.
- [ ] Core regression passes.
- [ ] PH4 regression passes.
- [ ] PH1 ↔ PH4 integration tests pass.

## Handover

- [ ] `README.md`
- [ ] `API_SPEC.md`
- [ ] `RBAC.md`
- [ ] `BUSINESS_RULES.md`
- [ ] `TEST_REPORT.md`
- [ ] `INTEGRATION.md`
- [ ] `COMPATIBILITY_REPORT.md`
- [ ] approved database scripts
- [ ] reproducible setup/test instructions.

---

# 18. Immediate First Sprint

The first sprint should **not** start by rewriting business features.

Execute in this order:

1. Freeze PH1 and Core commit SHAs.
2. Export exact Core `package.json` and lockfile versions.
3. Complete the database compatibility matrix.
4. Complete the endpoint ownership/API namespace matrix.
5. Confirm PH1/PH5 ownership of receivables.
6. Confirm PH1/PH4 delivery and stock integration contract.
7. Create a clean integration branch.
8. Align React/Router/Tailwind/Vite.
9. Move PH1 pages under `/sales/*`.
10. Remove `AppShell`, private Login, and private AuthContext from runtime.
11. Switch PH1 services to the Core Axios client.
12. Convert backend module integration to CommonJS.
13. Replace JWT authentication with Core HMAC `erp_token` middleware.
14. Mount PH1 only under `/api/v1/sales/*`.
15. Run Core + PH4 + PH1 smoke tests before continuing business refinements.

### First sprint acceptance checkpoint

Do not proceed to deeper business refactoring until this smoke flow works:

```text
Core /login
    ↓
valid erp_token
    ↓
Core Portal
    ↓
/sales/*
    ↓
Core MainLayout + Header + Sidebar
    ↓
GET /api/v1/sales/...
    ↓
Core requireAuth + requirePermission
    ↓
PH1 business service
    ↓
erp_may10.public
```

At this checkpoint, business screens may still require visual cleanup, but the architectural conflicts shown in the compatibility review must be resolved.

---

# 19. Final Principle

The remediation must optimize for **integration correctness**, not preservation of the standalone PH1 application architecture.

The current PH1 branch should be treated as a source of:

- business behavior
- validated queries
- domain rules
- screens
- tests

—not as the platform foundation.

The platform foundation is ERP Core and is frozen.

Therefore:

> **Keep PH1 business logic. Replace PH1 platform logic with Core integration.**
