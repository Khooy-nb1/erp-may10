# BÁO CÁO KIỂM TOÁN READ-ONLY PHÂN HỆ 1 (BÁN HÀNG & CRM)
**HỆ THỐNG ERP TỔNG CÔNG TY MAY 10**  
*Mã tài liệu: `PH1_STEP1_READ_ONLY_AUDIT.md`*  
*Đối tượng kiểm toán: Branch `ph1-bh-qlkh` trên remote `https://github.com/Khooy-nb1/erp-may10` đối chiếu với Live ERP May 10 tại `E:\ERP`*  
*Ngày kiểm toán: 12/09/2026*  

---

## 1. EXECUTIVE SUMMARY (TỔNG QUAN ĐIỀU HÀNH)

1. **Bối cảnh:**  
   - Hệ thống ERP May 10 tại `E:\ERP` đang vận hành trên nền tảng **React 18 + Vite + Tailwind CSS** (Frontend) và **Node.js (CommonJS) + Express + PostgreSQL 18.6** (Backend).
   - Các phân hệ **Core Portal (V2.11), PH2 (Sản xuất & MRP), PH3 (Mua hàng & NCC), PH4 (Kho & Quản lý vật tư)** đã được kiểm toán toàn diện và **CHÍNH THỨC ĐÓNG BĂNG (FROZEN)**.
   - Nhánh mục tiêu `ph1-bh-qlkh` đại diện cho phần phát triển của Phân hệ 1 (Bán hàng & Quản lý khách hàng) từ repository nguồn.

2. **Kết quả cốt lõi của Read-Only Audit:**
   - **Mức độ hoàn thiện chức năng của branch `ph1-bh-qlkh`:** Đã được phát triển rất bài bản với cấu trúc hoàn chỉnh từ backend (TypeScript, Zod, Repositories, Services, Unit/Integration tests) đến frontend (TypeScript, React 19, `@astryxdesign/core`, `@tanstack/react-query`). Toàn bộ 24 test suites của backend (`test.ts`) đã được viết sẵn.
   - **Tuy nhiên, tồn tại sự sai khác kiến trúc nghiêm trọng (Architectural Misalignment) so với Target ERP:**
     - *Công nghệ Frontend:* Branch `ph1-bh-qlkh` đã thay thế toàn bộ Core Portal của May 10 bằng `@astryxdesign/core` + React 19 + StyleX, xóa bỏ `MainLayout`, `Header`, `Sidebar`, `Tailwind CSS` và toàn bộ các trang của PH2, PH3, PH4.
     - *Công nghệ Backend:* Branch `ph1-bh-qlkh` viết hoàn toàn bằng TypeScript (ESM, `tsx`), dùng `jsonwebtoken` riêng và định dạng token `Bearer <jwt>`, trong khi Backend chính của May 10 sử dụng CommonJS, `pg-pool`, và cơ chế bảo mật HMAC-SHA256 chuẩn (`erp_token_{userId}_{timestamp}.{signature}`).
     - *Database mapping:* Branch `ph1-bh-qlkh` thiết kế mapping đúng 100% tên bảng và cấu trúc của PostgreSQL `erp_may10` (`khach_hang`, `don_ban_hang`, `chi_tiet_don_ban_hang`, `giao_hang`, `hoa_don_ban_hang`, `cong_no`). Không tạo database riêng, không làm sai lệch schema.
     - *Liên thông PH2 & PH4:* Logic trong branch `ph1-bh-qlkh` tôn trọng nguyên tắc bảo vệ tồn kho (không tự trừ `ton_kho`, không tự tạo `phieu_xuat_kho`). Tuy nhiên, chưa kết nối trực tiếp đến API KHSX của PH2 hay API Phiếu xuất của PH4.

3. **Quyết định kiểm toán cuối cùng:**  
   **C. NOT READY — IMPLEMENTATION REQUIRED (CHƯA ĐỦ ĐIỀU KIỆN TÍCH HỢP TRỰC TIẾP, CẦN TRIỂN KHAI BƯỚC MIGRATE/ADAPTATION).**  
   *Lý do:* Không thể merge trực tiếp branch `ph1-bh-qlkh` vì sẽ xóa sổ Core Portal và toàn bộ PH2, PH3, PH4. Logic nghiệp vụ của PH1 cần được tích hợp/chuyển giao có chọn lọc vào nền tảng đã đóng băng của ERP May 10 tương tự như quy trình đã thực hiện thành công cho PH2 và PH3.

---

## 2. SOURCE AUDIT (KIỂM TOÁN NGUỒN MÃ)

| Thành phần | Branch `ph1-bh-qlkh` | ERP Hiện tại (`E:\ERP`) | Nhận xét & Đánh giá tương thích |
| :--- | :--- | :--- | :--- |
| **Frontend Stack** | React 19 + Vite + `@astryxdesign/core` + `@stylexjs` + `@tanstack/react-query` | React 18 + Vite + Tailwind CSS 3.4.x + Lucide Icons | ❌ **XUNG ĐỘT KIẾN TRÚC**: PH1 dùng thư viện UI độc lập (`@astryxdesign`), đã xóa bỏ toàn bộ MainLayout, Tailwind CSS, và các page PH2, PH3, PH4 trong branch của họ. |
| **Backend Stack** | Node.js + TypeScript (ESM, `tsx`) + Express 4.21 + Zod | Node.js + CommonJS + Express + Native Validation/Joi | ⚠️ **LỆCH PHÂN NGỮ NGUỒN**: Cần biên dịch hoặc đóng gói adapter để chạy trong hệ sinh thái Node.js của `E:\ERP\backend`. |
| **Authentication** | JWT chuẩn qua `jsonwebtoken` (HS256) | HMAC-SHA256 Token (`erp_token_{userId}_{timestamp}.{sig}`) | ❌ **KHÔNG TƯƠNG THÍCH AUTH**: PH1 backend dùng JWT bí mật riêng, không đọc được token định dạng May 10 Core. |
| **Database Driver** | `pg` Pool + raw SQL queries qua repositories | `pg` Pool qua `src/config/database.js` | ✅ **TƯƠNG THÍCH**: Cùng kết nối trực tiếp tới PostgreSQL 18.6 với các câu lệnh SQL chuẩn. |
| **Cấu trúc Backend** | `routes/` $\rightarrow$ `services/` $\rightarrow$ `repositories/` $\rightarrow$ DB | `routes/` $\rightarrow$ `controllers/` $\rightarrow$ `config/database.js` | ⚠️ **CẦN ÁNH XẠ**: Cần chuẩn hóa cấu trúc gọi controller thống nhất với các phân hệ khác. |

---

## 3. FUNCTIONAL AUDIT (KIỂM TOÁN 10 CHỨC NĂNG NGHIỆP VỤ PH1)

| Mã FR | Tên nghiệp vụ yêu cầu | Trạng thái trên `ph1-bh-qlkh` | Frontend | Backend | Database | Đánh giá chi tiết |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-01** | Quản lý khách hàng | **HOÀN THIỆN** | `CustomerListPage.tsx`, `CustomerCreatePage.tsx`, `CustomerDetailPage.tsx` | `customer.routes.ts`, `customer.service.ts`, `customer.repository.ts` | Bảng `khach_hang` | ✅ Tìm kiếm, phân trang, thêm mới, xem chi tiết, hạn mức nợ, số ngày nợ. |
| **FR-02** | Sản phẩm phục vụ bán hàng | **HOÀN THIỆN** | `ProductListPage.tsx`, `ProductSelector.tsx` | `product.routes.ts`, `product.service.ts`, `product.repository.ts` | Bảng `san_pham`, `don_vi_tinh` | ✅ Tra cứu danh mục sản phẩm, xem giá niêm yết bán hàng `gia_ban`. Read-only với Sales. |
| **FR-03** | Báo giá | **CHƯA CÓ TRUYỀN THỐNG** | Không có màn hình RFQ/Báo giá riêng | Không có bảng `bao_gia` | Không có bảng trong DB | ℹ️ Schema DB May 10 không có bảng `bao_gia_khach_hang`. Giá bán được lấy trực tiếp từ `san_pham.gia_ban`. |
| **FR-04** | Đơn bán hàng | **HOÀN THIỆN** | `SalesOrderListPage.tsx`, `SalesOrderCreatePage.tsx`, `SalesOrderDetailPage.tsx` | `order.routes.ts`, `order.service.ts`, `order.repository.ts` | Bảng `don_ban_hang`, `chi_tiet_don_ban_hang` | ✅ Lập đơn, chọn khách hàng, chọn nhiều sản phẩm, tự động tính tổng tiền hàng, thuế, chiết khấu. |
| **FR-05** | Duyệt đơn bán hàng | **HOÀN THIỆN** | Button "Xác nhận đơn" trong `SalesOrderDetailPage.tsx` | `POST /api/v1/sales-orders/:id/confirm` | Cập nhật `don_ban_hang.trang_thai = 'da_xac_nhan'` | ✅ Kiểm soát hạn mức công nợ (`han_muc_cong_no`) trước khi xác nhận. |
| **FR-06** | Theo dõi trạng thái đơn | **HOÀN THIỆN** | `SalesOrderDetailPage.tsx` | `order.service.ts` | Enum `trang_thai` trong `don_ban_hang` | ✅ Quản lý chuỗi trạng thái: `cho_xac_nhan` $\rightarrow$ `da_xac_nhan` $\rightarrow$ `dang_san_xuat` $\rightarrow$ `da_giao` / `huy`. |
| **FR-07** | Liên kết Kế hoạch SX (PH2) | **CHƯA KẾT NỐI (MOCK/READ-ONLY)** | Hiển thị badge trạng thái sản xuất | Chỉ đổi status nội bộ hoặc đọc cờ | `ke_hoach_san_xuat.ma_don_ban_hang` | ⚠️ Chưa có API endpoint trigger trực tiếp sang `POST /api/v1/production/plans`. |
| **FR-08** | Liên kết xuất kho / Giao hàng | **HOÀN THIỆN HEADER** | `DeliveryListPage.tsx`, `DeliveryCreatePage.tsx`, `DeliveryDetailPage.tsx` | `delivery.routes.ts`, `delivery.service.ts`, `delivery.repository.ts` | Bảng `giao_hang` | ⚠️ Quản lý đợt giao hàng trên bảng `giao_hang`. Chưa kết nối sang `phieu_xuat_kho` của PH4. |
| **FR-09** | Tra cứu lịch sử bán hàng & Công nợ | **HOÀN THIỆN** | `ReceivableListPage.tsx`, `InvoiceListPage.tsx` | `receivable.routes.ts`, `invoice.routes.ts` | Bảng `hoa_don_ban_hang`, `cong_no` | ✅ Xuất hóa đơn, theo dõi công nợ phải thu, báo cáo tuổi nợ (aging report). |
| **FR-10** | Dashboard / Báo cáo bán hàng | **HOÀN THIỆN** | `DashboardPage.tsx` | `dashboard.routes.ts`, `dashboard.service.ts`, `dashboard.repository.ts` | Tổng hợp từ `don_ban_hang`, `hoa_don_ban_hang`, `khach_hang` | ✅ Biểu đồ doanh thu, cơ cấu trạng thái đơn hàng, Top khách hàng, Top sản phẩm. |

---

## 4. DATABASE AUDIT (KIỂM TOÁN CƠ SỞ DỮ LIỆU)

### 4.1. Đối chiếu Schema và Bảng dữ liệu:
Cơ sở dữ liệu `erp_may10` (PostgreSQL 18.6) hiện tại có đầy đủ **43 bảng**, trong đó toàn bộ các bảng liên quan đến PH1 đã tồn tại sẵn với cấu trúc hoàn toàn trùng khớp với thiết kế của branch `ph1-bh-qlkh`:
- `khach_hang`: Lưu trữ thông tin khách hàng, số điện thoại, địa chỉ, hạn mức nợ, số ngày nợ. Khóa chính `id`, khóa duy nhất `ma_khach_hang`.
- `don_ban_hang`: Lưu trữ thông tin đơn bán hàng, tổng tiền, thuế, giảm giá, người bán, trạng thái. Khóa chính `id`, khóa ngoại `ma_khach_hang` $\rightarrow$ `khach_hang(id)`.
- `chi_tiet_don_ban_hang`: Lưu trữ từng dòng mặt hàng, số lượng, đơn giá, chiết khấu, thành tiền. Khóa ngoại `ma_don_ban_hang` $\rightarrow$ `don_ban_hang(id)` (ON DELETE CASCADE), `ma_san_pham` $\rightarrow$ `san_pham(id)`.
- `giao_hang`: Quản lý giao nhận hàng hóa, mã kho xuất, ngày giao, người nhận, phương tiện vận chuyển.
- `hoa_don_ban_hang`: Quản lý hóa đơn bán hàng, tổng tiền trước/sau thuế, số tiền đã thu, ngày đáo hạn.
- `cong_no`: Quản lý công nợ khách hàng (`loai_cong_no = 'phai_thu'`).

### 4.2. Kiểm tra quy tắc toàn vẹn dữ liệu:
- **Zero Duplicate Tables:** Branch `ph1-bh-qlkh` **KHÔNG** tạo bảng mới, **KHÔNG** tạo `sales_db` riêng, **KHÔNG** làm trùng lặp bảng `san_pham`, `nguoi_dung`, hay `kho`.
- **Zero Schema Alteration:** Branch `ph1-bh-qlkh` khai thác 100% đúng tên các cột hiện hữu trong `schema.sql`.
- **Dữ liệu mồ côi (Orphan Records):** Hệ thống khóa ngoại (`FOREIGN KEY`) được thiết lập chặt chẽ; không có bản ghi mồ côi trên live DB.

---

## 5. PH1 $\rightarrow$ PH2 INTEGRATION READINESS (LIÊN THÔNG PH1 $\rightarrow$ PH2)

- **Hiện trạng trên branch `ph1-bh-qlkh`:**
  - Branch này coi việc chuyển đơn hàng sang sản xuất là cập nhật trạng thái `don_ban_hang.trang_thai = 'dang_san_xuat'` do quyền `admin` hoặc `san_xuat`.
  - Trong source của PH1 **chưa gọi trực tiếp REST API của PH2** (`/api/v1/production/plans`).
- **Nguyên tắc bảo vệ PH2 (Đã Freeze):**
  - Bảng `ke_hoach_san_xuat` trên CSDL có cột `ma_don_ban_hang` (khóa ngoại trỏ đến `don_ban_hang.id`).
  - Khi đơn bán hàng được xác nhận (`da_xac_nhan`), PH1 cần cho phép người dùng (hoặc tự động) phát hành Kế hoạch sản xuất bằng cách gọi qua **API chính thức của PH2**:
    `POST /api/v1/production/plans` với payload:
    ```json
    {
      "ma_san_pham": 1,
      "so_luong_ke_hoach": 1000,
      "ngay_bat_dau": "2026-10-01",
      "ngay_ket_thuc": "2026-10-25",
      "ma_don_ban_hang": 12,
      "ghi_chu": "Sản xuất phục vụ Đơn hàng DBH-2026-XXXX"
    }
    ```
  - **TUYỆT ĐỐI KHÔNG:** PH1 không được tự INSERT/UPDATE trực tiếp vào `ke_hoach_san_xuat` hay `lenh_san_xuat` để tránh phá vỡ quy tắc kiểm tra BOM Gate của PH2.

---

## 6. PH1 $\rightarrow$ PH4 INTEGRATION READINESS (LIÊN THÔNG PH1 $\rightarrow$ PH4)

- **Hiện trạng trên branch `ph1-bh-qlkh`:**
  - Trong tài liệu kiến trúc `docs/architecture/module-ownership.md` của branch `ph1-bh-qlkh`, nhóm phát triển đã xác định rõ:
    > *"Delivery completion (giao_hang.trang_thai = 'da_giao') DOES NOT deduct inventory or generate inventory transactions. The Delivery module manages delivery logistics, status tracking only."*
  - Branch PH1 tuân thủ tốt nguyên tắc: **KHÔNG tự ý UPDATE `ton_kho`** và **KHÔNG tự tiện can thiệp `phieu_xuat_kho`**.
- **Nguyên tắc bảo vệ PH4 (Đã Freeze):**
  - PH4 là đơn vị sở hữu độc quyền đối với tồn kho và xuất nhập kho.
  - Khi cần xuất kho giao hàng cho khách từ đơn bán hàng, hành động phải được thực thi qua API chính thức của PH4:
    `POST /api/v1/phieu-xuat` với `loai_xuat = 'xuat_ban_hang'` hoặc `giao_khach`, truyền kèm `ma_don_ban_hang`.
  - Cơ chế khóa dòng `SELECT ... FOR UPDATE` trong transaction của PH4 sẽ đảm bảo kho không bao giờ bị âm.

---

## 7. PH1 $\rightarrow$ PH3 ASSESSMENT (LIÊN THÔNG PH1 $\rightarrow$ PH3)

- **Đánh giá:** **NOT APPLICABLE**.
- Phân hệ 1 (Bán hàng) và Phân hệ 3 (Mua hàng & Nhà cung ứng) không có giao dịch trực tiếp. Mọi nhu cầu nguyên phụ liệu phục vụ đơn hàng bán đều phải đi qua luồng:
  $$\text{PH1 (Đơn bán)} \rightarrow \text{PH2 (KHSX \& MRP)} \rightarrow \text{PH3 (Yêu cầu mua sắm PR)} \rightarrow \text{PH4 (Nhập kho)}$$
- Không tạo các liên kết giả mạo giữa PH1 và PH3.

---

## 8. CORE PORTAL & UI COMPLIANCE AUDIT

- **Mức độ tuân thủ Core Portal:** ❌ **VI PHẠM NGUYÊN TẮC FROZEN CỦA CORE PORTAL**.
  - Branch `ph1-bh-qlkh` đã import trọn bộ design system ngoài (`@astryxdesign/core`, `@astryxdesign/theme-neutral`, `@stylexjs/stylex`) và tái cấu trúc `AppShell.tsx` riêng.
  - Các tệp nền tảng của Core Portal May 10 (`frontend/src/components/layout/MainLayout.jsx`, `Header.jsx`, `Sidebar.jsx`, `Breadcrumb.jsx`) đã bị xóa khỏi branch này.
  - Toàn bộ giao diện PH2, PH3, PH4 trong thư mục `frontend/src/pages/` cũng bị xóa hoàn toàn trên branch `ph1-bh-qlkh`.
- **Hệ quả & Yêu cầu:**
  - **KHÔNG THỂ MERGE TRỰC TIẾP** branch `ph1-bh-qlkh` vào repository chính.
  - Để tích hợp PH1 vào ERP May 10 mà không phá vỡ Core Portal, toàn bộ các màn hình của PH1 (Khách hàng, Đơn hàng, Giao hàng, Hóa đơn, Công nợ, Dashboard) phải được đưa vào khung `MainLayout` của Core Portal hiện tại (`/sales/*`), sử dụng Tailwind CSS và các icon chuẩn Lucide tương tự như PH2, PH3, PH4.

---

## 9. AUTHENTICATION & RBAC AUDIT

| Tiêu chí | Hiện trạng branch `ph1-bh-qlkh` | Chuẩn Core ERP May 10 | Đánh giá |
| :--- | :--- | :--- | :--- |
| **Token Scheme** | JWT tiêu chuẩn (`Bearer eyJhbG...`) | HMAC-SHA256 Token (`Bearer erp_token_...`) | ❌ Lệch chuẩn token hệ thống |
| **Canonical Roles** | Hỗ trợ `admin`, `ban_hang`, `kho`, `ke_toan` | Hỗ trợ `admin`, `ban_hang`, `san_xuat`, `mua_hang`, `kho`, `ke_toan` | ✅ Khớp danh mục vai trò canonical |
| **Quyền truy cập PH1** | Chỉ `ban_hang` và `admin` được tạo/sửa đơn | Khớp với quyền `ban_hang` và `admin` | ✅ Hoàn toàn phù hợp |
| **Header Trust** | Không tin `x-role` hay `x-user-id` từ client | Lấy danh tính từ token máy chủ đã ký | ✅ Đạt chuẩn Zero-Trust |

---

## 10. API ENDPOINTS INVENTORY (DANH MỤC REST API PH1)

Branch `ph1-bh-qlkh` đã xây dựng đầy đủ 22 endpoints nghiệp vụ:

| Method | Endpoint Path | Roles Cho Phép | Mục đích nghiệp vụ | Bảng DB tác động |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public | Đăng nhập hệ thống bán hàng | `nguoi_dung` |
| `GET` | `/api/v1/auth/me` | Authenticated | Lấy thông tin cá nhân | `nguoi_dung` |
| `GET` | `/api/v1/customers` | `admin`, `ban_hang`, `ke_toan` | Danh sách khách hàng (tìm kiếm, lọc, phân trang) | `khach_hang` |
| `POST` | `/api/v1/customers` | `admin`, `ban_hang` | Thêm mới khách hàng | `khach_hang` |
| `GET` | `/api/v1/customers/:id` | `admin`, `ban_hang`, `ke_toan` | Chi tiết hồ sơ khách hàng | `khach_hang` |
| `PATCH`| `/api/v1/customers/:id` | `admin`, `ban_hang` | Cập nhật thông tin khách hàng | `khach_hang` |
| `PATCH`| `/api/v1/customers/:id/status` | `admin` | Đổi trạng thái khách hàng | `khach_hang` |
| `GET` | `/api/v1/customers/:id/summary` | `admin`, `ban_hang`, `ke_toan` | Tổng hợp doanh số & công nợ khách hàng | `don_ban_hang`, `cong_no` |
| `GET` | `/api/v1/customers/:id/receivables`| `admin`, `ban_hang`, `ke_toan` | Lịch sử công nợ chi tiết của khách | `cong_no` |
| `GET` | `/api/v1/products` | `admin`, `ban_hang`, `kho`, `ke_toan` | Tra cứu sản phẩm bán hàng & giá niêm yết | `san_pham`, `don_vi_tinh` |
| `GET` | `/api/v1/products/:id` | `admin`, `ban_hang`, `kho`, `ke_toan` | Chi tiết sản phẩm | `san_pham` |
| `GET` | `/api/v1/sales-orders` | `admin`, `ban_hang`, `kho`, `ke_toan` | Danh sách đơn bán hàng | `don_ban_hang` |
| `POST` | `/api/v1/sales-orders` | `admin`, `ban_hang` | Tạo đơn bán hàng & tính giá máy chủ | `don_ban_hang`, `chi_tiet_don_ban_hang` |
| `GET` | `/api/v1/sales-orders/:id` | `admin`, `ban_hang`, `kho`, `ke_toan` | Chi tiết đơn bán hàng & dòng sản phẩm | `don_ban_hang`, `chi_tiet_don_ban_hang` |
| `PATCH`| `/api/v1/sales-orders/:id` | `admin`, `ban_hang` | Cập nhật đơn bán hàng (chờ xác nhận) | `don_ban_hang`, `chi_tiet_don_ban_hang` |
| `POST` | `/api/v1/sales-orders/:id/confirm` | `admin`, `ban_hang` | Xác nhận đơn hàng & kiểm soát hạn mức nợ | `don_ban_hang` |
| `POST` | `/api/v1/sales-orders/:id/cancel` | `admin`, `ban_hang` | Hủy đơn bán hàng | `don_ban_hang` |
| `GET` | `/api/v1/deliveries` | `admin`, `ban_hang`, `kho` | Danh sách các đợt giao hàng | `giao_hang` |
| `POST` | `/api/v1/deliveries` | `admin`, `kho`, `ban_hang` | Tạo đợt giao hàng | `giao_hang` |
| `GET` | `/api/v1/deliveries/:id` | `admin`, `ban_hang`, `kho` | Chi tiết đợt giao hàng | `giao_hang` |
| `POST` | `/api/v1/deliveries/:id/start` | `admin`, `kho` | Bắt đầu giao hàng (`dang_giao`) | `giao_hang` |
| `POST` | `/api/v1/deliveries/:id/complete` | `admin`, `kho` | Hoàn thành giao hàng (`da_giao`) | `giao_hang` |
| `GET` | `/api/v1/invoices` | `admin`, `ban_hang`, `ke_toan` | Danh sách hóa đơn bán hàng | `hoa_don_ban_hang` |
| `POST` | `/api/v1/invoices` | `admin`, `ke_toan` | Xuất hóa đơn & sinh công nợ phải thu | `hoa_don_ban_hang`, `cong_no` |
| `GET` | `/api/v1/receivables` | `admin`, `ban_hang`, `ke_toan` | Danh sách công nợ phải thu | `cong_no` |
| `GET` | `/api/v1/receivables/aging` | `admin`, `ke_toan` | Báo cáo phân tích tuổi nợ (Aging) | `cong_no` |
| `GET` | `/api/v1/dashboard/summary` | `admin`, `ban_hang`, `kho`, `ke_toan` | Chỉ số KPI bán hàng & doanh thu | Tổng hợp đa bảng |

---

## 11. TEST & BUILD AUDIT

1. **Test Coverage trên branch `ph1-bh-qlkh`:**
   - Đã viết 24 file kiểm thử (`*.test.ts`) kiểm tra chi tiết từng Service, Route, Validation và Middleware.
   - Các kịch bản kiểm tra logic tính tiền (đơn giá, thuế, chiết khấu) và chặn vượt hạn mức tín dụng được thiết kế rất chặt chẽ.
2. **Build Audit trên repository hiện tại (`E:\ERP`):**
   - Lệnh `npm run build` tại `frontend/` của `E:\ERP`: **PASS (0 lỗi, hoàn thành trong 30.72s)**.
   - Core Portal, PH2, PH3, PH4 hiện tại hoàn toàn nguyên vẹn và biên dịch thành công.

---

## 12. RISK MATRIX & FINDINGS (MA TRẬN RỦI RO & PHÁT HIỆN)

| Mức độ | Vấn đề phát hiện | Rủi ro tiềm ẩn | Biện pháp xử lý ở STEP 2 |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | Branch `ph1-bh-qlkh` đã xóa toàn bộ UI của Core Portal, PH2, PH3, PH4. | Nếu merge nhánh bằng lệnh git thông thường, toàn bộ hệ thống ERP May 10 sẽ bị phá hủy hoàn toàn. | **TUYỆT ĐỐI KHÔNG DÙNG `git merge`**. Áp dụng phương pháp Selective Migration (Chuyển giao chọn lọc). |
| **HIGH** | Bất đồng bộ công nghệ Frontend (`@astryxdesign/core` vs Tailwind CSS May 10). | Giao diện bị vỡ style, xung đột layout, mất thanh điều hướng tập trung của Core Portal. | Chuyển đổi toàn bộ UI PH1 sang cấu trúc React 18 + Tailwind CSS chuẩn của Core Portal V2.11. |
| **HIGH** | Bất đồng bộ Token Authentication (JWT vs HMAC Token May 10). | Người dùng đăng nhập từ Core Portal không thể gọi API của PH1 và ngược lại. | Chuẩn hóa API PH1 về dùng chung middleware `requireAuth` và hệ thống token hiện tại của May 10. |
| **MEDIUM** | PH1 chưa kích hoạt tạo Kế hoạch sản xuất sang PH2. | Đơn bán hàng không tự động chuyển thành kế hoạch sản xuất trong nhà máy. | Bổ sung API/UI trigger từ Đơn bán sang `POST /api/v1/production/plans`. |
| **LOW** | Chênh lệch giữa TypeScript và CommonJS ở Backend. | Không chạy được chung một tiến trình server nếu không cấu hình runtime thích hợp. | Chuyển đổi mã backend của PH1 thành module Express chuẩn trong `backend/src/controllers/salesController.js` và `salesRoutes.js`. |

---

## 13. FINAL DECISION & NEXT STEPS (KẾT LUẬN & BƯỚC TIẾP THEO)

### KẾT LUẬN KIỂM TOÁN:
```
========================================================================
FINAL DECISION: C. NOT READY — IMPLEMENTATION REQUIRED
(CHƯA ĐỦ ĐIỀU KIỆN TÍCH HỢP TRỰC TIẾP — CẦN THỰC HIỆN BƯỚC CHUYỂN ĐỔI CHỌN LỌC)
========================================================================
```

### Kế hoạch hành động khuyến nghị cho STEP 2 (Backend Implementation) & STEP 3 (Frontend Integration):
1. **Bảo tồn nguyên trạng:** Giữ nguyên 100% Core Portal, PH2 (Sản xuất), PH3 (Mua hàng), PH4 (Kho) và schema PostgreSQL `erp_may10`.
2. **Backend (Step 2):** Tiếp nhận toàn bộ Business Logic xuất sắc của `order.service.ts`, `customer.service.ts`, `delivery.service.ts`, `invoice.service.ts`, `receivable.service.ts` từ `ph1-bh-qlkh` để đưa vào `backend/src/controllers/salesController.js` và `backend/src/routes/salesRoutes.js` trên nền tảng CommonJS + HMAC-SHA256 Auth hiện hữu.
3. **Frontend (Step 3):** Tái tạo các trang Bán hàng, Khách hàng, Đơn hàng, Giao hàng, Hóa đơn, Công nợ, Dashboard trong `frontend/src/pages/sales/` kế thừa `MainLayout` và Tailwind CSS của May 10.
4. **Liên thông PH1 $\rightarrow$ PH2 & PH4:** Kết nối hợp đồng API chính thức giữa Đơn bán hàng $\rightarrow$ KHSX PH2 và Đơn bán hàng $\rightarrow$ Phiếu xuất kho PH4.

---

PH1 STEP 1 AUDIT COMPLETE — NO CODE CHANGED
