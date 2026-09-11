# P8 (Receivables) and P9 (Dashboard) verification evidence

Date: 2026-09-11. Branch `ph1-bh-qlkh` (no commits made).
Database: `erp_sales_crm_dev` in container `erp_sales_crm_postgres`, server PostgreSQL 16.15.

This file records what was actually executed and observed. Items that the 2-row seed cannot
demonstrate are marked explicitly rather than implied to pass.

---

## 1. Defects found and fixed during this verification

Three real defects were found by running the module, not by reading it. All three are fixed and
covered by a regression check.

### 1.1 Aging buckets silently dropped money (production bug)

`ReceivableRepository.getAgingReport()` classified buckets with
`EXTRACT(DAY FROM NOW() - ngay_dao_han) BETWEEN 1 AND 30`. `EXTRACT(DAY)` returns the whole-day
component, so a receivable **less than 24 hours past due** had day component `0` and matched **no
bucket**. The aging report therefore under-reported, and `sum(buckets) != total_receivables`.

Impact: any invoice crossing its due date lost its outstanding amount from every aging band until
it was a full day overdue. `totalOverdue` (a separate `ngay_dao_han < NOW()` predicate) still
counted it, so the two figures disagreed.

Fix: band edges are now interval-exact and exhaustive over half-open ranges —
`current` (`ngay_dao_han >= NOW()`), `b1 < 31 days`, `b2 31–60`, `b3 61–90`, `b4 >= 91 days`.
Every row with `so_tien_con_lai > 0` lands in exactly one band, so
`current + b1 + b2 + b3 + b4 == total_receivables` and `b1 + b2 + b3 + b4 == totalOverdue` hold
as invariants.

### 1.2 `PGSSL=false` was parsed as `true` (production bug)

`env.ts` used `z.coerce.boolean()`, which applies JavaScript `Boolean()`. The string `"false"` —
the only way to express false in a `.env` file — is a non-empty string, so it coerced to `true`.
Every database connection then failed with *"The server does not support SSL connections"*, and the
API returned 500 for every authenticated route.

Found by starting the real server and calling the real endpoints; the unit suite never exercised the
dotenv string path.

Fix: `PGSSL` is parsed from its literal text (`z.enum(['true','false','1','0'])`). Unrecognized
values are rejected at startup rather than defaulted, so a typo cannot silently flip a TLS flag.

### 1.3 Production could boot with the public development JWT secret (security)

`JWT_SECRET` defaulted to `default_dev_jwt_secret_min_32_chars_long_for_security`, a value
committed to this repository. `NODE_ENV` was parsed but never constrained the secret, so a
production deployment that omitted `JWT_SECRET` would sign and verify tokens with a publicly known
key — anyone able to read the source could forge a token for any role, including `admin`.

Fix: a `superRefine` guard rejects the built-in default and any secret shorter than 32 characters
when `NODE_ENV=production`. Development and test are unaffected.

Note: the dev `backend/.env` on this host already set a 43-character secret, which is why the local
server worked. The defect was in the *fallback*, which only bites a deployment that forgets to set
one — exactly the deployment least likely to notice.

---

## 2. P8.4 acceptance cases → evidence

Harness: `backend/scripts/verify-receivable-reconciliation.ts`, which runs two read-only SQL layers
and re-derives every figure independently.
Raw output: `docs/verification/p8-reconciliation-output.txt`.

Final result: **`SUMMARY checks=109 PASS=109 FAIL=0` / `HARNESS RESULT: PASS`**.

| P8.4 requirement | Status | Evidence |
|---|---|---|
| `phai_thu` returned, `phai_tra` excluded | PASS | `sql.sales_projection_contains_only_phai_thu=0`, `sql.phai_tra_and_phai_thu_id_sets_disjoint=0`, `sql.payable_outstanding_amount_equals_full_table_minus_summary=0.00`, `ts.phai_tra_rows_in_receivable_population=0`. The payable exclusion is non-vacuous: the amount the summary omits equals the payable population's amount exactly (105,300,000.00). |
| Open / partial / paid cases | PARTIAL | Computable and reconciled (`sql.ledger_identity_phat_sinh_minus_paid_equals_outstanding=375200000.00`), but the seed contains **one** receivable row (open, 375,200,000.00 outstanding). A *partial* and a fully *paid* receivable row are not present, so those two states are covered by unit tests against mock repositories, not by seed data. Stated as partial rather than claimed green. |
| Overdue case | PARTIAL | Same reason: the seed has no past-due `phai_thu` row (`total_overdue=0.00`), so the overdue path is proven by the boundary probes and by the persisted-row script (§3), not by seed data. |
| Aging boundaries 0/1/30/31/60/61/90/91 | PASS | `ts.boundary_*` (11 cases) and `sql.boundary_*` (11 cases) all PASS, plus 12 checks in §3 over **persisted rows**. |
| Customer filter | PASS | `sql.list_total_customer_filter_equals_summary_population_for_customer=1`, `sql.list_total_customer_without_receivables_is_zero=0`. |
| Pagination | PASS | `sql.list_page1_page_size_1_returns_1_row=1`, `sql.list_page2_page_size_1_is_empty_single_page_dataset=0`, `sql.list_total_pages_formula_ceil_total_over_page_size=1`. |
| Summary reconciles with the list | PASS | `sql.list_total_equals_summary_row_population=1`, `ts.list_total_equals_receivable_row_count=1`, plus the bucket-sum identities. |
| Read permissions per role | PASS | `backend/src/routes/receivable.routes.test.ts` (role matrix); `kho` is denied the aging endpoint. |

## 3. Aging boundary proof over persisted rows

`backend/scripts/verify-receivable-aging-persisted-rows.sql` — 16 checks, all PASS.

Layer 1 of the main harness classifies literal offset expressions and never touches a stored row,
so it cannot show that a real `cong_no` row is reported in the right bucket. This script inserts
actual rows at each boundary and asks the production predicate chain where each landed.

Coverage: `due_in_1_day`, `due_now_exactly`, `past_due_1_second`, `past_due_12_hours`,
`past_due_1_day`, `past_due_30_days`, `past_due_30d23h`, `past_due_31_days`, `past_due_60_days`,
`past_due_61_days`, `past_due_90_days`, `past_due_91_days` — every one in its expected bucket, and
`persisted_bucket_counts_are_exhaustive=12|12` proving nothing fell through.

Two controls, both PASS:
- `persisted_paid_row_is_unbucketed` — a fully paid row 45 days overdue is in **no** bucket.
- `persisted_payable_would_be_bucketed_if_unfiltered` — a `phai_tra` row 45 days overdue **would**
  land in `b2_31_60` if the `loai_cong_no` filter were dropped, which is what makes the exclusion a
  real filter rather than a coincidence.

**This script is not strictly read-only** and its header says so: it INSERTs inside a transaction
ending in `ROLLBACK`, so no row survives (`cong_no` had 2 rows before and after) and `cong_no` has no
triggers or rules, but the `cong_no_id_seq` advance is non-transactional — measured at +14 per run.
Safe for development; must not be run against production. This is asserted by
`persisted.script_rollback_scoped` and `persisted.script_inserts_only_the_table_under_test`.

## 4. P8 exit criteria

| Criterion | Status | Evidence |
|---|---|---|
| Receivables visible from list and detail page | PASS | `ReceivableListPage` renders 4 KPIs and an aging table; `CustomerDetailPage` `Sổ công nợ` tab loads real data. Both typecheck and build. |
| Outstanding and overdue totals independently reconcilable with SQL | PASS | `HARNESS RESULT: PASS` — 109 checks, every figure re-derived twice (SQL + TypeScript) from raw rows. |
| No payment write path without ownership approval | PASS | The module is read-only: no POST/PUT/PATCH/DELETE route exists in `receivable.routes.ts`; the UI states payment recording belongs to Accounting. |
| Large datasets remain server-side | PASS (by construction) | Aggregation is performed in PostgreSQL (`SUM`/`COUNT`/`GROUP BY`); the API returns aggregates and one paginated page, never the full row set. Not load-tested — see §6. |

---

## 5. P9 evidence

### 5.1 Reconciliation rules (metric dictionary §5)

| Rule | Result |
|---|---|
| `openReceivable` == P8 `/receivables/summary.totalOutstanding` (unwindowed) | PASS — both `375200000.00`; asserted live and in the harness (`p9_open_receivable_equals_summary_total_outstanding`). |
| `overdueReceivable` == P8 `.totalOverdue` | PASS — both `0.00` (`p9_overdue_receivable_equals_summary_total_overdue`). |
| `SUM(statusCounts) == orderCount` | PASS — `1+0+1+0+0 = 2 = orderCount`. Now **structural**, not coincidental: both are derived from a single grouped statement (§5.3). |
| `totalOrderValue` excludes `huy` | PASS — `697800000.00`, which equals the two non-cancelled orders (`476000000 + 221800000`). The seed has no cancelled order, so the exclusion is enforced in SQL and asserted in `dashboard.service.test.ts` with a cancelled fixture. |
| Revenue label matches its source | PASS — response carries `source: "hoa_don_ban_hang.tong_tien_sau_thue"` and `label: "Doanh thu theo hóa đơn"`, both rendered in the UI so the two money definitions cannot be confused. |
| Date filters timezone-correct | PASS — service resolves boundaries in `Asia/Ho_Chi_Minh` (fixed UTC+7) and passes half-open instants to the repository. Custom range 2020-01-01..2020-01-31 returned 0 orders, proving the filter is applied server-side. |

### 5.2 Live RBAC matrix (real HTTP, real database)

| Endpoint | admin | kho | ke_toan |
|---|---|---|---|
| `/dashboard/summary` | 200 `scope:"full"` (all metrics) | 200 `scope:"fulfillment"` (**money keys absent**) | 200 `scope:"financial"` (no order metrics) |
| `/dashboard/revenue-chart` | 200 | **403 `AUTH_FORBIDDEN`** | 200 |
| `/dashboard/order-status` | 200 | 200 | 200 |
| `/dashboard/top-customers` | 200 | **403 `AUTH_FORBIDDEN`** | 200 |
| `/dashboard/top-products` | 200 | **403 `AUTH_FORBIDDEN`** | 200 |

A `kho` summary returns exactly
`{"scope":"fulfillment","metrics":{"orderCount":2,"statusCounts":{...}}}` — the money keys are
**absent from the payload**, not blanked in the UI. Scoping is enforced server-side.

### 5.3 Order count / status snapshot consistency

`orderCount` and `statusCounts` were originally produced by two separate `Promise.all` queries, each
taking its own read-committed snapshot on its own pooled connection. Under a concurrent order write
the documented invariant `SUM(statusCounts) == orderCount` could therefore fail between snapshots.

Fixed by deriving both — plus `totalOrderValue`, via a window function — from one grouped statement,
so the invariant holds within a single snapshot by construction.

### 5.4 UI verification (real browser, real API)

Verified in a headless Chromium against the live backend, not by reading code.

- **`admin`** — KPI cards (`Tổng số đơn 2`, `Giá trị đơn hàng 697.800.000 ₫`,
  `Công nợ phải thu 375.200.000 ₫`, `Hóa đơn chưa thu đủ 1`), revenue chart with source label,
  order-status bars, and both top-5 tables, all populated with real seed data.
  Screenshot: `docs/verification/p9-admin-dashboard.png`.
- **`kho`** — renders only `Chỉ số chính` (order count) and `Tình trạng đơn hàng`. Table count 0.
  **No `₫` glyph anywhere on the page**, and the three money endpoints are never requested
  (the client gates on role; the server would 403 anyway).
  Screenshot: `docs/verification/p9-kho-dashboard.png`.
- **Custom date range** — selecting `Tùy chọn` with 2020-01-01..2020-01-31 zeroed the order metrics
  and showed per-widget empty states (`Chưa có dữ liệu`) for revenue, top customers and top
  products. Receivables correctly stayed at `375.200.000 ₫`, which is the documented unwindowed
  snapshot behaviour.
- **Independent widget states** — each panel owns its own request/loading/error state, so the empty
  range above produced per-widget empty states rather than blanking the page.

### 5.5 P9 exit criteria

| Criterion | Status | Evidence |
|---|---|---|
| Dashboard reflects new transactions after invalidation | PASS | Above: changing the window re-queried and re-rendered every widget from live data. |
| Metric definitions documented | PASS | `docs/architecture/dashboard-metrics.md` (frozen contract; §1 clarified this session for the `orderCount`/`totalOrderValue` split). |
| API meets practical target or has bottleneck evidence | SEE §6 | Aggregation is server-side with a 500 ms slow-query logger. Not benchmarked on representative volume, and `don_ban_hang` currently has only its primary key — no benchmark evidence exists yet. |
| No production chart uses mock data | PASS | Every widget renders values returned by the live API (§5.2, §5.4). |

---

## 6. Known gaps (not verified, not claimed)

1. **No load/performance evidence.** The seed is 2 orders, 2 order lines, 1 receivable. Query plans
   and index coverage on representative volume are P10 work and remain open.
2. **Partial / paid / overdue receivable states are not in the seed.** Covered by unit tests against
   mock repositories; not by end-to-end data.
3. **`frontend/src/main.tsx` imports `./index.css`, which does not exist.** The app therefore renders
   unstyled in a browser. Cosmetic, pre-existing, outside P8/P9 scope — recorded so it is not
   mistaken for a P9 defect.
4. **Dashboard `orderCount` includes cancelled orders** by design (population metric) while
   `totalOrderValue` excludes them (sales metric). This is deliberate and documented; the UI states
   `bao gồm đơn đã hủy` so the distinction is visible to users.
