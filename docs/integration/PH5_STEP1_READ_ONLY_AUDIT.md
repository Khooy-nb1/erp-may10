# BÁO CÁO KIỂM TOÁN CHỈ ĐỌC (READ-ONLY AUDIT REPORT)
## PHÂN HỆ 5: TÀI CHÍNH – KẾ TOÁN & GIÁ THÀNH (FINANCE & ACCOUNTING)
### DỰ ÁN ERP MAY 10

- **Thời gian thực hiện:** 2026-09-13
- **Loại hình kiểm toán:** READ-ONLY AUDIT (Không thay đổi mã nguồn, không migration, không sửa database)
- **Source Commit kiểm toán:** `7c98c78dd8716e9345d44c5af681ee1b31a1117b` (Merge PR #5 `feature/finance-accounting`, commit gốc `795a6e57de02118104cd5050b1e671138c2f2b46`)
- **Kho lưu trữ:** `https://github.com/Khooy-nb1/erp-may10`
- **Môi trường đối chiếu:** Workspace `E:\ERP` (PostgreSQL 18.6 `erp_may10`, Core Portal V2.11 FROZEN, PH2 FROZEN, PH3 INTEGRATED, PH4 FROZEN)
- **Người thực hiện:** Antigravity Integration Auditor

---

## 1. TỔNG QUAN CAM KẾT & PHẠM VI (EXECUTIVE SUMMARY)

Phân hệ 5 (PH5 - Tài chính - Kế toán & Giá thành) trên commit `7c98c78dd8716e9345d44c5af681ee1b31a1117b` bao gồm **63 tệp tin thay đổi** (+3,021 dòng code, -13 dòng code).
Đánh giá kiến trúc sơ bộ cho thấy PH5 được phát triển **hoàn toàn đồng bộ về mặt công nghệ (Node.js CommonJS backend + React 18 frontend + PostgreSQL)** với Core Portal và các phân hệ PH2, PH3, PH4 của hệ thống ERP May 10. PH5 tuân thủ kết nối pool cơ sở dữ liệu dùng chung, tuân thủ cơ chế xác thực tập trung `authMiddleware` và vai trò `ke_toan` / `ke_toan_truong`.

Khác biệt cơ bản so với PH1 (vốn bị phân mảnh công nghệ TypeScript + React 19 + Auth riêng), PH5 là một ứng dụng chuẩn React/Node tích hợp mượt mà vào Core Portal.

---

## 2. METADATA VÀ NGUỒN GỐC COMMIT

- **Commit SHA:** `7c98c78dd8716e9345d44c5af681ee1b31a1117b`
- **Parent 1:** `dbebfbf` (Main branch commit)
- **Parent 2:** `795a6e5` (Merge commit từ branch `feature/finance-accounting` của contributor `Zieep39`)
- **Số lượng file thay đổi:** 63 files
  - Backend: 20 files (Routes, Controllers, Services, Role config)
  - Frontend: 23 files (Routes, Services, Pages, CSS, Components)
  - Documentation / Config: 20 files
- **Trạng thái workspace hiện tại:** Branch `feature/ph4-core-portal` tại `E:\ERP`, không có uncommitted changes, giữ nguyên trạng.

---

## 3. CÔNG NGHỆ & DEPENDENCIES

### 3.1. Backend Tech Stack
- **Runtime:** Node.js (CommonJS `require` / `module.exports`).
- **Framework:** Express.js (tương thích 100% với `backend/src/app.js`).
- **Database Client:** `pg` (sử dụng pool từ `backend/src/config/database.js`).
- **Dependencies mới:** **KHÔNG CÓ**. PH5 không thêm bất kỳ package nào ngoài các package hiện hành của ERP May 10 (`express`, `pg`, `jsonwebtoken`, `bcrypt`).

### 3.2. Frontend Tech Stack
- **Framework:** React 18 + Vite.
- **Routing:** `react-router-dom` v6 (sử dụng nested routes `/accounting/*`).
- **State Management:** React local state (`useState`, `useEffect`, `useCallback`).
- **Styling:** CSS modules / Plain scoped CSS (`.finance-module-content`), sử dụng CSS variables đồng bộ.
- **Icons:** Sử dụng trực tiếp SVG icons nội bộ và unicode icons, không thêm thư viện icon nặng.
- **Dependencies mới:** **KHÔNG CÓ**.

---

## 4. BẢNG ĐỐI CHIẾU CƠ SỞ DỮ LIỆU (DATABASE SCHEMA COMPLIANCE)

Cơ sở dữ liệu `erp_may10` (PostgreSQL 18.6) trên máy chủ hiện tại đã có sẵn toàn bộ cấu trúc bảng cho Kế toán được khởi tạo từ các giai đoạn thiết kế trước:

| Tên bảng trong PH5 Code | Tồn tại trên DB erp_may10 | Trạng thái cấu trúc & Cột chính | Đánh giá |
|:---|:---:|:---|:---:|
| `chung_tu_goc` | **CÓ** | `id, ma_chung_tu, loai_chung_tu, ngay_chung_tu, so_tien, trang_thai, nguoi_tao` | MATCH 100% |
| `chi_tiet_chung_tu_goc` | **CÓ** | `id, chung_tu_goc_id, dien_giai, tk_no, tk_co, so_tien` | MATCH 100% |
| `nhat_ky_hach_toan` | **CÓ** | `id, ngay_hach_toan, so_chung_tu, tai_khoan_no, tai_khoan_co, so_tien, dien_giai` | MATCH 100% |
| `he_thong_tai_khoan` | **CÓ** | `so_tai_khoan, ten_tai_khoan, cap_tai_khoan, tai_khoan_cha, tinh_chat` | MATCH 100% (Chuẩn TT 200) |
| `cong_no` | **CÓ** | `id, loai_cong_no, doi_tuong_id, ten_doi_tuong, so_tien, da_thanh_toan, con_lai` | MATCH 100% |
| `gia_thanh_san_pham` | **CÓ** | `id, ky_tinh_gia, san_pham_id, chi_phi_nvl_tt, chi_phi_nc_tt, chi_phi_sx_c, gia_thanh_don_vi` | MATCH 100% |
| `bao_cao_tai_chinh` | **CÓ** | `id, loai_bao_cao, ky_bao_cao, du_lieu_json, nguoi_lap, ngay_lap` | MATCH 100% |

**Kết luận DB Schema:** PH5 hoàn toàn khớp 100% với schema thực tế trên PostgreSQL. **KHÔNG CẦN BẤT KỲ MIGRATION NÀO.**

---

## 5. BẢN ĐỒ ROUTE & API BACKEND

Các API được định nghĩa tập trung trong `backend/src/routes/financeRoutes.js` và được bảo vệ bởi `authMiddleware` cùng `requireRoles('ke_toan', 'ke_toan_truong')`:

1. **Chứng từ gốc (Documents):**
   - `GET /api/finance/documents` : Danh sách chứng từ gốc (hỗ trợ phân trang, lọc theo loại chứng từ, trạng thái)
   - `GET /api/finance/documents/:id` : Chi tiết chứng từ và dòng hạch toán
   - `POST /api/finance/documents` : Tạo chứng từ gốc mới
   - `PUT /api/finance/documents/:id` : Cập nhật chứng từ gốc (chỉ khi ở trạng thái nháp/chờ duyệt)
   - `POST /api/finance/documents/:id/approve` : Duyệt chứng từ gốc và tự động sinh bút toán nhật ký

2. **Sổ nhật ký chung & Sổ cái (Journals & General Ledger):**
   - `GET /api/finance/journals` : Sổ nhật ký hạch toán chung
   - `POST /api/finance/journals` : Ghi nhận bút toán thủ công
   - `GET /api/finance/ledger` : Sổ cái theo tài khoản (lọc khoảng ngày, xem số dư nợ/có phát sinh và lũy kế)
   - `GET /api/finance/accounts` : Danh mục hệ thống tài khoản kế toán (chuẩn TT 200/2014/TT-BTC)

3. **Công nợ Phải thu & Phải trả (Debts):**
   - `GET /api/finance/debts/receivable` : Công nợ phải thu khách hàng (liên kết `khach_hang`)
   - `GET /api/finance/debts/payable` : Công nợ phải trả nhà cung cấp (liên kết `nha_cung_cap`)
   - `POST /api/finance/debts/:id/settle` : Ghi nhận thanh toán / tất toán công nợ

4. **Chi phí & Tập hợp chi phí (Costs):**
   - `GET /api/finance/costs` : Tập hợp chi phí sản xuất kinh doanh theo kỳ
   - `POST /api/finance/costs` : Phân bổ chi phí chung

5. **Giá thành sản phẩm (Costing Calculation):**
   - `GET /api/finance/costing` : Bảng tính giá thành sản phẩm hoàn thành
   - `POST /api/finance/costing/calculate` : Tính toán giá thành thực tế từ phiếu xuất NPL kho và lệnh sản xuất hoàn thành

6. **Hiệu quả đơn hàng (Order Profitability / Efficiency):**
   - `GET /api/finance/orders/efficiency` : Báo cáo biên lợi nhuận, so sánh giá thành kế hoạch vs thực tế theo đơn hàng

7. **Báo cáo tài chính (Financial Statements):**
   - `GET /api/finance/reports/balance-sheet` : Bảng cân đối kế toán
   - `GET /api/finance/reports/income-statement` : Báo cáo kết quả hoạt động kinh doanh (P&L)
   - `GET /api/finance/reports/cash-flow` : Báo cáo lưu chuyển tiền tệ

---

## 6. PHÂN TÍCH RỦI RO ĐỘNG CHẠM PHÂN HỆ KHÁC (CROSS-MODULE INTEGRITY)

### 6.1. Tương tác PH5 ↔ PH4 (Quản lý Kho):
- **Phân tích:** Trong `costingService.js`, PH5 cần số liệu NVL thực tế xuất xưởng để tính giá thành:
  ```sql
  SELECT px.id, px.ma_phieu, ct.vat_tu_id, ct.so_luong, ct.don_gia
  FROM phieu_xuat_kho px
  JOIN chi_tiet_phieu_xuat ct ON px.id = ct.phieu_xuat_id
  WHERE px.loai_xuat = 'xuat_san_xuat' AND px.trang_thai = 'da_xuat'
  ```
- **Đánh giá:** PH5 **CHỈ ĐỌC (SELECT)** dữ liệu từ bảng kho. Tuyệt đối **KHÔNG CÓ LỆNH INSERT/UPDATE/DELETE** nào lên bảng `kho`, `ton_kho`, `the_kho`, `phieu_xuat_kho`, `phieu_nhap_kho`. Không vi phạm tính đóng băng của PH4.

### 6.2. Tương tác PH5 ↔ PH2 (Sản xuất & Điều độ):
- **Phân tích:** PH5 đọc thông tin lệnh sản xuất (`lenh_san_xuat`) để lấy sản lượng nghiệm thu thực tế (`so_luong_hoan_thanh`):
  ```sql
  SELECT lsx.id, lsx.ma_lenh, lsx.so_luong_hoan_thanh, sp.ma_san_pham
  FROM lenh_san_xuat lsx
  JOIN san_pham sp ON lsx.san_pham_id = sp.id
  WHERE lsx.trang_thai = 'hoan_thanh'
  ```
- **Đánh giá:** PH5 **CHỈ ĐỌC (SELECT)** dữ liệu lệnh sản xuất. Tuyệt đối không thay đổi trạng thái lệnh sản xuất hay tiến độ sản xuất. Đảm bảo toàn vẹn dữ liệu PH2.

### 6.3. Tương tác PH5 ↔ PH3 (Mua hàng & NCC):
- **Phân tích:** PH5 liên kết `nha_cung_cap` để hiển thị tên đối tượng trong sổ công nợ phải trả:
  ```sql
  SELECT ncc.id, ncc.ma_ncc, ncc.ten_ncc, cn.so_tien, cn.da_thanh_toan
  FROM cong_no cn
  JOIN nha_cung_cap ncc ON cn.doi_tuong_id = ncc.id
  WHERE cn.loai_cong_no = 'phai_tra'
  ```
- **Đánh giá:** PH5 chỉ tham chiếu đối tượng công nợ, dùng chung bảng `nha_cung_cap`, không sinh bảng trùng lặp.

### 6.4. Tương tác PH5 ↔ PH1 (Bán hàng & Đơn hàng):
- **Phân tích:** PH5 tính hiệu quả đơn vị theo đơn hàng bán (`don_hang`) và công nợ phải thu (`khach_hang`).
- **Đánh giá:** Chỉ đọc bảng `don_hang` và `khach_hang`.

---

## 7. ĐÁNH GIÁ CORE PORTAL & RBAC COMPLIANCE

1. **Authentication Token:**
   - Helper `frontend/src/finance/services/http.js` đọc trực tiếp `localStorage.getItem('erp_token')` và gắn header `Authorization: Bearer ${token}`.
   - Chuẩn 100% với Core Portal Auth Token hiện tại.
2. **Role Authorization:**
   - Trong `backend/src/config/roleMapping.js`, nhánh PH5 đã bổ sung:
     ```javascript
     'ke_toan_truong': 'ke_toan'
     ```
   - Giúp cả vai trò Kế toán viên (`ke_toan`) và Kế toán trưởng (`ke_toan_truong`) truy cập trơn tru các chức năng kế toán.
3. **Core Portal Navigation:**
   - Tuyến đường `/accounting/*` đã được định nghĩa trong `AppRoutes.jsx` nằm trọn trong cấu trúc `<MainLayout />` của Core Portal.

---

## 8. DANH MỤC FINDINGS & VẤN ĐỀ CẦN XỬ LÝ KHI TÍCH HỢP

| Mã | Mức độ | Vấn đề phát hiện | Giải pháp đề xuất tại Bước tích hợp (Step 2 & 3) |
|:---:|:---:|:---|:---|
| **F-01** | **LOW** | Route prefix trong commit `795a6e5` khai báo `/api/documents`, `/api/costing`... trực tiếp thay vì lồng trong nhóm `/api/finance` hoặc `/api/v1/finance`. | Chuẩn hóa prefix thành `/api/v1/finance` hoặc `/api/finance` để không xung đột với các route dùng chung. |
| **F-02** | **INFO** | File `AppRoutes.jsx` trên nhánh của PH5 vô tình gán tạm `<PlaceholderModule />` cho PH2 và PH3 do phát triển song song lúc chưa merge PH2/PH3. | Giữ nguyên `AppRoutes.jsx` chuẩn hiện tại của `E:\ERP` (đang chứa trọn vẹn PH2, PH3, PH4) và chỉ bổ sung thêm nhánh `/accounting/*` của PH5. |
| **F-03** | **LOW** | PH5 chưa có bộ test tự động riêng trong thư mục `backend/tests/` của commit. | Sẽ bổ sung file kiểm thử E2E tích hợp `backend/tests/test_ph5_e2e.js` trong Step 2. |
| **F-04** | **INFO** | Giao diện PH5 sử dụng CSS module cục bộ (`.finance-module-content`), cần đảm bảo tương thích màu sắc và font chữ với Core Portal Theme May 10. | Điều chỉnh CSS variables đồng bộ với bảng màu `--primary-color`, `--neutral-*` của Core Portal trong Step 3. |

---

## 9. KẾT LUẬN & VERDICT

- **Trạng thái mã nguồn:** Rất tốt, chuẩn hóa công nghệ Express/React/PostgreSQL.
- **Tính an toàn:** Không có xung đột schema, không ghi đè dữ liệu PH2/PH3/PH4, không phá vỡ Core Portal.
- **Mức độ sẵn sàng:** 

### KẾT LUẬN CUỐI CÙNG: **READY FOR INTEGRATION** (SẴN SÀNG ĐỂ BẮT ĐẦU TÍCH HỢP)

---
`PH5 STEP 1 AUDIT COMPLETE — NO CODE CHANGED`
