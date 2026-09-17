# PH1 Sales Module — Compatibility Report

**Branch:** `integration/ph1-sales-core` · **Date:** 2026-09-17
**Source:** PH1 standalone `ph1-bh-qlkh` / `feature/ph1-sale-core` @ `cf918b8` → Core `origin/develop` @ `7c98c78`

Step 12 (recommended) deliverable of `PLAN.md`. Details per topic live in the referenced documents; this report is the single-page summary the Integration Owner reviews.

## 1. Gap matrix (PH1 standalone → integrated Core)

| Area | PH1 baseline | Integrated state | Evidence |
|---|---|---|---|
| Module system | ESM + TypeScript, `"type": "module"` | CommonJS `.js` under Core's runtime | `STEP5_BACKEND_EVIDENCE.md` |
| Server/bootstrap | PH1 owned `server.ts`/`app.ts` | Retired; Core `server.js`/`app.js` owns the process, PH1 mounts at `/api/v1/sales` | `backend/src/app.js` (approved seam) |
| Auth | Private JWT + `auth_token` storage + private login | Core HMAC `erp_token` (`signToken`/`authMiddleware`), Core `/login` + `AuthContext` | `STEP9_SECURITY_EVIDENCE.md` |
| Roles/permissions | PH1 role strings, `ban_hang.*` naming in the contract draft | Canonical Vietnamese roles; `sales.view/create/update/approve` (R-1); `ke_toan_truong` ≡ `ke_toan` (R-6) | `RBAC.md`, `INTEGRATION_REQUESTS.md` §2 |
| Validation | `zod` schemas | Module-local validator (`utils/sales/validate.js`) — Core has no `zod` dependency | `STEP5_BACKEND_EVIDENCE.md` |
| Frontend shell | Private `AppShell`, private login, private `AuthContext`, private fetch client | Core `MainLayout`, Core `/login`, Core `AuthContext`, Core Axios `api.js` | `STEP6_FRONTEND_EVIDENCE.md` |
| React / router | React 19, Router `^7.18.3` | React 18.3.1, Router 7.18.3 (R-5) | §4 below |
| Tailwind | v4 CSS-first | v3.4.19 PostCSS pipeline (Core tokens, V2.11) | `FRONTEND_TOKEN_MAP.md` |
| Database | Own schema copy | Zero DDL: schema blob identical to Core (`aaae749b…`), 0 additive statements | `DB_COMPATIBILITY_MATRIX.md` |
| Storage of identity in code | `req.user.vai_tro` / `req.userId` | `utils/sales/identity.js` reads Core's `req.user.role` | `INTEGRATION_REQUESTS.md` §4 |

## 2. Files removed / retired (not carried into the integrated tree)

`frontend/src/components/common/AppShell.tsx`, `frontend/src/pages/auth/LoginPage.tsx`, `frontend/src/context/AuthContext.tsx`, `frontend/src/services/api.ts`, `backend/src/server.ts`, `backend/src/routes/auth.routes.ts`, `backend/src/services/auth.service.ts`, `backend/src/middlewares/auth.middleware.ts` — full list in `BASELINE.md` §4.6. The PH1 `SalesOrderCreatePage` was already replaced by `SalesOrderCreateDialog` in the source branch (`85d7262`).

## 3. Files migrated (new module tree, all additive)

- Backend: `backend/src/routes/sales/**`, `backend/src/routes/salesRoutes.js`, `backend/src/controllers/sales/**`, `backend/src/services/sales/**`, `backend/src/repositories/sales/**`, `backend/src/utils/sales/**`, `backend/src/config/sales.js`.
- Frontend: `frontend/src/sales/**` (routes, pages, dialogs, services, config).
- Tests: `backend/tests/test_ph1_sales_api.js`, `backend/tests/test_ph1_business_parity.js` (new); `backend/tests/test_cross_module_integration.js`, `backend/tests/audit_step2_verification.js` (auth helper modernised to Core tokens).
- Docs: `docs/ph1-remediation/**`, `PH1_HANDOVER/**`.

## 4. Dependency version results

| Package | Target (Core) | Integrated result | Note |
|---|---|---|---|
| `react` / `react-dom` | `18.3.1` | **18.3.1**, single version in tree | downgraded from PH1 React 19 |
| `react-router-dom` | `7.18.3` | **7.18.3**, single instance | R-5; child routes under `/sales/*` |
| `tailwindcss` | `3.4.19` | **3.4.19** + PostCSS/Autoprefixer | v4 → v3 migration |
| `vite` | `6.4.3` | **6.4.3** (+ `@vitejs/plugin-react` 4.7.0) | TSX via esbuild (R-4) |
| `axios` | Core `api.js` | adopted | replaces the private fetch wrapper |
| `lucide-react`, `clsx`, `tailwind-merge` | Core-locked | aligned | see `BASELINE.md` §3.3 |
| `jsonwebtoken` | absent | **removed** | Core HMAC auth instead |
| `zod`, `bcryptjs` | absent | not used by the module | validator ported locally; no user seeding |

Package manager standardised on npm (`package-lock.json`, lockfileVersion 3).

## 5. Route / API migration maps

- Frontend route map: `TARGET_DESIGN.md` §4.1 (`/sales/*` pages, guard `sales.view`).
- Backend API map: `TARGET_DESIGN.md` §4.2 (`/api/v1/sales/…`) and `INTEGRATION_BOUNDARIES.md` (cross-module rows).
- Response envelope: contract §9.3 flat shape (`success`, `message`, `data`, `errorCode`, `details`) rendered by `utils/sales/response.js` + `utils/sales/errorBoundary.js`; list endpoints add the `meta` pagination block.

## 6. Auth / RBAC migration evidence

- Core `erp_token` (HMAC-SHA256, 24 h max age, future-skew rejection) — `middlewares/auth.js`; forged/expired/identity-header scenarios green in `test_rbac_security.js` and `test_ph1_business_parity.js`.
- Canonical roles + `sales.*` permissions exercised per endpoint; role-scoped dashboard (full/fulfillment/financial) asserted with exact key sets.
- R-2 (receivables read-only split) confirmed and regression-locked.

## 7. Core / PH4 regression results

| Check | Result |
|---|---|
| PH4 API suite | 16/16 |
| PH4 warehouse endpoints through the integrated app | `PH4 /api/v1/ton-kho still reachable -> 200`, `Core module catalog -> 200` (smoke suite) |
| PH1 ↔ PH4 scenarios | 8/8 (incl. 409 on insufficient stock, rollback, row-lock concurrency) |
| Step-2 database audit | complete (MUC I–XIX) |
| Core source changes | only the three approved seams (`backend/src/app.js`, `frontend/src/routes/AppRoutes.jsx`, `frontend/src/config/menu.js`) |
| Destructive shared-DB changes | none (0 DDL; tests clean up after themselves) |

## 8. Residual gaps carried to acceptance

`KNOWN_GAPS.md` G-2 … G-7 remain owner-visible: no AR posting on invoice issuance (G-2), `overdueOnly=false` string coercion (G-3), role-scoped metric masking in the service (G-4), no stock reservation from sales documents (G-5), actor-column-only audit (G-6), and the `sales.view` module gate locking `kho`/`ke_toan` out of the UI (G-7). None blocks the four acceptance gates; G-7 and the R-2 consequence are the two items awaiting an owner ruling.
