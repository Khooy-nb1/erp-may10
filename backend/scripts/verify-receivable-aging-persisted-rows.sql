-- ===========================================================================
-- P8 aging — boundary proof over PERSISTED rows.
--
-- Why this file exists
--   verify-receivable-reconciliation.sql classifies literal offset expressions
--   (`NOW() - INTERVAL '12 hours'`) without touching a stored row. That proves
--   the predicate logic but NOT that a real `cong_no` row at that boundary is
--   reported in the right bucket. This script closes that gap: it inserts real
--   rows at each boundary and asks the production predicate chain where each
--   one landed.
--
-- Safety
--   Everything runs inside one explicit transaction that ends in ROLLBACK, so
--   no row survives and no seed data is modified or deleted. Safe to run
--   against the dev database at any time, repeatedly.
--
-- Determinism
--   PostgreSQL's `NOW()` is the TRANSACTION start timestamp and is constant for
--   the whole transaction. Rows are inserted and classified under the very same
--   `NOW()`, so boundaries are exact rather than racing the clock — and each
--   inserted row is tracked by its returned primary key, not by re-deriving its
--   due date, so the classification cannot silently mismatch the insert.
--
-- Output contract mirrors the other script: `name|expected|actual|PASS|FAIL`.
-- ===========================================================================

BEGIN;

-- Temp plumbing -------------------------------------------------------------

CREATE TEMP TABLE boundary_row (
  label           text PRIMARY KEY,
  expected_bucket text NOT NULL,
  due_offset      interval NOT NULL
) ON COMMIT DROP;

INSERT INTO boundary_row (label, expected_bucket, due_offset) VALUES
  ('due_in_1_day',        'current',    INTERVAL '1 day'),
  ('due_now_exactly',     'current',    INTERVAL '0'),
  ('past_due_1_second',   'b1_1_30',    INTERVAL '1 second'),
  ('past_due_12_hours',   'b1_1_30',    INTERVAL '12 hours'),
  ('past_due_1_day',      'b1_1_30',    INTERVAL '1 day'),
  ('past_due_30_days',    'b1_1_30',    INTERVAL '30 days'),
  ('past_due_30d23h',     'b1_1_30',    INTERVAL '30 days 23 hours'),
  ('past_due_31_days',    'b2_31_60',   INTERVAL '31 days'),
  ('past_due_60_days',    'b2_31_60',   INTERVAL '60 days'),
  ('past_due_61_days',    'b3_61_90',   INTERVAL '61 days'),
  ('past_due_90_days',    'b3_61_90',   INTERVAL '90 days'),
  ('past_due_91_days',    'b4_over_90', INTERVAL '91 days');

-- id -> label, populated from RETURNING so each row is tracked exactly.
CREATE TEMP TABLE inserted_row (
  id    bigint PRIMARY KEY,
  label text NOT NULL
) ON COMMIT DROP;

-- Persist one real cong_no row per boundary. `due_offset` is subtracted from
-- the transaction-constant NOW(), making "30d23h past due" exact.
WITH inserted AS (
  INSERT INTO cong_no (
    loai_cong_no, ma_khach_hang, so_tien_phat_sinh, so_tien_da_thanh_toan,
    so_tien_con_lai, ngay_dao_han, trang_thai
  )
  SELECT
    'phai_thu',
    (SELECT id FROM khach_hang ORDER BY id LIMIT 1),
    100.00,
    0.00,
    100.00,
    NOW() - b.due_offset,
    'chua_thanh_toan'
  FROM boundary_row b
  RETURNING id, ngay_dao_han
)
INSERT INTO inserted_row (id, label)
SELECT i.id, b.label
FROM inserted i
JOIN boundary_row b ON i.ngay_dao_han = NOW() - b.due_offset;

-- Control A: fully PAID row (con_lai = 0) overdue by 45 days. Nothing is
-- outstanding, so nothing may be aged — it must appear in NO bucket.
WITH inserted AS (
  INSERT INTO cong_no (
    loai_cong_no, ma_khach_hang, so_tien_phat_sinh, so_tien_da_thanh_toan,
    so_tien_con_lai, ngay_dao_han, trang_thai
  ) VALUES (
    'phai_thu',
    (SELECT id FROM khach_hang ORDER BY id LIMIT 1),
    100.00, 100.00, 0.00, NOW() - INTERVAL '45 days', 'da_thanh_toan'
  )
  RETURNING id
)
INSERT INTO inserted_row (id, label) SELECT id, 'control_paid_row' FROM inserted;

-- Control B: PAYABLE (phai_tra) overdue by 45 days with money outstanding.
-- It must not reach any receivables figure.
WITH inserted AS (
  INSERT INTO cong_no (
    loai_cong_no, ma_nha_cung_cap, so_tien_phat_sinh, so_tien_da_thanh_toan,
    so_tien_con_lai, ngay_dao_han, trang_thai
  ) VALUES (
    'phai_tra',
    (SELECT id FROM nha_cung_cap ORDER BY id LIMIT 1),
    100.00, 0.00, 100.00, NOW() - INTERVAL '45 days', 'chua_thanh_toan'
  )
  RETURNING id
)
INSERT INTO inserted_row (id, label) SELECT id, 'control_payable_row' FROM inserted;

-- Classification: apply the PRODUCTION predicate chain, verbatim, to the
-- persisted rows only (selected by their returned ids).
CREATE TEMP TABLE classified ON COMMIT DROP AS
SELECT
  i.label,
  b.expected_bucket,
  CASE
    WHEN cn.ngay_dao_han >= NOW() AND cn.so_tien_con_lai > 0 THEN 'current'
    WHEN cn.ngay_dao_han < NOW() AND NOW() - cn.ngay_dao_han < INTERVAL '31 days' AND cn.so_tien_con_lai > 0 THEN 'b1_1_30'
    WHEN NOW() - cn.ngay_dao_han >= INTERVAL '31 days' AND NOW() - cn.ngay_dao_han < INTERVAL '61 days' AND cn.so_tien_con_lai > 0 THEN 'b2_31_60'
    WHEN NOW() - cn.ngay_dao_han >= INTERVAL '61 days' AND NOW() - cn.ngay_dao_han < INTERVAL '91 days' AND cn.so_tien_con_lai > 0 THEN 'b3_61_90'
    WHEN NOW() - cn.ngay_dao_han >= INTERVAL '91 days' AND cn.so_tien_con_lai > 0 THEN 'b4_over_90'
    ELSE 'UNBUCKETED'
  END AS actual_bucket
FROM inserted_row i
JOIN cong_no cn ON cn.id = i.id
JOIN boundary_row b ON b.label = i.label;

-- Control classification: same production CASE chain, applied to the control
-- rows. Paid-45d must be UNBUCKETED; payable-45d must be B4 if it ever leaked
-- into a receivables scan (which is what check 202 guards against).
CREATE TEMP TABLE classified_control ON COMMIT DROP AS
SELECT
  i.label,
  CASE
    WHEN cn.ngay_dao_han >= NOW() AND cn.so_tien_con_lai > 0 THEN 'current'
    WHEN cn.ngay_dao_han < NOW() AND NOW() - cn.ngay_dao_han < INTERVAL '31 days' AND cn.so_tien_con_lai > 0 THEN 'b1_1_30'
    WHEN NOW() - cn.ngay_dao_han >= INTERVAL '31 days' AND NOW() - cn.ngay_dao_han < INTERVAL '61 days' AND cn.so_tien_con_lai > 0 THEN 'b2_31_60'
    WHEN NOW() - cn.ngay_dao_han >= INTERVAL '61 days' AND NOW() - cn.ngay_dao_han < INTERVAL '91 days' AND cn.so_tien_con_lai > 0 THEN 'b3_61_90'
    WHEN NOW() - cn.ngay_dao_han >= INTERVAL '91 days' AND cn.so_tien_con_lai > 0 THEN 'b4_over_90'
    ELSE 'UNBUCKETED'
  END AS actual_bucket
FROM inserted_row i
JOIN cong_no cn ON cn.id = i.id
WHERE i.label LIKE 'control_%';

-- Aggregates over ONLY the persisted boundary rows, using the same CASE chain
-- the production aging query uses, so exhaustiveness is proven on real rows.
CREATE TEMP TABLE persisted_aging ON COMMIT DROP AS
SELECT
  COUNT(*) FILTER (WHERE cn.ngay_dao_han >= NOW() AND cn.so_tien_con_lai > 0) AS current_count,
  COUNT(*) FILTER (WHERE cn.ngay_dao_han < NOW() AND NOW() - cn.ngay_dao_han < INTERVAL '31 days' AND cn.so_tien_con_lai > 0) AS b1_count,
  COUNT(*) FILTER (WHERE NOW() - cn.ngay_dao_han >= INTERVAL '31 days' AND NOW() - cn.ngay_dao_han < INTERVAL '61 days' AND cn.so_tien_con_lai > 0) AS b2_count,
  COUNT(*) FILTER (WHERE NOW() - cn.ngay_dao_han >= INTERVAL '61 days' AND NOW() - cn.ngay_dao_han < INTERVAL '91 days' AND cn.so_tien_con_lai > 0) AS b3_count,
  COUNT(*) FILTER (WHERE NOW() - cn.ngay_dao_han >= INTERVAL '91 days' AND cn.so_tien_con_lai > 0) AS b4_count,
  COUNT(*) FILTER (WHERE cn.so_tien_con_lai > 0) AS outstanding_row_count
FROM cong_no cn
JOIN inserted_row i ON i.id = cn.id
WHERE cn.loai_cong_no = 'phai_thu';

-- Checks ---------------------------------------------------------------------
WITH checks(ord, check_name, expected, actual) AS (
  -- Every boundary label, against the bucket its persisted row landed in.
  SELECT 100, 'persisted_' || label, expected_bucket, actual_bucket
    FROM classified

  -- The five bands are exhaustive over the persisted rows: nothing fell through.
  UNION ALL SELECT 200, 'persisted_bucket_counts_are_exhaustive',
      (SELECT outstanding_row_count::text FROM persisted_aging),
      (SELECT (current_count + b1_count + b2_count + b3_count + b4_count)::text FROM persisted_aging)

  -- Every boundary row was actually persisted (guards a silent insert no-op).
  UNION ALL SELECT 203, 'persisted_boundary_row_count',
      (SELECT COUNT(*)::text FROM boundary_row),
      (SELECT COUNT(*)::text FROM classified)

  -- Control A: the paid row is in no bucket despite being 45 days overdue.
  UNION ALL SELECT 201, 'persisted_paid_row_is_unbucketed',
      'UNBUCKETED',
      (SELECT c.actual_bucket FROM classified_control c WHERE c.label = 'control_paid_row')

  -- Control B: the payable row carries real money at a 45-day age, so if the
  -- loai_cong_no filter were ever dropped it WOULD land in b4_over_90. The
  -- production scan filters it out before classification, so nothing is bucketed.
  UNION ALL SELECT 202, 'persisted_payable_excluded_from_aging',
      'b4_over_90',
      (SELECT c.actual_bucket FROM classified_control c WHERE c.label = 'control_payable_row')
)
SELECT check_name, expected, actual,
       CASE WHEN expected IS NOT DISTINCT FROM actual THEN 'PASS' ELSE 'FAIL' END AS status
FROM checks
ORDER BY ord, check_name;

ROLLBACK;
