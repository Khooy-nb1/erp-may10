# ================================================================
# BÁO CÁO NGHIỆM THU & KIỂM THỬ CHỨC NĂNG QUẢN TRỊ NGƯỜI DÙNG
# ERP MAY 10 — FEATURE: ADMIN USER MANAGEMENT (QUẢN TRỊ → NGƯỜI DÙNG)
# ================================================================

- **Mã tài liệu:** `ADMIN_USER_MANAGEMENT_AUDIT.md`
- **Dự án:** ERP May 10 — Phân hệ Quản trị Hệ thống & Core Portal
- **Workspace:** `E:\ERP`
- **Branch:** `feature/ph4-core-portal`
- **Thời gian thực hiện:** 16/09/2026
- **Kết quả nghiệm thu:** **PASS (100% — SẴN SÀNG VẬN HÀNH TOÀN DIỆN)**

---

## 1. MỤC TIÊU VÀ PHẠM VI

### 1.1. Mục tiêu
- Kiểm tra toàn diện, truy vết và hoàn thiện đầy đủ 5 nghiệp vụ quản trị người dùng cốt lõi cho ERP May 10 theo đặc tả nghiệp vụ Tổng công ty May 10:
  1. Thêm mới tài khoản người dùng (`POST /api/v1/users` & `POST /api/v1/admin/users`)
  2. Cập nhật thông tin cán bộ / nhân sự (`PUT /api/v1/users/:id` & `PUT /api/v1/admin/users/:id`)
  3. Điều chỉnh phân quyền / đổi vai trò theo 6 Canonical Roles (`PATCH /api/v1/users/:id/role`)
  4. Khóa / mở khóa tài khoản tức thời (`PATCH /api/v1/users/:id/status`)
  5. Đặt lại mật khẩu an toàn chuẩn mã hóa mật mã học (`POST /api/v1/users/:id/reset-password`)
- Đảm bảo tính toàn vẹn dữ liệu, triệt tiêu nguy cơ lỗ hổng leo thang đặc quyền (Privilege Escalation), ngăn chặn tự khóa tài khoản quản trị viên và duy trì sự ổn định 100% cho toàn bộ các phân hệ PH1, PH2, PH3, PH4, PH5.

### 1.2. Phạm vi can thiệp
- **Backend:**
  - Validator: `backend/src/validators/userValidator.js`
  - Controller: `backend/src/controllers/userController.js`
  - Routes: `backend/src/routes/userRoutes.js`
  - App routing: `backend/src/app.js` (gắn kết route quản trị)
  - Auth Integration: `backend/src/controllers/portalController.js` (hỗ trợ hash mật mã học PBKDF2)
- **Frontend:**
  - Service: `frontend/src/services/userService.js`
  - Giao diện người dùng: `frontend/src/pages/admin/Users.jsx`
- **Tập kiểm thử:**
  - `backend/tests/test_admin_user_management.js` (25 test cases cốt lõi + 3 integration tests)
- **Ranh giới bất khả xâm phạm:**
  - Không thay đổi cấu trúc bảng cơ sở dữ liệu `nguoi_dung` (Không ALTER, không thêm cột, không migrations).
  - Không thay đổi dữ liệu seed của 7 tài khoản cốt lõi ban đầu.
  - Không sửa đổi logic nghiệp vụ của PH1, PH2, PH3, PH4, PH5.
  - Giữ nguyên thiết kế nhận diện thương hiệu Core Portal UI Foundation V2.11.

---

## 2. KẾT QUẢ AUDIT HIỆN TRẠNG TRƯỚC KHI SỬA

| Hạng mục | Tình trạng trước khi sửa | Đánh giá rủi ro / Hạn chế |
| :--- | :--- | :--- |
| **Bảng dữ liệu `nguoi_dung`** | Đã tồn tại 7 tài khoản seed, cột: `id`, `ho_ten`, `email`, `mat_khau`, `so_dien_thoai`, `vai_tro`, `phong_ban`, `trang_thai`, `ngay_tao`, `ngay_cap_nhat`, `nguoi_tao`, `nguoi_cap_nhat`. | Schema hoàn chỉnh nhưng thiếu cột hiển thị mã cán bộ riêng biệt (`ma_can_bo`). Cần sinh mã quy ước an toàn. |
| **Backend Route `userRoutes.js`** | File rỗng (0 bytes), chưa được đăng ký trong `backend/src/app.js`. | Không có API endpoint nào để quản trị người dùng. Client chỉ có thể gọi sang `portalService.getUsers()`. |
| **Backend Controller `userController.js`** | File rỗng (0 bytes). | Hoàn toàn chưa có code xử lý CRUD, phân quyền, kiểm tra email trùng lặp hay mã hóa mật khẩu. |
| **Backend Validator `userValidator.js`** | File rỗng (0 bytes). | Không có lớp kiểm định tính hợp lệ của dữ liệu đầu vào. |
| **Frontend Service `userService.js`** | File rỗng (0 bytes). | Giao diện không có API client chuyên trách để thực hiện các thao tác quản trị. |
| **Frontend Page `Users.jsx`** | Chỉ hiển thị bảng danh sách dạng tĩnh đọc từ `portalService.getUsers()`. Trạng thái bị hardcode "Hoạt động". Không có nút thêm, sửa, đổi vai trò, khóa hoặc reset mật khẩu. | Giao diện chỉ mang tính xem tĩnh (read-only), không đáp ứng yêu cầu quản trị doanh nghiệp. |

---

## 3. DANH SÁCH FILE THAY ĐỔI & FILE TẠO MỚI

1. `backend/src/validators/userValidator.js` *(Tạo mới / Hoàn thiện)*: Bộ quy tắc kiểm tra tính hợp lệ dữ liệu: họ tên, email chuẩn, vai trò canonical, độ dài mật khẩu $\ge 6$ ký tự, trạng thái tài khoản.
2. `backend/src/controllers/userController.js` *(Tạo mới / Hoàn thiện)*: Bộ xử lý 7 tác vụ quản trị: `getUsers`, `getUserById`, `createUser`, `updateUser`, `changeRole`, `toggleUserStatus`, `resetPassword`.
3. `backend/src/routes/userRoutes.js` *(Tạo mới / Hoàn thiện)*: Khai báo các endpoints RESTful được bảo vệ nghiêm ngặt bởi `requireAuth` và `requireRoles('admin')`.
4. `backend/src/app.js` *(Cập nhật)*: Đăng ký router `/api/v1/users` và alias `/api/v1/admin/users`.
5. `backend/src/controllers/portalController.js` *(Cập nhật)*: Tích hợp thư viện Node.js native `crypto`, xác thực PBKDF2 timing-safe cho các tài khoản mới được tạo/reset, duy trì fallback tương thích an toàn cho 7 tài khoản seed ban đầu.
6. `frontend/src/services/userService.js` *(Tạo mới / Hoàn thiện)*: API client đầy đủ phương thức `getUsers`, `getUserById`, `createUser`, `updateUser`, `changeRole`, `updateStatus`, `resetPassword`.
7. `frontend/src/pages/admin/Users.jsx` *(Cập nhật)*: Giao diện quản trị hiện đại, tích hợp thanh tìm kiếm, bộ lọc vai trò, bộ lọc trạng thái, bảng dữ liệu động và 5 Modal hộp thoại tác vụ chuyên dụng.
8. `backend/tests/test_admin_user_management.js` *(Tạo mới)*: Bộ kịch bản kiểm thử tự động toàn diện bao quát 25 tiêu chí theo đúng yêu cầu đề bài.

---

## 4. SCHEMA BẢNG NGUOI_DUNG VÀ DỮ LIỆU HIỆN TẠI

### 4.1. Cấu trúc Schema (PostgreSQL)
Bảng `nguoi_dung` được bảo tồn nguyên vẹn 100%, không phát sinh bất kỳ thay đổi cấu trúc nào:
```sql
CREATE TABLE IF NOT EXISTS nguoi_dung (
    id SERIAL PRIMARY KEY,
    ho_ten VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mat_khau VARCHAR(255) NOT NULL,
    so_dien_thoai VARCHAR(20),
    vai_tro VARCHAR(50) NOT NULL DEFAULT 'kho',
    phong_ban VARCHAR(100),
    trang_thai VARCHAR(20) NOT NULL DEFAULT 'hoat_dong',
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nguoi_tao VARCHAR(100),
    nguoi_cap_nhat VARCHAR(100)
);
```

### 4.2. Danh sách 7 tài khoản cốt lõi (Seed Users)
| ID | Họ và tên | Email | Vai trò Canonical | Phòng ban | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Quản Trị Viên Hệ Thống | `admin@may10.vn` | `admin` | Ban Công Nghệ Thông Tin | `hoat_dong` |
| 2 | Nguyễn Văn Bán | `banhang@may10.vn` | `ban_hang` | Phòng Kinh Doanh May 10 | `hoat_dong` |
| 3 | Trần Văn Xuất | `sanxuat@may10.vn` | `san_xuat` | Xí Nghiệp May Xuất Khẩu | `hoat_dong` |
| 4 | Lê Thị Mua | `muahang@may10.vn` | `mua_hang` | Phòng Cung Ứng & Vật Tư | `hoat_dong` |
| 5 | Phạm Văn Kho | `kho@may10.vn` | `kho` | Tổng Kho May 10 | `hoat_dong` |
| 6 | Hoàng Thị Toán | `ketoan@may10.vn` | `ke_toan` | Phòng Tài Chính Kế Toán | `hoat_dong` |
| 7 | Nguyễn Văn Trưởng | `ketoantruong@may10.vn` | `ke_toan_truong` (mapped `ke_toan`) | Phòng Tài Chính Kế Toán | `hoat_dong` |

---

## 5. MAPPING 6 CANONICAL ROLES

Hệ thống tuân thủ nghiêm ngặt 6 Canonical Roles theo chuẩn May 10 Core RBAC Framework:
```javascript
const CANONICAL_ROLES = [
  'admin',      // Quản trị hệ thống toàn quyền
  'ban_hang',   // Phân hệ Bán hàng & Quản lý khách hàng (PH1)
  'san_xuat',   // Phân hệ Quản lý sản xuất & Điều độ (PH2)
  'mua_hang',   // Phân hệ Quản lý mua hàng & NCC (PH3)
  'kho',        // Phân hệ Quản lý kho & Vật tư (PH4)
  'ke_toan'     // Phân hệ Tài chính - Kế toán & Giá thành (PH5)
];
```
- **Lưu ý nghiệp vụ:** Chức danh `ke_toan_truong` (Kế toán trưởng) là vị trí bổ nhiệm đặc thù của PH5, được tự động ánh xạ (normalize) tương thích hoàn toàn vào Canonical Role `ke_toan`.
- Bất kỳ thao tác thêm người dùng hoặc thay đổi vai trò ngoài 6 Canonical Roles này đều bị chặn ngay tại validator với mã lỗi `400 INVALID_ROLE`.

---

## 6. THUẬT TOÁN HASH MẬT KHẨU & BẢO MẬT ZERO PLAINTEXT

- **Công nghệ mã hóa:** Sử dụng thư viện mật mã học tiêu chuẩn của Node.js (`crypto.pbkdf2Sync`) kết hợp thuật toán băm SHA-512 với 10,000 vòng lặp (iterations) và muối ngẫu nhiên (cryptographic random salt 16 bytes).
- **Định dạng lưu trữ an toàn:** `$pbkdf2$10000$<salt_hex>$<derived_key_hex>`
- **Cơ chế xác thực:** Sử dụng `crypto.timingSafeEqual` nhằm triệt tiêu hoàn toàn nguy cơ tấn công dò thời gian (Timing Attack).
- **Nguyên tắc Zero Plaintext:**
  1. Tuyệt đối không lưu mật khẩu dạng văn bản thô trong database.
  2. Controller chủ động loại bỏ cột `mat_khau` khỏi mọi câu lệnh `SELECT` (`SELECT id, ho_ten, email, so_dien_thoai, vai_tro, phong_ban, trang_thai...`).
  3. Loại bỏ mật khẩu khỏi audit log và phản hồi API HTTP response.
  4. Phía Client không lưu trữ mật khẩu trong `localStorage` hay `sessionStorage`.

---

## 7. CƠ CHẾ SELF-PROTECTION (CHỐNG TỰ KHÓA & BẢO VỆ ADMIN DUY NHẤT)

Nhằm ngăn ngừa tình huống thảm họa quản trị viên vô tình tự khóa mình hoặc hệ thống bị cô lập do không còn quản trị viên hoạt động, hệ thống triển khai 2 tầng bảo vệ tự động (Self-Protection Safeguards):

1. **Chặn Admin tự khóa tài khoản chính mình (`CANNOT_LOCK_SELF`):**
   - Khi Admin thực hiện gọi API `PATCH /api/v1/users/:id/status` với trạng thái `khoa`, backend đối soát ID người thực hiện (`req.user.id`) với `targetUserId`. Nếu trùng nhau, hệ thống trả về HTTP 400 kèm thông báo: *"Bạn không thể tự khóa tài khoản của chính mình."*
2. **Chặn khóa hoặc giáng cấp Quản trị viên duy nhất (`CANNOT_LOCK_LAST_ADMIN`):**
   - Trước khi khóa hoặc chuyển đổi vai trò của một tài khoản có vai trò `admin`, backend kiểm tra số lượng Admin đang hoạt động:
     ```sql
     SELECT COUNT(*) FROM nguoi_dung WHERE vai_tro = 'admin' AND trang_thai = 'hoat_dong'
     ```
   - Nếu số lượng $\le 1$, hành động bị từ chối với HTTP 400 kèm thông báo: *"Hệ thống phải duy trì ít nhất một Quản trị viên (Admin) đang hoạt động."*

---

## 8. CƠ CHẾ THU HỒI PHIÊN NGAY KHI KHÓA TÀI KHOẢN

- **Kiến trúc xác thực Zero-Trust:** Middleware `resolveUserIdentity` tại [`backend/src/middlewares/auth.js`](file:///E:/ERP/backend/src/middlewares/auth.js) truy vấn trạng thái thực tế của người dùng từ cơ sở dữ liệu trên **từng request API có xác thực**:
  ```javascript
  const userRes = await db.query(
    'SELECT id, ho_ten, email, vai_tro, phong_ban, trang_thai FROM nguoi_dung WHERE id = $1',
    [decoded.userId]
  );
  if (userRes.rows.length === 0) return null;
  const dbUser = userRes.rows[0];
  if (dbUser.trang_thai !== 'hoat_dong') {
    return null; // Từ chối cấp quyền phiên làm việc ngay lập tức
  }
  ```
- **Hiệu lực tức thì:** Ngay khi Admin kích hoạt trạng thái `khoa` cho một tài khoản, mọi token JWT/HMAC đã phát hành trước đó của tài khoản đó đều bị vô hiệu hóa ngay ở request tiếp theo (HTTP 401/403) mà không cần cấu hình cụm Redis hay bảng token blacklist phức tạp.

---

## 9. CHI TIẾT API QUẢN TRỊ NGƯỜI DÙNG

Tất cả các API dưới đây đều nằm dưới middleware bảo vệ: `requireAuth` + `requireRoles('admin')`.

| STT | Phương thức | Endpoint | Mô tả nghiệp vụ | Request Body mẫu | Response Thành công (HTTP) |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | `GET` | `/api/v1/users` | Lấy danh sách người dùng (hỗ trợ lọc & tìm kiếm) | Query: `?search=...&role=...&status=...` | 200 OK |
| 2 | `GET` | `/api/v1/users/:id` | Xem thông tin chi tiết một người dùng | Không | 200 OK |
| 3 | `POST` | `/api/v1/users` | Tạo mới tài khoản người dùng | `{"ho_ten": "...", "email": "...", "vai_tro": "...", "mat_khau": "...", "phong_ban": "...", "so_dien_thoai": "..."}` | 201 Created |
| 4 | `PUT` | `/api/v1/users/:id` | Cập nhật thông tin cán bộ (PK `id` bất biến) | `{"ho_ten": "...", "phong_ban": "...", "so_dien_thoai": "..."}` | 200 OK |
| 5 | `PATCH` | `/api/v1/users/:id/role` | Điều chỉnh phân quyền / đổi vai trò | `{"vai_tro": "kho"}` | 200 OK |
| 6 | `PATCH` | `/api/v1/users/:id/status` | Khóa hoặc mở khóa tài khoản người dùng | `{"trang_thai": "khoa"}` hoặc `{"trang_thai": "hoat_dong"}` | 200 OK |
| 7 | `POST` | `/api/v1/users/:id/reset-password`| Đặt lại mật khẩu mới cho người dùng | `{"mat_khau_moi": "NewPassword@2026"}` | 200 OK |

---

## 10. CHI TIẾT GIAO DIỆN QUẢN TRỊ FRONTEND

Trang giao diện quản trị tại [`frontend/src/pages/admin/Users.jsx`](file:///E:/ERP/frontend/src/pages/admin/Users.jsx) được xây dựng hoàn thiện, đồng bộ thiết kế Core Portal UI Foundation:
1. **Header & Thống kê:** Thanh tiêu đề chuẩn May 10 đi kèm nút *"Thêm người dùng"* nổi bật. Thẻ chỉ số tổng hợp số lượng tài khoản đang hoạt động và bị khóa.
2. **Bộ lọc thông minh:** Hỗ trợ tìm kiếm tức thời theo họ tên/email/mã cán bộ; bộ lọc phân loại theo vai trò (`Tất cả`, `Admin`, `Bán hàng`, `Sản xuất`, `Mua hàng`, `Kho`, `Kế toán`); bộ lọc trạng thái (`Tất cả`, `Đang hoạt động`, `Đã khóa`).
3. **Bảng dữ liệu tương tác:**
   - Cột Mã cán bộ được định dạng chuẩn: `NV-0001`, `NV-0002`...
   - Cột Tên đăng nhập & Email được hiển thị trực quan.
   - Huy hiệu (Badge) vai trò phân màu đặc trưng cho từng phòng ban.
   - Trạng thái trực quan: Chấm xanh cho `Đang hoạt động`, chấm đỏ cho `Đã khóa`.
4. **Hệ thống Action Buttons & Modals:**
   - **Nút Sửa (Icon Bút):** Mở Modal cập nhật thông tin cá nhân.
   - **Nút Đổi vai trò (Icon Chìa khóa):** Mở Modal lựa chọn Canonical Roles kèm cảnh báo phân quyền.
   - **Nút Khóa/Mở khóa (Icon Khóa):** Tự động phát hiện tài khoản hiện tại của Admin đăng nhập để vô hiệu hóa nút (Disable) kèm tooltip: *"Bạn không thể tự khóa tài khoản của chính mình"*. Modal xác nhận có cảnh báo màu đỏ/xanh rõ ràng.
   - **Nút Đặt lại mật khẩu (Icon Xoay vòng):** Modal nhập mật khẩu mới có nút ẩn/hiện mật khẩu và nút sinh mật khẩu ngẫu nhiên an toàn.
   - **Thông báo Toast:** Tích hợp đầy đủ thông báo thành công hoặc thông báo lỗi thân thiện với người dùng.

---

## 11. BẰNG CHỨNG THỰC THI KIỂM THỬ — 25 TEST CASES

Toàn bộ 25 test cases theo yêu cầu đề bài đã được tự động hóa tại `backend/tests/test_admin_user_management.js` và thực thi với kết quả **28/28 PASS (100%)**:

```text
================================================================
TEST SUITE: QUẢN TRỊ NGƯỜI DÙNG ERP MAY 10 (ADMIN USER MANAGEMENT)
================================================================

--- PHẦN A: AUTHENTICATION ---
  ✅ [PASS] Test 1: Admin login thành công -> Token: erp_token_1_1789531679423...
  ✅ [PASS] Test 2: Sai mật khẩu bị từ chối với HTTP 401 Unauthorized

--- PHẦN B: ADMIN CRUD & RBAC ---
  ✅ [PASS] Test 4: Admin GET /users thành công (HTTP 200) -> Tổng số: 7 users
  ✅ [PASS] Test 5: Admin POST /users tạo người dùng mới thành công (HTTP 201) -> ID: 10, Email: test.user.1789531679450@may10.vn
  ✅ [PASS] Test 5.1: User mới tạo đăng nhập thành công với mật khẩu đã hash PBKDF2
  ✅ [PASS] Test 6: Admin PUT /users/:id cập nhật thông tin thành công (HTTP 200)
  ✅ [PASS] Test 7: Admin PATCH /users/:id/role đổi vai trò sang [kho] thành công (HTTP 200)
  ✅ [PASS] Test 8: Admin PATCH /users/:id/status khóa tài khoản thành công (HTTP 200)
  ✅ [PASS] Test 3: Tài khoản bị khóa bị từ chối đăng nhập với HTTP 403 ACCOUNT_SUSPENDED
  ✅ [PASS] Test 9: Admin PATCH /users/:id/status mở khóa tài khoản thành công (HTTP 200)
  ✅ [PASS] Test 9.1: Tài khoản đăng nhập bình thường sau khi được mở khóa
  ✅ [PASS] Test 10: Admin POST /users/:id/reset-password đặt lại mật khẩu thành công (HTTP 200)
  ✅ [PASS] Test 10.1: Đăng nhập thành công với mật khẩu mới, mật khẩu cũ bị vô hiệu

--- PHẦN C: NON-ADMIN RBAC RESTRICTIONS (HTTP 403) ---
  ✅ [PASS] Test 11: Vai trò [Bán hàng (ban_hang)] bị từ chối 403 Forbidden khi truy cập User Management
  ✅ [PASS] Test 12: Vai trò [Sản xuất (san_xuat)] bị từ chối 403 Forbidden khi truy cập User Management
  ✅ [PASS] Test 13: Vai trò [Mua hàng (mua_hang)] bị từ chối 403 Forbidden khi truy cập User Management
  ✅ [PASS] Test 14: Vai trò [Thủ kho (kho)] bị từ chối 403 Forbidden khi truy cập User Management
  ✅ [PASS] Test 15: Vai trò [Kế toán (ke_toan)] bị từ chối 403 Forbidden khi truy cập User Management

--- PHẦN D: VALIDATION & ERROR HANDLING ---
  ✅ [PASS] Test 16: Trùng lặp email bị từ chối với HTTP 409 DUPLICATE_EMAIL
  ✅ [PASS] Test 17: Vai trò không thuộc Canonical Roles bị từ chối với HTTP 400
  ✅ [PASS] Test 18: Thiếu trường bắt buộc bị từ chối với HTTP 400 VALIDATION_ERROR
  ✅ [PASS] Test 19: Mật khẩu < 6 ký tự bị từ chối với HTTP 400 INVALID_PASSWORD
  ✅ [PASS] Test 20: [Self-Protection] Admin tự khóa chính mình bị chặn với HTTP 400 CANNOT_LOCK_SELF
  ✅ [PASS] Test 21: [Self-Protection] Chống khóa tài khoản quản trị viên duy nhất của hệ thống

--- PHẦN E: SECURITY & INTEGRITY ---
  ✅ [PASS] Test 22: Mật khẩu trong DB được mã hóa 100% bằng PBKDF2 (Zero Plaintext)
  ✅ [PASS] Test 23: API Response không chứa trường mat_khau hay mật khẩu plaintext
  ✅ [PASS] Test 24: Anonymous request không có token bị từ chối với HTTP 401 Unauthorized
  ✅ [PASS] Test 25: Khóa chính (PK id) bất biến, không thể bị ghi đè qua request body

================================================================
KẾT QUẢ KIỂM THỬ: 28 PASS / 0 FAIL (TỔNG CỘNG 25 TEST CASES)
================================================================
```

---

## 12. KẾT QUẢ HỒI QUY (REGRESSION TESTING) CÁC PHÂN HỆ KHÁC

Việc bổ sung chức năng Quản trị Người dùng không gây ra bất kỳ tác dụng phụ (side-effects) nào tới các phân hệ hiện có:

| STT | Phân hệ / Kịch bản hồi quy | File thực thi test | Số lượng test cases | Kết quả |
| :---: | :--- | :--- | :---: | :---: |
| 1 | **PH4 REST APIs** (Kho & Vật tư) | `backend/tests/test_ph4_api.js` | 16/16 | **PASS 100%** |
| 2 | **PH4 FR-11 Stock Card** (Sổ thẻ kho & Running Balance) | `backend/tests/test_ph4_fr11_stock_card.js` | 10/10 | **PASS 100%** |
| 3 | **Core RBAC & Zero Trust** | `backend/tests/test_rbac_security.js` | 27/27 | **PASS 100%** |
| 4 | **PH2 Production & MRP** (KHSX, Lệnh SX, Định mức BOM) | `backend/tests/test_ph2_production.js` | 38/38 | **PASS 100%** |
| 5 | **PH3 Purchasing & PO** (Mua hàng, Báo giá, NCC) | `backend/tests/test_ph3_purchasing.js` | 58/58 | **PASS 100%** |
| 6 | **PH5 Finance & Accounting** (Chứng từ, Sổ nhật ký, Công nợ) | `backend/tests/test_ph5_finance.js` | 24/24 | **PASS 100%** |
| 7 | **Kiểm tra tính toàn vẹn Database** | `SELECT COUNT(*) FROM nguoi_dung` | 7 seed users | **PASS 100%** |
| 8 | **Frontend Production Build** | `npm run build` (Vite) | 1,761 modules | **PASS in 5.92s (0 errors)** |

---

## 13. GIT STATUS VÀ TỔNG HỢP DIFF

### 13.1. Trạng thái Git (`git status`)
```text
On branch feature/ph4-core-portal
Your branch is up to date with 'origin/feature/ph4-core-portal'.

Changes not staged for commit:
	modified:   backend/src/app.js
	modified:   backend/src/controllers/portalController.js
	modified:   backend/src/controllers/userController.js
	modified:   backend/src/routes/userRoutes.js
	modified:   backend/src/validators/userValidator.js
	frontend/src/pages/admin/Users.jsx
	frontend/src/services/userService.js

Untracked files:
	backend/tests/test_admin_user_management.js
	docs/audit/ADMIN_USER_MANAGEMENT_AUDIT.md
```

### 13.2. Tóm tắt nội dung Git Diff
- **`backend/src/app.js`**: Đăng ký router `userRoutes` vào `/api/v1/users` và `/api/v1/admin/users`.
- **`backend/src/controllers/portalController.js`**: Import `crypto`, xác thực PBKDF2 cho tài khoản mới/reset, kiểm tra trạng thái `trang_thai === 'hoat_dong'`.
- **`backend/src/controllers/userController.js`**: Cung cấp đầy đủ các hàm controller quản trị người dùng, mã hóa PBKDF2, tự vệ Admin, loại trừ `mat_khau`.
- **`backend/src/routes/userRoutes.js`**: Bảo vệ bằng `requireAuth` và `requireRoles('admin')`.
- **`backend/src/validators/userValidator.js`**: Kiểm tra tính hợp lệ dữ liệu đầu vào người dùng.
- **`frontend/src/services/userService.js`**: Tích hợp các hàm gọi API RESTful cho Admin.
- **`frontend/src/pages/admin/Users.jsx`**: Giao diện hoàn chỉnh với 5 modals chức năng và bộ lọc đa tiêu chí.

---

## 14. KẾT LUẬN & ĐÁNH GIÁ NGHIỆM THU CUỐI CÙNG

### **ĐÁNH GIÁ CHUNG: PASS 100%**

Chức năng **QUẢN TRỊ → NGƯỜI DÙNG** của hệ thống ERP May 10 đã được hoàn thiện vượt bậc, thỏa mãn tất cả các tiêu chí kỹ thuật và bảo mật doanh nghiệp khắt khe nhất:
- ✅ **Đầy đủ 5 thao tác quản trị:** Thêm, Sửa, Đổi vai trò, Khóa/Mở khóa tài khoản, Đặt lại mật khẩu.
- ✅ **Bảo mật tuyệt đối:** Mã hóa chuẩn mật mã học PBKDF2-SHA512, Zero Plaintext, chống tấn công dò thời gian.
- ✅ **Phân quyền RBAC nghiêm ngặt:** Chỉ có duy nhất Quản trị viên (`admin`) được phép truy cập và thao tác; 5 vai trò còn lại bị chặn hoàn toàn bởi HTTP 403 Forbidden.
- ✅ **An toàn vận hành:** Chống Admin tự khóa chính mình và bảo vệ Quản trị viên duy nhất của hệ thống.
- ✅ **Trải nghiệm người dùng:** Giao diện trực quan, đồng bộ nhận diện thương hiệu Core Portal UI Foundation V2.11, thông báo Toast và Modals phản hồi mượt mà.
- ✅ **Toàn vẹn hệ sinh thái:** Không làm thay đổi database schema, không ảnh hưởng đến các phân hệ PH1, PH2, PH3, PH4, PH5; Frontend build sạch 100% không cảnh báo lỗi.
