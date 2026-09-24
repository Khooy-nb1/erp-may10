# RBAC PHASE 1 — FINAL FREEZE AUDIT REPORT
**Hệ thống:** ERP Tổng Công Ty May 10  
**Vai trò thẩm định:** Senior Security Auditor + Red Team Reviewer Độc Lập  
**Ngày thực hiện:** 09/09/2026  
**Phương pháp:** Static Code Analysis + Dynamic Red-Team Penetration Testing + DB Schema Audit  
**Tiêu chuẩn:** OWASP ASVS 4.0, NIST SP 800-63B, ERP Enterprise Security Standard  

---

## 1. Executive Summary

Báo cáo này là kết quả thẩm định an ninh độc lập cuối cùng (Final Freeze Audit) đối với việc triển khai Phân quyền và Kiểm soát truy cập (RBAC Phase 1) của Hệ thống ERP May 10 sau đợt khắc phục (Remediation).

### Tóm tắt kết quả chính:
1. **Khắc phục thành công Header Injection:** Cơ chế nhận diện danh tính tùy tiện qua header `x-user-id` và `x-role` của client khi không có token đã bị loại bỏ hoàn toàn. Các kịch bản giả mạo Admin/Thủ kho qua header nặc danh đều bị chặn với HTTP 401 Unauthorized.
2. **Kiểm soát vai trò nghiệp vụ PH4 vững chắc:** Các vai trò ngoài kho (Bán hàng, Sản xuất, Mua hàng, Kế toán) bị chặn 100% khi cố tình ghi dữ liệu vào phân hệ PH4 (Kho & Vật tư) bằng mã HTTP 403 Forbidden.
3. **Bảo tồn toàn vẹn nghiệp vụ & Concurrency PH4:** 16/16 API kiểm thử nghiệp vụ PH4 và kiểm thử đồng thời (Concurrency Race Condition) đạt 100% PASS; cơ chế khóa dòng `SELECT ... FOR UPDATE` trong giao dịch PostgreSQL bảo đảm 0 mét âm tồn kho. Cơ sở dữ liệu giữ nguyên 41 bảng.
4. **PHÁT HIỆN LỖ HỔNG NGUY CẤP (CRITICAL FINDINGS):**
   - **[CRITICAL-01] Token Forgery → Admin Execution:** Do token adapter chỉ phân tích chuỗi Regex (`erp_token_(\d+)`) mà không có chữ ký số mật mã học (Cryptographic Signature), kẻ tấn công trong mạng có thể tự tạo `Bearer erp_token_1_999999999999` và thực thi thành công thao tác lập phiếu nhập kho với tư cách Quản trị viên (HTTP 201 Created).
   - **[CRITICAL-02] Anonymous Access → Admin Profile Exposure (`/api/v1/auth/me`):** Route `GET /api/v1/auth/me` thiếu middleware `requireAuth` và có fallback `const userId = req.user?.id || 1;`. Khi người dùng nặc danh gọi API này, hệ thống trả về toàn bộ thông tin tài khoản và 28 đặc quyền tối cao của Quản Trị Viên (HTTP 200 OK).
   - **[CRITICAL-03] Auth Bypass on Login (`/api/v1/auth/login`):** Khi gọi `POST /api/v1/auth/login` với body rỗng `{}`, controller tự động gán `params.push(1)` và trả về token đăng nhập hợp lệ của Quản Trị Viên Hệ Thống (Admin).

---

## 2. Scope (Phạm Vi Audit)

- **Backend Codebase:** `E:\ERP\backend\src\*\*` (Middlewares, Routes, Controllers, Config).
- **Backend Test Suites:** `E:\ERP\backend\tests\*\*` (`test_rbac_security.js`, `test_ph4_api.js`, `test_concurrency.js`).
- **Frontend Codebase:** `E:\ERP\frontend\src\*\*` (AuthContext, RoleGuard, PermissionGuard, AppRoutes, Services, Pages).
- **Database:** PostgreSQL `erp_may10`, schema `public` (41 tables).
- **Runtime Environment:** Backend Express (Port 5000), Frontend Vite (Port 5173).

---

## 3. Authentication Flow (Luồng Xác Thực)

### 3.1. Cơ chế tiếp nhận & trích xuất
1. Client gửi request mang header `Authorization: Bearer <token>` hoặc `x-auth-token: <token>`.
2. Middleware `authMiddleware` (`backend/src/middlewares/auth.js`) kích hoạt `resolveUserIdentity(req)`.
3. `resolveUserIdentity` áp dụng Regex:
   - `^erp_token_(\d+)(?:_.*)?$` trích xuất `matchedUserId`.
   - `mock-jwt-token-{role}` hoặc `demo-token-{role}` ánh xạ sang tài khoản demo trong bộ nhớ.
4. Nếu không có token hợp lệ, hàm trả về `null` (`req.user = null`).
5. Nếu có `matchedUserId`, thực thi truy vấn database:
   `SELECT id, ho_ten, email, vai_tro, phong_ban, trang_thai FROM nguoi_dung WHERE id = $1`
6. Chuẩn hóa vai trò qua `normalizeRole(dbUser.vai_tro)` gán vào `req.user.role` (CANONICAL_ROLES).

---

## 4. Identity Integrity (Tính Toàn Vẹn Danh Tính)

| Kịch Bản Kiểm Tra | Header / Token | Kết Quả Runtime | Đánh Giá |
| :--- | :--- | :--- | :--- |
| Anonymous không token | None | HTTP 401 Unauthorized trên route bảo vệ | **PASS** |
| Anonymous gửi `x-user-id: 1` | `x-user-id: 1` | HTTP 401 Unauthorized | **PASS** |
| Anonymous gửi `x-role: admin` | `x-role: admin` | HTTP 401 Unauthorized | **PASS** |
| User 2 (Sales) gửi `x-role: admin` | Bearer Sales + `x-role: admin` | HTTP 403 Forbidden (Vai trò Sales giữ nguyên) | **PASS** |
| User 2 (Sales) gửi `x-user-id: 1` | Bearer Sales + `x-user-id: 1` | HTTP 403 Forbidden (Danh tính User 2 giữ nguyên) | **PASS** |
| User 2 gửi `x-user-id: 5` vào `/auth/me` | Bearer Sales + `x-user-id: 5` | HTTP 200 OK (id trong body trả về vẫn là 2) | **PASS** |
| Token sai định dạng | `Bearer invalid_format_xyz` | HTTP 401 Unauthorized | **PASS** |
| Cơ chế Basic Auth | `Basic dXNlcjpwYXNz` | HTTP 401 Unauthorized | **PASS** |
| Token ID không tồn tại | `Bearer erp_token_9999_123` | `req.user = null` (Bị chặn 401 trên route bảo vệ) | **PASS** |
| Anonymous gọi `/api/v1/auth/me` | Không có header | **HTTP 200 OK (Mặc định trả về User 1 - Admin!)** | ❌ **FAIL (CRITICAL-02)** |
| Empty body login `/auth/login` | Body: `{}` | **HTTP 200 OK (Cấp token User 1 - Admin!)** | ❌ **FAIL (CRITICAL-03)** |

---

## 5. Token Security (Đánh Giá Kỹ Thuật Token)

### Bảng Đánh Giá Tiêu Chuẩn Token:
| Thành Phần | Hiện Tại | Production Standard | Đánh Giá |
| :--- | :--- | :--- | :---: |
| **Signature** | Không có (Plain String Regex) | HMAC-SHA256 (HS256) hoặc RSA-256 (RS256) | ❌ **FAIL** |
| **Expiration (`exp`)** | Timestamp tồn tại trong chuỗi nhưng không validate | Bắt buộc kiểm tra `exp < Date.now()` | ❌ **FAIL** |
| **Issuer (`iss`)** | Không có | Khuyến nghị (`https://iam.may10.vn`) | ❌ **FAIL** |
| **Audience (`aud`)** | Không có | Khuyến nghị (`erp-portal`) | ❌ **FAIL** |
| **Revocation** | Không có blacklist / token store | Bắt buộc (Redis / Session Store) | ❌ **FAIL** |
| **HTTPS Enforcement** | Chạy HTTP Plaintext trên cổng 5000 | Bắt buộc TLS 1.3 / HSTS | ⚠️ **DEV ONLY** |
| **Refresh Token** | Không có | Khuyến nghị theo chuẩn OAuth2 | ❌ **NOT IMPL** |

### Runtime Evidence — Thử Nghiệm Token Giả Mạo:
- **Request:**
  ```http
  POST /api/v1/phieu-nhap HTTP/1.1
  Host: 127.0.0.1:5000
  Authorization: Bearer erp_token_1_999999999999
  Content-Type: application/json

  {"loai_nhap":"tu_mua_hang","ma_kho_nhap":1,"nguoi_giao_hang":"Forged Attacker","chiTiet":[{"ma_vat_tu":1,"so_luong_nhap":1,"don_gia_nhap":1000}]}
  ```
- **Response:**
  ```http
  HTTP/1.1 201 Created
  Content-Type: application/json; charset=utf-8

  {"success":true,"message":"Lập phiếu nhập kho thành công. Tồn kho đã được cập nhật chính xác.","data":{"id":"102","ma_phieu_nhap":"PNK-20260909-9749","thu_kho":"1","nguoi_tao":"1"}}
  ```
- **Kết luận:** Backend chấp nhận 100% token tự sinh của attacker và thực hiện ghi nghiệp vụ với quyền Quản Trị Viên!

---

## 6. Role Mapping (Ánh Xạ Vai Trò)

File cấu hình: `backend/src/config/roleMapping.js`
- **Canonical Roles:** `ADMIN`, `WAREHOUSE`, `WAREHOUSE_MANAGER`, `SALES`, `PRODUCTION`, `PURCHASING`, `ACCOUNTING`.
- **Ánh xạ 2 chiều:**
  - `kho` và `warehouse` đều chuẩn hóa thành `WAREHOUSE`.
  - `ban_hang` và `sales` đều chuẩn hóa thành `SALES`.
  - `san_xuat` và `production` đều chuẩn hóa thành `PRODUCTION`.
  - `mua_hang` và `purchasing` đều chuẩn hóa thành `PURCHASING`.
  - `ke_toan` và `accounting` đều chuẩn hóa thành `ACCOUNTING`.
- **Tương thích PH4:** Hàm `requireRoles('kho', 'admin')` chuẩn hóa danh sách cho phép thành `['WAREHOUSE', 'ADMIN']` và đối chiếu với `req.user.role`. Runtime test xác nhận cả user mang role DB `kho` và role DB `admin` đều truy cập thành công.

---

## 7. Authorization / RBAC (Kiểm Soát Phân Quyền)

Hệ thống duy trì 2 tầng kiểm soát:
1. **Tầng Vai Trò (Role-based):** Sử dụng `requireRoles(...allowedRoles)` bảo vệ các hành động ghi/sửa/xóa của PH4.
2. **Tầng Đặc Quyền (Permission-based):** Sử dụng `requirePermission(...requiredPermissions)` kiểm tra ma trận `ROLE_PERMISSIONS`.
- ADMIN luôn có quyền bypass qua câu lệnh `if (req.user.role === CANONICAL_ROLES.ADMIN) return next();`.

---

## 8. Sensitive Endpoint Audit (Thẩm Định Endpoint Nhạy Cảm)

| Endpoint | Method | Middleware Bảo Vệ | Kết Quả Anonymous | Đánh Giá |
| :--- | :---: | :--- | :---: | :---: |
| `/api/v1/health` | GET | Không | HTTP 200 (UP) | ✅ PUBLIC |
| `/api/v1/auth/login` | POST | Không | **HTTP 200 (Empty body cấp quyền Admin)** | ❌ **CRITICAL-03** |
| `/api/v1/auth/me` | GET | Không | **HTTP 200 (Trả về Admin profile)** | ❌ **CRITICAL-02** |
| `/api/v1/modules` | GET | Không | HTTP 200 (Danh mục module) | ✅ PUBLIC |
| `/api/v1/permissions` | GET | Không | HTTP 200 (Từ điển quyền hạn) | ✅ PUBLIC |
| `/api/v1/dashboard/summary` | GET | Không | **HTTP 200 (Lộ doanh thu & giá trị tồn kho)** | ⚠️ **MEDIUM-01** |
| `/api/v1/dashboard/activity` | GET | Không | **HTTP 200 (Lộ nhật ký vận hành)** | ⚠️ **MEDIUM-02** |
| `/api/v1/notifications` | GET | Không | **HTTP 200 (Lộ thông báo nội bộ)** | ⚠️ **MEDIUM-03** |
| `/api/v1/master-data/nguoi-dung` | GET | `requireAuth` | HTTP 401 Unauthorized | ✅ PROTECTED |
| `/api/v1/master-data/nha-cung-cap`| GET | Không | **HTTP 200 (Lộ SĐT/Email nhà cung cấp)** | ⚠️ **MEDIUM-04** |
| `/api/v1/master-data/kho` | GET | Không | HTTP 200 (Danh sách kho vật lý) | ⚠️ LOW |
| `/api/v1/master-data/vat-tu` | GET | Không | HTTP 200 (Danh mục vải & NPL) | ⚠️ LOW |
| `/api/v1/vi-tri-kho` | GET/POST | `requireAuth`, `requireRoles` | HTTP 401 Unauthorized | ✅ PROTECTED |
| `/api/v1/lo-vat-tu` | GET/POST | `requireAuth`, `requireRoles` | HTTP 401 Unauthorized | ✅ PROTECTED |
| `/api/v1/ton-kho` | GET | `requireAuth`, `requireRoles` | HTTP 401 Unauthorized | ✅ PROTECTED |
| `/api/v1/ton-kho/the-kho` | GET | `requireAuth`, `requireRoles` | HTTP 401 Unauthorized | ✅ PROTECTED |
| `/api/v1/phieu-nhap` | GET/POST | `requireAuth`, `requireRoles` | HTTP 401 Unauthorized | ✅ PROTECTED |
| `/api/v1/phieu-xuat` | GET/POST | `requireAuth`, `requireRoles` | HTTP 401 Unauthorized | ✅ PROTECTED |
| `/api/v1/phieu-chuyen` | GET/POST | `requireAuth`, `requireRoles` | HTTP 401 Unauthorized | ✅ PROTECTED |
| `/api/v1/phieu-kiem-ke` | GET/POST | `requireAuth`, `requireRoles` | HTTP 401 Unauthorized | ✅ PROTECTED |

---

## 9. Privilege Escalation Tests (Kiểm Thử Leo Thang Đặc Quyền)

Thực hiện 6 kịch bản tấn công leo thang trực tiếp:
1. **A. SALES → WAREHOUSE:** Chuyên viên Bán hàng gọi `POST /api/v1/phieu-nhap` → **HTTP 403 Forbidden** (BLOCKED - PASS).
2. **B. SALES → ADMIN:** Bán hàng đính kèm `x-role: admin` gọi `POST /api/v1/phieu-nhap` → **HTTP 403 Forbidden** (BLOCKED - PASS).
3. **C. WAREHOUSE → ADMIN:** Thủ kho gọi `DELETE /api/v1/vi-tri-kho/9999` → **HTTP 404 Not Found** (Quyền hợp lệ do policy cho phép cả 'kho' và 'admin').
4. **D. PRODUCTION → ADMIN:** Sản xuất đính kèm `x-role: admin` gọi `POST /api/v1/vi-tri-kho` → **HTTP 403 Forbidden** (BLOCKED - PASS).
5. **E. PURCHASING → ADMIN:** Mua hàng đính kèm `x-user-id: 1` gọi `POST /api/v1/phieu-chuyen` → **HTTP 403 Forbidden** (BLOCKED - PASS).
6. **F. ACCOUNTING → ADMIN:** Kế toán đính kèm `x-role: admin` gọi `POST /api/v1/phieu-xuat` → **HTTP 403 Forbidden** (BLOCKED - PASS).

---

## 10. requirePermission Audit

- **Định nghĩa middleware:** Tồn tại trong `backend/src/middlewares/auth.js` (dòng 199-227).
- **Logic thẩm định:** Đúng quy chuẩn (Admin bypass, kiểm tra `hasAll` theo mảng `ROLE_PERMISSIONS`, trả về 403 Forbidden khi thiếu quyền).
- **Thực trạng gắn kết route:** **KHÔNG ĐƯỢC SỬ DỤNG TRÊN BẤT KỲ PRODUCTION ROUTE NÀO.**
- **Kết luận chính thức:**
  > **DEFINED AND TESTED, BUT NOT YET ENFORCED GLOBALLY.**  
  Toàn bộ hệ thống backend hiện đang enforce thông qua `requireRoles()` và `requireAuth()`.

---

## 11. Admin Endpoint Security (Thẩm Định Endpoint Quản Trị)

1. **Backend Admin Endpoints:**
   - Không có router riêng `/admin/*` trong backend.
   - Endpoint người dùng duy nhất là `GET /api/v1/master-data/nguoi-dung`.
   - **Lỗ hổng phân quyền:** Endpoint này chỉ có `requireAuth`, không có `requireRoles('admin')`. Người dùng Bán hàng (User 2) hoặc Thủ kho (User 5) khi gửi Bearer token hợp lệ đều nhận được toàn bộ danh bạ người dùng nội bộ (HTTP 200 OK).
2. **Frontend Admin Pages:**
   - Các trang `/admin/users`, `/admin/roles`, `/admin/permissions` được bảo vệ bởi `<RoleGuard roles={['admin']}>`.
   - Cán bộ không phải Admin truy cập sẽ bị điều hướng sang trang `/403 Forbidden`.

---

## 12. Frontend RBAC Audit (Thẩm Định RBAC Giao Diện)

- **AuthContext:** Quản lý state đăng nhập, lưu token tại `localStorage`, cấu hình Axios Interceptor tự động gán `Authorization: Bearer <token>`.
- **RoleGuard & PermissionGuard:** Hoạt động chính xác trên React Router DOM.
- **Khuyến cáo kiến trúc:** **FRONTEND GUARD ≠ BACKEND SECURITY.** Việc ẩn menu hoặc chặn route trên React chỉ có giá trị UX. Backend bắt buộc phải bọc middleware tương ứng.

---

## 13. PH4 Compatibility (Tính Tương Thích Nghiệp Vụ PH4)

- Hoàn toàn tương thích ngược 100%.
- Không có bất kỳ sự thay đổi nào đối với các Controller hoặc Service PH4.
- Luồng tính toán tồn kho khả dụng, trừ kho tự động, tạo thẻ kho hoạt động chính xác.

---

## 14. Database Integrity (Tính Toàn Vẹn Cơ Sở Dữ Liệu)

- **Database:** `erp_may10` | **Schema:** `public`.
- **Tổng số bảng:** **41 bảng** (Không tăng, không giảm, không thay đổi cấu trúc).
- **Bảng người dùng (`nguoi_dung`):** 6 bản ghi người dùng chuẩn của 6 phòng ban, 100% ở trạng thái `hoat_dong`.

---

## 15. CORS / Security Headers

1. **CORS:** Cấu hình `app.use(cors({ origin: '*' }))` trong `backend/src/app.js`. Đây là cấu hình Wildcard mở rộng, cho phép mọi nguồn gốc gửi request cross-origin.
2. **Security Headers:**
   - Thiếu hoàn toàn thư viện `helmet`.
   - Lộ header `X-Powered-By: Express`.
   - Thiếu `X-Frame-Options` (Nguy cơ Clickjacking).
   - Thiếu `X-Content-Type-Options: nosniff` (Nguy cơ MIME-sniffing).
   - Thiếu `Strict-Transport-Security` (HSTS).

---

## 16. Static Auth Bypass Scan (Rà Soát Bypass Tĩnh)

Quét toàn bộ mã nguồn backend phát hiện các đoạn mã fallback nguy hiểm:
1. `backend/src/controllers/portalController.js` (dòng 22):
   `const userId = req.user?.id || 1;` → Tự động gán Admin khi thiếu token.
2. `backend/src/controllers/portalController.js` (dòng 76-78 & 106):
   `else { params.push(1); query += ' AND id = $1'; }` và `user = demoMap.admin;` → Tự động đăng nhập Admin khi body rỗng.
3. `backend/src/controllers/loVatTuController.js` (dòng 107): `const nguoiTao = req.user?.id || 1;`
4. `backend/src/controllers/viTriKhoController.js` (dòng 93): `const nguoiTao = req.user?.id || 1;`
5. `backend/src/controllers/phieuNhapController.js` (dòng 130): `const nguoiTao = req.user?.id || 1;`
6. `backend/src/controllers/phieuKiemKeController.js` (dòng 107, 189): `const nguoiTao = req.user?.id || 1;`
7. `backend/src/controllers/phieuChuyenController.js` (dòng 112): `const nguoiTao = req.user?.id || 1;`
8. `backend/src/controllers/phieuXuatController.js` (dòng 129): `const nguoiTao = req.user?.id || 1;`

---

## 17. Runtime Test Results (Kết Quả Kiểm Thử Thực Tế)

### A. Ma trận 16 Test Cases Chuẩn (`node tests/test_rbac_security.js`):
- **Kết quả:** **16/16 PASS (100%)**.
- Toàn bộ các kịch bản chặn header spoofing và bảo vệ route kho được thực hiện thành công.

### B. Bộ Kiểm Thử Bổ Sung Red Team (R17 -> R24):
- **R17 (Forged Admin Token `erp_token_1_999999999999`):** ❌ **VULNERABLE** (Backend chấp nhận, trả về HTTP 200/201).
- **R18 (Forged Warehouse Token `erp_token_5_888888888888`):** ❌ **VULNERABLE** (Backend chấp nhận).
- **R19 (Expired / Past Timestamp Token):** ❌ **VULNERABLE** (Backend không kiểm tra hạn dùng của timestamp).
- **R20 (Non-existent User ID `erp_token_9999` gọi `/auth/me`):** ❌ **VULNERABLE** (Fallback trả về Admin profile).
- **R21 (Non-admin xem `/permissions`):** ✅ PASS (Từ điển tĩnh).
- **R22 (Direct write bypass attempt):** ✅ PASS (Chặn 403).
- **R23 (Sales token + `x-role: admin`):** ✅ PASS (Chặn 403).
- **R24 (Sales token + `x-user-id: 1`):** ✅ PASS (Chặn 403).

---

## 18. PH4 Regression (Kiểm Thử Hồi Quy Nghiệp Vụ PH4)

- **Lệnh thực thi:** `node tests/test_ph4_api.js`
- **Kết quả:** **16/16 TESTS PASSED (100%)**
- Chi tiết: Health check (UP), Master data (3 kho, 4 vật tư), Vị trí kho (Thêm mới thành công), Lô vật tư (Tra cứu thành công), Tồn kho & Dashboard (Chính xác), Phiếu nhập (201 Created), Phiếu xuất & Chặn xuất âm (409 Conflict), Phiếu chuyển (201 Created), Phiếu kiểm kê & Cân đối kho (200 OK).

---

## 19. Concurrency Test (Kiểm Thử Tranh Chấp Đồng Thời)

- **Lệnh thực thi:** `node tests/test_concurrency.js`
- **Kết quả:** **PASS 100%**
- Kịch bản 2 request đồng thời xuất 80m và 50m từ lô tồn 100m:
  - Request A: HTTP 201 Created (Xuất 80m).
  - Request B: HTTP 409 Conflict (Bị từ chối do thiếu 30m).
  - Tồn kho thực tế cuối cùng: Đúng 20m.
  - Số lượng âm tồn kho: **0 tuyệt đối**.

---

## 20. Danh Sách Phát Hiện (Findings Summary)

| Finding ID | Severity | Category | File & Line | Mô Tả Lỗ Hổng | Trạng Thái |
| :--- | :---: | :---: | :--- | :--- | :---: |
| **RBAC-F01** | **CRITICAL** | Authentication | `backend/src/middlewares/auth.js:50-55` | Token Forgery: Không có chữ ký mật mã; token tự sinh `erp_token_1_...` được chấp nhận là Admin | **OPEN** |
| **RBAC-F02** | **CRITICAL** | Authorization | `backend/src/routes/portalRoutes.js:6` & `portalController.js:22` | Anonymous truy cập `/auth/me` được cấp toàn bộ profile và 28 quyền của Admin | **OPEN** |
| **RBAC-F03** | **CRITICAL** | Authentication | `backend/src/controllers/portalController.js:76-78, 106` | Gửi `POST /auth/login` với body rỗng `{}` tự động đăng nhập và cấp token Admin | **OPEN** |
| **RBAC-F04** | **MEDIUM** | Information Disclosure | `backend/src/routes/portalRoutes.js:14-16` | Các API dashboard summary, activity, notifications mở public cho anonymous | **OPEN** |
| **RBAC-F05** | **MEDIUM** | Information Disclosure | `backend/src/routes/masterDataRoutes.js:9` | API `/master-data/nha-cung-cap` mở public lộ SĐT/Email/Mã số thuế đối tác | **OPEN** |
| **RBAC-F06** | **MEDIUM** | Authorization Gap | `backend/src/routes/masterDataRoutes.js:10` | `/master-data/nguoi-dung` chỉ có `requireAuth`, cho phép vai trò non-admin quét toàn bộ user | **OPEN** |
| **RBAC-F07** | **MEDIUM** | RBAC Architecture | `backend/src/middlewares/auth.js:199` | `requirePermission()` đã định nghĩa và test nhưng chưa được áp dụng vào route nào | **OPEN (Roadmap)**|
| **RBAC-F08** | **LOW** | Network Security | `backend/src/app.js:21` | Wildcard CORS (`origin: '*'`) cho phép mọi website gửi cross-origin request | **OPEN** |
| **RBAC-F09** | **LOW** | Security Hardening | `backend/src/app.js:18` | Thiếu thư viện Helmet, lộ header `X-Powered-By`, thiếu HSTS, CSP, X-Frame-Options | **OPEN** |
| **RBAC-F10** | **LOW** | Account Management | `backend/src/middlewares/auth.js:86-103` | Chưa kiểm tra `trang_thai === 'hoat_dong'` khi xác thực danh tính người dùng | **OPEN** |

---

## 21. Residual Risks (Rủi Ro Còn Lại)

1. **Rủi ro mạo danh trong mạng nội bộ:** Bất kỳ nhân sự nào có kiến thức kỹ thuật đều có thể tự tạo Bearer token mang ID của người khác do adapter thiếu chữ ký số.
2. **Rủi ro lộ lọt thông tin quản trị:** Anonymous có thể đọc báo cáo doanh thu tổng quan và danh sách nhà cung cấp.

---

## 22. Security Score (Chấm Điểm Bảo Mật Khách Quan)

| Hạng Mục Đánh Giá | Trọng Số | Điểm Đạt Được | Lý Do Khấu Trừ |
| :--- | :---: | :---: | :--- |
| **Authentication & Identity** | 30 | **18 / 30** | Bị trừ do `GET /auth/me` và `POST /login {}` có fallback cấp quyền Admin. |
| **Role-Based Access Control (RBAC)** | 25 | **22 / 25** | PH4 phân quyền vững chắc; trừ nhẹ do `/nguoi-dung` chưa giới hạn Admin. |
| **Endpoint Authorization Protection** | 20 | **14 / 20** | Sensitive GET PH4 tốt; trừ do dashboard summary và nhà cung cấp còn public. |
| **PH4 Business Integrity & Concurrency** | 15 | **15 / 15** | Đạt điểm tuyệt đối: 16/16 API pass, 0 mét âm tồn kho, khóa dòng ACID. |
| **Token Cryptography Standard** | 10 | **1 / 10** | Chỉ đạt 1 điểm định dạng; không có chữ ký số, không hạn dùng, không blacklist. |
| **TỔNG ĐIỂM BẢO MẬT CHÍNH THỨC** | **100** | **70 / 100** | **MỨC ĐỘ KHẢ QUAN TRONG NỘI BỘ — CHƯA ĐẠT CHUẨN PRODUCTION** |

---

## 23. Final Verdict (Kết Luận Thẩm Định Cuối Cùng)

```text
================================================================================
                    FINAL AUDIT VERDICT: CRITICAL FAIL
        (FOR PRODUCTION DEPLOYMENT & FORMAL RBAC FREEZE)
                           SECURITY SCORE: 70/100
================================================================================
LƯU Ý ĐÁNH GIÁ ĐIỀU KIỆN:
- ĐỐI VỚI MÔI TRƯỜNG DEV NỘI BỘ: Các lỗ hổng x-user-id spoofing đã được ngăn chặn,
  PH4 vận hành an toàn 100%.
- ĐỐI VỚI TIÊU CHUẨN FREEZE / PRODUCTION: BẮT BUỘC ĐÁNH GIÁ LÀ "CRITICAL FAIL" do
  sự tồn tại của 3 lỗ hổng nguy cấp:
  1. Token Forgery cho phép tự sinh quyền Admin (RBAC-F01).
  2. Anonymous truy cập /api/v1/auth/me nhận quyền Admin (RBAC-F02).
  3. Đăng nhập rỗng /api/v1/auth/login cấp quyền Admin (RBAC-F03).
================================================================================
```

---

## 24. Recommendation for Phase 2 (Khuyến Nghị Triển Khai Phase 2)

1. **Triển khai Central IAM & Signed JWT:**
   - Thay thế toàn bộ temporary token adapter bằng chuẩn RFC 7519 JSON Web Token với thuật toán ký bí mật HMAC-SHA256 (hoặc cặp khóa bất đối xứng RSA RS256).
   - Bắt buộc kiểm tra thời hạn sống (`exp`), người phát hành (`iss`), đối tượng sử dụng (`aud`).
2. **Khắc phục ngay lập tức 2 lỗ hổng Fallback tại Portal:**
   - Bổ sung `requireAuth` vào `router.get('/auth/me')` và xóa bỏ hoàn toàn `req.user?.id || 1`.
   - Trong `login`, từ chối ngay lập tức nếu không truyền email/username hợp lệ, loại bỏ đoạn mã `else { params.push(1); }`.
3. **Bảo vệ toàn diện Endpoint Nghiệp Vụ:**
   - Thêm `requireAuth` vào `/api/v1/dashboard/summary`, `/activity`, `/notifications`, `/master-data/nha-cung-cap`.
   - Bổ sung `requireRoles('admin')` vào `/api/v1/master-data/nguoi-dung`.
4. **Security Hardening Tầng Hạ Tầng:**
   - Cài đặt và cấu hình thư viện `helmet` (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, ẩn `X-Powered-By`).
   - Cấu hình whitelist danh sách origin được phép trong CORS thay vì `*`.
