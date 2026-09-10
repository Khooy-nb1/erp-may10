# 01 — BÁO CÁO AUDIT RBAC TOÀN BỘ ERP MAY 10
**Hệ thống:** ERP May 10 — Cổng Điều Hành Doanh Nghiệp & 5 Phân Hệ  
**Thời gian thực hiện:** 09/09/2026  
**Chuyên viên đánh giá:** Senior System Architect + Security Engineer + QA Engineer  
**Quyết định audit:** **D. RBAC HAS CRITICAL SECURITY ISSUE & NEEDS NORMALIZATION**

---

## 1. Mục Tiêu & Phạm Vi Audit
Thực hiện rà soát toàn diện và đối chiếu chéo (Cross-Audit) cơ chế Xác thực (Authentication) và Phân quyền (Authorization - RBAC) trên toàn bộ hệ thống ERP May 10:
1. **Cơ sở dữ liệu (PostgreSQL 18.6):** Database `erp_may10`, schema `public`, bảng `nguoi_dung` và các ràng buộc toàn vẹn.
2. **Backend (Node.js/Express):** `middlewares/auth.js`, các controller và 21 REST API endpoints của phân hệ PH4 cùng Core Portal.
3. **Frontend (React/Vite):** `AuthContext.jsx`, `ProtectedRoute.jsx`, `PermissionGuard.jsx`, `RoleGuard.jsx`, `roles.js`, `permissions.js`, `menu.js`, `AppRoutes.jsx`.
4. **Đối chiếu chéo (Mismatch Detection):** Giữa quy ước role Core Portal, PH4, Database và Header.
5. **Thử nghiệm leo quyền (Privilege Escalation):** Kiểm thử thực tế các kịch bản giả mạo vai trò.

---

## 2. Tóm Tắt Hiện Trạng (Executive Summary)

### 2.1. Điểm Tích Cực Đã Đạt Được
- **Frontend Route Protection:** 100% các phân hệ chính (`/warehouse/*`, `/sales`, `/production`, `/purchasing`, `/accounting`) được bảo vệ bằng `ProtectedRoute` và `PermissionGuard(redirect={true})`.
- **UI RBAC Filtering:** Sidebar và Menu lọc động theo quyền của người dùng; tài khoản không có quyền sẽ không nhìn thấy menu tương ứng.
- **PH4 Write Operation Protection:** Các API ghi dữ liệu quan trọng của PH4 (`POST /phieu-nhap`, `POST /phieu-xuat`, `POST /phieu-chuyen`, `POST /phieu-kiem-ke`, `POST /vi-tri-kho`, `POST /lo-vat-tu`) đều có middleware `requireRoles` kiểm tra vai trò người gọi.
- **Seed Users Chuẩn:** Database có sẵn 6 tài khoản mẫu đại diện cho 6 phòng ban chủ chốt của May 10.

### 2.2. Các Lỗ Hổng & Sai Lệch Trọng Yếu (Critical Findings)
1. **Lỗ hổng giả mạo Header & Leo quyền (Privilege Escalation - Critical):**
   - Backend `authMiddleware` tin tưởng trực tiếp vào header `x-role` và `x-user-id` do client gửi lên mà không xác thực chữ ký JWT Bearer hay session token.
   - Thử nghiệm thực tế: Tài khoản thủ kho (ID 5) gửi `x-role: admin` được backend chấp thuận 100% và thực hiện thành công các thao tác quản trị (HTTP 201 Created).
2. **Lỗ hổng Fallback cho Request chưa xác thực (Unauthenticated Bypass - Critical):**
   - Nếu client không gửi bất kỳ header xác thực nào, `authMiddleware` tự động gán mặc định `role = 'kho'` và `userId = 1`. Mọi request nặc danh đều tự động có quyền thủ kho!
3. **Bất đồng bộ Role Code giữa PH4 và Core Portal (Architectural Mismatch - High):**
   - Database và các route PH4 sử dụng mã role tiếng Việt: `'kho'`, `'admin'`.
   - Core Portal (`portalController.js`) lại chuẩn hóa `'kho'` thành `'warehouse'`, nhưng các route PH4 **không cho phép `'warehouse'`**.
   - Thử nghiệm thực tế: Gửi `x-role: warehouse` vào API PH4 nhận lỗi **HTTP 403 Forbidden** (`Cần một trong các vai trò: kho, admin`).
4. **Bỏ sót Role Bán Hàng trong Ma Trận Quyền Backend (Business Logic Gap - High):**
   - Trong `portalController.js`, object `ROLE_PERMISSIONS` có: `admin`, `warehouse`, `warehouse_manager`, `purchasing`, `production`, `accounting`.
   - Hoàn toàn **THIẾU role `sales` / `ban_hang`**. Khi người dùng bán hàng đăng nhập, hệ thống rơi vào fallback cấp quyền `ROLE_PERMISSIONS.warehouse`!
5. **Thiếu kiểm tra quyền ở cấp độ chi tiết (No Fine-grained Permission on Backend - Medium):**
   - Backend hoàn toàn **không có `requirePermission`**. Backend chỉ kiểm tra `requireRoles('kho', 'admin')`.
   - Toàn bộ 28 permissions định nghĩa trong `permissions.js` chỉ có giá trị hiển thị/chặn trên giao diện frontend.
6. **Lộ Route Quản Trị Ma Trận Phân Quyền (Frontend Guard Gap - Low):**
   - Route `/admin/permissions` trên frontend không được bọc bởi `RoleGuard`, cho phép bất kỳ user đã đăng nhập nào cũng xem được ma trận phân quyền hệ thống.

---

## 3. Bảng Điểm Bảo Mật RBAC (Security Score)

| Tiêu Chí | Điểm Tối Đa | Điểm Đạt | Đánh Giá Chi Tiết |
| :--- | :---: | :---: | :--- |
| **Authentication (Xác thực)** | 20 | **8/20** | Chưa có JWT verify, tin cậy header `x-role`/`x-user-id`, tự động fallback role 'kho' cho request nặc danh. |
| **Authorization (Phân quyền Backend)** | 25 | **14/25** | Có `requireRoles` trên các API POST/PUT của PH4, nhưng thiếu xác thực ở GET và chưa hỗ trợ permission level. |
| **Role Consistency (Nhất quán Role)** | 15 | **7/15** | Xung đột trực tiếp giữa nhóm `'kho'` (PH4 + DB) và nhóm `'warehouse'` (Portal). Thiếu `ban_hang` trong backend matrix. |
| **Permission Consistency (Nhất quán Permission)** | 15 | **10/15** | Format đặt tên `<module>.<action>` chuẩn hóa tốt, nhưng chỉ hoạt động trên frontend, chưa enforce ở backend. |
| **Frontend Security (Bảo mật Frontend)** | 10 | **8/10** | ProtectedRoute và PermissionGuard hoạt động tốt. Sơ hở duy nhất tại route `/admin/permissions`. |
| **Backend Security (Bảo mật Backend)** | 15 | **7/15** | Có nguy cơ Privilege Escalation khi client giả mạo header `x-role: admin`. |
| **TỔNG CỘNG** | **100** | **54/100** | **CRITICAL (< 70) — Cần chuẩn hóa và đóng lỗ hổng xác thực trước khi tích hợp các phân hệ tiếp theo.** |

---

## 4. Quyết Định Cuối Cùng (Final Decision)
Theo tiêu chí đánh giá nghiêm ngặt:
- **Quyết định:** **D. RBAC HAS CRITICAL SECURITY ISSUE & NEEDS NORMALIZATION**
- **Lý do:** Tồn tại lỗ hổng leo quyền thông qua header `x-role`, tự động cấp quyền kho cho request chưa đăng nhập, và xung đột mã vai trò `'kho'` vs `'warehouse'` giữa PH4 và Core Portal.
