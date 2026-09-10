# P0 Business Rules and Interim Policies

**Status:** P0 incomplete. The rules below separate source-plan requirements from provisional implementation defaults. No stakeholder sign-off or live database execution evidence is present.

## Confirmed from the implementation plan/schema scope

- PostgreSQL remains the system of record; the browser never connects directly to it.
- Sales/CRM uses `nguoi_dung`, `khach_hang`, `san_pham`, `don_vi_tinh`, `don_ban_hang`, `chi_tiet_don_ban_hang`, `giao_hang`, `kho`, `hoa_don_ban_hang`, and receivable rows in `cong_no`.
- Customer statuses block new commercial activity for `tam_khoa` and `ngung_giao_dich`.
- Server-side validation, pricing, status transitions, audit derivation, and transactions are mandatory.
- Receivable queries must filter `loai_cong_no = 'phai_thu'`.
- Delivery completion must not deduct inventory in the MVP.
- The supplied schema has no delivery-detail or customer-payment-history table; the UI must not fabricate either history.

## Provisional defaults for implementation only

| Rule | Interim default | Why it is safe | Required approval/change |
|---|---|---|---|
| Product price | Ignore client price and use `san_pham.gia_ban` | Prevents price tampering and follows plan recommendation | Sales/finance approval for negotiated overrides |
| Tax | Keep policy injectable/configurable; do not silently choose a rate | Plan says tax policy is undecided; seed examples include 8% but are not policy | Finance must approve fixed/configurable/manual rule |
| Credit breach | Support explicit hard-block/warning mode configuration; default must be declared before confirm API goes live | Avoids hiding a material policy choice | Finance/sales approval |
| Production transition | Sales reads `dang_san_xuat`; no Production side effect | Production is out of MVP scope | Production/admin ownership approval |
| Invoice → receivable | Sales reads AR; no receivable insert until Accounting confirms ownership | Prevents duplicate ledger rows | Accounting ownership approval |
| Invoice count | Treat one invoice per order as provisional service rule only | Schema has no unique order FK constraint | Accounting approval for partial/multiple invoices |
| Delivery quantities | Header workflow only until P6 strategy is approved; if cumulative updates are later approved, persist only cumulative order-line quantity | Schema cannot preserve per-delivery detail | Warehouse/sales owner approval |
| Customer status | Admin/approved manager action; Sales reps read only | Protects credit controls | Sales/accounting/admin approval |

## Required invariants

1. Do not accept audit fields, status, totals, or authoritative price from the client.
2. Order creation inserts header and lines atomically; rollback leaves no orphan header.
3. `invoice.customer = order.customer`.
4. `order-line.product` exists and is sellable at creation.
5. `paid <= invoice total` and delivered quantity never exceeds ordered quantity.
6. No physical delete of customer, order, delivery, invoice, or receivable history.
7. Never expose `phai_tra` rows through Sales/CRM endpoints.
8. Preserve raw database statuses in API/domain code; translate only in display components.

## Decision gate

The following artifacts are required before P0 can be accepted: resolved owner/policy answers in `docs/decisions/open-questions.md`, runtime schema comparison, successful scoped-table SELECTs, and executed seed linkage evidence. Until then, P1 may only use explicitly marked technical defaults and must not implement unresolved financial or cross-module side effects.
