# P3 — Customer Management

## Objective

Manage customer master data, transaction status, credit information, and commercial summary without loading whole tables into the browser.

## P3.1 — Query contract

GET /api/v1/customers supports:

- page and pageSize;
- search across ma_khach_hang, ten_khach_hang, so_dien_thoai, and ma_so_thue;
- loai_khach_hang;
- tinh_thanh_pho;
- trang_thai;
- whitelist-based sort and order.

The list response may include:

- display customer fields;
- order count when the aggregation query is approved;
- outstanding receivable when cong_no access is approved;
- pagination metadata.

Never build SQL by concatenating user query values; whitelist fields and sort directions.

## P3.2 — Backend customer core

### Endpoints

- GET /api/v1/customers
- POST /api/v1/customers
- GET /api/v1/customers/:id
- PATCH /api/v1/customers/:id
- PATCH /api/v1/customers/:id/status
- GET /api/v1/customers/:id/summary

### Create

- Accept ten_khach_hang, loai_khach_hang, ma_so_thue, so_dien_thoai, email, dia_chi, tinh_thanh_pho, nguoi_lien_he, han_muc_cong_no, so_ngay_cong_no, and ghi_chu.
- Generate ma_khach_hang on the backend.
- Normalize email and phone.
- Validate the loai_khach_hang enum.
- Validate non-negative credit limit and credit days.
- Initialize trang_thai = hoat_dong.
- Set nguoi_tao and ngay_tao on the server.

### Update

- Allow only whitelisted business fields.
- Do not allow a normal PATCH to edit code, audit fields, or status.
- Set nguoi_cap_nhat and ngay_cap_nhat.
- Never physically delete a customer.

### Status

- hoat_dong: new orders are allowed.
- tam_khoa: readable, but new orders are blocked.
- ngung_giao_dich: all new commercial transactions are blocked; history remains visible.
- The status action requires permission and an audit/log reason if policy requires it.

## P3.3 — Customer detail and summary

Show:

- identity, tax code, contact, and address;
- type, credit limit, credit days, and status;
- created and updated dates;
- total orders, total order value, unpaid invoices, outstanding receivable, and overdue receivable.

Orders, Invoices, and Receivables tabs must use server-side APIs. Do not display fake data when a dependent module is not ready.

## P3.4 — Frontend

- CustomerListPage: search, filters, sorting, pagination, loading, empty, error, and refresh.
- CustomerCreatePage: React Hook Form + Zod, inline errors, disabled submit while saving.
- CustomerDetailPage: overview, summary cards, and tabs.
- CustomerEditPage: preserve immutable fields.
- Status action with confirmation dialog and feedback.
- Shared money, date, and status components.

## P3.5 — Tests

### Backend

- list pagination and each filter;
- search by customer code, name, phone, and tax code;
- valid creation;
- invalid enum, email, required field, and negative credit;
- duplicate business code;
- update audit fields;
- status transition and permission;
- summary includes only phai_thu receivables.

### Frontend

- form validation;
- server errors;
- pagination/filter query keys;
- status action hidden or blocked by permission;
- detail does not issue unnecessary queries before a tab is opened.

## P3 exit criteria

- CRUD and filters work with seed data and an empty database.
- A tam_khoa or ngung_giao_dich customer cannot create a new order.
- Audit fields never come from the client.
- Summary does not load whole tables.
- API documentation and test evidence exist.

## Suggested commit slices

- feat: add customer repository and list contract
- feat: add customer create update status
- feat: add customer detail and summary
- feat: add customer screens and filters
- test: cover customer business rules

