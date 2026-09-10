# BÁO CÁO NGHIỆM THU KHẮC PHỤC TRIỆT ĐỂ — DỮ LIỆU KHO PH4 ĐÃ HIỂN THỊ
## NGÀY THỰC HIỆN: 10/09/2026
## PHÂN HỆ: PH4 — KHO & QUẢN LÝ VẬT TƯ (MAY 10 ERP)
## TÀI LIỆU AUDIT GỐC: E:\ERP\docs\rbac\15_WAREHOUSE_DATA_STILL_MISSING_DEEP_AUDIT.md
## KẾT LUẬN CUỐI CÙNG (FINAL VERDICT): FIXED — WAREHOUSE DATA VERIFIED

---

## 1. CÁC NGUYÊN NHÂN CỐT LÕI ĐÃ ĐƯỢC KHẮC PHỤC (ROOT CAUSES FIXED)

1. **RC-01: Dev Role Switcher (`switchRole`) tạo token giả mạo bị Backend HMAC từ chối 401.**
   * *Trước khi sửa:* `switchRole('kho')` tự gán chuỗi `mock-jwt-token-kho` vào `localStorage`. Backend với middleware bảo mật HMAC-SHA256 phát hiện token không có chữ ký số hợp lệ và trả về HTTP 401 Unauthorized trên tất cả API PH4.
   * *Sau khi sửa:* `switchRole(roleCode)` thực hiện luồng đăng nhập thật với Backend (`POST /api/v1/auth/login`) qua tài khoản demo chuẩn, nhận Token HMAC có chữ ký số mật mã học thật từ máy chủ (`erp_token_5_<timestamp>.<signature>`). Loại bỏ hoàn toàn token chuỗi giả `mock-jwt-token-*`.
2. **RC-02: Phục hồi ngầm phiên làm việc cũ gây ra Zombie Session khi nhận lỗi 401.**
   * *Trước khi sửa:* `authService.getMe()` bắt lỗi 401 và tự động đọc `rawUser` từ LocalStorage để trả về cho AuthContext, khiến UI duy trì trạng thái đăng nhập bóng ma (Zombie Session).
   * *Sau khi sửa:* Khi `/auth/me` trả về lỗi 401 hoặc token không hợp lệ, hệ thống xóa sạch toàn bộ session (`erp_token`, `erp_user`, `erp_role`, `erp_user_id`), đưa AuthContext về `user = null`, và tự động điều hướng người dùng về `/login`.
3. **RC-03: Lệch cấu hình Email Domain giữa UI và Database.**
   * *Trước khi sửa:* `frontend/src/config/roles.js` để email demo là `kho@may10.com.vn`.
   * *Sau khi sửa:* Đồng bộ 100% email các vai trò demo về domain chuẩn `@may10.vn` (`kho@may10.vn`, `admin@may10.vn`, etc.) khớp chính xác với CSDL `nguoi_dung`.
4. **RC-04: Sai tên cột trong câu truy vấn nhật ký hoạt động Cổng ERP.**
   * *Trước khi sửa:* Truy vấn `getRecentActivity` trong `backend/src/controllers/portalController.js` gọi các cột không tồn tại (`p.ma_phieu`, `p.loai_nhap_kho`, `p.ngay_nhap_kho`, `p.ma_kho`).
   * *Sau khi sửa:* Cập nhật đúng các cột chuẩn của PostgreSQL: `p.ma_phieu_nhap`, `p.loai_nhap`, `p.ngay_nhap`, `p.ma_kho_nhap` và các cột tương ứng của `phieu_xuat_kho`, `phieu_chuyen_kho`, `phieu_kiem_ke`.

---

## 2. DANH SÁCH FILE THAY ĐỔI (FILES CHANGED)

Tuân thủ nghiêm ngặt phạm vi được phép (Strict Scope), chỉ sửa đúng 3 file đã được xác định qua audit:

| STT | Đường dẫn file | Vùng thay đổi | Mô tả thay đổi |
| :--- | :--- | :--- | :--- |
| 1 | `frontend/src/config/roles.js` | Dòng 24, 34, 44, 54, 64, 74 | Chuẩn hóa `defaultEmail` của 6 vai trò về domain `@may10.vn`. |
| 2 | `frontend/src/services/authService.js` | Dòng 44-75, 80-115, 130 | Tích hợp đăng nhập backend thật cho `switchRole`; dọn sạch session khi `/auth/me` 401; loại bỏ mock token. |
| 3 | `backend/src/controllers/portalController.js` | Dòng 300-368 | Sửa đúng tên cột schema PostgreSQL trong câu lệnh SQL của `getRecentActivity`. |

*Các vùng FROZEN tuyệt đối không thay đổi:*
* Database PostgreSQL `erp_may10` (Schema, bảng, dữ liệu giữ nguyên 100%).
* PH4 Business Logic, Controllers, Services, Transactions, `SELECT ... FOR UPDATE` (Giữ nguyên 100%).
* Global UI Design System V2.11, Header, Sidebar, MainLayout (Giữ nguyên 100%).
* PH4 Pages: `WarehouseModule.jsx`, `TonKhoPage.jsx`, `DashboardPage.jsx` (Giữ nguyên 100%).

---

## 3. BẰNG CHỨNG LUỒNG ĐĂNG NHẬP THẬT (TEST A — REAL LOGIN EVIDENCE)

Thực hiện kiểm thử tự động trên Headless Chrome với tài khoản:
* **Email:** `kho@may10.vn`
* **Mật khẩu:** `password`

### Kết quả dò vết runtime:
* `POST http://localhost:5173/api/v1/auth/login` ➔ **HTTP 200 OK**
* **Token phát hành:** `erp_token_5_1789030621793.adfe8b9a4...` (HMAC-SHA256 hợp lệ)
* `GET http://localhost:5173/api/v1/auth/me` ➔ **HTTP 200 OK**
* **Vai trò ghi nhận:** `role = "kho"`
* **Quyền hạn ghi nhận:** `["dashboard.view", "kho.view", "kho.nhap", "kho.xuat", "kho.chuyen", "kho.kiem_ke", "warehouse.view", ...]`
* **Điều hướng tới:** `http://localhost:5173/warehouse?tab=ton-kho`
* **Số dòng tồn kho render trên DOM:** **5 dòng dữ liệu thực tế** (100% khớp CSDL).

---

## 4. BẰNG CHỨNG DEV ROLE SWITCHER (TEST B — DEV SWITCH ROLE EVIDENCE)

Thực hiện click nút **"Thủ kho"** trong mục *"🛠️ Công cụ kiểm thử vai trò (Dev Only)"* trên trang Đăng nhập:

### Kết quả kiểm tra LocalStorage:
* `localStorage.getItem('erp_token')`:
  `erp_token_5_1789030629663.f3a8450b836c804e4c9132d0fc34cf9bc07b08bc49c0629ed21d7d25ca98d17d`
* **Kiểm tra Token chuỗi giả (`mock-jwt-token-*`):** `false` (ĐÃ BỊ LOẠI BỎ TRIỆT ĐỂ)
* **Kiểm tra Token HMAC backend (`erp_token_5_`):** `true` (TOKEN THẬT CÓ CHỮ KÝ SỐ MẬT MÃ HỌC)
* `localStorage.getItem('erp_role')`: `"kho"`
* `localStorage.getItem('erp_user_id')`: `"5"`

### Kết quả render giao diện PH4 Tồn kho:
Giao diện tải thành công và hiển thị đủ 5 dòng tồn kho thực tế:
1. `Kho Nguyên Phụ Liệu Số 1` | `VT-VAI-KATE-01` | Vải Kate Lụa Trắng Khổ 1.5m | Tồn: `22 Mét` | Giá trị: `2.100.000 đ` | Cảnh báo: `Thiếu hụt`
2. `Kho Thành Phẩm May 10` | `VT-VAI-XANH-04` | Vải Chiffon Xanh Pastel Khổ 1.4m | Tồn: `20 Kilogram` | Giá trị: `100.000 đ` | Cảnh báo: `Thiếu hụt`
3. `Kho Thành Phẩm May 10` | `VT-VAI-KATE-01` | Vải Kate Lụa Trắng Khổ 1.5m | Tồn: `206,2 Mét` | Giá trị: `9.062.000 đ` | Cảnh báo: `Thiếu hụt`
4. `Kho Phụ Liệu May Mặc` | `VT-CHI-MAY-02` | Chỉ May Poly 40/2 Trắng | Tồn: `200 Cuộn` | Giá trị: `5.600.000 đ` | Cảnh báo: `An toàn`
5. `Kho Phụ Liệu May Mặc` | `VT-CUC-AO-03` | Cúc Nhựa 4 Lỗ 11mm Trắng Đục | Tồn: `15.000 Cái` | Giá trị: `3.750.000 đ` | Cảnh báo: `An toàn`

---

## 5. BẰNG CHỨNG LOẠI BỎ ZOMBIE SESSION (TEST C — ZOMBIE SESSION TEST EVIDENCE)

Thực hiện kiểm thử bắt buộc:
1. Đăng nhập thành công với vai trò Thủ kho.
2. Cố tình làm hỏng token trong LocalStorage: `localStorage.setItem('erp_token', 'corrupted-invalid-token')`.
3. F5 tải lại trang tại `http://localhost:5173/warehouse?tab=ton-kho`.
4. **Kết quả quan sát thực tế:**
   * `GET /api/v1/auth/me` trả về `HTTP 401 Unauthorized`.
   * `authService.getMe()` ngay lập tức kích hoạt `this.logout()`.
   * `localStorage.getItem('erp_token')` ➔ `null`.
   * `localStorage.getItem('erp_user')` ➔ `null`.
   * `localStorage.getItem('erp_role')` ➔ `null`.
   * Tên *"Phạm Văn Kho"* trên Header biến mất hoàn toàn.
   * Trình duyệt tự động chuyển hướng về `http://localhost:5173/login`.
   * **Không còn bất kỳ Zombie Session nào.**

---

## 6. BẰNG CHỨNG KIỂM TRA TÀI KHOẢN ADMIN (TEST D — ADMIN FLOW EVIDENCE)

* Sử dụng Dev Switcher chọn **"Admin"**:
  * `localStorage.getItem('erp_token')` nhận token: `erp_token_1_1789030639929.4af532...`
  * `localStorage.getItem('erp_role')` = `"admin"`, `erp_user_id` = `"1"`.
  * Truy cập `/warehouse?tab=ton-kho`: Render đầy đủ 5 dòng tồn kho (HTTP 200 OK).
  * Truy cập `/admin/users`: Cho phép quản trị người dùng bình thường.

---

## 7. BẰNG CHỨNG API HOẠT ĐỘNG GẦN ĐÂY (ACTIVITY API EVIDENCE)

Yêu cầu kiểm thử: `GET http://localhost:5000/api/v1/dashboard/activity`
* **Mã phản hồi HTTP:** `200 OK`
* **Lỗi SQL:** **0 lỗi** (Đã sửa đúng tên cột schema PostgreSQL).
* **Số lượng bản ghi thực tế trả về:** 10 bản ghi hoạt động thật từ các bảng `phieu_nhap_kho`, `phieu_xuat_kho`, `phieu_chuyen_kho`, `phieu_kiem_ke`.
* **Mẫu bản ghi đầu tiên:**
  ```json
  {
    "id": "162",
    "ma_chung_tu": "PNK-20260910-2155",
    "loai_hoat_dong": "nhap_kho",
    "phan_he": "PH4 — Kho & Vật tư",
    "noi_dung": "Nhập kho: tu_mua_hang (Kho Nguyên Phụ Liệu Số 1)",
    "thoi_gian": "2026-09-10T03:10:17.938Z",
    "nguoi_thuc_hien": "Quản Trị Viên Hệ Thống"
  }
  ```

---

## 8. KẾT QUẢ BỘ TEST HỒI QUY TOÀN HỆ THỐNG (REGRESSION TESTS)

| Bộ kiểm thử | Lệnh thực thi | Kết quả đạt được | Tỷ lệ thành công |
| :--- | :--- | :--- | :--- |
| **Frontend Production Build** | `npm run build` | Build hoàn tất trong 4.86s, không có cảnh báo/lỗi cú pháp | **100% PASS** |
| **PH4 Full REST API Suite** | `node tests/test_ph4_api.js` | **16/16 tests PASSED** (Master Data, Tồn kho, Thẻ kho, Nhập, Xuất, Chuyển, Kiểm kê) | **100% PASS** |
| **Concurrency & Race Condition**| `node tests/test_concurrency.js` | **PASS** (PostgreSQL `SELECT ... FOR UPDATE` khóa dòng an toàn tuyệt đối, chống âm kho) | **100% PASS** |
| **RBAC Phase 1 Security Suite** | `node tests/test_rbac_security.js` | **27/27 tests PASSED** (R01 ➔ R27, chống leo thang quyền, chống token forgery) | **100% PASS** |

---

## 9. BẢNG SO SÁNH TRƯỚC VÀ SAU KHI KHẮC PHỤC (BEFORE / AFTER COMPARISON)

| Tiêu chí | Trước khi khắc phục (Trạng thái Bug) | Sau khi khắc phục (Trạng thái Hiện tại) |
| :--- | :--- | :--- |
| **Token phát hành bởi `switchRole`** | Chuỗi giả `mock-jwt-token-kho` | Token thật HMAC có chữ ký số `erp_token_5_<timestamp>.<sig>` |
| **Phản hồi Backend khi dùng Quick Login** | HTTP 401 Unauthorized (Bị chặn) | **HTTP 200 OK (Được xác thực)** |
| **Dữ liệu bảng Tồn kho (`TonKhoPage`)** | Trống rỗng (*"Không tìm thấy mặt hàng..."*) | **Hiển thị đầy đủ 5 dòng tồn kho thực tế** |
| **Dữ liệu Dashboard kho (`DashboardPage`)**| Báo lỗi *"Phiên đăng nhập đã hết hạn"* | **Hiển thị đầy đủ số liệu KPI và biểu đồ thực tế** |
| **Xử lý khi token hỏng / hết hạn** | Khôi phục ngầm user cũ (Zombie Session) | **Xóa sạch LocalStorage và redirect ngay về `/login`** |
| **Email tài khoản mẫu trong cấu hình UI**| `kho@may10.com.vn` (Sai domain) | **`kho@may10.vn` (Đúng domain CSDL)** |
| **API Hoạt động gần đây (`/activity`)** | Lỗi SQL `p.ma_phieu does not exist` (dùng mock) | **HTTP 200 OK, trả về đúng 10 bản ghi CSDL thực tế** |

---

## 10. BẰNG CHỨNG HÌNH ẢNH (VISUAL PROOF)

* **Ảnh chụp màn hình thực tế trên Browser sau khi dùng Dev Role Switcher ("Thủ kho"):**
  `C:\Users\Admin\.gemini\antigravity\brain\024868d2-f0f8-4009-90fc-9b39c760ed45\scratch\verified_dev_switch_role_tonkho.png`
  *(Giao diện hiển thị: Thủ kho Phạm Văn Kho, Header V2.11, Sidebar theo ngữ cảnh, và bảng Tồn kho & Thẻ kho hiển thị đầy đủ 5 dòng hàng hóa thực tế từ CSDL)*.

---

## 11. KẾT LUẬN CUỐI CÙNG (FINAL VERDICT)

```
======================================================================
  KẾT LUẬN NGHIỆM THU:
  FIXED — WAREHOUSE DATA VERIFIED
======================================================================
```
* **Cả 4 nguyên nhân cốt lõi (RC-01, RC-02, RC-03, RC-04) đã được khắc phục triệt để.**
* **Dữ liệu phân hệ Kho PH4 hiển thị 100% đầy đủ trên trình duyệt thực tế cho cả luồng Form Login và luồng Dev Role Switcher.**
* **Không còn hiện tượng Zombie Session, không còn mock token, không còn lỗi 401.**
* **Hệ thống vượt qua 100% tất cả các bài kiểm tra hồi quy: PH4 API (16/16), Concurrency (100%), RBAC Security (27/27), và Frontend Build (100%).**
