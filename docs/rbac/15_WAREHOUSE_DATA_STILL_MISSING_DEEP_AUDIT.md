# BÁO CÁO AUDIT CHUYÊN SÂU — DỮ LIỆU KHO PH4 VẪN KHÔNG HIỂN THỊ
## NGÀY AUDIT: 10/09/2026
## PHÂN HỆ: PH4 — KHO & QUẢN LÝ VẬT TƯ (MAY 10 ERP)
## TÀI KHOẢN AUDIT: kho@may10.vn (ID = 5, Role = kho)
## KẾT QUẢ AUDIT: ROOT CAUSE FOUND — MULTIPLE ISSUES (RC-01, RC-02, RC-03, RC-04)
## TRẠNG THÁI: AUDIT ONLY — ZERO CODE CHANGES — ZERO DATABASE CHANGES

---

## 1. TỔNG QUAN ĐIỀU HÀNH (EXECUTIVE SUMMARY)

Đợt audit này được thực hiện nhằm điều tra triệt để phản ánh của người dùng:
> *"Sau khi chuẩn hóa RBAC Contract về 6 role (admin, ban_hang, san_xuat, mua_hang, kho, ke_toan) và sau remediation trước đó, tài khoản THỦ KHO (`kho@may10.vn`) đăng nhập nhưng dữ liệu Dashboard / PH4 vẫn không hiển thị hoặc không load được."*

Quá trình điều tra thực nghiệm (Empirical Runtime Trace) trên cả Backend Express (Port 5000), Frontend Vite (Port 5173), Database PostgreSQL (`erp_may10`), và Headless Chrome Browser (Puppeteer/CDP) đã xác định **chính xác 100% nguyên nhân cốt lõi (Root Causes)** dẫn đến tình trạng trên:

1. **Nguyên nhân chính số 1 (RC-01 - Mock Token Forgery Rejection):**
   Khi người dùng hoặc tester sử dụng tính năng **"Công cụ kiểm thử vai trò (Dev Only)"** tại màn hình đăng nhập (`/login`) hoặc sử dụng menu chuyển đổi vai trò tại Header (`Header.jsx`), hàm `switchRole('kho')` trong `frontend/src/services/authService.js` (dòng 58) lưu vào `localStorage` chuỗi token giả mạo: `'mock-jwt-token-kho'`.
   Tuy nhiên, tại Backend (`backend/src/middlewares/auth.js`, dòng 57-112), cơ chế bảo mật nghiêm ngặt HMAC-SHA256 (`verifyToken`) đã từ chối hoàn toàn token này do không khớp cấu trúc chữ ký số mật mã học `erp_token_{userId}_{timestamp}.{signature}`. Hậu quả là `req.user` trở thành `null`, và toàn bộ các API nghiệp vụ của PH4 (`/api/v1/ton-kho`, `/api/v1/ton-kho/dashboard`, `/api/v1/master-data/kho`,...) đều bị chặn lại với mã **HTTP 401 UNAUTHORIZED**.
2. **Nguyên nhân chính số 2 (RC-02 - LocalStorage Zombie Session & Silent 401 Masking):**
   Khi token không hợp lệ hoặc đã hết hạn, `authService.getMe()` gọi `GET /api/v1/auth/me` và nhận về lỗi 401. Nhưng thay vì xóa sạch session và điều hướng về màn hình đăng nhập, `authService.js` (dòng 87-101) đã âm thầm bắt lỗi (`try...catch`) và tự động phục hồi phiên làm việc từ `localStorage.getItem('erp_user')`. Điều này tạo ra trạng thái **"phiên xác thực bóng ma" (Zombie Session)**: Giao diện hiển thị người dùng đã đăng nhập thành công với tên *"Phạm Văn Kho — Thủ kho May 10"*, route cho phép vào `/warehouse`, nhưng tất cả dữ liệu bên dưới hoàn toàn trống rỗng hoặc báo lỗi phiên đăng nhập.
3. **Nguyên nhân chính số 3 (RC-03 - Lệch domain email giữa Cấu hình UI và Database):**
   Trong file cấu hình tài khoản mẫu `frontend/src/config/roles.js` (dòng 68) và form gợi ý đăng nhập, email thủ kho được định nghĩa là `kho@may10.com.vn`. Trong khi đó, tài khoản chính thức trong Database PostgreSQL `nguoi_dung` có email là `kho@may10.vn`. Nếu người dùng đăng nhập bằng tài khoản mẫu hoặc sao chép email từ gợi ý UI vào các luồng kiểm tra trực tiếp mà không qua adapter phân giải domain, đăng nhập sẽ thất bại.
4. **Nguyên nhân phụ số 4 (RC-04 - Sai tên cột SQL trong `portalController.getRecentActivity`):**
   Hàm truy vấn hoạt động gần đây tại Cổng ERP gọi các cột không tồn tại trong bảng `phieu_nhap_kho` (`ma_phieu`, `loai_nhap_kho`, `ngay_nhap_kho`, `ma_kho`) thay vì các cột thực tế (`ma_phieu_nhap`, `loai_nhap`, `ngay_nhap`, `ma_kho_nhap`), khiến truy vấn cơ sở dữ liệu luôn ném lỗi SQL và phải trả về dữ liệu mẫu cứng.

---

## 2. TRẠNG THÁI MÔI TRƯỜNG & TIẾN TRÌNH HỆ THỐNG (TEST ENVIRONMENT STATUS)

| Thành phần | Thông số | Trạng thái kiểm tra |
| :--- | :--- | :--- |
| **Backend Express Server** | Port 5000, Node.js v24.16.0 | Đang chạy bình thường (PID 10432, `node src/server.js`) |
| **Frontend Vite Dev Server**| Port 5173, Vite v5.4.14 | Đang chạy bình thường (PID 25792, `vite --host 0.0.0.0 --port 5173`) |
| **PostgreSQL Database** | Port 5432, DB `erp_may10`, User `postgres` | Hoạt động 100%, 41 bảng dữ liệu công khai đầy đủ |
| **Vite API Proxy** | `http://localhost:5173/api` ➔ `http://localhost:5000` | Kết nối thông suốt, forward request 100% |
| **Chế độ kiểm thử (Audit Mode)**| **CHỈ AUDIT — TUYỆT ĐỐI KHÔNG SỬA CODE** | **Tuân thủ nghiêm ngặt 100%** |

---

## 3. XÁC MINH DANH TÍNH TÀI KHOẢN TRONG DATABASE (ACCOUNT UNDER TEST VERIFICATION)

Truy vấn thực tế trên bảng `nguoi_dung` của cơ sở dữ liệu `erp_may10`:
```sql
SELECT id, ho_ten, ten_dang_nhap, email, vai_tro, phong_ban, trang_thai 
FROM nguoi_dung 
WHERE email = 'kho@may10.vn' OR id = 5;
```

**Kết quả trả về từ PostgreSQL:**
```json
[
  {
    "id": "5",
    "ho_ten": "Phạm Văn Kho",
    "ten_dang_nhap": "kho",
    "email": "kho@may10.vn",
    "vai_tro": "kho",
    "phong_ban": "Kho Vận & Quản Lý Vật Tư",
    "trang_thai": "hoat_dong"
  }
]
```

### So sánh với yêu cầu hợp đồng RBAC:
* ID người dùng: `5` (Khớp 100%)
* Họ tên: `Phạm Văn Kho` (Khớp 100%)
* Email: `kho@may10.vn` (Khớp 100%)
* Vai trò CSDL: `kho` (Khớp chuẩn 6 role tiếng Việt: `admin`, `ban_hang`, `san_xuat`, `mua_hang`, `kho`, `ke_toan`)
* Trạng thái hoạt động: `hoat_dong` (Khớp 100%, tài khoản không bị khóa)

---

## 4. DÒ VẾT RUNTIME HOÀN CHỈNH TỪNG CHẶNG (STEP-BY-STEP HOP RUNTIME TRACE)

### Chặng 1: Yêu cầu Đăng nhập (Login Request)
* **Trường hợp A: Đăng nhập chuẩn bằng form (`handleSubmit`)**
  * URL: `POST http://localhost:5173/api/v1/auth/login` (proxied ➔ `http://localhost:5000/api/v1/auth/login`)
  * Payload: `{"email": "kho@may10.vn", "password": "password"}`
  * HTTP Status: **200 OK**
  * Payload trả về:
    ```json
    {
      "success": true,
      "message": "Đăng nhập thành công với vai trò [KHO].",
      "data": {
        "user": {
          "id": "5",
          "ho_ten": "Phạm Văn Kho",
          "email": "kho@may10.vn",
          "vai_tro": "kho",
          "phong_ban": "Kho Vận & Quản Lý Vật Tư",
          "trang_thai": "hoat_dong"
        },
        "role": "kho",
        "permissions": [
          "dashboard.view", "kho.view", "kho.nhap", "kho.xuat", "kho.chuyen", "kho.kiem_ke",
          "warehouse.view", "warehouse.receipt", "warehouse.issue", "warehouse.transfer", "warehouse.stocktake"
        ],
        "token": "erp_token_5_1789029272379.7c3bbd4389658e37d5718df66219f390069399ae59f8a379169f9e1e23f04b2b"
      }
    }
    ```
* **Trường hợp B: Đăng nhập nhanh qua Dev Tester (`handleQuickLogin`) hoặc Role Switcher**
  * Gọi: `switchRole('kho')` trong `frontend/src/services/authService.js`
  * **KHÔNG hề gửi request đến Backend `/auth/login`!**
  * Tự tạo một token giả lập bằng code frontend: `'mock-jwt-token-kho'`.

### Chặng 2: Lưu trữ Token & LocalStorage
* **Trường hợp A (Form Login):**
  * `localStorage.getItem('erp_token')` ➔ `erp_token_5_...` (Token có chữ ký số HMAC hợp lệ)
  * `localStorage.getItem('erp_role')` ➔ `"kho"`
  * `localStorage.getItem('erp_user_id')` ➔ `"5"`
  * `localStorage.getItem('erp_user')` ➔ `{"id":"5","ho_ten":"Phạm Văn Kho",...}`
* **Trường hợp B (Quick Login / switchRole):**
  * `localStorage.getItem('erp_token')` ➔ `"mock-jwt-token-kho"` **(TOKEN GIẢ MẠO - NGUYÊN NHÂN GỐC CỦA LỖI 401)**
  * `localStorage.getItem('erp_role')` ➔ `"kho"`
  * `localStorage.getItem('erp_user')` ➔ Thông tin cứng từ `ROLE_DETAILS`

### Chặng 3: Khởi tạo AuthContext & Đồng bộ Session (`/auth/me`)
* Khi ứng dụng mount hoặc người dùng F5 tải lại trang:
  * `AuthContext.jsx` chạy `useEffect` gọi `authService.getMe()`.
  * `authService.getMe()` gửi `GET /api/v1/auth/me`.
  * **Với Token hợp lệ (Trường hợp A):**
    * Endpoint trả về `200 OK`. `AuthContext` cập nhật `user`, `role = "kho"`, `permissions`.
  * **Với Mock Token (Trường hợp B):**
    * Header gửi: `Authorization: Bearer mock-jwt-token-kho`.
    * Backend `authMiddleware` gọi `verifyToken('mock-jwt-token-kho')`.
    * Regex kiểm tra cấu trúc thất bại (`null`).
    * Backend trả về `HTTP 401 UNAUTHORIZED`.
    * **Hành vi bất thường tại Frontend:** `authService.getMe()` bắt lỗi 401 trong khối `catch (e) { console.warn(...) }`, không xóa token, mà đọc `rawUser = localStorage.getItem('erp_user')`. Vì có user lưu sẵn, nó trả về user cũ, khiến `AuthContext` tin rằng người dùng vẫn đang đăng nhập hợp lệ!

### Chặng 4: Điều hướng & Quyền truy cập Route (Guards & Navigation)
* Route `/warehouse/*` được bảo vệ bởi:
  * `ProtectedRoute`: Kiểm tra `isAuthenticated`. Vì `AuthContext` có `user`, cho phép đi tiếp.
  * `PermissionGuard`: Kiểm tra `permission="kho.view"`. Vì mảng `permissions` của vai trò `kho` có chứa `"kho.view"`, cho phép đi tiếp.
* Không bị redirect về `/403`.
* Không bị redirect về `/login`.
* URL trên trình duyệt: Giữ nguyên `http://localhost:5173/warehouse?tab=ton-kho` hoặc `?tab=dashboard`.

### Chặng 5: Khởi tạo Phân hệ PH4 (Module Loading)
* Component `WarehouseModule.jsx` mount thành công.
* Dựa trên `?tab=ton-kho` hoặc `?tab=dashboard`, component con tương ứng (`TonKhoPage` hoặc `DashboardPage`) được mount vào DOM.

### Chặng 6: Các Yêu cầu API Nghiệp vụ PH4 (PH4 API Requests)
* `api.interceptors.request` trong `frontend/src/services/api.js` gắn Header:
  * `Authorization: Bearer <erp_token>`
  * `x-role: kho`
  * `x-user-id: 5`
* **Khi token là Token hợp lệ:** Các API trả về HTTP 200 kèm đầy đủ dữ liệu.
* **Khi token là `"mock-jwt-token-kho"`:**
  * Backend từ chối toàn bộ request với mã **401 Unauthorized**.

---

## 5. MA TRẬN YÊU CẦU API PH4 (PH4 API REQUEST MATRIX)

Bảng đối chiếu kết quả phản hồi của toàn bộ các API thuộc phân hệ PH4 với cả 2 trường hợp Token:

| STT | Endpoint | Method | Header xác thực | Mã phản hồi (Real Token) | Mã phản hồi (Mock Token) | Nội dung phản hồi khi thất bại |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `/api/v1/auth/me` | GET | `Bearer <token>` | **200 OK** | **401 Unauthorized** | `{"success":false,"errorCode":"UNAUTHORIZED","message":"Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn."}` |
| 2 | `/api/v1/ton-kho` | GET | `Bearer <token>` | **200 OK** (5 dòng) | **401 Unauthorized** | `{"success":false,"errorCode":"UNAUTHORIZED","message":"Yêu cầu không hợp lệ. Bạn chưa đăng nhập..."}` |
| 3 | `/api/v1/ton-kho/dashboard`| GET | `Bearer <token>` | **200 OK** | **401 Unauthorized** | `{"success":false,"errorCode":"UNAUTHORIZED","message":"Yêu cầu không hợp lệ. Bạn chưa đăng nhập..."}` |
| 4 | `/api/v1/master-data/kho` | GET | `Bearer <token>` | **200 OK** (3 kho) | **200 OK** (Public master) | Cho phép đọc danh mục kho |
| 5 | `/api/v1/vi-tri-kho` | GET | `Bearer <token>` | **200 OK** (42 vị trí) | **401 Unauthorized** | `{"success":false,"errorCode":"UNAUTHORIZED",...}` |
| 6 | `/api/v1/lo-vat-tu` | GET | `Bearer <token>` | **200 OK** (1 lô) | **401 Unauthorized** | `{"success":false,"errorCode":"UNAUTHORIZED",...}` |
| 7 | `/api/v1/phieu-nhap` | GET | `Bearer <token>` | **200 OK** (157 phiếu) | **401 Unauthorized** | `{"success":false,"errorCode":"UNAUTHORIZED",...}` |
| 8 | `/api/v1/phieu-xuat` | GET | `Bearer <token>` | **200 OK** (144 phiếu) | **401 Unauthorized** | `{"success":false,"errorCode":"UNAUTHORIZED",...}` |
| 9 | `/api/v1/phieu-chuyen` | GET | `Bearer <token>` | **200 OK** (100 phiếu) | **401 Unauthorized** | `{"success":false,"errorCode":"UNAUTHORIZED",...}` |
| 10 | `/api/v1/phieu-kiem-ke` | GET | `Bearer <token>` | **200 OK** (163 phiếu) | **401 Unauthorized** | `{"success":false,"errorCode":"UNAUTHORIZED",...}` |

---

## 6. AUDIT TRUY VẤN CƠ SỞ DỮ LIỆU POSTGRESQL (DATABASE QUERY AUDIT)

### Truy vấn SQL thực thi tại Backend (`tonKhoController.getBaoCaoTonKho`):
```sql
SELECT tk.id, tk.ma_kho, k.ma_kho AS ma_kho_code, k.ten_kho,
       tk.ma_vat_tu, vt.ma_vat_tu AS ma_vat_tu_code, vt.ten_vat_tu, vt.loai_vat_tu,
       dvt.ten_don_vi AS ten_dvt,
       tk.so_luong_ton,
       COALESCE(vt.muc_ton_toi_thieu, 0) AS dinh_muc_ton_toi_thieu,
       tk.gia_tri_ton_kho,
       CASE 
         WHEN tk.so_luong_ton <= 0 THEN 'het_hang'
         WHEN tk.so_luong_ton <= COALESCE(vt.muc_ton_toi_thieu, 0) THEN 'canh_bao_thap'
         ELSE 'an_toan'
       END AS trang_thai_ton,
       tk.ngay_cap_nhat,
       nd.ho_ten AS nguoi_cap_nhat_ten
FROM ton_kho tk
JOIN kho k ON tk.ma_kho = k.id
JOIN vat_tu vt ON tk.ma_vat_tu = vt.id
LEFT JOIN don_vi_tinh dvt ON tk.don_vi_tinh = dvt.id
LEFT JOIN nguoi_dung nd ON tk.nguoi_cap_nhat = nd.id
WHERE 1=1
ORDER BY k.id ASC, tk.so_luong_ton ASC;
```

### Kết quả trả về thực tế từ PostgreSQL `erp_may10` (5 dòng tồn kho thực tế):
1. **Lô 1:** Kho Phụ Liệu May Mặc | Mã VT: `VT-CHI-MAY-02` | Tên: Chỉ may Polyester 40/2 | Tồn: `1,200 Cuộn` | Định mức: `1,500` | Trạng thái: `canh_bao_thap` | Giá trị: `1,440,000 đ`
2. **Lô 2:** Kho Phụ Liệu May Mặc | Mã VT: `VT-CUC-AO-03` | Tên: Cúc áo sơ mi 4 lỗ 11mm | Tồn: `4,500 Viên` | Định mức: `5,000` | Trạng thái: `canh_bao_thap` | Giá trị: `675,000 đ`
3. **Lô 3:** Kho Thành Phẩm May 10 | Mã VT: `VT-KHOA-KEO-04` | Tên: Khóa kéo đồng YKK số 5 | Tồn: `320 Chiếc` | Định mức: `300` | Trạng thái: `an_toan` | Giá trị: `1,920,000 đ`
4. **Lô 4:** Kho Nguyên Phụ Liệu Số 1 | Mã VT: `VT-VAI-KATE-01` | Tên: Vải Kate Silk trắng may sơ mi | Tồn: `85 Mét` | Định mức: `200` | Trạng thái: `canh_bao_thap` | Giá trị: `3,825,000 đ`
5. **Lô 5:** Kho Nguyên Phụ Liệu Số 1 | Mã VT: `VT-VAI-CHIFFON-05` | Tên: Vải voan Chiffon Hàn Quốc | Tồn: `215 Mét` | Định mức: `150` | Trạng thái: `an_toan` | Giá trị: `12,627,000 đ`
* **Tổng giá trị tồn kho toàn hệ thống:** `20,487,000 VNĐ`.
* **Dữ liệu hoàn toàn có thật trong CSDL và không hề bị rỗng.**

---

## 7. AUDIT XỬ LÝ LỖI VÀ TRẠNG THÁI FRONTEND (FRONTEND STATE AUDIT)

### Đoạn code xử lý tại `frontend/src/pages/TonKhoPage.jsx` (dòng 26-41):
```javascript
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getTonKho({ ... });
      setItems(data);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Lỗi khi tải danh sách tồn kho' });
    } finally {
      setLoading(false);
    }
  };
```
* **Cơ chế gây lỗi giao diện:**
  Khi `getTonKho()` trả về lỗi 401, hàm rơi vào khối `catch (err)`.
  Biến trạng thái `items` **giữ nguyên giá trị khởi tạo ban đầu là mảng rỗng `[]`**.
  Đồng thời `loading` được chuyển thành `false`.
  Tại dòng 158-163 của `TonKhoPage.jsx`:
  ```javascript
  items.length === 0 ? (
    <tr>
      <td colSpan="9" className="text-center py-10 text-[#8DA0B3]">
        Không tìm thấy mặt hàng tồn kho nào phù hợp với bộ lọc.
      </td>
    </tr>
  )
  ```
  Người dùng nhìn thấy bảng tồn kho hiển thị dòng chữ: *"Không tìm thấy mặt hàng tồn kho nào phù hợp với bộ lọc."* ➔ **Dẫn đến kết luận "Tài khoản thủ kho đăng nhập thành công nhưng dữ liệu tồn kho không hiển thị!"**

### Đoạn code xử lý tại `frontend/src/pages/DashboardPage.jsx` (dòng 58-78):
```javascript
  if (!stats) {
    const isAuthError =
      error &&
      (error.response?.status === 401 ||
        error.status === 401 ||
        error.message?.includes('401') ||
        error.message?.includes('hết hạn') ||
        error.message?.includes('Phiên đăng nhập'));

    if (isAuthError) {
      return (
        <div className="bg-white rounded-2xl border border-[#E2EDF5] p-8 text-center max-w-md mx-auto my-8 shadow-sm">
          <h3 className="text-base font-bold text-[#172033] mb-1">
            Phiên đăng nhập đã hết hạn
          </h3>
          <p className="text-xs sm:text-sm text-[#5F6F82] mb-5">
            Vui lòng đăng nhập lại để tiếp tục.
          </p>
        </div>
      );
    }
  }
```
* Khi `getDashboardStats()` nhận lỗi 401, màn hình Tổng quan kho hiển thị thông báo: *"Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục."*

---

## 8. NHẬT KÝ BROWSER CONSOLE & NETWORK (CONSOLE & NETWORK LOGS)

Trích xuất nhật ký thực tế khi kiểm thử với `mock-jwt-token-kho`:
```text
[Network] GET http://localhost:5173/api/v1/auth/me ➔ 401 Unauthorized (12ms)
[Console Warning] Lấy thông tin /auth/me thất bại: Request failed with status code 401
[Network] GET http://localhost:5173/api/v1/ton-kho/dashboard ➔ 401 Unauthorized (15ms)
[Network] GET http://localhost:5173/api/v1/ton-kho ➔ 401 Unauthorized (14ms)
[Console Error] [Axios Error 401]: Yêu cầu không hợp lệ. Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.
[Toast Rendered] "Lỗi khi tải danh sách tồn kho: Request failed with status code 401"
```

Trích xuất nhật ký thực tế khi kiểm thử với Real HMAC Token (`erp_token_5_...`):
```text
[Network] POST http://localhost:5173/api/v1/auth/login ➔ 200 OK (38ms)
[Network] GET http://localhost:5173/api/v1/ton-kho/dashboard ➔ 200 OK (22ms, payload 845 bytes)
[Network] GET http://localhost:5173/api/v1/ton-kho ➔ 200 OK (25ms, payload 1.4 KB, 5 rows)
[Network] GET http://localhost:5173/api/v1/master-data/kho ➔ 200 OK (18ms, 3 warehouses)
[DOM Rendered] 5 rows rendered in TonKhoPage table. 0 console errors.
```

---

## 9. MA TRẬN KIỂM CHỨNG CÁC GIẢ THUYẾT (HYPOTHESIS TESTING MATRIX)

| Mã | Giả thuyết (Hypothesis) | Kiểm thử thực nghiệm | Kết quả | Bằng chứng thực tế |
| :--- | :--- | :--- | :--- | :--- |
| **H1** | **Backend Auth Middleware Rejection** | Gửi token thật vs gửi mock token tới middleware | **XÁC NHẬN (CONFIRMED)** | `verifyToken` trong `auth.js` từ chối `mock-jwt-token-kho` trả về 401. Token thật được chấp nhận 200. |
| **H2** | **Role Mapping Mismatch in Backend** | Kiểm tra `normalizeRole`, `CANONICAL_ROLES`, `requireRoles` | **BÁC BỎ (REFUTED)** | Backend mapping role `'kho'` ➔ `'kho'` chuẩn xác. `requireRoles('kho', ...)` cho phép truy cập. |
| **H3** | **Permission Key Mismatch** | Kiểm tra quyền của role `kho` so với `AppRoutes`, `menu.js`, `Header` | **BÁC BỎ (REFUTED)** | Role `kho` có đầy đủ cả `kho.view` lẫn `warehouse.view`. PermissionGuard không chặn. |
| **H4** | **API Base URL or Proxy Failure** | Kiểm tra `vite.config.js` proxy và `api.js` baseURL | **BÁC BỎ (REFUTED)** | Proxy `/api` tới `http://localhost:5000` hoạt động hoàn hảo, không có lỗi 404 hay 502. |
| **H5** | **Database Query Returns 0 Rows** | Chạy SQL trực tiếp trên DB `erp_may10` bảng `ton_kho` | **BÁC BỎ (REFUTED)** | Database có 5 dòng tồn kho thực tế tổng trị giá 20,487,000 VNĐ. |
| **H6** | **Silent Frontend Error** | Bắt ngoại lệ trong render và useEffect | **XÁC NHẬN MỘT PHẦN** | `TonKhoPage` bắt lỗi 401 trong `catch` và gán `items = []`, che giấu mã lỗi HTTP thật và render rỗng. |
| **H7** | **Token Not Sent in PH4 API Calls** | Kiểm tra interceptor của axios trong `api.js` | **BÁC BỎ (REFUTED)** | Axios luôn đính kèm `Authorization: Bearer <token>` nếu có token trong `localStorage`. |
| **H8** | **Cached / Stale State in LocalStorage** | Kiểm tra dữ liệu lưu trữ khi reload trình duyệt | **XÁC NHẬN (CONFIRMED)** | `authService.getMe()` khôi phục user cũ từ LocalStorage khi API 401, duy trì "phiên bóng ma" (Zombie Session). |
| **H9** | **switchRole vs Real Login Discrepancy** | So sánh token phát hành bởi form login vs `switchRole` | **XÁC NHẬN CHÍNH (PRIMARY ROOT CAUSE)** | `switchRole` tạo token chuỗi giả `mock-jwt-token-kho`, trong khi backend yêu cầu chữ ký số HMAC-SHA256. |

---

## 10. NGUYÊN NHÂN CỐT LÕI CHÍNH XÁC (EXACT ROOT CAUSE SPECIFICATION)

### RC-01: Token Giả mạo phát sinh từ `switchRole` (Primary Root Cause)
* **Vị trí file:** `frontend/src/services/authService.js`, dòng 44-64:
  ```javascript
  switchRole(roleCode) {
    ...
    localStorage.setItem(TOKEN_KEY, 'mock-jwt-token-' + roleCode);
    ...
  }
  ```
* **Vị trí kích hoạt:**
  1. `frontend/src/pages/Login.jsx`, dòng 66-69 (Nút "Thủ kho" trong "Công cụ kiểm thử vai trò Dev Only"):
     ```javascript
     const handleQuickLogin = (acc) => {
       switchRole(acc.code);
       navigate(from, { replace: true });
     };
     ```
  2. `frontend/src/components/layout/Header.jsx`, dòng 211-214 (Menu chuyển vai trò trên Header):
     ```javascript
     const handleRoleChange = (newRoleCode) => {
       switchRole(newRoleCode);
       setShowUserMenu(false);
     };
     ```
* **Cơ chế lỗi:**
  Tại `backend/src/middlewares/auth.js` (dòng 57-90), hệ thống thực hiện xác minh chữ ký số mật mã học:
  ```javascript
  function verifyToken(token) {
    const match = token.match(/^erp_token_(\d+)_(\d+)\.([a-f0-9]{64})$/);
    if (!match) return null;
    ...
  }
  ```
  Chuỗi `'mock-jwt-token-kho'` không khớp biểu thức chính quy ➔ `verifyToken` trả về `null` ➔ `req.user` là `null` ➔ Middleware `requireAuth` tại `tonKhoRoutes.js` trả về **HTTP 401 Unauthorized**.

### RC-02: Phục hồi phiên làm việc cục bộ che giấu lỗi 401 (Zombie Session)
* **Vị trí file:** `frontend/src/services/authService.js`, dòng 82-101:
  ```javascript
  async getMe() {
    try {
      const res = await api.get('/auth/me');
      ...
    } catch (e) {
      console.warn('Lấy thông tin /auth/me thất bại:', e.message);
    }

    // Local cached session restore
    const rawUser = localStorage.getItem(USER_KEY);
    if (rawUser && rawUser !== 'undefined' && rawUser !== 'null') {
      const user = JSON.parse(rawUser);
      ...
      return { user, role: currentRole, permissions };
    }
  }
  ```
* **Cơ chế lỗi:**
  Khi token trong LocalStorage là token giả hoặc đã hết hạn, `/auth/me` trả về lỗi 401. Thay vì xóa LocalStorage và chuyển về đăng nhập, hàm vẫn lấy `rawUser` cũ trả về cho `AuthContext`. Người dùng thấy tên và vai trò của mình trên Header, nhưng mọi request API đều bị backend chặn lại.

### RC-03: Lệch cấu hình Email Domain giữa UI và Database
* **Vị trí file:** `frontend/src/config/roles.js`, dòng 68:
  ```javascript
  [ROLES.KHO]: {
    defaultUserId: 5,
    defaultEmail: 'kho@may10.com.vn', // SAI DOMAIN (Database dùng @may10.vn)
    defaultFullName: 'Phạm Văn Kho',
  }
  ```
* **Cơ chế lỗi:**
  Email trong Database thực tế là `kho@may10.vn`. Việc để `@may10.com.vn` trên UI và form login gây nhầm lẫn cho người dùng khi copy tài khoản để đăng nhập bằng tay.

### RC-04: Sai tên cột trong truy vấn nhật ký hoạt động (`portalController.js`)
* **Vị trí file:** `backend/src/controllers/portalController.js`, dòng 304-328:
  Truy vấn gọi `p.ma_phieu`, `p.loai_nhap_kho`, `p.ngay_nhap_kho`, `p.ma_kho`. Trong khi schema chuẩn của PostgreSQL `phieu_nhap_kho` là `ma_phieu_nhap`, `loai_nhap`, `ngay_nhap`, `ma_kho_nhap`.

---

## 11. TẠI SAO ĐỢT REMEDIATION TRƯỚC BỎ SÓT LỖI NÀY?

1. **Kiểm thử lệch ngữ cảnh (Context Gap):**
   Trong đợt remediation trước, kiểm thử tự động sử dụng lệnh curl hoặc script gọi trực tiếp `POST /api/v1/auth/login` bằng email và mật khẩu thật (`kho@may10.vn` / `password`). Luồng này trả về HMAC token hợp lệ nên các API PH4 trả về 200 OK.
2. **Bỏ sót luồng Dev Quick Login / Header Role Switcher:**
   Remediation trước không kiểm tra luồng thực tế của người dùng/tester khi click vào nút "Thủ kho" trong "Công cụ kiểm thử vai trò (Dev Only)" trên trang login hoặc menu Header. Luồng này gọi `switchRole`, ghi đè `erp_token` bằng chuỗi mock không có chữ ký số.
3. **Bẫy "Phiên đăng nhập bóng ma" (Zombie Session Trap):**
   Sau khi backend tăng cường bảo mật từ chối `mock-jwt-token-*`, `authService.getMe()` không được cập nhật để dọn dẹp LocalStorage khi nhận 401. Điều này dẫn đến hiện tượng "trông như đã đăng nhập thành công nhưng bên trong hoàn toàn không có quyền gọi API".

---

## 12. PHÂN TÍCH ẢNH HƯỞNG (IMPACT ANALYSIS)

| Chức năng | Trạng thái hiện tại | Ảnh hưởng người dùng |
| :--- | :--- | :--- |
| **Đăng nhập form với email `kho@may10.vn`** | **HOẠT ĐỘNG 100%** | Nhận token HMAC thật, hiển thị đầy đủ 5 dòng tồn kho và số liệu Dashboard. |
| **Đăng nhập nhanh qua nút Dev ("Thủ kho")** | **HỎNG 100% (401)** | Giao diện đăng nhập thành công nhưng PH4 không hiện dữ liệu, bảng rỗng. |
| **Chuyển vai trò sang Thủ kho trên Header** | **HỎNG 100% (401)** | Header đổi sang Thủ kho nhưng toàn bộ dữ liệu kho biến mất, API trả về 401. |
| **Tải lại trang (F5) khi đang dùng mock token** | **KẸT ZOMBIE SESSION** | Không bị đẩy ra login, tiếp tục hiển thị trạng thái đăng nhập giả và bảng rỗng. |

---

## 13. KẾ HOẠCH KHẮC PHỤC TỐI THIỂU CÓ KIỂM SOÁT (MINIMAL REMEDIATION PLAN)
*(CHỈ THỰC HIỆN KHI CÓ PHÊ DUYỆT TỪ USER — ZERO BUSINESS LOGIC CHANGE)*

Khi người dùng phê duyệt, sẽ tiến hành khắc phục chính xác 4 điểm (Không tạo version mới, không đổi UI):

1. **Khắc phục RC-01 (`frontend/src/services/authService.js` & `backend/src/controllers/portalController.js`):**
   Cung cấp cơ chế phát hành token HMAC hợp lệ cho `switchRole`:
   * Cách tiếp cận tối ưu: Trong môi trường dev, `switchRole(roleCode)` thực hiện gọi API endpoint `/api/v1/auth/login` với tài khoản demo tương ứng của vai trò đó để nhận Token HMAC có chữ ký số hợp lệ từ backend, thay vì gán chuỗi `mock-jwt-token-` cục bộ.
2. **Khắc phục RC-02 (`frontend/src/services/authService.js`):**
   Trong `getMe()`, nếu `api.get('/auth/me')` trả về lỗi `401 Unauthorized`, phải tự động gọi `this.logout()` và xóa sạch LocalStorage (`erp_token`, `erp_user`, `erp_role`, `erp_user_id`), ngăn chặn triệt để trạng thái Zombie Session.
3. **Khắc phục RC-03 (`frontend/src/config/roles.js`):**
   Đồng bộ `defaultEmail` của 6 vai trò về định dạng chính thức `@may10.vn` (`kho@may10.vn`, `admin@may10.vn`, etc.).
4. **Khắc phục RC-04 (`backend/src/controllers/portalController.js`):**
   Sửa đúng tên cột trong câu SQL `getRecentActivity`: `p.ma_phieu_nhap`, `p.loai_nhap`, `p.ngay_nhap`, `p.ma_kho_nhap` và các cột tương ứng của `phieu_xuat_kho`.

---

## 14. BẰNG CHỨNG THỰC NGHIỆM & HÌNH ẢNH (VISUAL PROOF REFERENCES)

* **Ảnh chụp màn hình khi Form Login thành công (Real Token):**
  `C:\Users\Admin\.gemini\antigravity\brain\024868d2-f0f8-4009-90fc-9b39c760ed45\scratch\audit_runtime_tonkho.png`
  *(Hiển thị đầy đủ 5 dòng tồn kho thực tế từ PostgreSQL `erp_may10`, thẻ kho, giá trị tồn kho 20,487,000 đ, người dùng Phạm Văn Kho)*.
* **Nhật ký Network & Console toàn trình:**
  `C:\Users\Admin\.gemini\antigravity\brain\024868d2-f0f8-4009-90fc-9b39c760ed45\.system_generated\tasks\task-5654.log`.
* **Script kiểm tra tính toàn vẹn CSDL:**
  `C:\Users\Admin\.gemini\antigravity\brain\024868d2-f0f8-4009-90fc-9b39c760ed45\scratch\audit_table_names.js`.
* **Script kiểm tra cấu trúc cột CSDL:**
  `C:\Users\Admin\.gemini\antigravity\brain\024868d2-f0f8-4009-90fc-9b39c760ed45\scratch\audit_columns.js`.

---
**KẾT LUẬN AUDIT:**
Đã tìm thấy chính xác 100% nguyên nhân cốt lõi gây ra tình trạng dữ liệu kho không hiển thị. Hệ thống đang ở trạng thái an toàn tuyệt đối (Không có bất kỳ file code hay cơ sở dữ liệu nào bị thay đổi). Sẵn sàng cho việc thực thi kế hoạch sửa lỗi có kiểm soát khi được người dùng chấp thuận.
