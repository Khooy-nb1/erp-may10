# PH1 Sales Module — Test Report

**Branch:** `integration/ph1-sales-core` · **Date:** 2026-09-17 · **Database:** disposable development DB (`erp_sales_crm_dev` from `backend/.env`)

Step 12 deliverable of `PLAN.md`. Every result below was produced in one session against the integrated workspace; suites boot Core's `app.js` on an ephemeral port, so no long-running server is required (the PH4 comparison suite reads the running backend on port 5000).

## 1. Suite inventory and latest results

| Suite | Purpose | Command (from `backend/`) | Result |
|---|---|---|---|
| `test_ph1_sales_api.js` | PH1 API smoke/regression: auth gates, envelopes, validation, write matrix, Core/PH4 reachability | `node tests/test_ph1_sales_api.js` | **123 passed / 0 failed** |
| `test_ph1_validation.js` | Request-validation contract without a database: id parsing, alias conflicts, date rules, boolean flags, bounds, sort allow-lists, crash paths | `node tests/test_ph1_validation.js` | **69 passed / 0 failed** |
| `test_ph1_business_parity.js` | Business parity with the retired PH1 suite (pricing, envelope, customers, products, orders, deliveries, invoices, receivables, dashboard, security) | `node tests/test_ph1_business_parity.js` | **70 passed / 0 failed** |
| `test_rbac_security.js` | RBAC/security matrix: 401/403 per role, identity-header spoofing, module isolation | `node tests/test_rbac_security.js` | **27/27, exit 0** |
| `test_cross_module_integration.js` | PH1↔PH4 scenarios: receipts, issues, finished goods, 409 insufficient stock, rollback, row-lock concurrency, 5-module JOIN | `node tests/test_cross_module_integration.js` | **8/8 (100 %)** |
| `audit_step2_verification.js` | Step-2 database audit MUC I–XIX (stock ledger, FEFO/FIFO, 4-KPI dashboard) | `node tests/audit_step2_verification.js` | **complete run** |
| `test_ph4_api.js` | PH4 API regression | `node tests/test_ph4_api.js` | **16/16 (100 %)** |

Frontend (Core workspace): `npm ci` (210 packages) + `npm run build` → **exit 0**, single `index-*.js` bundle (see `docs/ph1-remediation/STEP10_BUILD_EVIDENCE.md`); `npm test` → **9 passed / 0 failed** (local rule parity, §5).

## 2. Coverage map (Step 9 + gates)

| Acceptance item | Covered by |
|---|---|
| 401 unauthenticated / forged / expired token | `test_ph1_sales_api.js`, `test_rbac_security.js`, parity (token expiry + future-timestamp guard) |
| 403 per role/permission | `test_rbac_security.js`, smoke suite, parity (`san_xuat` denied; `ke_toan` ledger 403 per R-2) |
| Identity-header spoofing rejected | `test_rbac_security.js`, parity |
| Parameterized SQL / no injection | parity (`sortBy` injection attempt + table integrity), `test_ph1_validation.js` (repository sort allow-lists) |
| FK integrity | cross-module TEST 08, audit script |
| Strict validation + field-level `details` | smoke suite, parity (10 validation scenarios), `test_ph1_validation.js` (ids, aliases, dates, flags, bounds) |
| Duplicate documents | smoke suite (invoice 409), document-code formats in parity |
| Mass assignment | parity (`PATCH` whitelist), `test_ph1_validation.js` (unknown keys stripped, never applied) |
| No hash/stack/SQL leakage | parity (17 error payloads scanned; production-mode handler check) |
| CORS allow-list | parity (unlisted origin gets no ACAO header) |
| Server-authoritative totals | smoke suite + parity (order discount math, invoice from locked order) |
| Business state machines | parity (order, delivery, invoice) |
| Ledger ↔ dashboard invariant | parity (aging bands ↔ summary ↔ dashboard) |
| Cross-module ownership | cross-module suite + repository write-surface audit |

## 3. Test-data policy

- Rows created by suites carry `[SMOKE]` or `[SMOKE-PARITY]` in a text column and are deleted in `finally`; the parity suite additionally deletes its `cong_no` aging probes and restores any product status it flips.
- Verified after the last run: 0 surviving `[SMOKE-PARITY]` rows in `khach_hang`, `don_ban_hang`, `giao_hang`, `hoa_don_ban_hang`; 0 products left in a non-`dang_ban` state.
- Timing-sensitive assertions are written as deltas (aging bucket deltas, summary before/after cancel) so pre-existing data cannot invalidate them.

## 4. Known limitations

- The parity suite requires write access to the development database (it creates and deletes its own rows); it is not runnable against production.
- Aging boundary probes exercise the live `cong_no` table, so a concurrent ledger writer could shift the *absolute* totals — the suite asserts per-bucket deltas, which are immune to that.
- `test_cross_module_integration.js` is the Core-era cross-module regression suite: it **deliberately writes PH2/PH3/PH4 documents** (receipts, material issues, finished-goods receipts, stock resets) against the disposable development database. That is expected for a cross-module flow test; the PH1 module itself is proven non-destructive by the parity suite's read-only PH4 boundary check (`SUM(ton_kho.so_luong_ton)` and `chi_tiet_phieu_xuat` count unchanged across a delivery lifecycle). Run both only against a disposable database.
- The PH1 standalone vitest suites (175 tests at `cf918b8`) are retired, not executed: they target TypeScript + a private server. Their intent is carried by `test_ph1_business_parity.js` (mapping in `docs/ph1-remediation/STEP8_BUSINESS_PARITY_EVIDENCE.md` §3).

## 5. Frontend rule parity (2026-09-17)

The module's dialogs validate locally with `frontend/src/sales/lib/validation.js` before they call the API, so the
message shown must be the message the API would have returned. The check was run field by field:

| Step | Command / method | Result |
|---|---|---|
| Unit suite | `frontend $ npm test` (`node --test`) | **9 passed / 0 failed** — message literals and boundaries |
| Build | `frontend $ npm run build` | exit 0, bundle rebuilt |
| Live parity | 60 payloads posted to the running backend on port 5000 (`/sales/khach-hang`, `/sales/don-hang`, `/sales/giao-hang`, `/sales/hoa-don`), each local message compared with the API's `details[].message` for the same field — check order (blank/7/21-character phone, blank/`NaN`/`'1e999'` numerics, 3651 days, 1e16 credit limit, cleared invoice date) **and** the null/cleared semantics (cleared amounts and discounts, cleared/absent line quantity, whitespace and null email, non-string date). Every accepted-value case carries a failing sibling field, so the whole run answers `422` and inserts nothing (`SELECT count(*) FROM khach_hang` unchanged after the run) | **60 exact matches / 0 mismatches** |
| Browser | `/sales/customers`, `/sales/orders`, `/sales/deliveries`, `/sales/invoices` with an admin session: blank submits and an invalid phone answered with the local messages, and **no write request left the browser** (verified by request interception) | module renders, 0 console errors, 0 stray rows created |

An earlier pass reported three divergences (order customer, order date, order line product); they were probe
artifacts — the payloads omitted the field key, which no dialog does (an unselected customer is `0`, a cleared date
is `''`). The rules now also read the dialog state through the same normalisers the payload uses
(`toWireAmount`/`toWireQuantity`), so a *cleared* amount, discount or paid amount is checked as the `0` it is sent
as rather than as a number error; the cleared/absent/null/whitespace table and the omitted-key note are in
`PH1_HANDOVER/BUSINESS_RULES.md` §9.7.

Related dialog work: the four create dialogs now render the API's field messages next to the matching control and
surface everything else through the module toast host (`components/ui/toast.jsx`). The stale `ErrorState` banners
that PH1's dialogs used for submit failures are gone; page-level load failures keep theirs (they carry a retry).
