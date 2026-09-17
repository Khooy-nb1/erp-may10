# PH1 Remediation — Step 11 Cross-Module Integration Evidence

**Document ID:** `DOC-PH1-REM-012`
**Date:** 2026-09-17
**Branch:** `integration/ph1-sales-core`
**Purpose:** evidence for PLAN.md Step 11 — PH1 behaviour validated against PH4 (Kho & Quản lý vật tư) without violating ownership boundaries.

---

## 1. Cross-module scenarios (live stack, dev database)

`node tests/test_cross_module_integration.js` → **8/8 scenarios passed (100 %)**

| # | Scenario | Assertion |
|---|---|---|
| 1 | PH3 (mua hàng) → PH4 nhập kho | Receipt posted against `DMH-2026-001`; stock increases by the receipt quantity |
| 2 | PH2 (lệnh sản xuất) → PH4 xuất NVL | Material issue for `LSX-2026-001`; stock decreases correctly |
| 3 | PH2 → PH4 nhập thành phẩm | Finished-goods receipt for `LSX-2026-001` |
| 4 | PH1 (đơn bán hàng) → PH4 xuất kho giao hàng | Issue for delivery of `DBH-2026-001`; stock decreases |
| 5 | Insufficient stock | Issue beyond availability → **HTTP 409** with the expected conflict result |
| 6 | Transaction rollback | One bad line rolls the whole issue back — no partial stock movement |
| 7 | Concurrency (`FOR UPDATE` row lock) | Two concurrent issues cannot drive stock negative or duplicate movements |
| 8 | 5-module JOIN integrity | PH1 + PH2 + PH3 + PH4 + PH5 data joins without orphans |

Companion regression: `node tests/test_ph4_api.js` → **16/16 passed**; `node tests/audit_step2_verification.js` → complete MUC I–XIX run (stock ledger, FEFO/FIFO ordering, 4-KPI dashboard).

### 1.1 Test-side maintenance (Core auth hardening)

Both scripts above still used the retired identity headers (`x-role`/`x-user-id`) and were therefore failing with 401 (the audit script died at MUC XIX reading a non-existent `data` field). Their `apiRequest` helpers now mint a signed Core token with `signToken(userId)` for the acting role and send `Authorization: Bearer …`; **scenarios, payloads and assertions are unchanged**. Neither file is a frozen Core path (BASELINE.md §4.1); no product code was modified. Before/after: cross-module 0/8 (auth-blocked) → **8/8**; audit script crash → **complete run**.

---

## 2. Ownership boundaries

| Boundary | Evidence |
|---|---|
| PH1 cannot mutate PH4-protected tables through its repository layer | Module write surface is exactly `khach_hang`, `don_ban_hang`, `chi_tiet_don_ban_hang`, `giao_hang`, `hoa_don_ban_hang` (grep over `src/repositories/sales/*.js`); PH4 tables (`kho`, `san_pham`, …) appear read-only in joins. Runtime proof (read-only): a full delivery lifecycle leaves `SUM(ton_kho.so_luong_ton)` and the `chi_tiet_phieu_xuat` row count unchanged (`test_ph1_business_parity.js`, §2.2 of `STEP8_BUSINESS_PARITY_EVIDENCE.md`) |
| Stock availability is read through the sanctioned interface | Catalogue reads `san_pham` (read-only); warehouse state is PH4's (`GET /api/v1/ton-kho` untouched and green in the smoke suite) |
| Delivery flow carries the correct sales-order reference | `test_ph1_sales_api.js` → delivery created with `ma_don_ban_hang` = order id, listed by `?ma_don_ban_hang=`; parity asserts delivery-order linkage and the `cho_giao → dang_giao → da_giao/that_bai` machine |
| Insufficient stock returns the expected conflict | Scenario 5 above (409) |
| Concurrent stock operations cannot create negative inventory | Scenario 7 above (row lock) |
| PH4 regression suite remains green | `test_ph4_api.js` 16/16; PH4 source untouched (`git status` shows no PH4 path modified) |
| No PH4 source changes authorized or made | BASELINE.md §4.2 frozen list; `git status --porcelain` limited to the approved seams (`backend/src/app.js`, `frontend/src/routes/AppRoutes.jsx`, `frontend/src/config/menu.js`), the new module tree, tests and docs |

## 3. Step 11 exit criteria

- [x] PH1 ↔ PH4 integration tests pass and PH4 source remains unchanged.
- [x] No outstanding Integration Request: the existing PH4 contract provides everything PH1 needs (receipts/issues via PH4 endpoints; sales module never writes warehouse tables).
