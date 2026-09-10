# P5 — Sales Order Management

## Objective

Implement the MVP core: multi-line orders, server-side pricing, editing of pending orders, confirmation/cancellation, credit checks, and delivery progress display.

This is the largest phase; do not merge it into one commit.

## P5.0 — Required decision gates

Do not close this phase until these questions are answered:

- tax policy;
- whether price overrides are allowed or san_pham.gia_ban is always used;
- whether a credit-limit breach is a warning or hard block;
- who moves da_xac_nhan to dang_san_xuat;
- whether a confirmed order may be cancelled.

Safe technical defaults, subject to approval:

- the backend uses san_pham.gia_ban;
- the credit warning/block behavior is explicit configuration;
- the production transition belongs to an external module or a manual admin action;
- no side effect is sent to Production or Inventory.

## P5.1 — Domain contract

### Endpoints

- GET /api/v1/sales-orders
- POST /api/v1/sales-orders
- GET /api/v1/sales-orders/:id
- PATCH /api/v1/sales-orders/:id
- POST /api/v1/sales-orders/:id/confirm
- POST /api/v1/sales-orders/:id/cancel

### List filters

- order code;
- customer;
- salesperson;
- status;
- fromDate/toDate;
- requested delivery date;
- sort by total/order date;
- pagination.

### Create input

- customerId;
- orderDate;
- requestedDeliveryDate;
- deliveryAddress;
- notes;
- lines: productId, quantity, discountRate, note.

The client is not authoritative for line price, line total, order total, status, or audit fields.

## P5.2 — Validation and pricing

### Validation

- customer exists and is allowed to transact;
- order date and requested delivery date are required;
- delivery date is not before order date;
- at least one line;
- product exists and is sellable;
- quantity > 0;
- discount is between 0 and 100;
- delivery address is not empty.

### Formula

- grossLine = quantity × serverUnitPrice
- discountLine = grossLine × discountRate / 100
- netLine = grossLine − discountLine
- tong_tien_hang = sum of grossLine
- tien_giam_gia = sum of discountLine
- tong_thanh_toan = tong_tien_hang − tien_giam_gia + tien_thue

Tax is calculated only after the P0 policy is approved. Use decimal-safe arithmetic; never use floating point for authoritative money.

## P5.3 — Atomic creation

Transaction:

1. Validate the request.
2. Load the authenticated user.
3. Read or lock the customer as required.
4. Validate customer status.
5. Load all products with one query.
6. Recalculate every line.
7. Generate a unique ma_don_ban.
8. Insert don_ban_hang.
9. Insert chi_tiet_don_ban_hang rows.
10. Commit.

Any failure rolls back everything. A header without lines must never remain.

## P5.4 — Read and edit

- Detail returns header, customer, lines, and progress.
- List uses server-side pagination; never filter in React.
- PATCH allows only fields valid for the current state.

| State | Editable |
|---|---|
| cho_xac_nhan | customer, date, address, lines, quantity, discount, note |
| da_xac_nhan | delivery date, address, note if policy allows |
| dang_san_xuat | No commercial line changes |
| da_giao | Read-only |
| huy | Read-only |

Every PATCH recalculates on the server and handles concurrency conflicts when needed.

## P5.5 — State actions

Valid transitions:

- cho_xac_nhan → da_xac_nhan through confirm;
- cho_xac_nhan → huy through cancel;
- da_xac_nhan → dang_san_xuat only after ownership is decided;
- da_xac_nhan → huy if policy allows;
- dang_san_xuat → da_giao only when delivery is fully complete;
- da_giao and huy are terminal.

Action endpoints do not accept arbitrary status values in the body. Each action has its own permission and business error.

Cancellation:

- accepts a reason;
- stores the reason in ghi_chu for MVP;
- writes audit fields;
- never deletes the order or its lines.

## P5.6 — Credit control

Before confirmation:

- currentOutstanding = SUM(cong_no.so_tien_con_lai) where loai_cong_no = phai_thu;
- projectedExposure = currentOutstanding + tong_thanh_toan;
- compare with khach_hang.han_muc_cong_no.

For warning mode, the response must clearly state the breach and require acknowledgement. For hard-block mode, return CUSTOMER_CREDIT_LIMIT_EXCEEDED. Do not implement an approval workflow without a schema.

## P5.7 — Frontend

- SalesOrderListPage with filters, pagination, status, and progress.
- SalesOrderCreatePage with customer selector, line editor, and totals preview.
- Product line add/remove and quantity/discount validation.
- Delivery address defaults from the customer but remains editable.
- SalesOrderDetailPage with state- and permission-aware actions.
- Edit page locks fields according to state.
- Confirm/cancel uses confirmation and displays business errors.
- Client preview may calculate totals, but the UI refreshes from server totals after save.

## P5.8 — Tests

### Unit

- pricing, discount, and tax;
- code-generation retry;
- state transitions;
- credit exposure;
- date validation.

### Repository/integration

- list filters;
- rollback after line-insert failure;
- multi-line order;
- duplicate request/concurrency;
- inactive customer;
- missing/stopped product;
- quantity and discount boundaries.

### Acceptance

An order is accepted when customer, products, quantities, discounts, and dates are valid; the server recalculates money; header and lines commit atomically; and the sales/audit user is recorded.

Confirmation is accepted when the order is pending, the user has permission, the customer remains active, and the credit policy passes.

## P5 exit criteria

- The full order lifecycle before delivery works.
- Commercial values cannot be edited in locked states.
- No partial order remains after a transaction failure.
- Database totals match the backend calculator.
- UI and API both enforce permission.

## Suggested commit slices

- feat: add sales order read model and contracts
- feat: add server pricing calculator
- feat: add atomic order creation
- feat: add order edit and state actions
- feat: add credit control
- feat: add sales order screens
- test: cover order lifecycle and rollback

