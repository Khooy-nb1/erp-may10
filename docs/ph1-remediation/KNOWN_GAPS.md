# PH1 Remediation — Known Gaps & Defects

**Document ID:** `DOC-PH1-REM-008`  
**Date:** 2026-09-16  
**Purpose:** every gap or defect found while porting PH1, with its disposition. Items marked **FIXED** were
changed during remediation (with evidence); items marked **PRESERVED** were deliberately carried over
byte-for-byte or behaviour-for-behaviour; items marked **OWNER** need a business decision.

---

## G-1 — Delivery lifecycle transitions returned HTTP 500 (FIXED)

- **Where:** PH1 `backend/src/repositories/delivery.repository.ts` (the `transitionStatus` lock query); port
  `backend/src/repositories/sales/delivery.repository.js`.
- **Symptom:** `POST /api/v1/sales/giao-hang/:id/start` (and `complete`/`fail`) returned
  `500 INTERNAL_SERVER_ERROR` — `FOR UPDATE cannot be applied to the nullable side of an outer join`
  (PostgreSQL 16). The row lock sat on a `SELECT` with four `LEFT JOIN`s.
- **Fix:** `FOR UPDATE OF g` (lock the delivery row itself; the joins are read-only). Verified by the
  regression suite (`kho starts delivery -> 200 dang_giao`, `kho completes delivery -> 200 da_giao`,
  `fail with reason -> 200 that_bai`).
- **Behaviour change:** endpoints that never worked now work. No PH1 consumer relied on the 500.

## G-2 — Invoice issuance never posts to the receivable ledger (PRESERVED / OWNER)

- **Where:** PH1 `repositories/invoice.repository.ts::createInvoiceAtomic` steps 1-8; port
  `repositories/sales/invoice.repository.js::createInvoiceAtomic`.
- **Observation:** issuing an invoice inserts `hoa_don_ban_hang` only. No application code path in PH1
  inserts or updates `cong_no` — the receivable ledger is fed exclusively by
  `backend/database/seed_updated.sql` (and a verification script). Consequently the AR ageing report and the
  customer summary reflect seed data, not issued invoices.
- **Disposition:** preserved (the port does not invent ledger writes). Posting to AR is a financial booking
  that belongs to the Finance module / the Core owner — see `INTEGRATION_REQUESTS.md` §4. The regression suite
  documents the current behaviour with an explicit `note -` line.

## G-3 — `overdueOnly` query flag ignored `"false"` (FIXED)

- **Where:** `z.coerce.boolean()` in PH1's receivable query schema; `v.coerce.boolean()` in the port.
- **Observation:** `Boolean('false') === true`, so `?overdueOnly=false` still filtered to overdue rows; only omitting
  the parameter disabled the filter. Non-boolean text (`?overdueOnly=maybe`) was silently `true` as well.
- **Fix:** the validator's boolean coercion reads the value explicitly (`true`/`false`, `1`/`0`; trimmed,
  case-insensitive) and answers `422` otherwise (`utils/sales/validate.js::coerceBoolean`).
- **Evidence:** `tests/test_ph1_validation.js` — `overdueOnly=false stays false`, `overdueOnly=true stays true`,
  `non-boolean overdueOnly rejected`. The ported screens only ever sent the flag when truthy
  (`frontend/src/sales/pages/ReceivableListPage.jsx` → `overdueOnly || undefined`), so no client change was needed.

## G-4 — Dashboard "money" metrics are role-masked in the service, not in SQL (PRESERVED)

- **Where:** `services/sales/overview.service.js` (`ROLE_SCOPES`, `selectSummaryMetrics`, `assertMoneyScope`).
- **Observation:** the aggregates are computed for everyone and only serialized per scope. `kho` can reach the
  aggregate values only if a future endpoint forgets the scope call, which is why the route layer repeats the
  role restriction and the service re-asserts it.
- **Disposition:** preserved; both layers are required to change together.

## G-5 — Stock is not reserved or consumed by orders/deliveries (PRESERVED)

- **Where:** order create/confirm and delivery `start`/`complete` touch only the sales tables.
- **Observation:** PH1 never writes `ton_kho`/`phieu_xuat_kho`; warehouse stock movements remain PH4's
  responsibility. Confirming an order or completing a delivery therefore does not change stock.
- **Disposition:** preserved — cross-module stock integration was explicitly out of the remediation's approved
  integration boundaries (`INTEGRATION_BOUNDARIES.md`).

## G-6 — `nhật ký`/audit trail is limited to actor columns (PRESERVED)

- **Where:** all repositories.
- **Observation:** every write records `nguoi_tao`/`nguoi_cap_nhat`, but there is no history table or event
  log for status transitions (`da_xac_nhan`, `huy`, `dang_giao`, ...). PH1 had no audit sink.
- **Disposition:** preserved; if the Core standard requires document history, it can be added additively later.

## G-7 — Only `admin`/`ban_hang` reach the Sales UI; `kho` and `ke_toan` scopes are unreachable (OWNER)

- **Where:** Core `backend/src/config/roleMapping.js` — `sales.view` is granted by `ADMIN_PERMISSIONS` and
  `SALES_PERMISSIONS` only; `KHO_PERMISSIONS`, `ACCOUNTING_PERMISSIONS`, `PRODUCTION_PERMISSIONS` and
  `PURCHASING_PERMISSIONS` do not have it. The module gate is `<PermissionGuard permission="sales.view">`
  (`frontend/src/routes/AppRoutes.jsx` → `frontend/src/sales/SalesRoutes.jsx`).
- **Observation (verified 2026-09-16):** the backend deliberately serves roles the UI gate locks out:
  `GET /api/v1/sales/tong-quan/summary` returns a **fulfillment scope for `kho`** and a **finance scope for
  `ke_toan`** (`tests/test_ph1_sales_api.js`: `kho summary -> 200 scope fulfillment`, `fulfillment scope hides
  money metrics`, `accounting scope returns finance metrics only`; `INTEGRATION_BOUNDARIES.md` rows 48–52 label
  the summary `sales.view (kho fulfillment-scoped)`), and `/dong-hang` GET additionally allows `kho`/`ke_toan`
  while `/giao-hang` allows `kho`. In the browser, a `kho` account on `/sales` and `/sales/deliveries` gets
  Core's `/403` with **zero API calls**; the same holds for `ke_toan`. PH1's original scope let `kho` read the
  status dashboard and the delivery workflow, and let `ke_toan` read the finance view.
- **Consequence:** the module's client-side role scopes are exercised only for `admin`/`ban_hang`: the `ke_toan`
  finance view (money metrics + receivables note) and the `kho` fulfillment view (status counts, money hidden,
  "quản trị viên và kế toán" note) cannot be reached, because those accounts never get past the module gate.
  Server-side scope masking is unaffected and remains enforced (and tested) regardless of what the UI shows.
- **Disposition:** **owner decision.** Options: (a) add `sales.view` to `KHO_PERMISSIONS`/`ACCOUNTING_PERMISSIONS`
  (whole-module read pages become reachable; money endpoints still 403 for `kho` and surface as error banners), or
  (b) introduce narrower permissions (e.g. `sales.dashboard`, `sales.delivery`, `sales.finance`) and point the
  route guards and menu entries at them. Recommended: (b) — it restores PH1's per-role reach without handing
  warehouse accounts the customer/invoice/receivable pages. The module guard stays `sales.view` until the ruling
  lands (ruling R-1).

## G-8 — Invoice list filters `trang_thai` on the stored column, not the derived status (PRESERVED / OWNER)

- **Where:** `repositories/sales/invoice.repository.js` — the list SQL filters `h.trang_thai = $n`, while every row
  is re-stamped on read by `normalizeInvoiceRecord` (`da_thanh_toan` when fully paid, otherwise `qua_han` once
  `ngay_dao_han` has passed, otherwise `thanh_toan_mot_phan`/`chua_thanh_toan`).
- **Observation:** the status written at issuance is a snapshot. An invoice issued as `chua_thanh_toan` that later
  passes its due date is *serialized* as `qua_han` but is not matched by `?trang_thai=qua_han`, so a status filter
  can return rows whose displayed status differs from the filter and omit rows that display it.
- **Disposition:** preserved from PH1 (same split between stored column and read-time derivation; the ageing
  behaviour itself is intended). Fixing it means filtering on the expression the serializer uses — or persisting
  status transitions on a schedule — which changes a shipped filter, so it stays with the module owner. The
  regression suites exercise the filter against freshly issued invoices only.

## G-9 — Unknown keys are stripped and a forbidden `sortBy` falls back (PRESERVED)

- **Where:** every module schema (`v.object({...})` without `.strict()`) and every list repository
  (`ALLOWED_*_SORT_COLUMNS.includes(filters.sortBy)` before an `ORDER BY`).
- **Observation:** a request carrying an unsupported field or an unsupported sort column is answered `200` with the
  field dropped and the default ordering kept — PH1/zod behaviour (`z.object()` strips unknown keys). The
  projection is what protects mass assignment (`ma_khach_hang`, `nguoi_tao`, `id` cannot be patched) and the
  repository allow-list is what protects the `ORDER BY` clause.
- **Disposition:** preserved deliberately. Rejecting unknown keys with `422` was implemented and then reverted:
  `tests/test_ph1_business_parity.js` pins the `200` behaviour for both the PATCH whitelist and the `sortBy`
  injection probe, and stripping already satisfies the security requirement. Schema-level enums *were* kept where
  PH1 had them (`trang_thai`, and the dashboard's `loai_khach_hang`) — those answer `422` on an unknown value.
