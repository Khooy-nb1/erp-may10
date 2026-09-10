# 04 — ĐỀ XUẤT RBAC CONTRACT CHUẨN (TARGET STATE)

## 1. Bộ Mã Vai Trò Chuẩn (Canonical Role Codes)

Để đảm bảo tương thích 100% với cơ sở dữ liệu đã có và phân hệ PH4 đã Freeze, đề xuất hệ thống Role chuẩn kép (Canonical Role System) với quy ước chuyển đổi rõ ràng:

| Canonical Role Code | Mã Hiển Thị (Display Name) | Phòng Ban Phụ Trách | Trạng Thái |
|:---|:---|:---|:---:|
| **ADMIN** | Quản trị viên Hệ thống | Công nghệ thông tin (CNTT) | Hiện hữu |
| **WAREHOUSE** | Thủ kho May 10 | Kho Vận & Quản Lý Vật Tư | Hiện hữu (`kho`) |
| **WAREHOUSE_MANAGER** | Quản lý kho May 10 | Ban Quản Lý Kho & Cung Ứng | **Đề xuất mới** |
| **SALES** | Chuyên viên Bán hàng | Phòng Kinh Doanh & Tiếp Thị | Hiện hữu (`ban_hang`) |
| **PRODUCTION** | Kỹ sư Kế hoạch Sản xuất | Phòng Kỹ Thuật & Quản Lý SX | Hiện hữu (`san_xuat`) |
| **PURCHASING** | Chuyên viên Mua hàng | Phòng Cung Ứng & Vật Tư | Hiện hữu (`mua_hang`) |
| **ACCOUNTING** | Kế toán Kho & Giá thành | Phòng Tài Chính – Kế Toán | Hiện hữu (`ke_toan`) |

### Bảng Ánh Xạ Chuẩn Hóa (Normalization Mapping):
```javascript
const ROLE_MAPPING = {
  // Database & Legacy -> Canonical
  'admin': 'ADMIN',
  'kho': 'WAREHOUSE',
  'warehouse': 'WAREHOUSE',
  'warehouse_manager': 'WAREHOUSE_MANAGER',
  'ban_hang': 'SALES',
  'sales': 'SALES',
  'san_xuat': 'PRODUCTION',
  'production': 'PRODUCTION',
  'mua_hang': 'PURCHASING',
  'purchasing': 'PURCHASING',
  'ke_toan': 'ACCOUNTING',
  'accounting': 'ACCOUNTING'
};
```

---

## 2. Quy Ước Định Danh Quyền (Permission Naming Convention)
Áp dụng quy ước chuẩn mực quốc tế:
`<module>.<resource/action>` (chữ thường, ngăn cách bằng dấu chấm).

### Danh Mục 28 Permissions Chuẩn:
1. **Tổng quan:** `dashboard.view`
2. **PH1 Bán hàng:** `sales.view`, `sales.create`, `sales.update`, `sales.delete`, `sales.approve`
3. **PH2 Sản xuất:** `production.view`, `production.create`, `production.update`, `production.approve`
4. **PH3 Mua hàng:** `purchasing.view`, `purchasing.create`, `purchasing.update`, `purchasing.approve`
5. **PH4 Kho:** `warehouse.view`, `warehouse.receipt`, `warehouse.issue`, `warehouse.transfer`, `warehouse.stocktake`
6. **PH5 Kế toán:** `accounting.view`, `accounting.journal`, `accounting.receivable`, `accounting.payable`, `accounting.cost`
7. **Quản trị:** `admin.users`, `admin.roles`, `admin.permissions`, `admin.settings`

---

## 3. Ma Trận Quyền Chuẩn (Canonical Role → Permission Matrix)

| Quyền Hạn (Permission) | ADMIN | SALES | PRODUCTION | PURCHASING | WAREHOUSE | WH_MANAGER | ACCOUNTING |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `dashboard.view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **PH1 — BÁN HÀNG** | | | | | | | |
| `sales.view` | ✓ | ✓ | – | – | – | – | – |
| `sales.create` | ✓ | ✓ | – | – | – | – | – |
| `sales.update` | ✓ | ✓ | – | – | – | – | – |
| `sales.delete` | ✓ | – | – | – | – | – | – |
| `sales.approve` | ✓ | ✓ | – | – | – | – | – |
| **PH2 — SẢN XUẤT** | | | | | | | |
| `production.view` | ✓ | – | ✓ | – | – | ✓ | – |
| `production.create` | ✓ | – | ✓ | – | – | – | – |
| `production.update` | ✓ | – | ✓ | – | – | – | – |
| `production.approve` | ✓ | – | ✓ | – | – | – | – |
| **PH3 — MUA HÀNG** | | | | | | | |
| `purchasing.view` | ✓ | – | – | ✓ | – | ✓ | – |
| `purchasing.create` | ✓ | – | – | ✓ | – | – | – |
| `purchasing.update` | ✓ | – | – | ✓ | – | – | – |
| `purchasing.approve` | ✓ | – | – | ✓ | – | – | – |
| **PH4 — KHO & VẬT TƯ** | | | | | | | |
| `warehouse.view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `warehouse.receipt` | ✓ | – | – | – | ✓ | ✓ | – |
| `warehouse.issue` | ✓ | – | – | – | ✓ | ✓ | – |
| `warehouse.transfer` | ✓ | – | – | – | ✓ | ✓ | – |
| `warehouse.stocktake` | ✓ | – | – | – | ✓ | ✓ | – |
| **PH5 — TÀI CHÍNH** | | | | | | | |
| `accounting.view` | ✓ | – | – | – | – | – | ✓ |
| `accounting.journal` | ✓ | – | – | – | – | – | ✓ |
| `accounting.receivable` | ✓ | – | – | – | – | – | ✓ |
| `accounting.payable` | ✓ | – | – | – | – | – | ✓ |
| `accounting.cost` | ✓ | – | – | – | – | – | ✓ |
| **QUẢN TRỊ HỆ THỐNG** | | | | | | | |
| `admin.users` | ✓ | – | – | – | – | – | – |
| `admin.roles` | ✓ | – | – | – | – | – | – |
| `admin.permissions` | ✓ | – | – | – | – | – | – |
| `admin.settings` | ✓ | – | – | – | – | – | – |

---

## 4. Chuẩn Phân Tách Nhiệm Vụ (Segregation of Duties - SoD)
- **Tạo phiếu vs Duyệt phiếu:** Hiện tại hệ thống PH4 gom việc lập và duyệt phiếu vào một thao tác. Đề xuất tách quyền `warehouse.create_receipt` và `warehouse.approve_receipt` khi triển khai WAREHOUSE_MANAGER.
- **Tạo PO vs Nhập kho:** Purchasing tạo PO (`purchasing.create`), Warehouse chỉ được nhận hàng và lập phiếu nhập (`warehouse.receipt`), không được sửa giá PO.
- **Kiểm kê vs Điều chỉnh:** Thủ kho lập phiếu kiểm kê (`warehouse.stocktake`), Quản lý kho hoặc Kế toán duyệt điều chỉnh chênh lệch.

---

## 5. Chuẩn Mã Lỗi HTTP API (API Error Contract)
- **401 Unauthorized:** Request không có token hợp lệ hoặc token đã hết hạn.
- **403 Forbidden:** Request đã xác thực danh tính nhưng tài khoản không có quyền thực hiện thao tác.
- **404 Not Found:** Bản ghi hoặc tài nguyên không tồn tại.
- **409 Conflict:** Xung đột nghiệp vụ / khóa đa luồng (ví dụ: xuất quá tồn khả dụng).
