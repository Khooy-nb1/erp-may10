# 02 — BÁO CÁO HIỆN TRẠNG RBAC (CURRENT STATE)

## 1. Cơ Sở Dữ Liệu (PostgreSQL 18.6 - Database erp_may10)

### 1.1. Bảng Dữ Liệu Phân Quyền
- Database `erp_may10` gồm **41 bảng**.
- **Chỉ có duy nhất 1 bảng liên quan đến người dùng:** `nguoi_dung`.
- **KHÔNG có bảng:** `vai_tro`, `quyen`, `nguoi_dung_vai_tro`, `vai_tro_quyen`.
- Vai trò được lưu trữ dưới dạng cột chuỗi `vai_tro VARCHAR NOT NULL` trực tiếp trong bảng `nguoi_dung`.
- Không có ràng buộc `CHECK (vai_tro IN (...))` ở cấp độ database.

### 1.2. Dữ Liệu Thực Tế Trong Bảng nguoi_dung
| ID | Họ và Tên | Email | vai_tro (DB) | Phòng Ban | Trạng Thái |
|:---|:---|:---|:---|:---|:---|
| 1 | Quản Trị Viên Hệ Thống | admin@may10.vn | `admin` | Công Nghệ Thông Tin | hoat_dong |
| 2 | Nguyễn Văn Bán | banhang@may10.vn | `ban_hang` | Phòng Kinh Doanh | hoat_dong |
| 3 | Trần Văn Xuất | sanxuat@may10.vn | `san_xuat` | Phòng Kỹ Thuật Sản Xuất | hoat_dong |
| 4 | Lê Thị Mua | muahang@may10.vn | `mua_hang` | Phòng Cung Ứng | hoat_dong |
| 5 | Phạm Văn Kho | kho@may10.vn | `kho` | Bộ Phận Kho Vận | hoat_dong |
| 6 | Hoàng Thị Toán | ketoan@may10.vn | `ke_toan` | Phòng Tài Chính Kế Toán | hoat_dong |

---

## 2. Luồng Xác Thực (Authentication Flow Hiện Tại)

```
[Người Dùng]
     ↓ (Nhập email/password)
[POST /api/v1/auth/login]
     ↓
[portalController.login]
     ↓ Tra cứu DB nguoi_dung
[Trả về user, role, permissions, token: 'erp_token_...']
     ↓
[Frontend Lưu localStorage]:
     - erp_role: 'admin' / 'warehouse' / 'kho'
     - erp_user_id: '1' ...
     - erp_user: JSON
     ↓
[api.interceptors.request]:
     - config.headers['x-role'] = localStorage.getItem('erp_role')
     - config.headers['x-user-id'] = localStorage.getItem('erp_user_id')
     ↓
[Backend Express API]:
     - authMiddleware đọc req.headers['x-role'] và ['x-user-id']
     - req.user = { id, role, name }
     - requireRoles kiểm tra req.user.role
```

---

## 3. Luồng Phân Quyền (Authorization Flow Hiện Tại)

### 3.1. Phía Frontend
- `AuthContext.jsx` duy trì state: `user`, `role`, `permissions`.
- `hasPermission(permCode)`: Nếu `role === 'admin'` -> `true`, ngược lại kiểm tra `permissions.includes(permCode)`.
- `PermissionGuard`: Ẩn/hiện component hoặc redirect sang `/403`.
- `RoleGuard`: Ẩn/hiện hoặc redirect sang `/403` theo mảng `roles`.
- `Sidebar.jsx`: Duyệt mảng `ENTERPRISE_MENU`, lọc theo `hasPermission`.

### 3.2. Phía Backend
- `requireRoles(...allowedRoles)`:
  ```javascript
  if (req.user.role === 'admin' || allowedRoles.includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ success: false, errorCode: 'FORBIDDEN', ... });
  ```
- Các route PH4 áp dụng:
  - `POST /api/v1/vi-tri-kho` -> `requireRoles('kho', 'admin')`
  - `PUT /api/v1/vi-tri-kho/:id` -> `requireRoles('kho', 'admin')`
  - `DELETE /api/v1/vi-tri-kho/:id` -> `requireRoles('kho', 'admin')`
  - `POST /api/v1/lo-vat-tu` -> `requireRoles('kho', 'admin')`
  - `PUT /api/v1/lo-vat-tu/:id` -> `requireRoles('kho', 'admin')`
  - `POST /api/v1/phieu-nhap` -> `requireRoles('kho', 'admin')`
  - `POST /api/v1/phieu-xuat` -> `requireRoles('kho', 'admin')`
  - `POST /api/v1/phieu-chuyen` -> `requireRoles('kho', 'admin')`
  - `POST /api/v1/phieu-kiem-ke` -> `requireRoles('kho', 'admin')`
  - `POST /api/v1/phieu-kiem-ke/:id/dieu-chinh` -> `requireRoles('kho', 'admin')`
- Các route GET: Không bọc `requireRoles`, cho phép đọc tự do.

---

## 4. Ma Trận Vai Trò & Nguồn Gốc Hiện Tại
| Role Code | Tên Hiển Thị | Database (`nguoi_dung`) | Frontend (`roles.js`) | Backend (`portalController`) | PH4 Routes Middleware |
|:---|:---|:---:|:---:|:---:|:---:|
| `admin` | Quản trị viên Hệ thống | ✅ Có | ✅ Có | ✅ Có | ✅ Cho phép |
| `kho` | Thủ kho May 10 | ✅ Có | ✅ Có | ⚠️ Bị đổi thành warehouse | ✅ Cho phép |
| `warehouse` | Kho (Chuẩn hóa) | ❌ Không | ❌ Không | ✅ Có trong ROLE_PERMISSIONS | ❌ BỊ CHẶN (HTTP 403) |
| `warehouse_manager` | Quản lý kho | ❌ Không | ⚠️ Có khai báo, thiếu metadata | ✅ Có | ❌ BỊ CHẶN (HTTP 403) |
| `ban_hang` | Chuyên viên Bán hàng | ✅ Có | ✅ Có | ⚠️ Bị bỏ quên trong matrix | ❌ BỊ CHẶN (HTTP 403) |
| `san_xuat` | Kế hoạch Sản xuất | ✅ Có | ✅ Có | ⚠️ Đổi thành production | ❌ BỊ CHẶN (HTTP 403) |
| `mua_hang` | Chuyên viên Mua hàng | ✅ Có | ✅ Có | ⚠️ Đổi thành purchasing | ❌ BỊ CHẶN (HTTP 403) |
| `ke_toan` | Kế toán Kho & Giá thành | ✅ Có | ✅ Có | ⚠️ Đổi thành accounting | ❌ BỊ CHẶN (HTTP 403) |
