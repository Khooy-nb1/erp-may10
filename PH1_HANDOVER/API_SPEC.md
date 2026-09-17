# PH1 Handover — Sales Module API Specification
**Document ID:** PH1-HANDOVER-001
**Date:** 2026-09-17
**Scope:** The PH1 Sales module's **32 route handlers** under `/api/v1/sales/*` (mostly HTTP resource endpoints, plus sub-actions such as `POST /:id/confirm`), their authorization guards, accepted request fields, success shapes and error codes.
**Provenance:** every claim below is derived from the cited source files at the commit in the working tree.

---

## 1. Overview

### 1.1 Base path & mounting

| Fact | Value | Source |
|---|---|---|
| Base path | `/api/v1/sales` | `backend/src/routes/salesRoutes.js:10`, `backend/src/app.js:82` |
| Router aggregation | `salesRoutes.js` mounts seven sub-routers and applies `requireAuth` to all | `backend/src/routes/salesRoutes.js:19-27` |
| Module error boundary | Mounted last inside the module router | `backend/src/routes/salesRoutes.js:32` |

Sub-router mount table (the effective base for each group):

| Group | Mount | Source |
|---|---|---|
| Customers | `/api/v1/sales/khach-hang` | `salesRoutes.js:21` |
| Receivables | `/api/v1/sales/cong-no` | `salesRoutes.js:22` |
| Products | `/api/v1/sales/san-pham` | `salesRoutes.js:23` |
| Overview | `/api/v1/sales/tong-quan` | `salesRoutes.js:24` |
| Orders | `/api/v1/sales/don-hang` | `salesRoutes.js:25` |
| Invoices | `/api/v1/sales/hoa-don` | `salesRoutes.js:26` |
| Deliveries | `/api/v1/sales/giao-hang` | `salesRoutes.js:27` |

> Note: `orders.routes.js:9` describes itself as "mounted at `/don-ban-hang`", but the actual mount is `/don-hang` (`salesRoutes.js:25`). The mount wins.

### 1.2 Authentication model

- Core populates `req.user` for every `/api/v1/*` request via `app.use('/api/v1', authMiddleware)` (`backend/src/app.js:68`). The Sales module then enforces authentication with a single `router.use(requireAuth)` (`salesRoutes.js:19`).
- The credential is a Core-issued HMAC-SHA256 signed token of the form `erp_token_<userId>_<timestamp>.<64-hex-signature>`, sent as `Authorization: Bearer <token>` or `x-auth-token: <token>` (`backend/src/middlewares/auth.js:99-102`).
- The token is verified cryptographically (constant-time compare, `auth.js:75`), must be no older than 24 hours and not future-dated by more than 60 s (`auth.js:83-87`). The bearer is then looked up in `nguoi_dung` and the account must be `trang_thai = 'hoat_dong'` (`auth.js:117-128`).
- `x-role` / `x-user-id` headers are never trusted; identity comes only from the signed token (`auth.js:95-97`).
- `requireAuth` returns **401 `UNAUTHORIZED`** when `req.user` is absent (missing, expired or forged token) (`auth.js:169-176`).

### 1.3 Authorization guards

Two guard styles are used, applied per route and reproduced verbatim in the endpoint table:

- `requireRoles('role1', ...)` — role gate. `admin` (canonical `ADMIN`) always passes (`auth.js:196-198`); otherwise the caller's canonical role must be in the allowed list (`auth.js:185-215`). Failure → **403 `FORBIDDEN`** (`auth.js:210-214`).
- `requirePermission('sales.x')` — permission gate using Core's frozen `ROLE_PERMISSIONS` matrix. `admin` always passes (`auth.js:233-235`); otherwise every required permission must be held (`auth.js:222-249`). Failure → **403 `FORBIDDEN`** (`auth.js:244-248`).

`requireRoles` / `requirePermission` also return **401 `UNAUTHORIZED`** if invoked without `req.user` (`auth.js:187-193`, `auth.js:224-230`), though in this module `requireAuth` runs first.

The overview routes additionally re-assert data scope inside the service (`overview.service.js:143-149` `scopeForRole`, `overview.service.js:152-155` `assertMoneyScope`) and throw `AUTH_FORBIDDEN` for a role outside `ROLE_SCOPES`.

### 1.4 Success envelope

| Shape | Body | Source |
|---|---|---|
| Single resource | `{ "success": true, "message": string\|null, "data": <object> }` | `backend/src/utils/sales/response.js:16-21` |
| List | `{ "success": true, "message": string\|null, "data": [<object>], "meta": { "page", "pageSize", "total", "totalPages" } }` | `response.js:24-35` |

`message` is the Vietnamese confirmation string passed by the route (`null` on bare reads). Default status is `200`; create endpoints pass `201` explicitly. Pagination defaults: `page=1`, `pageSize=20`, max `pageSize=100` (`customer.service.js:42-43` and the sibling schemas).

### 1.5 Error envelope

| Emitter | Body | Source |
|---|---|---|
| Module error boundary (`AppError` hierarchy) | `{ "success": false, "message", "errorCode", "details" }` — `details` is always present, `null` when there is no field-level information, otherwise `[{ "field", "message" }]` | `errorBoundary.js:20-29`, `response.js:46-52` |
| Core guards (`requireAuth`/`requireRoles`/`requirePermission`) | `{ "success": false, "errorCode", "message" }` — no `details` key | `auth.js:171-175`, `auth.js:210-214` |
| Core `errorHandler` (non-module errors forwarded by the boundary) | `{ "success": false, "errorCode", "message", "details" }` where `details = err.stack` **only when `NODE_ENV=development`**, otherwise the key is dropped during serialization | `errorHandler.js:5-13`, `errorBoundary.js:21-22` |

**`details` development-only rule.** The module's own `AppError`s get `details` rendered unconditionally by the module boundary (never a stack trace; only the normalised `[{field,message}]` array or `null`). Everything else is forwarded unchanged to Core's `errorHandler`, whose `details` is a **stack trace, present only when `NODE_ENV=development`** and omitted in production (`errorHandler.js:10-12`).

Vietnamese field-level validation messages come from the module validator's `MESSAGES` table (`validate.js:30-41`); validator issues are normalised from zod's `{path,message}` to the contract's `{field,message}` by `normaliseDetails` (`errorBoundary.js:36-54`) or by each service's `validationDetails` helper.

---

## 2. Endpoint Reference

**32 route handlers** were found across the seven route files (customers 7, products 2, orders 6, deliveries 6, invoices 3, receivables 3, overview 5). Every `router.<method>(...)` call is listed below.

Legend: fields list query params (GET) or body fields (POST/PATCH) in `snake_case`; `req`=required, `opt`=optional. Types/bounds/enums follow the module validators. "→" status is the success HTTP status.

### 2.1 Customers — `/api/v1/sales/khach-hang`

| METHOD /path | Purpose | Guard | Fields | → | errorCode(s) | Source |
|---|---|---|---|---|---|---|
| `GET /` | List customers | `requireRoles('admin', 'ban_hang', 'ke_toan')` | `page` int≥1 def1, `pageSize` int 1..100 def20, `search` str, `loai_khach_hang` enum `ca_nhan\|to_chuc\|dai_ly\|xuat_khau`, `tinh_thanh_pho` str, `trang_thai` enum `hoat_dong\|tam_khoa\|ngung_giao_dich`, `sortBy` str, `sortOrder` enum `ASC\|DESC` def `DESC` | 200 list | `VALIDATION_ERROR` | customers.routes.js:23; schema customer.service.js:41-47 |
| `POST /` | Create customer | `requirePermission('sales.create')` | req `ten_khach_hang` str 1..200, `loai_khach_hang` enum above, `so_dien_thoai` str 8..20, `dia_chi` str≥1, `tinh_thanh_pho` str≥1; opt `ma_so_thue` str≤20/null, `email` email/nullable/`''`, `nguoi_lien_he` str≤150/null, `han_muc_cong_no` num≥0 def0, `so_ngay_cong_no` int≥0 def0, `ghi_chu` str/null | 201 | `VALIDATION_ERROR`; `DATABASE_CONFLICT` | customers.routes.js:44; schema customer.service.js:20-32, order of ops 87-104 |
| `GET /:id` | Customer detail | `requireRoles('admin', 'ban_hang', 'ke_toan')` | — | 200 | `CUSTOMER_NOT_FOUND` | customers.routes.js:54 |
| `PATCH /:id` | Update general info | `requirePermission('sales.update')` | all create fields optional (`.partial()`) | 200 | `CUSTOMER_NOT_FOUND`; `VALIDATION_ERROR` | customers.routes.js:64; schema customer.service.js:34 |
| `PATCH /:id/status` | Update status (Admin only) | `requireRoles('admin')` | req `trang_thai` enum above, opt `ly_do` str | 200 | `CUSTOMER_NOT_FOUND`; `VALIDATION_ERROR` | customers.routes.js:74; schema customer.service.js:36-39 |
| `GET /:id/summary` | Commercial summary | `requireRoles('admin', 'ban_hang', 'ke_toan')` | — | 200 | `CUSTOMER_NOT_FOUND` | customers.routes.js:84 |
| `GET /:id/receivables` | Customer's receivables | `requirePermission('sales.view')` | receivable query fields (see §2.6); `ma_khach_hang` is forced to the path id | 200 list | `VALIDATION_ERROR` | customers.routes.js:94; receivable.service.js:89-95 |

### 2.2 Products — `/api/v1/sales/san-pham`

| METHOD /path | Purpose | Guard | Fields | → | errorCode(s) | Source |
|---|---|---|---|---|---|---|
| `GET /` | List / search products | `requireRoles('admin', 'ban_hang', 'kho', 'ke_toan')` | `page` int≥1 def1, `pageSize` int 1..100 def20, `search` str, `size` str, `mau_sac` str, `trang_thai` enum `dang_ban\|ngung_ban\|mau_moi`, `sortBy` str, `sortOrder` enum `ASC\|DESC` def `ASC` | 200 list | `VALIDATION_ERROR` | products.routes.js:19; schema product.service.js:13-22 |
| `GET /:id` | Product detail | `requireRoles('admin', 'ban_hang', 'kho', 'ke_toan')` | — | 200 | `PRODUCT_NOT_FOUND` | products.routes.js:40 |

### 2.3 Orders — `/api/v1/sales/don-hang`

Order status enum (`ORDER_STATUSES`): `cho_xac_nhan \| da_xac_nhan \| dang_san_xuat \| da_giao \| huy` (`order.service.js:24`).

| METHOD /path | Purpose | Guard | Fields | → | errorCode(s) | Source |
|---|---|---|---|---|---|---|
| `GET /` | List orders | `requireRoles('admin', 'ban_hang', 'kho', 'ke_toan')` | `page`, `pageSize` (1..100 def20), `search` str, `ma_khach_hang` int>0, `trang_thai` order enum, `nguoi_ban` int>0, `fromDate` str, `toDate` str, `sortBy` str, `sortOrder` `ASC\|DESC` def `DESC` | 200 list | `VALIDATION_ERROR` | orders.routes.js:22; schema order.service.js:70-80 |
| `POST /` | Create order | `requirePermission('sales.create')` | req `ma_khach_hang` int>0, `ngay_dat_hang` str≥1, `ngay_giao_hang_yc` str≥1 (must be ≥ `ngay_dat_hang`), `dia_chi_giao_hang` str≥1, `lines` array min1 of `{ ma_san_pham int>0, so_luong num>0, ty_le_giam_gia num 0..100 def0, ghi_chu str/null }`; opt `ghi_chu` str/null | 201 | `VALIDATION_ERROR`; `CUSTOMER_NOT_FOUND`; `CUSTOMER_INACTIVE`; `PRODUCT_NOT_FOUND`; `PRODUCT_NOT_SELLABLE`; `DATABASE_CONFLICT` | orders.routes.js:43; schema order.service.js:27-53; guards 114-169 |
| `GET /:id` | Order detail (with lines) | `requireRoles('admin', 'ban_hang', 'kho', 'ke_toan')` | — | 200 | `ORDER_NOT_FOUND` | orders.routes.js:53 |
| `PATCH /:id` | Update pending order | `requirePermission('sales.update')` | opt `ngay_giao_hang_yc` str, `dia_chi_giao_hang` str≥1, `ghi_chu` str/null, `lines` array min1 | 200 | `ORDER_NOT_FOUND`; `ORDER_INVALID_STATE`; `PRODUCT_NOT_FOUND`; `PRODUCT_NOT_SELLABLE`; `VALIDATION_ERROR` | orders.routes.js:63; schema order.service.js:55-60; guards 192-260 |
| `POST /:id/confirm` | Confirm order | `requirePermission('sales.approve')` | opt `acknowledgeCreditLimit` bool def `false`; a parse failure silently defaults to `false` (no 422) | 200 | `ORDER_NOT_FOUND`; `ORDER_INVALID_STATE`; `CUSTOMER_NOT_FOUND`; `CUSTOMER_INACTIVE`; `CUSTOMER_CREDIT_LIMIT_EXCEEDED` | orders.routes.js:73; schema order.service.js:62-64; guards 264-320 |
| `POST /:id/cancel` | Cancel order | `requirePermission('sales.update')` | req `ly_do` str≥1 | 200 | `ORDER_NOT_FOUND`; `ORDER_INVALID_STATE`; `AUTH_FORBIDDEN` (confirmed order, non-admin); `VALIDATION_ERROR` | orders.routes.js:83; schema order.service.js:66-68; guards 324-369 |

### 2.4 Deliveries — `/api/v1/sales/giao-hang`

Delivery status enum: `cho_giao \| dang_giao \| da_giao \| that_bai` (`delivery.service.js:19`). Create accepts Vietnamese **or** English field aliases; each required field satisfies either name (`delivery.service.js:45-76`).

| METHOD /path | Purpose | Guard | Fields | → | errorCode(s) | Source |
|---|---|---|---|---|---|---|
| `GET /` | List deliveries | `requireRoles('admin', 'ban_hang', 'kho')` | `page`, `pageSize` (1..100 def20), `search` str, `ma_don_ban_hang` int>0, `ma_kho` int>0, `trang_thai` delivery enum, `sortBy` str, `sortOrder` `ASC\|DESC` def `DESC` | 200 list | `VALIDATION_ERROR` | deliveries.routes.js:23; schema delivery.service.js:94-104 |
| `POST /` | Create delivery header | `requireRoles('admin', 'kho', 'ban_hang')` | one-of req `ma_don_ban_hang`\|`orderId` int>0; one-of req `ma_kho`\|`warehouseId` int>0; one-of req `ngay_giao`\|`deliveryDate` str valid date; one-of req `ten_nguoi_nhan`\|`receiverName` str≤150; one-of req `dia_chi_giao`\|`deliveryAddress` str; opt `phuong_tien_van_chuyen`\|`transportMethod` str/null; opt `nguoi_giao_hang`\|`deliveryPersonId` int>0/null; opt `ghi_chu`\|`notes` str/null. Submitting `deliveredLines` is rejected. | 201 | `VALIDATION_ERROR`; `DELIVERY_LINES_UNSUPPORTED`; `ORDER_NOT_FOUND`; `ORDER_INVALID_STATE`; `WAREHOUSE_NOT_FOUND`; `DATABASE_CONFLICT` | deliveries.routes.js:44; schema delivery.service.js:22-77; guards 128-181 |
| `GET /:id` | Delivery detail | `requireRoles('admin', 'ban_hang', 'kho')` | — | 200 | `DELIVERY_NOT_FOUND` | deliveries.routes.js:55 |
| `POST /:id/start` | `cho_giao` → `dang_giao` | `requireRoles('admin', 'kho')` | — (no body) | 200 | `DELIVERY_NOT_FOUND`; `DELIVERY_INVALID_STATE` | deliveries.routes.js:65; delivery.service.js:196-210 |
| `POST /:id/complete` | `dang_giao` → `da_giao` | `requireRoles('admin', 'kho')` | — (no body) | 200 | `DELIVERY_NOT_FOUND`; `DELIVERY_INVALID_STATE` (409 when already `da_giao`) | deliveries.routes.js:76; delivery.service.js:213-240 |
| `POST /:id/fail` | `dang_giao` → `that_bai` | `requireRoles('admin', 'kho')` | one-of req `ly_do`\|`reason` str≥1 | 200 | `DELIVERY_NOT_FOUND`; `DELIVERY_INVALID_STATE`; `VALIDATION_ERROR` | deliveries.routes.js:87; schema delivery.service.js:79-92; guards 243-270 |

### 2.5 Invoices — `/api/v1/sales/hoa-don`

Invoice status enum: `chua_thanh_toan \| thanh_toan_mot_phan \| da_thanh_toan \| qua_han` (`invoice.service.js:23`). The create body also accepts Vietnamese/English aliases.

| METHOD /path | Purpose | Guard | Fields | → | errorCode(s) | Source |
|---|---|---|---|---|---|---|
| `GET /` | List invoices | `requireRoles('admin', 'ban_hang', 'ke_toan')` | `page`, `pageSize` (1..100 def20), `search` str, `ma_hoa_don` str, `ma_don_ban_hang` int>0, `ma_khach_hang` int>0, `trang_thai` invoice enum, `fromDate`, `toDate`, `dueFromDate`, `dueToDate` str, `sortOrder` `ASC\|DESC` def `DESC` | 200 list | `VALIDATION_ERROR` | invoices.routes.js:21; schema invoice.service.js:57-67 |
| `POST /` | Issue invoice | `requireRoles('admin', 'ke_toan')` | one-of req `ma_don_ban_hang`\|`orderId` int>0; opt `ma_khach_hang`\|`customerId` int>0; opt `ngay_xuat_hoa_don`\|`issueDate` str valid date; `so_tien_da_thu` num≥0 def0 or `paidAmount` num≥0; opt `ghi_chu`\|`notes` str/null | 201 | `VALIDATION_ERROR`; `ORDER_NOT_FOUND`; `INVOICE_ALREADY_EXISTS`; `DATABASE_CONFLICT`; `INVOICE_INVALID_ORDER`; `INVOICE_CUSTOMER_MISMATCH`; `INVOICE_CREATION_FAILED` | invoices.routes.js:42; schema invoice.service.js:23-55; mapping 128-146 |
| `GET /:id` | Invoice detail | `requireRoles('admin', 'ban_hang', 'ke_toan')` | — | 200 | `INVOICE_NOT_FOUND` | invoices.routes.js:52 |

### 2.6 Receivables — `/api/v1/sales/cong-no`

Receivable status enum: `chua_thanh_toan \| mot_phan \| da_thanh_toan \| qua_han` (`receivable.service.js:15`).

| METHOD /path | Purpose | Guard | Fields | → | errorCode(s) | Source |
|---|---|---|---|---|---|---|
| `GET /summary` | Receivable KPI summary | `requirePermission('sales.view')` | opt `ma_khach_hang` int>0 | 200 | `VALIDATION_ERROR` | receivables.routes.js:19; schema receivable.service.js:30-32 |
| `GET /aging` | Aging bucket report (Finance only) | `requirePermission('accounting.receivable')` | — | 200 | — | receivables.routes.js:29 |
| `GET /` | List receivables | `requirePermission('sales.view')` | `page`, `pageSize` (1..100 def20), `search` str, `ma_khach_hang` int>0, `ma_hoa_don` int>0, `trang_thai` receivable enum, `dueFromDate`, `dueToDate` str, `overdueOnly` bool, `sortBy` str, `sortOrder` `ASC\|DESC` def `DESC` | 200 list | `VALIDATION_ERROR` | receivables.routes.js:39; schema receivable.service.js:16-28 |

### 2.7 Overview — `/api/v1/sales/tong-quan`

All five routes share the dashboard query schema (`overview.service.js:45-60`): `period` enum `month\|quarter\|year\|custom` def `month`, `fromDate` str, `toDate` str, `nguoi_ban` int>0, `loai_khach_hang` str, `limit` int 1..50 def10. Cross-field rule: `fromDate` and `toDate` are **required when `period=custom`**, and `fromDate` must not exceed `toDate`. `kho` is denied the money-backed routes both by guard and by the service's `assertMoneyScope` (`overview.service.js:152-155`).

| METHOD /path | Purpose | Guard | Fields | → | errorCode(s) | Source |
|---|---|---|---|---|---|---|
| `GET /summary` | Role-scoped KPI summary | `requireRoles('admin', 'ban_hang', 'kho', 'ke_toan')` | dashboard query (above) | 200 | `VALIDATION_ERROR`; `AUTH_FORBIDDEN` (role outside `ROLE_SCOPES`) | overview.routes.js:22; overview.service.js:230 |
| `GET /revenue-chart` | Invoice revenue by period | `requireRoles('admin', 'ban_hang', 'ke_toan')` | dashboard query | 200 | `VALIDATION_ERROR`; `AUTH_FORBIDDEN` | overview.routes.js:32; overview.service.js:247 |
| `GET /order-status` | Order count by status | `requireRoles('admin', 'ban_hang', 'kho', 'ke_toan')` | dashboard query | 200 | `VALIDATION_ERROR` | overview.routes.js:42; overview.service.js:259 |
| `GET /top-customers` | Top customers by value | `requireRoles('admin', 'ban_hang', 'ke_toan')` | dashboard query | 200 | `VALIDATION_ERROR`; `AUTH_FORBIDDEN` | overview.routes.js:52; overview.service.js:265 |
| `GET /top-products` | Top products by value | `requireRoles('admin', 'ban_hang', 'ke_toan')` | dashboard query | 200 | `VALIDATION_ERROR`; `AUTH_FORBIDDEN` | overview.routes.js:62; overview.service.js:276 |

---

## 3. Request / Response Examples

All examples assume:

```bash
BASE_URL=http://<host>:<port>/api/v1/sales
TOKEN=erp_token_1_1758000000000.<64-hex-hmac>   # issued by Core; see §1.2
```

### 3.1 Create order — `POST /don-hang`

Request:

```bash
curl -X POST "$BASE_URL/don-hang" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ma_khach_hang": 12,
    "ngay_dat_hang": "2026-09-17",
    "ngay_giao_hang_yc": "2026-09-20",
    "dia_chi_giao_hang": "Số 10 phố May, Hà Nội",
    "ghi_chu": "Giao giờ hành chính",
    "lines": [
      { "ma_san_pham": 101, "so_luong": 3, "ty_le_giam_gia": 5 },
      { "ma_san_pham": 102, "so_luong": 1 }
    ]
  }'
```

Response `201` (order header from `don_ban_hang`, plus the inserted `lines`; totals are server-computed — `order.service.js:150-192`, `order.repository.js:239-283`):

```json
{
  "success": true,
  "message": "Tạo đơn bán hàng thành công.",
  "data": {
    "id": 501,
    "ma_don_ban": "DBH-2026-482913",
    "ma_khach_hang": 12,
    "ngay_dat_hang": "2026-09-17T00:00:00.000Z",
    "ngay_giao_hang_yc": "2026-09-20T00:00:00.000Z",
    "dia_chi_giao_hang": "Số 10 phố May, Hà Nội",
    "tong_tien_hang": "46000000.00",
    "tien_thue": "4600000.00",
    "tien_giam_gia": "3000000.00",
    "tong_thanh_toan": "47600000.00",
    "nguoi_ban": 2,
    "trang_thai": "cho_xac_nhan",
    "ghi_chu": "Giao giờ hành chính",
    "lines": [
      { "id": 9001, "ma_san_pham": 101, "so_luong": "3.000", "don_gia": "10000000.00", "ty_le_giam_gia": "5.00", "thanh_tien": "28500000.00", "trang_thai": "chua_giao" }
    ]
  }
}
```

### 3.2 Confirm order — `POST /don-hang/:id/confirm`

Request (set `acknowledgeCreditLimit: true` only when accepting a soft credit-limit warning; it is ignored under `hard_block`):

```bash
curl -X POST "$BASE_URL/don-hang/501/confirm" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "acknowledgeCreditLimit": false }'
```

Response `200` (`updateStatus` re-reads the row, `order.repository.js:339-359`):

```json
{
  "success": true,
  "message": "Xác nhận đơn bán hàng thành công.",
  "data": { "id": 501, "trang_thai": "da_xac_nhan", "tong_thanh_toan": "47600000.00", "nguoi_cap_nhat": 1, "ngay_cap_nhat": "2026-09-17T09:31:02.114Z" }
}
```

Over-limit failure `422` (warning mode without acknowledgement — `order.service.js:304-310`):

```json
{
  "success": false,
  "message": "Cảnh báo: Đơn hàng vượt hạn mức tín dụng của khách hàng (50.000.000 VNĐ). Cần xác nhận cảnh báo để tiếp tục.",
  "errorCode": "CUSTOMER_CREDIT_LIMIT_EXCEEDED",
  "details": [{ "field": "acknowledgeCreditLimit", "message": "Cần xác nhận vượt hạn mức tín dụng." }]
}
```

### 3.3 Create delivery + transition — `POST /giao-hang`

Create (Vietnamese aliases shown; English aliases accepted interchangeably):

```bash
curl -X POST "$BASE_URL/giao-hang" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ma_don_ban_hang": 501,
    "ma_kho": 3,
    "ngay_giao": "2026-09-20",
    "ten_nguoi_nhan": "Nguyễn Văn Nhận",
    "dia_chi_giao": "Số 10 phố May, Hà Nội",
    "nguoi_giao_hang": 5
  }'
```

Response `201` (`delivery.repository.js:151-191`; new row starts `cho_giao`):

```json
{
  "success": true,
  "message": "Tạo đợt giao hàng thành công.",
  "data": { "id": 71, "ma_giao_hang": "GH-2026-518204", "ma_don_ban_hang": 501, "ma_kho": 3, "ngay_giao": "2026-09-20T00:00:00.000Z", "ten_nguoi_nhan": "Nguyễn Văn Nhận", "dia_chi_giao": "Số 10 phố May, Hà Nội", "phuong_tien_van_chuyen": null, "nguoi_giao_hang": 5, "ghi_chu": null, "trang_thai": "cho_giao" }
}
```

Transition to `dang_giao`:

```bash
curl -X POST "$BASE_URL/giao-hang/71/start" -H "Authorization: Bearer $TOKEN"
```

Response `200`:

```json
{ "success": true, "message": "Bắt đầu vận chuyển đợt giao hàng thành công.", "data": { "id": 71, "ma_giao_hang": "GH-2026-518204", "trang_thai": "dang_giao", "nguoi_cap_nhat": 5, "ngay_cap_nhat": "2026-09-20T02:05:44.008Z" } }
```

Out-of-order transition failure `422` (`delivery.service.js:204-209`):

```json
{ "success": false, "message": "Chỉ đợt giao hàng ở trạng thái \"Chờ giao\" mới có thể bắt đầu vận chuyển (Hiện tại: \"da_giao\").", "errorCode": "DELIVERY_INVALID_STATE", "details": null }
```

### 3.4 Issue invoice — `POST /hoa-don`

Request:

```bash
curl -X POST "$BASE_URL/hoa-don" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "ma_don_ban_hang": 501, "ma_khach_hang": 12, "ngay_xuat_hoa_don": "2026-09-21", "so_tien_da_thu": 10000000, "ghi_chu": "Thu trước 10 triệu" }'
```

Response `201` (`invoice.repository.js:282-414`; due date derived from the customer's credit terms):

```json
{
  "success": true,
  "message": "Xuất hóa đơn bán hàng thành công.",
  "data": { "id": 812, "ma_hoa_don": "HDBH-2026-000812", "ma_don_ban_hang": 501, "ma_khach_hang": 12, "ngay_xuat_hoa_don": "2026-09-21T00:00:00.000Z", "ngay_dao_han": "2026-10-21T00:00:00.000Z", "tong_tien_truoc_thue": "43000000.00", "tien_thue": "4300000.00", "tong_tien_sau_thue": "47300000.00", "so_tien_da_thu": "10000000.00", "trang_thai": "thanh_toan_mot_phan", "ghi_chu": "Thu trước 10 triệu" }
}
```

Duplicate issue failure `409` (`invoice.service.js:132-133`):

```json
{ "success": false, "message": "Đơn hàng \"DBH-2026-482913\" đã được xuất hóa đơn (HDBH-2026-000812).", "errorCode": "INVOICE_ALREADY_EXISTS", "details": null }
```

### 3.5 Receivables list + aging — `GET /cong-no`

List with filters:

```bash
curl -G "$BASE_URL/cong-no" -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "trang_thai=qua_han" \
  --data-urlencode "overdueOnly=true" \
  --data-urlencode "page=1" --data-urlencode "pageSize=20"
```

Response `200` (row columns from `receivable.repository.js:93-97`):

```json
{
  "success": true,
  "message": null,
  "data": [
    { "id": 3001, "loai_cong_no": "phai_thu", "ma_khach_hang": 12, "ten_khach_hang": "Công ty TNHH ABC", "ma_khach_hang_code": "KH-2026-118204", "ma_hoa_don": 812, "ma_hoa_don_code": "HDBH-2026-000812", "so_tien_phat_sinh": "47300000.00", "so_tien_da_thanh_toan": "10000000.00", "so_tien_con_lai": "37300000.00", "ngay_dao_han": "2026-08-01T00:00:00.000Z" }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 1, "totalPages": 1 }
}
```

Aging report (Finance permission required):

```bash
curl "$BASE_URL/cong-no/aging" -H "Authorization: Bearer $TOKEN"
```

Response `200` (`receivable.repository.js:195-233`):

```json
{
  "success": true,
  "message": null,
  "data": {
    "current":      { "label": "Trong hạn",     "minDays": null, "maxDays": 0,   "totalAmount": "120000000.00", "count": 4 },
    "days1To30":    { "label": "1 – 30 ngày",   "minDays": 1,    "maxDays": 30,  "totalAmount": "37300000.00",  "count": 1 },
    "days31To60":   { "label": "31 – 60 ngày",  "minDays": 31,   "maxDays": 60,  "totalAmount": "0.00",         "count": 0 },
    "days61To90":   { "label": "61 – 90 ngày",  "minDays": 61,   "maxDays": 90,  "totalAmount": "0.00",         "count": 0 },
    "daysOver90":   { "label": "Trên 90 ngày",  "minDays": 91,   "maxDays": null,"totalAmount": "0.00",         "count": 0 },
    "totalReceivables": "157300000.00"
  }
}
```

### 3.6 Overview summary — `GET /tong-quan/summary`

```bash
curl -G "$BASE_URL/tong-quan/summary" -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "period=month" --data-urlencode "limit=10"
```

Response `200` for an `admin`/`ban_hang` caller (full scope; money fields are fixed-scale strings — `overview.service.js:219-232`, `overview.repository.js:56-129`):

```json
{
  "success": true,
  "message": null,
  "data": {
    "scope": "full",
    "metrics": {
      "orderCount": 42,
      "totalOrderValue": "1573000000.00",
      "statusCounts": { "cho_xac_nhan": 5, "da_xac_nhan": 9, "dang_san_xuat": 6, "da_giao": 21, "huy": 1 },
      "openReceivable": "157300000.00",
      "overdueReceivable": "37300000.00",
      "unpaidInvoiceCount": 7,
      "overdueInvoiceCount": 1
    }
  }
}
```

A `kho` caller receives fulfilment fields only (`metrics` = `{ orderCount, statusCounts }`); a `ke_toan` caller receives the financial fields only (`selectSummaryMetrics`, `overview.service.js:158-170`).

---

## 4. Error Code Index

### 4.1 Module error codes (rendered by `salesErrorBoundary`)

Every code below originates in the module's `AppError` hierarchy, so it is rendered with `details` (array or `null`).

| errorCode | HTTP | Fixed Vietnamese message (where the message is a constant) | Source |
|---|---|---|---|
| `VALIDATION_ERROR` | 422 | Message is English placeholders (`Validation failed for one or more request fields.` / `…query parameters.`); field-level Vietnamese strings live in `details[].message` | `errors.js:57-59`; e.g. `customer.service.js:80-82`, `validate.js:30-41` |
| `CUSTOMER_NOT_FOUND` | 404 | `Không tìm thấy khách hàng có ID ${id}.` (also `Khách hàng không tồn tại.` in order flows) | `customer.service.js:71,153,172`; `order.service.js:115,278` |
| `CUSTOMER_INACTIVE` | 422 | `Khách hàng đang ở trạng thái tạm khóa hoặc ngừng giao dịch. Không thể tạo đơn hàng mới.` / `Khách hàng không ở trạng thái hoạt động. Không thể xác nhận đơn hàng.` | `order.service.js:118-122,283-285` |
| `PRODUCT_NOT_FOUND` | 404 | `Không tìm thấy sản phẩm có ID ${id}.` / `Sản phẩm có ID ${id} không tồn tại.` | `product.service.js:38,46`; `order.service.js:131,219` |
| `PRODUCT_NOT_SELLABLE` | 422 | `Sản phẩm "${ten_san_pham}" không ở trạng thái sẵn sàng bán.` | `order.service.js:136-138,224-226` |
| `ORDER_NOT_FOUND` | 404 | `Không tìm thấy đơn bán hàng có ID ${id}.` / `Đơn hàng không tồn tại.` | `order.service.js:97,259,317,366`; `delivery.service.js:151`; `invoice.service.js:130` |
| `ORDER_INVALID_STATE` | 422 | Varies by transition — `Không thể chỉnh sửa…`, `Chỉ đơn hàng ở trạng thái "Chờ xác nhận"…`, `Không thể hủy…`, `Đơn hàng đang trong quá trình sản xuất…` | `order.service.js:198-201,270-273,328-339`; `delivery.service.js:154` |
| `CUSTOMER_CREDIT_LIMIT_EXCEEDED` | 422 | Hard block: `Tổng công nợ dự kiến (…) vượt quá hạn mức tín dụng (…). Chính sách yêu cầu chặn xác nhận.`; warning: `Cảnh báo: Đơn hàng vượt hạn mức tín dụng…` (latter carries `details`) | `order.service.js:300-310` |
| `DELIVERY_NOT_FOUND` | 404 | `Không tìm thấy đợt giao hàng có ID ${id}.` | `delivery.service.js:124,202,217,262` |
| `DELIVERY_INVALID_STATE` | 422 (409 for repeat-complete) | `Chỉ đợt giao hàng ở trạng thái "Chờ giao"…` / `…phải được chuyển sang trạng thái "Đang giao" trước…` / `Chỉ đợt giao hàng đang vận chuyển…`; 409: `Đợt giao hàng này đã được xác nhận hoàn thành trước đó…` | `delivery.service.js:205-238,265-269` |
| `DELIVERY_LINES_UNSUPPORTED` | 422 | `Chi tiết sản phẩm giao hàng từng phần chưa được hỗ trợ trong mô hình cơ sở dữ liệu hiện tại (Q11).` | `delivery.service.js:132-136` |
| `WAREHOUSE_NOT_FOUND` | 404 | `Kho hàng xuất kho không tồn tại hoặc đã ngừng hoạt động.` | `delivery.service.js:160` |
| `INVOICE_NOT_FOUND` | 404 | `Không tìm thấy hóa đơn có ID ${id}.` | `invoice.service.js:102` |
| `INVOICE_ALREADY_EXISTS` | 409 | `Đơn hàng đã được xuất hóa đơn.` (or `Đơn hàng "${ma_don_ban}" đã được xuất hóa đơn (${ma_hoa_don}).`) | `invoice.service.js:132-133`; `invoice.repository.js:326-329` |
| `INVOICE_INVALID_ORDER` | 422 | `Không thể xuất hóa đơn cho đơn hàng đang ở trạng thái "${trang_thai}". Đơn hàng phải được xác nhận trước.` | `invoice.repository.js:302-306` (forwarded at `invoice.service.js:141`) |
| `INVOICE_CUSTOMER_MISMATCH` | 422 | `Khách hàng trong yêu cầu xuất hóa đơn không trùng khớp với khách hàng của đơn hàng.` | `invoice.repository.js:310-314` (forwarded at `invoice.service.js:141`) |
| `INVOICE_CREATION_FAILED` | 500 | `Không thể tạo bản ghi hóa đơn.` | `invoice.service.js:145` |
| `DATABASE_CONFLICT` | 409 | Code-collision messages, e.g. `Không thể tạo mã khách hàng duy nhất. Vui lòng thử lại.` (order/delivery/invoice variants) | `errors.js:48-53`; `customer.service.js:103`, `order.service.js:169`, `delivery.service.js:180`, `invoice.service.js:136` |
| `AUTH_FORBIDDEN` | 403 | Default `Bạn không có quyền thực hiện thao tác này.`; order-cancel passes `Đơn hàng đã xác nhận chỉ có thể được hủy bởi Quản trị viên (Admin).` | `errors.js:36-38`; `order.service.js:341-343`; `overview.service.js:143-149` |

Not emitted by any Sales route (defined in `errors.js` but unused here): `BAD_REQUEST` (400, `errors.js:24-27`), `AUTH_UNAUTHORIZED` (401, `errors.js:30-33`), `AUTH_INVALID_CREDENTIALS` (401, `errors.js:63-66`), `AUTH_ACCOUNT_INACTIVE` (403, `errors.js:69-72`), plus the `NotFoundError` default `NOT_FOUND` and `ConflictError` default are overridden at every call site. `requireAuth`/`requireRoles`/`requirePermission` emit their own `UNAUTHORIZED`/`FORBIDDEN` (below) rather than these classes.

### 4.2 Guard & platform error codes (not module `AppError`s)

| errorCode | HTTP | Message (fixed) | Source |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | `Yêu cầu không hợp lệ. Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.` (requireAuth) / `Bạn chưa đăng nhập hoặc không có phiên làm việc hợp lệ.` (roles & permission guards) | `auth.js:171-175`, `auth.js:187-193`, `auth.js:224-230` |
| `FORBIDDEN` | 403 | `Vai trò [${role}] không có quyền thực hiện thao tác này. Cần một trong các vai trò: ${allowedRoles}` (roles) / `Bạn không có đặc quyền cần thiết: [${requiredPermissions}].` (permission) | `auth.js:210-214`, `auth.js:244-248` |
| `INTERNAL_SERVER_ERROR` | 500 (or the thrown status) | `Đã có lỗi xảy ra trên hệ thống.` — Core `errorHandler` fallback for any non-`AppError`; `details` = stack only when `NODE_ENV=development` | `errorHandler.js:5-13` |
| `ROUTE_NOT_FOUND` | 404 | `Đường dẫn [${method} ${originalUrl}] không tồn tại trên hệ thống PH4.` | `errorHandler.js:15-21` |

---

## 5. Cross-references

- Business rules (credit-limit policy, order cancel matrix, delivery transitions, aging bucket edge rules, status derivation) are out of scope here and belong to the business-rules handover document (`PH1-HANDOVER-002`).
- RBAC rulings R-1 / R-2 and the frozen Core permission matrix are described in the RBAC handover document (`PH1-HANDOVER-003`).
- Integration wiring (Express mount order, shared DB pool, error handlers) is described in the integration handover document (`PH1-HANDOVER-004`).
