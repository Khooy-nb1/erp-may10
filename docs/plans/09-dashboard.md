# P9 — Dashboard

## Objective

Display commercial metrics with clear definitions and reconciliation against order, invoice, and receivable data.

## P9.0 — Metric dictionary

Agree on metrics before coding:

- total order value: SUM tong_thanh_toan for non-huy orders;
- order count: COUNT orders under the active filter;
- pending/confirmed/in-production/delivered/cancelled: COUNT by status;
- open receivable: SUM so_tien_con_lai where loai_cong_no = phai_thu;
- overdue receivable: outstanding > 0 and past due date;
- unpaid invoice: invoice not fully paid;
- revenue chart: choose invoice total or order total and label the source clearly.

Do not use one word, revenue, for two different data sources.

## P9.1 — Backend APIs

- GET /api/v1/dashboard/summary
- GET /api/v1/dashboard/revenue
- GET /api/v1/dashboard/order-status
- GET /api/v1/dashboard/top-customers
- GET /api/v1/dashboard/top-products

Shared filters:

- current month;
- current quarter;
- current year;
- custom fromDate/toDate;
- salesperson;
- customer type.

## P9.2 — Query rules

- Aggregate in PostgreSQL.
- Use explicit date boundaries.
- Exclude cancelled records from sales metrics when policy requires it.
- Top customers use SUM tong_thanh_toan.
- Top products join chi_tiet_don_ban_hang with san_pham.
- Return small result sets, not raw transaction rows.
- Add timeout and slow-query logging.

## P9.3 — Frontend

- KPI cards.
- Revenue chart.
- Order-status chart.
- Top-customer table.
- Top-product table.
- Date filter and refresh.
- Independent loading skeletons; one failed widget must not break the whole dashboard.
- Empty state when no data exists.

## P9.4 — Reconciliation tests

- Summary order count matches an independent query.
- Total order value excludes huy orders when policy requires it.
- Revenue label matches its data source.
- Receivable total matches P8.
- Top customer/product results match a small fixture.
- Date filters are timezone-correct.

## P9 exit criteria

- The dashboard reflects new transactions after the correct query invalidation.
- Metric definitions are documented.
- The API meets the practical target on representative data or has bottleneck evidence.
- No production chart uses mock data.

## Suggested commit slices

- feat: add dashboard aggregate queries
- feat: add dashboard API filters
- feat: add dashboard widgets
- test: reconcile dashboard metrics

