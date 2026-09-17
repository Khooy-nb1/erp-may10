# PH1 Remediation — Database Compatibility Matrix (Step 2)

**Document ID:** `DOC-PH1-REM-002`  
**Date:** 2026-09-16  
**Source Branch:** `feature/ph1-sale-core` @ `cf918b8` (re-validated; prior freeze `ph1-bh-qlkh` @ `78d7729`)  
**Target Core Baseline:** `origin/develop` @ `7c98c78dd8716e9345d44c5af681ee1b31a1117b`  
**Integration Database:** `erp_may10` (PostgreSQL, schema `public`)  
**Deliverable Type:** Step 2 Database Compatibility Audit Deliverable  
**Exit Criteria Status:** **PASS — All PH1 repository operations map directly to the existing `erp_may10.public` schema with zero DDL changes required.**

---

## 1. Executive Summary & Schema Provenance

An exhaustive audit of all PH1 repository implementations was performed against the authoritative ERP Core schema (`backend/database/schema.sql` vs `origin/develop:database/schema.sql`).

- **Byte-level schema comparison:** `origin/develop:database/schema.sql` and `HEAD:backend/database/schema.sql` resolve to the **same git blob** `aaae749b299139ff28b996bb75559c3766d4e2fc` (887 lines, blob SHA-256 `c4a99ac8…`); `git diff` between the two paths is empty. Checked-out copies differ only by line endings (Windows `core.autocrlf=true`; no content difference).
- **Seed data comparison:** Both 343 lines; the only differences are one comment line and user id 7's phone number (`0967890122` → `0967890123`) — test-fixture metadata with no schema or business-data impact.
- **Repository SQL evaluation:** All 7 repositories emit unqualified SQL queries (`FROM khach_hang`, `FROM don_ban_hang`, `FROM cong_no`, etc.), making them immediately portable to `erp_may10.public` via connection search path.
- **DDL Changes Required:** **0**. No table additions, column additions, type alterations, or schema migrations are required to bind PH1 to `erp_may10`.

---

## 2. Master Table Compatibility Matrix

Audit of all 10 required domain tables and PH4 references across PH1 repositories:

| # | Domain Table | Core Schema Table | PK Type | Columns Used (file:line) | Status Values Used | Constraints & Types | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | **`nguoi_dung`** | `public.nguoi_dung` (L23) | `BIGSERIAL` | `id, ho_ten, email, mat_khau, so_dien_thoai, vai_tro, phong_ban, trang_thai, ngay_tao, ngay_cap_nhat` (`user.repository.ts:13,26`) | `hoat_dong`, `khoa`, `nghi_viec` | `email` UNIQUE NOT NULL; `vai_tro` 6 canonical roles | **EXACT** |
| 2 | **`khach_hang`** | `public.khach_hang` (L132) | `BIGSERIAL` | 18/18 columns mapped (`customer.repository.ts:87-92, 140-145, 178-222`) | `hoat_dong`, `tam_khoa`, `ngung_giao_dich` | `ma_khach_hang` UNIQUE NOT NULL; `han_muc_cong_no` CHECK >= 0; `so_ngay_cong_no` CHECK >= 0 | **EXACT** |
| 3 | **`san_pham`** | `public.san_pham` (L89) | `BIGSERIAL` | 11/16 columns mapped (`product.repository.ts:77-83, 107-111`); `gia_von` excluded deliberately for cost security | `dang_ban`, `ngung_ban`, `mau_moi` | `ma_san_pham` UNIQUE NOT NULL; `gia_ban` CHECK >= 0; `ma_don_vi_tinh` FK nullable | **EXACT** |
| 4 | **`don_vi_tinh`** | `public.don_vi_tinh` (L39) | `BIGSERIAL` | `dvt.id, dvt.ten_don_vi` via LEFT JOIN (`product.repository.ts:80`) | `hoat_dong`, `khong_su_dung` | `ma_don_vi` UNIQUE NOT NULL; Joined on PK | **EXACT** |
| 5 | **`don_ban_hang`** | `public.don_ban_hang` (L154) | `BIGSERIAL` | 18/18 columns mapped (`order.repository.ts:123-126, 149-152, 202-205, 264-300, 329-331`) | `cho_xac_nhan`, `da_xac_nhan`, `dang_san_xuat`, `da_giao`, `huy` | `ma_don_ban` UNIQUE NOT NULL; `tong_thanh_toan` CHECK >= 0; `ma_khach_hang` FK NOT NULL | **EXACT** |
| 6 | **`chi_tiet_don_ban_hang`** | `public.chi_tiet_don_ban_hang` (L176) | `BIGSERIAL` | 12/12 columns mapped (`order.repository.ts:168-171, 230-233, 310-313`); No update audit columns in schema | `chua_giao`, `giao_mot_phan`, `da_giao_du` | `ma_don_ban_hang` FK ON DELETE CASCADE; `so_luong` CHECK > 0; `thanh_tien` CHECK >= 0 | **EXACT** |
| 7 | **`giao_hang`** | `public.giao_hang` (L192) | `BIGSERIAL` | 15/15 columns mapped (`delivery.repository.ts:107-110, 169-178, 193-219, 245-265`) | `cho_giao`, `dang_giao`, `da_giao`, `that_bai` | `ma_giao_hang` UNIQUE NOT NULL; `ma_don_ban_hang` FK NOT NULL; `ma_kho` FK NOT NULL | **EXACT** |
| 8 | **`hoa_don_ban_hang`** | `public.hoa_don_ban_hang` (L211) | `BIGSERIAL` | 16/16 columns mapped (`invoice.repository.ts:160-165, 385-412`); Atomic row lock on order | `chua_thanh_toan`, `thanh_toan_mot_phan`, `da_thanh_toan`, `qua_han` | `ma_hoa_don` UNIQUE NOT NULL; `ma_don_ban_hang` FK NOT NULL; All totals CHECK >= 0 | **EXACT** |
| 9 | **`cong_no`** | `public.cong_no` (L707) | `BIGSERIAL` | 12 columns mapped read-only (`receivable.repository.ts:95-105, 140-145, 180-195`) | `chua_thanh_toan`, `mot_phan`, `da_thanh_toan`, `qua_han` | `loai_cong_no = 'phai_thu'` invariant enforced in all queries; `so_tien_con_lai` CHECK >= 0 | **EXACT** |
| 10 | **PH4 References (`kho`, `phieu_xuat_kho`, `ton_kho`)** | `public.kho`, etc. | `BIGSERIAL` | `k.id, k.ten_kho, k.trang_thai` (`delivery.repository.ts:108, 277`) | `hoat_dong` | PH1 reads `kho` name and active status only; zero mutation of PH4 tables | **EXACT** |

---

## 3. Status Values & Vocabulary Compliance

Audit confirms that all application enum values align with database comments and check constraints:

```text
khach_hang.trang_thai:
  Schema:     hoat_dong | tam_khoa | ngung_giao_dich
  Repository: hoat_dong | tam_khoa | ngung_giao_dich  (Exact match)

don_ban_hang.trang_thai:
  Schema:     cho_xac_nhan | da_xac_nhan | dang_san_xuat | da_giao | huy
  Repository: cho_xac_nhan | da_xac_nhan | dang_san_xuat | da_giao | huy  (Exact match)

chi_tiet_don_ban_hang.trang_thai:
  Schema:     chua_giao | giao_mot_phan | da_giao_du
  Repository: chua_giao | giao_mot_phan | da_giao_du  (Exact match)

giao_hang.trang_thai:
  Schema:     cho_giao | dang_giao | da_giao | that_bai
  Repository: cho_giao | dang_giao | da_giao | that_bai  (Exact match)

hoa_don_ban_hang.trang_thai:
  Schema:     chua_thanh_toan | thanh_toan_mot_phan | da_thanh_toan | qua_han
  Repository: chua_thanh_toan | thanh_toan_mot_phan | da_thanh_toan | qua_han  (Exact match)

cong_no.trang_thai (PH5 Shared):
  Schema:     chua_thanh_toan | mot_phan | da_thanh_toan | qua_han
  Repository: chua_thanh_toan | mot_phan | da_thanh_toan | qua_han  (Exact match - uses mot_phan)
```

**Note on Status Vocabulary Insulation:**  
The invoice table uses `thanh_toan_mot_phan` while the shared receivable table uses `mot_phan`. PH1 repositories correctly distinguish between these two vocabularies: `invoice.repository.ts` writes `thanh_toan_mot_phan` into `hoa_don_ban_hang`, and `receivable.repository.ts` filters on `mot_phan` for `cong_no`. No query confounds the two terms.

---

## 4. Concurrency, Locking & Transaction Boundaries

| Operation | Tables Touched | Transaction Mechanism | Concurrency / Lock Policy | Verification Status |
|---|---|---|---|---|
| **Create Sales Order** | `don_ban_hang`, `chi_tiet_don_ban_hang` | `withTransaction` ACID | Sequential line inserts within order transaction | PASS |
| **Update Sales Order** | `don_ban_hang`, `chi_tiet_don_ban_hang` | `withTransaction` ACID | Replaces lines atomically with recalculated totals | PASS |
| **Confirm Sales Order** | `don_ban_hang`, `cong_no` (read) | Single row update | Validates credit exposure `currentOutstanding + newOrder <= creditLimit` | PASS |
| **Create Delivery** | `giao_hang`, `don_ban_hang` (read), `kho` (read) | Single row insert | Verifies order is not cancelled and warehouse is `hoat_dong` | PASS |
| **Atomic Create Invoice** | `hoa_don_ban_hang`, `don_ban_hang` (locked) | `withTransaction` ACID | `SELECT ... FOR UPDATE OF o` serializes duplicate invoice creation; 5-attempt retry on unique code | PASS |
| **Cancel Sales Order** | `don_ban_hang` | Single row update | Validates status `cho_xac_nhan` or requires `admin` if `da_xac_nhan` | PASS |

---

## 5. Audit Columns & Timezone Verification

- **Audit Columns (`nguoi_tao`, `nguoi_cap_nhat`, `ngay_tao`, `ngay_cap_nhat`):**  
  All tables in the Core schema define `ngay_tao TIMESTAMPTZ DEFAULT NOW()` and `ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW()`.  
  Because the Core schema contains no automatic triggers, PH1 repositories correctly supply `updaterId` and `NOW()` explicitly on `UPDATE` operations (`customer.repository.ts:196`, `order.repository.ts:275`, `delivery.repository.ts:196`).
- **Timezone Alignment:**  
  All timestamp columns are defined as `TIMESTAMPTZ`. Timestamps are recorded in UTC / ISO8601, and calendar day boundary queries (e.g. Dashboard revenue chart) explicitly specify `AT TIME ZONE 'Asia/Ho_Chi_Minh'`.

---

## 6. Database Connection & Environment Alignment

### 6.1 Audit of Hardcoded Dev DB Assumptions
| File Path | Current Literal / Setting | Remediation Action |
|---|---|---|
| `backend/src/config/env.ts:19` | `default('erp_sales_crm_dev')` | Update fallback default to `erp_may10` |
| `backend/.env` | `PGDATABASE=erp_sales_crm_dev` | Set `PGDATABASE=erp_may10` in integration env |
| `backend/.env.example` | `PGDATABASE=erp_sales_crm_dev` | Update template to `PGDATABASE=erp_may10` |
| `backend/scripts/verify-receivable-reconciliation.ts:39` | `?? 'erp_sales_crm_dev'` | Change default to `erp_may10` |
| `docker-compose.yml:7,17` | `POSTGRES_DB: erp_sales_crm_dev` | Retain for standalone dev only; Core uses shared container |

---

## 7. Findings, Invariants & Non-Blocking Recommendations

1. **`cong_no` Invariant (F-01):**  
   `cong_no.loai_cong_no = 'phai_thu'` must be maintained across all Sales/CRM queries. All PH1 repositories strictly apply this condition, ensuring payables (`phai_tra`) are never exposed or aggregated in Sales.
2. **`cong_no.ma_hoa_don` Join Guard (F-02):**  
   In the schema, `cong_no.ma_hoa_don` is a `BIGINT` without a direct foreign key constraint, using `bang_hoa_don` to distinguish document types. It is recommended to keep `AND (cn.bang_hoa_don IS NULL OR cn.bang_hoa_don = 'hoa_don_ban_hang')` when joining `hoa_don_ban_hang` to avoid cross-module ID collisions.
3. **Database Driver Type Coercion (F-03):**  
   `node-postgres` returns `int8` (`BIGINT`) and `numeric` as strings by default. The TypeScript models correctly accept `string | number` for money and ID fields, preventing runtime type coercion issues.
4. **Integration Requests to Core DDL (F-04):**  
   **NONE**. All required tables, relations, and fields exist. No schema migrations are required for PH1 integration.

---

## 8. Step 2 Sign-Off & Exit Criteria

- [x] PH1 `schema.sql` verified identical to Core `database/schema.sql`.
- [x] Compatibility verified across all 10 domain tables and PH4 references.
- [x] Primary keys, foreign keys, status values, and audit columns verified.
- [x] Concurrency and row-lock patterns verified (`FOR UPDATE OF o`).
- [x] Environment binding to `erp_may10.public` documented.
- [x] Step 2 Exit Criteria Satisfied — Ready for Step 3 Core API and Cross-Module Integration Audit.
