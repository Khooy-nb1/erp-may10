# API Business Error Codes — ERP Sales & Customer Management

**Document Status:** Technical Baseline (P0 Contract)  
**Verification State:** Static SQL schema analysis verified; live PostgreSQL runtime comparison and seed linkage execution are **BLOCKED** pending access to a reachable development database instance.  
**Scope:** Authoritative business error definitions returned in the standard error envelope across `/api/v1/*`.

---

## 1. Error Response Contract

All error responses return HTTP status codes in the $4xx$ or $5xx$ range with the standard JSON envelope:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE_NAME",
    "message": "Safe human-readable explanation.",
    "details": null
  }
}
```

- **`code`**: A stable, uppercase, snake_case string token used by the frontend to trigger specific UI workflows or localized banners.
- **`message`**: A production-safe, generic English explanation. **Must never reveal database internals, column names, SQL errors, or stack traces.**
- **`details`**: Optional structured object or array containing field-specific errors, primarily used with `VALIDATION_ERROR`.

---

## 2. Business Error Code Catalog

| Error Code | HTTP Status | Domain | Safe Public Message | Description / Trigger Condition |
|---|:---:|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | Auth | `Invalid email or password.` | Failed login attempt. Uses uniform message to prevent user enumeration. |
| `AUTH_ACCOUNT_INACTIVE` | 403 | Auth | `Your account has been deactivated or locked. Please contact an administrator.` | User exists but `nguoi_dung.trang_thai != 'hoat_dong'`. |
| `AUTH_UNAUTHORIZED` | 401 | Auth | `Authentication required. Token is missing, expired, or invalid.` | Protected endpoint called without a valid Bearer JWT. |
| `AUTH_FORBIDDEN` | 403 | Auth | `You do not have permission to perform this action.` | Authenticated user's role lacks the required RBAC capability. |
| `CUSTOMER_NOT_FOUND` | 404 | Customer | `The specified customer was not found.` | Primary key lookup on `khach_hang` returned no record. |
| `CUSTOMER_INACTIVE` | 422 | Customer | `Customer is inactive or suspended. New transactions are blocked.` | `khach_hang.trang_thai IN ('tam_khoa', 'ngung_giao_dich')` when attempting to create or confirm an order. |
| `CUSTOMER_CREDIT_LIMIT_EXCEEDED` | Policy-dependent | Customer | `Order confirmation exceeds the approved customer credit policy.` | Candidate condition: projected outstanding receivable + order total exceeds `khach_hang.han_muc_cong_no`; warning versus hard block remains unresolved. |
| `PRODUCT_NOT_FOUND` | 404 | Product | `The specified product was not found.` | Product ID referenced in order lines does not exist in `san_pham`. |
| `PRODUCT_NOT_SELLABLE` | 422 | Product | `Product is discontinued or not available for sale.` | `san_pham.trang_thai != 'dang_ban'`. |
| `ORDER_NOT_FOUND` | 404 | Sales Order | `The specified sales order was not found.` | Primary key lookup on `don_ban_hang` returned no record. |
| `ORDER_INVALID_STATE` | 409 / 422 | Sales Order | `The sales order cannot be modified or transitioned in its current state.` | Mutation attempted on an order whose state disallows edits or the requested transition. |
| `ORDER_INVALID_DELIVERY_DATE` | 422 | Sales Order | `Requested delivery date cannot be earlier than order date.` | `ngay_giao_hang_yc < ngay_dat_hang`. |
| `ORDER_EMPTY` | 422 | Sales Order | `Sales order must contain at least one product line.` | Order creation or update submitted with zero line items. |
| `ORDER_INVALID_QUANTITY` | 422 | Sales Order | `Product line quantity must be strictly greater than zero.` | `chi_tiet_don_ban_hang.so_luong <= 0`. |
| `ORDER_INVALID_DISCOUNT` | 422 | Sales Order | `Discount rate must be between 0 and 100 percent.` | `ty_le_giam_gia < 0 OR ty_le_giam_gia > 100`. |
| `DELIVERY_NOT_FOUND` | 404 | Delivery | `The specified delivery was not found.` | Primary key lookup on `giao_hang` returned no record. |
| `DELIVERY_INVALID_STATE` | 409 / 422 | Delivery | `The delivery cannot be transitioned in its current state.` | Action attempted on a terminal or incompatible delivery state (`da_giao`, `that_bai`). |
| `DELIVERY_QUANTITY_EXCEEDED` | Policy-dependent; 422 if Q11 enables cumulative quantities | Delivery | `Delivered quantity exceeds remaining order quantity.` | Candidate condition only when the approved Q11 strategy permits cumulative line updates. |
| `INVOICE_NOT_FOUND` | 404 | Invoice | `The specified invoice was not found.` | Primary key lookup on `hoa_don_ban_hang` returned no record. |
| `INVOICE_INVALID_ORDER` | Policy-dependent; 422 when invoice policy rejects a state | Invoice | `Invoice cannot be generated under the current invoice policy.` | Candidate condition: order state/timing is not allowed by the approved invoice policy. |
| `INVOICE_ALREADY_EXISTS` | Policy-dependent; 409 when duplicate policy is one-to-one | Invoice | `An invoice has already been issued for this sales order.` | Candidate condition when the approved invoice multiplicity policy disallows another invoice. |
| `RECEIVABLE_NOT_FOUND` | 404 | Receivables | `The specified receivable record was not found.` | Primary key lookup on `cong_no` (filtered by `phai_thu`) returned no record. |
| `VALIDATION_ERROR` | 422 | System | `Validation failed for one or more request fields.` | Request payload schema validation failed (missing fields, wrong types, pattern errors). |
| `DATABASE_CONFLICT` | 409 | System | `Operation conflicted with existing data or concurrent modification.` | Unique constraint violation (`23505`) or optimistic locking collision. |
| `INTERNAL_ERROR` | 500 | System | `An unexpected internal error occurred. Please contact support.` | Unhandled server exception or unrecoverable database fault. |

---

## 3. Detailed Error Specifications & Security Safeguards

### 3.1 Authentication & Authorization

#### `AUTH_INVALID_CREDENTIALS` (HTTP 401)
- **Security Rule:** The response must be identical whether the email does not exist or the password hash check fails. Never emit "User not found" or "Incorrect password" to prevent user enumeration attacks.
- **Payload:**
  ```json
  {
    "success": false,
    "data": null,
    "error": {
      "code": "AUTH_INVALID_CREDENTIALS",
      "message": "Invalid email or password.",
      "details": null
    }
  }
  ```

#### `AUTH_ACCOUNT_INACTIVE` (HTTP 403)
- **Trigger:** Valid email and password supplied, but user record has `trang_thai = 'khoa'` or `'nghi_viec'`.
- **Payload:**
  ```json
  {
    "success": false,
    "data": null,
    "error": {
      "code": "AUTH_ACCOUNT_INACTIVE",
      "message": "Your account has been deactivated or locked. Please contact an administrator.",
      "details": null
    }
  }
  ```

#### `AUTH_UNAUTHORIZED` (HTTP 401)
- **Trigger:** Request header lacks `Authorization: Bearer <token>`, token is expired, or signature verification fails.

#### `AUTH_FORBIDDEN` (HTTP 403)
- **Trigger:** Token is valid, but the user's role (`vai_tro`) does not possess permission for the requested resource or mutation (e.g., `kho` user attempting `POST /api/v1/customers`).

---

### 3.2 Customer Management

#### `CUSTOMER_NOT_FOUND` (HTTP 404)
- **Trigger:** `SELECT ... FROM khach_hang WHERE id = $1` yields 0 rows.

#### `CUSTOMER_INACTIVE` (HTTP 422)
- **Trigger:** An order creation or confirmation attempt targets a customer with `trang_thai = 'tam_khoa'` or `'ngung_giao_dich'`.
- **Recovery:** Customer must be reviewed and restored to `'hoat_dong'` by an authorized user (`admin` / `ke_toan`) before new commercial commitments can proceed.

#### `CUSTOMER_CREDIT_LIMIT_EXCEEDED` (policy-dependent)
- **Candidate trigger:** If the approved credit policy requires a limit check and projected exposure exceeds `khach_hang.han_muc_cong_no`:
  $$\text{currentOutstanding} + \text{tong\_thanh\_toan} > \text{han\_muc\_cong\_no}$$
  where `currentOutstanding` is $\sum(\text{cong\_no.so\_tien\_con\_lai})$ for `loai_cong_no = 'phai_thu'`.
- **Policy status:** Warning versus hard block is unresolved. The HTTP response and acknowledgement behavior must be selected by the approved policy owner.

---

### 3.3 Products

#### `PRODUCT_NOT_FOUND` (HTTP 404)
- **Trigger:** One or more product IDs in `chi_tiet_don_ban_hang` do not exist in `san_pham`.

#### `PRODUCT_NOT_SELLABLE` (HTTP 422)
- **Trigger:** Product exists but has `trang_thai = 'ngung_ban'` or is an unapproved sample `'mau_moi'`.

---

### 3.4 Sales Orders

#### `ORDER_NOT_FOUND` (HTTP 404)
- **Trigger:** Target `don_ban_hang.id` does not exist.

#### `ORDER_INVALID_STATE` (HTTP 409 / 422)
- **Trigger Examples:**
  - Attempting to edit line items on an order with `trang_thai != 'cho_xac_nhan'`.
  - Attempting to confirm an order that is already confirmed (`da_xac_nhan`) or cancelled (`huy`).
  - Attempting to cancel an order currently in production (`dang_san_xuat`) or delivered (`da_giao`).
- **Payload:**
  ```json
  {
    "success": false,
    "data": null,
    "error": {
      "code": "ORDER_INVALID_STATE",
      "message": "The sales order cannot be edited in its current state.",
      "details": {
        "currentState": "da_xac_nhan",
        "allowedStates": ["cho_xac_nhan"]
      }
    }
  }
  ```

#### `ORDER_INVALID_DELIVERY_DATE` (HTTP 422)
- **Trigger:** `ngay_giao_hang_yc < ngay_dat_hang`. Delivery date cannot be in the past relative to the order placement date.

#### `ORDER_EMPTY` (HTTP 422)
- **Trigger:** Payload `lines` array is empty or contains zero valid rows.

#### `ORDER_INVALID_QUANTITY` (HTTP 422)
- **Trigger:** Any line item has `so_luong <= 0`.

#### `ORDER_INVALID_DISCOUNT` (HTTP 422)
- **Trigger:** Any line item has `ty_le_giam_gia < 0` or `ty_le_giam_gia > 100`.

---

### 3.5 Delivery Management

#### `DELIVERY_NOT_FOUND` (HTTP 404)
- **Trigger:** `giao_hang.id` does not exist.

#### `DELIVERY_INVALID_STATE` (HTTP 409 / 422)
- **Trigger:** Attempting to complete a delivery that is in `cho_giao` (must transition `cho_giao` $\rightarrow$ `dang_giao` $\rightarrow$ `da_giao`), or attempting to re-deliver an already completed delivery (`da_giao`).

#### `DELIVERY_QUANTITY_EXCEEDED` (policy-dependent)
- **Candidate trigger:** Only if Q11 approves cumulative line quantities and a submitted quantity exceeds the remaining unfulfilled amount:
  $$\text{so\_luong\_giao\_moi} > (\text{so\_luong} - \text{so\_luong\_giao})$$
- Under the interim header-only strategy, this mutation is not exposed.

---

### 3.6 Invoices & Receivables

#### `INVOICE_NOT_FOUND` (HTTP 404)
- **Trigger:** `hoa_don_ban_hang.id` does not exist.

#### `INVOICE_INVALID_ORDER` (policy-dependent)
- **Trigger:** The approved invoice policy rejects the target order's state or timing. The allowed states and invoice timing are unresolved in P0; do not hard-code `cho_xac_nhan`, `da_xac_nhan`, `dang_san_xuat`, or `da_giao` as final until Q6 is answered.

#### `INVOICE_ALREADY_EXISTS` (policy-dependent)
- **Trigger:** The approved invoice multiplicity policy disallows another invoice for the order. The current schema does not enforce one-to-one uniqueness.

#### `RECEIVABLE_NOT_FOUND` (HTTP 404)
- **Trigger:** `cong_no.id` does not exist or has `loai_cong_no != 'phai_thu'`. Sales module queries strictly filter receivables (`phai_thu`); any lookup on payable (`phai_tra`) records must return `RECEIVABLE_NOT_FOUND` to protect cross-module security boundaries.

---

### 3.7 System & Validation Errors

#### `VALIDATION_ERROR` (HTTP 422)
- **Trigger:** Joi / Zod / express-validator payload schema rejection.
- **Structured Details Schema:**
  ```json
  {
    "success": false,
    "data": null,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Validation failed for one or more request fields.",
      "details": [
        {
          "field": "lines[0].so_luong",
          "message": "Quantity must be greater than zero."
        },
        {
          "field": "so_dien_thoai",
          "message": "Phone number is invalid."
        }
      ]
    }
  }
  ```

#### `DATABASE_CONFLICT` (HTTP 409)
- **Trigger:** PostgreSQL unique constraint violation (`code: '23505'`) on business codes (`ma_khach_hang`, `ma_don_ban`, `ma_giao_hang`, `ma_hoa_don`) or concurrent update race conditions.
- **Safe Message:** "Operation conflicted with existing data or concurrent modification." **Never expose internal constraint names or raw SQL queries.**

#### `INTERNAL_ERROR` (HTTP 500)
- **Trigger:** Unhandled exceptions, connection pool exhaustion, database downtime.
- **Security Rule:** Full error details and stack traces are logged internally to server logs (with request correlation ID); client receives only safe generic message.

---

## 4. Open Policy Points

1. **Credit Limit Override:** If business approves a soft-warning credit policy, `CUSTOMER_CREDIT_LIMIT_EXCEEDED` will be supplemented with a confirmation override flag (`acknowledgeCreditLimit: true`) rather than a hard blocking 422.
2. **Partial Invoicing:** If multi-invoice per order is permitted in Phase 7, `INVOICE_ALREADY_EXISTS` will only trigger when cumulative invoiced amount exceeds order total.
