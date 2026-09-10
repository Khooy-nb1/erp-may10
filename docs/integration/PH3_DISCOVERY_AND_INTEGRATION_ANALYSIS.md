# PH3 DISCOVERY & INTEGRATION ANALYSIS
## BÁO CÁO PHÂN TÍCH HIỆN TRẠNG PH3 VÀ PHƯƠNG ÁN TÍCH HỢP HỆ THỐNG ERP MAY 10

**Dự án:** ERP Tổng Công ty May 10 - CTCP  
**Phân hệ phân tích:** PH3 (Mua hàng & Nhà cung cấp)  
**Nguồn phân tích:** Repository GitHub `https://github.com/Khooy-nb1/erp-may10` đã clone về `E:\ERP-PH3-ORIGINAL`  
**Đối trọng đối chiếu:** Nền tảng Core Foundation + PH4 (Kho & Quản lý vật tư) tại `E:\ERP`  
**Ngày lập:** 10/09/2026  
**Người thực hiện:** Senior Full-Stack Engineer / Integration Architect phụ trách tích hợp ERP May 10  
**Nguyên tắc thực hiện:** READ-ONLY DISCOVERY — TUYỆT ĐỐI ZERO CODE / ZERO DB / ZERO BUSINESS LOGIC CHANGE  

---

## 1. REPOSITORY

- **Remote URL:** `https://github.com/Khooy-nb1/erp-may10.git`
- **Local Clone Path:** `E:\ERP-PH3-ORIGINAL`
- **Tình trạng Clone:** Clone thành công 100% bằng lệnh `git clone https://github.com/Khooy-nb1/erp-may10.git E:\ERP-PH3-ORIGINAL`.
- **Remote Configuration:**
  - `origin https://github.com/Khooy-nb1/erp-may10.git (fetch)`
  - `origin https://github.com/Khooy-nb1/erp-may10.git (push)`

---

## 2. BRANCH & COMMIT HISTORY

### 2.1. Danh sách Branch trên Remote và Local
```text
* main (HEAD) -> commit c378a55
  remotes/origin/HEAD -> origin/main
  remotes/origin/develop -> commit fe333e8
  remotes/origin/main -> commit c378a55
```

### 2.2. Lịch sử Commit của Repository PH3
Repository hiện tại chỉ có duy nhất 2 commits:
1. `f548013` (khooy <nguyenvietkhoi30@gmail.com> - 14:09:11): `chore: create ERP MAY10 base`
2. `c378a55` trên `main` / `fe333e8` trên `develop` (KhoiNguyen <Khooy-nb1> - 14:19:54): `Create README.md with Git command instructions`

### 2.3. Khác biệt giữa Branch `main` và `develop`
Đối chiếu lệnh `git diff main origin/develop`: Khác biệt duy nhất là 1 ký tự trong `README.md` ("Git" vs "GIT").

---

## 3. ARCHITECTURE (TỔNG QUAN KIẾN TRÚC HIỆN TẠI CỦA PH3)

### 3.1. Hiện trạng Thực tế Tuyệt đối (Source Reality)
Qua kiểm tra tự động toàn bộ 103 files trong `E:\ERP-PH3-ORIGINAL`:
- **File duy nhất có dung lượng > 0:** `README.md` (2,381 bytes), nội dung hướng dẫn các lệnh Git cơ bản (`git status`, `git branch`, `git switch`, `git pull`, `git push`, `git merge`).
- **Toàn bộ 102 files còn lại:** Đều có kích thước **0 bytes** (Empty placeholder stubs / rỗng hoàn toàn, SHA-1 blob: `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`).
- **Đánh giá hiện trạng:** Repository `Khooy-nb1/erp-may10` mới chỉ dừng lại ở bước **khởi tạo khung thư mục (Scaffolding / Skeleton)**, **CHƯA CÓ DÒNG CODE IMPLEMENTATION THỰC TẾ NÀO**.

### 3.2. Cấu trúc Dự kiến trong Khung Skeleton của PH3
Khung file rỗng của PH3 phản ánh kiến trúc dự kiến kiểu Webshop / E-commerce cổ điển gồm:
- Tách riêng `backend/` và `frontend/`.
- Backend: Cấu trúc MVC cơ bản (`controllers`, `models`, `routes`, `services`, `middlewares`, `utils`, `validators`).
- Frontend: Cấu trúc React Vite (`src/context`, `src/layouts`, `src/routes`, `src/services`, `src/styles`, `src/utils`).

---

## 4. BACKEND (PHÂN TÍCH CHI TIẾT TẦNG MÁY CHỦ PH3)

| Tiêu chí | Hiện trạng tại PH3 Repository (`E:\ERP-PH3-ORIGINAL`) | Nền tảng Core May 10 (`E:\ERP`) | Nhận xét & Đánh giá |
|---|---|---|---|
| **`package.json`** | 0 bytes (Chưa khai báo dependency) | Node.js Express, pg, bcrypt, jsonwebtoken, cors, helmet | PH3 chưa cài đặt package nào |
| **`server.js` / `app.js`** | 0 bytes | Khởi tạo Express server trên port 5000, gắn kết pool, cors, routes | PH3 chưa có runtime backend |
| **Node / Express version** | Chưa xác định | Node >= 20.x, Express 4.x | Bắt buộc PH3 theo chuẩn Express 4.x |
| **PostgreSQL & Pool** | `config/database.js` (0 bytes) | `pg.Pool` (Max: 25 connection, idleTimeout: 30s) | Bắt buộc PH3 dùng chung connection pool |
| **Transaction handling** | Chưa có | `BEGIN ... COMMIT ... ROLLBACK` với `client = await pool.connect()` | PH3 cần tuân thủ giao dịch ACID |
| **Concurrency & Locking**| Chưa có | `SELECT ... FOR UPDATE` khóa bi quan chống âm tồn kho | PH3 cần áp dụng khi lập phiếu mua |
| **Middleware Architecture**| `adminMiddleware.js` (0 bytes), `authMiddleware.js` (0 bytes), `errorMiddleware.js` (0 bytes), `uploadMiddleware.js` (0 bytes) | `requireAuth` (HMAC Bearer), `requireRole`, `requirePermission`, `errorHandler` tập trung | Skeleton PH3 dùng phân cấp Admin/User kiểu web thường, không tương thích với 6 vai trò ERP May 10 |
| **Controllers dự kiến** | `authController`, `cartController`, `categoryController`, `employeeController`, `inventoryController`, `orderController`, `productController`, `reportController`, `userController` (Tất cả 0 bytes) | `portalController`, `tonKhoController`, `phieuNhapController`, `phieuXuatController`, `phieuChuyenController`, `phieuKiemKeController`, `viTriKhoController`, `loVatTuController`, `masterDataController` | Skeleton PH3 mang nặng tính chất bán lẻ / giỏ hàng (`Cart`), cần định hướng lại thành Mua hàng B2B (`mua_hang`, `don_mua_hang`, `nha_cung_cap`) |

---

## 5. FRONTEND (PHÂN TÍCH CHI TIẾT TẦNG GIAO DIỆN PH3)

| Tiêu chí | Hiện trạng tại PH3 Repository (`E:\ERP-PH3-ORIGINAL`) | Nền tảng Core May 10 (`E:\ERP`) | Nhận xét & Đánh giá |
|---|---|---|---|
| **Framework & Bundler** | `package.json` (0 bytes), `vite.config.js` (0 bytes) | React 18.3.1, Vite 6.4.3, Tailwind CSS 3.4.17 | Cần đồng bộ stack build |
| **Layouts** | `AdminLayout.jsx` (0 bytes), `CustomerLayout.jsx` (0 bytes) | `MainLayout.jsx`, `Header.jsx`, `Sidebar.jsx`, `Breadcrumb.jsx` | Khung PH3 định hướng có `CustomerLayout` (khách hàng mua lẻ) - KHÔNG PHÙ HỢP với ERP Nội bộ May 10 |
| **Contexts** | `AuthContext.jsx` (0 bytes), `CartContext.jsx` (0 bytes) | `AuthContext.jsx` (Quản lý User profile, token, permissions, role switcher) | Khung PH3 có `CartContext` (giỏ hàng) - Thừa thãi trong ERP |
| **Routing** | `AdminRoute.jsx` (0 bytes), `ProtectedRoute.jsx` (0 bytes), `AppRoutes.jsx` (0 bytes) | `AppRoutes.jsx` (Nested routing với `ProtectedRoute`, `PermissionGuard`, `RoleGuard`) | PH3 cần mount trực tiếp vào route `/purchasing/*` của Core Portal |
| **UI Components** | Không có component nghiệp vụ nào | Thư viện V2.11 đầy đủ: Card, Table, Modal, Button, KPI Card, Activity Chart | PH3 chưa có bất kỳ trang giao diện nào |

---

## 6. DATABASE (PHÂN TÍCH CƠ SỞ DỮ LIỆU PH3)

- **File Database hiện tại:** `backend/database/database.sql` (Kích thước: **0 bytes**).
- **File Database Documentation:** `docs/DATABASE.md` (Kích thước: **0 bytes**).
- **Migrations & Seed:** Hoàn toàn không có file migration hay seed nào trong repo PH3.
- **Đối chiếu với CSDL Core ERP May 10 (`erp_may10`):**
  - CSDL May 10 hiện có **41 bảng** chuẩn tiếng Việt (schema `public`).
  - PH3 chưa tạo bảng nào trong repository.
  - Các bảng dự kiến PH3 cần có theo Hợp đồng phát triển:
    - `yeu_cau_mua_hang` (Purchase Requisition - PR)
    - `chi_tiet_yeu_cau_mua`
    - `don_mua_hang` (Purchase Order - PO)
    - `chi_tiet_don_mua`
    - `danh_gia_nha_cung_cap`

---

## 7. API SPECIFICATION (PHÂN TÍCH DANH MỤC API PH3)

- **File Tài liệu API:** `docs/API.md` (Kích thước: **0 bytes**).
- **Mã nguồn Routes:** Tất cả các file trong `backend/src/routes/` đều là **0 bytes**:
  - `authRoutes.js` (0 bytes)
  - `cartRoutes.js` (0 bytes)
  - `categoryRoutes.js` (0 bytes)
  - `employeeRoutes.js` (0 bytes)
  - `inventoryRoutes.js` (0 bytes)
  - `orderRoutes.js` (0 bytes)
  - `productRoutes.js` (0 bytes)
  - `reportRoutes.js` (0 bytes)
  - `userRoutes.js` (0 bytes)
- **Đánh giá:** PH3 hiện **CHƯA CÓ BẤT KỲ API NÀO ĐƯỢC HIỆN THỰC HÓA**.

---

## 8. AUTHENTICATION (XÁC THỰC DANH TÍNH)

- **Trong repo PH3:** `backend/src/utils/jwt.js` (0 bytes), `backend/src/utils/password.js` (0 bytes), `frontend/src/context/AuthContext.jsx` (0 bytes).
- **Chuẩn của Core Portal May 10:**
  - Token chuẩn: Bearer Token ký bằng HMAC-SHA256 bí mật `erp_secret_key_may10_production_2026`.
  - Header chuẩn: `Authorization: Bearer <token>`.
  - Đã đóng băng và ngăn chặn hoàn toàn giả mạo header `x-user-id`, `x-role`.
  - Có API `/api/v1/auth/me` trả về thông tin người dùng và danh sách đặc quyền (permissions).
- **Yêu cầu đối với PH3:** PH3 **KHÔNG ĐƯỢC TỰ TRIỂN KHAI AUTH SERVER HAY LOGIN RIÊNG**. PH3 sẽ nhận trực tiếp token đã xác thực từ Core Portal.

---

## 9. RBAC (HỆ THỐNG VAI TRÒ & PHÂN QUYỀN)

- **Trong repo PH3:** Khung skeleton có `adminMiddleware.js` (0 bytes) gợi ý mô hình nhị phân đơn giản (`Admin` / `Customer`).
- **Chuẩn của Core Portal May 10:**
  - 6 vai trò chính thức bằng **tiếng Việt**: `admin`, `ban_hang`, `san_xuat`, `mua_hang`, `kho`, `ke_toan` (kèm `ke_toan_truong`).
  - Vai trò chính của PH3 trong CSDL May 10 là **`mua_hang`**.
- **Cảnh báo xung đột:** Nếu PH3 tự đặt tên role là `purchasing`, `purchasing_manager`, hay `buyer` sẽ gây **Role Mismatch** nghiêm trọng và bị từ chối truy cập.

---

## 10. UI (GIAO DIỆN NGƯỜI DÙNG) VS GLOBAL UI V2.11

- **Trong repo PH3:** Không có bất kỳ file CSS, JSX, hay token thiết kế nào (`frontend/src/styles/global.css` là 0 bytes).
- **Chuẩn Global UI V2.11 của Core May 10:**
  - Bảng màu: Deep Navy (`#0A2540`), Action Blue (`#0066CC`), Crimson Warning.
  - Header doanh nghiệp hiển thị nhận diện May 10, thông tin chức vụ, đăng xuất.
  - Sidebar phân cấp 2 tầng hiển thị các module theo quyền hạn.
  - MainLayout và Breadcrumb tự động định tuyến.
- **Yêu cầu đối với PH3:** Phân hệ PH3 **KHÔNG ĐƯỢC TẠO GIAO DIỆN KHUNG RIÊNG** (không tạo Header riêng, Sidebar riêng, Layout riêng). Mọi màn hình của PH3 phải được render bên trong `MainLayout` của Core Portal.

---

## 11. MASTER DATA (DỮ LIỆU DANH MỤC DÙNG CHUNG)

Hệ thống Core ERP May 10 đã cung cấp sẵn các bảng Master Data trong CSDL `erp_may10` và API tương ứng:

| Bảng Master Data | Mô tả | Trạng thái trong CSDL May 10 | Trách nhiệm của PH3 |
|---|---|:---:|---|
| **`nha_cung_cap`** | Danh mục Nhà cung cấp bông, sợi, vải, cúc, chỉ may | Đã có sẵn 4 nhà cung cấp mẫu | PH3 được phân quyền quản lý CRUD qua API riêng |
| **`vat_tu`** | Danh mục nguyên phụ liệu (vải kate, nút, chỉ, chun) | Đã có sẵn 4 vật tư mẫu | PH3 tham chiếu `ma_vat_tu`, không được tạo bảng vật tư trùng lặp |
| **`kho`** | Danh mục kho nguyên liệu, phụ liệu, thành phẩm | Đã có sẵn 3 kho lớn | PH3 tham chiếu kho nhập đích khi lập Đơn mua hàng |
| **`don_vi_tinh`** | Mét, cuộn, cái, kg | Đã có sẵn danh mục chuẩn | PH3 sử dụng chung mã ĐVT |
| **`nguoi_dung`** | Danh bạ nhân sự và tài khoản đăng nhập | Đã có 7 tài khoản chuẩn các vai trò | PH3 tham chiếu `ma_nguoi_dung` (nhân viên mua hàng, người phê duyệt) |

---

## 12. ĐIỂM KẾT NỐI LIÊN PHÂN HỆ: PH3 (MUA HÀNG) → PH4 (KHO VẬT TƯ)

Đây là mắt xích tích hợp quan trọng nhất giữa Mua hàng và Quản lý Kho:

```text
┌────────────────────────────────────────┐
│     PH3: MUA HÀNG & NHÀ CUNG CẤP       │
│                                        │
│  1. Lập Đơn mua hàng (PO)              │
│  2. Trạng thái: "approved" (Đã duyệt)   │
│  3. Theo dõi giao hàng từ Nhà cung cấp │
└───────────────────┬────────────────────┘
                    │ 
                    │ ma_don_mua_hang
                    │ Danh sách vật tư + Số lượng + Quy cách
                    ▼
┌────────────────────────────────────────┐
│     PH4: KHO & QUẢN LÝ VẬT TƯ          │
│                                        │
│  1. Thủ kho chọn đơn mua hàng cần nhập │
│  2. Lập Phiếu nhập kho (PNK-...)       │
│  3. Chỉ định: Lô vải, Vị trí kệ, Đơn giá│
│  4. Cập nhật số dư ton_kho & Thẻ kho   │
└────────────────────────────────────────┘
```

### 12.1. Hợp Đồng Dữ Liệu Tích Hợp (Data Integration Contract)
1. **Dữ liệu PH3 cung cấp cho PH4:**
   - Danh sách Đơn mua hàng đã được phê duyệt (`trang_thai = 'approved'`).
   - Chi tiết đơn mua: Mã đơn mua, Nhà cung cấp, Ngày giao dự kiến, Danh sách mặt hàng (`ma_vat_tu`, `so_luong_dat_mua`, `don_gia_tam_tinh`).
2. **Dữ liệu PH4 ghi nhận khi nhập hàng:**
   - Bảng `phieu_nhap_kho` của PH4 đã có sẵn trường liên kết:
     `phieu_nhap_kho.ma_don_mua_hang` ➔ Khóa ngoại trỏ đến `don_mua_hang.id` (hoặc `ma_don_mua`).
3. **API Tra cứu phục vụ liên phân hệ:**
   - PH4 đã chuẩn bị sẵn endpoint Master Data: `GET /api/v1/master-data/cross-module` (trả về danh mục liên kết liên phân hệ).
   - PH3 cần cung cấp endpoint:
     `GET /api/v1/purchasing/don-mua-hang/cho-nhap-kho` (Để màn hình Lập phiếu nhập của PH4 gọi lấy danh sách đơn mua đủ điều kiện nhập kho).

---

## 13. XUNG ĐỘT PHÁT HIỆN ĐƯỢC (CONFLICTS)

| Mã Xung Đột | Hạng Mục | Mô Tả Xung Đột | Mức Độ | Biện Pháp Xử Lý |
|:---:|---|---|:---:|---|
| **CF-01** | **E-Commerce Scaffolding Mismatch** | Khung file rỗng của repo PH3 chứa các tên file như `Cart`, `CartContext`, `CustomerLayout`, `cartController`, `OrderItem`. Đây là cấu trúc bán lẻ trực tuyến (B2C), hoàn toàn không phù hợp với phân hệ Mua hàng B2B của nhà máy dệt may. | **CAO** | Định hướng nhóm PH3 cấu hình lại theo chuẩn `purchasing`: `DonMuaHang`, `YeuCauMua`, `NhaCungCap`. |
| **CF-02** | **Role Binary Mismatch** | Middleware `adminMiddleware.js` trong repo PH3 phân chia quyền hạn theo nhị phân (`Admin` vs `User`). Core ERP May 10 yêu cầu ma trận phân quyền 6 vai trò tiếng Việt (`mua_hang`, `kho`, `admin`...). | **CAO** | PH3 bắt buộc phải dùng `backend/src/middlewares/auth.js` của Core, không được dùng `adminMiddleware.js`. |
| **CF-03** | **Duplicate Auth/Layout Hazard** | Skeleton PH3 có thư mục `layouts/`, `context/AuthContext.jsx`, `routes/AppRoutes.jsx` riêng. Nếu PH3 tự viết App riêng và chạy cổng riêng sẽ phá vỡ trải nghiệm Single Sign-On của Core Portal. | **TRUNG BÌNH** | PH3 phải phát triển dưới dạng Module Component con, được inject vào Router trung tâm của Core Portal. |
| **CF-04** | **Database Schema Void** | Repo PH3 chưa có DDL table nào trong `database.sql`. Nếu PH3 tự tạo database riêng tên khác (ví dụ: `ph3_purchase_db`) sẽ làm đứt gãy tính toàn vẹn ACID và liên kết khóa ngoại với PH4. | **NGHIÊM TRỌNG** | Toàn bộ bảng của PH3 phải được tạo trên database duy nhất `erp_may10`, schema `public`. |

---

## 14. THÀNH PHẦN BỊ TRÙNG LẶP (DUPLICATE COMPONENTS)

1. **`AuthContext.jsx`:** Core Portal đã có `frontend/src/components/rbac/AuthContext.jsx` hoàn chỉnh 100%. Repo PH3 có `frontend/src/context/AuthContext.jsx` (0 bytes). ➔ **Hủy bỏ file của PH3, dùng chung Core AuthContext.**
2. **`api.js` (Axios Client):** Core Portal đã có `frontend/src/services/api.js` (tự động đính kèm Bearer token và interceptor lỗi). PH3 có `frontend/src/services/api.js` (0 bytes). ➔ **Hủy bỏ file của PH3, dùng chung Core api.js.**
3. **`inventoryController.js` & `inventoryService.js`:** Repo PH3 có các file này (0 bytes). Phân hệ Kho & Quản lý tồn kho thuộc toàn quyền sở hữu của **PH4** (`tonKhoController.js`). ➔ **Xóa bỏ các file này khỏi PH3 để tránh xung đột quyền sở hữu module.**

---

## 15. DATABASE CONFLICTS & MAPPING MATRIX

| Bảng dữ liệu PH3 dự kiến | Bảng tương ứng trong Core / PH4 | Loại quan hệ | Xung đột | Hành động kỹ thuật bắt buộc |
|---|---|:---:|:---:|---|
| `nha_cung_cap` (Nhà cung cấp) | `nha_cung_cap` (Core Master Data) | Dùng chung 100% | Trùng bảng | **KHÔNG TẠO MỚI**. PH3 dùng trực tiếp bảng `nha_cung_cap` của Core May 10. |
| `vat_tu` (Nguyên phụ liệu) | `vat_tu` (Core Master Data) | Dùng chung 100% | Trùng bảng | **KHÔNG TẠO MỚI**. PH3 chỉ đọc mã và tên từ bảng `vat_tu`. |
| `kho` (Kho hàng) | `kho` (Core Master Data) | Dùng chung 100% | Trùng bảng | **KHÔNG TẠO MỚI**. PH3 tham chiếu ID kho đích. |
| `nguoi_dung` (Nhân sự) | `nguoi_dung` (Core Master Data) | Dùng chung 100% | Trùng bảng | **KHÔNG TẠO MỚI**. PH3 dùng cho trường `nguoi_tao_id`, `nguoi_duyet_id`. |
| `don_mua_hang` (Đơn đặt mua) | `phieu_nhap_kho` (PH4) | 1-N (1 Đơn mua nhập nhiều lần) | Không xung đột | **PH3 TẠO MỚI**. Tạo bảng `don_mua_hang` với khóa chính `id`, có các trường trạng thái chuẩn. |
| `chi_tiet_don_mua` (Chi tiết) | `chi_tiet_phieu_nhap` (PH4) | Tham chiếu | Không xung đột | **PH3 TẠO MỚI**. Khóa ngoại `ma_vat_tu` trỏ sang `vat_tu(id)`. |

---

## 16. API CONFLICTS & ADAPTER REQUIREMENTS

1. **API Quản lý Nhà cung cấp:**
   - Hiện tại Core đã có: `GET /api/v1/master-data/nha-cung-cap` (Read-only phục vụ tra cứu).
   - PH3 cần chức năng CRUD nâng cao (Thêm/Sửa/Đánh giá NCC).
   - **Giải pháp:** PH3 đặt route prefix riêng biệt: `/api/v1/purchasing/nha-cung-cap` để không ghi đè router chung.
2. **API Đơn mua hàng liên kết Nhập kho:**
   - PH3 cần cung cấp API: `GET /api/v1/purchasing/don-mua-hang/:id/chi-tiet-nhap` trả về danh sách vật tư còn lại cần nhập kho (Số lượng đặt - Số lượng đã nhập trước đó).
   - Controller `phieuNhapController.js` của PH4 chỉ việc gọi dữ liệu này để tự động điền form nhập kho, loại bỏ hoàn toàn sai sót nhập liệu thủ công.

---

## 17. RBAC MAPPING TABLE (ÁNH XẠ PHÂN QUYỀN)

| Vai trò trong PH3 dự kiến | Vai trò chuẩn trong Core May 10 | Mã quyền cần cấp trong hệ thống | Ghi chú |
|---|---|---|---|
| `purchasing_staff` / `buyer` | **`mua_hang`** | `purchasing.pr.create`, `purchasing.po.create`, `purchasing.po.view`, `kho.view` | Nhân viên nghiệp vụ mua sắm |
| `purchasing_manager` | **`mua_hang`** (hoặc `admin`) | `purchasing.po.approve`, `purchasing.supplier.manage` | Cấp phê duyệt đơn mua |
| `warehouse_staff` | **`kho`** | `kho.phieu_nhap.create`, `purchasing.po.view` | Thủ kho chỉ cần quyền xem đơn mua để lập phiếu nhập |
| `admin` | **`admin`** | `*` (Toàn quyền hệ thống) | Quản trị viên hệ thống |

---

## 18. UI ALIGNMENT (ĐỒNG BỘ GIAO DIỆN CHUẨN V2.11)

Để đảm bảo tính đồng nhất 100% khi người dùng chuyển từ Trang chủ hoặc PH4 sang PH3:
1. **Layout Wrapper:** Các trang PH3 không được bọc bởi thẻ `<html>` hay layout tự chế mà bọc bởi:
   ```jsx
   <MainLayout title="Mua Hàng & Nhà Cung Cấp">
     {/* Toàn bộ nội dung phân hệ PH3 ở đây */}
   </MainLayout>
   ```
2. **Hệ màu nhận diện:**
   - Tiêu đề & Menu: `#0A2540` (May 10 Deep Navy).
   - Nút bấm chính / Hành động: `#0066CC` (Garco 10 Action Blue).
   - Bảng biểu: Sử dụng class Tailwind bảng chuẩn (header xám nhạt, border-slate-200, row hover).
3. **Module Cards & Navigation:** Icon Mua hàng trên Trang chủ (`Hero` và `ModuleCards.jsx`) đã trỏ sẵn vào `/purchasing`. Khi PH3 bàn giao xong, hệ thống sẽ tự động chuyển từ trang giữ chỗ (*PlaceholderModule*) sang trang thực tế của PH3.

---

## 19. RECOMMENDED ADAPTER LAYER (LỚP KẾT NỐI ĐỀ XUẤT)

Nhằm đảm bảo PH4 vẫn **ĐÓNG BĂNG TUYỆT ĐỐI (FROZEN)** mà vẫn đón nhận được dữ liệu từ PH3:

```javascript
// backend/src/adapters/ph3PurchasingAdapter.js (Đề xuất)
/**
 * Adapter trung gian kết nối PH3 (Mua hàng) với PH4 (Kho)
 * Đảm bảo Zero-modification đối với code lõi của cả 2 bên.
 */
class PurchasingToWarehouseAdapter {
  // Lấy danh sách PO sẵn sàng nhập kho
  static async getApprovedPurchaseOrders() { ... }

  // Cập nhật trạng thái Đơn mua sau khi PH4 hoàn thành phiếu nhập kho
  static async onWarehouseReceiptCreated(maDonMua, chiTietNhap) { ... }
}
```

---

## 20. INTEGRATION PLAN (KẾ HOẠCH TÍCH HỢP 5 BƯỚC)

1. **Bước 1 — Chuẩn hóa khung repository PH3:**
   - Dọn dẹp các file rỗng không phù hợp (`Cart`, `Order`, `CustomerLayout`).
   - Cập nhật `package.json` của PH3 đồng bộ phiên bản với Core May 10.
2. **Bước 2 — Xây dựng Database Schema PH3:**
   - Viết script DDL tạo các bảng `don_mua_hang`, `chi_tiet_don_mua`, `yeu_cau_mua_hang` trong schema `public` của CSDL `erp_may10`.
   - Thiết lập khóa ngoại liên kết sang `nha_cung_cap(id)`, `vat_tu(id)`, `nguoi_dung(id)`.
3. **Bước 3 — Hiện thực hóa Backend API PH3:**
   - Triển khai các router nghiệp vụ mua hàng dưới prefix `/api/v1/purchasing/*`.
   - Kế thừa middleware xác thực `requireAuth` và kiểm tra vai trò `mua_hang`.
4. **Bước 4 — Hiện thực hóa Frontend UI PH3:**
   - Xây dựng các trang: Quản lý Nhà cung cấp, Lập Đơn mua hàng, Danh sách đơn mua chờ giao.
   - Nhúng trực tiếp vào router trung tâm `frontend/src/routes/AppRoutes.jsx` tại route `/purchasing/*`.
5. **Bước 5 — Kiểm thử Tích hợp & Nghiệm thu:**
   - Chạy kịch bản end-to-end: Lập Đơn mua hàng (PH3) ➔ Phê duyệt ➔ Lập Phiếu nhập kho (PH4) ➔ Cập nhật tồn kho tự động.
   - Chạy bộ kiểm thử hồi quy bảo đảm PH4 không bị ảnh hưởng.

---

## 21. RISK LIST (DANH MỤC RỦI RO & PHÒNG NGỪA)

| STT | Rủi Ro Kỹ Thuật | Khả Năng | Hậu Quả | Giải Pháp Phòng Ngừa |
|:---:|---|:---:|:---:|---|
| 1 | PH3 tự cài đặt database riêng làm mất liên kết khóa ngoại | Cao | Nghiêm trọng | Bắt buộc nhóm PH3 chỉ cung cấp file SQL migration chạy trên DB `erp_may10`. |
| 2 | PH3 tự ý sửa đổi code PH4 để lấy dữ liệu kho | Trung bình | Rất nghiêm trọng | Giữ nguyên lệnh Đóng băng PH4 (Frozen). Cung cấp Adapter API cho PH3 gọi từ xa. |
| 3 | Xung đột phiên bản thư viện Frontend (React / Tailwind) | Thấp | Trung bình | Ép buộc PH3 sử dụng chung file `frontend/package.json` của hệ thống. |
| 4 | Tranh chấp tồn kho khi điều chỉnh đơn mua | Thấp | Cao | Sử dụng giao dịch ACID và khóa dòng `SELECT ... FOR UPDATE`. |

---

## 22. FINAL VERDICT (KẾT LUẬN & PHÁN QUYẾT CUỐI CÙNG)

| Câu hỏi nghiệm thu kiến trúc | Trả lời chính thức |
|---|---|
| **1. PH3 có thể tích hợp vào `E:\ERP` không?** | **CÓ THỂ TÍCH HỢP TỐT.** Hiện trạng repo PH3 chưa có code thực tế nên hoàn toàn có cơ hội xây dựng chuẩn ngay từ đầu theo Contract. |
| **2. Có cần Adapter không?** | **CÓ.** Cần một Adapter nhẹ tại Backend để đồng bộ trạng thái đơn mua khi PH4 nhập kho. |
| **3. Có conflict database không?** | **CHƯA CÓ CONFLICT HIỆN HỮU** (vì file `database.sql` của PH3 là 0 bytes). Cần giám sát để PH3 không tạo trùng bảng Master Data. |
| **4. Có conflict API không?** | **CHƯA CÓ CONFLICT HIỆN HỮU** (tất cả route PH3 là 0 bytes). Cần yêu cầu PH3 dùng prefix `/api/v1/purchasing/*`. |
| **5. Có conflict RBAC không?** | **CÓ NGUY CƠ TIỀM ẨN.** PH3 phải từ bỏ mô hình nhị phân Admin/User và tuân thủ vai trò tiếng Việt `mua_hang`. |
| **6. Có conflict authentication không?** | **KHÔNG.** PH3 sẽ dùng trực tiếp cơ chế Bearer Token và `AuthContext` đã có sẵn của Core Portal. |
| **7. Có conflict UI không?** | **KHÔNG NẾU TUÂN THỦ CONTRACT.** PH3 chỉ cần nhúng các page vào `MainLayout` V2.11 của Core Portal. |
| **8. Có cần migration không?** | **CÓ.** Cần tạo bảng mới cho phân hệ Mua hàng (`don_mua_hang`, `chi_tiet_don_mua`) trong CSDL `erp_may10`. |
| **9. Có cần đổi business logic không?** | **KHÔNG.** Toàn bộ business logic của PH4 và Core Portal giữ nguyên 100%. |
| **10. Có nguy cơ làm hỏng PH4 không?** | **HOÀN TOÀN KHÔNG CÓ NGUY CƠ NẾU ÁP DỤNG ADAPTER LAYER VÀ GIỮ NGUYÊN LỆNH FREEZE CHO PH4.** |

---

### ĐÁNH GIÁ TỔNG THỂ THEO 5 MỨC ĐỘ:

```text
┌───────────────────────────────────────────┬───────────────────────────────┐
│ Hạng mục đánh giá                         │ Phán quyết (Verdict)          │
├───────────────────────────────────────────┼───────────────────────────────┤
│ Frontend                                  │ B. READY WITH ADAPTER         │
│ Backend                                   │ B. READY WITH ADAPTER         │
│ Database                                  │ C. NEED CONTRACT ALIGNMENT    │
│ API                                       │ C. NEED CONTRACT ALIGNMENT    │
│ Authentication                            │ A. READY                      │
│ RBAC                                      │ C. NEED CONTRACT ALIGNMENT    │
│ UI (Global UI V2.11)                      │ A. READY                      │
│ Master Data                               │ A. READY                      │
│ Integration PH3 ➔ PH4                     │ B. READY WITH ADAPTER         │
├───────────────────────────────────────────┼───────────────────────────────┤
│ TỔNG THỂ DỰ ÁN (OVERALL VERDICT)          │ B. READY WITH ADAPTER         │
└───────────────────────────────────────────┴───────────────────────────────┘
```

> [!IMPORTANT]
> **PH4 IMPACT WARNING:**  
> Phân hệ PH4 — Kho & Quản lý vật tư đang ở trạng thái **FROZEN BẤT BIẾN**. Không có bất kỳ thay đổi nào được phép áp dụng lên các controller, model, route, hay cấu trúc 11 bảng CSDL của PH4 trong quá trình tích hợp PH3. Mọi dữ liệu giao tiếp giữa PH3 và PH4 bắt buộc phải đi qua API hoặc Adapter trung gian.
