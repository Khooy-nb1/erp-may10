# PH1 Remediation — Integration Baseline Document (Step 1)

**Document ID:** `DOC-PH1-REM-001`  
**Date:** 2026-09-16  
**Source Branch:** `ph1-bh-qlkh` @ `bd54d99` (standalone PH1 Sales/CRM)  
**Remediation Working Branch:** `feature/ph1-sale-core` @ `cf918b81a5af1f9a8ebb872fbd0d1514f0fb279d`  
**Compliance Standard:** `ERP-M10-DEV-CONTRACT-2026` v1.1 (Vietnamese RBAC Standardized Release)  
**Deliverable Type:** Step 1 Contract Compliance Freeze Deliverable  
**Owner Rulings (2026-09-16):** R-1 `sales.*` permission namespace (contract `ban_hang.*` waived) · R-2 receivables read-only split · R-3 integration on `integration/ph1-sales-core` (from `origin/develop` @ `7c98c78`) · R-4 TSX retained, build-only Core verification · R-5 React Router `^7.18.3` · R-6 `ke_toan_truong` ≡ `ke_toan` — full log in `INTEGRATION_REQUESTS.md` §2

---

## 1. Baseline Commit SHAs

| Target | Branch / Ref | Commit SHA | Description |
|---|---|---|---|
| **PH1 Remediation Source (frozen)** | `feature/ph1-sale-core` (checked-out working branch) | `cf918b81a5af1f9a8ebb872fbd0d1514f0fb279d` | Standalone Sales/CRM module incl. latest UI commits (`85d7262`, `cf918b8`) — transplant source |
| **PH1 Standalone Baseline (prior freeze)** | `ph1-bh-qlkh` | `bd54d99e8c8455d6d4c50bd7956b972c331718f7` | Previous freeze point (pre-UI-commits) |
| **PH1 Branch Origin** | `origin/main` | `c378a55faefa837c28ac5ea2fefe4d8656121c99` | Mainline the PH1 branch was cut from |
| **Approved ERP Core Baseline** | `origin/develop` | `7c98c78dd8716e9345d44c5af681ee1b31a1117b` | Monorepo integration baseline (re-verified unchanged this run) |
| **PH4 Core Portal Baseline** | `origin/feature/ph4-core-portal` | `bf5dca790b3447e54de0db2c3cbd85293838bd56` | Frozen PH4 Kho & Core Portal reference (re-verified unchanged this run) |

---

## 2. Current PH1 Pre-Remediation Verification Results

All automated checks were re-executed on the frozen remediation source — working branch `feature/ph1-sale-core` @ `cf918b8`, working tree clean (`git status --porcelain` = 0 lines):

### 2.1 Backend (`backend/`)
- **Runtime / Module System:** Node.js `v24.11.0`, npm `11.6.1`, TypeScript `^5.7.2`, ECMAScript Modules (`"type": "module"`).
- **Static Typecheck:** `npm run typecheck` (`tsc --noEmit`) -> **PASS (Exit code 0)**.
- **Automated Test Suite:** `npm test` (`tsx --test src/**/*.test.ts`) -> **PASS (Exit code 0)**:
  - **Suites:** 27 passed, 27 total.
  - **Tests:** 175 passed, 0 failed, 0 skipped, 0 cancelled.
  - **Duration:** 2,704 ms (re-run at `cf918b8`; earlier freeze `78d7729` measured 5,733 ms — both green).
  - **Covered Domains:** App health, Database transactions, Environment validation, Auth/RBAC middleware, Rate limiting, Error handlers, Customer/Dashboard/Delivery/Invoice/Order/Product/Receivable HTTP routes and Unit services, Pricing calculators.

### 2.2 Frontend (`frontend/`)
- **Runtime / Framework:** React `^19.3.0`, React Router `^7.18.3`, Vite `^8.3.0`, Tailwind CSS `^4.3.3`, TypeScript `^5.7.2`, pnpm `10.21.0`.
- **Static Typecheck:** `pnpm typecheck` (`tsc --noEmit`) -> **PASS (Exit code 0)**.
- **Production Build:** `pnpm build` (`tsc && vite build`) -> **PASS (Exit code 0)**:
  - **Modules transformed:** 2,068.
  - **CSS bundle:** `dist/assets/index-DUz7mWcG.css` (29.79 kB | gzip: 6.81 kB).
  - **JS bundle:** `dist/assets/index-CO7na2q3.js` (643.69 kB | gzip: 188.26 kB).

---

## 3. Approved ERP Core Target Environment & Dependency Alignment

Based on `origin/develop:backend/package.json`, `origin/develop:frontend/package.json` and the Core npm lockfiles (`backend/package-lock.json`, `frontend/package-lock.json`, `lockfileVersion: 3`). The ranges below are the declared constraints; exact locked versions are in §3.3. PH1 currently uses pnpm lockfiles — the integration workspace must standardize on the Core package manager (npm).

### 3.1 Backend Dependencies (Core vs PH1)
| Package / Trait | Target ERP Core (`origin/develop`) | Current PH1 (`ph1-bh-qlkh`) | Remediation Required |
|---|---|---|---|
| Module System | **CommonJS** (no `"type": "module"`) | ESM (`"type": "module"`) | **Convert to CommonJS** |
| Language Target | Node.js CommonJS (`.js`) | TypeScript (`.ts`) | **Transpile/convert to CJS modules** |
| Server Lifecycle | Core owns `src/server.js`, `src/app.js` | PH1 owns `src/server.ts`, `src/app.ts` | **Retire standalone server/bootstrap** |
| `express` | `^4.21.2` | `^4.21.2` | Compatible |
| `pg` | `^8.13.3` | `^8.13.1` | Compatible |
| `dotenv` | `^16.4.7` | `^16.4.7` | Compatible |
| `cors` | `^2.8.5` | `^2.8.5` | Compatible |
| `morgan` | `^1.10.0` | None (custom logger) | Compatible |
| `helmet` | None in Core deps | `^8.0.0` | Keep PH1-module-local (Core owns its own header policy) or drop if unused |
| `jsonwebtoken` | **None** (Removed in Core) | `^9.0.2` | **Remove private JWT issuing** |
| `bcryptjs` | None in root dependencies | `^2.4.3` | Keep if required by user seeding |
| `zod` | None in Core root | `^3.24.1` | Safe for business validation in PH1 |

### 3.2 Frontend Dependencies (Core vs PH1)
| Package | Target ERP Core (`origin/develop`) | Current PH1 (`ph1-bh-qlkh`) | Remediation Required |
|---|---|---|---|
| `react` | **`^18.3.1`** | `^19.3.0` | **Downgrade to React 18.3.1** |
| `react-dom` | **`^18.3.1`** | `^19.3.0` | **Downgrade to React 18.3.1** |
| `react-router-dom`| **`^7.18.3`** (locked `7.18.3`) | `^7.18.3` | No downgrade required; align child routes under `/sales/*` (PLAN's "Core v6" assumption is incorrect — IR-01) |
| `tailwindcss` | **`^3.4.17`** | `^4.3.3` | **Migrate from v4 CSS-first to v3.4 PostCSS** |
| `vite` | **`^6.1.0`** | `^8.3.0` | **Align to Core Vite 6.x** |
| `@vitejs/plugin-react` | **`^4.3.4`** | `^6.1.1` | **Align plugin to match Vite 6** |
| `postcss` | **`^8.5.2`** | None (embedded in v4) | **Add PostCSS for Tailwind v3** |
| `autoprefixer` | **`^10.4.20`** | None (embedded in v4) | **Add Autoprefixer** |
| `axios` | **`^1.7.9`** | None (private `fetch` wrapper) | **Adopt Core Axios instance** |
| `clsx` | `^2.1.1` | `^2.1.1` | Compatible |
| `lucide-react` | `^0.475.0` | `^1.18.0` | Align version |
| `tailwind-merge` | `^3.0.1` | `^3.7.0` | Compatible |

### 3.3 Exact Core Locked Versions (from `origin/develop` npm lockfiles, `lockfileVersion: 3`)

| Package | Locked version (Core) | PH1 declared | Action |
|---|---|---|---|
| `react` / `react-dom` | `18.3.1` | `^19.3.0` | Downgrade to 18.3.1 |
| `react-router-dom` | `7.18.3` | `^7.18.3` | Already identical — no version change |
| `vite` | `6.4.3` | `^8.3.0` | Use Core pipeline |
| `@vitejs/plugin-react` | `4.7.0` | `^6.1.1` | Downgrade with Vite |
| `tailwindcss` | `3.4.19` | `^4.3.3` | Migrate to v3.4 PostCSS pipeline |
| `postcss` / `autoprefixer` | `8.5.28` / `10.5.5` | absent | Add (Tailwind v3 requirement) |
| `axios` | `1.20.0` | absent (custom `fetch`) | Adopt Core client |
| `clsx` / `tailwind-merge` | `2.1.1` / `3.6.0` | `^2.1.1` / `^3.7.0` | Align `tailwind-merge` |
| `lucide-react` | `0.475.0` | `^1.18.0` | Align icon package version |
| `express` | `4.22.2` | `^4.21.2` | Compatible |
| `pg` | `8.23.0` | `^8.13.1` | Compatible |
| `morgan` / `cors` / `dotenv` | `1.12.0` / `2.8.6` / `16.6.1` | `-` / `^2.8.5` / `^16.4.7` | Compatible |
| `jsonwebtoken` / `bcryptjs` / `zod` | absent | `^9.0.2` / `^2.4.3` / `^3.24.1` | Remove JWT; `zod`/`bcryptjs` remain PH1-module-local if needed |

---

## 4. Change Boundaries & Frozen Paths Checklist

**Frozen-path verification (this run):** every path listed below was confirmed present on `origin/develop` @ `7c98c78` — 31/31 Core platform paths, 14/14 sampled PH4 paths, 4/4 sampled PH5 paths.

### 4.1 Frozen Core Platform Paths (STRICTLY IMMUTABLE — DO NOT MODIFY)
These files belong to the platform foundation and are frozen across all modules:
- `frontend/src/App.jsx`
- `frontend/src/main.jsx`
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/Forbidden.jsx`
- `frontend/src/pages/NotFound.jsx`
- `frontend/src/components/Header.jsx`
- `frontend/src/components/Sidebar.jsx`
- `frontend/src/components/Toast.jsx`
- `frontend/src/components/layout/MainLayout.jsx`
- `frontend/src/components/layout/Header.jsx`
- `frontend/src/components/layout/Sidebar.jsx`
- `frontend/src/components/layout/Breadcrumb.jsx`
- `frontend/src/components/layout/Footer.jsx`
- `frontend/src/components/layout/ModuleHeader.jsx`
- `frontend/src/components/dashboard/*`
- `frontend/src/components/rbac/AuthContext.jsx`
- `frontend/src/components/rbac/ProtectedRoute.jsx`
- `frontend/src/components/rbac/PermissionGuard.jsx`
- `frontend/src/components/rbac/RoleGuard.jsx`
- `frontend/src/config/designTokens.js`
- `frontend/src/config/roles.js`
- `frontend/src/config/permissions.js`
- `frontend/src/services/api.js`
- `frontend/src/services/authService.js`
- `backend/src/server.js`
- `backend/src/config/database.js`
- `backend/src/config/env.js`
- `backend/src/config/roleMapping.js`
- `backend/src/middlewares/auth.js`
- `backend/src/middlewares/errorHandler.js`

**Stub caveat (verified on `origin/develop` @ `7c98c78`):** several frozen paths above are committed **0-byte placeholders**, not implementations — notably `backend/src/config/env.js`, `backend/src/routes/authRoutes.js`, `backend/src/services/authService.js`, `backend/src/middlewares/authMiddleware.js`, `frontend/src/context/AuthContext.jsx`, `frontend/src/hooks/useAuth.js`, `frontend/src/hooks/useFetch.js` and `frontend/src/layouts/*`. The live implementations sit at `backend/src/middlewares/auth.js`, `backend/src/config/database.js` + `backend/src/server.js`, `frontend/src/components/rbac/AuthContext.jsx`, `frontend/src/services/api.js` and `frontend/src/services/authService.js`. The freeze applies to the whole path (stub or populated); PH1 must never fill a Core stub with module code.

### 4.2 Frozen PH4 (Kho & Quản lý vật tư) Paths (STRICTLY IMMUTABLE — DO NOT MODIFY)
PH1 must never alter PH4 business code or warehouse storage tables:
- `frontend/src/pages/WarehouseModule.jsx`
- `frontend/src/pages/PhieuNhapPage.jsx`
- `frontend/src/pages/PhieuXuatPage.jsx`
- `frontend/src/pages/PhieuChuyenPage.jsx`
- `frontend/src/pages/PhieuKiemKePage.jsx`
- `frontend/src/pages/TonKhoPage.jsx`
- `frontend/src/pages/ViTriKhoPage.jsx`
- `frontend/src/pages/LoVatTuPage.jsx`
- `frontend/src/services/inventoryService.js`
- `backend/src/controllers/phieuNhapController.js`
- `backend/src/controllers/phieuXuatController.js`
- `backend/src/controllers/phieuChuyenController.js`
- `backend/src/controllers/phieuKiemKeController.js`
- `backend/src/controllers/tonKhoController.js`
- `backend/src/controllers/viTriKhoController.js`
- `backend/src/controllers/loVatTuController.js`
- `backend/src/controllers/masterDataController.js`
- `backend/src/routes/phieuNhapRoutes.js`
- `backend/src/routes/phieuXuatRoutes.js`
- `backend/src/routes/phieuChuyenRoutes.js`
- `backend/src/routes/phieuKiemKeRoutes.js`
- `backend/src/routes/tonKhoRoutes.js`
- `backend/src/routes/viTriKhoRoutes.js`
- `backend/src/routes/loVatTuRoutes.js`
- `backend/src/routes/masterDataRoutes.js`
- Shared inventory database tables: `kho`, `vi_tri_kho`, `vat_tu`, `lo_vat_tu`, `ton_kho`, `phieu_nhap_kho`, `chi_tiet_phieu_nhap`, `phieu_xuat_kho`, `chi_tiet_phieu_xuat`, `phieu_chuyen_kho`, `chi_tiet_phieu_chuyen`, `phieu_kiem_ke`, `chi_tiet_phieu_kiem_ke`

### 4.3 Frozen PH5 (Tài chính - Kế toán) Paths (STRICTLY IMMUTABLE — DO NOT MODIFY)
- `frontend/src/finance/*`
- `backend/src/controllers/debtController.js`, `documentController.js`, `journalController.js`, `financialReportController.js`, `costingController.js`, `costController.js`, `orderEfficiencyController.js`
- `backend/src/routes/financeRoutes.js`

### 4.4 Approved Integration Extension Points (FILES PH1 MAY CHANGE)
- `frontend/src/routes/AppRoutes.jsx:57-69`: inside the existing PH1 placeholder route — already wrapped in `<PermissionGuard permission="sales.view" redirect={true} fallback={<Forbidden />}>` — replace `<PlaceholderModule />` with `<SalesRoutes />` and extend the path to `sales/*`. **Resolved by ruling R-1 (2026-09-16):** the guard stays `sales.view`; the contract doc's `ban_hang.view` prefix is waived for PH1.
- `frontend/src/config/menu.js`: Register Sales navigation items in the Core sidebar configuration.
- `backend/src/app.js`: Mount the PH1 Sales router at `/api/v1/sales`.

### 4.5 New PH1 Module Scope (FILES PH1 MAY ADD)
- `frontend/src/sales/*` (or `frontend/src/pages/sales/*`):
  - `SalesRoutes.jsx` (Child router definition for `/sales/*`)
  - Sub-pages: `CustomerListPage`, `CustomerDetailPage`, `CustomerCreatePage`, `ProductListPage`, `SalesOrderListPage`, `SalesOrderDetailPage`, `DeliveryListPage`, `DeliveryDetailPage`, `InvoiceListPage`, `InvoiceDetailPage`, `ReceivableListPage` (order/delivery/invoice creation are **dialogs** at `cf918b8` — `SalesOrderCreatePage` was deleted in `85d7262`)
  - Sales-specific components & dialogs (`FilterBar`, `ReasonDialog`, `DeliveryCreateDialog`, `InvoiceCreateDialog`)
  - `frontend/src/sales/services/*`: Refactored to consume Core `api.js` (Axios)
- `backend/src/routes/salesRoutes.js` (Root router for `/api/v1/sales`)
- `backend/src/controllers/sales/*` or `backend/src/routes/sales/*`
- `backend/src/services/sales/*` (Preserved business logic: order calculations, state transitions, credit checks, invoice creation)
- `backend/src/repositories/sales/*` (PostgreSQL queries bound to `erp_may10.public`)
- `docs/ph1-remediation/*` (Architecture and audit deliverables)

### 4.6 Retired Standalone Components (DO NOT CARRY TO INTEGRATION)
- `frontend/src/components/common/AppShell.tsx` (Retired — use Core `MainLayout`)
- `frontend/src/pages/auth/LoginPage.tsx` (Retired — use Core `/login`)
- `frontend/src/context/AuthContext.tsx` (Retired — use Core `AuthContext`)
- `frontend/src/services/api.ts` (Retired — use Core Axios `api.js`)
- `backend/src/server.ts` (Retired — use Core `server.js`)
- `backend/src/routes/auth.routes.ts` (Retired — use Core auth)
- `backend/src/services/auth.service.ts` (Retired — use Core HMAC auth)
- `backend/src/middlewares/auth.middleware.ts` (Retired — use Core `auth.js`)

---

## 5. Baseline Status Sign-Off

- [x] PH1 baseline commit SHA confirmed and reproducible: `cf918b81a5af1f9a8ebb872fbd0d1514f0fb279d` (working branch `feature/ph1-sale-core`; prior freeze `bd54d99` on `ph1-bh-qlkh`)
- [x] PH1 test suites recorded at that SHA (175/175 tests pass; backend + frontend typecheck exit 0; frontend production build exit 0)
- [x] ERP Core integration baseline confirmed and reproducible: `7c98c78dd8716e9345d44c5af681ee1b31a1117b` (re-verified unchanged this run, together with PH4 `bf5dca7`)
- [x] Core package dependencies cataloged (`package.json` declared ranges + exact npm-locked versions, §3.3)
- [x] Frozen path list and change boundaries established
- [x] Remediation working branch active: `feature/ph1-sale-core`
- [x] Step 1 Exit Criteria Satisfied — Ready for Step 2 Database Compatibility Audit
