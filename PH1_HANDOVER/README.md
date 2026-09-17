# PH1 Sales Module — Handover Package

**Branch:** `integration/ph1-sales-core` (from `origin/develop` @ `7c98c78`)
**Source baseline:** `feature/ph1-sale-core` @ `cf918b8` (PH1 standalone)
**Date:** 2026-09-17

This package hands the integrated PH1 Sales module to the Integration Owner. It is the Step 12 deliverable of the remediation plan (`PLAN.md`); the authoritative evidence for each step lives under `docs/ph1-remediation/`.

## 1. Package index

| Artefact | Content |
|---|---|
| `API_SPEC.md` | Sales endpoints, payloads, status codes, error codes |
| `RBAC.md` | Canonical roles, `sales.*` permissions, per-endpoint matrix, rulings R-1/R-2/R-6 |
| `BUSINESS_RULES.md` | Order/delivery/invoice/receivable rules, pricing, state machines, credit policy |
| `INTEGRATION.md` | Cross-module boundaries (PH1 ↔ PH4/PH5), sanctioned interfaces, seed/verification notes |
| `TEST_REPORT.md` | Suite inventory, latest results, environment, gate mapping |
| `COMPATIBILITY_REPORT.md` | PH1 → Core gap matrix, retired/migrated files, dependency results, regression summary |
| `backend/README.md` | Where the backend module lives and what it owns |
| `frontend/README.md` | Where the frontend module lives and what it owns |
| `database/README.md`, `database/schema.sql`, `database/seed.sql` | Database stance: **zero PH1-owned DDL/seed** (schema blob identical to Core) |

## 2. Reproduce the verification (from the repository root)

```bash
# Backend (dev database from backend/.env; each suite boots the app on an ephemeral port)
cd backend
node tests/test_ph1_sales_api.js            # 115 checks
node tests/test_rbac_security.js            # RBAC / security matrix
node tests/test_cross_module_integration.js # PH1↔PH4 scenarios
node tests/test_ph1_business_parity.js      # business parity (PH1 test intent)
node tests/audit_step2_verification.js      # database audit MUC I–XIX
node tests/test_ph4_api.js                  # PH4 regression

# Frontend (Core workspace)
cd ../frontend
npm ci && npm run build                     # clean production build
```

All suites assume the disposable development database and delete the rows they create (`[SMOKE]` / `[SMOKE-PARITY]` markers; aging probes and temporarily flipped product status are reverted).

For the live PH4 warehouse checks the backend must be running (`hub`-supervised `backend` process on port 5000, or `npm start` in `backend/`).

## 3. What the module owns

- **Backend:** `backend/src/{routes,controllers,services,repositories,utils}/sales/**`, `backend/src/config/sales.js`, mounted at `/api/v1/sales` from `backend/src/app.js`.
- **Frontend:** `frontend/src/sales/**` (routes, pages, dialogs, services), registered in `frontend/src/routes/AppRoutes.jsx` and `frontend/src/config/menu.js`.
- **Database:** nothing — the module binds to existing `erp_may10` tables (`khach_hang`, `don_ban_hang`, `chi_tiet_don_ban_hang`, `giao_hang`, `hoa_don_ban_hang`, `cong_no`; read-only `kho`, `san_pham`, `don_vi_tinh`).

## 4. Open owner decisions

1. **R-2 consequence** — `ke_toan` keeps the aging report but loses the raw AR ledger list/summary (`sales.view`); confirmed and regression-locked in Step 8 (`docs/ph1-remediation/STEP8_BUSINESS_PARITY_EVIDENCE.md` §4).
2. **G-7** — `kho`/`ke_toan` cannot reach the Sales UI at all (module gate is `sales.view`), though the API serves them scoped data; option (b) in `KNOWN_GAPS.md` (narrower permissions) is the recommended resolution.
3. **G-2** — invoice issuance does not post to the AR ledger (`cong_no`); preserved from PH1, belongs to Finance ownership.

## 5. Gate status (Step 13)

| Gate | Status | Evidence |
|---|---|---|
| 1 — Core/PH4 preservation | PASS | Only approved seams modified (`backend/src/app.js`, `frontend/src/routes/AppRoutes.jsx`, `frontend/src/config/menu.js`); no PH4 file touched; 0 DDL |
| 2 — UI V2.11 | PASS | Step 6 evidence (`STEP6_FRONTEND_EVIDENCE.md`), Core layout/tokens, two-level navigation |
| 3 — Security/RBAC | PASS | `STEP9_SECURITY_EVIDENCE.md` (15 checklist items + 5 PH1-specific checks) |
| 4 — Automated regression | PASS | `TEST_REPORT.md`: API 115/0, RBAC 27/27, parity 70/0, cross-module 8/8, audit complete, PH4 16/16, clean production build exit 0 |
