# PH1 Remediation — Step 8 Business Parity Evidence

**Document ID:** `DOC-PH1-REM-009`
**Date:** 2026-09-17
**Branch:** `integration/ph1-sales-core`
**Purpose:** evidence that PLAN.md Step 8 ("Confirm migration did not change business behavior") is satisfied — every preserved PH1 business area is exercised against the integrated module, with the retired PH1 test intent carried over as explicit checks.

---

## 1. Suites and latest results

Run from `backend/` (dev database configured by `backend/.env`; each suite boots the app on an ephemeral port):

| Suite | Command | Result (2026-09-17) |
|---|---|---|
| Business parity (new, Step 8/9) | `node tests/test_ph1_business_parity.js` | **70 passed / 0 failed** |
| API smoke / regression (Step 5 evidence) | `node tests/test_ph1_sales_api.js` | **115 passed / 0 failed** |
| RBAC / security | `node tests/test_rbac_security.js` | **27/27 assertions, exit 0** |
| Cross-module integration (Step 11) | `node tests/test_cross_module_integration.js` | **8/8 scenarios passed** |
| Step-2 database audit script | `node tests/audit_step2_verification.js` | **complete run, MUC I–XIX** |
| PH4 API regression | `node tests/test_ph4_api.js` | **16/16 passed** |

The parity suite is the direct successor of the retired PH1 suite (`ph1-bh-qlkh/backend/src/**/*.test.ts`, 27 suites / 175 tests at `cf918b8`): the standalone tests were TypeScript + vitest-style units against a private server; the port is CommonJS and boots Core's `app.js`, so the *behaviour* was re-expressed as HTTP/DB assertions instead of copying files (which cannot run under Core's module system).

---

## 2. Coverage by Step 8 area

| Step 8 area | Checks (suite section) | Representative assertions |
|---|---|---|
| **Customers** — create, update, duplicate prevention, validation, credit data, audit fields | 7 | `KH-<year>-<6 digits>` code generation; negative `han_muc_cong_no` → 422 naming the field; `tinh_thanh_pho` / `trang_thai` filters narrow correctly; status change writes `nguoi_cap_nhat`; PATCH strips non-whitelisted fields (`ma_khach_hang`, `nguoi_tao`, `id` intact after a hostile PATCH) |
| **Products** — lookup, unit display, paging/filtering, no mutation of master data | 6 | default catalogue lists only `dang_ban`; `search` narrows; a sentinel `mau_sac` returns nothing (filter is applied, not ignored); `pageSize=500` → 422 naming `pageSize`; rows expose `ten_don_vi`/`ma_don_vi_tinh`; `POST /san-pham` → 404 (module is read-only) |
| **Sales orders** — atomic create, server totals, invalid refs, state machine, draft update, approval, cancellation, credit policy | 11 | `CUSTOMER_INACTIVE` for a `tam_khoa` buyer; `PRODUCT_NOT_SELLABLE` for a `ngung_ban` product (status flipped and restored by the test); server-side discount math; credit overrun without `acknowledgeCreditLimit` → 422 `CUSTOMER_CREDIT_LIMIT_EXCEEDED`, with it → 200 `da_xac_nhan`; cancel without reason → 422 naming `ly_do`, with reason → 200 `huy` and the reason persisted on `ghi_chu` |
| **Deliveries** — order linkage, transitions, PH4 boundary | 6 | `deliveredLines` → 422 `DELIVERY_LINES_UNSUPPORTED` (interim header-only scope, Q11); delivery for a cancelled order → 422 `ORDER_INVALID_STATE`; `complete` while `cho_giao` → 422; completing twice → 409; failure reason appended to `ghi_chu` (`[THẤT BẠI: …]`); **the delivery lifecycle leaves PH4 stock untouched** (runtime boundary proof, §2.2) |
| **Invoices** — source order, server totals, duplicate prevention, status rules | 9 | invoice for `cho_xac_nhan`/`huy` orders → 422 `INVOICE_INVALID_ORDER`; customer mismatch → 422 `INVOICE_CUSTOMER_MISMATCH`; `so_tien_da_thu > tong_thanh_toan` → 422; `HDBH-<year>-<6 digits>`; `ngay_dao_han = ngay_xuat_hoa_don + so_ngay_cong_no`; an overdue unpaid invoice re-derives `qua_han` on read; `dueFromDate`/`dueToDate` window includes/excludes it; source order and customer ids retained |
| **Receivables** — linkage, balance interpretation, permission ownership | 7 | list can never surface `phai_thu`-less rows; `overdueOnly=true` → every row `days_overdue > 0`; aging bands exact at the **1/30/31/60/61/90/91-day** boundaries; bands are exhaustive over `totalReceivables`; overdue bands equal the summary's `totalOverdue`; the dashboard's `openReceivable`/`overdueReceivable` equal the ledger's `totalOutstanding`/`totalOverdue`; ruling R-2 split asserted (see §4) |

Preserved-but-unchanged behaviours (G-2…G-7 in `KNOWN_GAPS.md`) are deliberately *not* re-specified by tests: they are documented as carried over byte-for-byte.

### 2.1 How the aging boundaries are proven

The suite inserts eight `cong_no` probe rows (`phai_thu`, `so_tien_con_lai > 0`) at −5 (future), +1, +30, +31, +60, +61, +90 and +91 days relative to `NOW()`, reads `/cong-no/aging` before and after, and asserts the **per-bucket delta equals the probe amounts** (18 000 / 23 000 / 27 000 / 31 000 / 17 000 across `current`, `days1To30`, `days31To60`, `days61To90`, `daysOver90`). Probes and all `[SMOKE-PARITY]` rows are deleted in `finally`; the suite verified that no marker row survives a run.

### 2.2 PH4 stock boundary (non-destructive runtime proof)

Step 11 requires that PH1 cannot mutate PH4-protected state. Alongside the static write-surface audit (`STEP11_CROSS_MODULE_EVIDENCE.md` §2), the parity suite proves it at runtime *without touching the warehouse*: it snapshots `SUM(ton_kho.so_luong_ton)` and the `chi_tiet_phieu_xuat` row count immediately before and after a full delivery lifecycle (`cho_giao → dang_giao → da_giao`, plus the rejected second completion) and asserts both are unchanged (`the module never mutates PH4 stock …`). No PH4 document is created, no stock row is written — the assertion itself is read-only.

The destructive PH4 movements needed for cross-module verification are exercised by the separate Core-era suite (`tests/test_cross_module_integration.js`), which posts real PH2/PH3/PH4 documents against the **disposable development database**; it is the integration regression suite, not PH1 product code, and its data is a fixture of that database (documented in `PH1_HANDOVER/TEST_REPORT.md` §4).

### 2.3 Dashboard ↔ ledger invariant

`GET /api/v1/sales/tong-quan/summary` computes `openReceivable`/`overdueReceivable` as point-in-time snapshots over the whole ledger (not windowed) precisely so they equal `/cong-no/summary`'s `totalOutstanding`/`totalOverdue`. The suite asserts that equality against live data, and separately asserts `SUM(statusCounts) == orderCount` and that a cancelled order leaves `orderCount` untouched while `totalOrderValue` drops by exactly its `tong_thanh_toan`.

### 2.4 Test hygiene assertion

The suite reports `cleanup finished without errors (no test rows left behind)` from its `finally` block: every delete/restore outcome is captured and surfaced instead of silently swallowed, so a leaked row or an FK refusal fails the run rather than hiding.

---

## 3. Retired PH1 tests → parity suite mapping

| PH1 source (retired) | Ported artefact | Parity checks |
|---|---|---|
| `utils/pricing.test.ts` | `backend/src/utils/sales/pricing.js` | half-up rounding at 0/2 decimals incl. binary-representation compensation; per-line rounding; `Σ lines == tong_tien_hang − tien_giam_gia`; tax on the discounted amount; 100 % discount never negative |
| `utils/response.test.ts` | `backend/src/utils/sales/response.js` | `sendSuccess`/`sendPaginated`/`sendError` shapes; `details` is `null` (never a stack) |
| customer service/routes tests | `backend/src/services/sales/customer.service.js` + repository | §2 rows 1–7 |
| product service/routes tests | `backend/src/services/sales/product.service.js` + repository | §2 rows 8–13 |
| order service/routes tests | `backend/src/services/sales/order.service.js` + repository | §2 rows 14–25 |
| delivery service tests | `backend/src/services/sales/delivery.service.js` + repository | §2 rows 26–30 |
| invoice service tests | `backend/src/services/sales/invoice.service.js` + repository | §2 rows 31–39 |
| receivable service tests | `backend/src/services/sales/receivable.service.js` + repository | §2 rows 40–46 |
| dashboard service tests | `backend/src/services/sales/overview.service.js` + repository | role scopes (`full`/`fulfillment`/`financial`) with exact key sets; non-sales role 403; `period=custom` with `fromDate > toDate` → 422 |

The mapping is by business area: the PH1 units tested services in isolation, whereas the port asserts observable HTTP/DB behaviour through Core's stack (same contract, integration-level evidence).

---

## 4. Ruling R-2 confirmed in Step 8

`TARGET_DESIGN.md` §215 asks Step 8 to confirm R-2's intentional consequence with the Integration Owner. Status from the parity suite:

| Actor | `/cong-no` (list) | `/cong-no/summary` | `/cong-no/aging` |
|---|---|---|---|
| `ban_hang` (`sales.view`) | 200 | 200 | — (needs `accounting.receivable`) |
| `admin` | 200 | 200 | 200 |
| `ke_toan` | **403** | **403** | 200 |

The suite pins `ke_toan 403 / ban_hang 200`, i.e. the ruling is **behaviourally confirmed and now regression-locked**. Accounting keeps the aging report and loses the raw ledger under `sales.view`; this remains an owner-visible consequence, recorded here for the acceptance review (no code change proposed).

---

## 5. Test-side maintenance required by Core's auth hardening

Two Core-era scripts still authenticated with the retired identity headers (`x-role`/`x-user-id`), so they failed against Core's HMAC auth (the audit script died at MUC XIX with `Cannot read properties of undefined (reading 'tongGiaTriTonKho')` — a 401 body, not a data defect):

- `backend/tests/test_cross_module_integration.js`
- `backend/tests/audit_step2_verification.js`

Both helpers now mint a signed Core token (`signToken(userId)` with the acting role's user id) and send `Authorization: Bearer …`; **no scenario, assertion or payload was changed**. Results after the switch: 8/8 scenarios and a complete MUC I–XIX audit run. Neither file is a frozen Core path (BASELINE.md §4.1 lists server/config/middlewares/routes/pages/components) and no product code was touched.

---

## 6. Step 8 exit criteria

- [x] Every preserved PH1 business area (customers, products, orders, deliveries, invoices, receivables, dashboard) has executable, passing checks against the integrated module.
- [x] Server-side authoritative totals, state machines, credit policy, duplicate protection and permission ownership are asserted — not inferred.
- [x] Preserved behaviours are explicitly recorded as preserved (`KNOWN_GAPS.md`), not silently re-tested as if they were defects.
- [x] R-2's consequence is confirmed and regression-locked.
- [x] Runs are idempotent: marker rows are deleted, temporarily flipped product status is restored.
