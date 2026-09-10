# P0 Database Table Usage

**Status:** P0 incomplete / blocked.

Static facts below are extracted from `backend/database/schema.sql` and `backend/database/seed_updated.sql`. A reachable development PostgreSQL instance, one `SELECT` per scoped table, and executed seed-linkage checks were not available in this session. Static inspection is not runtime acceptance.

## In-scope tables

| Table | Role in Sales/CRM | Primary key | Relevant references and constraints | Seed evidence |
|---|---|---|---|---|
| `nguoi_dung` | Login identity, role, audit actor | `id BIGSERIAL` | `email UNIQUE NOT NULL`; `vai_tro NOT NULL`; status comment `hoat_dong`, `khoa`, `nghi_viec`; self-referencing audit FKs are added later | Seven users inserted; ids 1–7; roles include `admin`, `ban_hang`, `san_xuat`, `mua_hang`, `kho`, `ke_toan`, `ke_toan_truong` |
| `khach_hang` | Customer master and credit terms | `id BIGSERIAL` | `ma_khach_hang UNIQUE NOT NULL`; `loai_khach_hang` comment `ca_nhan`, `to_chuc`, `dai_ly`, `xuat_khau`; non-negative credit limit/days; audit users reference `nguoi_dung` | KH001 and KH002 inserted; both active; creator id 2 |
| `san_pham` | Read-only product lookup and authoritative sale price | `id BIGSERIAL` | `ma_san_pham UNIQUE NOT NULL`; `ma_don_vi_tinh` references `don_vi_tinh`; `gia_ban >= 0`; status comment `dang_ban`, `ngung_ban`, `mau_moi`; audit users reference `nguoi_dung` | Three products inserted; all `dang_ban`; unit id 1 |
| `don_vi_tinh` | Product unit display | `id BIGSERIAL` | `ma_don_vi UNIQUE NOT NULL`; creator references `nguoi_dung`; statuses `hoat_dong`, `khong_su_dung` | Four units inserted |
| `don_ban_hang` | Sales order header | `id BIGSERIAL` | `ma_don_ban UNIQUE NOT NULL`; customer and salesperson references; non-negative monetary checks; statuses `cho_xac_nhan`, `da_xac_nhan`, `dang_san_xuat`, `da_giao`, `huy` | DBH-2026-001 for customer 1 and DBH-2026-002 for customer 2 |
| `chi_tiet_don_ban_hang` | Order lines; potential cumulative delivery quantity only if Q11 is approved | `id BIGSERIAL` | order FK `ON DELETE CASCADE`; product FK; quantity > 0; discount 0–100; delivered quantity >= 0; statuses `chua_giao`, `giao_mot_phan`, `da_giao_du` | Two lines link order 1→product 1 and order 2→product 2 |
| `giao_hang` | Delivery header and workflow | `id BIGSERIAL` | delivery code unique; order and warehouse FKs; required receiver/address/date; statuses `cho_giao`, `dang_giao`, `da_giao`, `that_bai` | GH-2026-001 links order 1 to warehouse 2 and user 5 |
| `kho` | Delivery warehouse reference | `id BIGSERIAL` | warehouse code unique; manager references `nguoi_dung`; statuses `hoat_dong`, `dong_cua`, `sua_chua`; non-negative capacity checks | Three warehouses inserted; warehouse 2 is finished-product warehouse |
| `hoa_don_ban_hang` | Sales invoice | `id BIGSERIAL` | invoice code unique; order and customer FKs; non-negative amount checks; statuses `chua_thanh_toan`, `thanh_toan_mot_phan`, `da_thanh_toan`, `qua_han` | HDBH-2026-001 links order 1/customer 1; status `thanh_toan_mot_phan` |
| `cong_no` | Shared AR/AP ledger; Sales may read AR only | `id BIGSERIAL` | `loai_cong_no` required; customer/supplier FKs; non-negative amounts; check requires customer for `phai_thu` or supplier for `phai_tra`; statuses include `chua_thanh_toan`, `mot_phan`, `da_thanh_toan`, `qua_han` | Row 1 is AR for customer 1/invoice 1; row 2 is AP and must be excluded |

## In-scope indexes from schema

Existing PH1 indexes cover customer code/type, order code/customer/salesperson/status, order-line order/product, delivery order/warehouse, invoice order/customer. `cong_no` has indexes on customer, supplier, and type. Do not add indexes without query plans and representative data.

## Static relationship chain

`nguoi_dung` → audit/salesperson/warehouse references; `khach_hang` → `don_ban_hang` → `chi_tiet_don_ban_hang` → `san_pham` → `don_vi_tinh`; `don_ban_hang` → `giao_hang` → `kho`; `don_ban_hang` → `hoa_don_ban_hang`; `khach_hang`/invoice → `cong_no` for `phai_thu`.

## Runtime verification still required

Run against a dedicated development database, not production:

```sql
SELECT COUNT(*) FROM nguoi_dung;
SELECT COUNT(*) FROM khach_hang;
SELECT COUNT(*) FROM san_pham;
SELECT COUNT(*) FROM don_vi_tinh;
SELECT COUNT(*) FROM don_ban_hang;
SELECT COUNT(*) FROM chi_tiet_don_ban_hang;
SELECT COUNT(*) FROM giao_hang;
SELECT COUNT(*) FROM kho;
SELECT COUNT(*) FROM hoa_don_ban_hang;
SELECT COUNT(*) FROM cong_no;

SELECT o.id, o.ma_don_ban, c.ma_khach_hang, l.id AS line_id,
       p.ma_san_pham, d.id AS delivery_id, i.id AS invoice_id,
       r.id AS receivable_id
FROM don_ban_hang o
JOIN khach_hang c ON c.id = o.ma_khach_hang
JOIN chi_tiet_don_ban_hang l ON l.ma_don_ban_hang = o.id
JOIN san_pham p ON p.id = l.ma_san_pham
LEFT JOIN giao_hang d ON d.ma_don_ban_hang = o.id
LEFT JOIN hoa_don_ban_hang i ON i.ma_don_ban_hang = o.id
LEFT JOIN cong_no r ON r.ma_hoa_don = i.id AND r.loai_cong_no = 'phai_thu';
```

Acceptance remains blocked until these queries execute successfully and their results are recorded.
