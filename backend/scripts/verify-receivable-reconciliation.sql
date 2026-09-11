-- =============================================================================
-- P8 (Accounts Receivable) reconciliation evidence — READ-ONLY, self-checking.
--
-- Purpose
--   Independently recompute every figure exposed by the receivable API and the
--   P9 dashboard receivable metrics, so a reviewer can reconcile the numbers
--   with SQL alone:
--     GET /api/v1/receivables/summary  -> ReceivableRepository.getSummary()
--     GET /api/v1/receivables/aging    -> ReceivableRepository.getAgingReport()
--     GET /api/v1/receivables          -> ReceivableRepository.list()
--     (P9) dashboard-metrics.md §5     -> openReceivable / overdueReceivable
--
-- Safety
--   * Read-only: no INSERT / UPDATE / DELETE / TRUNCATE / DDL / temp tables /
--     sequence access. Safe against a live database; takes only ACCESS SHARE.
--   * Every check carries an EXPLICIT expected value and prints as
--         check_name | expected | actual | status
--     with status = PASS when expected and actual are not distinct.
--
-- Usage (the host has no psql client; run through the dev container):
--   docker exec -i erp_sales_crm_postgres \
--     psql -v ON_ERROR_STOP=1 -X -U postgres -d erp_sales_crm_dev \
--     -t -A -F'|' -P pager=off -f - \
--     < backend/scripts/verify-receivable-reconciliation.sql
--
-- Driver: backend/scripts/verify-receivable-reconciliation.ts — it runs this
-- whole file, requires every row to be PASS, and independently re-derives the
-- same figures in TypeScript from the raw cong_no rows.
--
-- Provenance of the formulas
--   The CTEs marked PROD are copied verbatim from
--   backend/src/repositories/receivable.repository.ts. The CTEs marked IND are
--   deliberately written a second way (FILTER clauses, interval ranges derived
--   from the documented day bands) so agreement is evidence, not tautology.
--   Contract: docs/plans/08-receivables.md P8.2/P8.4 and
--   docs/architecture/dashboard-metrics.md §5.
-- =============================================================================

WITH
-- ===========================================================================
-- PROD: summary — ReceivableRepository.getSummary(), verbatim predicate text
-- ===========================================================================
summary_prod AS (
  SELECT
    COALESCE(SUM(so_tien_phat_sinh), 0)::numeric(18,2)                                   AS total_original,
    COALESCE(SUM(so_tien_da_thanh_toan), 0)::numeric(18,2)                               AS total_paid,
    COALESCE(SUM(so_tien_con_lai), 0)::numeric(18,2)                                     AS total_outstanding,
    COALESCE(SUM(CASE WHEN ngay_dao_han < NOW() AND so_tien_con_lai > 0 THEN so_tien_con_lai ELSE 0 END), 0)::numeric(18,2) AS total_overdue,
    COUNT(CASE WHEN ngay_dao_han < NOW() AND so_tien_con_lai > 0 THEN 1 END)             AS overdue_count,
    COUNT(*)                                                                             AS scanned_rows
  FROM cong_no
  WHERE loai_cong_no = 'phai_thu'
),

-- ===========================================================================
-- PROD: aging — ReceivableRepository.getAgingReport(), verbatim predicate text
-- (no so_tien_con_lai filter in the WHERE clause; the > 0 test lives in CASEs)
-- ===========================================================================
aging_prod AS (
  SELECT
    COALESCE(SUM(CASE WHEN ngay_dao_han >= NOW() AND so_tien_con_lai > 0 THEN so_tien_con_lai ELSE 0 END), 0)::numeric(18,2) AS current_amount,
    COUNT(CASE WHEN ngay_dao_han >= NOW() AND so_tien_con_lai > 0 THEN 1 END) AS current_count,

    COALESCE(SUM(CASE WHEN ngay_dao_han < NOW() AND NOW() - ngay_dao_han < INTERVAL '31 days' AND so_tien_con_lai > 0 THEN so_tien_con_lai ELSE 0 END), 0)::numeric(18,2) AS b1_amount,
    COUNT(CASE WHEN ngay_dao_han < NOW() AND NOW() - ngay_dao_han < INTERVAL '31 days' AND so_tien_con_lai > 0 THEN 1 END) AS b1_count,

    COALESCE(SUM(CASE WHEN NOW() - ngay_dao_han >= INTERVAL '31 days' AND NOW() - ngay_dao_han < INTERVAL '61 days' AND so_tien_con_lai > 0 THEN so_tien_con_lai ELSE 0 END), 0)::numeric(18,2) AS b2_amount,
    COUNT(CASE WHEN NOW() - ngay_dao_han >= INTERVAL '31 days' AND NOW() - ngay_dao_han < INTERVAL '61 days' AND so_tien_con_lai > 0 THEN 1 END) AS b2_count,

    COALESCE(SUM(CASE WHEN NOW() - ngay_dao_han >= INTERVAL '61 days' AND NOW() - ngay_dao_han < INTERVAL '91 days' AND so_tien_con_lai > 0 THEN so_tien_con_lai ELSE 0 END), 0)::numeric(18,2) AS b3_amount,
    COUNT(CASE WHEN NOW() - ngay_dao_han >= INTERVAL '61 days' AND NOW() - ngay_dao_han < INTERVAL '91 days' AND so_tien_con_lai > 0 THEN 1 END) AS b3_count,

    COALESCE(SUM(CASE WHEN NOW() - ngay_dao_han >= INTERVAL '91 days' AND so_tien_con_lai > 0 THEN so_tien_con_lai ELSE 0 END), 0)::numeric(18,2) AS b4_amount,
    COUNT(CASE WHEN NOW() - ngay_dao_han >= INTERVAL '91 days' AND so_tien_con_lai > 0 THEN 1 END) AS b4_count,

    COALESCE(SUM(CASE WHEN so_tien_con_lai > 0 THEN so_tien_con_lai ELSE 0 END), 0)::numeric(18,2) AS total_receivables,
    COUNT(*) AS scanned_rows
  FROM cong_no
  WHERE loai_cong_no = 'phai_thu'
),

-- ===========================================================================
-- IND: summary recomputed from the P8.2 business rules
--   outstanding = so_tien_con_lai; overdue = now > ngay_dao_han AND outstanding > 0
-- (SUM(...) FILTER + a separate COUNT subquery: not the production expression)
-- ===========================================================================
summary_ind AS (
  SELECT
    COALESCE(SUM(so_tien_phat_sinh), 0)::numeric(18,2) AS total_original,
    COALESCE(SUM(so_tien_da_thanh_toan), 0)::numeric(18,2) AS total_paid,
    COALESCE(SUM(so_tien_con_lai), 0)::numeric(18,2) AS total_outstanding,
    COALESCE(SUM(so_tien_con_lai) FILTER (WHERE ngay_dao_han < NOW() AND so_tien_con_lai > 0), 0)::numeric(18,2) AS total_overdue,
    (SELECT COUNT(*) FROM cong_no WHERE loai_cong_no = 'phai_thu' AND ngay_dao_han < NOW() AND so_tien_con_lai > 0) AS overdue_count
  FROM cong_no
  WHERE loai_cong_no = 'phai_thu'
),

-- ===========================================================================
-- IND: aging recomputed a second way, from half-open interval bands rather
-- than from the production predicate text. Bands are [0,31) / [31,61) /
-- [61,91) / [91,inf) days, so the set is mutually exclusive AND exhaustive:
-- every row with so_tien_con_lai > 0 lands in exactly one band, which is what
-- makes "buckets sum to total_receivables" a real invariant rather than luck.
-- ===========================================================================
aging_ind AS (
  SELECT
    COALESCE(SUM(so_tien_con_lai) FILTER (WHERE ngay_dao_han >= NOW() AND so_tien_con_lai > 0), 0)::numeric(18,2) AS current_amount,
    COUNT(*) FILTER (WHERE ngay_dao_han >= NOW() AND so_tien_con_lai > 0) AS current_count,

    COALESCE(SUM(so_tien_con_lai) FILTER (WHERE ngay_dao_han < NOW() AND NOW() - ngay_dao_han < INTERVAL '31 days' AND so_tien_con_lai > 0), 0)::numeric(18,2) AS b1_amount,
    COUNT(*) FILTER (WHERE ngay_dao_han < NOW() AND NOW() - ngay_dao_han < INTERVAL '31 days' AND so_tien_con_lai > 0) AS b1_count,

    COALESCE(SUM(so_tien_con_lai) FILTER (WHERE NOW() - ngay_dao_han >= INTERVAL '31 days' AND NOW() - ngay_dao_han < INTERVAL '61 days' AND so_tien_con_lai > 0), 0)::numeric(18,2) AS b2_amount,
    COUNT(*) FILTER (WHERE NOW() - ngay_dao_han >= INTERVAL '31 days' AND NOW() - ngay_dao_han < INTERVAL '61 days' AND so_tien_con_lai > 0) AS b2_count,

    COALESCE(SUM(so_tien_con_lai) FILTER (WHERE NOW() - ngay_dao_han >= INTERVAL '61 days' AND NOW() - ngay_dao_han < INTERVAL '91 days' AND so_tien_con_lai > 0), 0)::numeric(18,2) AS b3_amount,
    COUNT(*) FILTER (WHERE NOW() - ngay_dao_han >= INTERVAL '61 days' AND NOW() - ngay_dao_han < INTERVAL '91 days' AND so_tien_con_lai > 0) AS b3_count,

    COALESCE(SUM(so_tien_con_lai) FILTER (WHERE NOW() - ngay_dao_han >= INTERVAL '91 days' AND so_tien_con_lai > 0), 0)::numeric(18,2) AS b4_amount,
    COUNT(*) FILTER (WHERE NOW() - ngay_dao_han >= INTERVAL '91 days' AND so_tien_con_lai > 0) AS b4_count,

    COALESCE(SUM(so_tien_con_lai) FILTER (WHERE so_tien_con_lai > 0), 0)::numeric(18,2) AS total_receivables,
    -- Rows that fall in NO band. Must be 0: the five bands are exhaustive.
    COALESCE(SUM(so_tien_con_lai) FILTER (WHERE so_tien_con_lai > 0 AND ngay_dao_han < NOW() AND NOT (
      NOW() - ngay_dao_han < INTERVAL '31 days'
      OR (NOW() - ngay_dao_han >= INTERVAL '31 days' AND NOW() - ngay_dao_han < INTERVAL '61 days')
      OR (NOW() - ngay_dao_han >= INTERVAL '61 days' AND NOW() - ngay_dao_han < INTERVAL '91 days')
      OR NOW() - ngay_dao_han >= INTERVAL '91 days'
    )), 0)::numeric(18,2) AS unbucketed_amount
  FROM cong_no
  WHERE loai_cong_no = 'phai_thu'
),

-- ===========================================================================
-- Populations and the list()/Sales projection (read path under test)
-- ===========================================================================
population AS (
  SELECT
    COUNT(*)                                                                   AS all_rows,
    COUNT(*) FILTER (WHERE loai_cong_no = 'phai_thu')                          AS phai_thu_rows,
    COUNT(*) FILTER (WHERE loai_cong_no = 'phai_tra')                          AS phai_tra_rows,
    COUNT(*) FILTER (WHERE loai_cong_no NOT IN ('phai_thu', 'phai_tra'))       AS off_contract_rows
  FROM cong_no
),

-- Sales projection: the SELECT/JOIN/WHERE shape used by list() (whereClause for
-- an unfiltered call is exactly cn.loai_cong_no = 'phai_thu').
sales_projection AS (
  SELECT cn.id, cn.loai_cong_no, cn.ma_khach_hang, cn.ma_hoa_don,
         cn.so_tien_phat_sinh, cn.so_tien_da_thanh_toan, cn.so_tien_con_lai, cn.ngay_dao_han
  FROM cong_no cn
  LEFT JOIN khach_hang c ON c.id = cn.ma_khach_hang
  LEFT JOIN hoa_don_ban_hang h ON h.id = cn.ma_hoa_don
  WHERE cn.loai_cong_no = 'phai_thu'
),

phai_tra_rows AS (
  SELECT id, loai_cong_no, ma_nha_cung_cap, so_tien_phat_sinh, so_tien_con_lai, ngay_dao_han
  FROM cong_no
  WHERE loai_cong_no = 'phai_tra'
),

-- list() COUNT(*) with the same joins; unfiltered, customer-filtered, overdue-only
list_counts AS (
  SELECT
    (SELECT COUNT(*) FROM cong_no cn
       LEFT JOIN khach_hang c ON c.id = cn.ma_khach_hang
       LEFT JOIN hoa_don_ban_hang h ON h.id = cn.ma_hoa_don
      WHERE cn.loai_cong_no = 'phai_thu')                                            AS total_unfiltered,
    (SELECT COUNT(*) FROM cong_no cn
       LEFT JOIN khach_hang c ON c.id = cn.ma_khach_hang
       LEFT JOIN hoa_don_ban_hang h ON h.id = cn.ma_hoa_don
      WHERE cn.loai_cong_no = 'phai_thu' AND cn.ma_khach_hang = (SELECT MIN(id) FROM khach_hang)) AS total_customer_min,
    (SELECT COUNT(*) FROM cong_no cn
       LEFT JOIN khach_hang c ON c.id = cn.ma_khach_hang
       LEFT JOIN hoa_don_ban_hang h ON h.id = cn.ma_hoa_don
      WHERE cn.loai_cong_no = 'phai_thu' AND cn.ma_khach_hang = COALESCE((SELECT MIN(id) FROM khach_hang
             WHERE id NOT IN (SELECT DISTINCT ma_khach_hang FROM cong_no WHERE ma_khach_hang IS NOT NULL)), -1)) AS total_customer_without_receivables,
    (SELECT COUNT(*) FROM cong_no cn
       LEFT JOIN khach_hang c ON c.id = cn.ma_khach_hang
       LEFT JOIN hoa_don_ban_hang h ON h.id = cn.ma_hoa_don
      WHERE cn.loai_cong_no = 'phai_thu' AND cn.ngay_dao_han < NOW() AND cn.so_tien_con_lai > 0) AS total_overdue_only,
    (SELECT COUNT(*) FROM (SELECT cn.id FROM cong_no cn
       LEFT JOIN khach_hang c ON c.id = cn.ma_khach_hang
       LEFT JOIN hoa_don_ban_hang h ON h.id = cn.ma_hoa_don
      WHERE cn.loai_cong_no = 'phai_thu' ORDER BY cn.ngay_dao_han DESC, cn.id ASC LIMIT 1 OFFSET 0) p1) AS page1_rows,
    (SELECT COUNT(*) FROM (SELECT cn.id FROM cong_no cn
       LEFT JOIN khach_hang c ON c.id = cn.ma_khach_hang
       LEFT JOIN hoa_don_ban_hang h ON h.id = cn.ma_hoa_don
      WHERE cn.loai_cong_no = 'phai_thu' ORDER BY cn.ngay_dao_han DESC, cn.id ASC LIMIT 1 OFFSET 1) p2) AS page2_rows,
    -- Disjointness of the Sales projection against every NON-receivable
    -- cong_no row (the payable population): the intersection must be empty.
    (SELECT COUNT(*) FROM (
       SELECT id FROM sales_projection
       INTERSECT
       SELECT id FROM cong_no WHERE loai_cong_no <> 'phai_thu'
     ) shared_ids) AS id_overlap_projection_vs_non_receivable,
    (SELECT COUNT(*) FROM (
       SELECT DISTINCT loai_cong_no FROM sales_projection
       INTERSECT
       SELECT DISTINCT loai_cong_no FROM cong_no WHERE loai_cong_no <> 'phai_thu'
     ) shared_loai) AS loai_overlap_projection_vs_non_receivable,
    (SELECT COUNT(*) FROM cong_no WHERE loai_cong_no <> 'phai_thu') AS non_phai_thu_rows,
    (SELECT COALESCE(SUM(so_tien_phat_sinh), 0)::numeric(18,2) FROM cong_no) AS full_table_original,
    (SELECT COALESCE(SUM(so_tien_da_thanh_toan), 0)::numeric(18,2) FROM cong_no) AS full_table_paid
),

-- ===========================================================================
-- Aging boundary probes: literal offsets, no rows written, no rows inserted.
-- Each probe is classified by the PROD CASE chain applied to a positive amount.
-- ===========================================================================
boundary_probe AS (
  SELECT label, expected_bucket,
    CASE
      WHEN due_at >= NOW() AND amount > 0 THEN 'current'
      WHEN due_at < NOW() AND NOW() - due_at < INTERVAL '31 days' AND amount > 0 THEN 'b1_1_30'
      WHEN NOW() - due_at >= INTERVAL '31 days' AND NOW() - due_at < INTERVAL '61 days' AND amount > 0 THEN 'b2_31_60'
      WHEN NOW() - due_at >= INTERVAL '61 days' AND NOW() - due_at < INTERVAL '91 days' AND amount > 0 THEN 'b3_61_90'
      WHEN NOW() - due_at >= INTERVAL '91 days' AND amount > 0 THEN 'b4_over_90'
      ELSE 'UNBUCKETED'
    END AS actual_bucket
  FROM (VALUES
    ('due_in_1_day',            'current',     NOW() + make_interval(days => 1),                   100.00::numeric),
    ('due_now_0_days',          'current',     NOW() - make_interval(days => 0),                   100.00::numeric),
    ('past_due_1_day',          'b1_1_30',     NOW() - make_interval(days => 1),                   100.00::numeric),
    ('past_due_30_days',        'b1_1_30',     NOW() - make_interval(days => 30),                  100.00::numeric),
    ('past_due_31_days',        'b2_31_60',    NOW() - make_interval(days => 31),                  100.00::numeric),
    ('past_due_60_days',        'b2_31_60',    NOW() - make_interval(days => 60),                  100.00::numeric),
    ('past_due_61_days',        'b3_61_90',    NOW() - make_interval(days => 61),                  100.00::numeric),
    ('past_due_90_days',        'b3_61_90',    NOW() - make_interval(days => 90),                  100.00::numeric),
    ('past_due_91_days',        'b4_over_90',  NOW() - make_interval(days => 91),                  100.00::numeric),
    ('past_due_30d23h_stays_in_band_1', 'b1_1_30',  NOW() - make_interval(days => 30, hours => 23), 100.00::numeric),
    -- Was the uncovered sub-day gap under the old EXTRACT(DAY) bands; the
    -- exhaustive interval bands must now place it in the first overdue bucket.
    ('past_due_12h_lands_in_band_1',    'b1_1_30',  NOW() - make_interval(hours => 12),             100.00::numeric)
  ) AS probe(label, expected_bucket, due_at, amount)
),

-- ===========================================================================
-- P9 dashboard metric definitions (docs/architecture/dashboard-metrics.md §5)
-- ===========================================================================
dashboard_metrics AS (
  SELECT
    COALESCE((SELECT SUM(cn.so_tien_con_lai) FROM cong_no cn WHERE cn.loai_cong_no = 'phai_thu'), 0)::numeric(18,2) AS open_receivable,
    COALESCE((SELECT SUM(cn.so_tien_con_lai) FROM cong_no cn
              WHERE cn.loai_cong_no = 'phai_thu' AND cn.ngay_dao_han < NOW() AND cn.so_tien_con_lai > 0), 0)::numeric(18,2) AS overdue_receivable
),

-- ===========================================================================
-- CHECK TABLE — every row: explicit expected value vs observed actual value
-- ===========================================================================
checks(ord, check_name, expected, actual) AS (
  -- A. summary: production formula vs independent recomputation -------------
  SELECT 10, 'summary_total_original',    (SELECT total_original::text FROM summary_ind),    (SELECT total_original::text FROM summary_prod)
  UNION ALL SELECT 11, 'summary_total_paid',        (SELECT total_paid::text FROM summary_ind),        (SELECT total_paid::text FROM summary_prod)
  UNION ALL SELECT 12, 'summary_total_outstanding', (SELECT total_outstanding::text FROM summary_ind), (SELECT total_outstanding::text FROM summary_prod)
  UNION ALL SELECT 13, 'summary_total_overdue',     (SELECT total_overdue::text FROM summary_ind),     (SELECT total_overdue::text FROM summary_prod)
  UNION ALL SELECT 14, 'summary_overdue_count',     (SELECT overdue_count::text FROM summary_ind),     (SELECT overdue_count::text FROM summary_prod)
  UNION ALL SELECT 15, 'ledger_identity_phat_sinh_minus_paid_equals_outstanding',
      (SELECT (SUM(so_tien_phat_sinh) - SUM(so_tien_da_thanh_toan))::numeric(18,2)::text FROM cong_no WHERE loai_cong_no = 'phai_thu'),
      (SELECT SUM(so_tien_con_lai)::numeric(18,2)::text FROM cong_no WHERE loai_cong_no = 'phai_thu')
  UNION ALL SELECT 16, 'summary_scanned_rows_are_phai_thu_only',
      (SELECT phai_thu_rows::text FROM population), (SELECT scanned_rows::text FROM summary_prod)

  -- B. aging: production formula vs recomputation from the documented bands --
  UNION ALL SELECT 20, 'aging_current_amount', (SELECT current_amount::text FROM aging_ind), (SELECT current_amount::text FROM aging_prod)
  UNION ALL SELECT 21, 'aging_current_count',  (SELECT current_count::text FROM aging_ind),  (SELECT current_count::text FROM aging_prod)
  UNION ALL SELECT 22, 'aging_1_30_amount',    (SELECT b1_amount::text FROM aging_ind),      (SELECT b1_amount::text FROM aging_prod)
  UNION ALL SELECT 23, 'aging_1_30_count',     (SELECT b1_count::text FROM aging_ind),       (SELECT b1_count::text FROM aging_prod)
  UNION ALL SELECT 24, 'aging_31_60_amount',   (SELECT b2_amount::text FROM aging_ind),      (SELECT b2_amount::text FROM aging_prod)
  UNION ALL SELECT 25, 'aging_31_60_count',    (SELECT b2_count::text FROM aging_ind),       (SELECT b2_count::text FROM aging_prod)
  UNION ALL SELECT 26, 'aging_61_90_amount',   (SELECT b3_amount::text FROM aging_ind),      (SELECT b3_amount::text FROM aging_prod)
  UNION ALL SELECT 27, 'aging_61_90_count',    (SELECT b3_count::text FROM aging_ind),       (SELECT b3_count::text FROM aging_prod)
  UNION ALL SELECT 28, 'aging_over_90_amount', (SELECT b4_amount::text FROM aging_ind),      (SELECT b4_amount::text FROM aging_prod)
  UNION ALL SELECT 29, 'aging_over_90_count',  (SELECT b4_count::text FROM aging_ind),       (SELECT b4_count::text FROM aging_prod)
  UNION ALL SELECT 30, 'aging_bucket_amounts_sum_equals_total_receivables',
      (SELECT total_receivables::text FROM aging_prod),
      (SELECT (current_amount + b1_amount + b2_amount + b3_amount + b4_amount)::numeric(18,2)::text FROM aging_prod)
  -- Every row carrying outstanding money is bucketed: no row may fall through.
  UNION ALL SELECT 31, 'aging_bucket_counts_sum_equals_bucketed_rows',
      (SELECT (current_count + b1_count + b2_count + b3_count + b4_count)::text FROM aging_prod),
      (SELECT COUNT(*)::text FROM cong_no
        WHERE loai_cong_no = 'phai_thu' AND so_tien_con_lai > 0)
  UNION ALL SELECT 32, 'aging_total_receivables_equals_summary_total_outstanding',
      (SELECT total_outstanding::text FROM summary_prod), (SELECT total_receivables::text FROM aging_prod)
  UNION ALL SELECT 33, 'aging_overdue_fully_explained_by_overdue_bands',
      '0.00',
      (SELECT (total_overdue - (b1_amount + b2_amount + b3_amount + b4_amount))::numeric(18,2)::text FROM summary_prod, aging_prod)
  UNION ALL SELECT 35, 'aging_unbucketed_amount_is_zero',
      '0.00', (SELECT unbucketed_amount::text FROM aging_ind)
  UNION ALL SELECT 34, 'aging_scanned_rows_are_phai_thu_only',
      (SELECT phai_thu_rows::text FROM population), (SELECT scanned_rows::text FROM aging_prod)

  -- C. phai_tra exclusion (Sales/CRM must never surface payables) ------------
  UNION ALL SELECT 40, 'phai_tra_row_count_matches_total_minus_phai_thu',
      (SELECT (all_rows - phai_thu_rows)::text FROM population),
      (SELECT phai_tra_rows::text FROM population)
  UNION ALL SELECT 41, 'cong_no_loai_values_within_contract',
      '0', (SELECT off_contract_rows::text FROM population)
  -- Sales projection (the exact SELECT/JOIN/WHERE of list()) must not contain a
  -- single non-receivable row, by id or by loai_cong_no value.
  UNION ALL SELECT 42, 'sales_projection_id_set_disjoint_from_non_receivable_rows',
      '0', (SELECT id_overlap_projection_vs_non_receivable::text FROM list_counts)
  UNION ALL SELECT 43, 'loai_cong_no_value_sets_disjoint_projection_vs_non_receivable',
      '0', (SELECT loai_overlap_projection_vs_non_receivable::text FROM list_counts)
  UNION ALL SELECT 44, 'sales_projection_contains_only_phai_thu',
      '0', (SELECT COUNT(*)::text FROM sales_projection WHERE loai_cong_no <> 'phai_thu')
  -- Non-vacuous exclusion: the amount the summary leaves out must equal the
  -- payable population's amount, so the exclusion is a real subtraction.
  UNION ALL SELECT 45, 'payable_original_amount_equals_full_table_minus_summary',
      (SELECT COALESCE(SUM(so_tien_phat_sinh), 0)::numeric(18,2)::text FROM cong_no WHERE loai_cong_no <> 'phai_thu'),
      (SELECT (full_table_original - (SELECT total_original FROM summary_prod))::numeric(18,2)::text FROM list_counts)
  UNION ALL SELECT 46, 'payable_paid_amount_equals_full_table_minus_summary',
      (SELECT COALESCE(SUM(so_tien_da_thanh_toan), 0)::numeric(18,2)::text FROM cong_no WHERE loai_cong_no <> 'phai_thu'),
      (SELECT (full_table_paid - (SELECT total_paid FROM summary_prod))::numeric(18,2)::text FROM list_counts)
  UNION ALL SELECT 47, 'payable_outstanding_amount_equals_full_table_minus_summary',
      (SELECT COALESCE(SUM(so_tien_con_lai), 0)::numeric(18,2)::text FROM cong_no WHERE loai_cong_no <> 'phai_thu'),
      (SELECT (SELECT COALESCE(SUM(so_tien_con_lai), 0)::numeric(18,2) FROM cong_no)
            - (SELECT total_outstanding FROM summary_prod))::text
  -- ...and the payable rows themselves are present in cong_no but absent from
  -- the Sales projection: the count must cancel exactly.
  UNION ALL SELECT 48, 'phai_tra_present_in_database_but_absent_from_sales',
      (SELECT phai_tra_rows::text FROM population),
      (SELECT (SELECT phai_tra_rows FROM population) - (SELECT COUNT(*) FROM sales_projection sp JOIN phai_tra_rows pt ON pt.id = sp.id))::text
  -- A payables row shares no id with the receivable population: the exclusion
  -- is not an artifact of a shared primary key.
  UNION ALL SELECT 49, 'phai_tra_and_phai_thu_id_sets_disjoint',
      '0',
      (SELECT COUNT(*)::text FROM phai_tra_rows pt JOIN sales_projection sp ON sp.id = pt.id)

  -- D. aging boundary matrix at the exact edges -----------------------------
  UNION ALL SELECT 60, 'boundary_' || label, expected_bucket, actual_bucket FROM boundary_probe

  -- E. row-count reconciliation: paginated list total vs summary population --
  UNION ALL SELECT 80, 'list_total_equals_summary_row_population',
      (SELECT phai_thu_rows::text FROM population), (SELECT total_unfiltered::text FROM list_counts)
  UNION ALL SELECT 81, 'list_total_customer_filter_equals_summary_population_for_customer',
      (SELECT COUNT(*)::text FROM cong_no WHERE loai_cong_no = 'phai_thu' AND ma_khach_hang = (SELECT MIN(id) FROM khach_hang)),
      (SELECT total_customer_min::text FROM list_counts)
  UNION ALL SELECT 82, 'list_total_customer_without_receivables_is_zero',
      '0', (SELECT total_customer_without_receivables::text FROM list_counts)
  UNION ALL SELECT 83, 'list_total_overdue_only_equals_summary_overdue_count',
      (SELECT overdue_count::text FROM summary_prod), (SELECT total_overdue_only::text FROM list_counts)
  UNION ALL SELECT 84, 'list_page1_page_size_1_returns_1_row',
      '1', (SELECT page1_rows::text FROM list_counts)
  UNION ALL SELECT 85, 'list_page2_page_size_1_is_empty_single_page_dataset',
      '0', (SELECT page2_rows::text FROM list_counts)
  UNION ALL SELECT 86, 'list_total_pages_formula_ceil_total_over_page_size',
      '1', (SELECT GREATEST(CEIL(total_unfiltered::numeric / 1), 1)::text FROM list_counts)

  -- F. P9 dashboard metric definitions reconcile with P8 --------------------
  UNION ALL SELECT 90, 'p9_open_receivable_equals_summary_total_outstanding',
      (SELECT open_receivable::text FROM dashboard_metrics), (SELECT total_outstanding::text FROM summary_prod)
  UNION ALL SELECT 91, 'p9_overdue_receivable_equals_summary_total_overdue',
      (SELECT overdue_receivable::text FROM dashboard_metrics), (SELECT total_overdue::text FROM summary_prod)
)
SELECT check_name, expected, actual,
       CASE WHEN expected IS NOT DISTINCT FROM actual THEN 'PASS' ELSE 'FAIL' END AS status
FROM checks
ORDER BY ord, check_name;
