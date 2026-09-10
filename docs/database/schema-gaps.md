# P0 Schema Gaps and Compatibility Notes

**Status:** P0 incomplete / blocked. Findings are static observations from `backend/database/schema.sql` and `backend/database/seed_updated.sql`; no live PostgreSQL comparison was run.

## Confirmed static gaps

1. **No delivery detail table.** `giao_hang` is a header only. There is no `chi_tiet_giao_hang`, so exact products and quantities per delivery cannot be reconstructed. MVP may expose cumulative `chi_tiet_don_ban_hang.so_luong_giao` only after the delivery policy is approved; it must not fabricate per-delivery history.
2. **No customer payment transaction table.** Sales invoice and receivable tables store cumulative paid amounts. There is no customer receipt/payment history table. UI/API must not claim installment or payment-timeline support.
3. **Shared receivable table.** `cong_no` stores both `phai_thu` and `phai_tra`; every Sales query must filter `loai_cong_no = 'phai_thu'`. The seed contains both kinds of rows.
4. **Partial-status spelling differs.** Invoice status uses `thanh_toan_mot_phan`; receivable status uses `mot_phan`. Domain code must preserve each database value.
5. **No database-enforced enum types.** Status and role values are VARCHAR values documented in SQL comments. Runtime validation must be explicit, and live data may contain values not represented in comments.
6. **No automatic audit-update trigger is defined in the supplied SQL.** Services must set `nguoi_cap_nhat` and `ngay_cap_nhat` on updates.
7. **No unique constraint is visible for one invoice per order.** Any one-to-one invoice policy requires service-level conflict handling or an approved schema change; do not infer uniqueness from the foreign key.
8. **Order totals are not cross-checked against line totals by a database constraint.** The backend must recalculate and persist authoritative totals.
9. **`cong_no.ma_hoa_don` is not declared as a foreign key in the supplied schema.** Receivable/invoice consistency must be validated by the owning service and verified in runtime checks.
10. **Warehouse stock is modeled around `ma_vat_tu`, while deliveries reference `ma_kho` and sales products use `ma_san_pham`.** Delivery completion must not silently deduct inventory in the Sales MVP.

## Seed observations requiring runtime verification

- Seed order 1 links customer 1, product line 1, delivery 1, invoice 1, and AR row 1 by IDs.
- Seed order 2 links customer 2 and product line 2 but has no seeded delivery/invoice/AR row.
- Seed invoice 1 status is `thanh_toan_mot_phan`; its linked receivable row status is `mot_phan`.
- Seed row 2 in `cong_no` is `phai_tra` and must never appear in Sales/CRM receivable results.
- Seed uses explicit IDs followed by `setval(...)` and `ON CONFLICT (id) DO NOTHING`; reseeding behavior must be tested in an isolated database.

These are file-level observations, not proof that the seed can be loaded into the current database.

## No schema change in P0

Do not add delivery detail, payment history, audit history, approval workflow, or other tables during MVP foundation. Any addition requires an explicit ownership/schema decision, reviewed migration, and compatibility check against the existing ERP.

## Blocked checks

Still missing: reachable development PostgreSQL credentials/instance; schema-vs-database comparison; one successful SELECT per scoped table; seed load result; and executed linkage/invariant results. P0 cannot be accepted until those artifacts exist.
