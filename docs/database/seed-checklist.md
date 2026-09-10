# Development Seed Checklist

**Status:** Procedure only; not executed in this session. Never run against production.

## Preconditions

- Use a newly created, empty, disposable local/test PostgreSQL database for **both** `schema.sql` and `seed_updated.sql`.
- The supplied schema contains a non-idempotent bare `ALTER TABLE ... ADD CONSTRAINT`; the two-command sequence is therefore **not rerunnable** on an already initialized database.
- Do not point these commands at production or an existing shared database.
- Obtain connection values through an ignored local `.env` or approved secret manager; never commit passwords.
- Confirm the database is disposable or backed up before loading the seed.
- Verify `psql` is installed and points to the intended development server.

Create a fresh database through the organization-approved PostgreSQL administration process before running the commands. Do not embed destructive database creation or reset commands in this checklist.

## Reproducible commands

From the repository root, replace placeholders with approved development values:

```powershell
$env:PGHOST = 'localhost'
$env:PGPORT = '5432'
$env:PGDATABASE = 'erp_sales_crm_dev'
$env:PGUSER = 'postgres'
$env:PGPASSWORD = '<development-only-secret>'

psql --set ON_ERROR_STOP=1 --file backend/database/schema.sql
psql --set ON_ERROR_STOP=1 --file backend/database/seed_updated.sql
```

Run this sequence once per fresh disposable database. It is not a rerunnable migration or reset procedure.

## Required verification queries
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

SELECT o.ma_don_ban, c.ma_khach_hang, p.ma_san_pham,
       d.ma_giao_hang, i.ma_hoa_don, r.id AS ar_id
FROM don_ban_hang o
JOIN khach_hang c ON c.id = o.ma_khach_hang
JOIN chi_tiet_don_ban_hang l ON l.ma_don_ban_hang = o.id
JOIN san_pham p ON p.id = l.ma_san_pham
LEFT JOIN giao_hang d ON d.ma_don_ban_hang = o.id
LEFT JOIN hoa_don_ban_hang i ON i.ma_don_ban_hang = o.id
LEFT JOIN cong_no r
  ON r.ma_hoa_don = i.id
 AND r.loai_cong_no = 'phai_thu';

SELECT COUNT(*) AS payable_rows_visible_to_sales
FROM cong_no
WHERE loai_cong_no = 'phai_tra';
```

## Evidence to record

Record date/time, database name (not password), schema/seed command exit status, each count, linkage rows, and the payable exclusion result in the P0 verification log. The expected static seed minimums are at least 7 users, 4 units, 3 warehouses, 3 products, 2 customers, 2 orders, 2 order lines, 1 delivery, 1 sales invoice, and 2 receivable-ledger rows; confirm actual runtime results rather than assuming them.

Until this checklist has been run successfully against development PostgreSQL, P0 remains **BLOCKED**.
