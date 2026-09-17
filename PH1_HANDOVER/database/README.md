# PH1 Sales — Database Stance

**No PH1-owned DDL exists.** `schema.sql` in this directory records that fact; `seed.sql` documents that PH1 adds no seed rows of its own.

- The integrated schema is byte-identical to Core's: `origin/develop:database/schema.sql` and the working copy resolve to the same git blob `aaae749b299139ff28b996bb75559c3766d4e2fc` (887 lines). Verified again for this handover; see `docs/ph1-remediation/DB_COMPATIBILITY_MATRIX.md` §"Exit Criteria Status".
- Every PH1 repository operation maps onto existing `erp_may10.public` tables — no additions, no type alterations, no migrations, no destructive statements.
- Sales-owned tables (writable): `khach_hang`, `don_ban_hang`, `chi_tiet_don_ban_hang`, `giao_hang`, `hoa_don_ban_hang`.
- Read-only for the module: `cong_no` (AR ledger, ruling R-2), `kho`, `san_pham`, `don_vi_tinh`.
- Frozen shared tables (`kho`, `vat_tu`, `lo_vat_tu`, `ton_kho`, `phieu_*` — BASELINE.md §4.2) are never written by the module; stock movements remain PH4's responsibility (`KNOWN_GAPS.md` G-5).
