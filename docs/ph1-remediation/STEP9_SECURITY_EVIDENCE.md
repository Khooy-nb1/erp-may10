# PH1 Remediation — Step 9 Security Verification Evidence

**Document ID:** `DOC-PH1-REM-010`
**Date:** 2026-09-17
**Branch:** `integration/ph1-sales-core`
**Purpose:** item-by-item evidence for PLAN.md Step 9. Every line names the suite and the assertion that proves it; all suites were re-run green in the same session as this document.

---

## 1. Contract security checklist

| # | Requirement | Evidence (suite → assertion) | Result |
|---|---|---|---|
| 1 | Unauthenticated rejection | `test_ph1_sales_api.js` → `no token -> 401`, `401 envelope carries errorCode` (`UNAUTHORIZED`); `test_rbac_security.js` r01 | PASS |
| 2 | Invalid / tampered token rejection | `test_ph1_sales_api.js` → `forged token -> 401`; `test_rbac_security.js` r02/r03 | PASS |
| 3 | Expired token rejection | `test_ph1_business_parity.js` → `expired and future-dated tokens -> 401 UNAUTHORIZED` (tokens minted at −25 h and +10 min; Core `middlewares/auth.js:83-86` enforces a 24 h max age and rejects future timestamps beyond 60 s skew) | PASS |
| 4 | `x-role` spoofing rejection | `test_ph1_business_parity.js` → `identity headers cannot escalate a token (kho + x-role admin -> 403)`; `test_rbac_security.js` identity-header scenarios | PASS |
| 5 | `x-user-id` spoofing rejection | same assertions as #4 — the role/user always come from the signed token, never from client headers | PASS |
| 6 | 403 for unauthorized roles/permissions | `kho` cannot patch/confirm orders, create deliveries via seller token, or read the catalogue writes; `san_xuat` 403 on `/tong-quan/summary`; `ke_toan` 403 on the AR ledger list/summary (ruling R-2); `ban_hang` 403 on delivery `start`/`complete` (`kho.xuat`) | PASS |
| 7 | Parameterized SQL | All module repositories bind values (`$n`; `receivable.repository.js` builds dynamic `$` placeholders). Injection probe: `?sortBy=id; DROP TABLE khach_hang` → 200 (unknown column falls back to the default order) and `SELECT COUNT(*) FROM khach_hang` still succeeds — `a forbidden sortBy cannot inject SQL` | PASS |
| 8 | FK integrity | `test_cross_module_integration.js` TEST 08 (5-module JOIN integrity); `audit_step2_verification.js` MUC I–XIX; module repositories only write sales-owned tables (see §3) | PASS |
| 9 | Strict input validation | 422 + field-level `details` across all suites (page/pageSize bounds, negative credit limit, zero quantity, delivery date before order date, `fromDate > toDate`, missing `ly_do`, over-payment, `deliveredLines`) | PASS |
| 10 | Duplicate-document protection | `test_ph1_sales_api.js` → duplicate invoice → `409 INVOICE_ALREADY_EXISTS`; document codes generated server-side with collision retry (`KH-<year>-<6>`, `DBH-<year>-<6>`, `HDBH-<year>-<6>`) plus DB unique constraints; parity suite asserts the code formats | PASS |
| 11 | Mass-assignment protection | `test_ph1_business_parity.js` → `PATCH ignores non-whitelisted fields (code/audit/id intact)` — a hostile PATCH carrying `ma_khach_hang`, `nguoi_tao`, `id` leaves them unchanged (validators strip unknown keys) | PASS |
| 12 | No password / hash leakage | No module SQL selects `mat_khau` (grep: 0 hits in `src/repositories/sales`, `src/services/sales`, `src/routes/sales`); the only `password` occurrences are the log-redaction patterns in `utils/sales/logger.js:11-12`. Sales endpoints never serialize `nguoi_dung` rows | PASS |
| 13 | No stack-trace leakage | `test_ph1_business_parity.js` → `error envelopes never leak SQL or stack frames (17 payloads scanned)`; module boundary `utils/sales/errorBoundary.js` renders `{ success, message, errorCode, details }` with `details` = normalized field list or `null` | PASS |
| 14 | No raw SQL leakage | same assertion as #13 (pattern covers `SELECT `/`INSERT INTO`/`UPDATE … SET`/`DELETE FROM`/`pg_`) | PASS |
| 15 | CORS not wildcard for authenticated operations | `test_ph1_business_parity.js` → `CORS echoes an allow-listed origin only`: `Origin: http://evil.example` receives **no** `access-control-allow-origin`; `http://localhost:5173` (from `CORS_ORIGINS`) is echoed verbatim | PASS |

## 2. Additional PH1 checks

| Requirement | Evidence | Result |
|---|---|---|
| No `auth_token` reads remain in the module | Module has no auth storage access; identity comes from Core's `middlewares/auth.js` (`req.user`) via `utils/sales/identity.js` | PASS |
| No JWT secret required by the module runtime | No `jsonwebtoken` dependency or secret in module code (BASELINE.md §3.1 action, executed in Step 5) | PASS |
| No private login endpoint mounted | `frontend/src/sales/*` uses Core `/login` + `AuthContext`; backend exposes no `/auth` route of its own (`backend/src/routes/salesRoutes.js` mounts sales routers only) | PASS |
| No permissive fallback user | Module never defaults a missing identity to a privileged actor; `identity.js` fails closed (missing identity → 401/403) | PASS |
| No client-submitted total accepted as authoritative | Order create/patch recalculate `tong_tien_hang`/`tien_giam_gia`/`tong_thanh_toan` server-side from line quantity × catalogue price (parity: `discount line math is server-side`; smoke: `server computed gross total`, `line price comes from the product table`); invoice amounts come from the locked order row (`createInvoiceAtomic` step 5) | PASS |

## 3. Write-surface audit (module repositories)

`INSERT`/`UPDATE`/`DELETE` targets across `src/repositories/sales/*.js`:

```
khach_hang, don_ban_hang, chi_tiet_don_ban_hang, giao_hang, hoa_don_ban_hang
```

Read-only joins reference `kho` and `san_pham` (plus `don_vi_tinh`) — no PH4/PH5 table is written by the module, which is the security-relevant half of the ownership boundary (Step 11 covers the runtime half).

## 4. Observations handed to the Core owner (recorded in `INTEGRATION_REQUESTS.md` §4)

- Core's `errorHandler` renders `err.stack` into `details` when `NODE_ENV=development` (`middlewares/errorHandler.js:12`). The module therefore renders its own errors through `utils/sales/errorBoundary.js`; production responses were re-verified to omit `details` entirely (`production mode answers 500 without details, stack frames or SQL`).
- Core tracks ~50–60 zero-byte placeholder files (BASELINE.md §4.1 stub caveat); none is on the PH1 path.
