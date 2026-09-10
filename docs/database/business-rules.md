# Database Invariants & Business Rules — ERP Sales & Customer Management

**Document Status:** Technical Baseline (P0 Contract)  
**Verification State:** Static SQL schema analysis verified; live PostgreSQL runtime comparison and seed linkage execution are **BLOCKED** pending access to a reachable development database instance.  
**Scope:** Core database invariants, transactional boundaries, query restrictions, audit rules, and calculation policies across all in-scope tables.

---

## 1. Executive Summary & Verification Context

The database schema (`backend/database/schema.sql`) represents a shared enterprise PostgreSQL database supporting multiple modules (Sales, Production, Warehouse, Purchasing, Accounting).

- **Static Evidence:** Scoped table structures, foreign keys, unique constraints, and check constraints have been verified statically against `backend/database/schema.sql` and `backend/database/seed_updated.sql`.
- **Live Verification Status:** **BLOCKED**. Execution of `SELECT` checks against a live PostgreSQL development database and query-based seed linkage validation have not been performed due to lack of a reachable development database instance.
- **Architectural Principle:** The Sales & CRM module must strictly adhere to the database constraints without altering existing schema definitions or adding unapproved migration scripts.

---

## 2. In-Scope Scoped Tables

| Table | Entity Responsibility | Primary Key | Key Foreign Keys | Status Column & Values |
|---|---|---|---|---|
| `nguoi_dung` | User identity & audit references | `id BIGSERIAL` | None | `trang_thai`: `'hoat_dong'`, `'khoa'`, `'nghi_viec'` |
| `khach_hang` | Customer master data | `id BIGSERIAL` | `nguoi_tao`, `nguoi_cap_nhat` $\rightarrow$ `nguoi_dung(id)` | `trang_thai`: `'hoat_dong'`, `'tam_khoa'`, `'ngung_giao_dich'` |
| `san_pham` | Product catalog (read-only in Sales) | `id BIGSERIAL` | `ma_don_vi_tinh` $\rightarrow$ `don_vi_tinh(id)` | `trang_thai`: `'dang_ban'`, `'ngung_ban'`, `'mau_moi'` |
| `don_vi_tinh` | Measurement units | `id BIGSERIAL` | `nguoi_tao` $\rightarrow$ `nguoi_dung(id)` | `trang_thai`: `'hoat_dong'`, `'khong_su_dung'` |
| `don_ban_hang` | Sales order header | `id BIGSERIAL` | `ma_khach_hang` $\rightarrow$ `khach_hang(id)`, `nguoi_ban` $\rightarrow$ `nguoi_dung(id)` | `trang_thai`: `'cho_xac_nhan'`, `'da_xac_nhan'`, `'dang_san_xuat'`, `'da_giao'`, `'huy'` |
| `chi_tiet_don_ban_hang` | Sales order line items | `id BIGSERIAL` | `ma_don_ban_hang` $\rightarrow$ `don_ban_hang(id)`, `ma_san_pham` $\rightarrow$ `san_pham(id)` | `trang_thai`: `'chua_giao'`, `'giao_mot_phan'`, `'da_giao_du'` |
| `giao_hang` | Delivery header | `id BIGSERIAL` | `ma_don_ban_hang` $\rightarrow$ `don_ban_hang(id)`, `ma_kho` $\rightarrow$ `kho(id)` | `trang_thai`: `'cho_giao'`, `'dang_giao'`, `'da_giao'`, `'that_bai'` |
| `kho` | Warehouse reference | `id BIGSERIAL` | `nguoi_quan_ly` $\rightarrow$ `nguoi_dung(id)` | `trang_thai`: `'hoat_dong'`, `'dong_cua'`, `'sua_chua'` |
| `hoa_don_ban_hang` | Sales invoice header | `id BIGSERIAL` | `ma_don_ban_hang` $\rightarrow$ `don_ban_hang(id)`, `ma_khach_hang` $\rightarrow$ `khach_hang(id)` | `trang_thai`: `'chua_thanh_toan'`, `'thanh_toan_mot_phan'`, `'da_thanh_toan'`, `'qua_han'` |
| `cong_no` | Accounts receivable / payable | `id BIGSERIAL` | `ma_khach_hang` $\rightarrow$ `khach_hang(id)`, `ma_nha_cung_cap` $\rightarrow$ `nha_cung_cap(id)` | `trang_thai`: `'chua_thanh_toan'`, `'mot_phan'`, `'da_thanh_toan'`, `'qua_han'` |

---

## 3. Query Boundaries & Cross-Module Invariants

### 3.1 Strict Accounts Receivable Boundary (`cong_no`)

The `cong_no` table is a shared financial ledger table supporting both customer receivables (`phai_thu`) and supplier payables (`phai_tra`):

```sql
CONSTRAINT chk_cong_no_doi_tuong CHECK (
    (loai_cong_no = 'phai_thu' AND ma_khach_hang IS NOT NULL) OR
    (loai_cong_no = 'phai_tra' AND ma_nha_cung_cap IS NOT NULL)
)
```

**Mandatory Query Invariants for Sales & Customer Management:**
1. **Strict Type Filtering:** Every single SQL query originating from the Sales/CRM backend against `cong_no` (including list, customer summary, credit limit exposure calculation, and aging reports) **must explicitly filter:**
   ```sql
   WHERE cong_no.loai_cong_no = 'phai_thu'
   ```
2. **Data Leakage Prohibition:** Payables records (`loai_cong_no = 'phai_tra'`) belong exclusively to the Procurement and Accounts Payable modules. They must **never** be selected, counted, aggregated, or exposed via Sales endpoints.
3. **Foreign Key Integrity:** Any insert into `cong_no` for sales receivables must supply `ma_khach_hang` and leave `ma_nha_cung_cap = NULL`.

### 3.2 Audit Field Integrity

Audit columns vary by scoped table in the supplied schema; they must be checked per table rather than assumed universally:

| Table | Audit columns statically present |
|---|---|
| `khach_hang`, `don_ban_hang`, `giao_hang`, `hoa_don_ban_hang`, `cong_no` | `ngay_tao`, `ngay_cap_nhat`, `nguoi_tao`, `nguoi_cap_nhat` |
| `chi_tiet_don_ban_hang` | `ngay_tao`, `nguoi_tao`; no update-audit columns are defined |
| `don_vi_tinh` | `ngay_tao`, `nguoi_tao`; no update-audit columns are defined |
| `san_pham`, `kho` | `ngay_tao`, `ngay_cap_nhat`, `nguoi_tao`, `nguoi_cap_nhat` |
| `nguoi_dung` | `ngay_tao`, `ngay_cap_nhat`, `nguoi_tao`, `nguoi_cap_nhat`; self-reference FKs are added later |

Where an audit column exists, client requests must **never** supply it. The backend must derive available audit user fields from the authenticated identity and set available update timestamps explicitly. Do not invent missing columns or claim a full update trail for tables that lack one.

**Enforcement Invariants:**
1. **No Client Trust:** Client requests must never specify `nguoi_tao`, `nguoi_cap_nhat`, `ngay_tao`, or `ngay_cap_nhat`. Any such fields provided in request payloads must be strictly stripped during schema validation.
2. **Identity Derivation:** The backend service must extract the current authenticated user's ID directly from the validated session/JWT token (`req.user.id`). On insert, populate the available `nguoi_tao` field; on update, populate available `nguoi_cap_nhat` and `ngay_cap_nhat` fields.
3. **Explicit Application Updates:** Where `ngay_cap_nhat` exists and no database trigger is defined, update queries must explicitly include `nguoi_cap_nhat = $userId, ngay_cap_nhat = NOW()`.

---

## 4. Transactional Integrity & Creation Invariants

### 4.1 Sales Order Creation Atomicity

Creating a sales order involves inserting into `don_ban_hang` and multiple rows into `chi_tiet_don_ban_hang`.

**Atomic Transaction Boundary:**
1. Order creation must execute within a single PostgreSQL database transaction (`BEGIN ... COMMIT`).
2. If any line fails validation, references an inactive product, or encounters a database error, the transaction must execute `ROLLBACK`.
3. **Invariant:** An orphaned order header in `don_ban_hang` with zero line items in `chi_tiet_don_ban_hang` must **never** exist in the database.
4. Concurrency protection: Creating an order must check customer transaction status under row read or snapshot isolation.

### 4.2 Soft Deletion Policy

1. **No Physical Deletions:** In accordance with ERP audit standards, the application must **never execute SQL `DELETE`** on `khach_hang`, `don_ban_hang`, `giao_hang`, `hoa_don_ban_hang`, or `cong_no`.
2. Although `chi_tiet_don_ban_hang` has an `ON DELETE CASCADE` constraint in the schema, orders are preserved indefinitely.
3. Logical state transitions (e.g., setting `don_ban_hang.trang_thai = 'huy'`, `khach_hang.trang_thai = 'ngung_giao_dich'`) must be used for cancellation or deactivation.

---

## 5. Pricing, Calculations & Monetary Invariants

### 5.1 Authoritative Pricing

1. **Product Unit Price:** In the baseline MVP, line item unit prices are populated authoritatively from `san_pham.gia_ban`.
2. **No Client Price Tampering:** The client cannot submit arbitrary unit prices. (Sales price override is an open policy item marked provisional).

### 5.2 Calculation formulas conditional on approved tax policy

The following line and order formulas apply to server-side pricing. The tax component remains disabled or policy-driven until Q1 approves a rate and calculation mode; no rate is selected by this P0 baseline.

1. **Line Gross Amount:**
   $$\text{grossLine} = \text{so\_luong} \times \text{don\_gia}$$
2. **Line Discount Amount:**
   $$\text{discountLine} = \text{ROUND\_HALF\_UP}\left(\text{grossLine} \times \frac{\text{ty\_le\_giam\_gia}}{100}, 2\right)$$
3. **Line Net Amount (`thanh_tien`):**
   $$\text{thanh\_tien} = \text{grossLine} - \text{discountLine}$$
4. **Order Header Totals:**
   $$\text{tong\_tien\_hang} = \sum \text{grossLine}$$
   $$\text{tien\_giam\_gia} = \sum \text{discountLine}$$
   $$\text{tien\_thue} = \text{taxPolicy}(\text{tong\_tien\_hang} - \text{tien\_giam\_gia})$$
   $$\text{tong\_thanh\_toan} = \text{tong\_tien\_hang} - \text{tien\_giam\_gia} + \text{tien\_thue}$$
5. **Database Check Constraints:**
   - `don_ban_hang.tong_tien_hang >= 0`
   - `don_ban_hang.tien_thue >= 0`
   - `don_ban_hang.tien_giam_gia >= 0`
   - `don_ban_hang.tong_thanh_toan >= 0`
   - `chi_tiet_don_ban_hang.so_luong > 0`
   - `chi_tiet_don_ban_hang.don_gia >= 0`
   - `chi_tiet_don_ban_hang.ty_le_giam_gia >= 0 AND ty_le_giam_gia <= 100`
   - `chi_tiet_don_ban_hang.thanh_tien >= 0`

---

## 6. Delivery & Warehouse Boundaries

### 6.1 Schema Limitation & Mitigation

1. **Schema Fact:** The database provides a delivery header table `giao_hang` (`id`, `ma_giao_hang`, `ma_don_ban_hang`, `ma_kho`, `ngay_giao`, `trang_thai`), but **does not contain a delivery line table** (`chi_tiet_giao_hang`).
2. **Interim P0 rule — header workflow only:** Until Q11 (whole-order versus cumulative line quantities) is approved, MVP delivery operations are limited to the `giao_hang` header lifecycle. Do not mutate `chi_tiet_don_ban_hang.so_luong_giao` and do not automatically transition an order to `da_giao` from delivery completion.
3. **Conditional future strategy:** If Q11 approves cumulative quantities, then and only then may the service enforce:
   - `so_luong_giao NUMERIC(18,3) DEFAULT 0 CHECK (so_luong_giao >= 0)`;
   - `chua_giao` for zero, `giao_mot_phan` for a positive partial quantity, and `da_giao_du` for equality;
   - `so_luong_giao <= so_luong`, rejecting overflow with `DELIVERY_QUANTITY_EXCEEDED`;
   - order `da_giao` and `ngay_giao_thuc_te = NOW()` only when every line is `da_giao_du`.
4. No per-delivery line history may be fabricated under either strategy.

### 6.2 Warehouse Inventory Isolation Invariant

- **Rule:** **Completing a delivery (`POST /api/v1/deliveries/:id/complete`) must NOT deduct warehouse inventory stock in MVP.**
- Stock movements belong strictly to the Warehouse module (`phieu_xuat_kho`, `ton_kho`). Sales only manages commercial fulfillment tracking.

---

## 7. Invoicing & Receivables Invariants

### 7.1 Invoice Validation Rules — policy-dependent

1. The database relationship requires an invoice customer to match the order customer: `hoa_don_ban_hang.ma_khach_hang = don_ban_hang.ma_khach_hang`.
2. The permitted order states for invoice creation, invoice timing, and one-to-one versus partial invoicing are unresolved P0 decisions. Until the owner approves them, do not expose invoice creation for any state as a settled rule; keep the endpoint disabled or guarded by explicit policy configuration.
3. Due-date calculation, when invoice creation is approved, is derived server-side from the issue date and `khach_hang.so_ngay_cong_no`.
4. Payment status is derived from amounts and due date, preserving the database-specific values; it is not client-selected.
5. The amount rules remain:
   - paid `= 0` and not past due → `chua_thanh_toan`;
   - `0 < paid < total` and not past due → `thanh_toan_mot_phan`;
   - paid `>= total` → `da_thanh_toan`;
   - paid `< total` and past due → `qua_han`.

### 7.2 Status Naming Divergence

**Critical Database Value Distinction:**
- In `hoa_don_ban_hang`: The partial payment status is string `'thanh_toan_mot_phan'`.
- In `cong_no`: The partial payment status is string `'mot_phan'` (as verified in `schema.sql` comments and `seed_updated.sql` row 325).
- Application code must respect the distinct column values and not assume identical enum strings across tables.

### 7.3 Receivables Ownership Decision (Provisional)

- In the current MVP baseline, Sales reads `cong_no` to calculate customer balances and credit exposure.
- Automatic insertion of a receivable record into `cong_no` upon invoice issuance is **provisional** and pending cross-module confirmation with the Accounting team. Under temporary P0 rules, duplicate receivable writes are blocked.

---

## 8. Summary of Open / Provisional Policies

| Policy Item | Interim rule | Status |
|---|---|---|
| Tax Calculation | Unresolved; no tax rate or calculation mode is selected | Blocked pending Finance/business decision |
| Price Overrides by Sales | Blocked for now; use `san_pham.gia_ban` | Provisional |
| Credit Limit Enforcement | Explicit mode required; do not ship confirmation until warning vs hard-block is selected | Blocked pending Finance/sales decision |
| Receivables Write Ownership | Sales reads only; no invoice-side write | Provisional pending Accounting confirmation |
| Invoices per Order | No multiplicity assumed until policy is approved | Blocked pending Accounting decision |
