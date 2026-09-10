# P7 — Invoice Management

## Objective

Create and view sales invoices linked to the correct order/customer, calculate due dates in the backend, and derive payment status from actual amounts.

## P7.0 — Decision gates

- Who owns creation of cong_no?
- Is an invoice created after confirmation or after delivery?
- May one order have multiple invoices?
- Are partial invoices allowed?
- Which roles may create invoices: ke_toan, admin, or ban_hang?

If Accounting owns cong_no, P7 only creates invoices and reads receivables. It must not create duplicate receivables.

## P7.1 — Endpoints

- GET /api/v1/invoices
- POST /api/v1/invoices
- GET /api/v1/invoices/:id

Filters:

- invoice code;
- order;
- customer;
- issue date;
- due date;
- status;
- page, pageSize, and sort.

## P7.2 — Create invoice

Transaction:

1. Validate the request.
2. Load order and customer.
3. Confirm that invoice customer matches order customer.
4. Validate order state and invoice policy.
5. Determine the invoiceable amount.
6. Calculate due date = issue date + customer.so_ngay_cong_no.
7. Generate a unique ma_hoa_don.
8. Insert hoa_don_ban_hang.
9. If Sales owns receivables, insert a phai_thu cong_no row in the same transaction.
10. Commit.

Any failure rolls back.

Do not accept status from the client. Validate:

- total >= 0;
- paid >= 0;
- paid <= total.

## P7.3 — Payment status

Derive in the backend:

- paid = 0 and not overdue → chua_thanh_toan;
- 0 < paid < total and not overdue → thanh_toan_mot_phan;
- paid >= total → da_thanh_toan;
- paid < total and overdue → qua_han.

The actual database enum must match the schema. If seed data uses mot_phan instead of thanh_toan_mot_phan, record the mapping in P0 and do not silently change the database.

## P7.4 — Frontend

- InvoiceListPage with filters and pagination.
- Create action from order detail according to permission/policy.
- InvoiceDetailPage shows order, customer, dates, before-tax, tax, total, paid, outstanding, and status.
- Do not show payment transaction history because the current schema has no history table.
- Show an overdue warning when appropriate.

## P7.5 — Tests

- valid invoice;
- missing order;
- customer mismatch;
- duplicate invoice according to policy;
- due-date calculation;
- paid > total;
- overdue/partial/paid status;
- rollback when cong_no insertion fails;
- role permissions.

## P7 exit criteria

- Every invoice is linked to the correct customer/order.
- Due date and status are backend-derived.
- cong_no ownership cannot create duplicates.
- The UI does not claim to support payment history without database support.
- API documentation and test evidence exist.

## Suggested commit slices

- feat: add invoice read model and validation
- feat: add invoice creation transaction
- feat: add invoice status and due date
- feat: add invoice screens
- test: cover invoice and receivable ownership

