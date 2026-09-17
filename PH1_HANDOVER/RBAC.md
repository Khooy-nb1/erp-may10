# PH1 Handover — RBAC & Permission Model

**Document ID:** PH1-HANDOVER-002
**Date:** 2026-09-17
**Scope:** Authorization of the PH1 Sales module (`/api/v1/sales/*`, UI at `/sales/*`) inside ERP Core: canonical roles, the permission matrix, the per-endpoint guard matrix, the client-side presentation layer, the executed security evidence (as recorded), and the one open owner gap (G-7).
**Provenance:** every claim below is derived from the cited source files at the commit in the working tree.

---

## 0. Enforcement boundary — read this first

| Layer | What it enforces | Authoritative? | Source |
|---|---|---|---|
| Core backend (`backend/src/middlewares/auth.js`) | Identity + role + permission on **every** request | **Yes — the only enforcement** | `auth.js:99-146`, `:169-180`, `:185-218`, `:222-250` |
| Module routes (`backend/src/routes/sales/*.routes.js`) | Per-endpoint guard on top of Core auth | **Yes** | `salesRoutes.js:19` + `file:line` per row in §3 |
| Module services (`services/sales/overview.service.js`) | Re-asserts the dashboard role scope after the route guard | **Yes** (second layer) | `KNOWN_GAPS.md` G-4 |
| React UI (`frontend/**`) | Hides/redirects affordances so a denied request is never issued | **No — presentation only** | `config/permissions.js:1-10`; `ERP_MODULE_DEVELOPMENT_CONTRACT.md:262` |

*Client-side hiding is not a security control.* A user who calls an endpoint directly (curl, devtools, a forged UI state) is stopped only by the backend guards in §1–§3. `Authority: client-side gating serves UX only` is the recorded Core rule (`docs/ERP_MODULE_DEVELOPMENT_CONTRACT.md:262`: **Frontend Hiding KHÔNG PHẢI là Bảo Mật**).

---

## 1. Roles

### 1.1 The six canonical Vietnamese role codes

`backend/src/config/roleMapping.js:7-22` (`CANONICAL_ROLES`):

| Code | Canonical constant | English alias (same value) |
|---|---|---|
| `admin` | `ADMIN` | — |
| `kho` | `KHO` | `WAREHOUSE` |
| `ban_hang` | `BAN_HANG` | `SALES` |
| `san_xuat` | `SAN_XUAT` | `PRODUCTION` |
| `mua_hang` | `MUA_HANG` | `PURCHASING` |
| `ke_toan` | `KE_TOAN` | `ACCOUNTING` |

`normalizeRole()` (`roleMapping.js:66-70`) lowercases and maps every accepted spelling (`warehouse_manager`, `quan_ly_kho`, `ke_toan_truong`, …) onto these six, and **falls back to `kho`** for anything unrecognised. `ke_toan_truong` is an alias of `ke_toan` (owner ruling R-6, `INTEGRATION_REQUESTS.md` §2). The frontend role keys are the same six codes (`frontend/src/config/roles.js:17,28,39,50,61,72`).

### 1.2 Who holds `sales.*`

Grants are declared in `roleMapping.js` as `*_PERMISSIONS` arrays and assembled into `ROLE_PERMISSIONS` at `roleMapping.js:145-166`.

| Permission | `admin` | `kho` | `ban_hang` | `san_xuat` | `mua_hang` | `ke_toan` | Source |
|---|:-:|:-:|:-:|:-:|:-:|:-:|---|
| `sales.view` | ✓ | — | ✓ | — | — | — | `roleMapping.js:95` (`SALES_PERMISSIONS`), `:136` (`ADMIN_PERMISSIONS`) |
| `sales.create` | ✓ | — | ✓ | — | — | — | `roleMapping.js:96`, `:136` |
| `sales.update` | ✓ | — | ✓ | — | — | — | `roleMapping.js:97`, `:136` |
| `sales.approve` | ✓ | — | ✓ | — | — | — | `roleMapping.js:98`, `:136` |
| `sales.delete` | ✓ | — | — | — | — | — | `roleMapping.js:136` only |
| `accounting.receivable` | ✓ | — | — | — | — | ✓ | `roleMapping.js:127`, `:141` |

Array extents: `KHO_PERMISSIONS` `roleMapping.js:77-91`, `SALES_PERMISSIONS` `:93-101`, `PRODUCTION_PERMISSIONS` `:103-111`, `PURCHASING_PERMISSIONS` `:113-121`, `ACCOUNTING_PERMISSIONS` `:123-132`, `ADMIN_PERMISSIONS` `:134-143`.

Legend: `✓` = the permission appears in that role's array in `roleMapping.js`; `—` = it does not. Independently of the arrays, `admin` also passes every guard through the hard-coded bypasses at `auth.js:196` and `:233`.

Two consequences that drive the whole module design:

1. **`kho`, `san_xuat`, `mua_hang` and `ke_toan` hold no `sales.*` permission at all.** Any `requirePermission('sales.*')` guard therefore 403s them; where those roles must read Sales data, the route uses `requireRoles(...)` instead (rulings R-1/R-2, §2.3).
2. **`sales.delete` is declared but unused by the module.** The only references in the tree are the declaration `roleMapping.js:136` and the frontend catalogue `frontend/src/config/permissions.js:14`; no `backend/src/routes/sales/*.routes.js` guard names it. The "confirmed order is admin-only to cancel" rule is implemented as `sales.update` at the route plus an in-service admin check (`orders.routes.js:83`, `order.service.js:342`).

### 1.3 Identity resolution (`erp_token`)

`backend/src/middlewares/auth.js`:

| Item | Value | Source |
|---|---|---|
| Token wire format | `erp_token_{userId}_{timestamp}.{hmac}` | `auth.js:41` (doc), `:46-50` |
| Signature | HMAC-SHA256 hex (64 chars) over the payload `erp_token_{userId}_{timestamp}` | `auth.js:47-49` |
| Signing key | `process.env.ERP_AUTH_SECRET`; `auth.js:37` carries a built-in development fallback (value deliberately not reproduced) that MUST NOT be used in a shared environment | `auth.js:37` |
| Accepted transport | `Authorization: Bearer <token>` **or** `x-auth-token: <token>` | `auth.js:100-102` |
| Parse rule | `^erp_token_(\d+)_(\d+)\.([a-f0-9]{64})$` — anything else is rejected | `auth.js:61-62` |
| Comparison | constant-time `crypto.timingSafeEqual` | `auth.js:71-80` |
| TTL | 24 h; timestamp > now + 60 s also rejected | `auth.js:84-86` |
| Role source | DB `nguoi_dung.vai_tro` for the token's `userId`, then `normalizeRole` | `auth.js:118-121`, `:130` |
| Account gate | `trang_thai` must equal `hoat_dong`, else identity is `null` | `auth.js:126-128` |
| Untrusted headers | `x-role` / `x-user-id` are **never** read for identity | `auth.js:96` (comment), `:99-112` |

`resolveUserIdentity` returns `{ id, name, email, dbRole, role, rawRole, phong_ban, trang_thai }` (`auth.js:131-145`). Module handlers never touch `req.user` directly; they go through `utils/sales/identity.js` (`currentUserId`, `currentRole`, which prefers `role` and fails closed to `''`).

### 1.4 Guard semantics

| Guard | Behaviour | Source |
|---|---|---|
| `requireAuth` | No `req.user` → `401` `UNAUTHORIZED`, message `Yêu cầu không hợp lệ. Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.` | `auth.js:169-180` |
| `requireRoles(...roles)` | No user → `401`; canonical `admin` → pass unconditionally; else the normalised role must be in the list, otherwise `403` `FORBIDDEN`, message `Vai trò [<role>] không có quyền thực hiện thao tác này. Cần một trong các vai trò: <list>` | `auth.js:185-218` |
| `requirePermission(...perms)` | No user → `401`; canonical `admin` → pass unconditionally; else **every** named permission must be present in `ROLE_PERMISSIONS[req.user.role]`, otherwise `403` `FORBIDDEN`, message `Bạn không có đặc quyền cần thiết: [<list>].` | `auth.js:222-250` |

Both guards hard-code the `admin` bypass (`auth.js:196`, `:233`), so `admin` appears as a holder in every row of §3 even where the guard does not name it.

---

## 2. Module permission model

### 2.1 Mounting and the router-level auth gate

| Item | Value | Source |
|---|---|---|
| Global identity resolution | `app.use('/api/v1', authMiddleware)` — populates `req.user` or `null` for the whole API | `backend/src/app.js:68` |
| Sales mount | `app.use('/api/v1/sales', salesRoutes)` | `backend/src/app.js:82` |
| Router-level gate | `router.use(requireAuth)` — every Sales endpoint 401s without a valid token | `routes/salesRoutes.js:19` |
| Domain mounts | `/khach-hang`, `/cong-no`, `/san-pham`, `/tong-quan`, `/don-hang`, `/hoa-don`, `/giao-hang` | `routes/salesRoutes.js:21-27` |
| Error envelope | module-scoped `salesErrorBoundary` renders contract §9.3 `{ success, message, errorCode, details }` | `routes/salesRoutes.js:32` |

### 2.2 The UI module gate (Core, client-side)

`frontend/src/routes/AppRoutes.jsx:58-70` mounts the module subtree behind Core's own guard:

```jsx
<Route path="sales/*" element={
  <PermissionGuard permission="sales.view" redirect={true} fallback={<Forbidden />}>
    <SalesRoutes />
  </PermissionGuard>
} />
```

`PermissionGuard` renders children when `hasPermission(permission)` is true, otherwise `<Navigate to="/403" replace />` (`frontend/src/components/rbac/PermissionGuard.jsx:25-41`). `AuthContext.hasPermission` grants `admin` unconditionally and otherwise tests membership in the `permissions` array returned by `/auth/login` or `/auth/me` (`frontend/src/components/rbac/AuthContext.jsx:61-65`; `backend/src/controllers/portalController.js:46-56`, `:116-131`; both return `ROLE_PERMISSIONS[standardRole]` from `backend/src/config/roleMapping.js`). The sidebar menu carries the same key on the whole `KINH DOANH` group and on all seven Sales items (`frontend/src/config/menu.js:21,28,35,42,49,56,63,70`).

Effective result: `sales.view` is reachable only by `admin` and `ban_hang`, so `/sales/*` and the Sales menu group are visible only to those two roles.

### 2.3 Owner rulings that shape these guards

| Ruling | Text (as recorded) | Where it lands in code |
|---|---|---|
| **R-1** (IR-03) | "Waive contract §283-287 / §781-782 for PH1: the module implements the shipped `sales.*` namespace (`sales.view`, `sales.create`, `sales.update`, `sales.approve`; `sales.delete` stays admin-only per `roleMapping.js:136`)" — no frozen Core file is edited. | All write guards use `sales.*`; the module gate stays `sales.view` |
| **R-2** (IR-04) | "Receivables stay read-only in PH1: list + customer summary behind the sales permission; the aging report behind the accounting permission (`accounting.receivable`)" | `receivables.routes.js:19,39` = `sales.view`; `:29` = `accounting.receivable`; the customer-receivables endpoint `customers.routes.js:94` = `sales.view` |
| Follow-on mapping accepted with R-1/R-2 | Cancelling a `cho_xac_nhan` order requires `sales.update`; cancelling an already-confirmed order stays `admin`-only (`sales.delete`). Delivery lifecycle transitions (`start`/`complete`/`fail`) and invoice issuance remain **role-gated** through `requireRoles` (`admin`/`kho`, `admin`/`ke_toan`) because `kho`/`ke_toan` do not hold `sales.*`. | `orders.routes.js:83` + `order.service.js:342`; `deliveries.routes.js:65,76,87`; `invoices.routes.js:42` |

Source: `docs/ph1-remediation/INTEGRATION_REQUESTS.md` §2 (Rulings table, 2026-09-16).

Two documented reasons a read endpoint uses `requireRoles` instead of a permission: no shipped permission covers the exact PH1 read set, and the Core permission matrix is frozen (`customers.routes.js:9-17`, `orders.routes.js:11-18`, `deliveries.routes.js:9-17`, `invoices.routes.js:9-16`, `overview.routes.js:11-16`, `products.routes.js:11-16`).

---

## 3. Endpoint → guard matrix

Base path `/api/v1/sales` (`app.js:82`). Guards are copied verbatim from the route files. "Holders" = roles that pass, derived from `requireRoles` arguments or from the §1.2 grant table; `admin` passes every row via the universal bypass (`auth.js:196`, `:233`).

### 3.1 Customers — `/khach-hang` (`routes/sales/customers.routes.js`)

| # | Method + path | Guard (verbatim) | Holders | Source |
|---|---|---|---|---|
| 1 | `GET /khach-hang` | `requireRoles('admin', 'ban_hang', 'ke_toan')` | `admin`, `ban_hang`, `ke_toan` | `customers.routes.js:23` |
| 2 | `POST /khach-hang` | `requirePermission('sales.create')` | `admin`, `ban_hang` | `customers.routes.js:44` |
| 3 | `GET /khach-hang/:id` | `requireRoles('admin', 'ban_hang', 'ke_toan')` | `admin`, `ban_hang`, `ke_toan` | `customers.routes.js:54` |
| 4 | `PATCH /khach-hang/:id` | `requirePermission('sales.update')` | `admin`, `ban_hang` | `customers.routes.js:64` |
| 5 | `PATCH /khach-hang/:id/status` | `requireRoles('admin')` | `admin` | `customers.routes.js:74` |
| 6 | `GET /khach-hang/:id/summary` | `requireRoles('admin', 'ban_hang', 'ke_toan')` | `admin`, `ban_hang`, `ke_toan` | `customers.routes.js:84` |
| 7 | `GET /khach-hang/:id/receivables` | `requirePermission('sales.view')` | `admin`, `ban_hang` | `customers.routes.js:94` |

### 3.2 Products — `/san-pham` (`routes/sales/products.routes.js`)

| # | Method + path | Guard (verbatim) | Holders | Source |
|---|---|---|---|---|
| 8 | `GET /san-pham` | `requireRoles('admin', 'ban_hang', 'kho', 'ke_toan')` | `admin`, `ban_hang`, `kho`, `ke_toan` | `products.routes.js:19` |
| 9 | `GET /san-pham/:id` | `requireRoles('admin', 'ban_hang', 'kho', 'ke_toan')` | `admin`, `ban_hang`, `kho`, `ke_toan` | `products.routes.js:40` |

### 3.3 Orders — `/don-hang` (`routes/sales/orders.routes.js`)

| # | Method + path | Guard (verbatim) | Holders | Source |
|---|---|---|---|---|
| 10 | `GET /don-hang` | `requireRoles('admin', 'ban_hang', 'kho', 'ke_toan')` | `admin`, `ban_hang`, `kho`, `ke_toan` | `orders.routes.js:22` |
| 11 | `POST /don-hang` | `requirePermission('sales.create')` | `admin`, `ban_hang` | `orders.routes.js:43` |
| 12 | `GET /don-hang/:id` | `requireRoles('admin', 'ban_hang', 'kho', 'ke_toan')` | `admin`, `ban_hang`, `kho`, `ke_toan` | `orders.routes.js:53` |
| 13 | `PATCH /don-hang/:id` | `requirePermission('sales.update')` | `admin`, `ban_hang` | `orders.routes.js:63` |
| 14 | `POST /don-hang/:id/confirm` | `requirePermission('sales.approve')` | `admin`, `ban_hang` | `orders.routes.js:73` |
| 15 | `POST /don-hang/:id/cancel` | `requirePermission('sales.update')` + in-service admin check when the order is `da_xac_nhan` | `admin`, `ban_hang` (pending `cho_xac_nhan`); `admin` only once `da_xac_nhan` | `orders.routes.js:83`; `order.service.js:342` |

> Mount-path note: the file-header comment at `orders.routes.js:12` says "mounted at `/don-ban-hang`", but the router mounts it at `/don-hang` (`salesRoutes.js:25`) and the regression suite calls `/api/v1/sales/don-hang`. `/don-hang` is correct; the comment is stale.

### 3.4 Deliveries — `/giao-hang` (`routes/sales/deliveries.routes.js`)

| # | Method + path | Guard (verbatim) | Holders | Source |
|---|---|---|---|---|
| 16 | `GET /giao-hang` | `requireRoles('admin', 'ban_hang', 'kho')` | `admin`, `ban_hang`, `kho` | `deliveries.routes.js:23` |
| 17 | `POST /giao-hang` | `requireRoles('admin', 'kho', 'ban_hang')` | `admin`, `kho`, `ban_hang` | `deliveries.routes.js:44` |
| 18 | `GET /giao-hang/:id` | `requireRoles('admin', 'ban_hang', 'kho')` | `admin`, `ban_hang`, `kho` | `deliveries.routes.js:55` |
| 19 | `POST /giao-hang/:id/start` | `requireRoles('admin', 'kho')` | `admin`, `kho` | `deliveries.routes.js:65` |
| 20 | `POST /giao-hang/:id/complete` | `requireRoles('admin', 'kho')` | `admin`, `kho` | `deliveries.routes.js:76` |
| 21 | `POST /giao-hang/:id/fail` | `requireRoles('admin', 'kho')` | `admin`, `kho` | `deliveries.routes.js:87` |

### 3.5 Invoices — `/hoa-don` (`routes/sales/invoices.routes.js`)

| # | Method + path | Guard (verbatim) | Holders | Source |
|---|---|---|---|---|
| 22 | `GET /hoa-don` | `requireRoles('admin', 'ban_hang', 'ke_toan')` | `admin`, `ban_hang`, `ke_toan` | `invoices.routes.js:21` |
| 23 | `POST /hoa-don` | `requireRoles('admin', 'ke_toan')` | `admin`, `ke_toan` | `invoices.routes.js:42` |
| 24 | `GET /hoa-don/:id` | `requireRoles('admin', 'ban_hang', 'ke_toan')` | `admin`, `ban_hang`, `ke_toan` | `invoices.routes.js:52` |

### 3.6 Receivables — `/cong-no` (`routes/sales/receivables.routes.js`)

| # | Method + path | Guard (verbatim) | Holders | Source |
|---|---|---|---|---|
| 25 | `GET /cong-no/summary` | `requirePermission('sales.view')` | `admin`, `ban_hang` | `receivables.routes.js:19` |
| 26 | `GET /cong-no/aging` | `requirePermission('accounting.receivable')` | `admin`, `ke_toan` | `receivables.routes.js:29` |
| 27 | `GET /cong-no` | `requirePermission('sales.view')` | `admin`, `ban_hang` | `receivables.routes.js:39` |

### 3.7 Overview — `/tong-quan` (`routes/sales/overview.routes.js`)

| # | Method + path | Guard (verbatim) | Holders | Source |
|---|---|---|---|---|
| 28 | `GET /tong-quan/summary` | `requireRoles('admin', 'ban_hang', 'kho', 'ke_toan')` | `admin`, `ban_hang`, `kho` (scope `fulfillment`), `ke_toan` (scope `financial`) | `overview.routes.js:22` |
| 29 | `GET /tong-quan/revenue-chart` | `requireRoles('admin', 'ban_hang', 'ke_toan')` | `admin`, `ban_hang`, `ke_toan` | `overview.routes.js:32` |
| 30 | `GET /tong-quan/order-status` | `requireRoles('admin', 'ban_hang', 'kho', 'ke_toan')` | `admin`, `ban_hang`, `kho`, `ke_toan` | `overview.routes.js:42` |
| 31 | `GET /tong-quan/top-customers` | `requireRoles('admin', 'ban_hang', 'ke_toan')` | `admin`, `ban_hang`, `ke_toan` | `overview.routes.js:52` |
| 32 | `GET /tong-quan/top-products` | `requireRoles('admin', 'ban_hang', 'ke_toan')` | `admin`, `ban_hang`, `ke_toan` | `overview.routes.js:62` |

32 endpoints total — consistent with `docs/ph1-remediation/STEP5_BACKEND_EVIDENCE.md` §1 ("7 customer, 2 product, 6 order, 6 delivery, 3 invoice, 3 receivable, 5 overview").

**Guard summary.** `requireRoles` on 22 endpoints; `requirePermission` on 10: `sales.create` ×2 (rows 2, 11), `sales.update` ×3 (rows 4, 13, 15), `sales.approve` ×1 (row 14), `sales.view` ×3 (rows 7, 25, 27), `accounting.receivable` ×1 (row 26). Server-side authority is complete: rows 8, 9, 10, 12, 16, 17, 18, 22, 24, 26, 28, 30 admit `kho` and/or `ke_toan`, which the §2.2 UI gate does not admit — that asymmetry is gap G-7 (§6).

---

## 4. Frontend presentation layer

### 4.1 Role-scoped affordances and their call sites

`frontend/src/sales/config/permissions.js` defines the module's client-side scopes and helpers:

| Export | Value / rule | Source |
|---|---|---|
| `MONEY_METRIC_ROLES` | `['admin', 'ban_hang', 'ke_toan']` | `permissions.js:13` |
| `FINANCE_ROLES` | `['admin', 'ke_toan']` | `permissions.js:19` |
| `roleOf(user)` | `user.role \|\| user.vai_tro \|\| user.dbRole \|\| ''` | `permissions.js:22-24` |
| `isAdmin(user)` | `roleOf(user) === 'admin'` | `permissions.js:26-28` |
| `hasAnyRole(user, roles)` | `roles.includes(roleOf(user))` | `permissions.js:30-32` |

Consumers and what each one gates:

| Consumer (call site) | Computed | UI it gates | Backend rule it mirrors |
|---|---|---|---|
| `pages/DashboardPage.jsx:334` → used at `:363`, `:521-522`, `:603`, `:660` | `canViewMoney = hasAnyRole(user, MONEY_METRIC_ROLES)` | money cards; suppresses the revenue-chart / top-customers / top-products widget **requests** (`:356-358`); shows the note `Tài khoản kho chỉ xem được số đơn và tình trạng đơn hàng; số liệu doanh thu và công nợ được ẩn theo phân quyền.` | `GET /tong-quan/revenue-chart` etc. are `kho`-denied (`overview.routes.js:32,52,62`) |
| `pages/DashboardPage.jsx:335` → `:655` | `canViewReceivables = hasAnyRole(user, FINANCE_ROLES)` | receivables KPI block; shows `Chỉ số công nợ chi tiết được giới hạn cho quản trị viên và kế toán.` | R-2 finance scope |
| `pages/ReceivableListPage.jsx:68` → `:123`, `:353` | `canViewAging = hasAnyRole(user, FINANCE_ROLES)` | aging buckets, and the `getAging` call is made only when true (`:123`) | `GET /cong-no/aging` = `accounting.receivable` (`receivables.routes.js:29`) |
| `pages/InvoiceListPage.jsx:112` → `:162`, `:217` | `canCreateInvoice = hasAnyRole(user, FINANCE_ROLES)` | "create invoice" action | `POST /hoa-don` = `requireRoles('admin','ke_toan')` (`invoices.routes.js:42`) |
| `pages/DeliveryDetailPage.jsx:110` → `:134`, `:144` | `isWarehouseOrAdmin = hasAnyRole(user, ['kho','admin'])` | dispatch (`start`) / `complete` / `fail` actions | `deliveries.routes.js:65,76,87` |
| `pages/CustomerDetailPage.jsx:228` | `isAdmin(user)` | `Tạm khóa` / `Kích hoạt lại` status controls | `PATCH /khach-hang/:id/status` = `requireRoles('admin')` (`customers.routes.js:74`) |
| `pages/SalesOrderDetailPage.jsx:119-120,164` | `isAdmin`, `isSales = hasAnyRole(user, ['ban_hang','admin'])` | `Xác nhận đơn hàng` requires `isSales && isPending` | `POST /don-hang/:id/confirm` = `sales.approve` (`orders.routes.js:73`) |
| `pages/SalesOrderDetailPage.jsx:175` | `(isPending \|\| (isConfirmed && isAdmin))` | `Hủy đơn hàng` | `POST /don-hang/:id/cancel` = `sales.update` + admin-only once confirmed (`orders.routes.js:83`, `order.service.js:342`) |

### 4.2 How "backend authoritative, UI presentation only" is realised

1. **Every request still carries the token and is re-authorized.** The UI gate decides *whether the request is issued*; the backend decides whether it succeeds. All 32 endpoints sit behind `router.use(requireAuth)` (`salesRoutes.js:19`) plus their own guard (§3).
2. **Identity cannot be forged from the client.** `x-role` / `x-user-id` are ignored (`auth.js:96`); only a signed `erp_token_*` behind `Authorization: Bearer` or `x-auth-token` yields a role, resolved from the DB (`auth.js:99-146`). A tampered client state changes nothing server-side.
3. **Role strings are the same six codes on both sides** (`config/roles.js:17,28,39,50,61,72` vs `roleMapping.js:7-22`), so a client scope check and its corresponding server guard agree by construction.
4. **The client deliberately does not issue requests the role is denied** — a hidden card is the contract, a 403 banner is not (`sales/config/permissions.js:8-9`). Hence `canViewAging` guards the `getAging` **call** (`ReceivableListPage.jsx:123`) and `canViewMoney` guards widget enabling (`DashboardPage.jsx:356-358`).
5. **The client permission list is a mirror, not a source of truth.** `/auth/login` and `/auth/me` return `permissions` computed from the backend `ROLE_PERMISSIONS` (`portalController.js:46-56`, `:116-131`); `AuthContext` falls back to a hand-maintained client copy when the server omits them (`AuthContext.jsx:11-13,24,43`; `frontend/src/config/permissions.js:55-112`). If that copy drifts, hiding drifts — enforcement does not.
6. **Scope masking is repeated in the service layer** for the dashboard, because the aggregates are computed for everyone and serialized per role (`KNOWN_GAPS.md` G-4; `overview.routes.js:11-16` states the route layer and service must change together).

### 4.3 Known presentation-layer gaps (UI is looser than the API)

These are UX defects, not security holes — the API still denies the action:

| Affordance | Condition as written | Visible to | Backend outcome |
|---|---|---|---|
| `Hủy đơn hàng` on a pending order | `isPending \|\| (isConfirmed && isAdmin)` — **not role-scoped** (`SalesOrderDetailPage.jsx:175`) | any role that reaches the module (`admin`, `ban_hang`) | `sales.update` holders = `admin`, `ban_hang` — consistent for reachable roles |
| `Lập đợt giao hàng` on an order | `order &&` only, no role check (`SalesOrderDetailPage.jsx:155-163`) | any role that reaches the module | `POST /giao-hang` = `admin`/`kho`/`ban_hang` (`deliveries.routes.js:44`) — consistent for reachable roles |

Because `kho`/`ke_toan` never get past the module gate (§6), these two conditions cannot currently produce a visible-but-forbidden button for a denied role; they are recorded here so a future G-7 remedy (which would let `kho` in) tightens them in the same change.

---

## 5. Verified behaviour

**This document did not re-run any suite.** Results below are case *names* plus the last recorded run; re-run commands are given so the reader can reproduce. Nothing here was executed for this handover.

### 5.1 `backend/tests/test_rbac_security.js` — 27 cases, `R01`–`R27`

Run: `node tests/test_rbac_security.js` from `backend/`; it boots the app on port `5097` (`test_rbac_security.js:49-50`) and ends with `TỔNG KẾT KIỂM THỬ: … TEST CASES ĐẠT CHUẨN` (`:320`).

| ID | Case name (verbatim) | Line |
|---|---|---|
| R01 | `R01: Anonymous request không có token bị chặn với HTTP 401 Unauthorized` | `:67` |
| R02 | `R02: Anonymous gửi x-user-id: 1 bị từ chối 401 (Chặn giả mạo Admin)` | `:73` |
| R03 | `R03: Anonymous gửi x-role: admin bị từ chối 401 (Chặn gán vai trò tùy tiện)` | `:79` |
| R04 | `R04: User Bán hàng gửi x-role: admin bị chặn 403 (Vai trò từ token/DB được bảo vệ)` | `:86` |
| R05 | `R05: User Bán hàng gửi x-user-id: 1 vẫn bị chặn 403 (Không thể leo thang quyền sang Admin)` | `:93` |
| R06 | `R06: User 2 gửi kèm x-user-id: 5 vẫn giữ nguyên danh tính User 2 (Mạo danh tài khoản khác bị vô hiệu)` | `:104` |
| R07 | `R07: Token không đúng định dạng (invalid format) bị từ chối 401 Unauthorized` | `:112` |
| R08 | `R08: Sensitive GET APIs (nguoi-dung, vi-tri-kho, lo-vat-tu, phieu-chuyen, phieu-kiem-ke) chặn anonymous với 401` | `:122` |
| R09 | `R09: Sensitive GET (/the-kho) chặn vai trò không có thẩm quyền (Sales) với 403 Forbidden` | `:130` |
| R10 | `R10: Sensitive GET cho phép người dùng có thẩm quyền truy cập (Admin: 200, Warehouse: 200)` | `:141` |
| R11 | `R11: requirePermission chặn người dùng non-admin khi thiếu đặc quyền (403 Forbidden)` | `:155` |
| R12 | `R12: requirePermission cho phép ADMIN vượt qua toàn bộ đặc quyền hệ thống` | `:164` |
| R13 | `R13: Thủ kho (Token Kho / User 5) được phép lập phiếu nhập kho PH4 (201 Created)` | `:175` |
| R14 | `R14: Admin hệ thống (Token Admin / User 1) được phép lập phiếu nhập kho PH4 (201 Created)` | `:186` |
| R15 | `R15: Bán hàng (Token Sales / User 2) KHÔNG ĐƯỢC phép lập phiếu nhập kho PH4 (403 Forbidden)` | `:197` |
| R16 | `R16: Unknown role / malformed auth scheme bị từ chối truy cập (401/403)` | `:208` |
| R17 | `R17: [CRITICAL F01] Forged Admin token (erp_token_1_999999999999) BỊ CHẶN TUYỆT ĐỐI (401/403, không thể thành 201)` | `:227` |
| R18 | `R18: [CRITICAL F03] Empty body login {} bị từ chối với HTTP 400 Bad Request` | `:235` |
| R19 | `R19: [CRITICAL F03] Login thiếu email bị từ chối với HTTP 400 Bad Request` | `:243` |
| R20 | `R20: [CRITICAL F03] Login thiếu password bị từ chối với HTTP 400 Bad Request` | `:251` |
| R21 | `R21: [CRITICAL F02] Anonymous truy cập /auth/me bị chặn với HTTP 401 Unauthorized (Không lộ Admin profile)` | `:259` |
| R22 | `R22: [MEDIUM F04] Anonymous truy cập /dashboard/summary bị chặn với HTTP 401 Unauthorized` | `:267` |
| R23 | `R23: [MEDIUM F05] Anonymous truy cập /master-data/nha-cung-cap bị chặn với HTTP 401 Unauthorized` | `:275` |
| R24 | `R24: [MEDIUM F06] User Bán hàng truy cập danh bạ nhân sự /master-data/nguoi-dung bị chặn 403 Forbidden` | `:285` |
| R25 | `R25: [MEDIUM F06] Thủ kho truy cập danh bạ nhân sự /master-data/nguoi-dung bị chặn 403 Forbidden` | `:295` |
| R26 | `R26: [MEDIUM F06] Quản trị viên truy cập danh bạ nhân sự /master-data/nguoi-dung được phép (200 OK)` | `:305` |
| R27 | `R27: Token ký cho người dùng không tồn tại trong database bị từ chối 401 Unauthorized` | `:315` |

**Two facts a reader must not miss:**

- **This suite exercises no `/api/v1/sales/*` path.** Its targets are `/api/v1/phieu-nhap`, `/api/v1/the-kho`, `/api/v1/master-data/*`, `/api/v1/auth/me`, `/api/v1/dashboard/summary` and `/api/v1/auth/login`; the only occurrence of the word `sales` in the file is the string `'sales.approve'` passed to `requirePermission` at `:161` (inside R12). The Sales module's own RBAC evidence is §5.2.
- **No run of this suite against the integration workspace is recorded** in `docs/ph1-remediation/STEP5_BACKEND_EVIDENCE.md`. The `27/27 Passed (100%)` figures that exist in the tree are Core-era records for the standalone `E:\ERP\backend` tree: `docs/core-portal/10_unified_navigation_v2.7.md:130`, `docs/core-portal/11_global_design_system_v2.8.md:146`, `docs/core-portal/12_visual_depth_v2.9.md:135`, `docs/core-portal/13_dropdown_hover_fix_v2.10.md:139`, `docs/core-portal/15_v2.11_kpi_data_source_audit.md:383`, `docs/ph4/19_PH4_BUSINESS_LOGIC_AUDIT.md:408`. Treat the R01–R27 results as inherited, not as a fresh Step 5 measurement.

### 5.2 `backend/tests/test_ph1_sales_api.js` — module RBAC checks

Run: `cd backend && node tests/test_ph1_sales_api.js`. Tokens are minted with Core's own signer (`test_ph1_sales_api.js:28-36`): `admin` = user 1, `ban_hang` = user 2, `kho` = user 5, `ke_toan` = user 6, plus a forged-token string.

**Last recorded run — see `docs/ph1-remediation/STEP5_BACKEND_EVIDENCE.md`:** V4 `node tests/test_ph1_sales_api.js` → **115 passed, 0 failed**; V5 cross-domain flow pass; V6 `/api/v1/auth/me`, `/api/v1/ton-kho`, `/api/v1/modules` → 200 (`STEP5_BACKEND_EVIDENCE.md` §2).

Authentication gate (`:83-93`):

| Check name (verbatim) | Line |
|---|---|
| `no token -> 401` | `:85` |
| `401 envelope carries errorCode` | `:86` |
| `forged token -> 401` | `:89` |
| `valid token without permission -> 403` | `:92` |
| `403 envelope carries errorCode` | `:93` |

Role / permission matrix:

| Check name (verbatim) | Method + path | Token | Line |
|---|---|---|---|
| `admin -> 200` | `GET /khach-hang` | `admin` | `:97` |
| `ban_hang -> 200` | `GET /khach-hang` | `ban_hang` | `:112` |
| `ke_toan -> 200 (accounting read retained)` | `GET /khach-hang` | `ke_toan` | `:115` |
| `kho cannot create -> 403` | `POST /khach-hang` | `kho` | `:145` |
| `ban_hang creates -> 201` | `POST /khach-hang` | `ban_hang` | `:156` |
| `status change is admin-only -> 403 for ban_hang` | `PATCH /khach-hang/:id/status` | `ban_hang` | `:194` |
| `admin status change -> 200` | `PATCH /khach-hang/:id/status` | `admin` | `:200` |
| `customer receivables follow ruling R-2 (sales permission) -> 403 for ke_toan` | `GET /khach-hang/:id/receivables` | `ke_toan` | `:213` |
| `customer receivables -> 200 for ban_hang` | `GET /khach-hang/:id/receivables` | `ban_hang` | `:216` |
| `receivables list allowed for sales -> 200` | `GET /cong-no` | `ban_hang` | `:223` |
| `receivables list denied for accounting (R-2) -> 403` | `GET /cong-no` | `ke_toan` | `:225` |
| `aging allowed for accounting -> 200` | `GET /cong-no/aging` | `ke_toan` | `:227` |
| `aging denied for sales (R-2) -> 403` | `GET /cong-no/aging` | `ban_hang` | `:229` |
| `warehouse role may read products -> 200` | `GET /san-pham` | `kho` | `:241` |
| `accounting role may read products -> 200` | `GET /san-pham` | `ke_toan` | `:243` |
| `order list readable by kho -> 200` | `GET /don-hang` | `kho` | `:284` |
| `kho cannot create orders -> 403` | `POST /don-hang` | `kho` | `:286` |
| `kho cannot patch orders -> 403` | `PATCH /don-hang/:id` | `kho` | `:341` |
| `kho cannot confirm orders -> 403` | `POST /don-hang/:id/confirm` | `kho` | `:344` |
| `seller cannot cancel a confirmed order -> 403` | `POST /don-hang/:id/cancel` | `ban_hang` | `:367` |
| `admin cancels confirmed order -> 200` | `POST /don-hang/:id/cancel` | `admin` | `:372` |
| `seller cannot issue an invoice -> 403` | `POST /hoa-don` | `ban_hang` | `:384` |
| `accounting issues invoice -> 201` | `POST /hoa-don` | `ke_toan` | `:389` |
| `seller may read invoices -> 200` | `GET /hoa-don` | `ban_hang` | `:403` |
| `warehouse cannot read invoices -> 403` | `GET /hoa-don` | `kho` | `:405` |
| `seller cannot dispatch -> 403 (kho.xuat)` | `POST /giao-hang/:id/start` | `ban_hang` | `:439` |
| `kho starts delivery -> 200 dang_giao` | `POST /giao-hang/:id/start` | `kho` | `:441` |
| `kho completes delivery -> 200 da_giao` | `POST /giao-hang/:id/complete` | `kho` | `:443` |
| `admin summary -> 200 scope full` | `GET /tong-quan/summary` | `admin` | `:485` |
| `kho summary -> 200 scope fulfillment` | `GET /tong-quan/summary` | `kho` | `:492` |
| `fulfillment scope hides money metrics` | `GET /tong-quan/summary` | `kho` | `:493` |
| `accounting scope returns finance metrics only` | `GET /tong-quan/summary` | `ke_toan` | `:499` |
| `kho is denied the revenue chart -> 403` | `GET /tong-quan/revenue-chart` | `kho` | `:508` |
| `fulfillment order-status allowed for kho -> 200` | `GET /tong-quan/order-status` | `kho` | `:523` |

Notes on two of these names, grounded in the guards they exercise:

- `seller cannot dispatch -> 403 (kho.xuat)` names `kho.xuat` in its label, but the guard actually applied is `requireRoles('admin', 'kho')` (`deliveries.routes.js:65`) — `ban_hang` fails on role, not on a `kho.xuat` permission.
- `receivables list denied for accounting (R-2) -> 403` is the deliberate R-2 asymmetry: `ke_toan` holds `accounting.receivable` (so aging passes) but not `sales.view` (so the list fails).

Reproduce (from `backend/`, requires the database configured in `backend/.env`):

```bash
node tests/test_ph1_sales_api.js            # 115 checks, exit 0 at the recorded run
node tests/test_rbac_security.js            # R01-R27, exit 0 at the recorded run
```

---

## 6. Known limitation — G-7

Recorded from `docs/ph1-remediation/KNOWN_GAPS.md` G-7 (`OWNER`, verified 2026-09-16); the two options are quoted as recorded there. **No decision has been taken; the options below are the record, not a recommendation of this document.**

**Where.** Core `backend/src/config/roleMapping.js` — `sales.view` is granted by `ADMIN_PERMISSIONS` and `SALES_PERMISSIONS` only; `KHO_PERMISSIONS`, `ACCOUNTING_PERMISSIONS`, `PRODUCTION_PERMISSIONS` and `PURCHASING_PERMISSIONS` do not have it. The module gate is `<PermissionGuard permission="sales.view">` (`frontend/src/routes/AppRoutes.jsx` → `frontend/src/sales/SalesRoutes.jsx`).

**Observation.** The backend deliberately serves roles the UI gate locks out: `GET /api/v1/sales/tong-quan/summary` returns a **fulfillment scope for `kho`** and a **finance scope for `ke_toan`** (evidence: `kho summary -> 200 scope fulfillment`, `fulfillment scope hides money metrics`, `accounting scope returns finance metrics only`), and `GET /api/v1/sales/don-hang` additionally allows `kho`/`ke_toan` while `GET /api/v1/sales/giao-hang` allows `kho`. In the browser, a `kho` account on `/sales` and `/sales/deliveries` gets Core's `/403` with **zero API calls**; the same holds for `ke_toan`. PH1's original scope let `kho` read the status dashboard and the delivery workflow, and let `ke_toan` read the finance view.

**Consequence.** The module's client-side role scopes are exercised only for `admin`/`ban_hang`: the `ke_toan` finance view (money metrics + receivables note) and the `kho` fulfillment view (status counts, money hidden, note text about administrators and accounting) cannot be reached, because those accounts never get past the module gate. The two notes in question render as `Chỉ số công nợ chi tiết được giới hạn cho quản trị viên và kế toán.` and `Tài khoản kho chỉ xem được số đơn và tình trạng đơn hàng; số liệu doanh thu và công nợ được ẩn theo phân quyền.` (`frontend/src/sales/pages/DashboardPage.jsx:655-666`). Server-side scope masking is unaffected and remains enforced (and tested) regardless of what the UI shows.

**Disposition — owner decision.** The two recorded options:

| Option | Description (as recorded) |
|---|---|
| **(a)** | Add `sales.view` to `KHO_PERMISSIONS`/`ACCOUNTING_PERMISSIONS` — whole-module read pages become reachable; money endpoints still 403 for `kho` and surface as error banners. |
| **(b)** | Introduce narrower permissions (e.g. `sales.dashboard`, `sales.delivery`, `sales.finance`) and point the route guards and menu entries at them. |

`KNOWN_GAPS.md` G-7 records **(b) as recommended** — it restores PH1's per-role reach without handing warehouse accounts the customer/invoice/receivable pages. The module guard stays `sales.view` until the ruling lands (ruling R-1). The same gap is restated with measured browser results in `docs/ph1-remediation/STEP6_FRONTEND_EVIDENCE.md:128-129,169`.

**Impact on this document.** Every holder column in §3 and every scope in §4 is correct as written; G-7 means that for `kho` and `ke_toan` the *reachable* subset of §3 is empty at the UI, while the *authorized* subset is not. Nothing in §3 changes if the owner picks (a) or (b); only the module gate and menu keys would.
