# PH1 Remediation — Step 6 (Frontend) Evidence

**Document ID:** `DOC-PH1-REM-010`
**Plan step:** `PLAN.md` § Step 6 — Frontend Remediation
**Status:** **COMPLETE (2026-09-16, `integration/ph1-sales-core`)**
**Scope:** the PH1 SPA converted into a native Core route subtree at `/sales/*`, rendered by Core's shell, auth and RBAC, built with Core's dependency set.

---

## 1. Deliverables

### 1.1 Module tree — `frontend/src/sales/` (71 files, 8 433 lines)

| Area | Files | Lines | Notes |
|---|---|---|---|
| `pages/` | 12 | 3 743 | one file per PH1 page (no `LoginPage`) |
| `components/ui/` | 26 | 1 821 | PH1 primitives, Radix/cva replaced by hand-rolled React + DOM |
| `components/common/` | 10 | 426 | `AppShell` intentionally absent (Core shell owns it) |
| `components/charts/` | 5 | 1 016 | hand-rolled SVG (`TrendChart`, `CategoryBarChart`, scales, theme, `useChartWidth`) |
| `components/orders · invoices · deliveries · products · dashboard` | 5 | 929 | `SalesOrderCreateDialog`, `InvoiceCreateDialog`, `DeliveryCreateDialog`, `ProductSelector`, `KpiCard` |
| `services/` | 8 | 267 | module API layer over Core's axios instance |
| `lib/` | 2 | 77 | `cn` (clsx + tailwind-merge), `format` (VND/count/quantity/date) |
| `config/` | 1 | 32 | role scopes + role helpers (route access is Core's `PermissionGuard`) |
| root | 2 | — | `SalesRoutes.jsx`, `sales.css` |

### 1.2 Core wiring (the only files touched outside the module)

| File | Change |
|---|---|
| `frontend/src/routes/AppRoutes.jsx` | `<PlaceholderModule />` at `sales` replaced by `path="sales/*"` → `<SalesRoutes />`, still wrapped in `<PermissionGuard permission="sales.view" redirect fallback={<Forbidden />}>` (owner ruling **R-1**) |
| `frontend/src/config/menu.js` | the 2 placeholder KINH DOANH items replaced by the 7 PH1 concepts (Tổng quan bán hàng, Khách hàng, Sản phẩm, Bán hàng & Đơn hàng, Giao hàng, Hóa đơn bán hàng, Công nợ phải thu), all `sales.view`, icons from Core's existing `ICON_MAP` |
| `frontend/src/sales/sales.css` | module stylesheet, `finance/finance.css` pattern: PH1's global base layer (brand focus ring `#0F5FAF`, pointer/not-allowed cursors) re-expressed at **zero specificity** under `.sales-module-content`, so Core surfaces stay untouched and utility classes still win |
| `docs/ph1-remediation/FRONTEND_TOKEN_MAP.md` | the PH1 (Tailwind v4 `@theme`) → Core (Tailwind 3.4) class/token map applied file by file |

No Core component, Tailwind config, or build setting was modified (6A/6I).

---

## 2. Workstream closure

| WS | Requirement | Evidence |
|---|---|---|
| 6A | Core dependency versions; no v4 directives | `package.json` unchanged; module imports only `react`, `react-dom`, `react-router-dom`, `lucide-react`, `clsx`, `tailwind-merge`, `axios` (via Core's instance) |
| 6B | Retire `AppShell` | file not ported; pages render inside `MainLayout`/`Header`/`Sidebar` (browser run: one sidebar, one header, no duplicate navigation) |
| 6C | Retire private login | `LoginPage` not ported; unauthenticated `/sales` and `/sales/receivables` both land on Core `/login` |
| 6D | Retire private `AuthContext` | module contains no `auth_token`/`auth_user`/context copy; `useAuth` imported from `components/rbac/AuthContext.jsx` (grep over `src/sales/**` returns no hits) |
| 6E | Replace the `fetch`-based API client | `sales/services/client.js` wraps Core's axios instance (`services/api.js`): bearer token, `/api/v1` base URL and error normalization stay centralized; `grep "localStorage\|fetch(" src/sales` returns nothing |
| 6F | Routes under `/sales/*` | one Core mount point (`AppRoutes.jsx` → `sales/*`) delegating to the module-owned `SalesRoutes.jsx` subtree; no private `BrowserRouter`/root `<Routes>` app, no private shell |
| 6G | Menu integration, no third nav tier | 7 items in `config/menu.js`; group "PH1 — Bán hàng & Khách hàng" renders in Core's sidebar; pages contribute no second horizontal nav |
| 6H | Core Design System V2.11 | `FRONTEND_TOKEN_MAP.md` + `sales/components/ui/*`; Corporate Blue `#0F5FAF` on primary actions, workspace `#F7FAFC`, `rounded-2xl` cards, `rounded-xl` controls, Core status badge tones; responsive `sm/md/lg/xl` breakpoints kept |
| 6I | TypeScript decision | module is plain `.jsx`/`.js`; Core's Vite tooling untouched |

---

## 3. Verification evidence (all commands run 2026-09-16)

### 3.1 Production build — exit criterion "build passes using Core dependencies"

```
frontend $ npx vite build
✓ 1815 modules transformed.
dist/index.html                   0.84 kB │ gzip:   0.51 kB
dist/assets/index-CHDaSFb9.css  220.83 kB │ gzip:  35.38 kB
dist/assets/index-6aRrQyqU.js   855.80 kB │ gzip: 215.84 kB
✓ built in 4.18s
```

Production CSS parity (Tailwind purge is the one production-only risk for a ported design system):

- `tailwind.config.js` scans `./src/**/*.{js,ts,jsx,tsx}`, so `src/sales/**` is included.
- The module contains **no interpolated class names** — every template literal in `src/sales` yields a label, a style value, an id or an SVG path, never a class (`KpiCard.jsx` documents the reason at line 12).
- The built stylesheet contains the module's non-obvious utilities: `data-\[state\=active\]\:border-brand-primary[data-state=active]`, `data-\[state\=active\]\:text-brand-primary[data-state=active]`, `fill-brand-light`, `stroke-brand-primary`, `text-brand-secondary`, `border-brand-border` (checked in `dist/assets/index-CHDaSFb9.css`).

### 3.2 Backend module regression (Step 5 contract, re-run against the running stack)

```
backend $ node tests/test_ph1_sales_api.js
115 passed, 0 failed
```

Includes the role-scope checks this UI depends on: `admin` full scope, `kho` `summary -> 200 scope fulfillment` with money metrics hidden, `kho is denied the revenue chart -> 403`, unknown period/custom-without-dates/limit-over-max `-> 422`.

### 3.3 Runtime smoke — real stack, real data

Stack: backend `node src/server.js` (`PORT=5000`, Postgres `127.0.0.2:55432`, DB `erp_sales_crm_dev` per `backend/.env`), frontend `npx vite --port 5174`, authenticated with a Core-signed admin token in `localStorage.erp_token`.

| Route | API calls observed | Rendering observed | Console errors |
|---|---|---|---|
| `/sales` | `tong-quan/{summary,order-status,revenue-chart,top-customers,top-products}?period=month&limit=5` → 200 | 6 KPI tiles, trend chart (area+line, `T9/2026` axis, `tr ₫` ticks), status bars + share rows (`Chờ xác nhận 2 12,5%` … `Đã hủy 4 25%`), 2 ranking tables (14 rows) | 0 |
| `/sales/customers` | `khach-hang?page=1&pageSize=10` → 200 | "Tổng số 16 khách hàng", 10 rows, filters/search/pagination | 0 |
| `/sales/customers/16` | `khach-hang/16`, `khach-hang/16/summary` → 200 | profile + KPIs, tabs "Thông tin chi tiết / Đơn bán hàng / Hóa đơn / Sổ công nợ" | 0 |
| `/sales/customers/new` | — | full create form (5 + 3 + 3 fields, sections, cancel/submit) | 0 |
| `/sales/products` | `san-pham?…&trang_thai=dang_ban` → 200 | "3 sản phẩm", size/colour/status filters | 0 |
| `/sales/orders` | `don-hang?page=1&pageSize=10` → 200 | "14 đơn hàng", 10 rows, create-dialog trigger | 0 |
| `/sales/orders/14` | `don-hang/14` → 200 | order header/timeline/metadata/line table | 0 |
| `/sales/deliveries` | `giao-hang?…` → 200 | "8 đợt giao", business-rule banner | 0 |
| `/sales/deliveries/1` | `giao-hang/1` → 200 | metadata card, workflow buttons ("Bắt đầu vận chuyển") | 0 |
| `/sales/invoices` | `hoa-don?…` → 200 | "4 hóa đơn", status filter | 0 |
| `/sales/invoices/4` | `hoa-don/4` → 200 | 5 money cards, linked-document metadata, disclaimer | 0 |
| `/sales/receivables` | `cong-no/summary`, `cong-no?…sortBy=ngay_dao_han&sortOrder=ASC`, `cong-no/aging` → 200 | 4 summary cards (475.200.000 ₫ / 100.000.000 ₫ …), aging table (admin), read-only banner | 0 |

Dialog interaction (`/sales/orders` → "Tạo đơn bán hàng"): dialog opens with title "Tạo đơn bán hàng mới", customer options loaded from `khach-hang?pageSize=100&trang_thai=hoat_dong`, product search box present, `document.body` scroll locked, **Escape closes it**, zero console errors. No write was submitted.

### 3.3.1 Interaction paths exercised after the initial sweep

| Path | Action | Evidence |
|---|---|---|
| Invoice create dialog | "Xuất hóa đơn mới" (`/sales/invoices`) | title "Xuất hóa đơn", 4 inputs, buttons `Hủy` / `Xác nhận xuất hóa đơn`, body scroll locked, Escape closes |
| Delivery create dialog | "Tạo phiếu giao hàng" (`/sales/deliveries`) | title "Tạo phiếu giao hàng", 7 inputs, buttons `Hủy` / `Lưu phiếu giao hàng`, Escape closes |
| Orders status filter | select `Chờ xác nhận` | request `don-hang?page=1&pageSize=10&trang_thai=cho_xac_nhan` — the PH1 enum value is passed through unchanged |
| Customers pagination | click page `2` | request `khach-hang?page=2&pageSize=10` |
| Customer detail tabs | activate `Sổ công nợ` (customer 1, has debt) | requests `khach-hang/1/receivables?pageSize=100` + `cong-no/summary?ma_khach_hang=1`; summary cards `Phát sinh 475.200.000 ₫ / Đã thu 100.000.000 ₫ / Còn lại 375.200.000 ₫ / Quá hạn 0 ₫`; one row `HDBH-2026-001 · 475.200.000 ₫ · 100.000.000 ₫ · 375.200.000 ₫ · 24/10/2026 · Thanh toán một phần` linking to `/sales/invoices/1` |
| Customer detail tabs | activate `Sổ công nợ` (customer 16, no debt) | panel empty state "Khách hàng này hiện không có khoản công nợ phải thu nào."; run 3× — the lazily fetched receivables/summary pair fires every time |
| Tab keyboard path | focus tab strip, press ArrowLeft | selection moves and activates; panels stay mounted one at a time (`role=tabpanel` present only for the active tab) |

**Probe note (not a product defect):** `Tab` activates on `mousedown` (PH1's Radix behaviour) plus `onFocus`, so a synthetic `element.click()` — which fires no `mousedown` — does not switch tabs. Verification must dispatch real pointer input; the first pass produced a false negative on this path for exactly that reason.

### 3.3.2 Responsive (Step 6H breakpoints)

Measured at 900×1000 (tablet) and 390×844 (mobile) on `/sales`, `/sales/customers`, `/sales/orders`, `/sales/receivables`: **page-level horizontal overflow = 0 px in all eight cases**; the KPI grid collapses 2 columns → 1; each wide table sits in a `w-full overflow-x-auto` container (measured: table 981 px inside a 356 px container that scrolls). Core's sidebar is untouched at both widths (Core-owned).

### 3.4 RBAC behaviour in the browser

| Case | Result |
|---|---|
| `ban_hang` (userId 2) on `/sales/receivables` | summary + list requested; **`/aging` not requested**, aging card absent (ruling **R-2** held client-side) |
| Unauthenticated `/sales`, `/sales/receivables` | redirect to Core `/login` |
| `kho` (userId 5) on `/sales`, `/sales/deliveries` | blocked by the module-level `sales.view` guard → `/403`; see **G-7** |
| `ke_toan` (userId 6), `san_xuat` (userId 4) on `/sales`, `/sales/receivables` | `/403` (measured — `sales.view` is held by `admin` and `ban_hang` only) |

---

## 4. Decisions and deviations

1. **Token map governs (6H colours).** All PH1 v4 tokens were translated to Core tokens per `FRONTEND_TOKEN_MAP.md`; where Step 6H names a literal that differs from Core's token value (border `#E2EDF5` vs Core `brand-border` `#DCEAF4`), the Core token wins — the difference is imperceptible and keeps one border colour across the product.
2. **6F interpretation.** Core keeps a single mount line (`sales/*`); the module owns its subtree through `SalesRoutes.jsx` (relative child `<Routes>`). There is no private root router, no private shell, and Core's router file does not need to know the module's 16 routes.
3. **Service naming.** PH1's `services/dashboardService.getDashboardSummary` is `sales/services/overviewService.getOverviewSummary` here (the module's overview endpoints); all other service names match PH1, except `getCustomerReceivables`, which lives in `customerService.js` (it is a customer sub-resource in the ported backend).
4. **Errors.** PH1's `ApiError` is re-implemented in `sales/services/client.js` over Core's flat failure envelope (`{ success:false, message, errorCode, details }`); `.code`, `.errorCode`, `.statusCode`, `.details` are preserved so the order detail page's `CUSTOMER_CREDIT_LIMIT_EXCEEDED` recovery path works unchanged.
5. **Toasts.** PH1's `sonner` is replaced by `sales/components/ui/toast.jsx` (imperative `toast.success/error/conflict` over Core's presentational `Toast`). PH1 only used `toast.error`, in 3 pages.
6. **Radix / rhf / zod removed.** Dialogs (`Dialog`, `AlertDialog`, `ReasonDialog`), `Combobox`, `Tabs`, `NumberInput` and the forms are hand-rolled with the same props, same Vietnamese copy and same validation rules; `CustomerCreatePage`, `DeliveryCreateDialog`, `InvoiceCreateDialog` carry explicit `validate()` functions reproducing PH1's messages.
7. **Charts.** `recharts` was never used; PH1's SVG geometry is preserved with literal hex colours (`AXIS_COLOR #CBD5E1`, `GRID_COLOR #EEF2F7`, series `#0F5FAF`).
8. **Module base layer.** `sales.css` restores PH1's focus ring and cursors inside the module only (a global rule would restyle frozen PH4/PH5 surfaces).

---

## 5. How to run (local verification)

```bash
# backend — reads backend/.env (DB_HOST 127.0.0.2, DB_PORT 55432, DB_NAME erp_sales_crm_dev, PORT 5000)
cd backend && node src/server.js

# frontend
cd frontend && npx vite --port 5174         # /api proxied to :5000 (same-origin, so CORS is not involved)

# module regression (self-signing tokens, no credentials needed)
cd backend && node tests/test_ph1_sales_api.js
```

Notes for a fresh checkout:

- `PORT` in `backend/.env` was aligned from `5100` to `5000` on 2026-09-16 so it matches Core's committed Vite proxy target (`frontend/vite.config.js`).
- `backend/.env` does not set `ERP_AUTH_SECRET`, so the auth middleware's internal development key applies (`src/middlewares/auth.js`). Set a real secret before any shared environment.
- `CORS_ORIGINS` in `backend/.env` lists `:5173`; the verified dev server runs on `:5174` and reaches the API through Vite's proxy, which is same-origin, so no CORS entry is needed for that flow. Add the origin if the browser calls the API directly.

---

## 6. Open items

- **G-7** (`KNOWN_GAPS.md`): Core's role map grants `sales.view` to `admin`/`ban_hang` only, while the backend module serves `kho` a fulfillment-scoped dashboard and delivery workflow and `ke_toan` a finance scope (`INTEGRATION_BOUNDARIES.md` rows 48-52, verified by the API test). The UI gate therefore blocks those accounts from `/sales/*` — owner decision required (grant `sales.view` to `kho`/`ke_toan`, or add narrower `sales.dashboard`/`sales.delivery`/`sales.finance` permissions).

### 6.1 Independent audit and hygiene passes

Three independent read-only passes were dispatched over the module (one full-scope, two tightly bounded). All three
exhausted their 900 s runtime budget before they could report, so every claim below was produced and verified
directly — the static sweeps with targeted commands, the behavioural claims with the browser runs cited above.

**Dead-export scan** (whole `frontend/src`, 142 exports in the module, identifier references counted outside the
defining file; then each candidate re-verified by import site):

| Symbol(s) | Verdict |
|---|---|
| `config/permissions.js`: `PERMISSIONS`, `ROUTE_PERMISSIONS`, `hasPermission`, `roleOf` export | **removed** — no importers; route access is Core's `PermissionGuard`, and no page read a permission list (`/auth/me` returns `id, ho_ten, email, vai_tro, phong_ban, trang_thai` — no `permissions`) |
| `MONEY_METRIC_ROLES`, `AGING_ROLES`, `isAdmin`, `hasAnyRole` | now **used**: the dashboard's money/receivables scopes, the receivables aging gate (ruling R-2), the invoice-issuance gate, the customer status controls and the order action gates. `AGING_ROLES` was folded into `FINANCE_ROLES` (same two roles, one name, used by all three finance gates) |
| `components/ui/Card.jsx`: `CardHeader`, `CardBody`, `CardFooter`; `components/charts/chartTheme.js`: `toneColor`, `SERIES_COLOR_ALT`; `services/{customer,order,product}Service.js`: `updateCustomer`, `updateOrder`, `getProductById` | **kept deliberately** — all six are 1:1 ports of PH1 exports that PH1 itself left unused (verified in `ph1-bh-qlkh/frontend/src`: each symbol appears only in its defining file). Dropping them would silently narrow the ported surface; the PLAN's contract is behavioural parity with PH1, not a slimmed API |

**Cleanup applied** — `frontend/src/sales/config/permissions.js` reduced from 52 to 32 lines; four call sites
replaced their inline role comparisons with the shared helpers (the page-level convention is now one thing, not
three). Re-verified after the change:

```
frontend $ npx vite build
✓ 1815 modules transformed. ✓ built in 4.06s      (dist JS hash moved 6aRrQyqU → CE3vKiZj)
```

| Re-verification | Result |
|---|---|
| Role gates, `admin` | dashboard calls the 3 money endpoints, receivables note absent, `/receivables` requests + renders aging, "Xuất hóa đơn mới" present, "Tạm khóa" present on the customer, order 6 (chờ xác nhận) → `Xác nhận đơn hàng` + `Hủy đơn hàng`, order 15 (đã xác nhận) → `Hủy đơn hàng`, order 14 (đã hủy) → none |
| Role gates, `ban_hang` | same 3 money endpoints and money tiles, **aging not requested and not rendered**, invoice-creation button absent, customer status controls absent, order 15 → no cancel button, order 6 → confirm + cancel |
| Console errors during both runs | 0 |
| Static sweeps | no PH1/v4 leftovers (`@theme`, `oklch`, `@container`, raw hex outside charts), no `localStorage`/`fetch`/`AppShell`/`LoginPage`/`AuthContext` in the module, no class-name interpolation; all internal targets resolve to mounted routes (`/sales/orders/new`, `/sales/deliveries/new`, `/sales/invoices/new`, `/sales/unknown` all redirect into the module) |
