# Module Ownership Matrix & Cross-Module Architecture Boundaries

> **P0 Baseline & Verification Notice:**  
> Live database verification against a development PostgreSQL instance (one `SELECT` query per scoped table and seed relational linkage execution) was **COMPLETED 2026-09-11** against a disposable development database; see `docs/database/seed-checklist.md`, "P0 acceptance evidence".  
> The structural schemas, columns, constraints, and relationships documented herein are derived as **Confirmed Static Facts** from `backend/database/schema.sql` and `backend/database/seed_updated.sql`.  
> Architectural policies and cross-module boundaries are documented as **Provisional Defaults** designed to unblock initial foundation, authentication, and RBAC development without claiming stakeholder sign-off.

---

## 1. Executive Context & Bounded Contexts

The ERP system contains five major operational modules (phân hệ):
1. **Sales & Customer Management (PH1 — Bán hàng & Quản lý khách hàng):** The active target of this implementation plan.
2. **Production Planning & BOM/MRP (PH2 — Kế hoạch & Quản lý sản xuất).**
3. **Purchasing & Supplier Management (PH3 — Mua hàng & Quản lý nhà cung cấp).**
4. **Warehouse & Stock Management (PH4 — Quản lý kho).**
5. **Accounting & Financial Reporting (PH5 — Kế toán doanh nghiệp).**

In addition, **Admin / System Management** holds system-wide configuration, user provisioning, and role governance.

To prevent architectural drift and unwanted coupling during Phase 1 (MVP Sales & Customer Management), strict data and operational ownership boundaries are enforced across all cross-module touchpoints.

---

## 2. Core Cross-Module Ownership Matrix

| Data Domain / Business Action | Database Tables & Touchpoints | Primary Owner (Write / State Transition) | Reader(s) | Side Effects & Cross-Module Triggers | Ownership Status |
|---|---|---|---|---|---|
| **Sales Order Header & Lines** | `don_ban_hang`, `chi_tiet_don_ban_hang` | **Sales (`ban_hang`)** | Warehouse, Production, Accounting, Admin | Atomic creation of order lines; server calculation of totals. | **Confirmed Plan Fact** |
| **Order Production Status (`dang_san_xuat`)** | `don_ban_hang.trang_thai = 'dang_san_xuat'` | **Production (`san_xuat`) / Admin** | Sales, Warehouse | Signifies work order issuance; commercial lines become strictly immutable in Sales. | **Provisional Default** (Open Decision #4) |
| **Delivery Header & Lifecycle** | `giao_hang`, `kho` | **Warehouse (`kho`) for header workflow** | Sales, Customer Service, Admin | Header list/create/start/complete/fail only; cumulative line-quantity updates and automatic order completion are **disabled** until Q11 is approved. | **Blocked by Open Decision #6/Q11** |
| **Delivery-to-Inventory Side Effects** | `ton_kho`, `phieu_xuat_kho`, `chi_tiet_phieu_xuat` | **Warehouse (`kho`)** | Sales, Accounting | **NO automated inventory deduction** upon delivery completion in MVP Sales. Physical stock movements remain in PH4. | **Confirmed Plan Constraint** |
| **Sales Invoice Creation** | `hoa_don_ban_hang` | **Accounting (`ke_toan`) / Sales Admin** | Sales (`ban_hang`), Customer | Generates invoice code (`ma_hoa_don`), records pre-tax, tax, post-tax amounts, and due date. | **Provisional Default** (Open Decision #8, #9) |
| **Invoice-to-Receivable Creation (`cong_no`)** | `cong_no` (`loai_cong_no = 'phai_thu'`) | **Accounting (`ke_toan`)** | Sales (`ban_hang`), Admin | Tracks outstanding balances, payment status, and customer credit exposure. | **Provisional Default** (Open Decision #8) |
| **Customer Master Data & Credit Terms** | `khach_hang` | **Sales (`ban_hang`) / Sales Admin** | Accounting, Warehouse, Admin | Sets credit limits (`han_muc_cong_no`) and credit days (`so_ngay_cong_no`). | **Confirmed Plan Fact** |
| **Customer Status (`hoat_dong`, `tam_khoa`, `ngung_giao_dich`)** | `khach_hang.trang_thai` | **Sales Manager / Admin** (Accounting can trigger suspension) | Sales, Warehouse, Accounting | `tam_khoa` and `ngung_giao_dich` prevent new order creation and order confirmation. | **Provisional Default** (Open Decision #13) |
| **Product Catalog & Base Pricing** | `san_pham`, `don_vi_tinh` | **Product Admin / Production** | Sales, Warehouse, Accounting | Authoritative source of `gia_ban` used by server pricing calculator. Read-only for Sales reps. | **Confirmed Plan Fact** |
| **Payment History & Transaction Receipts** | `hoa_don_ban_hang.so_tien_da_thu`, `cong_no.so_tien_da_thanh_toan` | **Accounting (`ke_toan`)** | Sales, Customer, Admin | Updates cumulative paid amounts. **No payment receipt table** exists in MVP schema. | **Confirmed Schema Fact** (Open Decision #12) |
| **Delivery Line Item Detail History** | `chi_tiet_don_ban_hang.so_luong_giao` | **Warehouse (`kho`) only if Q11 approves cumulative quantities** | Sales, Admin | No mutation or exact per-delivery history is available in the interim header-only strategy; `chi_tiet_giao_hang` does not exist. | **Blocked by Open Decision #6/Q11** |
| **Schema Additions & Migrations** | PostgreSQL DDL / Migrations | **Enterprise Architect / DB Admin** | All Modules | Strict freeze on new tables/columns during MVP without formal Change Control Board approval. | **Confirmed Plan Constraint** (Open Decision #14) |

---

## 3. Deep-Dive Ownership & Boundary Contracts

### 3.1 Order Production Status (`dang_san_xuat`)
- **Schema Reference:** `don_ban_hang.trang_thai VARCHAR(20) DEFAULT 'cho_xac_nhan'` (allowed states: `cho_xac_nhan`, `da_xac_nhan`, `dang_san_xuat`, `da_giao`, `huy`).
- **Conflict / Boundary Risk:** If Sales agents can transition orders to `dang_san_xuat`, factory capacity and raw material readiness are bypassed. Conversely, if Production holds exclusive rights, Sales cannot progress orders without external module activity.
- **Provisional Default Rule:** 
  - Sales agents (`ban_hang`) may only confirm orders (`cho_xac_nhan` → `da_xac_nhan`).
  - Transition from `da_xac_nhan` to `dang_san_xuat` is reserved for **Production Management (`san_xuat`)** or a designated **Admin** role.
  - In MVP (while PH2 Production is not implemented), this transition is treated as an explicit Admin/Production supervisor action endpoint, or triggered when manufacturing plans are acknowledged. Sales module strictly **reads** this state.
  - Once in `dang_san_xuat`, commercial lines (`chi_tiet_don_ban_hang`) are strictly locked and immutable.

### 3.2 Invoice-to-Receivable Creation (`hoa_don_ban_hang` to `cong_no`)
- **Schema Reference:**
  - `hoa_don_ban_hang` (PK `id`, `ma_don_ban_hang`, `ma_khach_hang`, `ngay_xuat_hoa_don`, `ngay_dao_han`, `tong_tien_sau_thue`, `so_tien_da_thu`, `trang_thai`).
  - `cong_no` (PK `id`, `loai_cong_no` (`phai_thu`/`phai_tra`), `ma_khach_hang`, `ma_hoa_don`, `bang_hoa_don`, `so_tien_phat_sinh`, `so_tien_da_thanh_toan`, `so_tien_con_lai`, `ngay_dao_han`, `trang_thai`).
- **Conflict / Boundary Risk:** If both the Sales Invoice service and Accounting module write to `cong_no`, duplicate debt records will corrupt financial ledgers.
- **Temporary Rule While Undecided:** 
  - Accounting is the primary domain owner of `cong_no`.
  - Sales Invoice service creates `hoa_don_ban_hang`.
  - **Provisional Default:** If the business designates Sales as responsible for automatic receivable inception upon invoice issuance, `cong_no` is inserted atomically inside the invoice creation transaction with:
    - `loai_cong_no = 'phai_thu'`
    - `ma_khach_hang = hoa_don_ban_hang.ma_khach_hang`
    - `ma_hoa_don = hoa_don_ban_hang.id`
    - `bang_hoa_don = 'hoa_don_ban_hang'`
    - `so_tien_phat_sinh = hoa_don_ban_hang.tong_tien_sau_thue`
    - `so_tien_da_thanh_toan = hoa_don_ban_hang.so_tien_da_thu`
    - `so_tien_con_lai = tong_tien_sau_thue - so_tien_da_thu`
    - `ngay_dao_han = hoa_don_ban_hang.ngay_dao_han`
    - `trang_thai = hoa_don_ban_hang.trang_thai` (mapped to `cong_no` status enum).
  - If Accounting retains manual or batch-posting ownership, Sales writes `hoa_don_ban_hang` and strictly **reads** `cong_no`.

### 3.3 Delivery-to-Inventory Side Effects
- **Schema Reference:**
  - `giao_hang` (PK `id`, `ma_giao_hang`, `ma_don_ban_hang`, `ma_kho`, `ngay_giao`, `trang_thai`).
  - `ton_kho` (Warehouse inventory table: `ma_kho`, `ma_vat_tu`, `so_luong_ton` — note: tracks `ma_vat_tu`, not `ma_san_pham`).
  - `phieu_xuat_kho` (Warehouse dispatch ticket table).
- **Conflict / Boundary Risk:** Automatic deduction of finished goods stock upon delivery completion could fail or desynchronize because `ton_kho` in the schema references raw materials (`ma_vat_tu`), not finished garment products (`san_pham`).
- **Mandatory MVP Rule:**
  - Delivery completion (`giao_hang.trang_thai = 'da_giao'`) **DOES NOT** deduct inventory or generate inventory transactions (`phieu_xuat_kho`).
  - The Delivery module manages delivery logistics, status tracking, receiver sign-off, and updates order fulfillment progress only.

### 3.4 Customer Status Management
- **Schema Reference:** `khach_hang.trang_thai VARCHAR(20) DEFAULT 'hoat_dong'` (`hoat_dong`, `tam_khoa`, `ngung_giao_dich`).
- **Conflict / Boundary Risk:** Sales representatives might reactivate suspended customers to meet quotas, bypassing credit risk controls.
- **Provisional Default Rule:**
  - Standard Sales users (`ban_hang`) have read-only access to customer status.
  - Status changes (`hoat_dong` ↔ `tam_khoa`, `ngung_giao_dich`) are restricted to **Sales Manager** or **Admin**.
  - Accounting (`ke_toan`) can request automated suspension (`tam_khoa`) when overdue debt exceeds allowed thresholds.

### 3.5 Delivery Detail History & Missing Table
- **Schema Reference:** `giao_hang` exists, but there is no `chi_tiet_giao_hang` in `schema.sql`.
- **Conflict / Boundary Risk:** Attempting to record partial shipments item-by-item without schema support leads to developer mockups or non-persisted state.
- **Interim MVP Rule:** Header workflow only. Do not mutate `chi_tiet_don_ban_hang.so_luong_giao` or derive order `da_giao` until Q11 approves cumulative line quantities. If Q11 is approved later, cumulative quantities and `da_giao_du`/`da_giao` derivation become conditional on that approved strategy.
- No fake line-item delivery log is created under either strategy.

### 3.6 Payment History & Missing Receipt Table
- **Schema Reference:** `schema.sql` contains `thanh_toan_ncc` (supplier payments in PH3), but **no** `thanh_toan_khach_hang` or `phieu_thu` table for customer payment transactions.
- **Conflict / Boundary Risk:** The frontend might promise payment installment history or payment receipt printouts that the database cannot store.
- **Mandatory MVP Rule:**
  - Only cumulative amounts (`hoa_don_ban_hang.so_tien_da_thu`, `cong_no.so_tien_da_thanh_toan`) are tracked.
  - The UI and API must explicitly present current debt and cumulative balance, never fabricating historical payment installments.

### 3.7 Database Schema Modification Governance
- **Conflict / Boundary Risk:** Introducing migration scripts or ad-hoc tables during subagent work breaks compatibility with existing databases and other ERP modules.
- **Mandatory MVP Rule:**
  - Zero schema modifications. Zero migrations. Zero new tables.
  - All features must map cleanly to existing verified tables in `schema.sql`.

---

## 4. Summary of Module Permissions by Entity

| Entity | `admin` | `ban_hang` (Sales) | `kho` (Warehouse) | `ke_toan` (Accounting) | `san_xuat` (Production) |
|---|---|---|---|---|---|
| `khach_hang` | Full | Create, Edit, View | View | View, Edit Credit Fields | View |
| `san_pham` | Full | View | View | View | Full / Edit |
| `don_ban_hang` | Full | Create, Edit (Pending), Confirm, Cancel | View | View | View, Mark In-Production |
| `chi_tiet_don_ban_hang` | Full | Create, Edit (Pending) | View only; `so_luong_giao` mutation disabled pending Q11 | View | View |
| `giao_hang` | Full | View, Create (Draft) | Start, Complete, Fail (header workflow only) | View | View |
| `hoa_don_ban_hang` | Full | View, Create (if policy allows) | View | Create, Edit, Collect Payment | View |
| `cong_no` | Full | View | No Access | Full (Create, Update Balance) | No Access |
