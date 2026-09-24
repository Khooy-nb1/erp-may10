# 03 — PHÂN TÍCH KHOẢNG TRỐNG & SAI LỆCH (GAP ANALYSIS)

## 1. Phân Tích Role Mismatch: Nhóm A (English) vs Nhóm B (Tiếng Việt)

| Thực Thể | Database | Frontend roles.js | Backend portalController | Backend PH4 Routes | Trạng Thái Mismatch |
|:---|:---|:---|:---|:---|:---|
| **Quản trị** | `admin` | `admin` | `admin` | `admin` | ✅ Khớp hoàn toàn |
| **Kho** | `kho` | `kho` | `warehouse` | `kho` | ❌ **Xung đột**: Portal dùng 'warehouse', PH4 dùng 'kho' |
| **Quản lý kho** | *(Chưa có)* | `warehouse_manager` | `warehouse_manager` | *(Không có)* | ⚠️ **Thiếu trong DB và PH4** |
| **Bán hàng** | `ban_hang` | `ban_hang` | *(Thiếu)* | *(Không có)* | ❌ **Thiếu trong backend matrix** |
| **Sản xuất** | `san_xuat` | `san_xuat` | `production` | *(Không có)* | ⚠️ **Không đồng nhất mã định danh** |
| **Mua hàng** | `mua_hang` | `mua_hang` | `purchasing` | *(Không có)* | ⚠️ **Không đồng nhất mã định danh** |
| **Kế toán** | `ke_toan` | `ke_toan` | `accounting` | *(Không có)* | ⚠️ **Không đồng nhất mã định danh** |

### Kết Luận Về Role:
1. Database đang là **Source of Truth** về người dùng, lưu mã tiếng Việt snake_case: `admin`, `ban_hang`, `san_xuat`, `mua_hang`, `kho`, `ke_toan`.
2. PH4 được freeze với các route kiểm tra trực tiếp `'kho'` và `'admin'`.
3. `portalController.js` tự ý dịch sang tiếng Anh (`warehouse`, `purchasing`, `production`, `accounting`) dẫn đến việc nếu client dùng role chuẩn hóa của Portal thì **bị PH4 từ chối quyền (403 Forbidden)**.

---

## 2. Bảng Lỗ Hổng Bảo Mật & Rủi Ro (Security Findings)

### FINDING-01: Giả mạo Header Header-based Privilege Escalation (Mức độ: CRITICAL)
- **Vị trí:** `E:/ERP/backend/src/middlewares/auth.js` (dòng 3–15).
- **Mô tả:** `authMiddleware` nhận `req.headers['x-role']` do client truyền lên và gán trực tiếp vào `req.user.role`. Không có bước xác thực token hay chữ ký mật mã.
- **Chứng cứ kiểm thử:**
  ```http
  POST /api/v1/vi-tri-kho HTTP/1.1
  Host: localhost:5000
  x-user-id: 5
  x-role: admin
  Content-Type: application/json

  {"ma_kho": 1, "ma_vi_tri": "ESC-ADMIN", "ten_vi_tri": "Forged Admin"}
  ```
  **Kết quả:** HTTP 201 Created. User thủ kho gửi header giả lập admin và tạo thành công vị trí kho với tư cách admin.

### FINDING-02: Fallback Request Nặc Danh Được Quyền Kho (Mức độ: CRITICAL)
- **Vị trí:** `E:/ERP/backend/src/middlewares/auth.js` (dòng 4–6).
- **Mô tả:**
  ```javascript
  const userId = req.headers['x-user-id'] || '1';
  const role = req.headers['x-role'] || 'kho';
  ```
  Khi người gọi không gửi bất kỳ header nào, request tự động được gán quyền `kho` và `userId = 1`.
- **Chứng cứ kiểm thử:** Gửi request rỗng tới `POST /api/v1/phieu-nhap` trả về mã 400 (Validation Error của Controller) chứng tỏ request đã lọt qua tầng phân quyền mà không bị chặn 401.

### FINDING-03: Lỗi Bỏ Sót Phân Quyền Role Bán Hàng (Mức độ: HIGH)
- **Vị trí:** `E:/ERP/backend/src/controllers/portalController.js` (dòng 4–38).
- **Mô tả:** Đối tượng `ROLE_PERMISSIONS` không có key `sales` hay `ban_hang`. Dòng 76 và 146 xử lý:
  ```javascript
  const permissions = ROLE_PERMISSIONS[standardRole] || ROLE_PERMISSIONS.warehouse;
  ```
  Hệ quả: Cán bộ phòng kinh doanh (`banhang@may10.vn`) khi đăng nhập được trả về toàn bộ quyền của Thủ kho May 10 (`warehouse.view`, `warehouse.receipt`, `warehouse.issue`, `warehouse.stocktake`)!

### FINDING-04: API GET PH4 Không Được Phân Quyền (Mức độ: MEDIUM)
- **Vị trí:** `phieuNhapRoutes.js`, `phieuXuatRoutes.js`, `tonKhoRoutes.js`.
- **Mô tả:** Toàn bộ API tra cứu dữ liệu tồn kho, giá trị hàng hóa, thẻ kho, danh sách phiếu nhập xuất đều không có middleware `requireRoles`. Bất kỳ ai gọi tới đều xem được toàn bộ thông tin nhạy cảm của kho May 10.

### FINDING-05: Lộ Route Quản Trị Ma Trận Phân Quyền Trên UI (Mức độ: LOW)
- **Vị trí:** `E:/ERP/frontend/src/routes/AppRoutes.jsx` (dòng 130–132).
- **Mô tả:**
  ```jsx
  <Route path="admin/permissions" element={<Permissions />} />
  ```
  Không có `RoleGuard roles={['admin']}`. Bất kỳ user nào gõ `/admin/permissions` đều xem được bảng phân quyền.
