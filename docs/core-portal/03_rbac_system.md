# HỆ THỐNG PHÂN QUYỀN VAI TRÒ (RBAC SYSTEM) ERP MAY 10
**TỔNG CÔNG TY MAY 10 - CTCP**

---

## 1. Thiết Kế Mô Hình RBAC (Role-Based Access Control)

Hệ thống phân quyền được xây dựng đồng bộ từ Cơ sở dữ liệu PostgreSQL (bảng `nguoi_dung`) lên Backend API và ánh xạ trực quan ra Frontend React.

### Danh Sách 6 Vai Trò Doanh Nghiệp Chuẩn:

| Mã Vai Trò (`vai_tro`) | Tên Đầy Đủ | Phòng Ban / Bộ Phận | Tài Khoản Mẫu | Phạm Vi Quyền Hạn |
| :--- | :--- | :--- | :--- | :--- |
| `admin` | Quản trị viên Hệ thống | Công nghệ Thông tin (CNTT) | `admin@may10.vn` (ID: 1) | Toàn quyền tất cả phân hệ & Quản trị hệ thống |
| `ban_hang` | Chuyên viên Bán hàng | Phòng Kinh Doanh & Tiếp Thị | `banhang@may10.vn` (ID: 2) | Đơn hàng bán (PH1), Tra cứu tồn kho (PH4) |
| `san_xuat` | Kỹ sư Kế hoạch Sản xuất | Phòng Kỹ Thuật & Quản Lý SX | `sanxuat@may10.vn` (ID: 3) | Lệnh SX, Định mức BOM (PH2), Tra cứu tồn kho (PH4) |
| `mua_hang` | Chuyên viên Mua hàng | Phòng Cung Ứng & Vật Tư | `muahang@may10.vn` (ID: 3) | Đơn mua PO, NCC (PH3), Tra cứu tồn kho (PH4) |
| `kho` | Thủ kho May 10 | Bộ Phận Kho Vận & Vật Tư | `kho@may10.vn` (ID: 5) | Toàn quyền thao tác kho PH4 (Nhập/Xuất/Chuyển/Kiểm kê) |
| `ke_toan` | Kế toán viên Kho & Giá thành | Phòng Tài Chính – Kế Toán | `ketoan@may10.vn` (ID: 6) | Sổ sách kế toán (PH5), Tra cứu tồn kho & chứng từ (PH4) |

---

## 2. Ma Trận Phân Quyền Chi Tiết (Permissions Matrix)

| Nhóm Quyền | Mã Quyền Chi Tiết | Admin | Thủ Kho | Bán Hàng | Sản Xuất | Mua Hàng | Kế Toán |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Tổng quan** | `dashboard.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **PH1: Bán hàng** | `sales.view` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| | `sales.create`, `sales.update` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| | `sales.approve` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **PH2: Sản xuất** | `production.view` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| | `production.create`, `production.update` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| | `production.approve` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **PH3: Mua hàng** | `purchasing.view` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | `purchasing.create`, `purchasing.update`| ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | `purchasing.approve` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **PH4: Kho vật tư**| `warehouse.view` (Xem tồn, thẻ kho) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | `warehouse.receipt` (Lập phiếu nhập) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | `warehouse.issue` (Lập phiếu xuất) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | `warehouse.transfer` (Điều chuyển kho) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | `warehouse.stocktake` (Kiểm kê kho) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **PH5: Kế toán** | `accounting.view` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| | `accounting.journal`, `accounting.cost` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Quản trị** | `admin.users`, `admin.roles`, `admin.permissions` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 3. Các Thành Phần Bảo Vệ (Guards Implementation)

### 3.1. `ProtectedRoute`
Bảo vệ toàn bộ Cổng Portal. Nếu người dùng chưa đăng nhập, tự động chuyển hướng đến `/login` và lưu lại URL mong muốn để chuyển tiếp sau khi đăng nhập thành công.

### 3.2. `PermissionGuard`
Bảo vệ chi tiết từng tính năng/nút bấm/trang.
* Nếu có quyền: Render nội dung con.
* Nếu không có quyền: Chuyển hướng đến `/403` hoặc hiển thị fallback/khóa mờ.

### 3.3. `RoleGuard`
Bảo vệ theo nhóm vai trò doanh nghiệp (ví dụ: các trang quản trị `/admin/*` chỉ dành riêng cho vai trò `admin`).

### 3.4. Bộ Chuyển Đổi Nhanh (Fast Role Switcher)
Được tích hợp trực tiếp trên Header và màn hình Login để hội đồng nghiệm thu và các kiểm thử viên có thể chuyển đổi tức thì giữa 6 vai trò mà không cần đăng nhập lại từ đầu.
