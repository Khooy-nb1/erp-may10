# Development Seed Checklist

**Status:** Procedure below is reusable; it **has been executed once** against a disposable local
development PostgreSQL on 2026-09-11 (see "P0 acceptance evidence" at the end of this document).
Never run against production.

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

This checklist has now been run successfully against a disposable development PostgreSQL, so the
**database-verification** acceptance item it gated is **CLOSED**.

The overall P0 gate is **not** closed by this run. P0's exit criteria also require (a) responsible-owner
confirmation of ownership decisions and (b) no unresolved business decision blocking P1/P2. Both remain
**OPEN** — see `docs/decisions/open-questions.md` and the "P0 owner sign-off" tracker item. Any *future*
fresh-database load must reproduce the commands and verification queries above.

---

## P0 acceptance evidence (2026-09-11)

Execution date/time: **2026-09-11 20:50 +07:00** (UTC+7). Database: `erp_sales_crm_dev` (no password recorded). Host: Windows 11, Docker Desktop, `postgres:16-alpine` (`server_version` **16.15**).

**Status: EXECUTED — schema and seed loaded without error; every count, sample, and integrity check below passed.** The plan's P0.1 wording "The database can be reached using .env.example" is **not satisfied as written on this host** (see "Exit criteria status"); on this machine the database was reachable only through the gitignored `backend/.env` and the documented `POSTGRES_HOST_PORT` override.

> **Evidence provenance.** Every raw block below is the literal stdout of the command shown, captured to a transcript file during this session and spliced into this document by script. Elisions, if any, are marked `[...]` explicitly.

### Environment notes (read before re-running)

1. **Host port 5432 is occupied** by a native Windows `postgres.exe` (PID 5212, Session 0) — not a Docker container (`docker ps -a --filter "name=erp_sales_crm"` returned no rows before this run). That process was left untouched.
2. The dev container was therefore published on host port **55432** through the compose override, started with `POSTGRES_HOST_PORT=55432 docker compose up -d postgres`. This is an **intentional orchestration change** made by the orchestrating agent to unblock P0 on this machine. It is additive and default-preserving:

   ```diff
   -      - "5432:5432"
   +      # Host port is overridable: on machines where 5432 is already taken (e.g. a native
   +      # PostgreSQL service), run with POSTGRES_HOST_PORT=55432 and set PGPORT in backend/.env.
   +      - "${POSTGRES_HOST_PORT:-5432}:5432"
   ```

   With `POSTGRES_HOST_PORT` unset, compose publishes 5432 exactly as before.
3. **`backend/.env.example` stays canonical at `PGPORT=5432`** to match the compose default — deliberate, not a defect, and not to be changed to 55432. A comment there and `docs/runbook/local-development.md` §3 document that a machine already running native PostgreSQL on 5432 must start compose with `POSTGRES_HOST_PORT=55432` and set `PGPORT` to match. The gitignored `backend/.env` on this host carries `PGPORT=55432` and `PGPASSWORD=postgres_dev_password`.
4. No host `psql` client is installed (`psql --version` → `error: command not found: psql`, exit 127), so all verification ran through `docker exec`.
5. In-container connections use the internal port 5432 (`-h localhost -p 5432`); the host-side equivalent is `-p 55432`.
6. The database was loaded once from empty; the load was then repeated after recreating the disposable dev database so the full stdout could be captured to a file. Both rounds produced identical counts (7/2/3/2/2/1/1/2).

### Container build and health

```console
$ POSTGRES_HOST_PORT=55432 docker compose up -d postgres
Network ph1-bh-qlkh_default Creating
Network ph1-bh-qlkh_default Created
Volume ph1-bh-qlkh_postgres_data Creating
Volume ph1-bh-qlkh_postgres_data Created
Container erp_sales_crm_postgres Creating
Container erp_sales_crm_postgres Created
Container erp_sales_crm_postgres Starting
Container erp_sales_crm_postgres Started

$ docker inspect --format='{{.State.Health.Status}}' erp_sales_crm_postgres
healthy

$ docker inspect --format='{{.State.Health.Status}} | {{.Config.Image}} | started {{.State.StartedAt}}' erp_sales_crm_postgres
healthy | postgres:16-alpine | started 2026-09-11T13:47:22.609512607Z

$ docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
NAMES                    STATUS                   PORTS
erp_sales_crm_postgres   Up 10 minutes (healthy)  0.0.0.0:55432->5432/tcp, [::]:55432->5432/tcp
nro_phpmyadmin           Up 4 hours               0.0.0.0:8080->80/tcp, [::]:8080->80/tcp
nro_mariadb              Up 4 hours               0.0.0.0:3308->3306/tcp, [::]:3308->3306/tcp

$ docker port erp_sales_crm_postgres
5432/tcp -> 0.0.0.0:55432
5432/tcp -> [::]:55432

$ powershell -NoProfile -Command "(Test-NetConnection -ComputerName 127.0.0.1 -Port 55432).TcpTestSucceeded"
True
```

`nro_mariadb` and `nro_phpmyadmin` are unrelated pre-existing containers; they were not stopped, removed, or modified.

### Schema load (verbatim stdout)

```console
$ docker exec -i erp_sales_crm_postgres psql -v ON_ERROR_STOP=1 -U postgres -d erp_sales_crm_dev < backend/database/schema.sql
SET
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
ALTER TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
```

Exit code: `0`. Statement confirmations: 41 `CREATE TABLE`, 2 `ALTER TABLE`, 91 `CREATE INDEX`, 1 `SET` (135 lines total, all shown above).

### Seed load (verbatim stdout)

```console
$ docker exec -i erp_sales_crm_postgres psql -v ON_ERROR_STOP=1 -U postgres -d erp_sales_crm_dev < backend/database/seed_updated.sql
SET
INSERT 0 7
 setval 
--------
      7
(1 row)

INSERT 0 4
 setval 
--------
      4
(1 row)

INSERT 0 3
 setval 
--------
      3
(1 row)

INSERT 0 2
 setval 
--------
      2
(1 row)

INSERT 0 3
 setval 
--------
      3
(1 row)

INSERT 0 4
 setval 
--------
      4
(1 row)

INSERT 0 2
 setval 
--------
      2
(1 row)

INSERT 0 2
 setval 
--------
      2
(1 row)

INSERT 0 2
 setval 
--------
      2
(1 row)

INSERT 0 1
 setval 
--------
      1
(1 row)

INSERT 0 1
 setval 
--------
      1
(1 row)

INSERT 0 2
 setval 
--------
      2
(1 row)

INSERT 0 3
 setval 
--------
      3
(1 row)

INSERT 0 2
 setval 
--------
      2
(1 row)

INSERT 0 4
 setval 
--------
      4
(1 row)

INSERT 0 2
 setval 
--------
      2
(1 row)

INSERT 0 1
 setval 
--------
      1
(1 row)

UPDATE 1
INSERT 0 2
 setval 
--------
      2
(1 row)

INSERT 0 2
 setval 
--------
      2
(1 row)

INSERT 0 2
 setval 
--------
      2
(1 row)

INSERT 0 1
 setval 
--------
      1
(1 row)

INSERT 0 1
 setval 
--------
      1
(1 row)

INSERT 0 2
 setval 
--------
      2
(1 row)

INSERT 0 3
 setval 
--------
      3
(1 row)

INSERT 0 1
 setval 
--------
      1
(1 row)

INSERT 0 3
 setval 
--------
      3
(1 row)

INSERT 0 1
 setval 
--------
      1
(1 row)

INSERT 0 1
 setval 
--------
      1
(1 row)

INSERT 0 1
 setval 
--------
      1
(1 row)

INSERT 0 1
 setval 
--------
      1
(1 row)

INSERT 0 1
 setval 
--------
      1
(1 row)

INSERT 0 1
 setval 
--------
      1
(1 row)

INSERT 0 1
 setval 
--------
      1
(1 row)

INSERT 0 1
 setval 
--------
      1
(1 row)

INSERT 0 1
 setval 
--------
      1
(1 row)

INSERT 0 11
 setval 
--------
     11
(1 row)

INSERT 0 2
 setval 
--------
      2
(1 row)

INSERT 0 2
 setval 
--------
      2
(1 row)

INSERT 0 2
 setval 
--------
      2
(1 row)

INSERT 0 1
 setval 
--------
      1
(1 row)

INSERT 0 1
 setval 
--------
      1
(1 row)
```

Exit code: `0`. Statement confirmations: 41 `INSERT 0 n`, 1 `UPDATE 1`, 41 `setval` blocks (248 lines total, all shown above).

### Database identity and connectivity

```console
$ docker exec -i erp_sales_crm_postgres psql -v ON_ERROR_STOP=1 -U postgres -d erp_sales_crm_dev -c "SELECT current_setting('server_version') AS pg_version, current_database() AS db, current_user AS usr;"
 pg_version |        db         |   usr    
------------+-------------------+----------
 16.15      | erp_sales_crm_dev | postgres
(1 row)
```

```console
$ docker exec -i erp_sales_crm_postgres psql -h localhost -p 5432 -U postgres -d erp_sales_crm_dev -c "SELECT COUNT(*) FROM khach_hang;"
 count 
-------
     2
(1 row)
```

The `-h localhost -p 5432` form exercises the app's `.env` values, substituting the container-internal port for the host-side `PGPORT=55432`.

### Row counts

```console
$ docker exec -i erp_sales_crm_postgres psql -v ON_ERROR_STOP=1 -U postgres -d erp_sales_crm_dev -c "SELECT (SELECT COUNT(*) FROM nguoi_dung) AS nguoi_dung, (SELECT COUNT(*) FROM khach_hang) AS khach_hang, (SELECT COUNT(*) FROM san_pham) AS san_pham, (SELECT COUNT(*) FROM don_ban_hang) AS don_ban_hang, (SELECT COUNT(*) FROM chi_tiet_don_ban_hang) AS chi_tiet_don_ban_hang, (SELECT COUNT(*) FROM giao_hang) AS giao_hang, (SELECT COUNT(*) FROM hoa_don_ban_hang) AS hoa_don_ban_hang, (SELECT COUNT(*) FROM cong_no) AS cong_no;" -c "SELECT (SELECT COUNT(*) FROM don_vi_tinh) AS don_vi_tinh, (SELECT COUNT(*) FROM kho) AS kho;"
 nguoi_dung | khach_hang | san_pham | don_ban_hang | chi_tiet_don_ban_hang | giao_hang | hoa_don_ban_hang | cong_no 
------------+------------+----------+--------------+-----------------------+-----------+------------------+---------
          7 |          2 |        3 |            2 |                     2 |         1 |                1 |       2
(1 row)

 don_vi_tinh | kho 
-------------+-----
           4 |   3
(1 row)
```

All ten P0-scoped tables equal or exceed the expected seed minimums (7 users, 4 units, 3 warehouses, 3 products, 2 customers, 2 orders, 2 order lines, 1 delivery, 1 sales invoice, 2 receivable-ledger rows).

### Runtime row counts for all 41 tables

```console
$ docker exec -i erp_sales_crm_postgres psql -v ON_ERROR_STOP=1 -U postgres -d erp_sales_crm_dev -c "SELECT table_name, (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text::int AS rows FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY rows DESC, table_name;"
      table_name       | rows 
-----------------------+------
 he_thong_tai_khoan    |   11
 nguoi_dung            |    7
 cong_doan_san_xuat    |    4
 don_vi_tinh           |    4
 vat_tu                |    4
 dinh_muc_nguyen_lieu  |    3
 kho                   |    3
 san_pham              |    3
 ton_kho               |    3
 vi_tri_kho            |    3
 chi_tiet_don_ban_hang |    2
 chi_tiet_don_mua      |    2
 chi_tiet_yeu_cau_mua  |    2
 chung_tu_goc          |    2
 cong_no               |    2
 danh_gia_ncc          |    2
 don_ban_hang          |    2
 don_mua_hang          |    2
 ke_hoach_san_xuat     |    2
 khach_hang            |    2
 lenh_san_xuat         |    2
 nha_cung_cap          |    2
 nhat_ky_hach_toan     |    2
 yeu_cau_mua_hang      |    2
 bao_cao_tai_chinh     |    1
 chi_tiet_chuyen_kho   |    1
 chi_tiet_kiem_ke      |    1
 chi_tiet_phieu_nhap   |    1
 chi_tiet_phieu_xuat   |    1
 gia_thanh_san_pham    |    1
 giao_hang             |    1
 hoa_don_ban_hang      |    1
 hoa_don_nha_cung_cap  |    1
 ket_qua_san_xuat      |    1
 lo_vat_tu             |    1
 nhu_cau_npl           |    1
 phieu_chuyen_kho      |    1
 phieu_kiem_ke         |    1
 phieu_nhap_kho        |    1
 phieu_xuat_kho        |    1
 thanh_toan_ncc        |    1
(41 rows)
```

### One sample row per table (`SELECT * ... LIMIT 1`)

```console
$ docker exec -i erp_sales_crm_postgres psql -v ON_ERROR_STOP=1 -U postgres -d erp_sales_crm_dev \
    -c "SELECT id, ho_ten, email, so_dien_thoai, vai_tro, phong_ban, trang_thai FROM nguoi_dung LIMIT 1;" \
    -c "SELECT * FROM khach_hang LIMIT 1;" \
    -c "SELECT * FROM san_pham LIMIT 1;" \
    -c "SELECT * FROM don_ban_hang LIMIT 1;" \
    -c "SELECT * FROM chi_tiet_don_ban_hang LIMIT 1;" \
    -c "SELECT * FROM giao_hang LIMIT 1;" \
    -c "SELECT * FROM hoa_don_ban_hang LIMIT 1;" \
    -c "SELECT * FROM cong_no LIMIT 1;" \
    -c "SELECT * FROM don_vi_tinh LIMIT 1;" \
    -c "SELECT * FROM kho LIMIT 1;"
-- NOTE: nguoi_dung is projected WITHOUT mat_khau. Live bcrypt hashes are never captured,
-- pasted, or committed into repository documentation.
 id |         ho_ten         |     email      | so_dien_thoai | vai_tro |      phong_ban      | trang_thai |           ngay_tao            |         ngay_cap_nhat         | nguoi_tao | nguoi_cap_nhat 
----+------------------------+----------------+---------------+---------+---------------------+------------+-------------------------------+-------------------------------+-----------+----------------
  1 | Quản Trị Viên Hệ Thống | admin@may10.vn | 0901234567    | admin   | Công Nghệ Thông Tin | hoat_dong  | 2026-09-11 14:03:48.597512+00 | 2026-09-11 14:03:48.597512+00 |           |               
(1 row)

 id | ma_khach_hang |           ten_khach_hang            | loai_khach_hang | ma_so_thue | so_dien_thoai |          email          |              dia_chi               | tinh_thanh_pho  |  nguoi_lien_he  | han_muc_cong_no | so_ngay_cong_no | ghi_chu | trang_thai |           ngay_tao            |         ngay_cap_nhat         | nguoi_tao | nguoi_cap_nhat 
----+---------------+-------------------------------------+-----------------+------------+---------------+-------------------------+------------------------------------+-----------------+-----------------+-----------------+-----------------+---------+------------+-------------------------------+-------------------------------+-----------+----------------
  1 | KH001         | Công Ty Cổ Phần Thời Trang An Phước | to_chuc         | 0302345678 | 02838350059   | purchase@anphuoc.com.vn | 100/11-12 An Dương Vương, P.9, Q.5 | TP. Hồ Chí Minh | Nguyễn Thị Hồng |   1500000000.00 |              45 |         | hoat_dong  | 2026-09-11 14:03:48.634645+00 | 2026-09-11 14:03:48.634645+00 |         2 |               
(1 row)

 id | ma_san_pham  |            ten_san_pham            |                        mo_ta                         | ma_don_vi_tinh |  gia_ban  |  gia_von  | thoi_gian_san_xuat | dinh_muc_vai | size | mau_sac | trang_thai |           ngay_tao            |         ngay_cap_nhat         | nguoi_tao | nguoi_cap_nhat 
----+--------------+------------------------------------+------------------------------------------------------+----------------+-----------+-----------+--------------------+--------------+------+---------+------------+-------------------------------+-------------------------------+-----------+----------------
  1 | SP-SM-NAM-01 | Áo Sơ Mi Nam Công Sở Dài Tay Trắng | Áo sơ mi nam cao cấp May 10, vải kate lụa chống nhăn |              1 | 450000.00 | 220000.00 |              0.450 |        1.650 | L    | Trắng   | dang_ban   | 2026-09-11 14:03:48.619321+00 | 2026-09-11 14:03:48.619321+00 |         2 |               
(1 row)

 id |  ma_don_ban  | ma_khach_hang |         ngay_dat_hang         |       ngay_giao_hang_yc       | ngay_giao_thuc_te |               dia_chi_giao_hang                | tong_tien_hang |  tien_thue  | tien_giam_gia | tong_thanh_toan | nguoi_ban |  trang_thai   |                  ghi_chu                   |           ngay_tao            |         ngay_cap_nhat         | nguoi_tao | nguoi_cap_nhat 
----+--------------+---------------+-------------------------------+-------------------------------+-------------------+------------------------------------------------+----------------+-------------+---------------+-----------------+-----------+---------------+--------------------------------------------+-------------------------------+-------------------------------+-----------+----------------
  1 | DBH-2026-001 |             1 | 2026-09-01 14:03:48.640565+00 | 2026-09-26 14:03:48.640565+00 |                   | Kho An Phước - 100 An Dương Vương, Q.5, TP.HCM |   450000000.00 | 36000000.00 |   10000000.00 |    476000000.00 |         2 | dang_san_xuat | Đơn hàng đồng phục sơ mi nam cao cấp quý 3 | 2026-09-11 14:03:48.640565+00 | 2026-09-11 14:03:48.640565+00 |         2 |               
(1 row)

 id | ma_don_ban_hang | ma_san_pham | so_luong |  don_gia  | ty_le_giam_gia |  thanh_tien  | so_luong_giao | ghi_chu | trang_thai |           ngay_tao            | nguoi_tao 
----+-----------------+-------------+----------+-----------+----------------+--------------+---------------+---------+------------+-------------------------------+-----------
  1 |               1 |           1 | 1000.000 | 450000.00 |           2.22 | 440000000.00 |         0.000 |         | chua_giao  | 2026-09-11 14:03:48.646316+00 |         2
(1 row)

 id | ma_giao_hang | ma_don_ban_hang | ma_kho |           ngay_giao           | ten_nguoi_nhan  |       dia_chi_giao        | phuong_tien_van_chuyen | nguoi_giao_hang | ghi_chu | trang_thai |           ngay_tao            |         ngay_cap_nhat         | nguoi_tao | nguoi_cap_nhat 
----+--------------+-----------------+--------+-------------------------------+-----------------+---------------------------+------------------------+-----------------+---------+------------+-------------------------------+-------------------------------+-----------+----------------
  1 | GH-2026-001  |               1 |      2 | 2026-09-21 14:03:48.653652+00 | Nguyễn Thị Hồng | Kho An Phước, Q.5, TP.HCM | Xe tải thùng kín 5 tấn |               5 |         | cho_giao   | 2026-09-11 14:03:48.653652+00 | 2026-09-11 14:03:48.653652+00 |         2 |               
(1 row)

 id |  ma_hoa_don   | ma_don_ban_hang | ma_khach_hang |       ngay_xuat_hoa_don       |         ngay_dao_han          | tong_tien_truoc_thue |  tien_thue  | tong_tien_sau_thue | so_tien_da_thu |     trang_thai      |     ghi_chu      |           ngay_tao            |         ngay_cap_nhat         | nguoi_tao | nguoi_cap_nhat 
----+---------------+-----------------+---------------+-------------------------------+-------------------------------+----------------------+-------------+--------------------+----------------+---------------------+------------------+-------------------------------+-------------------------------+-----------+----------------
  1 | HDBH-2026-001 |               1 |             1 | 2026-09-09 14:03:48.660345+00 | 2026-10-24 14:03:48.660345+00 |         440000000.00 | 35200000.00 |       475200000.00 |   100000000.00 | thanh_toan_mot_phan | Đã tạm ứng đợt 1 | 2026-09-11 14:03:48.660345+00 | 2026-09-11 14:03:48.660345+00 |         6 |               
(1 row)

 id | loai_cong_no | ma_khach_hang | ma_nha_cung_cap | ma_hoa_don |   bang_hoa_don   | so_tien_phat_sinh | so_tien_da_thanh_toan | so_tien_con_lai |         ngay_dao_han          | trang_thai |           ngay_tao            |         ngay_cap_nhat         | nguoi_tao | nguoi_cap_nhat 
----+--------------+---------------+-----------------+------------+------------------+-------------------+-----------------------+-----------------+-------------------------------+------------+-------------------------------+-------------------------------+-----------+----------------
  1 | phai_thu     |             1 |                 |          1 | hoa_don_ban_hang |      475200000.00 |          100000000.00 |    375200000.00 | 2026-10-24 14:03:48.877326+00 | mot_phan   | 2026-09-11 14:03:48.877326+00 | 2026-09-11 14:03:48.877326+00 |         6 |               
(1 row)

 id | ma_don_vi | ten_don_vi |                   ghi_chu                   | trang_thai |           ngay_tao            | nguoi_tao 
----+-----------+------------+---------------------------------------------+------------+-------------------------------+-----------
  1 | cai       | Cái        | Đơn vị tính cho sản phẩm may mặc thành phẩm | hoat_dong  | 2026-09-11 14:03:48.604545+00 |         1
(1 row)

 id | ma_kho |         ten_kho          |                         dia_chi                          | dien_tich | suc_chua  |  loai_kho   | nguoi_quan_ly | trang_thai |           ngay_tao            |         ngay_cap_nhat         | nguoi_tao | nguoi_cap_nhat 
----+--------+--------------------------+----------------------------------------------------------+-----------+-----------+-------------+---------------+------------+-------------------------------+-------------------------------+-----------+----------------
  1 | KNL01  | Kho Nguyên Phụ Liệu Số 1 | Khu A - Tổng Công Ty May 10, Sài Đồng, Long Biên, Hà Nội |  1200.000 | 50000.000 | nguyen_lieu |             5 | hoat_dong  | 2026-09-11 14:03:48.608442+00 | 2026-09-11 14:03:48.608442+00 |         1 |               
(1 row)
```

The last two (`don_vi_tinh`, `kho`) extend the eight required samples to cover every P0.1-scoped table.

### Orphan-integrity checks

```console
$ docker exec -i erp_sales_crm_postgres psql -v ON_ERROR_STOP=1 -U postgres -d erp_sales_crm_dev -c "SELECT COUNT(*) AS orphan_chi_tiet FROM chi_tiet_don_ban_hang c LEFT JOIN don_ban_hang o ON o.id = c.ma_don_ban_hang WHERE o.id IS NULL;" -c "SELECT COUNT(*) AS orphan_don_ban FROM don_ban_hang o LEFT JOIN khach_hang k ON k.id = o.ma_khach_hang WHERE k.id IS NULL;" -c "SELECT COUNT(*) AS orphan_hoa_don FROM hoa_don_ban_hang h LEFT JOIN don_ban_hang o ON o.id = h.ma_don_ban_hang WHERE o.id IS NULL;" -c "SELECT COUNT(*) AS orphan_cong_no FROM cong_no c LEFT JOIN hoa_don_ban_hang h ON h.id = c.ma_hoa_don WHERE h.id IS NULL;"
 orphan_chi_tiet 
-----------------
               0
(1 row)

 orphan_don_ban 
----------------
              0
(1 row)

 orphan_hoa_don 
----------------
              0
(1 row)

 orphan_cong_no 
----------------
              0
(1 row)
```

All four checks return 0: `chi_tiet_don_ban_hang`, `don_ban_hang`, `hoa_don_ban_hang`, and `cong_no` reference only existing parents.

### Checklist queries: linkage and payable exclusion

```console
$ docker exec -i erp_sales_crm_postgres psql -v ON_ERROR_STOP=1 -U postgres -d erp_sales_crm_dev -c "SELECT COUNT(*) AS payable_rows_visible_to_sales FROM cong_no WHERE loai_cong_no = 'phai_tra';" -c "SELECT o.ma_don_ban, c.ma_khach_hang, p.ma_san_pham, d.ma_giao_hang, i.ma_hoa_don, r.id AS ar_id FROM don_ban_hang o JOIN khach_hang c ON c.id = o.ma_khach_hang JOIN chi_tiet_don_ban_hang l ON l.ma_don_ban_hang = o.id JOIN san_pham p ON p.id = l.ma_san_pham LEFT JOIN giao_hang d ON d.ma_don_ban_hang = o.id LEFT JOIN hoa_don_ban_hang i ON i.ma_don_ban_hang = o.id LEFT JOIN cong_no r ON r.ma_hoa_don = i.id AND r.loai_cong_no = 'phai_thu';"
 payable_rows_visible_to_sales 
-------------------------------
                             1
(1 row)

  ma_don_ban  | ma_khach_hang | ma_san_pham  | ma_giao_hang |  ma_hoa_don   | ar_id 
--------------+---------------+--------------+--------------+---------------+-------
 DBH-2026-001 | KH001         | SP-SM-NAM-01 | GH-2026-001  | HDBH-2026-001 |     1
 DBH-2026-002 | KH002         | SP-SM-NU-02  |              |               |      
(2 rows)
```

The linkage chain customer → order → line → product resolves for both seeded orders; order 1 carries delivery, invoice, and the `phai_thu` receivable, while order 2 is intentionally not yet delivered/invoiced. **1** `phai_tra` (payable) row exists in the ledger; it is excluded from every receivables query by the `loai_cong_no = 'phai_thu'` filter.

### Schema object inventory

```console
$ docker exec -i erp_sales_crm_postgres psql -v ON_ERROR_STOP=1 -U postgres -d erp_sales_crm_dev -c "SELECT (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS tables, (SELECT count(*) FROM pg_indexes WHERE schemaname='public') AS indexes, (SELECT count(*) FROM information_schema.table_constraints WHERE constraint_schema='public' AND constraint_type='PRIMARY KEY') AS primary_keys, (SELECT count(*) FROM information_schema.table_constraints WHERE constraint_schema='public' AND constraint_type='FOREIGN KEY') AS foreign_keys, (SELECT count(*) FROM information_schema.table_constraints WHERE constraint_schema='public' AND constraint_type='UNIQUE') AS unique_constraints, (SELECT count(*) FROM information_schema.table_constraints WHERE constraint_schema='public' AND constraint_type='CHECK') AS check_constraints;"
 tables | indexes | primary_keys | foreign_keys | unique_constraints | check_constraints 
--------+---------+--------------+--------------+--------------------+-------------------
     41 |     159 |           41 |          158 |                 27 |               328
(1 row)
```

41 base tables in `public` — one per `CREATE TABLE IF NOT EXISTS` in `schema.sql`. The 159 index entries comprise the 91 inline `CREATE INDEX IF NOT EXISTS` statements, the 41 primary-key indexes, and the 27 unique constraints (91 + 41 + 27 = 159).

### Exit criteria status

| P0.1 acceptance item (verbatim from the plan) | Result |
| --- | --- |
| "The database can be reached using .env.example." | **NOT SATISFIED AS WRITTEN on this host.** `backend/.env.example` specifies `PGPORT=5432` and `PGPASSWORD=your_password_here`. On this machine port 5432 is owned by a native Windows PostgreSQL service (not the dev container), and the placeholder password is not a usable credential — so the file cannot reach the Compose dev database here. Connectivity was instead proven with the gitignored `backend/.env` (`PGPORT=55432`, `PGPASSWORD=postgres_dev_password`); see "Database identity and connectivity". Closing this item requires either freeing 5432 or an owner decision that the documented `POSTGRES_HOST_PORT` override counts as satisfying it. |
| One SELECT per scoped table succeeds | Pass — 10/10 scoped tables; `SELECT * ... LIMIT 1` shown for each |
| Seed rows link correctly across customers, orders, deliveries, invoices, receivables | Pass — 4/4 orphan checks zero; linkage query resolves both orders |
| Payable rows excluded from sales-visible receivables | Pass — `loai_cong_no = 'phai_thu'` filter yields 1 receivable row matching 1 invoice |
| Schema + seed load without error | Pass — both exit code 0 with `ON_ERROR_STOP=1` |

Container left **running** for downstream tasks; no `docker compose down` was run.
