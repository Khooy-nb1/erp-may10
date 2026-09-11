# Dashboard Metric Dictionary (P9)

Scope: PH1 (Sales & CRM) commercial dashboard. All aggregation is performed in PostgreSQL; no raw
transaction rows are sent to the client. All endpoints are under `/api/v1/dashboard`, require a Bearer
token, and return the standard success envelope (`docs/api/conventions.md`).

Business timezone: `Asia/Ho_Chi_Minh` (UTC+7). Every date boundary below is inclusive of the first
instant of `fromDate` and exclusive of the first instant after `toDate`, computed in that timezone.

## 1. Metric definitions

| Metric | Source | Definition | Notes |
|---|---|---|---|
| Order count | `don_ban_hang` | `COUNT(*)` over orders matching the filter, INCLUDING `trang_thai = 'huy'` | Population metric: `SUM(statusCounts) == orderCount` must always hold |
| Total order value | `don_ban_hang` | `SUM(tong_thanh_toan)` where `trang_thai <> 'huy'` | Sales metric: cancelled orders are excluded from ALL sales-value metrics |
| Pending / Confirmed / In production / Delivered / Cancelled | `don_ban_hang.trang_thai` | `COUNT(*)` grouped by `trang_thai` (`cho_xac_nhan`, `da_xac_nhan`, `dang_san_xuat`, `da_giao`, `huy`) | Status counts include every status, including `huy` |
| Open receivable | `cong_no` | `SUM(so_tien_con_lai)` where `loai_cong_no = 'phai_thu'` | Payables (`phai_tra`) never appear in Sales/CRM |
| Overdue receivable | `cong_no` | `SUM(so_tien_con_lai)` where `loai_cong_no = 'phai_thu'` AND `ngay_dao_han < NOW()` AND `so_tien_con_lai > 0` | Identical to P8 `/receivables/summary.totalOverdue` |
| Unpaid invoice count | `hoa_don_ban_hang` | `COUNT(*)` where `so_tien_da_thu < tong_tien_sau_thue` | Derived on read; persisted `trang_thai` may be stale |
| Overdue invoice count | `hoa_don_ban_hang` | `COUNT(*)` where `so_tien_da_thu < tong_tien_sau_thue` AND `ngay_dao_han < NOW()` | Same derivation rule as the invoice module |
| Invoice revenue | `hoa_don_ban_hang` | `SUM(tong_tien_sau_thue)` grouped by issue month (`ngay_xuat_hoa_don`) | The revenue chart labels its source explicitly; never mix with order value |
| Top customers | `don_ban_hang` | `SUM(tong_thanh_toan)` grouped by `ma_khach_hang`, `trang_thai <> 'huy'` | Ordered desc, bounded by `limit` |
| Top products | `chi_tiet_don_ban_hang` joined `don_ban_hang`, `san_pham` | `SUM(thanh_tien)` and `SUM(so_luong)` grouped by product, parent order `trang_thai <> 'huy'` | Product name/code from `san_pham` |

Rule: the word "revenue" is reserved for the invoice-based metric. Order-based money is always called
"total order value" (`tong_thanh_toan`).

## 2. Endpoints and RBAC

| Endpoint | Method | Roles | Notes |
|---|---|---|---|
| `/api/v1/dashboard/summary` | GET | admin (full), ban_hang (full), kho (fulfillment only), ke_toan (financial only) | Response is role-scoped; forbidden metrics are never serialized |
| `/api/v1/dashboard/revenue-chart` | GET | admin, ban_hang, ke_toan | `kho` denied (403) |
| `/api/v1/dashboard/order-status` | GET | admin, ban_hang, kho, ke_toan | Counts by status |
| `/api/v1/dashboard/top-customers` | GET | admin, ban_hang, ke_toan | `kho` denied (403) |
| `/api/v1/dashboard/top-products` | GET | admin, ban_hang, ke_toan | `kho` denied (403) |

`kho` receives only `scope: "fulfillment"` metrics (order-status counts) and no money values; `ke_toan`
receives `scope: "financial"` (receivables, invoices, revenue); `admin` and `ban_hang` receive
`scope: "full"`. This is enforced server-side, not by the UI.

## 3. Shared query filters

| Param | Type | Meaning |
|---|---|---|
| `period` | `month` \| `quarter` \| `year` \| `custom` | Preset window relative to `NOW()` in the business timezone; defaults to `month` |
| `fromDate` | ISO date | Required when `period=custom`; inclusive lower bound |
| `toDate` | ISO date | Required when `period=custom`; exclusive upper bound |
| `nguoi_ban` | integer | Filter orders by `don_ban_hang.nguoi_ban` |
| `loai_khach_hang` | string | Filter by `khach_hang.loai_khach_hang` |
| `limit` | integer 1..50 | Top-N endpoints only; defaults to 10 |

Invalid filters return `422 VALIDATION_ERROR` with field details.

## 4. Response shapes (contract)

`GET /dashboard/summary` →

```json
{
  "success": true,
  "data": {
    "scope": "full",
    "metrics": {
      "orderCount": 42,
      "totalOrderValue": "1234567890.00",
      "statusCounts": { "cho_xac_nhan": 5, "da_xac_nhan": 8, "dang_san_xuat": 3, "da_giao": 25, "huy": 1 },
      "openReceivable": "400000.00",
      "overdueReceivable": "120000.00",
      "unpaidInvoiceCount": 7,
      "overdueInvoiceCount": 2
    }
  }
}
```

`kho` omits all money keys and returns only `orderCount` + `statusCounts`; `ke_toan` omits
`orderCount` / `totalOrderValue` / `statusCounts`.

`GET /dashboard/revenue-chart` →

```json
{
  "success": true,
  "data": {
    "source": "hoa_don_ban_hang.tong_tien_sau_thue",
    "label": "Doanh thu theo hóa đơn",
    "series": [{ "period": "2026-08", "revenue": "5000000.00", "invoiceCount": 3 }],
    "total": "5000000.00"
  }
}
```

`GET /dashboard/order-status` →

```json
{
  "success": true,
  "data": {
    "total": 42,
    "statuses": [{ "status": "cho_xac_nhan", "count": 5 }]
  }
}
```

`GET /dashboard/top-customers` →

```json
{
  "success": true,
  "data": {
    "metric": "don_ban_hang.tong_thanh_toan",
    "items": [{ "maKhachHang": 1, "maKhachHangCode": "KH-001", "tenKhachHang": "…", "orderCount": 3, "totalValue": "9000000.00" }]
  }
}
```

`GET /dashboard/top-products` →

```json
{
  "success": true,
  "data": {
    "metric": "chi_tiet_don_ban_hang.thanh_tien",
    "items": [{ "maSanPham": 1, "maSanPhamCode": "SP-001", "tenSanPham": "…", "quantity": "120.000", "totalValue": "7000000.00" }]
  }
}
```

Money is returned as a string with 2 decimals; quantities as strings with 3 decimals.

## 5. Reconciliation rules

- `summary.openReceivable` and `summary.overdueReceivable` MUST equal
  `/receivables/summary.totalOutstanding` and `.totalOverdue` for the same window (both filter
  `loai_cong_no = 'phai_thu'`).
- `summary.orderCount` MUST match an independent `COUNT(*)` on `don_ban_hang` for the same filter, and MUST equal the sum of `summary.statusCounts` values (both include cancelled orders).
- `summary.totalOrderValue` MUST match `SUM(tong_thanh_toan)` with `trang_thai <> 'huy'`; it is NOT derivable from `statusCounts`.
- `summary.openReceivable` and `summary.overdueReceivable` are deliberately point-in-time snapshots over the whole ledger, NOT windowed by the dashboard date filter. That is what makes the equality with P8 hold for any window.
- `revenue-chart.source` MUST name the exact table/column aggregated; UI must display the label.

## 6. Performance and safety rules

- Aggregate in SQL; never fetch rows and reduce in Node or React.
- Dashboard queries log a warning through `logSlowQuery` when they exceed 500 ms.
- Only allow-listed sort/group columns; every value is parameterized.
- Date boundaries are computed in `Asia/Ho_Chi_Minh`, not the server local timezone.
