# ERP Sales & Customer Management — Master Implementation Plan

**Project:** ERP Sales & Customer Management Module  
**Frontend:** React.js + TypeScript + Astryx  
**Backend:** Node.js + TypeScript + Express  
**Database:** Existing local PostgreSQL database  
**Source of truth:** Existing `schema.sql` and `seed_updated.sql`  
**Document purpose:** Technical implementation blueprint for Product, Frontend, Backend, Database, QA, and Delivery teams

---

## 1. Executive Summary

This document defines a complete implementation plan for building the **Sales** and **Customer Management** modules of the ERP system using the existing PostgreSQL schema.

The goal is not to rebuild the entire ERP. The application will use only the database tables required to support the target business flow:

> Customer → Sales Order → Sales Order Lines → Delivery → Sales Invoice → Accounts Receivable

The system will be implemented as a modular web application with:

- a React.js + TypeScript frontend;
- Astryx as the UI/design-system layer;
- a Node.js + TypeScript backend;
- REST APIs;
- PostgreSQL as the existing system of record;
- role-based access control;
- transactional business operations;
- server-side validation and monetary calculation;
- reporting/dashboard capabilities;
- audit fields based on the schema already provided.

The implementation should remain compatible with future ERP modules such as Production, Warehouse, Purchasing, and Accounting, but those modules are not part of the first delivery unless explicitly required.

---

# 2. Project Goals

## 2.1 Primary Goals

The solution must allow authorized ERP users to:

1. Sign in securely.
2. View a sales dashboard.
3. Search, filter, create, edit, and review customers.
4. Manage customer credit-related information.
5. Browse active products.
6. Create sales orders with one or more products.
7. Calculate order values correctly.
8. Confirm, track, cancel, and complete sales orders.
9. Manage deliveries linked to sales orders.
10. Create and review sales invoices.
11. Review customer receivables.
12. View a full customer commercial history.
13. Apply role-based permissions.
14. Maintain audit information for created and updated records.
15. Support server-side pagination, filtering, and reporting.

## 2.2 Secondary Goals

The system should also:

- provide a clean ERP-oriented UI;
- support large datasets without loading all records into the browser;
- keep business logic in the backend, not in React;
- avoid modifying unrelated ERP tables;
- avoid coupling Sales directly to Production, Purchasing, or Accounting internals;
- support future integration without requiring a major rewrite.

## 2.3 Non-Goals for the Initial Version

The following capabilities should not be included in the initial scope unless they become explicit requirements:

- production planning;
- bill of materials;
- material requirements planning;
- purchasing;
- supplier management;
- raw-material stock control;
- warehouse stock valuation;
- accounting journal posting;
- general ledger;
- production costing;
- financial statements;
- supplier payments;
- advanced CRM campaign automation;
- e-commerce checkout;
- customer self-service portal.

---

# 3. Source Database Scope

The existing ERP schema contains many tables. The Sales and Customer Management application should use only the subset required for its business responsibilities.

## 3.1 Core Tables

| Table | Required | Responsibility |
|---|---:|---|
| `nguoi_dung` | Yes | Authentication, user identity, role, salesperson reference, audit references |
| `khach_hang` | Yes | Customer master data |
| `san_pham` | Yes | Product catalog used when creating sales orders |
| `don_vi_tinh` | Recommended | Product unit display |
| `don_ban_hang` | Yes | Sales order header |
| `chi_tiet_don_ban_hang` | Yes | Sales order line items |
| `giao_hang` | Yes | Delivery header and delivery workflow |
| `kho` | Yes for delivery | Delivery warehouse reference |
| `hoa_don_ban_hang` | Yes | Sales invoice |
| `cong_no` | Recommended | Customer accounts receivable |

## 3.2 Tables Explicitly Out of Scope

The first implementation should not directly depend on:

- `nha_cung_cap`
- `vat_tu`
- `ke_hoach_san_xuat`
- `dinh_muc_nguyen_lieu`
- `lenh_san_xuat`
- `cong_doan_san_xuat`
- `yeu_cau_mua_hang`
- `nhu_cau_npl`
- `chi_tiet_yeu_cau_mua`
- `don_mua_hang`
- `chi_tiet_don_mua`
- `hoa_don_nha_cung_cap`
- `thanh_toan_ncc`
- `danh_gia_ncc`
- material lot tables;
- raw-material inventory tables;
- accounting journal tables;
- financial report tables;
- product costing tables.

These tables may remain in the database because other ERP modules use them. The Sales backend simply does not need repositories or APIs for them.

---

# 4. Recommended Module Boundary

The application should be treated as one ERP bounded context containing the following internal modules:

```text
Authentication
│
├── Dashboard
│
├── Customer Management
│   ├── Customer Master Data
│   ├── Customer Order History
│   ├── Customer Invoice History
│   └── Customer Receivables
│
├── Product Lookup
│
├── Sales Order Management
│   ├── Order Header
│   ├── Order Lines
│   ├── Pricing
│   └── Order Workflow
│
├── Delivery Management
│
├── Sales Invoice Management
│
└── Accounts Receivable View
```

The backend may expose these as independent route modules, but they should share the same PostgreSQL connection pool and transaction infrastructure.

---

# 5. Data Model

## 5.1 Main Relationship Model

```text
nguoi_dung
    │
    │ salesperson / creator / updater
    ▼
don_ban_hang
    │
    ├───────────────> khach_hang
    │
    ├───────────────> chi_tiet_don_ban_hang
    │                        │
    │                        └──────────────> san_pham
    │                                              │
    │                                              └──> don_vi_tinh
    │
    ├───────────────> giao_hang ────────────────> kho
    │
    └───────────────> hoa_don_ban_hang
                             │
                             └──────────────> khach_hang

khach_hang
    │
    └───────────────> cong_no
```

## 5.2 Customer Entity

Primary table:

```text
khach_hang
```

Important fields:

- `id`
- `ma_khach_hang`
- `ten_khach_hang`
- `loai_khach_hang`
- `ma_so_thue`
- `so_dien_thoai`
- `email`
- `dia_chi`
- `tinh_thanh_pho`
- `nguoi_lien_he`
- `han_muc_cong_no`
- `so_ngay_cong_no`
- `ghi_chu`
- `trang_thai`
- `ngay_tao`
- `ngay_cap_nhat`
- `nguoi_tao`
- `nguoi_cap_nhat`

Supported customer types from the provided schema:

```text
ca_nhan
to_chuc
dai_ly
xuat_khau
```

Supported customer statuses:

```text
hoat_dong
tam_khoa
ngung_giao_dich
```

## 5.3 Sales Order Entity

Primary table:

```text
don_ban_hang
```

Important fields:

- `id`
- `ma_don_ban`
- `ma_khach_hang`
- `ngay_dat_hang`
- `ngay_giao_hang_yc`
- `ngay_giao_thuc_te`
- `dia_chi_giao_hang`
- `tong_tien_hang`
- `tien_thue`
- `tien_giam_gia`
- `tong_thanh_toan`
- `nguoi_ban`
- `trang_thai`
- `ghi_chu`
- audit fields.

Supported states:

```text
cho_xac_nhan
da_xac_nhan
dang_san_xuat
da_giao
huy
```

## 5.4 Sales Order Line Entity

Primary table:

```text
chi_tiet_don_ban_hang
```

Important fields:

- `ma_don_ban_hang`
- `ma_san_pham`
- `so_luong`
- `don_gia`
- `ty_le_giam_gia`
- `thanh_tien`
- `so_luong_giao`
- `ghi_chu`
- `trang_thai`

Supported delivery status values:

```text
chua_giao
giao_mot_phan
da_giao_du
```

## 5.5 Delivery Entity

Primary table:

```text
giao_hang
```

Important fields:

- `ma_giao_hang`
- `ma_don_ban_hang`
- `ma_kho`
- `ngay_giao`
- `ten_nguoi_nhan`
- `dia_chi_giao`
- `phuong_tien_van_chuyen`
- `nguoi_giao_hang`
- `ghi_chu`
- `trang_thai`

Supported delivery states:

```text
cho_giao
dang_giao
da_giao
that_bai
```

## 5.6 Sales Invoice Entity

Primary table:

```text
hoa_don_ban_hang
```

Important fields:

- `ma_hoa_don`
- `ma_don_ban_hang`
- `ma_khach_hang`
- `ngay_xuat_hoa_don`
- `ngay_dao_han`
- `tong_tien_truoc_thue`
- `tien_thue`
- `tong_tien_sau_thue`
- `so_tien_da_thu`
- `trang_thai`
- `ghi_chu`

Supported invoice statuses:

```text
chua_thanh_toan
thanh_toan_mot_phan
da_thanh_toan
qua_han
```

## 5.7 Accounts Receivable Entity

The existing `cong_no` table supports both payables and receivables.

The Sales/CRM module must only use receivable rows:

```sql
WHERE loai_cong_no = 'phai_thu'
```

Relevant fields:

- `ma_khach_hang`
- `ma_hoa_don`
- `bang_hoa_don`
- `so_tien_phat_sinh`
- `so_tien_da_thanh_toan`
- `so_tien_con_lai`
- `ngay_dao_han`
- `trang_thai`

---

# 6. Important Schema Constraints and Known Limitations

## 6.1 Delivery Line Limitation

The provided schema contains `giao_hang` as a delivery header but does not contain a dedicated sales-product delivery detail table such as:

```text
chi_tiet_giao_hang
```

Therefore, the existing model cannot precisely answer:

> Which products and quantities were included in delivery GH-XXXX?

The order-line field `chi_tiet_don_ban_hang.so_luong_giao` exists, but its mutation is a policy choice rather than an active MVP contract.

### Interim MVP Strategy — blocked by Q11

Until the delivery owner approves whole-order versus cumulative line quantities:

- keep delivery headers in `giao_hang`;
- implement header list/create/start/complete/fail only;
- do not update cumulative `so_luong_giao`;
- do not derive line delivery status or order completion from a delivery header;
- do not fabricate per-delivery line history.

### Conditional future strategy

If Q11 approves cumulative quantities, the service may update `so_luong_giao`, derive line delivery status, and derive order completion transactionally under the approved rules. A production-grade delivery history would still require an approved `chi_tiet_giao_hang` extension.

This extension should only be added after confirmation that modifying the existing ERP schema is permitted.

### Recommended Future Extension

For a production-grade delivery history, add:

```text
chi_tiet_giao_hang
```

with fields such as:

```text
id
ma_giao_hang
ma_chi_tiet_don_ban_hang
ma_san_pham
so_luong_giao
ghi_chu
ngay_tao
nguoi_tao
```

This extension should only be added after confirmation that modifying the existing ERP schema is permitted.

## 6.2 Customer Payment History Limitation

The schema contains:

```text
hoa_don_ban_hang.so_tien_da_thu
cong_no.so_tien_da_thanh_toan
```

but no dedicated customer receipt/payment history table.

Therefore, the current database can represent cumulative payment values but not a complete payment timeline.

For MVP, support:

- outstanding amount;
- cumulative paid amount;
- invoice payment status;
- due date;
- overdue status.

Do not claim to support full payment transaction history unless a new table is introduced.

---

# 7. Target Architecture

## 7.1 High-Level Architecture

```text
┌──────────────────────────────────────────────┐
│                 WEB CLIENT                   │
│                                              │
│ React.js                                     │
│ TypeScript                                   │
│ Astryx                                       │
│ React Router                                 │
│ TanStack Query                               │
│ React Hook Form                              │
│ Zod                                          │
└──────────────────────┬───────────────────────┘
                       │
                       │ HTTPS / JSON / REST
                       ▼
┌──────────────────────────────────────────────┐
│                 NODE.JS API                  │
│                                              │
│ Express                                      │
│ TypeScript                                   │
│ Zod                                          │
│ JWT authentication                           │
│ RBAC                                         │
│ Service layer                                │
│ Repository layer                             │
│ PostgreSQL transactions                      │
└──────────────────────┬───────────────────────┘
                       │
                       │ SQL
                       ▼
┌──────────────────────────────────────────────┐
│              EXISTING POSTGRESQL             │
│                                              │
│ Existing ERP schema                          │
│ No browser-to-database connection            │
└──────────────────────────────────────────────┘
```

## 7.2 Architectural Principles

1. React must never connect directly to PostgreSQL.
2. Business logic belongs in backend services.
3. SQL belongs in repositories or query modules.
4. Controllers should only coordinate HTTP concerns.
5. Every mutation must validate authorization.
6. Every critical multi-table mutation must use a database transaction.
7. Monetary values must be recalculated by the server.
8. Client-provided status values must not be trusted.
9. Audit values must be populated from authenticated identity.
10. Existing ERP tables outside scope must remain untouched.

---

# 8. Repository Structure

A monorepo is recommended.

```text
erp-sales-crm/
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── contracts/
│   ├── eslint-config/
│   └── tsconfig/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   └── decisions/
│
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

If the team prefers separate repositories, the same logical structure can be maintained independently.

---

# 9. Frontend Technical Plan

## 9.1 Frontend Stack

Recommended stack:

```text
React.js
TypeScript
Vite
Astryx
React Router
TanStack Query
React Hook Form
Zod
date-fns or equivalent
```

Optional additions:

```text
TanStack Table
Recharts or equivalent
```

Use the Astryx system for the visual component layer and pin the selected package version in `package.json`.

## 9.2 Frontend Folder Structure

```text
apps/web/src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   ├── providers.tsx
│   └── query-client.ts
│
├── components/
│   ├── layout/
│   ├── data-table/
│   ├── forms/
│   ├── feedback/
│   ├── status/
│   └── typography/
│
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── customers/
│   ├── products/
│   ├── sales-orders/
│   ├── deliveries/
│   ├── invoices/
│   └── receivables/
│
├── hooks/
├── lib/
│   ├── api/
│   ├── auth/
│   ├── format/
│   └── validation/
│
├── types/
├── constants/
└── main.tsx
```

## 9.3 Feature Folder Pattern

Example:

```text
features/customers/
├── api/
│   ├── customer.api.ts
│   └── customer.keys.ts
├── components/
│   ├── CustomerForm.tsx
│   ├── CustomerTable.tsx
│   └── CustomerStatusBadge.tsx
├── hooks/
│   ├── useCustomers.ts
│   └── useCustomer.ts
├── pages/
│   ├── CustomerListPage.tsx
│   ├── CustomerCreatePage.tsx
│   ├── CustomerDetailPage.tsx
│   └── CustomerEditPage.tsx
├── schemas/
│   └── customer.schema.ts
└── types/
    └── customer.types.ts
```

## 9.4 Application Routes

```text
/login

/dashboard

/customers
/customers/new
/customers/:customerId
/customers/:customerId/edit

/products

/sales-orders
/sales-orders/new
/sales-orders/:orderId
/sales-orders/:orderId/edit

/deliveries
/deliveries/:deliveryId

/invoices
/invoices/:invoiceId

/receivables

/admin/users
```

`/admin/users` should only be included if user administration is part of the requested scope.

---

# 10. Application Shell

## 10.1 Sidebar

Recommended navigation:

```text
ERP Sales & CRM

Overview
  Dashboard

Sales
  Sales Orders
  Deliveries
  Sales Invoices

Customers
  Customer List
  Receivables

Catalog
  Products

Administration
  Users
```

The Administration section should be permission-controlled.

## 10.2 Header

The application header should contain:

- breadcrumb;
- current page title;
- global search if required;
- current user name;
- department;
- role;
- profile/logout menu.

## 10.3 Responsive Strategy

The ERP is desktop-first.

Recommended breakpoints:

- desktop: full sidebar + tables;
- tablet: collapsible sidebar;
- mobile: limited support for lookup and approval flows.

Complex order-entry tables should remain optimized for desktop usage.

---

# 11. Dashboard Module

## 11.1 Dashboard Purpose

Provide immediate visibility into commercial operations.

## 11.2 KPI Cards

Recommended cards:

- total sales order value;
- order count;
- pending confirmation orders;
- confirmed orders;
- production-status orders;
- completed/delivered orders;
- cancelled orders;
- open receivables;
- overdue receivables;
- unpaid invoices.

## 11.3 Charts

Recommended charts:

### Revenue by Month

Source can be based on:

- sales invoice value for accounting-oriented reporting; or
- sales order total for order-intake reporting.

The UI must label which metric is being shown.

### Order Status Distribution

Group `don_ban_hang` by `trang_thai`.

### Top Customers

Recommended metric:

```text
SUM(don_ban_hang.tong_thanh_toan)
```

excluding cancelled orders.

### Top Products

Join:

```text
chi_tiet_don_ban_hang
→ san_pham
```

and aggregate quantity or sales value.

## 11.4 Dashboard Filters

Support:

- current month;
- current quarter;
- current year;
- custom date range;
- salesperson;
- customer type.

---

# 12. Customer Management Module

## 12.1 Customer List

Required capabilities:

- server-side pagination;
- search by customer code;
- search by customer name;
- search by phone;
- optional search by tax code;
- filter by customer type;
- filter by city/province;
- filter by status;
- sort by created date;
- sort by customer name;
- sort by credit limit.

Recommended columns:

```text
Customer Code
Customer Name
Type
Contact Person
Phone
City
Credit Limit
Credit Days
Status
Sales Order Count
Outstanding Receivable
Actions
```

The final two fields may be computed by backend aggregation rather than stored directly.

## 12.2 Create Customer

Fields:

```text
ten_khach_hang
loai_khach_hang
ma_so_thue
so_dien_thoai
email
dia_chi
tinh_thanh_pho
nguoi_lien_he
han_muc_cong_no
so_ngay_cong_no
ghi_chu
```

Recommended behavior:

- generate `ma_khach_hang` on the server;
- validate required fields;
- normalize email;
- normalize phone spacing;
- validate non-negative credit limit;
- validate non-negative credit days;
- initialize `trang_thai = hoat_dong`.

## 12.3 Customer Detail Page

Recommended tabs:

```text
Overview
Sales Orders
Invoices
Receivables
```

### Overview

Show:

- business identity;
- tax code;
- contact details;
- billing/delivery address;
- customer classification;
- credit limit;
- credit days;
- account status;
- created date;
- last updated date.

### Commercial Summary

Show:

- total order count;
- total order value;
- unpaid invoice count;
- outstanding receivable;
- overdue receivable;
- latest order date.

### Sales Orders Tab

Server query filtered by `ma_khach_hang`.

### Invoices Tab

Server query filtered by `ma_khach_hang`.

### Receivables Tab

Server query:

```sql
WHERE ma_khach_hang = $1
  AND loai_cong_no = 'phai_thu'
```

## 12.4 Customer Status Rules

### `hoat_dong`

- can create new orders;
- can edit normal customer information.

### `tam_khoa`

- existing records remain readable;
- block new sales orders;
- show reason if the product later adds status-reason support.

### `ngung_giao_dich`

- block all new commercial transactions;
- keep historical orders and invoices visible.

---

# 13. Product Lookup Module

The Sales module does not need full product master administration unless explicitly requested.

## 13.1 Product List

Read-only view with:

```text
Product Code
Product Name
Size
Color
Sales Price
Unit
Status
```

## 13.2 Product Selector

Order-entry selector should support:

- search by `ma_san_pham`;
- search by `ten_san_pham`;
- size;
- color;
- current selling price.

Only products valid for sale should normally be selectable.

---

# 14. Sales Order Management

## 14.1 Sales Order List

Required functions:

- server-side pagination;
- search by order code;
- filter by customer;
- filter by salesperson;
- filter by status;
- date-range filter;
- delivery-request date filter;
- sort by order date;
- sort by total value.

Recommended columns:

```text
Order Code
Customer
Order Date
Requested Delivery Date
Salesperson
Item Count
Order Total
Delivery Progress
Status
Actions
```

## 14.2 Create Sales Order

The page should contain three areas.

### A. Customer Information

Fields:

- customer selector;
- order date;
- requested delivery date;
- delivery address;
- notes.

Default delivery address can be initialized from customer address but must remain editable.

### B. Product Lines

For every row:

```text
Product
Quantity
Unit
Unit Price
Discount %
Line Total
Note
Remove
```

### C. Order Summary

Display:

```text
Gross Merchandise Value
Discount
Tax
Grand Total
```

## 14.3 Server-Side Pricing

The frontend is allowed to calculate a preview.

The backend is authoritative.

The backend must load product data from `san_pham` and calculate the final values.

Recommended formulas:

```text
grossLine = quantity × unitPrice

discountLine =
grossLine × discountRate / 100

netLine =
grossLine - discountLine
```

Then:

```text
tong_tien_hang = Σ grossLine
tien_giam_gia = Σ discountLine
tong_thanh_toan =
tong_tien_hang
- tien_giam_gia
+ tien_thue
```

The exact tax calculation policy must be agreed with the business owner.

If the frontend sends `don_gia`, the backend should either:

- ignore it and use current product price; or
- treat it as a proposed negotiated price and validate it through a pricing policy.

For the initial implementation, using `san_pham.gia_ban` as the server-authoritative price is the safest option.

---

# 15. Sales Order Transaction Design

Creating an order must be atomic.

Pseudo-flow:

```text
BEGIN

1. Validate request structure.
2. Load authenticated user.
3. Validate customer.
4. Ensure customer status allows ordering.
5. Load all referenced products.
6. Ensure every product exists.
7. Ensure every product is sellable.
8. Validate quantities.
9. Validate discount percentages.
10. Calculate each line.
11. Calculate order totals.
12. Generate unique order code.
13. INSERT don_ban_hang.
14. INSERT chi_tiet_don_ban_hang rows.
15. COMMIT.
```

On failure:

```text
ROLLBACK
```

A partially created order must never exist.

---

# 16. Sales Order State Machine

The backend should define a state machine rather than accept free-form status changes.

Recommended transitions using the provided statuses:

```text
cho_xac_nhan
    │
    ├── confirm ─────────────> da_xac_nhan
    │
    └── cancel ──────────────> huy

da_xac_nhan
    │
    ├── production-start ────> dang_san_xuat
    └── cancel ──────────────> huy

dang_san_xuat
    │
    └── fully-delivered ─────> da_giao

da_giao
    └── terminal

huy
    └── terminal
```

Because Production is outside this module, the Sales application should not implement production internals.

For MVP, transition into `dang_san_xuat` can be:

- manual for authorized users; or
- read-only if another module controls it.

The chosen approach should be a configuration/business decision.

---

# 17. Sales Order Edit Rules

Recommended rules:

### `cho_xac_nhan`

Allow:

- customer change;
- requested delivery date change;
- address change;
- line add/remove;
- quantity update;
- discount update;
- notes.

### `da_xac_nhan`

Allow only limited fields such as:

- requested delivery date;
- delivery address;
- notes.

Do not allow silent commercial value changes after confirmation.

### `dang_san_xuat`

Block commercial line changes.

### `da_giao`

Read-only.

### `huy`

Read-only.

---

# 18. Order Cancellation

Cancellation should be implemented as a business action:

```http
POST /api/v1/sales-orders/:id/cancel
```

Request body:

```json
{
  "reason": "Customer requested cancellation"
}
```

The current schema has `ghi_chu` but no dedicated cancellation reason field.

For MVP:

- append or store the cancellation reason in `ghi_chu`;
- change `trang_thai` to `huy`;
- update audit fields.

For a production-grade system, a dedicated status-history table is recommended later.

---

# 19. Credit Control

Customer master data contains:

```text
han_muc_cong_no
so_ngay_cong_no
```

These fields should actively influence the sales workflow.

## 19.1 Outstanding Receivable Calculation

```text
currentOutstanding =
SUM(cong_no.so_tien_con_lai)
WHERE:
  loai_cong_no = 'phai_thu'
  AND ma_khach_hang = customerId
```

## 19.2 Projected Exposure

At order confirmation:

```text
projectedExposure =
currentOutstanding + newOrderTotal
```

Compare:

```text
projectedExposure
>
khach_hang.han_muc_cong_no
```

## 19.3 Credit Policy Options

### Option A — Warning Only

Salesperson may continue after acknowledgement.

### Option B — Hard Block

Order cannot be confirmed.

### Option C — Approval Required

Best long-term ERP behavior, but the current schema does not contain a dedicated credit-approval workflow table.

For the first implementation, use either Option A or Option B based on business preference.

---

# 20. Delivery Management

## 20.1 Delivery List

Filters:

- delivery code;
- order code;
- customer;
- warehouse;
- delivery date;
- status.

Columns:

```text
Delivery Code
Order Code
Customer
Warehouse
Delivery Date
Receiver
Transport
Status
Actions
```

## 20.2 Create Delivery

Required fields:

```text
ma_don_ban_hang
ma_kho
ngay_giao
ten_nguoi_nhan
dia_chi_giao
phuong_tien_van_chuyen
nguoi_giao_hang
ghi_chu
```

Server-generated:

```text
ma_giao_hang
trang_thai
ngay_tao
nguoi_tao
```

## 20.3 Delivery Workflow

```text
cho_giao
   │
   └── start ─────> dang_giao
                       │
                       ├── complete ───> da_giao
                       └── fail ───────> that_bai
```

The backend must reject illegal transitions.

## 20.4 Order Delivery Completion (Q11-conditional)

The interim MVP strategy is header-only. Until Q11 approves whole-order versus cumulative line quantities, delivery completion must not update `chi_tiet_don_ban_hang.so_luong_giao`, recalculate line delivery statuses, or transition the sales order to `da_giao`.

If Q11 approves cumulative delivery quantities, apply the following transactional rules:

When cumulative delivery quantity reaches the order-line quantity:

```text
chi_tiet_don_ban_hang.trang_thai
=
da_giao_du
```

When:

```text
0 < so_luong_giao < so_luong
```

use:

```text
giao_mot_phan
```

When:

```text
so_luong_giao = 0
```

use:

```text
chua_giao
```

If every order line is fully delivered:

```text
don_ban_hang.trang_thai = da_giao
don_ban_hang.ngay_giao_thuc_te = NOW()
```

The current delivery schema limitation and the Q11 approval must be checked before enabling these line and order mutations.

---

# 21. Sales Invoice Management

## 21.1 Invoice List

Filters:

- invoice code;
- order;
- customer;
- issue date;
- due date;
- status.

Columns:

```text
Invoice Code
Order
Customer
Issue Date
Due Date
Before Tax
Tax
Total
Paid
Outstanding
Status
```

## 21.2 Create Invoice

Recommended flow:

```text
1. Validate order exists.
2. Validate order customer.
3. Determine invoiceable amount.
4. Calculate due date.
5. Generate invoice code.
6. Insert hoa_don_ban_hang.
7. Optionally create matching cong_no record.
8. Commit.
```

## 21.3 Due Date

Recommended calculation:

```text
ngay_dao_han =
ngay_xuat_hoa_don
+ khach_hang.so_ngay_cong_no
```

The backend must own this calculation.

## 21.4 Invoice Status Calculation

Recommended rules:

```text
if paid == 0 and now <= dueDate
    chua_thanh_toan

if 0 < paid < total and now <= dueDate
    thanh_toan_mot_phan

if paid >= total
    da_thanh_toan

if paid < total and now > dueDate
    qua_han
```

Do not trust a client-supplied invoice status.

---

# 22. Accounts Receivable Module

## 22.1 Receivables List

Query only:

```text
loai_cong_no = phai_thu
```

Columns:

```text
Customer
Invoice
Original Amount
Paid Amount
Outstanding Amount
Due Date
Days Overdue
Status
```

## 22.2 Receivable KPIs

Recommended:

- total original receivables;
- total collected;
- total outstanding;
- total overdue;
- overdue customer count;
- overdue invoice count.

## 22.3 Aging Buckets

Optional report:

```text
Current
1–30 days overdue
31–60 days overdue
61–90 days overdue
90+ days overdue
```

This can be calculated at query time.

---

# 23. Authentication

## 23.1 Login

Endpoint:

```http
POST /api/v1/auth/login
```

Input:

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

Backend:

```text
1. Load nguoi_dung by email.
2. Verify trang_thai.
3. Compare password hash.
4. Issue access token.
5. Return user profile and permissions.
```

## 23.2 Current User

```http
GET /api/v1/auth/me
```

Return only safe user fields.

Never return:

```text
mat_khau
```

## 23.3 Token Model

Recommended:

- short-lived access token;
- refresh-token mechanism if required;
- secure storage strategy;
- revoke or deny users with inactive status.

---

# 24. Authorization / RBAC

Roles in the existing data should be interpreted carefully because the full ERP contains users from several departments.

A practical permission model for this module:

| Capability | admin | ban_hang | kho | ke_toan |
|---|:---:|:---:|:---:|:---:|
| View dashboard | Yes | Yes | Limited | Limited |
| View customers | Yes | Yes | No | Yes |
| Create customer | Yes | Yes | No | No |
| Edit customer | Yes | Yes | No | Limited |
| View orders | Yes | Yes | Limited | Yes |
| Create order | Yes | Yes | No | No |
| Edit draft/pending order | Yes | Yes | No | No |
| Confirm order | Yes | Yes | No | No |
| Cancel order | Yes | Yes | No | No |
| View deliveries | Yes | Yes | Yes | No |
| Create/update delivery | Yes | Limited | Yes | No |
| View invoices | Yes | Yes | No | Yes |
| Create invoice | Yes | No/Optional | No | Yes |
| View receivables | Yes | Read | No | Yes |

The final matrix must be confirmed with business stakeholders.

---

# 25. Backend Technical Plan

## 25.1 Stack

Recommended:

```text
Node.js
TypeScript
Express
Zod
pg
Pino
JWT library
bcrypt
```

A lightweight query builder such as Kysely can be used, but raw `pg` with a strict repository layer is also suitable.

Because the database already exists, avoid tooling that assumes it owns the schema unless it is configured in introspection/read-only migration mode.

## 25.2 Backend Structure

```text
apps/api/src/
├── config/
│   ├── env.ts
│   ├── database.ts
│   └── logger.ts
│
├── middleware/
│   ├── auth.middleware.ts
│   ├── permission.middleware.ts
│   ├── request-id.middleware.ts
│   ├── validate.middleware.ts
│   └── error.middleware.ts
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── customers/
│   ├── products/
│   ├── sales-orders/
│   ├── deliveries/
│   ├── invoices/
│   ├── receivables/
│   └── dashboard/
│
├── shared/
│   ├── database/
│   ├── errors/
│   ├── pagination/
│   ├── responses/
│   ├── security/
│   └── utils/
│
├── app.ts
└── server.ts
```

## 25.3 Module Structure

Example:

```text
sales-orders/
├── sales-order.routes.ts
├── sales-order.controller.ts
├── sales-order.service.ts
├── sales-order.repository.ts
├── sales-order.schema.ts
├── sales-order.mapper.ts
├── sales-order.types.ts
└── sales-order.constants.ts
```

---

# 26. Backend Layer Responsibilities

## Controller

Responsible for:

- reading HTTP params/query/body;
- accessing authenticated user context;
- calling service;
- returning HTTP response.

Must not contain:

- SQL;
- pricing logic;
- state-machine logic;
- transaction orchestration.

## Service

Responsible for:

- business validation;
- permissions beyond route-level checks;
- state transitions;
- monetary calculations;
- transaction orchestration;
- coordination of repositories.

## Repository

Responsible for:

- SQL;
- row mapping;
- query filters;
- pagination;
- database persistence.

## Schema/Validator

Responsible for:

- request-body validation;
- query validation;
- enum validation;
- field ranges.

---

# 27. Database Connection Strategy

Use one shared PostgreSQL connection pool.

Example environment:

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=erp_may10
DB_USER=postgres
DB_PASSWORD=change_me

JWT_SECRET=change_me
JWT_EXPIRES_IN=15m
```

Rules:

- never create a new physical connection per request;
- configure pool limits;
- set query timeout;
- log slow queries;
- close pool gracefully on shutdown.

---

# 28. API Design

Base path:

```text
/api/v1
```

## 28.1 Authentication

```text
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me
```

## 28.2 Customers

```text
GET    /customers
POST   /customers
GET    /customers/:id
PATCH  /customers/:id
PATCH  /customers/:id/status

GET    /customers/:id/orders
GET    /customers/:id/invoices
GET    /customers/:id/receivables
GET    /customers/:id/summary
```

## 28.3 Products

```text
GET    /products
GET    /products/:id
```

## 28.4 Sales Orders

```text
GET    /sales-orders
POST   /sales-orders
GET    /sales-orders/:id
PATCH  /sales-orders/:id

POST   /sales-orders/:id/confirm
POST   /sales-orders/:id/cancel
POST   /sales-orders/:id/mark-production
```

`mark-production` should only exist if Sales is responsible for that transition.

## 28.5 Deliveries

```text
GET    /deliveries
POST   /deliveries
GET    /deliveries/:id

POST   /deliveries/:id/start
POST   /deliveries/:id/complete
POST   /deliveries/:id/fail
```

## 28.6 Invoices

```text
GET    /invoices
POST   /invoices
GET    /invoices/:id
```

## 28.7 Receivables

```text
GET    /receivables
GET    /receivables/summary
GET    /receivables/aging
```

## 28.8 Dashboard

```text
GET    /dashboard/summary
GET    /dashboard/revenue
GET    /dashboard/order-status
GET    /dashboard/top-customers
GET    /dashboard/top-products
```

---

# 29. API Response Contract

## Success

```json
{
  "success": true,
  "data": {},
  "message": null,
  "meta": null
}
```

## Paginated Success

```json
{
  "success": true,
  "data": [],
  "message": null,
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 125,
    "totalPages": 7
  }
}
```

## Error

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ORDER_INVALID_STATE",
    "message": "The sales order cannot be edited in its current state.",
    "details": null
  }
}
```

---

# 30. Recommended Business Error Codes

```text
AUTH_INVALID_CREDENTIALS
AUTH_ACCOUNT_INACTIVE
AUTH_UNAUTHORIZED
AUTH_FORBIDDEN

CUSTOMER_NOT_FOUND
CUSTOMER_INACTIVE
CUSTOMER_CREDIT_LIMIT_EXCEEDED

PRODUCT_NOT_FOUND
PRODUCT_NOT_SELLABLE

ORDER_NOT_FOUND
ORDER_INVALID_STATE
ORDER_INVALID_DELIVERY_DATE
ORDER_EMPTY
ORDER_INVALID_QUANTITY
ORDER_INVALID_DISCOUNT

DELIVERY_NOT_FOUND
DELIVERY_INVALID_STATE
DELIVERY_QUANTITY_EXCEEDED

INVOICE_NOT_FOUND
INVOICE_INVALID_ORDER
INVOICE_ALREADY_EXISTS

RECEIVABLE_NOT_FOUND

VALIDATION_ERROR
DATABASE_CONFLICT
INTERNAL_ERROR
```

---

# 31. Pagination and Filtering

Never load an entire ERP table and filter it in React.

Example:

```http
GET /api/v1/sales-orders?page=1&pageSize=20&status=cho_xac_nhan&customerId=1
```

Recommended generic query parameters:

```text
page
pageSize
search
sort
order
fromDate
toDate
```

Module-specific filters should be added explicitly.

Maximum `pageSize` should be capped, for example:

```text
100
```

---

# 32. Search Strategy

## Customers

Search over:

```text
ma_khach_hang
ten_khach_hang
so_dien_thoai
ma_so_thue
```

## Products

Search over:

```text
ma_san_pham
ten_san_pham
```

## Sales Orders

Search primarily by:

```text
ma_don_ban
```

and optionally joined customer fields.

## Invoices

Search by:

```text
ma_hoa_don
```

---

# 33. Index Review

The provided schema already includes useful indexes for:

- customer code;
- customer type;
- order code;
- order customer;
- salesperson;
- order status;
- order-line order reference;
- order-line product reference;
- delivery order;
- delivery warehouse;
- invoice order;
- invoice customer;
- customer receivables.

During implementation, do not add speculative indexes.

Add indexes only after:

1. real query shapes are implemented;
2. `EXPLAIN ANALYZE` shows a problem;
3. expected table size justifies the change.

Potential future composite indexes may include:

```text
don_ban_hang(trang_thai, ngay_dat_hang)
don_ban_hang(ma_khach_hang, ngay_dat_hang)
hoa_don_ban_hang(ma_khach_hang, ngay_xuat_hoa_don)
cong_no(ma_khach_hang, loai_cong_no, trang_thai)
```

These are recommendations, not part of the supplied schema.

---

# 34. Audit Handling

Many tables already contain:

```text
ngay_tao
ngay_cap_nhat
nguoi_tao
nguoi_cap_nhat
```

The backend must populate them.

Do not accept these values from the frontend.

## Create

```text
nguoi_tao = authenticatedUser.id
```

## Update

```text
nguoi_cap_nhat = authenticatedUser.id
ngay_cap_nhat = NOW()
```

The schema default for `ngay_cap_nhat` does not by itself guarantee automatic update on later modifications, so application-level updates should explicitly set it unless a database trigger exists outside the supplied schema.

---

# 35. Code Generation for Business Identifiers

Identifiers include:

```text
KH...
DBH...
GH...
HDBH...
```

Recommended approach:

- generate on backend;
- guarantee uniqueness with the database unique constraint;
- never calculate the next ID by `COUNT(*) + 1`.

Possible format:

```text
KH-2026-000001
DBH-2026-000001
GH-2026-000001
HDBH-2026-000001
```

A safe sequence-generation strategy should be selected.

If schema modification is not allowed, the service can generate candidates and retry on unique conflict.

---

# 36. Date and Time Handling

The database uses timestamp-with-time-zone fields.

Application rules:

- exchange API timestamps in ISO 8601;
- keep database time zone behavior consistent with the existing ERP;
- render times in the business timezone;
- avoid browser-local ambiguous string parsing;
- define whether date-only business fields should be displayed without time.

Examples:

```text
Order Date
Requested Delivery Date
Actual Delivery Date
Invoice Issue Date
Invoice Due Date
Delivery Date
```

---

# 37. Money Handling

Database fields use numeric values.

Rules:

- do not use JavaScript floating-point calculations blindly for authoritative financial values;
- calculate monetary values in the backend using a decimal-safe approach;
- return money as strings or clearly defined decimal values if needed;
- format in the UI;
- preserve two decimal places at persistence boundaries.

UI example:

```text
476000000.00
→ 476,000,000 ₫
```

The exact locale formatting can be Vietnamese while the application source code remains English.

---

# 38. Validation Rules

## Customer

```text
ten_khach_hang required
loai_khach_hang valid enum
so_dien_thoai required
dia_chi required
tinh_thanh_pho required
han_muc_cong_no >= 0
so_ngay_cong_no >= 0
email valid if provided
```

## Sales Order

```text
customer required
order date required
requested delivery date required
requested delivery date >= order date
delivery address required
at least one line required
quantity > 0
discount between 0 and 100
```

## Delivery

```text
order required
warehouse required
delivery date required
receiver required
delivery address required
valid delivery transition
```

## Invoice

```text
order required
customer must match order customer
issue date required
due date >= issue date
total >= 0
paid >= 0
paid <= total
```

---

# 39. Frontend Form Strategy

Use:

```text
React Hook Form
+
Zod
```

The frontend schema improves UX but does not replace backend validation.

Forms must include:

- inline errors;
- required-field indicator;
- disabled submit while saving;
- duplicate-submit protection;
- unsaved-change warning;
- server error display;
- keyboard accessibility.

---

# 40. Data Fetching Strategy

Use TanStack Query.

Suggested keys:

```text
["customers", filters]
["customer", customerId]
["customer-summary", customerId]

["products", filters]

["sales-orders", filters]
["sales-order", orderId]

["deliveries", filters]
["delivery", deliveryId]

["invoices", filters]
["invoice", invoiceId]

["receivables", filters]

["dashboard", filters]
```

After mutations, invalidate only relevant keys.

Example after order creation:

```text
["sales-orders"]
["dashboard"]
["customer-summary", customerId]
["customer", customerId]
```

---

# 41. ERP Table UX Standard

Every major list page should support:

- search;
- filters;
- server-side sorting;
- pagination;
- loading skeleton;
- empty state;
- error state;
- retry;
- refresh;
- row actions;
- status badges;
- sticky table header where appropriate.

Optional:

- column visibility;
- saved filters;
- CSV export.

---

# 42. Customer Detail UX

Recommended layout:

```text
┌─────────────────────────────────────────────────────┐
│ KH001 — Customer Name                  [Active]     │
│ [Edit Customer]                                    │
├─────────────────────────────────────────────────────┤
│ Total Orders | Total Sales | Outstanding | Overdue │
├─────────────────────────────────────────────────────┤
│ Overview | Orders | Invoices | Receivables         │
└─────────────────────────────────────────────────────┘
```

---

# 43. Sales Order Detail UX

Recommended sections:

```text
Header
  Order code
  Status
  Customer
  Salesperson
  Dates

Actions
  Edit
  Confirm
  Cancel
  Create Delivery
  Create Invoice

Tabs
  Overview
  Products
  Deliveries
  Invoices
```

Display the state history only if a history source exists. Do not fabricate one from `ngay_cap_nhat`.

---

# 44. Delivery Detail UX

Show:

```text
Delivery Code
Sales Order
Customer
Warehouse
Delivery Date
Receiver
Address
Transport
Delivery Person
Status
Notes
```

Actions depend on state:

```text
cho_giao:
    Start Delivery
    Edit

dang_giao:
    Complete
    Mark Failed

da_giao:
    Read-only

that_bai:
    Read-only or create another delivery
```

---

# 45. Invoice Detail UX

Show:

```text
Invoice Code
Order
Customer
Issue Date
Due Date

Before Tax
Tax
Total
Paid
Outstanding

Payment Status
Notes
```

If payment history does not exist in the database, do not display a fake transaction history section.

---

# 46. Security Requirements

## 46.1 HTTP Security

Use:

- Helmet;
- strict CORS allowlist;
- request size limits;
- secure cookie configuration if cookies are used;
- HTTPS in deployed environments.

## 46.2 Authentication Security

- bcrypt password verification;
- rate-limit login;
- generic invalid-credential messages;
- deny locked/inactive accounts;
- short-lived tokens;
- secure refresh flow if implemented.

## 46.3 SQL Security

Always use parameterized queries.

Correct:

```sql
SELECT *
FROM khach_hang
WHERE id = $1;
```

Never concatenate user input into SQL.

## 46.4 Sensitive Logging

Never log:

- password;
- password hash;
- JWT;
- refresh token;
- Authorization header;
- database password.

---

# 47. Logging and Observability

Use structured logs.

Every request should include:

```text
requestId
method
path
status
duration
userId if authenticated
```

Business mutations should log meaningful events:

```text
customer.created
sales_order.created
sales_order.confirmed
sales_order.cancelled
delivery.created
delivery.completed
invoice.created
```

Do not log full sensitive payloads by default.

---

# 48. Error Handling

Global error middleware should classify:

```text
ValidationError        → 400
AuthenticationError    → 401
AuthorizationError     → 403
NotFoundError          → 404
ConflictError          → 409
BusinessRuleError      → 422
UnexpectedError        → 500
```

Database constraint errors should be mapped into understandable API errors.

---

# 49. Concurrency

ERP mutations can be concurrent.

Critical operations should use transactions and, where required, row locking.

Examples:

- two users confirming the same order;
- invoice creation race;
- credit-limit validation with concurrent orders.

**Q11-conditional example, skipped while the interim header-only delivery strategy is active:**

- simultaneous delivery completion that updates cumulative quantity.

For sensitive workflows, use patterns such as:

```sql
SELECT ...
FOR UPDATE
```

inside transactions where justified.

---

# 50. Invoice and Receivable Consistency

If invoice creation also creates a receivable:

```text
BEGIN

INSERT hoa_don_ban_hang

INSERT cong_no (
    loai_cong_no = 'phai_thu',
    ma_khach_hang,
    ma_hoa_don,
    bang_hoa_don = 'hoa_don_ban_hang',
    ...
)

COMMIT
```

If either fails:

```text
ROLLBACK
```

The accounting team should confirm whether `cong_no` is automatically managed elsewhere before Sales begins writing to it.

If another module owns receivables, Sales should only read it.

---

# 51. Integration Ownership Decisions

Before implementation, explicitly decide ownership for:

## Order → Production Status

Who changes:

```text
da_xac_nhan
→ dang_san_xuat
```

Options:

- Sales module;
- Production module;
- manual admin action.

## Invoice → Receivable

Who creates `cong_no`?

Options:

- Sales/Invoice service;
- Accounting module.

## Delivery → Inventory

Does completing a delivery trigger stock movement?

The current Sales scope should not implement inventory deduction unless warehouse integration is explicitly requested.

These decisions prevent duplicate side effects across ERP modules.

---

# 52. Testing Strategy

## 52.1 Unit Tests

Focus on:

- pricing;
- discount;
- tax calculation;
- credit-limit calculation;
- status transitions;
- invoice status;
- receivable aging;
- date rules.

## 52.2 Repository Tests

Verify:

- filters;
- joins;
- pagination;
- aggregation;
- insert/update behavior.

## 52.3 Integration Tests

Run API against a dedicated PostgreSQL test database.

Core scenarios:

```text
login
create customer
edit customer
create sales order
confirm order
cancel order
create delivery
update delivery state
create invoice
read receivable
dashboard metrics
```

## 52.4 Authorization Tests

Test every route with:

- unauthenticated user;
- `ban_hang`;
- `kho`;
- `ke_toan`;
- `admin`.

## 52.5 Transaction Failure Tests

Simulate failure after header insert but before line insert.

Expected:

```text
no partial record remains
```

## 52.6 E2E Tests

Minimum workflow:

```text
Login
→ Create Customer
→ Create Sales Order
→ Confirm
→ Create Delivery
→ Complete Delivery
→ Create Invoice
→ Review Customer Receivable
```

---

# 53. Mandatory Business Test Cases

## Customer

- valid customer creation;
- duplicate code conflict;
- invalid email;
- negative credit limit;
- negative credit days;
- block order for suspended customer.

## Sales Order

- create one-line order;
- create multi-line order;
- quantity zero;
- negative quantity;
- discount > 100;
- discount < 0;
- nonexistent product;
- stopped product;
- delivery date before order date;
- customer not active;
- edit pending order;
- edit delivered order;
- invalid status transition;
- cancel pending order;
- cancel confirmed order;
- cancel delivered order should fail.

## Delivery

- create delivery header;
- start delivery;
- complete delivery header;
- fail delivery;
- complete already-completed delivery;
- invalid warehouse;
- **Q11-conditional:** cumulative delivered quantity exceeds ordered quantity (skipped while the interim header-only strategy is active).

## Invoice

- valid invoice;
- customer mismatch;
- invalid due date;
- paid > invoice total;
- overdue calculation;
- partial-payment status.

## Receivable

- open receivable;
- partially paid receivable;
- fully paid receivable;
- overdue receivable;
- aging buckets.

---

# 54. Performance Targets

Initial practical targets:

- normal list API: p95 under 500 ms on local/company network;
- detail API: p95 under 300 ms for normal data volume;
- dashboard: p95 under 1 second where feasible;
- initial page rendering should avoid blocking on non-critical widgets.

These are engineering targets, not guarantees.

Actual targets should be refined after representative data volume is known.

---

# 55. Local Development

Recommended commands:

```text
pnpm install
pnpm dev
```

or equivalent package manager.

Run:

```text
Web: localhost:5173
API: localhost:3000
PostgreSQL: localhost:5432
```

Recommended developer environment:

```text
Node LTS
PostgreSQL client
VS Code
Git
pnpm
```

---

# 56. Environment Strategy

Environments:

```text
development
test
staging
production
```

Each environment must have independent configuration.

Never commit:

```text
.env
database passwords
JWT secrets
```

Provide:

```text
.env.example
```

---

# 57. Database Migration Policy

Because the PostgreSQL schema already exists:

1. Treat the existing schema as externally owned.
2. Do not automatically run destructive ORM migrations.
3. Do not rename existing tables or columns.
4. Do not alter unrelated modules.
5. Use SQL migration scripts only for explicitly approved additions.
6. Review every production migration manually.

If an ORM is used, prefer schema introspection.

---

# 58. Seed Data Strategy

The provided seed already contains examples for:

- users;
- customers;
- products;
- sales orders;
- sales order lines;
- deliveries;
- sales invoices;
- receivables.

Use this data for:

- initial UI development;
- demo environments;
- integration tests after appropriate test isolation.

Do not assume seed IDs in production logic.

---

# 59. API Documentation

Use OpenAPI documentation.

Recommended URL:

```text
/api/docs
```

Every endpoint should document:

- authentication requirement;
- permissions;
- query parameters;
- body schema;
- success response;
- validation errors;
- business errors;
- example payloads.

---

# 60. Definition of Done for Each Feature

A feature is complete only when:

- backend endpoint exists;
- backend validation exists;
- permission check exists;
- frontend screen exists;
- loading state exists;
- empty state exists;
- error state exists;
- success feedback exists;
- unit/integration tests pass;
- API documentation is updated;
- business rules are documented;
- audit values are correct;
- no console errors exist;
- code review is completed.

---

# 61. Delivery Phases

## Phase 0 — Discovery and Technical Baseline

### Tasks

- review schema;
- review seed;
- confirm PostgreSQL database name and credentials;
- confirm role ownership;
- confirm invoice/receivable ownership;
- confirm delivery ownership;
- confirm production status ownership;
- confirm tax policy;
- confirm customer credit policy;
- confirm whether schema changes are allowed.

### Deliverables

```text
Architecture Decision Record
API convention
Permission matrix
Business-state matrix
Database ownership matrix
```

---

## Phase 1 — Project Foundation

### Backend

- initialize Node + TypeScript;
- Express bootstrap;
- environment validation;
- PostgreSQL pool;
- logging;
- global error handler;
- request IDs;
- health endpoint.

### Frontend

- initialize React + TypeScript;
- configure Astryx;
- router;
- query client;
- app shell;
- authentication context;
- common loading/error components.

### Deliverable

A working application shell connected to the API.

---

## Phase 2 — Authentication and Authorization

### Backend

Implement:

```text
POST /auth/login
GET /auth/me
```

plus token validation and permission middleware.

### Frontend

Implement:

- login page;
- protected routes;
- logout;
- current-user profile;
- permission-aware navigation.

### Exit Criteria

Every protected endpoint rejects unauthorized access.

---

## Phase 3 — Customer Management

### Backend

Implement:

```text
GET /customers
POST /customers
GET /customers/:id
PATCH /customers/:id
PATCH /customers/:id/status
GET /customers/:id/summary
```

### Frontend

Implement:

- customer list;
- create form;
- detail;
- edit;
- status management.

### Exit Criteria

Customer CRUD and filtering are production-ready.

---

## Phase 4 — Product Lookup

### Backend

Implement:

```text
GET /products
GET /products/:id
```

### Frontend

Implement:

- product list;
- searchable product selector.

### Exit Criteria

Products can be selected efficiently during order creation.

---

## Phase 5 — Sales Orders

This is the largest core phase.

### Backend

Implement:

```text
GET /sales-orders
POST /sales-orders
GET /sales-orders/:id
PATCH /sales-orders/:id
POST /sales-orders/:id/confirm
POST /sales-orders/:id/cancel
```

Add:

- order transaction;
- server pricing;
- state machine;
- customer status validation;
- credit validation.

### Frontend

Implement:

- order list;
- filters;
- create form;
- editable product lines;
- order summary;
- detail page;
- edit;
- confirm;
- cancel.

### Exit Criteria

The entire sales-order lifecycle works without delivery and invoice dependencies.

---

## Phase 6 — Delivery Management

### Backend

Implement:

```text
GET /deliveries
POST /deliveries
GET /deliveries/:id
POST /deliveries/:id/start
POST /deliveries/:id/complete
POST /deliveries/:id/fail
```

### Frontend

Implement:

- delivery list;
- delivery create flow;
- delivery detail;
- status actions.

### Exit Criteria

Orders can be operationally tracked through delivery.

---

## Phase 7 — Invoice Management

### Backend

Implement:

```text
GET /invoices
POST /invoices
GET /invoices/:id
```

Add due-date and payment-status logic.

### Frontend

Implement:

- invoice list;
- invoice create action;
- invoice detail.

### Exit Criteria

Invoices are consistently linked to orders and customers.

---

## Phase 8 — Accounts Receivable

### Backend

Implement:

```text
GET /receivables
GET /receivables/summary
GET /receivables/aging
GET /customers/:id/receivables
```

### Frontend

Implement:

- receivable list;
- overdue indicator;
- customer receivable tab;
- summary cards;
- aging report.

### Exit Criteria

Sales and accounting users can review customer debt exposure.

---

## Phase 9 — Dashboard

### Backend

Implement aggregated APIs:

```text
/dashboard/summary
/dashboard/revenue
/dashboard/order-status
/dashboard/top-customers
/dashboard/top-products
```

### Frontend

Implement:

- KPI cards;
- revenue chart;
- status chart;
- top-customer table;
- top-product table;
- date filters.

### Exit Criteria

Metrics reconcile with underlying order/invoice data.

---

## Phase 10 — Hardening

Focus:

- security;
- permissions;
- validation;
- concurrency;
- indexes;
- performance;
- accessibility;
- audit fields;
- API documentation;
- automated tests.

---

## Phase 11 — UAT and Release

### UAT

Business testers should validate:

```text
Customer
Sales Order
Delivery
Invoice
Receivable
Dashboard
Permissions
```

### Release Checklist

- environment secrets configured;
- database backup exists;
- migration scripts reviewed;
- health check operational;
- API documentation published;
- error logging enabled;
- role matrix verified;
- production build tested;
- rollback procedure documented.

---

# 62. Recommended Sprint Breakdown

A possible sprint model:

## Sprint 1

```text
Project foundation
Authentication
RBAC
Application shell
```

## Sprint 2

```text
Customer list
Customer create/edit
Customer detail
Product lookup
```

## Sprint 3

```text
Sales order list
Sales order create
Pricing engine
Order detail
```

## Sprint 4

```text
Order workflow
Credit control
Delivery module
```

## Sprint 5

```text
Invoice
Receivables
Customer financial tabs
```

## Sprint 6

```text
Dashboard
QA hardening
Performance
UAT fixes
Release
```

The actual sprint duration can be adapted to team size.

---

# 63. Suggested Team Workstream Split

## Frontend Engineer

Own:

- shell;
- route guards;
- forms;
- tables;
- dashboard;
- UI state;
- API integration.

## Backend Engineer

Own:

- REST API;
- authentication;
- RBAC;
- services;
- business rules;
- transactions;
- query performance.

## Database/Backend Owner

Own:

- schema compatibility;
- SQL review;
- indexes;
- transaction strategy;
- backup/release review.

## QA

Own:

- business scenarios;
- permission matrix;
- regression;
- E2E;
- UAT support.

---

# 64. Initial Product Backlog

## Epic A — Authentication

```text
A1 Login
A2 Current user
A3 Protected routes
A4 Role checks
A5 Logout
```

## Epic B — Customer Management

```text
B1 Customer list
B2 Search customer
B3 Filter customer
B4 Create customer
B5 Edit customer
B6 Customer status
B7 Customer detail
B8 Customer commercial summary
```

## Epic C — Product Lookup

```text
C1 Product list
C2 Product search
C3 Product selector
```

## Epic D — Sales Orders

```text
D1 Order list
D2 Order filter
D3 Create order
D4 Order pricing
D5 Multi-line order
D6 Edit pending order
D7 Confirm order
D8 Cancel order
D9 Order detail
D10 Credit check
```

## Epic E — Deliveries

```text
E1 Delivery list
E2 Delivery create
E3 Delivery detail
E4 Start delivery
E5 Complete delivery
E6 Failed delivery
E7 Delivery progress
```

## Epic F — Invoices

```text
F1 Invoice list
F2 Invoice create
F3 Invoice detail
F4 Due date
F5 Invoice status
```

## Epic G — Receivables

```text
G1 Receivable list
G2 Customer receivable history
G3 Outstanding summary
G4 Overdue summary
G5 Aging report
```

## Epic H — Dashboard

```text
H1 KPI summary
H2 Revenue chart
H3 Order status chart
H4 Top customer
H5 Top product
H6 Date filters
```

---

# 65. Acceptance Criteria Examples

## Create Sales Order

A sales order is accepted when:

- customer exists;
- customer is allowed to transact;
- requested delivery date is valid;
- at least one product is supplied;
- all products exist;
- all quantities are positive;
- all discounts are valid;
- server recalculates every monetary field;
- header and lines are committed atomically;
- salesperson/audit user is recorded;
- API returns created order with generated identifier.

## Confirm Sales Order

Confirmation is accepted when:

- order exists;
- status is `cho_xac_nhan`;
- user has permission;
- order has valid lines;
- customer remains active;
- credit policy passes or returns the configured warning/block behavior;
- status becomes `da_xac_nhan`.
## Complete Delivery

For the interim header-only strategy, completion is accepted when:

- delivery exists;
- delivery status permits completion;
- user has permission;
- no inventory side effect occurs.

The following checks and mutations are **Q11-conditional** and remain skipped while Q11 is unresolved:

- delivered quantities do not exceed ordered quantities;
- cumulative quantities are updated;
- line statuses are recalculated;
- the order becomes `da_giao` only when every line is complete.

---

# 66. Recommended SQL Query Patterns

## Customer List

```sql
SELECT
    k.id,
    k.ma_khach_hang,
    k.ten_khach_hang,
    k.loai_khach_hang,
    k.so_dien_thoai,
    k.tinh_thanh_pho,
    k.han_muc_cong_no,
    k.so_ngay_cong_no,
    k.trang_thai
FROM khach_hang k
WHERE
    ($1::text IS NULL
      OR k.ma_khach_hang ILIKE '%' || $1 || '%'
      OR k.ten_khach_hang ILIKE '%' || $1 || '%'
      OR k.so_dien_thoai ILIKE '%' || $1 || '%')
ORDER BY k.ngay_tao DESC
LIMIT $2 OFFSET $3;
```

## Customer Orders

```sql
SELECT *
FROM don_ban_hang
WHERE ma_khach_hang = $1
ORDER BY ngay_dat_hang DESC;
```

## Customer Invoices

```sql
SELECT *
FROM hoa_don_ban_hang
WHERE ma_khach_hang = $1
ORDER BY ngay_xuat_hoa_don DESC;
```

## Customer Receivables

```sql
SELECT *
FROM cong_no
WHERE ma_khach_hang = $1
  AND loai_cong_no = 'phai_thu'
ORDER BY ngay_dao_han ASC;
```

These queries are implementation patterns; production repositories should include validated filters and explicit column lists.

---

# 67. Reporting Query Principles

Dashboard queries should:

- aggregate in PostgreSQL;
- return small result sets;
- never send raw millions of rows to the frontend;
- use date boundaries explicitly;
- exclude cancelled records where appropriate;
- clearly define whether revenue means orders or invoices.

---
# 68. Data Consistency Rules
The backend must guarantee:

```text
invoice.customer == order.customer
order-line.product exists
delivery.order exists
delivery.warehouse exists
order.total == calculated total
line.total == calculated line total
receivable.customer == invoice.customer
paid <= invoice total
```

The delivery quantity invariant is **Q11-conditional** and is skipped while the interim header-only strategy is active:

```text
delivered quantity <= ordered quantity
```

Where the database schema does not enforce a rule, the service layer must.

---

# 69. UI Status Mapping

Keep database values unchanged in API/domain code.

Map only for display.

Example:

```text
cho_xac_nhan        → Pending Confirmation
da_xac_nhan         → Confirmed
dang_san_xuat       → In Production
da_giao             → Delivered
huy                 → Cancelled
```

Customer:

```text
hoat_dong           → Active
tam_khoa            → Suspended
ngung_giao_dich     → Closed
```

Delivery:

```text
cho_giao            → Pending
dang_giao           → In Transit
da_giao             → Delivered
that_bai            → Failed
```

Invoice:

```text
chua_thanh_toan     → Unpaid
thanh_toan_mot_phan → Partially Paid
da_thanh_toan       → Paid
qua_han             → Overdue
```

---

# 70. Recommended Frontend Shared Components

Build reusable components:

```text
AppShell
PageHeader
Breadcrumbs
DataTable
Pagination
SearchInput
FilterBar
StatusBadge
Money
DateDisplay
EmptyState
ErrorState
LoadingSkeleton
ConfirmDialog
PermissionGate
CustomerSelector
ProductSelector
WarehouseSelector
UserSelector
OrderStatusBadge
InvoiceStatusBadge
```

---

# 71. Recommended Backend Shared Utilities

```text
createTransaction()
paginate()
parseSort()
generateBusinessCode()
calculateOrderTotals()
calculateInvoiceStatus()
calculateReceivableStatus()
assertStatusTransition()
assertPermission()
buildAuditFields()
```

Avoid duplicating status logic across controllers.

---

# 72. State Management

Do not introduce a large global state store unless a real need appears.

Recommended:

- TanStack Query for server state;
- React Hook Form for form state;
- local React state for page/UI state;
- lightweight auth context for current user.

Avoid copying server data into another global store.

---

# 73. Accessibility

ERP screens should provide:

- keyboard-accessible navigation;
- visible focus state;
- form labels;
- semantic buttons;
- accessible dialogs;
- color-independent status meaning;
- sufficient contrast;
- error text attached to inputs.

---

# 74. Exporting

Optional but useful:

```text
Export Customers CSV
Export Sales Orders CSV
Export Invoices CSV
Export Receivables CSV
```

Exports should run through backend endpoints so they respect:

- permission;
- filters;
- server-side data rules.

---

# 75. Soft Delete Strategy

The supplied tables do not use a generic deleted flag.

Therefore:

- do not physically delete customer history;
- use customer status for deactivation;
- use `huy` for sales-order cancellation;
- keep invoices/history.

Physical delete should be avoided for transactional data.

---

# 76. Audit History Recommendation

The provided schema contains current audit fields but no full history.

A future extension can add a generic audit log:

```text
audit_log
```

Possible fields:

```text
id
entity_type
entity_id
action
old_data
new_data
user_id
created_at
```

Do not add it to MVP unless required.

---

# 77. Status History Recommendation

For production-grade ERP traceability, consider:

```text
sales_order_status_history
delivery_status_history
invoice_status_history
```

The existing schema does not provide these tables.

MVP can operate without them.

---

# 78. Customer Contact Model Limitation

`khach_hang` contains only one:

```text
nguoi_lien_he
```

If future requirements include multiple contacts per company, add a separate customer-contact table.

Do not simulate multiple contacts inside `ghi_chu`.

---

# 79. Address Model Limitation

The customer table has one primary address.

The sales order stores a delivery address snapshot, which is good because historical orders should preserve the delivery address used at order time.

Future CRM requirements may need:

```text
customer_addresses
```

for multiple delivery/billing addresses.

Not required for MVP.

---

# 80. Product Variant Observation

The provided `san_pham` table contains:

```text
size
mau_sac
```

directly on the product record.

Therefore, treat each database `san_pham` row as the sellable product identity provided by the ERP.

Do not invent a separate variant model unless the database is later redesigned.

---

# 81. Critical Implementation Decisions to Confirm

Before the final build starts, the team should document answers to these questions:

1. Who is allowed to confirm an order?
2. Who can cancel a confirmed order?
3. Is exceeding credit limit a warning or hard block?
4. Is tax fixed, configurable, or manually entered?
5. Can sales users override product prices?
6. When should an invoice be created?
7. Can one order have multiple invoices?
8. Who owns creation of `cong_no`?
9. Who moves an order into `dang_san_xuat`?
10. Who deducts warehouse stock after delivery?
11. Are database schema changes permitted?
12. Is full payment history required?
13. Is full per-delivery product history required?

The existing schema supports the main workflow but does not answer these business-policy questions.

---

# 82. MVP Scope

A realistic complete MVP should include:

| Area | Included |
|---|---:|
| Login | Yes |
| RBAC | Yes |
| Dashboard | Yes |
| Customer CRUD | Yes |
| Customer status | Yes |
| Customer detail | Yes |
| Product lookup | Yes |
| Sales order list | Yes |
| Sales order create | Yes |
| Sales order edit | Yes |
| Server-side pricing | Yes |
| Order confirmation | Yes |
| Order cancellation | Yes |
| Credit check | Yes |
| Delivery list | Yes |
| Sales invoice | Yes |
| Customer receivable view | Yes |
| Delivery workflow | Yes — header-only interim scope |
| Cumulative delivery progress | Q11-conditional — skipped while the interim header-only strategy is active |
| Exact delivery-line history | No — schema does not support it |
| Production planning | No |
| Purchasing | No |
| Supplier management | No |
| Full warehouse management | No |
| General accounting | No |

---

# 83. Recommended Version 2 Extensions

After MVP:

```text
Customer payment transaction table
Delivery detail table
Order approval workflow
Credit approval workflow
Customer contact table
Multiple customer addresses
Order status history
Audit log
Notification system
Email integration
Document attachments
Invoice PDF generation
Advanced analytics
Export center
```

---

# 84. Risk Register

## Risk 1 — Cross-Module Ownership

**Problem:** Sales, Warehouse, Production, and Accounting may update overlapping fields.

**Mitigation:** Define ownership before coding side effects.

## Risk 2 — Existing Database Coupling

**Problem:** Schema changes may impact other ERP modules.

**Mitigation:** Default to read/write only existing approved fields.

## Risk 3 — Delivery Detail Missing

**Problem:** Cannot reconstruct exact items per delivery.

**Mitigation:** Keep the MVP header-only while Q11 is unresolved; do not mutate cumulative quantity or derive line/order completion. If Q11 approves cumulative progress, implement it transactionally; add a detail table later for exact delivery history.

## Risk 4 — Customer Payment Detail Missing

**Problem:** No receipt transaction history.

**Mitigation:** Expose cumulative payment only or add approved payment table later.

## Risk 5 — Credit Exposure Race Condition

**Problem:** Two orders can be confirmed concurrently.

**Mitigation:** Use transaction/locking if hard credit limits are enforced.

## Risk 6 — Monetary Drift

**Problem:** Frontend and backend calculations differ.

**Mitigation:** Backend is authoritative and uses decimal-safe arithmetic.

## Risk 7 — Permission Leakage

**Problem:** Hiding buttons in React is insufficient.

**Mitigation:** Enforce permissions on every backend mutation.

---

# 85. Final Recommended Build Order

The preferred implementation sequence is:

```text
1. Database connectivity
2. Backend foundation
3. Authentication
4. RBAC
5. Frontend application shell
6. Customer Management
7. Product Lookup
8. Sales Order Management
9. Order Workflow
10. Credit Control
11. Delivery Management
12. Invoice Management
13. Accounts Receivable
14. Dashboard
15. Integration Tests
16. Security Hardening
17. Performance Review
18. UAT
19. Release
```

This sequence minimizes rework because the Dashboard and financial views depend on transactional modules already being stable.

---

# 86. Final Architecture Recommendation

```text
Frontend
────────────────────────────────────────
React.js
TypeScript
Astryx
React Router
TanStack Query
React Hook Form
Zod

                REST / JSON

Backend
────────────────────────────────────────
Node.js
TypeScript
Express
Zod
JWT
RBAC
Service Layer
Repository Layer
PostgreSQL Transactions
Structured Logging

                PostgreSQL

Existing ERP Database
────────────────────────────────────────
nguoi_dung
khach_hang
san_pham
don_vi_tinh
don_ban_hang
chi_tiet_don_ban_hang
giao_hang
kho
hoa_don_ban_hang
cong_no
```

The design deliberately does **not** make the Sales application dependent on the complete ERP schema.

---

# 87. Final Engineering Principles

The implementation team should treat the following as non-negotiable:

1. **PostgreSQL remains the source of truth.**
2. **React never connects directly to PostgreSQL.**
3. **The backend owns business rules.**
4. **The backend recalculates financial values.**
5. **Status transitions are explicit business actions.**
6. **Critical multi-table changes use transactions.**
7. **Permissions are enforced server-side.**
8. **Audit fields come from authenticated identity.**
9. **Pagination/filtering happens server-side.**
10. **Existing unrelated ERP modules are not pulled into scope.**
11. **Schema limitations are documented rather than hidden.**
12. **Future integration points are designed, but not prematurely implemented.**

---

# 88. Source-to-Feature Mapping

This implementation plan is based on the supplied database model and seed data.

| Source Object | Application Feature |
|---|---|
| `nguoi_dung` | Authentication, role, salesperson, audit |
| `khach_hang` | Customer Management |
| `san_pham` | Product Lookup |
| `don_vi_tinh` | Product Unit |
| `don_ban_hang` | Sales Orders |
| `chi_tiet_don_ban_hang` | Order Products |
| `giao_hang` | Deliveries |
| `kho` | Delivery Warehouse |
| `hoa_don_ban_hang` | Sales Invoices |
| `cong_no` | Accounts Receivable |

The supplied seed data already provides realistic linked examples for these areas and can be used for initial development and demo validation.

---

# 89. Suggested Documentation Set

Alongside the codebase, maintain:

```text
docs/
├── architecture/
│   ├── system-overview.md
│   ├── module-boundaries.md
│   └── data-flow.md
│
├── database/
│   ├── table-usage.md
│   ├── business-rules.md
│   └── query-guide.md
│
├── api/
│   ├── conventions.md
│   └── error-codes.md
│
├── security/
│   ├── roles-permissions.md
│   └── authentication.md
│
└── adr/
    ├── 001-existing-database.md
    ├── 002-rest-api.md
    ├── 003-server-side-pricing.md
    └── 004-module-ownership.md
```

---

# 90. Completion Target

The project should be considered functionally complete when a business user can perform the following end-to-end journey:

```text
Login
  ↓
Create or find customer
  ↓
Review credit status
  ↓
Create sales order
  ↓
Add products
  ↓
Server calculates price
  ↓
Confirm order
  ↓
Track commercial status
  ↓
Create delivery
  ↓
Complete delivery
  ↓
Create invoice
  ↓
Review outstanding receivable
  ↓
Open customer profile
  ↓
See complete order / invoice / receivable context
  ↓
Dashboard reflects the new transaction
```

That flow defines the core of the Sales and Customer Management ERP implementation.

---

## End of Master Plan
