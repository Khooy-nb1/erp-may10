# 05 — KẾ HOẠCH NÂNG CẤP & CHUẨN HÓA RBAC (MIGRATION PLAN)

> **LƯU Ý:** Đây là bản kế hoạch đề xuất. KHÔNG thực hiện thay đổi code hoặc database trong bước Audit.

---

## Lộ Trình 8 Giai Đoạn (Phased Migration)

```
Phase 1: Freeze hiện trạng & Backup
   ↓
Phase 2: Chuẩn hóa Middleware Backend (Đóng lỗ hổng Header x-role)
   ↓
Phase 3: Cập nhật Ma trận Role Permissions Backend (Thêm SALES)
   ↓
Phase 4: Hỗ trợ Role Mapping Kép (kho ↔ WAREHOUSE)
   ↓
Phase 5: Bổ sung Route Guard trên Frontend (/admin/permissions)
   ↓
Phase 6: Kiểm thử hồi quy PH4 & Race Condition
   ↓
Phase 7: Kiểm thử liên phân hệ (Cross-module RBAC)
   ↓
Phase 8: Tích hợp JWT Bearer Token / Central IAM (Tương lai)
```

### Chi Tiết Từng Giai Đoạn

#### Giai Đoạn 1: Freeze Hiện Trạng & Backup
- Tạo bản sao lưu schema và dữ liệu PostgreSQL `erp_may10`.
- Ghi nhận trạng thái commit git của frontend và backend.

#### Giai Đoạn 2: Chuẩn Hóa Middleware Backend (Đóng lỗ hổng bảo mật)
- Sửa `backend/src/middlewares/auth.js`:
  - Loại bỏ fallback tự động `role = 'kho'` khi không có header.
  - Nếu request không có thông tin xác thực hợp lệ -> Trả về **HTTP 401 Unauthorized**.
  - Kiểm tra tính hợp lệ của token trong header `Authorization: Bearer <token>`.

#### Giai Đoạn 3: Cập Nhật Ma Trận Quyền Backend
- Sửa `portalController.js`:
  - Thêm đầy đủ quyền cho role `sales` / `ban_hang` vào `ROLE_PERMISSIONS`.
  - Cập nhật hàm `normalizeRole` hỗ trợ cả `kho` và `warehouse`, `ban_hang` và `sales`.

#### Giai Đoạn 4: Hỗ Trợ Role Mapping Kép Cho PH4
- Cập nhật hàm `requireRoles` trong `middlewares/auth.js` để tự động hiểu cả mã tiếng Việt và tiếng Anh:
  ```javascript
  const ALIASES = {
    warehouse: ['warehouse', 'kho'],
    kho: ['warehouse', 'kho'],
    sales: ['sales', 'ban_hang'],
    ban_hang: ['sales', 'ban_hang'],
    production: ['production', 'san_xuat'],
    san_xuat: ['production', 'san_xuat'],
    purchasing: ['purchasing', 'mua_hang'],
    mua_hang: ['purchasing', 'mua_hang'],
    accounting: ['accounting', 'ke_toan'],
    ke_toan: ['accounting', 'ke_toan']
  };
  ```
  Giúp PH4 giữ nguyên code kiểm tra `requireRoles('kho', 'admin')` mà vẫn chạy tốt khi client gửi role chuẩn quốc tế.

#### Giai Đoạn 5: Bổ Sung Route Guard Frontend
- Sửa `frontend/src/routes/AppRoutes.jsx`: Bọc route `admin/permissions` bằng `<RoleGuard roles={['admin']} ...>`.

#### Giai Đoạn 6: Chạy Bộ Kiểm Thử Hồi Quy
- Chạy lại toàn bộ 16 API tests của PH4.
- Chạy lại kiểm thử đa luồng Concurrency Lock (`test_concurrency.js`).

#### Giai Đoạn 7 & 8: Central IAM & Kiểm Thử Mở Rộng
- Chuẩn bị sẵn sàng cấu trúc token JWT cho PH1–PH5.
