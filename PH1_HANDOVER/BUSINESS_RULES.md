# PH1 Handover — Business Rules
**Document ID:** PH1-HANDOVER-003
**Date:** 2026-09-17
**Scope:** Server-authoritative business rules of the ported PH1 Sales module: order lifecycle, pricing, customers, credit policy, delivery, invoicing, receivables, product reads, and validation. Covers `backend/src/services/sales/*.js`, `backend/src/repositories/sales/*.js`, `backend/src/utils/sales/*.js`, `backend/src/config/sales.js`, and the `/api/v1/sales/*` route guards.
**Provenance:** every claim below is derived from the cited source files at the commit in the working tree.

Paths are relative to the `ph1-integration` repository root. Module is mounted at `/api/v1/sales` (`backend/src/routes/salesRoutes.js`), every endpoint behind Core `requireAuth`. Roles named below are Core canonical roles (`admin`, `ban_hang`, `kho`, `ke_toan`; `backend/src/config/roleMapping.js`).

---

## 1. Sales order lifecycle

### 1.1 Status set
`ORDER_STATUSES = ['cho_xac_nhan', 'da_xac_nhan', 'dang_san_xuat', 'da_giao', 'huy']`
— `backend/src/services/sales/order.service.js:25`. The same five values back the overview status breakdown (`backend/src/repositories/sales/overview.repository.js:26`).

| Status | Meaning | Written by (this module) |
|---|---|---|
| `cho_xac_nhan` | Pending confirmation (initial state) | `create` — `order.repository.js:193` |
| `da_xac_nhan` | Confirmed | `confirmOrder` — `order.service.js:315` |
| `dang_san_xuat` | In production | **no writer in this module** (PH2 territory) |
| `da_giao` | Delivered | **no writer in this module** |
| `huy` | Cancelled | `cancelOrder` — `order.service.js:361-363` |

The module exposes no endpoint that sets `dang_san_xuat` or `da_giao`; delivery completion (`giao_hang`) does **not** advance `don_ban_hang.trang_thai` (see §5).

### 1.2 Allowed transitions (guarded)

| # | From → To | Guard (exact condition) | Actor | Error on violation |
|---|---|---|---|---|
| T1 | (none) → `cho_xac_nhan` | create always forces `'cho_xac_nhan'` in the INSERT | `requirePermission('sales.create')` = `admin`, `ban_hang` (`orders.routes.js:43`; holders `roleMapping.js`) | — |
| T2 | `cho_xac_nhan` → `cho_xac_nhan` (edit) | `existingOrder.trang_thai !== 'cho_xac_nhan'` → reject | `requirePermission('sales.update')` = `admin`, `ban_hang` (`orders.routes.js:63`) | 422 `ORDER_INVALID_STATE` (`order.service.js:196-200`) |
| T3 | `cho_xac_nhan` → `da_xac_nhan` | `order.trang_thai !== 'cho_xac_nhan'` → reject; then customer must be `hoat_dong` (`:280`) and credit check (§4) | `requirePermission('sales.approve')` = `admin`, `ban_hang` (`orders.routes.js:73`) | 422 `ORDER_INVALID_STATE` (`:268-272`); 422 `CUSTOMER_INACTIVE` (`:280-284`) |
| T4 | any except `huy`/`da_giao`/`dang_san_xuat` → `huy` | `trang_thai === 'huy' \|\| 'da_giao'` reject (`:324-329`); `trang_thai === 'dang_san_xuat'` reject (`:334-339`) | `requirePermission('sales.update')` (`orders.routes.js:83`) | 422 `ORDER_INVALID_STATE` |
| T5 | `da_xac_nhan` → `huy` (**admin-only**) | `order.trang_thai === 'da_xac_nhan' && userRole !== 'admin'` → reject. `userRole` = `currentRole(req)`, which returns `''` when unresolvable, and `'' !== 'admin'` fails closed | `admin` only (`roleMapping` grants `sales.update` to `ban_hang` too, but the service guard overrides) | 403 `ForbiddenError` — `order.service.js:342-345` |

Notes:
- Allowed cancel sources are therefore `cho_xac_nhan` (any `sales.update` holder) and `da_xac_nhan` (admin only). `dang_san_xuat`, `da_giao`, `huy` are never cancellable — `order.service.js:324-339`.
- `cancelOrderSchema` requires a non-empty `ly_do`: `'Lý do hủy đơn hàng là bắt buộc'` (`order.service.js:67`).

### 1.3 What each transition writes

| Operation | Columns written | Provenance |
|---|---|---|
| Create | Header INSERT sets `trang_thai='cho_xac_nhan'`, `nguoi_tao = nguoi_cap_nhat = creatorId`; each line gets `so_luong_giao = 0`, `trang_thai='chua_giao'`, `nguoi_tao = creatorId` | `order.repository.js:187-241` |
| Update (T2) | `nguoi_cap_nhat`, `ngay_cap_nhat = NOW()`; optional `ngay_giao_hang_yc`, `dia_chi_giao_hang`, `ghi_chu`, recalculated totals; if `lines` supplied: **all existing lines are DELETEd** and re-inserted | `order.repository.js:257-330` |
| Confirm (T3) | `trang_thai='da_xac_nhan'`, `nguoi_cap_nhat`, `ngay_cap_nhat = NOW()` | `order.repository.js:344-346`; `order.service.js:315` |
| Cancel (T4/T5) | `trang_thai='huy'`, `nguoi_cap_nhat`, `ngay_cap_nhat = NOW()`, plus appended `ghi_chu` note: `"<existing> \| [HỦY ĐƠN: <ly_do>]"` (or the note alone when `ghi_chu` is null) | `order.service.js:357-363`; `order.repository.js:344-356` |

Every status write stamps `nguoi_cap_nhat = updaterId` and `ngay_cap_nhat = NOW()` (`order.repository.js:344-345`). The actor id comes from `currentUserId(req)` which falls back to `1` when `req.user.id` is absent (`backend/src/utils/sales/identity.js`). `order.repository.updateStatus` also supports an `ngay_giao_thuc_te` extra field (`order.repository.js:348-351`), but no service in this module passes it.

---

## 2. Order pricing & totals

Server-authoritative calculation lives in `backend/src/utils/sales/pricing.js` (ported unchanged from PH1 `utils/pricing.ts`).

### 2.1 Rounding
`roundHalfUp(num, decimals = 2)` — `pricing.js:11-14`:
```
const factor = Math.pow(10, decimals);
return Math.round((num + Number.EPSILON) * factor) / factor;
```
Algorithm: shift by `10^decimals`, add `Number.EPSILON` to counter floating-point representation error, `Math.round` (round-half-toward-`+∞` for positives), then shift back. All money in a calculation is rounded to 2 decimals at each step.

### 2.2 Line math (`calculateOrderTotals`, `pricing.js:16-46`)
Per line, with `qty = Number(so_luong)||0`, `price = Number(don_gia)||0`, `discountRate = Number(ty_le_giam_gia)||0`:

| Field | Formula | Provenance |
|---|---|---|
| `grossLine` | `roundHalfUp(qty * price, 2)` | `:25` |
| `discountLine` | `roundHalfUp((grossLine * discountRate) / 100, 2)` | `:26` |
| `thanh_tien` | `roundHalfUp(grossLine - discountLine, 2)` | `:27` |
| `tong_tien_hang` | running `roundHalfUp(tong_tien_hang + grossLine, 2)` | `:29` |
| `tien_giam_gia` | running `roundHalfUp(tien_giam_gia + discountLine, 2)` | `:30` |

`grossLine` and `discountLine` are returned on each line object in addition to the persisted `thanh_tien` (`:37-39`).

### 2.3 Header math
| Field | Formula | Provenance |
|---|---|---|
| `taxableAmount` | `Math.max(0, roundHalfUp(tong_tien_hang - tien_giam_gia, 2))` | `:44` |
| `tien_thue` | `roundHalfUp(taxableAmount * taxRate, 2)` | `:45` |
| `tong_thanh_toan` | `roundHalfUp(taxableAmount + tien_thue, 2)` | `:46` |

`taxRate` defaults to `salesConfig.TAX_RATE` (`pricing.js:16`) — `config/sales.js:13-20,28`: env `TAX_RATE`, `0` when unset/empty/NaN/`<0`/`>1`, else the parsed value (0..1).

### 2.4 Line discount percentage
`ty_le_giam_gia` is a percentage (not a fraction). Validated `0..100` with messages `'Chiết khấu không được âm'` / `'Chiết khấu tối đa 100%'`, default `0` (`order.service.js:30`). Applied multiplicatively to `grossLine` (§2.2).

### 2.5 Client totals are ignored
`createOrder` and `updateOrder` never read header totals from the request. The create schema accepts only `ma_khach_hang`, dates, address, `ghi_chu`, `lines` (`order.service.js:34-42`); line inputs accept only `ma_san_pham`, `so_luong`, `ty_le_giam_gia`, `ghi_chu` (`:27-32`). `don_gia` is taken from `product.gia_ban`, **not** from the request:
```
don_gia: Number(product.gia_ban), // Authoritative price from DB
```
— `order.service.js:145-146` (create) and `:229-230` (update). Persisted totals come only from `calculateOrderTotals(...)` (`:157-166`, `:250-262`). Any client-submitted `tong_tien_hang` / `tien_thue` / `tien_giam_gia` / `tong_thanh_toan` / `thanh_tien` is dropped by the schema (unknown object keys are stripped — `utils/sales/validate.js` header contract) and never reaches the INSERT.

---

## 3. Customer rules

Implemented in `backend/src/services/sales/customer.service.js` + `customer.repository.js`.

### 3.1 Code generation
`KH-<year>-<6 digits>`, `year = new Date().getFullYear()`, suffix `Math.floor(100000 + Math.random() * 900000)`; up to **5** attempts, each checked with `repository.findByCode` (case-insensitive `UPPER` match, `customer.repository.js:125`). On exhaustion → 409 `DATABASE_CONFLICT` `'Không thể tạo mã khách hàng duy nhất. Vui lòng thử lại.'` — `customer.service.js:86-104`.

### 3.2 Duplicate detection
`findByCode` compares `UPPER(ma_khach_hang) = UPPER($1)` (`customer.repository.js:125`). There is **no name/phone/email uniqueness rule** — only the generated code is de-duplicated. List search matches code, name, phone, tax code via `ILIKE` (`customer.repository.js:29-38`).

### 3.3 Type, status
- `loai_khach_hang` enum: `['ca_nhan', 'to_chuc', 'dai_ly', 'xuat_khau']` — `customer.service.js:17`.
- `trang_thai` enum: `['hoat_dong', 'tam_khoa', 'ngung_giao_dich']` — `customer.service.js:18`.
- New customers are forced to `trang_thai: 'hoat_dong'` on create (`customer.service.js:119`); a supplied status is ignored.

### 3.4 Status-change rule
`PATCH /khach-hang/:id/status` is **admin-only** (`customers.routes.js:74`, `requireRoles('admin')`). Body is `{ trang_thai, ly_do? }` (`customer.service.js:36-39`); `ly_do` is accepted but not persisted (no reader of it in `updateCustomerStatus`, `:161-170`). Writes `trang_thai`, `nguoi_cap_nhat`, `ngay_cap_nhat = NOW()` (`customer.repository.js:235-244`).

### 3.5 Credit-limit fields
`han_muc_cong_no` (credit limit, numeric `>= 0`, default `0`, message `'Hạn mức công nợ phải lớn hơn hoặc bằng 0'`) and `so_ngay_cong_no` (credit days, integer `>= 0`, default `0`, message `'Số ngày công nợ phải lớn hơn hoặc bằng 0'`) — `customer.service.js:29-30`. `so_ngay_cong_no` drives invoice due dates (§6).

### 3.6 Updatable fields & who
`updateCustomerSchema = createCustomerSchema.partial()` (`customer.service.js:34`) — a PATCH may change any create field except `trang_thai`. `PATCH /khach-hang/:id` requires `sales.update` = `admin`, `ban_hang` (`customers.routes.js:64`). `trang_thai` is excluded from that path (`updatePayload` never sets it — `customer.service.js:141-149`) and only reachable through the admin-only status route.

Read routes (`GET /`, `GET /:id`, `GET /:id/summary`) allow `admin`, `ban_hang`, `ke_toan` (`customers.routes.js:23,54,84`). Create requires `sales.create` = `admin`, `ban_hang` (`:44`).

Text fields are trimmed on write; `email` is also lower-cased; empty optional strings become `null` (`customer.service.js:105-122,141-149`).

---

## 4. Credit policy

### 4.1 Mode
`CREDIT_LIMIT_MODE` — `config/sales.js:21-24`: any value other than exactly `'hard_block'` resolves to `'warning'` (so the effective set is `warning` | `hard_block`; unset/unknown ⇒ `warning`). Exposed at `config/sales.js:30`. PH1 origin: `z.enum(['warning','hard_block']).default('warning')` at `ph1-bh-qlkh/backend/src/config/env.ts:43`.

### 4.2 Exposure computation
Exposure is computed **at confirmation** in `confirmOrder` (`order.service.js:291-310`):
```
creditLimit       = Number(customer.han_muc_cong_no) || 0
currentOutstanding= orderRepository.getCustomerOutstanding(customer.id)
projectedExposure = currentOutstanding + Number(order.tong_thanh_toan)
```
`getCustomerOutstanding` = `COALESCE(SUM(so_tien_con_lai), 0) FROM cong_no WHERE ma_khach_hang = $1 AND loai_cong_no = 'phai_thu'` (`order.repository.js:372-379`).

### 4.3 Enforcement
Only applied when `creditLimit > 0` (`order.service.js:292`). When `projectedExposure > creditLimit`:
- `hard_block` → 422 `CUSTOMER_CREDIT_LIMIT_EXCEEDED` message `'Tổng công nợ dự kiến (...) vượt quá hạn mức tín dụng (...). Chính sách yêu cầu chặn xác nhận.'` (`:298-303`). Always refuses.
- `warning` and `!input.acknowledgeCreditLimit` → 422 `CUSTOMER_CREDIT_LIMIT_EXCEEDED` warning message with field detail `{ field:'acknowledgeCreditLimit', message:'Cần xác nhận vượt hạn mức tín dụng.' }` (`:304-311`). Proceeds when the caller passes `acknowledgeCreditLimit: true` (`confirmOrderSchema`, `:64-66`, default `false`).

**Creation does not run the credit check.** `createOrder` validates only that the customer exists and is `hoat_dong` (`order.service.js:113-124`). The credit gate is exclusive to `confirmOrder`.

---

## 5. Delivery lifecycle

Service `backend/src/services/sales/delivery.service.js`; repository `backend/src/repositories/sales/delivery.repository.js`.

### 5.1 Statuses
`['cho_giao', 'dang_giao', 'da_giao', 'that_bai']` — `delivery.service.js:20`. New deliveries are created as `'cho_giao'` (`delivery.repository.js:160-165`).

### 5.2 Transitions
Status changes go through `repository.transitionStatus(id, expectedStatus, newStatus, updaterId, extra)`, which locks the row with `SELECT ... FOR UPDATE OF g` inside a transaction, re-reads the current status, and only updates when `current.trang_thai === expectedStatus` (`delivery.repository.js:213-262`).

| From → To | Endpoint | Guard | Actor |
|---|---|---|---|
| `cho_giao` → `dang_giao` | `POST /giao-hang/:id/start` | `transitionStatus(id, 'cho_giao', 'dang_giao', …)`; on mismatch → 422 `DELIVERY_INVALID_STATE` `'Chỉ đợt giao hàng ở trạng thái "Chờ giao" mới có thể bắt đầu vận chuyển (Hiện tại: "...").'` | `requireRoles('admin','kho')` (`deliveries.routes.js:65`) |
| `dang_giao` → `da_giao` | `POST /:id/complete` | `transitionStatus(id, 'dang_giao', 'da_giao', …)`; if current is `da_giao` → 409 `'... đã được xác nhận hoàn thành trước đó...'`; if `cho_giao` → 422 `'... phải được chuyển sang trạng thái "Đang giao" trước...'`; else 422 generic | `requireRoles('admin','kho')` (`:76`) |
| `dang_giao` → `that_bai` | `POST /:id/fail` | `transitionStatus(id, 'dang_giao', 'that_bai', …)`; on mismatch → 422 `'Chỉ đợt giao hàng đang vận chuyển mới có thể đánh dấu thất bại (Hiện tại: "...").'` | `requireRoles('admin','kho')` (`:87`) |

`startDelivery`/`completeDelivery` messages: `delivery.service.js:199-237`; `failDelivery`: `:244-276`.

### 5.3 Required reason on failure
`failDeliverySchema` requires non-empty `ly_do` (or alias `reason`): `'Lý do giao hàng thất bại là bắt buộc'` — `delivery.service.js:84-88`. The reason is appended to `ghi_chu`: `"<existing> | [THẤT BẠI: <ly_do>]"` (`:254-259`), written via the `extra.ghi_chu` path of `transitionStatus` (`delivery.repository.js:246-249`).

### 5.4 Linkage to the sales order
Delivery create requires `ma_don_ban_hang` (alias `orderId`; message `'Mã đơn hàng là bắt buộc'`, `delivery.service.js:43-44`) and `ma_kho`/`warehouseId` (`'Kho xuất hàng là bắt buộc'`, `:47-48`), plus `ngay_giao`, `ten_nguoi_nhan`, `dia_chi_giao` (`:51-66`). The order must exist (`checkOrderForDelivery`, `delivery.repository.js:285-290`) and must not be `huy` (`delivery.service.js:152-155`). The warehouse must exist with `trang_thai='hoat_dong'` (`checkWarehouseActive`, `delivery.repository.js:273-276`).

### 5.5 Delivery never mutates stock (PH4 ownership)
`create`/`transitionStatus` touch only the `giao_hang` table; the repository reads `don_ban_hang`, `khach_hang`, `kho`, `nguoi_dung` via joins but never writes them (`delivery.repository.js:list/findById/create/transitionStatus`). There is no `ton_kho`, `lo_vat_tu`, or `phieu_xuat_kho` statement anywhere in the delivery service or repository. Stock movement is owned by PH4. Partial-line delivery is explicitly unsupported: submitting `deliveredLines` returns 422 `DELIVERY_LINES_UNSUPPORTED` `'... chưa được hỗ trợ trong mô hình cơ sở dữ liệu hiện tại (Q11).'` (`delivery.service.js:131-137`).

Delivery code: `GH-<year>-<6 digits>`, 5-attempt collision retry via `findByCode`, else 409 `DATABASE_CONFLICT` (`delivery.service.js:163-183`).

Create requires `admin`, `kho`, or `ban_hang` (`deliveries.routes.js:44`); reads allow `admin`, `ban_hang`, `kho` (`:23,55`).

---

## 6. Invoice issuance

Service `backend/src/services/sales/invoice.service.js`; atomic creation in `invoice.repository.js:createInvoiceAtomic`.

### 6.1 Status set and derivation
`['chua_thanh_toan', 'thanh_toan_mot_phan', 'da_thanh_toan', 'qua_han']` — `invoice.service.js:21`.

`deriveInvoiceStatus(paid, total, dueDate)` — `invoice.service.js:77-86`:
1. `paid >= total` → `'da_thanh_toan'` (highest precedence — a fully paid invoice is never `qua_han`).
2. else if `dueDate.getTime() < Date.now()` → `'qua_han'`.
3. else `paid > 0` → `'thanh_toan_mot_phan'`.
4. else → `'chua_thanh_toan'`.

The repository re-derives the same status on every read via `normalizeInvoiceRecord` (`invoice.repository.js:32-52`), so persisted `trang_thai` may be stale and is never trusted for display. Issuance computes the stored status identically under lock (`:350-357`).

### 6.2 Eligibility (order states)
Inside the locked transaction (`FOR UPDATE OF o`), issuance rejects:
```
if (order.trang_thai === 'cho_xac_nhan' || order.trang_thai === 'huy')
  → error  INVOICE_INVALID_ORDER
```
— `invoice.repository.js:301-307`, message `'Không thể xuất hóa đơn cho đơn hàng đang ở trạng thái "<x>". Đơn hàng phải được xác nhận trước.'`. Eligible states are therefore `da_xac_nhan`, `dang_san_xuat`, `da_giao`.

### 6.3 Duplicate prevention
Under the same lock, a pre-check `SELECT id, ma_hoa_don FROM hoa_don_ban_hang WHERE ma_don_ban_hang = $1 LIMIT 1`; a hit returns error `INVOICE_ALREADY_EXISTS` with message `'Đơn hàng "<ma_don_ban> " đã được xuất hóa đơn (<ma_hoa_don>).'` (`invoice.repository.js:318-330`), surfaced as 409 `INVOICE_ALREADY_EXISTS` (`invoice.service.js:132-134`). Enforcement is **application-level under the order row lock**; the only DB UNIQUE constraint on `hoa_don_ban_hang` is `ma_hoa_don` (one invoice per order is not a DB constraint).

### 6.4 Due date
`calculateDueDate(issueDate, creditDays) = issueDate + max(0, creditDays || 0) days` (`invoice.service.js:72-75`); the atomic path inlines the same math with `creditDays = Number(order.so_ngay_cong_no) || 0` (`invoice.repository.js:347-348`). `so_ngay_cong_no` is the customer's credit term (joined under lock).

### 6.5 Over-payment rejection
`params.paidAmount > tongTienSauThue` → error `VALIDATION_ERROR` `'Số tiền đã thu không được lớn hơn tổng số tiền thanh toán của hóa đơn.'` (`invoice.repository.js:339-344`); mapped by the service to `ValidationError` (`invoice.service.js:138-140`). `so_tien_da_thu` itself must be `>= 0` (`'Số tiền đã thu không được âm'`, `:31`).

### 6.6 Authoritative amounts
`tongTienTruocThue = Math.max(0, tong_tien_hang - tien_giam_gia)`, `tienThue = order.tien_thue`, `tongTienSauThue = order.tong_thanh_toan` — all read from the locked order row, never from the request (`invoice.repository.js:333-337`).

### 6.7 Document-number generation
`HDBH-<year>-<6 digits>`, 5-attempt retry by `SELECT id ... WHERE ma_hoa_don = $1`, then 409 `DATABASE_CONFLICT` `'Không thể tạo mã hóa đơn duy nhất sau nhiều lần thử. Vui lòng thử lại.'` — `invoice.repository.js:359-381`.

### 6.8 Customer match
If `expectedCustomerId` is supplied and `!== Number(order.ma_khach_hang)`, issuance returns `INVOICE_CUSTOMER_MISMATCH` `'Khách hàng trong yêu cầu xuất hóa đơn không trùng khớp với khách hàng của đơn hàng.'` (`invoice.repository.js:309-316`).

### 6.9 Posting scope
`createInvoiceAtomic` writes only the `hoa_don_ban_hang` row; no `cong_no` (receivable) row is inserted anywhere on issuance (`invoice.repository.js:384-411` — the transaction ends with the invoice INSERT `RETURNING *`). The service docstring claims a receivable write, but the code does not perform one; AR posting is out of this module's scope.

Actor: `POST /hoa-don` is `requireRoles('admin','ke_toan')` (`invoices.routes.js:42`). Reads: `admin`, `ban_hang`, `ke_toan` (`:21,52`).

---

## 7. Receivables read model

`backend/src/repositories/sales/receivable.repository.js` + `receivable.service.js`. Read-only: no INSERT/UPDATE/DELETE exists in the file; settlement is Finance-owned (`receivable.service.js` header; ruling R-2).

### 7.1 Hard filter
Every query is constrained to `loai_cong_no = 'phai_thu'` (list `:31`, summary `:129`, aging `:189`), so payables (`phai_tra`) are never surfaced.

### 7.2 Remaining balance and overdue
- Remaining balance is the stored column `so_tien_con_lai` (list SELECT `:96`; summary `SUM(so_tien_con_lai)` `:134`).
- Overdue condition (used for amounts, counts, and `overdueOnly`): `ngay_dao_han < NOW() AND so_tien_con_lai > 0` (`:66`, `:135`, `:136`).
- `days_overdue` per row: `CASE WHEN ngay_dao_han < NOW() AND so_tien_con_lai > 0 THEN GREATEST(0, EXTRACT(DAY FROM NOW() - ngay_dao_han)::integer) ELSE 0 END` (`:98-102`), exposed in camelCase as `daysOverdue` (`:115-116`). The list column `trang_thai` is the persisted `cong_no.trang_thai` (not re-derived).

`getSummary` returns `totalOriginal`, `totalPaid`, `totalOutstanding`, `totalOverdue`, `overdueCount` as strings/counts (`:128-158`).

### 7.3 Aging buckets
`getAgingReport` (`:160-236`), scoped to `so_tien_con_lai > 0`, buckets by `NOW() - ngay_dao_han` using interval arithmetic:

| Bucket key | Label | Boundary (SQL) | `minDays`/`maxDays` |
|---|---|---|---|
| `current` | `'Trong hạn'` | `ngay_dao_han >= NOW()` | `null` / `0` |
| `days1To30` | `'1 – 30 ngày'` | `ngay_dao_han < NOW() AND NOW()-ngay_dao_han < INTERVAL '31 days'` | `1` / `30` |
| `days31To60` | `'31 – 60 ngày'` | `NOW()-ngay_dao_han >= '31 days' AND < '61 days'` | `31` / `60` |
| `days61To90` | `'61 – 90 ngày'` | `NOW()-ngay_dao_han >= '61 days' AND < '91 days'` | `61` / `90` |
| `daysOver90` | `'Trên 90 ngày'` | `NOW()-ngay_dao_han >= INTERVAL '91 days'` | `91` / `null` |

Each bucket returns `{ label, minDays, maxDays, totalAmount, count }`; `totalReceivables = SUM(so_tien_con_lai)` over all positive rows (`:187-235`). Boundaries are chosen so buckets are mutually exclusive and exhaustive: `current + b1..b4 = totalReceivables` and `b1..b4 = totalOverdue` (`:161-172`).

### 7.4 Read-only statement
No write path exists: `receivable.repository.js` exports only `list`, `getSummary`, `getAgingReport` (`:237-240`). PH5 owns all receivable writes. Access: `summaries`/`list` = `requirePermission('sales.view')`; `aging` = `requirePermission('accounting.receivable')` (Finance) — `receivables.routes.js:19,29,39`; per-customer `GET /khach-hang/:id/receivables` = `sales.view` (`customers.routes.js:94`).

---

## 8. Products

`product.repository.js` + `product.service.js`. Read-only — no INSERT/UPDATE/DELETE exists; PH1 never writes inventory master data.

### 8.1 What the module reads
`id`, `ma_san_pham`, `ten_san_pham`, `mo_ta`, `ma_don_vi_tinh`, `dvt.ten_don_vi`, `gia_ban`, `size`, `mau_sac`, `trang_thai`, `ngay_tao`, `ngay_cap_nhat` (`product.repository.js:78-82,101-105,116-120`).

`gia_von` (cost) is **deliberately never selected** — Finance-only in the Core model (`product.repository.js:8-9,71`).

### 8.2 Active / `dang_ban` filtering
The status enum is `['dang_ban', 'ngung_ban', 'mau_moi']` (`product.service.js`). List/read defaults to sellable products: when no `trang_thai` filter is supplied, `conditions.push("sp.trang_thai = 'dang_ban'")` (`product.repository.js:48-54`); an explicit `trang_thai` overrides the default. Order creation enforces sellability independently: `product.trang_thai !== 'dang_ban'` → 422 `PRODUCT_NOT_SELLABLE` (`order.service.js:133-141,221-229`).

### 8.3 No writes
`product.repository.js` exports only `list`, `findById`, `findByCode` (`:126-131`); `product.service.js` exposes only read functions. Reads are gated `requireRoles('admin','ban_hang','kho','ke_toan')` (`products.routes.js`).

---

## 9. Validation rules

The module validates with a local zod-parity validator (`backend/src/utils/sales/validate.js`; `v.string/number/boolean/enum/literal/array/object` + `coerce.*`, modifiers `optional/nullable/default/min/max/int/positive/email/partial/or/refine/superRefine/transform`). Contract kept from zod: unknown object keys are stripped, `.default()` fills missing `undefined`, `.optional()` allows `undefined`, numbers coerce via `Number(value)`, `safeParse` → `{ success, data }` or `{ success:false, error:{ errors:[{path,message}] } }` (`validate.js` header). Generic messages: `required = 'Trường này là bắt buộc.'`, `enum = 'Giá trị không nằm trong danh sách cho phép.'`, etc.

### 9.1 Order create (`order.service.js:34-53`)
| Field | Rule | Vietnamese message |
|---|---|---|
| `ma_khach_hang` | int, positive | `Vui lòng chọn khách hàng` |
| `ngay_dat_hang` | string, min 1 | `Ngày đặt hàng là bắt buộc` |
| `ngay_giao_hang_yc` | string, min 1 | `Ngày giao hàng yêu cầu là bắt buộc` |
| `dia_chi_giao_hang` | string, min 1 | `Địa chỉ giao hàng không được để trống` |
| `lines` | array, min 1 | `Đơn hàng phải có ít nhất một dòng sản phẩm` |
| cross-field refine | `new Date(ngay_giao_hang_yc) >= new Date(ngay_dat_hang)` | `Ngày giao hàng yêu cầu không được trước ngày đặt hàng` (path `ngay_giao_hang_yc`) |

Order line (`:28-30`): `ma_san_pham` int positive → `Mã sản phẩm không hợp lệ`; `so_luong` positive → `Số lượng đặt phải lớn hơn 0`; `ty_le_giam_gia` `0..100` default 0 → `Chiết khấu không được âm` / `Chiết khấu tối đa 100%`.

### 9.2 Order cancel / confirm
- `cancelOrderSchema`: `ly_do` string min 1 → `Lý do hủy đơn hàng là bắt buộc` (`order.service.js:67`).
- `confirmOrderSchema`: `acknowledgeCreditLimit` boolean, default `false` (`:64-66`).

Service-level checks (beyond the schema), each an error code:
- `CUSTOMER_NOT_FOUND` (404) / `CUSTOMER_INACTIVE` (422) on create and confirm — `order.service.js:113-124, 278-284`.
- `PRODUCT_NOT_FOUND` (404) / `PRODUCT_NOT_SELLABLE` (422) — `:128-141, 216-229`.
- `ORDER_NOT_FOUND` (404), `ORDER_INVALID_STATE` (422), `DATABASE_CONFLICT` (409, code-generation exhaustion) — `:96-99, 195-200, 268-272, 324-339`.
- Unknown query params on list fail with `Validation failed for one or more query parameters.` + per-field details (`listOrders`, `:79-88`).

### 9.3 Customer (`customer.service.js:20-39`)
| Field | Rule | Message |
|---|---|---|
| `ten_khach_hang` | string 1..200 | `Tên khách hàng không được để trống` |
| `so_dien_thoai` | string 8..20 | `Số điện thoại phải từ 8 ký tự` |
| `email` | email or `''`, optional/nullable | `Email không đúng định dạng` |
| `dia_chi` | string min 1 | `Địa chỉ không được để trống` |
| `tinh_thanh_pho` | string min 1 | `Tỉnh/thành phố không được để trống` |
| `han_muc_cong_no` | number ≥ 0, default 0 | `Hạn mức công nợ phải lớn hơn hoặc bằng 0` |
| `so_ngay_cong_no` | int ≥ 0, default 0 | `Số ngày công nợ phải lớn hơn hoặc bằng 0` |
| `loai_khach_hang` | enum | — (generic enum message) |
| `ma_so_thue` | string max 20 | — |
| `nguoi_lien_he` | string max 150 | — |

Validation failures raise 422 `VALIDATION_ERROR` with field details via `validationDetails` (`{ field, message }`), `customer.service.js:52-58`.

### 9.4 Delivery (`delivery.service.js:22-88`)
Alias-aware (`ma_don_ban_hang`|`orderId`, `ma_kho`|`warehouseId`, `ngay_giao`|`deliveryDate`, `ten_nguoi_nhan`|`receiverName`, `dia_chi_giao`|`deliveryAddress`, etc.). Required-after-alias: `Mã đơn hàng là bắt buộc`, `Kho xuất hàng là bắt buộc`, `Ngày giao hàng là bắt buộc` (+ `Ngày giao hàng không hợp lệ` when unparseable), `Tên người nhận là bắt buộc`, `Địa chỉ giao hàng là bắt buộc`. `failDeliverySchema` requires `ly_do`/`reason` → `Lý do giao hàng thất bại là bắt buộc`. `deliveredLines` present → 422 `DELIVERY_LINES_UNSUPPORTED`.

### 9.5 Invoice (`invoice.service.js:23-48`)
`ma_don_ban_hang`/`orderId` required → `Mã đơn hàng là bắt buộc`; optional `ngay_xuat_hoa_don`/`issueDate` must parse → `Ngày xuất hóa đơn không hợp lệ`; `so_tien_da_thu`/`paidAmount` ≥ 0 → `Số tiền đã thu không được âm`; default issue date = `new Date().toISOString()` when neither supplied. Service-level errors: `ORDER_NOT_FOUND`, `INVOICE_ALREADY_EXISTS`, `DATABASE_CONFLICT`, `VALIDATION_ERROR`, and atomic-path `INVOICE_INVALID_ORDER` / `INVOICE_CUSTOMER_MISMATCH` (§6).

### 9.6 Shared conventions
- Query schemas bound `page ≥ 1`, `1 ≤ pageSize ≤ 100`, `sortOrder ∈ {ASC,DESC}`; `sortBy` is whitelisted per repository (`ALLOWED_*_SORT_COLUMNS`) and never interpolated raw.
- Error envelopes carry both `statusCode` and `errorCode` (`utils/sales/errors.js`); `details` (field-level) is rendered by Core's handler only under `NODE_ENV=development` (`errors.js` header). Rendered by the module error boundary at `utils/sales/errorBoundary.js`, registered last in `salesRoutes.js`.
- Booleans are coerced with JavaScript `Boolean()`, so the string `"false"` coerces to `true` — a preserved PH1 quirk (`validate.js` `v.coerce.boolean`).
