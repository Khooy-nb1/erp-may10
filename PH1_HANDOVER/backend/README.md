# PH1 Sales — Backend Module Map

| Path | Role |
|---|---|
| `backend/src/routes/salesRoutes.js` | Root router mounted at `/api/v1/sales` (approved seam: `backend/src/app.js`) |
| `backend/src/routes/sales/*.routes.js` | Per-resource routers: customers, products, orders, deliveries, invoices, receivables, overview (dashboard) |
| `backend/src/services/sales/*.service.js` | Business logic: validation, pricing, state machines, credit policy, invoice issuance, scope masking, receivable reads |
| `backend/src/repositories/sales/*.repository.js` | Parameterized SQL over `erp_may10.public`; writes stay inside sales-owned tables |
| `backend/src/utils/sales/*.js` | `pricing` (roundHalfUp + totals), `response`/`errorBoundary` (contract §9.3), `validate`, `errors`, `identity`, `logger` |
| `backend/src/config/sales.js` | Module policy switches: `TAX_RATE`, `CREDIT_LIMIT_MODE` (defaults match PH1: 0, `warning`) |

Ownership rules:

- Writes only to `khach_hang`, `don_ban_hang`, `chi_tiet_don_ban_hang`, `giao_hang`, `hoa_don_ban_hang`.
- Reads `kho`, `san_pham`, `don_vi_tinh` read-only; the AR ledger `cong_no` is read-only (ruling R-2).
- No PH4/PH5 table is written, no Core middleware/config file is modified, no `zod`/`jsonwebtoken` dependency.

Verification: `PH1_HANDOVER/TEST_REPORT.md`, suites under `backend/tests/`.
