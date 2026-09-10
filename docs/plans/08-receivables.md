# P8 — Accounts Receivable

## Objective

Read and aggregate customer receivables, including outstanding, overdue, and aging data, without turning this module into a payment/accounting module.

## P8.0 — Ownership

- Query cong_no only where loai_cong_no = phai_thu.
- If Accounting owns payment updates, Sales is read-only.
- Do not fabricate payment history.
- Do not expose phai_tra in Sales/CRM APIs.

## P8.1 — Endpoints

- GET /api/v1/receivables
- GET /api/v1/receivables/summary
- GET /api/v1/receivables/aging
- GET /api/v1/customers/:id/receivables

Filters:

- customer;
- invoice;
- status;
- due date;
- overdue;
- page, pageSize, and sort.

List response:

- customer;
- invoice;
- original amount;
- paid amount;
- outstanding amount;
- due date;
- days overdue;
- status.

## P8.2 — Business calculations

- outstanding = so_tien_con_lai;
- overdue applies only when outstanding > 0 and now > ngay_dao_han;
- days overdue uses the business timezone;
- aging buckets:
  - Current;
  - 1–30;
  - 31–60;
  - 61–90;
  - 90+.

Aggregate in PostgreSQL; do not send large raw result sets to React.

## P8.3 — Frontend

- ReceivableListPage with filters, sorting, and pagination.
- Summary cards: original, collected, outstanding, overdue, overdue customers/invoices.
- Aging report.
- Receivables tab on customer detail.
- Clearly read-only for roles without payment permissions.

## P8.4 — Tests

- phai_thu is returned and phai_tra is excluded;
- open, partial, paid, and overdue cases;
- aging boundaries 0/1/30/31/60/61/90/91;
- customer filter;
- pagination;
- summary reconciles with the list;
- admin, ke_toan, ban_hang read, and kho denied permissions.

## P8 exit criteria

- Customer receivables are visible from both the list and detail page.
- Outstanding and overdue totals can be independently reconciled with SQL.
- No payment write path exists without ownership approval.
- Large datasets remain server-side.

## Suggested commit slices

- feat: add receivable queries and filters
- feat: add receivable summary and aging
- feat: add receivable screens and customer tab
- test: cover receivable calculations

