# MA TRẬN PHÂN QUYỀN PHÂN HỆ MUA HÀNG (PH3 RBAC MATRIX)
**Hệ thống:** ERP May 10  
**Cơ chế Phân quyền:** Role-Based Access Control (RBAC)  
**Middleware:** `requireAuth`, `requireRoles(...)` trong `src/middlewares/auth.js`  

---

## 1. Các Vai trò Tham gia (Roles)
- **`mua_hang` (Nhân viên / Trưởng phòng Mua hàng):** Vai trò chính chịu trách nhiệm quản lý nhà cung cấp, lập đơn đặt hàng, quản lý giao dịch và theo dõi tiến độ giao nhận.
- **`admin` (Quản trị hệ thống / Ban Giám đốc):** Toàn quyền truy cập, kiểm tra, phê duyệt, hủy và xem báo cáo tổng thể.
- **`kho` (Thủ kho / Nhân viên Kho PH4):** Quyền xem danh sách nhà cung cấp (đối chiếu giao nhận), xem đơn mua hàng, xem danh sách chờ nhập kho và xác nhận số lượng nhận hàng tại điểm giao nhận.
- **`ban_hang`, `ke_toan`, `san_xuat`, `nhan_su` (Các vai trò ngoài):** Không có quyền truy cập vào các tác vụ nhạy cảm của phân hệ mua hàng (sẽ nhận HTTP `403 Forbidden`).

---

## 2. Ma trận Phân quyền API Chi tiết (RBAC Matrix)

| Đường dẫn Endpoint | Phương thức | Chức năng nghiệp vụ | `admin` | `mua_hang` | `kho` | Khác (`ban_hang`...) |
|---|:---:|---|:---:|:---:|:---:|:---:|
| `/api/v1/purchasing/core-kpi` | `GET` | Chỉ số KPI cho Core Homepage | ✅ Cho phép | ✅ Cho phép | ✅ Cho phép | ✅ Cho phép (Auth) |
| `/api/v1/purchasing/dashboard` | `GET` | Dashboard phân hệ Mua hàng | ✅ Toàn quyền | ✅ Toàn quyền | ❌ 403 | ❌ 403 |
| `/api/v1/purchasing/suppliers` | `GET` | Danh sách nhà cung cấp | ✅ Toàn quyền | ✅ Toàn quyền | ✅ Xem | ❌ 403 |
| `/api/v1/purchasing/suppliers/:id`| `GET` | Chi tiết nhà cung cấp | ✅ Toàn quyền | ✅ Toàn quyền | ❌ 403 | ❌ 403 |
| `/api/v1/purchasing/suppliers` | `POST`| Thêm mới nhà cung cấp | ✅ Toàn quyền | ✅ Toàn quyền | ❌ 403 | ❌ 403 |
| `/api/v1/purchasing/suppliers/:id`| `PUT` | Sửa thông tin nhà cung cấp | ✅ Toàn quyền | ✅ Toàn quyền | ❌ 403 | ❌ 403 |
| `/api/v1/purchasing/purchase-orders` | `GET` | Danh sách đơn mua hàng | ✅ Toàn quyền | ✅ Toàn quyền | ✅ Xem | ❌ 403 |
| `/api/v1/purchasing/purchase-orders/:id`| `GET`| Chi tiết đơn mua hàng | ✅ Toàn quyền | ✅ Toàn quyền | ✅ Xem | ❌ 403 |
| `/api/v1/purchasing/purchase-orders` | `POST`| Lập đơn mua hàng mới | ✅ Toàn quyền | ✅ Toàn quyền | ❌ 403 | ❌ 403 |
| `/api/v1/purchasing/purchase-orders/:id/approve` | `POST`| Phê duyệt đơn mua | ✅ Toàn quyền | ✅ Toàn quyền | ❌ 403 | ❌ 403 |
| `/api/v1/purchasing/purchase-orders/:id/cancel` | `POST`| Hủy đơn mua hàng | ✅ Toàn quyền | ✅ Toàn quyền | ❌ 403 | ❌ 403 |
| `/api/v1/purchasing/purchase-orders/:id/status` | `POST`| Chuyển trạng thái đơn | ✅ Toàn quyền | ✅ Toàn quyền | ❌ 403 | ❌ 403 |
| `/api/v1/purchasing/receiving` | `GET` | Danh sách đơn chờ nhập kho | ✅ Toàn quyền | ✅ Toàn quyền | ✅ Xem | ❌ 403 |
| `/api/v1/purchasing/receive-status-update`| `POST`| Ghi nhận số lượng nhận hàng | ✅ Toàn quyền | ✅ Toàn quyền | ✅ Cập nhật | ❌ 403 |
| `/api/v1/purchasing/reports` | `GET` | Báo cáo chi tiêu & NCC | ✅ Toàn quyền | ✅ Toàn quyền | ❌ 403 | ❌ 403 |

---

## 3. Cơ chế Triển khai Middleware
Trong tệp `backend/src/routes/purchasingRoutes.js`:
```javascript
// 1. Toàn bộ endpoint yêu cầu đăng nhập hợp lệ
router.use(requireAuth);

// 2. Phân quyền nhiều cấp sử dụng requireRoles
router.get('/dashboard', requireRoles('mua_hang', 'admin'), purchasingController.getDashboardStats);
router.get('/suppliers', requireRoles('mua_hang', 'admin', 'kho'), purchasingController.getSuppliers);
router.post('/purchase-orders', requireRoles('mua_hang', 'admin'), purchasingController.createPurchaseOrder);
router.post('/receive-status-update', requireRoles('mua_hang', 'kho', 'admin'), purchasingController.receiveStatusUpdate);
```

Khi vi phạm phân quyền:
```json
{
  "success": false,
  "errorCode": "FORBIDDEN",
  "message": "Người dùng không có quyền thực hiện thao tác này."
}
```
Mã trạng thái phản hồi luôn chính xác là **HTTP 403 Forbidden**.
