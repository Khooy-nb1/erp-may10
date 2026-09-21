# BÁO CÁO KIỂM TOÁN NGUYÊN NHÂN GỐC RỄ: ĐĂNG NHẬP THỦ CÔNG VS ĐĂNG NHẬP NHANH
## CỔNG QUẢN TRỊ DOANH NGHIỆP HỢP NHẤT ERP MAY 10 — CORE PORTAL
- **Mã tài liệu:** `ERP-MAY10-LOGIN-AUDIT-01`
- **Môi trường:** `E:\ERP` (Branch: `feature/ph4-core-portal`)
- **Chế độ kiểm toán:** READ-ONLY / STRICT NON-MODIFYING (Không sửa code, không đổi DB, không restart server)
- **Ngày thực hiện:** 15/09/2026

---

## 1. TÓM TẮT ĐIỀU HÀNH & BẢN CHẤT LỖI (EXECUTIVE SUMMARY)

### Hiện tượng phản ánh:
- Bấm **"Đăng nhập nhanh"** (Dev Quick Login) → Đăng nhập thành công, vào thẳng hệ thống.
- Nhập thủ công: `email = ketoan@may10.vn`, `password = Admin@123` → Giao diện hiển thị banner lỗi đỏ:
  `"connect ECONNREFUSED 127.0.0.1:5432"`.
- Trong khi đó, kiểm thử độc lập qua PowerShell/cURL/HTTP direct request gửi:
  `POST http://localhost:5000/api/v1/auth/login` với body `{"email":"ketoan@may10.vn","password":"Admin@123"}` trả về:
  `HTTP 200 OK`, `success: true`, nhận `erp_token` và vai trò `[KE_TOAN]` hoàn hảo.

### Bản chất thực sự được phát hiện qua Audit:
1. **POST `/api/v1/auth/login` hoàn toàn KHÔNG bị lỗi kết nối Database**: Tại thời điểm hiện tại, PostgreSQL đang chạy và xử lý API login đạt `HTTP 200` 100%.
2. **Không có cơ chế kiểm tra mật khẩu (Password Verification)** trong controller login: Backend `portalController.js` chỉ thực hiện tra cứu `SELECT ... FROM nguoi_dung WHERE email = $1...` và cấp token ngay khi tài khoản tồn tại và đang hoạt động (`trang_thai = 'hoat_dong'`). Mọi mật khẩu gửi lên đều được chấp nhận.
3. **Tại sao lại có lỗi `"connect ECONNREFUSED 127.0.0.1:5432"` trên UI?**
   - Lỗi này xuất phát từ **chuỗi xử lý lỗi không đồng nhất giữa 2 luồng**:
     - Khi chạy trên Windows và PostgreSQL nằm trong WSL, cơ chế resolve host trong `database.js` (`isPortOpenSync`) bị lỗi cú pháp lệnh con khi chạy qua `cmd.exe`, khiến hàm fallback về IP WSL hoặc `127.0.0.1`.
     - Nếu tại một thời điểm nào đó PostgreSQL chưa kịp khởi động hoặc kết nối tới `127.0.0.1:5432` bị từ chối, `pg.Pool` ném lỗi `Error: connect ECONNREFUSED 127.0.0.1:5432`.
     - Backend bắt lỗi tại `errorHandler.js` và trả về JSON:
       ```json
       {
         "success": false,
         "errorCode": "INTERNAL_SERVER_ERROR",
         "message": "connect ECONNREFUSED 127.0.0.1:5432"
       }
       ```
     - Trên Frontend, `authService.login()` qua Axios nhận response lỗi và ném ra cho `Login.jsx` (dòng 60):
       `setError(err.response?.data?.message || err.message)`
       → Giao diện hiển thị trực tiếp thông điệp lỗi kỹ thuật của Database!
     - Trong khi đó, luồng **"Đăng nhập nhanh" (`switchRole`)** trong `authService.js` (dòng 98–109) lại có một **khối Fallback ngầm (Fallback Mock User)**. Khi backend trả về lỗi kết nối, `switchRole` âm thầm nuốt lỗi và trả về `fallbackUser`, khiến người dùng lầm tưởng Đăng nhập nhanh luôn thành công kể cả khi database gặp sự cố.

---

## 2. KIỂM TOÁN CHI TIẾT FRONTEND LOGIN

- **Tệp tin giao diện:** `frontend/src/pages/Login.jsx`
- **State quản lý form:**
  - `email`: Ban đầu khởi tạo `admin@may10.com.vn` (dòng 41).
  - `password`: Khởi tạo `password123` (dòng 42).
  - Input được kiểm soát (controlled input) với `onChange={(e) => setEmail(e.target.value)}`. Không có hiện tượng stale state hay autofill bug.
- **Hàm xử lý submit:** `handleSubmit` (dòng 51–64):
  ```javascript
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };
  ```
- **Service thực thi:** `frontend/src/services/authService.js` → hàm `login(email, password)` (dòng 14–29):
  - Gọi qua Axios client: `api.post('/auth/login', { email, password })`.
  - Base URL của `api.js`: `/api/v1` (dòng 4).
  - Endpoint thực tế gửi đi: `POST /api/v1/auth/login`.
  - Headers: `Content-Type: application/json`.
  - Interceptor: Tự động đính kèm `Authorization: Bearer <erp_token>`, `x-role`, `x-user-id` nếu đã có trong `localStorage`.
- **Xử lý lưu trữ Token:**
  - Khi thành công: Lưu `erp_token`, `erp_user`, `erp_role`, `erp_user_id` vào `localStorage`.

---

## 3. KIỂM TOÁN CHI TIẾT BACKEND LOGIN

- **Route định tuyến:** `backend/src/routes/portalRoutes.js` (dòng 8):
  `router.post('/auth/login', portalController.login);`
- **Controller xử lý:** `backend/src/controllers/portalController.js` → `login(req, res, next)` (dòng 67–136).
- **Câu lệnh truy vấn tìm người dùng:**
  ```sql
  SELECT id, ho_ten, email, vai_tro, phong_ban, trang_thai 
  FROM nguoi_dung 
  WHERE email = $1 OR email = $2 OR email = $3
  ```
  Tham số: `[cleanEmail, username@may10.vn, username@may10.com.vn]`.
- **Kiểm tra Password Hash:**
  - **HOÀN TOÀN KHÔNG CÓ!**
  - Cột `mat_khau` có tồn tại trong bảng `nguoi_dung` nhưng controller `portalController.js` **không hề đối chiếu trường `mat_khau`**, không sử dụng `bcrypt.compare` hay bất kỳ hàm băm nào.
  - Khi email tồn tại và `trang_thai === 'hoat_dong'`, server ký cấp ngay `erp_token` bằng hàm `signToken(user.id)`.
- **Định dạng lỗi phản hồi khi lỗi DB:**
  - Khi database gặp lỗi kết nối, `next(err)` chuyển quyền cho `errorHandler.js` (dòng 8–13), trả về mã `500 Internal Server Error` với `message: err.message`.

---

## 4. KIỂM TOÁN DATABASE & TÀI KHOẢN

Kiểm tra trực tiếp bảng `nguoi_dung` trong database `erp_may10` (PostgreSQL 18.6):
- Tổng cộng 7 tài khoản cán bộ chủ chốt:
  1. `admin@may10.vn` — vai trò: `admin` — trạng thái: `hoat_dong`
  2. `banhang@may10.vn` — vai trò: `ban_hang` — trạng thái: `hoat_dong`
  3. `sanxuat@may10.vn` — vai trò: `san_xuat` — trạng thái: `hoat_dong`
  4. `muahang@may10.vn` — vai trò: `mua_hang` — trạng thái: `hoat_dong`
  5. `kho@may10.vn` — vai trò: `kho` — trạng thái: `hoat_dong`
  6. `ketoan@may10.vn` — vai trò: `ke_toan` — trạng thái: `hoat_dong` (Tài khoản thử nghiệm)
  7. `ketoantruong@may10.vn` — vai trò: `ke_toan_truong` — trạng thái: `hoat_dong`
- Tài khoản `ketoan@may10.vn` hoàn toàn hợp lệ và đang hoạt động.

---

## 5. BẢNG SO SÁNH TOÀN DIỆN: ĐĂNG NHẬP NHANH VS NHẬP THỦ CÔNG

| Thành Phần | Đăng Nhập Nhanh (`handleQuickLogin`) | Nhập Thủ Công (`handleSubmit`) |
| :--- | :--- | :--- |
| **Frontend Function** | `handleQuickLogin(acc)` trong `Login.jsx` | `handleSubmit(e)` trong `Login.jsx` |
| **Service gọi đến** | `authService.switchRole(acc.code)` | `authService.login(email, password)` |
| **Phương thức mạng** | Đồng bộ bằng `XMLHttpRequest` (XHR synchronous) | Bất đồng bộ bằng `axios.post()` (Promise) |
| **API URL** | `/api/v1/auth/login` | `/api/v1/auth/login` (qua proxy Vite `5173 -> 5000`) |
| **HTTP Method** | `POST` | `POST` |
| **Payload** | `{"email": "ketoan@may10.vn", "password": "password"}` | `{"email": "ketoan@may10.vn", "password": "Admin@123"}` |
| **Xử lý khi HTTP 200** | Lưu token HMAC, user, role vào `localStorage`, điều hướng | Lưu token HMAC, user, role vào `localStorage`, điều hướng |
| **Xử lý khi Backend Lỗi (500/DB Error)** | **CÓ FALLBACK DỰ PHÒNG** (dòng 98–109): Tự tạo user object cục bộ, nuốt lỗi, **đăng nhập thành công giả lập** | **KHÔNG CÓ FALLBACK**: Ném lỗi ra ngoài, bắt tại `catch(err)` và hiển thị thông báo lỗi lên màn hình |
| **Hiển thị lỗi trên UI** | Không bao giờ hiển thị lỗi (luôn coi như thành công) | Hiển thị chính xác chuỗi lỗi: `connect ECONNREFUSED 127.0.0.1:5432` |

---

## 6. NGUYÊN NHÂN GỐC RỄ CỦA LỖI "ECONNREFUSED 127.0.0.1:5432"

1. **Bug trong cơ chế dò cổng tự động `isPortOpenSync` của `backend/src/config/database.js`**:
   - Dòng 14 của `database.js`:
     ```javascript
     const out = execSync(`node -e "${inline}"`, ...);
     ```
   - Biến `inline` chứa dấu ngoặc kép `"` (`net.createConnection(${port}, "${host}", ...)`).
   - Trên môi trường Windows (PowerShell/cmd), việc gọi `node -e "..."` lồng các dấu ngoặc kép không escape dẫn đến lỗi cú pháp: `SyntaxError: missing ) after argument list`.
   - Kết quả: `isPortOpenSync` **luôn luôn trả về `false`** đối với mọi IP, kể cả khi cổng 5432 đang mở hoàn toàn!
2. **Hệ quả của việc `isPortOpenSync` luôn trả về `false`**:
   - Bước 3a: `isPortOpenSync('127.0.0.1', 5432)` → trả về `false`.
   - Bước 3b: `isPortOpenSync(wslIp, 5432)` → trả về `false`.
   - Bước 3c: `isPortOpenSync(envHost, 5432)` → trả về `false`.
   - Hàm rơi xuống bước 4 (Fallback cuối cùng):
     `return envHost || '127.0.0.1'` → Trả về `127.0.0.1` hoặc IP từ `.env`.
   - Nếu trong một số ngữ cảnh Windows WSL2 không bật chế độ localhostForwarding, việc kết nối tới `127.0.0.1:5432` từ Windows sẽ bị từ chối (`ECONNREFUSED`), trong khi nếu kết nối trực tiếp qua `WSL IP` thì thành công.
3. **Tại sao Đăng nhập nhanh vẫn chạy được?**
   - Khi `switchRole` gọi XHR gặp lỗi `ECONNREFUSED`, khối `catch(err)` bắt lỗi và rơi xuống bước 2 (Fallback mock user). Giao diện vẫn tiếp tục chuyển hướng vào trong hệ thống như bình thường.
   - Nhập thủ công không có cơ chế fallback này nên toàn bộ thông điệp lỗi của PostgreSQL bị bắn thẳng ra form đăng nhập.

---

## 7. PHÂN LOẠI ROOT CAUSE

Theo danh mục phân loại yêu cầu:
- **Phân loại chính:** **4. DATABASE CONNECTION BUG & DUAL-FLOW ASYMMETRY (G & F)**
  - **G. Backend Infrastructure:** Lỗi thoát chuỗi trong hàm `isPortOpenSync` (`database.js:14`) khiến cơ chế tự động dò tìm IP WSL của PostgreSQL bị vô hiệu hóa, dẫn tới fallback sai về `127.0.0.1` khi localhostForwarding không sẵn sàng.
  - **F. Quick Login bypass khác flow:** `switchRole` sở hữu khối Fallback ngầm nuốt lỗi và tự sinh mock user, trong khi `login` thủ công tuân thủ nghiêm ngặt phản hồi từ Backend.

---

## 8. THÔNG TIN CHI TIẾT ĐỊNH VỊ LỖI (EXACT LOCATIONS)

1. **Vị trí lỗi dò tìm Database:**
   - **File:** `backend/src/config/database.js`
   - **Function:** `isPortOpenSync(host, port, timeoutMs)`
   - **Line:** 6–22
   - **Chi tiết:** Dấu ngoặc kép bên trong lệnh `execSync` bị lỗi cú pháp shell Windows, làm `isPortOpenSync` luôn trả về `false`.
2. **Vị trí bất đối xứng giữa Đăng nhập nhanh và Đăng nhập thủ công:**
   - **File:** `frontend/src/services/authService.js`
   - **Function:** `switchRole(roleCode)`
   - **Line:** 98–109
   - **Chi tiết:** Chứa fallback mock user, âm thầm bỏ qua lỗi kết nối máy chủ.
3. **Vị trí hiển thị lỗi lên UI:**
   - **File:** `frontend/src/pages/Login.jsx`
   - **Function:** `handleSubmit`
   - **Line:** 60
   - **Chi tiết:** Hiển thị trực tiếp `err.response?.data?.message` khiến thông báo lỗi tầng hạ tầng database bị lộ ra giao diện người dùng.

---

## 9. HƯỚNG SỬA TỐI THIỂU ĐỀ XUẤT (PROPOSED MINIMAL FIXES - CHỈ ĐỀ XUẤT, KHÔNG THỰC HIỆN)

1. **Sửa `isPortOpenSync` trong `backend/src/config/database.js`**:
   - Tránh gọi `execSync` với chuỗi inline phức tạp dễ bị xung đột dấu ngoặc kép trên Windows. Thay vào đó, sử dụng script con hoặc sử dụng cơ chế socket thuần với `child_process.spawnSync`.
   - Hoặc gán trực tiếp biến môi trường `DB_HOST=<wsl_ip>` chuẩn xác vào `.env` nếu môi trường WSL2 không thông suốt qua `127.0.0.1`.
2. **Loại bỏ khối Fallback giả lập trong `switchRole`**:
   - Đồng bộ hóa logic xử lý lỗi giữa `switchRole` và `login`: Nếu Backend gặp sự cố kết nối, cả hai luồng đều phải hiển thị thông báo lỗi rõ ràng, tránh hiện tượng "đăng nhập nhanh thì được, nhập thủ công thì hỏng".
3. **Chuẩn hóa thông điệp lỗi thân thiện trên Login Form**:
   - Tại `Login.jsx`, nếu nhận lỗi `ECONNREFUSED` từ backend, nên hiển thị: *"Hệ thống máy chủ dữ liệu đang bận hoặc tạm thời gián đoạn kết nối. Vui lòng liên hệ quản trị viên."* thay vì hiển thị trực tiếp chuỗi kỹ thuật `connect ECONNREFUSED 127.0.0.1:5432`.
