# P0 State Transition Matrix

**Status:** P0 contract draft; policy-dependent rows remain provisional until stakeholder owners confirm them. Database values are preserved exactly as supplied in the schema comments.

## Customer (`khach_hang.trang_thai`)

| Actor | Action | Previous state | Conditions | Next state | Rejection |
|---|---|---|---|---|---|
| Admin / approved manager | Activate | `tam_khoa` or `ngung_giao_dich` | Business owner approves reactivation | `hoat_dong` | `AUTH_FORBIDDEN` / `CUSTOMER_NOT_FOUND` |
| Admin / approved manager | Suspend | `hoat_dong` | Reason/audit policy satisfied | `tam_khoa` | `AUTH_FORBIDDEN` / `CUSTOMER_NOT_FOUND` |
| Admin / approved manager | Close trading | `hoat_dong` or `tam_khoa` | Reason/audit policy satisfied | `ngung_giao_dich` | `AUTH_FORBIDDEN` / `CUSTOMER_NOT_FOUND` |
| Any order creator | Create/confirm order | `tam_khoa` or `ngung_giao_dich` | Not allowed | unchanged | `CUSTOMER_INACTIVE` |

## Sales order (`don_ban_hang.trang_thai`)

| Actor | Action | Previous state | Conditions | Next state | Rejection |
|---|---|---|---|---|---|
| `ban_hang` / admin | Create | none | Active customer, valid lines/products/dates | `cho_xac_nhan` | validation/business error |
| `ban_hang` / admin | Confirm | `cho_xac_nhan` | Permission, active customer, credit policy passes/acknowledged | `da_xac_nhan` | `ORDER_INVALID_STATE`, `CUSTOMER_INACTIVE`, `CUSTOMER_CREDIT_LIMIT_EXCEEDED` |
| `ban_hang` / admin (provisional) | Cancel | `cho_xac_nhan` | Reason supplied; policy permits | `huy` | `ORDER_INVALID_STATE` |
| Approved owner / admin | Cancel confirmed | `da_xac_nhan` | Explicit cancellation policy permits; reason supplied | `huy` | `ORDER_INVALID_STATE` |
| Production owner / admin (provisional) | Mark production | `da_xac_nhan` | Production ownership confirmed | `dang_san_xuat` | `AUTH_FORBIDDEN` / `ORDER_INVALID_STATE` |
| Approved delivery policy owner | Complete order | `dang_san_xuat` | Only after Q11 approves cumulative quantities and every line has `da_giao_du` | `da_giao`; set actual delivery time | `ORDER_INVALID_STATE` |
| Any actor | Edit commercial lines | `cho_xac_nhan` | Permission and valid recalculation | same state | `ORDER_INVALID_STATE` |
| Any actor | Edit commercial lines | `da_xac_nhan`, `dang_san_xuat`, `da_giao`, `huy` | Not allowed | unchanged | `ORDER_INVALID_STATE` |

Terminal states: `da_giao`, `huy`. Never physically delete an order or its lines.

## Delivery (`giao_hang.trang_thai`)

| Actor | Action | Previous state | Conditions | Next state | Rejection |
|---|---|---|---|---|---|
| `kho` / admin (Sales create is provisional) | Create | none | Valid non-cancelled order, warehouse, receiver, address, date | `cho_giao` | validation/business error |
| `kho` / admin | Complete delivery header | `dang_giao` | Header completion permitted; no inventory side effect; does not update order lines or order status while Q11 is unresolved | `da_giao` | `DELIVERY_INVALID_STATE` |
| `kho` / admin | Fail | `dang_giao` | Failure reason policy satisfied | `that_bai` | `DELIVERY_INVALID_STATE` |
| Any actor | Start/complete/fail | `da_giao` or `that_bai` | Terminal/read-only under MVP | unchanged | `DELIVERY_INVALID_STATE` |

Line quantities and order completion remain closed until Q11 is approved. If enabled, enforce `so_luong_giao <= so_luong` and derive `chua_giao` / `giao_mot_phan` / `da_giao_du`.

## Sales invoice (`hoa_don_ban_hang.trang_thai`)

The invoice status is derived, not client-selected.

| Actor | Action | Previous state | Conditions | Next state | Rejection |
|---|---|---|---|---|---|
| `ke_toan` / admin (provisional) | Create invoice | none | Order/customer match; invoice policy permits order state; due date derived | `chua_thanh_toan`, unless paid/status calculation says otherwise | `INVOICE_INVALID_ORDER`, `INVOICE_ALREADY_EXISTS`, validation error |
| Accounting owner | Record cumulative payment | `chua_thanh_toan` / `thanh_toan_mot_phan` / `qua_han` | `0 <= paid <= total`; payment ownership confirmed | `thanh_toan_mot_phan`, `da_thanh_toan`, or `qua_han` by derived rules | `AUTH_FORBIDDEN` / validation error |
| Status calculator | Any unpaid invoice | any non-paid state | `paid < total` and past due | `qua_han` | N/A |
| Status calculator | Any invoice | any state | `paid >= total` | `da_thanh_toan` | N/A |

`cong_no` uses `mot_phan`, not `thanh_toan_mot_phan`; its creation/update owner is unresolved. Sales must filter receivables to `loai_cong_no = 'phai_thu'`.

## P0 gate

This matrix is not stakeholder sign-off. Resolve provisional actors, cancellation policy, invoice timing/count, credit mode, and delivery quantity strategy before closing P0 or exposing irreversible mutation endpoints.
