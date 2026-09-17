# PH1 Remediation — Integration Requests & Stop Conditions Log

**Document ID:** `DOC-PH1-REM-005`  
**Date:** 2026-09-16 (re-validated at `cf918b8`; rulings recorded 2026-09-16)  
**Source Branch:** `feature/ph1-sale-core` @ `cf918b81a5af1f9a8ebb872fbd0d1514f0fb279d`  
**Target Core Baseline:** `origin/develop` @ `7c98c78dd8716e9345d44c5af681ee1b31a1117b` (PH4 provenance `origin/feature/ph4-core-portal` @ `bf5dca7`)  
**Compliance Standard:** `PLAN.md` Section 16 (Stop Conditions); Core contract `docs/ERP_MODULE_DEVELOPMENT_CONTRACT.md` (`ERP-M10-DEV-CONTRACT-2026` v1.1, on `develop`)  
**Status:** **GATE CLEARED — ALL SIX INTEGRATION REQUESTS RULED. Step 5 may proceed on the approved integration branch.**

---

## 1. Escalation Rule (unchanged)

`PLAN.md` Section 16 requires implementation to stop and the Integration Owner to clarify when a stop condition occurs: "…**Do not work around these conditions locally.**" All triggered conditions were escalated, ruled on, and are now closed (see §3).

---

## 2. Owner Rulings (2026-09-16) — Decision Log

| # | Ruling | Effect |
|---|---|---|
| **R-1** (IR-03) | **Waive contract §283-287 / §781-782 for PH1: the module implements the shipped `sales.*` namespace** (`sales.view`, `sales.create`, `sales.update`, `sales.approve`; `sales.delete` stays admin-only per `roleMapping.js:136`) | PH1 guards and specs use `sales.*`; **no frozen Core file is edited**; `PLAN.md` §5.4 is amended (waiver banner) and the contract-doc contradiction is tracked for the Core owner |
| **R-2** (IR-04) | **Receivables stay read-only in PH1:** list + customer summary behind the sales permission; the aging report behind the accounting permission (`accounting.receivable`) | Sales staff see customer debt; detailed aging stays with `ke_toan`/`admin`; PH1 never writes `cong_no` |
| **R-3** (IR-05) | **Create a dedicated integration branch from `origin/develop` @ `7c98c78`** and transplant the Sales module there; never integrate on `ph1-bh-qlkh`/`main` | Branch `integration/ph1-sales-core` created locally; the standalone branch stays the source of record |
| **R-4** (IR-06) | **Retain PH1 TypeScript/TSX**; Core verification is build-only; PH1 keeps its own `tsc --noEmit` gate aligned to React 18 type packages | No Core dependency/tooling change; the empirical build proof stands (see §3 IR-06) |
| **R-5** (IR-01) | **Confirm React Router `^7.18.3`** as the frozen baseline (PLAN's "Core v6" text is revoked) | No downgrade; `PLAN.md:131,673` need the correction wording |
| **R-6** (IR-02) | **`ke_toan_truong` is an alias of canonical `ke_toan`** for PH1 purposes; PH1 uses only the six canonical role codes | PH1 introduces no new role; the PH5-side contradiction is tracked separately |

Follow-on mapping detail accepted with R-1/R-2 (no further owner action required):

- PH1 order cancellation preserves today's behaviour: cancelling a `cho_xac_nhan` order requires `sales.update` (held by `ban_hang`/`admin`), while cancelling an already-confirmed order stays `admin`-only (`sales.delete`).
- Delivery lifecycle transitions (`start`/`complete`/`fail`) and invoice issuance remain **role-gated** through Core `requireRoles` (`admin`/`kho`, `admin`/`ke_toan`), matching current PH1 behaviour, because `kho`/`ke_toan` do not hold `sales.*` permissions.

---

## 3. Integration Requests (detail + resolution)

### IR-01 — React Router Version Baseline (Stop Condition 6) — **CLOSED (R-5)**

- **Evidence:** `origin/develop:frontend/package.json:17` → `"react-router-dom": "^7.18.3"` (lockfile-pinned `7.18.3`); Core consumes the RR7 API at `origin/develop:frontend/src/routes/AppRoutes.jsx:2`; PH1 declares the same range.
- **Resolution:** Core's router version is identical to PH1's; `PLAN.md:131,673` ("Core v6") are factually wrong. No downgrade; child routes mount under the existing Core router.

---

### IR-02 — `ke_toan_truong` Role Recognition (Stop Condition 3) — **CLOSED (R-6)**

- **Evidence:** Core seeds the 7th code (`origin/develop:database/seed.sql:15`) and names it in one guard (`origin/develop:backend/src/app.js:79`), but normalizes it away (`origin/develop:backend/src/config/roleMapping.js:61-62`, `.../middlewares/auth.js:130,201-207`); the contract mandates six roles (`.../docs/ERP_MODULE_DEVELOPMENT_CONTRACT.md:779`); PH5's own UI treats it as a distinct chief-accountant role (`.../frontend/src/finance/config/permissions.js:8`).
- **Resolution:** alias of `ke_toan`; PH1 uses only the six canonical codes. The contract-vs-PH5 contradiction is a Core/PH5 issue, logged here for the Core owner.

---

### IR-03 — Permission Namespace (`ban_hang.*` vs `sales.*`) (Stop Conditions 1 & 4) — **CLOSED (R-1: waiver → `sales.*`)**

- **Evidence (executable Core code — no `ban_hang.*` anywhere):** `roleMapping.js:93-101` (`SALES_PERMISSIONS`), `:136` (admin adds `sales.delete`); `frontend/src/config/permissions.js:10-15,56`; `frontend/src/routes/AppRoutes.jsx:57-69` (PH1 placeholder guarded by `sales.view`); `frontend/src/config/menu.js:26-28,33-35`; `backend/src/controllers/portalController.js:151-152`; `backend/src/middlewares/auth.js:237-238` (permission match against `ROLE_PERMISSIONS`). The only `ban_hang.*` occurrences in the whole tree are the contract document itself (`docs/ERP_MODULE_DEVELOPMENT_CONTRACT.md:283-287,781-782`).
- **Why it was a hard blocker:** a PH1 module coded against `ban_hang.*` would 403 for every role including `admin`, and aligning Core to the contract would have required editing frozen Core files (Stop Condition 1).
- **Resolution:** **R-1 waiver** — PH1 implements `sales.*`. `PLAN.md` §5.4 carries an amendment banner; the contract document remains a Core-owner follow-up item (either amend the contract text or align Core code later — out of PH1 scope).

---

### IR-04 — Accounts Receivable Ownership Boundary (Stop Condition 7) — **CLOSED (R-2)**

- **Evidence:** every PH1 query pins `cn.loai_cong_no = 'phai_thu'` (`backend/src/repositories/receivable.repository.ts:32,130,197`); the module exposes read-only endpoints only (`backend/src/routes/receivable.routes.ts`) and has no payment/write path.
- **Resolution:** read-only boundary approved; list + customer summary behind `sales.view`; aging behind `accounting.receivable` (`ke_toan`, `admin`); no PH1 write to `cong_no`.

---

### IR-05 — Integration Branch Strategy — **CLOSED (R-3)**

- **Evidence:** `main` `c378a55` → `ph1-bh-qlkh` `bd54d99` (ahead 17) → `feature/ph1-sale-core` `cf918b8`; `develop` `7c98c78` diverged from `main` at `f548013` and owns the populated Core/PH4/PH5; local diff `HEAD ↔ origin/develop` = **478 files** (270 develop-only, 196 HEAD-only, 10 modified, 2 renamed; 34,266 insertions / 35,974 deletions). `main` and the PH1 line hold 0-byte stubs at Core paths.
- **Corrected risk statement:** merging PH1 into `develop` cannot delete `develop`-only files; the real hazards are stub collisions at shared paths and an un-reviewable merge surface.
- **Resolution:** `integration/ph1-sales-core` created from `origin/develop` @ `7c98c78`; the transplant happens there. `ph1-bh-qlkh`/`main` are forbidden integration targets.

---

### IR-06 — TypeScript (TSX) Compatibility (Stop Condition 9) — **CLOSED (R-4)**

- **Evidence:** Core build is `vite build` only (`origin/develop:frontend/package.json`), with `vite ^6.1.0` + `@vitejs/plugin-react ^4.3.4`, **no** `tsconfig.json`, no `typescript`/`@types`; `tailwind.config.js:3` already scans `tsx`.
- **Empirical proof (2026-09-16):** a scratch copy of `origin/develop:frontend` (`git archive` → `npm ci` → 210 packages, exit 0) built an injected `.tsx` module: `npm run build` → **exit 0**, 1743 modules transformed, module marker present in `dist/assets/index-*.js`.
- **Resolution:** retain TSX; Core-side verification is build-only; PH1 runs its own `tsc --noEmit` (React 18 type packages) as a module-local gate. No Core tooling change.

---

## 4. Observations (Core-owner follow-ups, no PH1 action)

- Contract doc (`docs/ERP_MODULE_DEVELOPMENT_CONTRACT.md:283-287,781-782`) contradicts shipped Core code on permission prefixes (IR-03 left the text unchanged by waiver).
- Contract line `:779` ("exactly six roles") contradicts Core's own seed (`seed.sql:15`) and PH5's frontend role map (`finance/config/permissions.js:8`).
- `origin/develop:backend/src/config/roleMapping.js` has mojibake in Vietnamese comments (the PH4 branch copy is clean).
- `origin/develop` tracks ~50-60 zero-byte placeholder files; `origin/develop:docs/core-portal/05_api_specification.md` still documents `x-role`/`x-user-id` headers, superseded by the contract doc (`:783-785`).
- Core's auth surface is `POST /api/v1/auth/login` + `GET /api/v1/auth/me` (`origin/develop:backend/src/routes/portalRoutes.js:7-8`); there is no server-side logout — PH1's `POST /auth/logout` retires with the PH1 auth subsystem.
- **`req.user` shape (Step 5 finding):** Core's `authMiddleware` populates `{ id, name, email, dbRole, role, rawRole, phong_ban, trang_thai }`; there is no `vai_tro` and no `req.userId`, so PH1 handlers that read `req.user.vai_tro` (`PH1 routes/order.routes.ts:87`, `routes/dashboard.routes.ts`) would have silently degraded to the default role. The module now reads `req.user.role` through `utils/sales/identity.js`. If Core later adds `vai_tro`, the helper already prefers `role` and stays correct.
- **`errorHandler` overwrites `details` (Step 5 finding):** `backend/src/middlewares/errorHandler.js:12` renders `details` from `err.stack` in development and `undefined` otherwise, so module field-level validation details never reach the client (contract §9.3 requires `details`). The module renders its own errors via `utils/sales/errorBoundary.js` instead of changing Core. Core-owner follow-up: accept `err.details` from module errors, then the boundary can be deleted.
- **PH1 defect found while porting (Step 5):** PH1's delivery transition query used `FOR UPDATE` over four `LEFT JOIN`s, which PostgreSQL rejects (`FOR UPDATE cannot be applied to the nullable side of an outer join`), making `POST /giao-hang/:id/start|complete|fail` return 500 in the standalone app. Fixed as `FOR UPDATE OF <alias>` (see `KNOWN_GAPS.md` G-1).
- **Legacy test scripts authenticated with retired identity headers (Step 8/11):** `backend/tests/test_cross_module_integration.js` and `backend/tests/audit_step2_verification.js` sent `x-role`/`x-user-id`, so Core's hardening left them failing with 401 (the audit script crashed at MUC XIX on a missing `data` field). Their `apiRequest` helpers now mint a signed Core token (`signToken(userId)`) per acting role; scenarios/payloads/assertions unchanged. Results: 0/8 → **8/8** scenarios, audit script crash → **complete run**. Neither file is a frozen Core path (`BASELINE.md` §4.1); no product code changed.
- **Ruling R-2 consequence confirmed under test (Step 8):** the AR ledger list/summary require `sales.view`, so `ke_toan` receives 403 there while keeping `/cong-no/aging` (`accounting.receivable`) and the dashboard's financial scope. Now regression-locked in `STEP8_BUSINESS_PARITY_EVIDENCE.md` §4 — `TARGET_DESIGN.md` §215 asked for this confirmation with the Integration Owner.
- **Clean-install friction on Windows (Step 10, environment only):** `npm ci` fails with `EPERM` on `esbuild.exe`/`rollup.win32-x64-msvc.node` while a Vite dev server holds `node_modules`; both project dev servers (`frontend` on 5173, a stale `ph1-frontend` on 5174 stuck in *starting*) had to be stopped for the clean build and were restarted afterwards. Recorded in `STEP10_BUILD_EVIDENCE.md` §1.

---

## 5. Stop Conditions Status Summary

| Stop Condition | Status | Operational state |
|---|---|---|
| 1. Modification of frozen Core file | **CLEARED** | R-1 waiver removes the need to touch Core RBAC |
| 2. Modification of PH4 implementation | **CLEAR** | Zero PH4 files/tables touched; PH1 reads `kho` only |
| 3. New role required | **CLEARED** | R-6: alias only; six canonical roles |
| 4. Unapproved permission required | **CLEARED** | R-1: `sales.*` authorized |
| 5. Destructive shared-schema change | **CLEAR** | Step 2: schema blob identical (`aaae749b…`), 0 DDL |
| 6. Route/API conventions differ | **CLEARED** | R-5: React Router 7 confirmed (plan text revoked) |
| 7. Receivables ownership unresolved | **CLEARED** | R-2: read-only boundary + permission split |
| 8. Direct inventory mutation by delivery | **CLEAR** | Delivery writes `giao_hang` only |
| 9. Core build and TSX | **CLEARED** | R-4 + empirical build proof |
| 10. Core regression after integration | **MONITORED** | Evaluated at Steps 10-11 in the integrated workspace |

---

## 6. Current Directive

1. Integration branch `integration/ph1-sales-core` (from `origin/develop` @ `7c98c78`) is the only place PH1 code is integrated.
2. Step 5 (Backend Remediation) proceeds per `PLAN.md` §9 order R5→R7 (module-system conversion, Core auth/RBAC, `/api/v1/sales` namespace), followed by Step 6 (frontend) per Workstreams 6A-6I with the `sales.*` guards from R-1.
3. Every protected endpoint implements the matrix: no token → 401, invalid token → 401, valid unauthorized → 403, authorized → 200/201 (verified through Core `requireAuth`/`requireRoles`/`requirePermission`).
4. Dependencies align to `BASELINE.md` §3.3 locked versions (React `18.3.1`, React Router `7.18.3`, Tailwind `3.4.19`, Vite `6.4.3`, plugin-react `4.7.0`, axios `1.20.0`, express `4.22.2`, pg `8.23.0`); the integration workspace standardizes on npm.
