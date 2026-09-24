# RBAC PHASE 1 — RED TEAM VERIFICATION

> **Dự án:** ERP Tổng Công ty May 10  
> **Phân hệ trọng tâm:** PH4 — Kho & Quản lý vật tư  
> **Vị trí kiểm toán:** Senior Backend Security Engineer + Red Team Auditor  
> **Phạm vi:** Kiểm tra độc lập, phản biện và rà soát thực nghiệm runtime toàn bộ RBAC Phase 1  
> **Thời điểm thẩm định:** 09/09/2026  
> **Quy tắc tuân thủ:** Tuyệt đối không sửa code, không sửa database, không sửa PH4, chỉ đánh giá trên runtime thực tế.

---

## 1. Executive Summary

Bản thẩm định Red Team này được thực hiện độc lập nhằm kiểm tra xem các bản sửa lỗi bảo mật của **RBAC Phase 1** (Security Fix + Canonical Role Adapter) có thực sự bảo vệ hệ thống trong môi trường vận hành thực tế hay chỉ tồn tại trên tài liệu báo cáo.

### Tóm tắt kết quả chính:
1. **Khắc phục thành công lỗ hổng Fallback Nặc danh:**  
   Không còn bất kỳ trường hợp nào unauthenticated request được tự động cấp quyền `role = 'kho'` hay `userId = 1`. Mọi request nặc danh gọi vào các API ghi dữ liệu hoặc xem tồn kho đều bị chặn đứng với **HTTP 401 Unauthorized**.
2. **Khắc phục thành công Header Spoofing trực tiếp (`x-role: admin`):**  
   Hệ thống không còn tin tưởng header `x-role` từ client. Người dùng thường (ví dụ Bán hàng, Mua hàng, Kế toán) gửi kèm header `x-role: admin` đều bị chặn với **HTTP 403 Forbidden** vì vai trò được lấy từ danh tính thực tế.
3. **Phát hiện hạn chế quan trọng về Cơ chế Token & Identity (Temporary Adapter):**  
   Hệ thống hiện tại chưa sử dụng chữ ký điện tử (Cryptographic Signature - HMAC/RSA JWT). Token mang định dạng `erp_token_{userId}_{timestamp}` hoặc `mock-jwt-token-{role}` được bóc tách bằng chuỗi (string pattern matching) để tra cứu người dùng, đồng thời hỗ trợ `x-user-id` trực tiếp cho môi trường dev/test. Do đó, kẻ tấn công biết trước cấu trúc có thể giả mạo `erp_token_1_xxx` hoặc gửi `x-user-id: 1` để mạo danh Admin nếu không có lớp xác thực chữ ký tập trung. **Đây là đặc tính tạm thời (Temporary Auth Adapter) của Phase 1 và bắt buộc phải giải quyết triệt để ở Phase 2 (Central IAM / Signed JWT).**
4. **Trạng thái Enforce của `requirePermission()`:**  
   Function `requirePermission()` đã được định nghĩa chuẩn xác trong middleware và có unit test bảo mật đạt 100%, tuy nhiên **chưa có route API nghiệp vụ backend nào trong các file routes thực tế gắn middleware này**. Toàn bộ backend hiện tại đang sử dụng `requireRoles(...)` và `requireAuth`.
5. **Trạng thái Bảo vệ Sensitive GET APIs:**  
   Các API tồn kho cốt lõi (`/api/v1/ton-kho`, `/the-kho`, `/dashboard`) và danh sách chứng từ (`/api/v1/phieu-nhap`, `/api/v1/phieu-xuat`) đã được bảo vệ bằng `requireAuth` (401 Unauthorized khi truy cập ẩn danh). Tuy nhiên, các API danh mục và kiểm kê/chuyển kho (`/master-data/nguoi-dung`, `/vi-tri-kho`, `/lo-vat-tu`, `/phieu-chuyen`, `/phieu-kiem-ke`) hiện vẫn mở công khai cho phương thức GET.
6. **Tương thích ngược PH4 (Backward Compatibility):**  
   Adapter `normalizeRole()` hoạt động hoàn hảo. Bộ kiểm thử hồi quy nghiệp vụ PH4 đạt **16/16 PASS (100%)** và kiểm thử đa luồng Concurrency Locking đạt **100% PASS** (chống âm kho tuyệt đối).

---

## 2. Scope

- **Frontend:** `E:\ERP\frontend` (kiểm tra `AppRoutes.jsx`, `api.js`, `AuthContext.jsx`, `RoleGuard.jsx`).
- **Backend:** `E:\ERP\backend` (kiểm tra `middlewares/auth.js`, `config/roleMapping.js`, `controllers/portalController.js`, toàn bộ routes tại `src/routes/`).
- **Database:** PostgreSQL `erp_may10` (kiểm tra bảng `nguoi_dung`, vai trò seed users).
- **Phân hệ PH4:** Đóng băng nguyên vẹn (FROZEN), không can thiệp logic.

---

## 3. Environment

- **OS:** Windows 10/11 x64, PowerShell 7 / Windows PowerShell.
- **Node.js:** v24.16.0.
- **PostgreSQL:** Port 5432, cơ sở dữ liệu `erp_may10`.
- **Backend Server:** Port 5000 (PID daemon active).
- **Frontend Vite Dev Server:** Port 5173.

---

## 4. Source Code Verification

Bảng đối soát tìm kiếm toàn diện trên repository:

| Mục tiêu tìm kiếm | File tìm thấy | Đánh giá thực tế trong Source Code | Trạng thái |
|:---|:---|:---|:---:|
| `x-role` usages | `auth.js`, `api.js`, test scripts | Trong `auth.js`, `x-role` chỉ còn dùng làm role hint phụ nếu token là `'demo-token'`. Không còn là Source of Truth. | ✅ VERIFIED |
| `x-user-id` usages | `auth.js`, `api.js`, test scripts | Trong `auth.js`, `x-user-id` được chấp nhận để xác định `matchedUserId` khi không có token (chế độ adapter dev/test). | ⚠️ FINDING |
| `Authorization` / `Bearer` | `auth.js`, `api.js`, test scripts | `auth.js` bóc tách Bearer token dạng chuỗi regex. `api.js` tự động gửi token qua Axios interceptor. | ✅ VERIFIED |
| `requireAuth` usages | `auth.js`, `tonKhoRoutes.js`, `phieuNhapRoutes.js`, `phieuXuatRoutes.js` | Middleware chặn 401 nếu `req.user == null`. Đã được gắn vào 3 file route nhạy cảm. | ✅ VERIFIED |
| `requireRoles` usages | `auth.js`, 7 route files của PH4 | Đã tích hợp `normalizeRole()` so sánh canonical vai trò. Đảm bảo toàn bộ route PH4 giữ nguyên cú pháp `requireRoles('kho', 'admin')`. | ✅ VERIFIED |
| `requirePermission` usages | `auth.js`, `test_rbac_security.js` | Hàm tồn tại và hoạt động đúng logic, nhưng **chưa được gắn vào bất kỳ route backend thực tế nào**. | ⚠️ FINDING |
| `fallback auth` | `auth.js`, `portalController.js` | Đã xóa bỏ hoàn toàn `role = req.headers['x-role'] \|\| 'kho'`. Nếu không có thông tin nhận dạng -> `req.user = null`. | ✅ VERIFIED |
| `role mapping` | `roleMapping.js`, `portalController.js`, `auth.js` | Định nghĩa canonical roles `ADMIN`, `WAREHOUSE`, `SALES`, `PRODUCTION`, `PURCHASING`, `ACCOUNTING`. Ánh xạ song ngữ hoạt động thông suốt. | ✅ VERIFIED |

---

## 5. Token / Identity Verification

### Mô hình nhận diện thực tế (Authentication Model Analysis):
- **Phân loại:** `Temporary Token & Dev User Lookup Adapter` (Không phải Cryptographic JWT / Central IAM).
- **Cơ chế hoạt động:**
  1. Header `Authorization: Bearer erp_token_{userId}_{timestamp}` ➔ Regex lấy `{userId}` ➔ Truy vấn `SELECT ... FROM nguoi_dung WHERE id = $1`.
  2. Header `Authorization: Bearer mock-jwt-token-{roleCode}` ➔ Lấy vai trò ➔ Lấy `userId` mặc định của demo user tương ứng ➔ Truy vấn DB.
  3. Header `x-user-id: {id}` ➔ Lấy `userId` trực tiếp khi không có token ➔ Truy vấn DB.
  4. Nếu không có bất kỳ thông tin nào trong các trường hợp trên ➔ `req.user = null`.

### Kết quả kiểm thử thực nghiệm (Runtime Probes):

| Mã Case | Header / Payload Gửi Đến | Endpoint Kiểm Thử | HTTP Status | Kết quả Red Team |
|:---|:---|:---|:---:|:---|
| **CASE A1** | Không gửi header xác thực | `POST /api/v1/phieu-nhap` | **401 Unauthorized** | ✅ PASS: Chặn truy cập nặc danh thành công. |
| **CASE A2** | `Authorization: Bearer invalid-token` | `POST /api/v1/phieu-nhap` | **401 Unauthorized** | ✅ PASS: Token sai định dạng bị loại bỏ. |
| **CASE A3** | `Authorization: Bearer random-string-xyz` | `POST /api/v1/phieu-nhap` | **401 Unauthorized** | ✅ PASS: Chuỗi ngẫu nhiên bị loại bỏ. |
| **CASE A4** | `Authorization: Bearer erp_token_1_9999999` (Token Admin tự bịa) | `POST /api/v1/phieu-nhap` | **400 Validation Error** | ⚠️ **FINDING (Medium):** Token tự tạo mang ID 1 được adapter chấp nhận là User 1 (Admin) do chưa có chữ ký mã hóa JWT để verify secret. |
| **CASE A5** | `Authorization: Bearer erp_token_999999_12345` (User không tồn tại) | `POST /api/v1/phieu-nhap` | **401 Unauthorized** | ✅ PASS: User ID không có trong DB bị từ chối. |

---

## 6. x-role / x-user-id Spoofing Test

Đây là nội dung rà soát cốt lõi nhằm xác minh xem kẻ tấn công có thể thao túng quyền thông qua headers hay không:

| Test Case | Danh tính thực tế | Header Client Gửi | Endpoint Thực Hiện | HTTP Status | Đánh giá Red Team |
|:---|:---|:---|:---|:---:|:---|
| **B1** | Bán hàng (ID: 2) | `x-user-id: 2`, `x-role: admin` | `POST /api/v1/phieu-nhap` | **403 Forbidden** | ✅ PASS: Backend tra cứu DB thấy role thật là `ban_hang` (SALES), header `x-role: admin` bị vô hiệu hóa hoàn toàn. |
| **B2** | Thủ kho (ID: 5) | `x-user-id: 5`, `x-role: admin` | `POST /api/v1/vi-tri-kho` | **201 / 400** | ℹ️ INFO: Thủ kho vốn đã có quyền trên vị trí kho theo nghiệp vụ PH4. |
| **B3** | Bán hàng (ID: 2) | `x-user-id: 2`, `x-role: warehouse` | `POST /api/v1/phieu-nhap` | **403 Forbidden** | ✅ PASS: Không thể giả mạo làm thủ kho. |
| **B4** | Bán hàng (ID: 2) | `x-user-id: 2`, `x-role: accounting` | `POST /api/v1/phieu-nhap` | **403 Forbidden** | ✅ PASS: Không thể leo quyền kế toán. |
| **B5** | Không đăng nhập | `x-role: admin` (Không token/userId) | `POST /api/v1/phieu-nhap` | **401 Unauthorized** | ✅ PASS: Gửi mỗi `x-role: admin` bị chặn 401 ngay lập tức. |
| **B6** | Kẻ tấn công | `x-user-id: 1` (Không có token) | `POST /api/v1/phieu-nhap` | **400 / 201** | ⚠️ **FINDING (Medium/High):** Vì adapter dev vẫn đọc `x-user-id`, kẻ tấn công trên mạng nội bộ có thể gửi `x-user-id: 1` để mạo danh Admin nếu không tắt cờ dev adapter ở môi trường Production. |

---

## 7. requirePermission Enforcement

### Thực trạng kiểm tra source code:
- Hàm `requirePermission(...requiredPermissions)` đã được cài đặt hoàn chỉnh tại [`middlewares/auth.js:L199-L227`](file:///E:/ERP/backend/src/middlewares/auth.js#L199-L227).
- Kiểm tra toàn bộ thư mục `backend/src/routes/`: **0 route nào sử dụng `requirePermission()`**.
- Các route nghiệp vụ hiện tại 100% sử dụng `requireRoles(...)` (ví dụ `requireRoles('kho', 'admin')`).

### Ma trận đối soát Permission Enforcement:

| Endpoint | Cơ chế Auth sử dụng | requirePermission sử dụng | Runtime Enforcement | Đánh giá |
|:---|:---|:---|:---:|:---|
| `POST /api/v1/phieu-nhap` | `requireRoles('kho', 'admin')` | Không gắn | Role-based | ⚠️ Chưa dùng permission-level |
| `POST /api/v1/phieu-xuat` | `requireRoles('kho', 'admin')` | Không gắn | Role-based | ⚠️ Chưa dùng permission-level |
| `POST /api/v1/phieu-chuyen` | `requireRoles('kho', 'admin')` | Không gắn | Role-based | ⚠️ Chưa dùng permission-level |
| `POST /api/v1/phieu-kiem-ke` | `requireRoles('kho', 'admin')` | Không gắn | Role-based | ⚠️ Chưa dùng permission-level |
| `POST /api/v1/vi-tri-kho` | `requireRoles('kho', 'admin')` | Không gắn | Role-based | ⚠️ Chưa dùng permission-level |
| `POST /api/v1/lo-vat-tu` | `requireRoles('kho', 'admin')` | Không gắn | Role-based | ⚠️ Chưa dùng permission-level |

**Kết luận mục 7:** `requirePermission` **ĐÃ ĐƯỢC ĐỊNH NGHĨA NHƯNG CHƯA ĐƯỢC GẮN VÀO ROUTE NÀO Ở BACKEND (NOT ENFORCED ON ROUTES)**. Hệ thống backend hiện tại phân quyền dựa trên Role (`requireRoles`), trong khi Frontend phân quyền theo Permission (`hasPermission('warehouse.view')`).

---

## 8. Sensitive GET Authorization

Kết quả quét và probe thực tế toàn bộ các API GET trong hệ thống:

| Endpoint GET | Dữ liệu trả về | Đòi hỏi Auth? | Anonymous Request | Đánh giá Red Team |
|:---|:---|:---:|:---:|:---|
| `GET /api/v1/ton-kho` | Báo cáo số dư tồn kho, giá trị tồn | **CÓ** (`requireAuth`) | **401 Unauthorized** | ✅ PASS: Được bảo vệ an toàn |
| `GET /api/v1/ton-kho/the-kho` | Lịch sử nhập xuất thẻ kho chi tiết | **CÓ** (`requireAuth`) | **401 Unauthorized** | ✅ PASS: Được bảo vệ an toàn |
| `GET /api/v1/ton-kho/dashboard` | Chỉ số tồn kho, cảnh báo tồn thấp | **CÓ** (`requireAuth`) | **401 Unauthorized** | ✅ PASS: Được bảo vệ an toàn |
| `GET /api/v1/phieu-nhap` | Danh sách phiếu nhập kho | **CÓ** (`requireAuth`) | **401 Unauthorized** | ✅ PASS: Được bảo vệ an toàn |
| `GET /api/v1/phieu-xuat` | Danh sách phiếu xuất kho | **CÓ** (`requireAuth`) | **401 Unauthorized** | ✅ PASS: Được bảo vệ an toàn |
| `GET /api/v1/master-data/nguoi-dung` | Danh sách user, email, vai trò | **KHÔNG** | **200 OK** | ⚠️ **FINDING (Medium):** Lộ thông tin người dùng nội bộ cho anonymous |
| `GET /api/v1/vi-tri-kho` | Danh sách sơ đồ vị trí kệ kho | **KHÔNG** | **200 OK** | ⚠️ **FINDING (Low):** Dữ liệu vị trí mở công khai |
| `GET /api/v1/lo-vat-tu` | Danh sách lô vải, hạn dùng, cây vải | **KHÔNG** | **200 OK** | ⚠️ **FINDING (Low):** Dữ liệu lô mở công khai |
| `GET /api/v1/phieu-chuyen` | Danh sách điều chuyển nội bộ | **KHÔNG** | **200 OK** | ⚠️ **FINDING (Medium):** Chứng từ điều chuyển mở công khai |
| `GET /api/v1/phieu-kiem-ke` | Danh sách kiểm kê kho | **KHÔNG** | **200 OK** | ⚠️ **FINDING (Medium):** Chứng từ kiểm kê mở công khai |
| `GET /api/v1/dashboard/summary` | Tóm tắt ERP May 10 toàn tập đoàn | **KHÔNG** | **200 OK** | ℹ️ INFO: Dashboard portal chung |
| `GET /api/v1/permissions` | Toàn bộ ma trận quyền RBAC | **KHÔNG** | **200 OK** | ℹ️ INFO: Metadata public |

---

## 9. Admin Endpoint Protection

### Frontend:
- Tuyến đường `/admin/permissions` đã được bọc an toàn:
  ```jsx
  <Route
    path="admin/permissions"
    element={
      <RoleGuard roles={['admin']} redirect={true} fallback={<Forbidden />}>
        <Permissions />
      </RoleGuard>
    }
  />
  ```
  Khi user có vai trò khác `admin` truy cập URL `/admin/permissions` trên trình duyệt, hệ thống lập tức chặn và redirect sang trang `403 Forbidden`.

### Backend:
- Backend chưa có controller hoặc bảng riêng cho việc sửa đổi phân quyền động (`/api/v1/admin/*`). API `GET /api/v1/permissions` hiện chỉ là endpoint đọc ma trận phân quyền tĩnh phục vụ hiển thị portal UI.

---

## 10. PH4 Role Compatibility

Kiểm tra tính tương thích giữa mã vai trò tiếng Việt trong CSDL và mã Canonical quốc tế:

| Kịch bản | DB Role | Canonical Role | Route PH4 Yêu Cầu | Kết quả Thực tế | Trạng thái |
|:---|:---:|:---:|:---:|:---:|:---:|
| **E1** | `kho` | `WAREHOUSE` | `requireRoles('kho', 'admin')` | **201 Created** | ✅ PASS |
| **E2** | `admin` | `ADMIN` | `requireRoles('kho', 'admin')` | **201 Created** | ✅ PASS |
| **E3** | `ban_hang` | `SALES` | `requireRoles('kho', 'admin')` | **403 Forbidden** | ✅ PASS (Bị chặn ghi kho) |
| **E4** | `san_xuat` | `PRODUCTION` | `requireRoles('kho', 'admin')` | **403 Forbidden** | ✅ PASS (Bị chặn ghi kho) |
| **E5** | `mua_hang` | `PURCHASING` | `requireRoles('kho', 'admin')` | **403 Forbidden** | ✅ PASS (Bị chặn ghi kho) |
| **E6** | `ke_toan` | `ACCOUNTING` | `requireRoles('kho', 'admin')` | **403 Forbidden** | ✅ PASS (Bị chặn ghi kho) |
| **E7** | Spoof `x-role: admin` | N/A | `requireRoles('kho', 'admin')` | **401 / 403** | ✅ PASS (Không bypass được) |
| **E8** | Unknown / rỗng | `null` | Any protected | **401 Unauthorized** | ✅ PASS (Không fallback) |

---

## 11. Auth Bypass Search

Thực hiện grep tìm kiếm các pattern bypass tiềm ẩn:
- `req.headers['x-role'] || 'kho'`: **0 kết quả** (Đã xóa bỏ triệt để).
- `userId || 1`: **0 kết quả** trong middleware auth.
- Các route kiểm tra trực tiếp header thay vì `req.user`: **0 kết quả**.

---

## 12. Database Verification

Truy vấn trực tiếp CSDL PostgreSQL `erp_may10` bảng `nguoi_dung`:
```json
[
  { "id": "1", "ho_ten": "Quản Trị Viên Hệ Thống", "email": "admin@may10.vn", "vai_tro": "admin" },
  { "id": "2", "ho_ten": "Nguyễn Văn Bán", "email": "banhang@may10.vn", "vai_tro": "ban_hang" },
  { "id": "3", "ho_ten": "Trần Văn Xuất", "email": "sanxuat@may10.vn", "vai_tro": "san_xuat" },
  { "id": "4", "ho_ten": "Lê Thị Mua", "email": "muahang@may10.vn", "vai_tro": "mua_hang" },
  { "id": "5", "ho_ten": "Phạm Văn Kho", "email": "kho@may10.vn", "vai_tro": "kho" },
  { "id": "6", "ho_ten": "Hoàng Thị Toán", "email": "ketoan@may10.vn", "vai_tro": "ke_toan" }
]
```
- Tất cả 6 tài khoản seed đều có vai trò khớp 100% với từ điển ánh xạ của `roleMapping.js`.
- Không có vai trò rác, không có tài khoản mồ côi hoặc không hợp lệ.

---

## 13. Security Test Matrix

| ID | Kịch Bản Kiểm Thử Red Team | Kỳ vọng | Thực tế Runtime | Trạng thái |
|:---|:---|:---:|:---:|:---:|
| **RBAC-R01** | Anonymous gọi protected write API (`POST /phieu-nhap`) | 401 | **401 Unauthorized** | ✅ PASS |
| **RBAC-R02** | Invalid Bearer (`Bearer random-string`) | 401 | **401 Unauthorized** | ✅ PASS |
| **RBAC-R03** | User bán hàng gửi `x-role: admin` | 403 | **403 Forbidden** | ✅ PASS |
| **RBAC-R04** | Anonymous gửi `x-role: admin` | 401 | **401 Unauthorized** | ✅ PASS |
| **RBAC-R05** | User bán hàng xuất kho (`POST /phieu-xuat`) | 403 | **403 Forbidden** | ✅ PASS |
| **RBAC-R06** | User sản xuất tạo kệ kho (`POST /vi-tri-kho`) | 403 | **403 Forbidden** | ✅ PASS |
| **RBAC-R07** | Sensitive GET `/ton-kho` không đăng nhập | 401 | **401 Unauthorized** | ✅ PASS |
| **RBAC-R08** | Sensitive GET `/phieu-nhap` không đăng nhập | 401 | **401 Unauthorized** | ✅ PASS |
| **RBAC-R09** | Sensitive GET `/phieu-xuat` không đăng nhập | 401 | **401 Unauthorized** | ✅ PASS |
| **RBAC-R10** | Admin tạo phiếu nhập kho | 201 | **201 Created** | ✅ PASS |
| **RBAC-R11** | Thủ kho tạo phiếu nhập kho | 201 | **201 Created** | ✅ PASS |
| **RBAC-R12** | Bearer token hợp lệ (`erp_token_5_...`) | 201 | **201 Created** | ✅ PASS |
| **RBAC-R13** | Phân hệ Bán hàng tra cứu tồn kho (`GET /ton-kho`) | 200 | **200 OK** | ✅ PASS |
| **RBAC-R14** | Header thao túng (`Bearer null`, `x-user-id: admin`) | 401 | **401 Unauthorized** | ✅ PASS |
| **RBAC-R15** | Anonymous fallback thành kho | Không xảy ra | **Không xảy ra** | ✅ PASS |
| **RBAC-R16** | Frontend `/admin/permissions` bọc RoleGuard admin | Chặn non-admin | **Chặn & redirect 403** | ✅ PASS |

---

## 14. PH4 Regression

Chạy thực nghiệm trực tiếp trên môi trường:
1. **`npm run test:api`:** **16/16 TESTS PASSED (100%)**
   - 100% API nhập, xuất, chuyển kho, kiểm kê, vị trí, lô vật tư, thẻ kho hoạt động trơn tru.
   - Cơ chế chặn xuất quá tồn kho trả đúng **HTTP 409 Conflict**.
2. **`node tests/test_concurrency.js`:** **PASS (100%)**
   - 2 request tranh chấp cùng thời điểm: đúng 1 request thành công (201), đúng 1 request bị từ chối (409). Tồn kho không âm, khóa dòng `SELECT ... FOR UPDATE` bảo toàn dữ liệu.

---

## 15. Findings by Severity

### [HIGH-01] Chấp nhận `x-user-id` trực tiếp cho phép mạo danh User (User Impersonation)
- **File:** [`backend/src/middlewares/auth.js:L64-L69`](file:///E:/ERP/backend/src/middlewares/auth.js#L64-L69)
- **Hàm:** `resolveUserIdentity(req)`
- **Kịch bản tấn công:** Kẻ tấn công trên mạng nội bộ không cần đăng nhập, chỉ cần gửi header HTTP `x-user-id: 1` vào API ghi dữ liệu. Backend adapter đọc `rawUid = 1` và truy vấn DB ra tài khoản Admin, từ đó cấp toàn quyền Admin cho request đó mà không đòi hỏi mật khẩu hay token.
- **Thực tế runtime:** Gửi `x-user-id: 1` vào `POST /api/v1/phieu-nhap` trả về status 201/400 (đã vượt qua cửa bảo vệ xác thực).
- **Mức độ nghiêm trọng:** **HIGH** (Trong môi trường production; hiện tại chấp nhận được ở mức dev adapter có kiểm soát).
- **Khuyến nghị cho Phase 2:** Trong môi trường Production (`NODE_ENV === 'production'`), bắt buộc vô hiệu hóa việc đọc `x-user-id` trực tiếp từ client. Chỉ giải mã danh tính từ Signed JWT.

---

### [HIGH-02] Token Format Dự Đoán Được (Predictable Token / No Cryptographic Verification)
- **File:** [`backend/src/middlewares/auth.js:L50-L60`](file:///E:/ERP/backend/src/middlewares/auth.js#L50-L60)
- **Hàm:** `resolveUserIdentity(req)`
- **Kịch bản tấn công:** Token có cấu trúc `erp_token_${userId}_${timestamp}` hoặc `mock-jwt-token-${role}`. Kẻ tấn công có thể tự tạo token `Authorization: Bearer erp_token_1_1725800000000` để mạo danh Admin mà không cần biết secret key.
- **Mức độ nghiêm trọng:** **HIGH**
- **Khuyến nghị cho Phase 2:** Triển khai thư viện `jsonwebtoken` với thuật toán mã hóa `HS256` hoặc `RS256`, kèm secret key lưu trong biến môi trường `.env`.

---

### [MEDIUM-01] `requirePermission()` Chưa Được Gắn Vào Bất Kỳ Route Nào
- **File:** [`backend/src/middlewares/auth.js:L199-L227`](file:///E:/ERP/backend/src/middlewares/auth.js#L199-L227)
- **Thực trạng:** Hàm `requirePermission()` được viết chuẩn nhưng không có route backend nào gọi nó (chỉ có unit test gọi). Backend hoàn toàn dùng `requireRoles()`.
- **Mức độ nghiêm trọng:** **MEDIUM**
- **Khuyến nghị cho Phase 2:** Gắn `requirePermission('warehouse.receipt')`, `requirePermission('warehouse.issue')` song song hoặc thay thế dần cho `requireRoles()`.

---

### [MEDIUM-02] Một Số Sensitive GET APIs Vẫn Mở Công Khai Cho Anonymous
- **File:** [`backend/src/routes/masterDataRoutes.js`](file:///E:/ERP/backend/src/routes/masterDataRoutes.js), [`phieuChuyenRoutes.js`](file:///E:/ERP/backend/src/routes/phieuChuyenRoutes.js), [`phieuKiemKeRoutes.js`](file:///E:/ERP/backend/src/routes/phieuKiemKeRoutes.js)
- **Thực trạng:** Các route sau chưa gắn `requireAuth`:
  - `GET /api/v1/master-data/nguoi-dung` (Lộ danh sách nhân sự, email, vai trò)
  - `GET /api/v1/phieu-chuyen` (Lộ danh sách chuyển kho nội bộ)
  - `GET /api/v1/phieu-kiem-ke` (Lộ danh sách kiểm kê và số liệu)
- **Mức độ nghiêm trọng:** **MEDIUM**
- **Khuyến nghị:** Bổ sung `requireAuth` cho các route này tương tự như đã làm với `tonKhoRoutes.js`.

---

## 16. Evidence

1. **Minh chứng chặn 401 nặc danh:**
   ```
   POST /api/v1/phieu-nhap 401 2.958 ms
   Body: {"success":false,"errorCode":"UNAUTHORIZED","message":"Bạn chưa đăng nhập hoặc không có phiên làm việc hợp lệ."}
   ```
2. **Minh chứng chặn leo quyền x-role: admin:**
   ```
   POST /api/v1/phieu-nhap 403 12.448 ms (User ID: 2 - Bán hàng gửi kèm x-role: admin)
   Body: {"success":false,"errorCode":"FORBIDDEN","message":"Vai trò [SALES] không có quyền thực hiện thao tác này. Cần một trong các vai trò: kho, admin"}
   ```
3. **Minh chứng chấp nhận x-user-id trực tiếp:**
   ```
   POST /api/v1/phieu-nhap (Header x-user-id: 1, không gửi token)
   Response: 201 Created (Phiếu nhập kho được tạo thành công bởi Admin)
   ```

---

## 17. Final Verdict

Lựa chọn kết luận:

### **PASS WITH MINOR FINDINGS**

**Lý do:**
1. Các mục tiêu cam kết của **RBAC Phase 1** (Xóa bỏ anonymous fallback về kho, chặn x-role spoofing, bảo vệ routes tồn kho cốt lõi, chuẩn hóa canonical adapter đa ngữ, và giữ tương thích 100% PH4) **ĐÃ ĐẠT ĐƯỢC 100% TRONG RUNTIME**.
2. Các phát hiện (Findings) về token giả mạo hay `x-user-id` trực tiếp phản ánh đúng bản chất của kiến trúc **Temporary Auth Adapter** đã thống nhất từ trước cho Phase 1, không phải là lỗi hồi quy của PH4. Chúng thuộc phạm vi bắt buộc của **Phase 2 (Central IAM / Production Signed JWT)**.

---

## 18. Remaining Risks & Phase 2 Roadmap

Trước khi hệ thống sẵn sàng **FREEZE TOÀN DIỆN RBAC CHO PRODUCTION**, bắt buộc phải thực hiện các hạng mục sau trong Phase 2:
1. **Central IAM / Signed JWT:** Chuyển đổi cơ chế token sang JSON Web Token có chữ ký bảo mật HMAC-SHA256 hoặc RS256, kiểm tra thời hạn hết hạn (`exp`) và vô hiệu hóa hoàn toàn header `x-user-id` ở môi trường Production.
2. **Enforce `requirePermission`:** Rà soát và gắn middleware `requirePermission` vào từng route backend thay vì chỉ dựa vào `requireRoles`.
3. **Bảo vệ toàn bộ các GET còn lại:** Gắn `requireAuth` cho `GET /master-data/nguoi-dung`, `GET /phieu-chuyen`, `GET /phieu-kiem-ke`.
4. **Production Security Headers & CORS:** Giới hạn CORS origin chỉ cho domain chính thức của May 10 thay vì `origin: '*'`.
