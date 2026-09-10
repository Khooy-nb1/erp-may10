# API & Data Conventions — ERP Sales & Customer Management

**Document Status:** Technical Baseline (P0 Contract)  
**Verification State:** Static SQL schema analysis verified; live PostgreSQL runtime comparison and seed linkage execution are **BLOCKED** pending access to a reachable development database instance.  
**Scope:** Applies to all `/api/v1/*` endpoints across Sales and Customer Management modules.

---

## 1. Base URL & Routing

All backend endpoints are prefixed with:

```text
/api/v1
```

- RESTful resource naming uses plural lowercase kebab-case (e.g., `/api/v1/sales-orders`, `/api/v1/customers`).
- Sub-resource relations follow standard hierarchies (e.g., `/api/v1/customers/:id/receivables`, `/api/v1/sales-orders/:id/lines`).
- RPC-style actions on stateful entities use trailing POST action verbs (e.g., `/api/v1/sales-orders/:id/confirm`, `/api/v1/sales-orders/:id/cancel`, `/api/v1/deliveries/:id/complete`).

---

## 2. Standard Response Envelopes

Every API endpoint must return a structured JSON envelope matching one of the three authoritative schemas below. The frontend client must never receive an un-enveloped array or naked entity.

### 2.1 Standard Success Envelope

Used for single resource fetches, creations, updates, and state action responses.

```json
{
  "success": true,
  "data": {
    "id": 1,
    "ma_khach_hang": "KH-2026-000001",
    "ten_khach_hang": "Công ty May Xuất Khẩu An Phát",
    "trang_thai": "hoat_dong"
  },
  "message": "Customer created successfully.",
  "meta": null
}
```

- `success`: Always boolean `true`.
- `data`: Entity object, summary object, or `{}` if no payload is returned.
- `message`: Optional user-friendly English confirmation string, or `null`.
- `meta`: Always `null` for non-paginated endpoints.

### 2.2 Paginated Success Envelope

Used for all collection query endpoints (`GET /api/v1/customers`, `GET /api/v1/sales-orders`, etc.).

```json
{
  "success": true,
  "data": [
    {
      "id": 101,
      "ma_don_ban": "DBH-2026-000042",
      "tong_thanh_toan": "154000000.00",
      "trang_thai": "cho_xac_nhan"
    }
  ],
  "message": null,
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 125,
    "totalPages": 7
  }
}
```

- `success`: Always boolean `true`.
- `data`: JSON array of matching items. Empty array `[]` when no items match.
- `message`: Typically `null`.
- `meta`: Required object with strict structure:
  - `page`: Current 1-based page number (integer $\ge 1$).
  - `pageSize`: Items per page (integer $1 \le \text{pageSize} \le 100$).
  - `total`: Total matching records count from PostgreSQL (`COUNT(*)`).
  - `totalPages`: Total available pages calculated as $\lceil \text{total} / \text{pageSize} \rceil$.

### 2.3 Error Envelope

Used for all client errors ($4xx$) and server errors ($5xx$).

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

- `success`: Always boolean `false`.
- `data`: Always `null`.
- `error.code`: Standard machine-readable business error string (see `docs/api/error-codes.md`).
- `error.message`: Safe, human-readable English message suitable for display or fallback logging. Never leak SQL syntax, table names, stack traces, or internal file paths.
- `error.details`: `null`, or an array of validation errors for `VALIDATION_ERROR` (e.g., `[{ "field": "email", "message": "Invalid email format" }]`).

---

## 3. Pagination & Query Filtering Rules

1. **Strict Pagination Cap:**
   - Default `page`: `1`
   - Default `pageSize`: `20`
   - Hard Maximum `pageSize`: `100`
   - If a client requests `pageSize > 100`, the server must strictly clamp `pageSize = 100` (or reject with `VALIDATION_ERROR`).
2. **Server-Side Execution Invariant:**
   - **Never load an entire ERP table into memory and filter or paginate in React.**
   - All pagination (`LIMIT` / `OFFSET`), filtering (`WHERE`), and sorting (`ORDER BY`) must be executed directly in PostgreSQL.
3. **Sort Whitelist:**
   - Sort columns must be strictly validated against an explicit whitelist per entity (e.g., `ngay_tao`, `tong_thanh_toan`, `ma_don_ban`).
   - Unrecognized sort parameters must be rejected or defaulted to primary sort (`ngay_tao DESC, id DESC`). Dynamic SQL concatenation is strictly forbidden.

---

## 4. Date and Time Handling

1. **Wire Format (API):**
   - All timestamps must be exchanged over the API as ISO 8601 strings in UTC with full precision:
     ```text
     2026-09-10T08:30:00.000Z
     ```
2. **Database Storage:**
   - The PostgreSQL schema defines timestamp columns as `TIMESTAMPTZ` (`timestamp with time zone`).
   - The backend connection pool (`pg`) must ensure timestamps are parsed and serialized in UTC.
3. **Business Timezone:**
   - The authoritative operational timezone for business reporting, day boundaries, and overdue calculations is:
     ```text
     Asia/Ho_Chi_Minh (UTC+7)
     ```
4. **Date-Only Business Fields:**
   - Fields representing business calendar dates (e.g., `ngay_giao_hang_yc`, `ngay_dao_han`):
     - API input accepted as ISO date strings (`YYYY-MM-DD` or full ISO 8601).
     - Standardized to midnight or end-of-day in `Asia/Ho_Chi_Minh` before comparison.
     - Never rely on browser-local string parsing to avoid off-by-one day bugs across timezones.

---

## 5. Decimal-Safe Monetary Arithmetic

1. **Database Representation:**
   - All monetary fields in `don_ban_hang`, `chi_tiet_don_ban_hang`, `hoa_don_ban_hang`, `cong_no`, and `khach_hang` are defined in PostgreSQL as:
     ```sql
     NUMERIC(18,2)
     ```
2. **Backend Calculation Safety:**
   - **Never use standard IEEE 754 floating-point numbers (`number` in JavaScript/TypeScript) for financial computations.**
   - All currency and tax calculations must use a decimal-safe arithmetic library (e.g., `decimal.js`, `bignumber.js`) or integer-cents representations.
3. **Rounding Rules:**
   - Rounding mode: Standard Half-Up rounding (`ROUND_HALF_UP`) to exactly 2 decimal places at every intermediate line item and final total persistence boundary.
4. **API Serialization & Frontend Display:**
   - Over the wire, monetary fields are serialized as exact numeric strings (e.g., `"475200000.00"`) or exact decimal numbers to avoid precision loss in JSON parsers.
   - Frontend formatting transforms raw numbers to Vietnamese standard currency presentation:
     ```text
     475200000.00 → 475,200,000 ₫
     ```
     (Locale formatting: `vi-VN`, currency: `VND`).

---

## 6. Business Code Generation

1. **Prefix Standard:**
   - Customer Code: `KH-YYYY-NNNNNN` (e.g., `KH-2026-000001`)
   - Sales Order Code: `DBH-YYYY-NNNNNN` (e.g., `DBH-2026-000042`)
   - Delivery Code: `GH-YYYY-NNNNNN` (e.g., `GH-2026-000018`)
   - Sales Invoice Code: `HDBH-YYYY-NNNNNN` (e.g., `HDBH-2026-000007`)
2. **Generation Rules:**
   - Codes must be generated **strictly on the backend service** during transaction creation.
   - **Rule:** Never use `COUNT(*) + 1` or `MAX(id) + 1` (violates uniqueness under concurrency and record deletion).
   - Sequence strategy:
     - Preferred: PostgreSQL sequence or atomic counter table.
     - Fallback for immutable schema: Safe random/lexical candidate generation combined with transactional retry loop catching PostgreSQL unique constraint violation (`23505` $\rightarrow$ `DATABASE_CONFLICT`).
   - Uniqueness is guaranteed by schema constraints:
     - `khach_hang.ma_khach_hang UNIQUE NOT NULL`
     - `don_ban_hang.ma_don_ban UNIQUE NOT NULL`
     - `giao_hang.ma_giao_hang UNIQUE NOT NULL`
     - `hoa_don_ban_hang.ma_hoa_don UNIQUE NOT NULL`

---

## 7. Status Handling & Domain Invariants

1. **Preserve Database Status Values in Backend Domain:**
   - Internal business logic, database queries, and API response payloads must use the exact raw string values defined in `schema.sql`.
   - Never translate database status values to English equivalents in the backend domain models.
2. **Verified Status Values:**

| Table | Status Column | Allowed Database Values | Notes |
|---|---|---|---|
| `khach_hang` | `trang_thai` | `'hoat_dong'`, `'tam_khoa'`, `'ngung_giao_dich'` | Default `'hoat_dong'` |
| `san_pham` | `trang_thai` | `'dang_ban'`, `'ngung_ban'`, `'mau_moi'` | Default `'dang_ban'` |
| `don_ban_hang` | `trang_thai` | `'cho_xac_nhan'`, `'da_xac_nhan'`, `'dang_san_xuat'`, `'da_giao'`, `'huy'` | Default `'cho_xac_nhan'` |
| `chi_tiet_don_ban_hang` | `trang_thai` | `'chua_giao'`, `'giao_mot_phan'`, `'da_giao_du'` | Default `'chua_giao'` |
| `giao_hang` | `trang_thai` | `'cho_giao'`, `'dang_giao'`, `'da_giao'`, `'that_bai'` | Default `'cho_giao'` |
| `hoa_don_ban_hang` | `trang_thai` | `'chua_thanh_toan'`, `'thanh_toan_mot_phan'`, `'da_thanh_toan'`, `'qua_han'` | Default `'chua_thanh_toan'` |
| `cong_no` | `trang_thai` | `'chua_thanh_toan'`, `'mot_phan'`, `'da_thanh_toan'`, `'qua_han'` | **Note:** Uses `'mot_phan'` in `cong_no` vs `'thanh_toan_mot_phan'` in `hoa_don_ban_hang` |
| `nguoi_dung` | `trang_thai` | `'hoat_dong'`, `'khoa'`, `'nghi_viec'` | Default `'hoat_dong'` |

3. **Frontend Presentation Mapping:**
   - The frontend is responsible for mapping domain status strings to localized UI labels and badge colors (e.g., `'cho_xac_nhan'` $\rightarrow$ "Chờ xác nhận" `badge-warning`).

---

## 8. Audit Fields Convention

1. **Audit Columns:** The supplied schema does not give every scoped table the same audit columns. Backend repositories must use the actual per-table column set:
   - `khach_hang`, `don_ban_hang`, `giao_hang`, `hoa_don_ban_hang`, `cong_no`, `san_pham`, and `kho`: `ngay_tao`, `ngay_cap_nhat`, `nguoi_tao`, `nguoi_cap_nhat`.
   - `chi_tiet_don_ban_hang` and `don_vi_tinh`: `ngay_tao`, `nguoi_tao` only.
   - `nguoi_dung`: the four audit columns, with self-reference foreign keys added later in the schema.
2. **Enforcement Rules:**
   - Audit values must never be accepted from client request bodies.
   - On insert, derive and populate only the available `nguoi_tao` field from the validated session/JWT token (`req.user.id`).
   - On update, set only available `nguoi_cap_nhat` and `ngay_cap_nhat` fields from the authenticated identity and server time.
   - Do not claim an update audit trail for tables whose schema lacks update-audit columns.

---

## 9. HTTP Status Mapping

Standardized HTTP semantics mapped across the application:

| HTTP Status | Semantics | Typical Use Case |
|---|---|---|
| `200 OK` | Successful query or idempotent update | `GET`, `PATCH` |
| `201 Created` | Successful creation | `POST /api/v1/customers`, `POST /api/v1/sales-orders` |
| `400 Bad Request` | Malformed JSON or syntax failure | Unparseable payload |
| `401 Unauthorized` | Missing, expired, or invalid token | Unauthenticated requests |
| `403 Forbidden` | Authenticated but lacks RBAC role | `ban_hang` attempting accounting mutation |
| `404 Not Found` | Entity does not exist | `ORDER_NOT_FOUND`, `CUSTOMER_NOT_FOUND` |
| `409 Conflict` | Unique conflict, concurrency, invalid state | `DATABASE_CONFLICT`, `ORDER_INVALID_STATE` |
| `422 Unprocessable` | Semantic validation failure | `ORDER_INVALID_QUANTITY`, `VALIDATION_ERROR` |
| `500 Internal Error` | Uncaught server/database exception | `INTERNAL_ERROR` |

---

## 10. Open & Provisional Decisions

The following policies are unresolved under P0 and must not be silently encoded as production behavior:

1. **Tax Policy:** No rate or fixed/configurable/manual calculation mode is selected. Keep tax calculation behind an explicit policy/configuration boundary until Finance approves it.
2. **Sales Price Overrides:** Provisional default is read-only `san_pham.gia_ban`; ad-hoc overrides remain blocked pending management policy.
3. **Credit Limit Policy:** Warning versus hard block is unresolved. Confirmation must not silently choose either behavior; warning/approval semantics require an approved policy.
4. **Receivables Ownership:** Creation of `cong_no` records on invoice issuance remains disabled in Sales until Accounting confirms module ownership.
