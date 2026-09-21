# BÁO CÁO AUDIT TỔNG HỢP: CHƯƠNG 5 — PHÂN HỆ 4 (KHO & QUẢN LÝ VẬT TƯ)
**Dự án:** ERP May 10  
**Tài liệu:** Báo cáo đồ án tốt nghiệp / Luận văn ERP May 10  
**Phân hệ phụ trách:** PH4 — Quản lý kho và vật tư  
**Thời điểm hoàn thành:** 2026-09-10  
**Tác giả:** Kỹ sư tích hợp hệ thống & Viết tài liệu học thuật  

---

## 1. MỤC TIÊU & NGUYÊN TẮC THỰC HIỆN
- **Tính học thuật & Trung thực tối đa:** 100% nội dung bài viết, mã nguồn minh họa, số liệu bảng biểu và kết quả kiểm thử được đối chiếu trực tiếp từ mã nguồn thực tế (`E:\ERP\frontend\src`, `E:\ERP\backend\src`), cơ sở dữ liệu thực tế (PostgreSQL 18.6 `erp_may10`) và các kịch bản test tự động.
- **Phân biệt rõ ràng MOCKUP và SCREENSHOT:**
  - *MOCKUP:* Bản phác thảo wireframe vector vẽ tay (Hand-drawn black & white wireframe) phục vụ thiết kế kiến trúc/giao diện phác thảo mục 5.4.1.c. Tuyệt đối không nhầm lẫn với ảnh chụp màn hình.
  - *SCREENSHOT:* Ảnh chụp trực tiếp giao diện runtime đang chạy thực tế trên Google Chrome (Port 5173 kết nối API Port 5000 và PostgreSQL Port 5432) cho 3 chức năng đại diện tại mục 5.4.2.
- **Cam kết không sửa đổi Code/DB:** Không chỉnh sửa bất kỳ dòng mã nguồn nào của hệ thống, không thay đổi cấu trúc bảng hoặc dữ liệu nghiệp vụ, không commit hoặc push bất hợp pháp.

---

## 2. DANH SÁCH TÀI LIỆU & FILE ĐÃ TẠO

Toàn bộ tài liệu và tư liệu hình ảnh được lưu trữ tại thư mục quy chuẩn: `E:\ERP\docs\report\chapter5\`

| STT | Tên tập tin | Định dạng / Kích thước | Mô tả nội dung |
|:---:|:---|:---:|:---|
| 1 | `CHUONG_5_PH4_KHO_QUAN_LY_VAT_TU.md` | Markdown (~46.5 KB, 474 dòng) | Toàn văn nội dung Chương 5 — Mục 5.4 theo đúng cấu trúc học thuật chuẩn đồ án tốt nghiệp. |
| 2 | `CHAPTER5_PH4_ASSETS.md` | Markdown (~4.2 KB) | Bảng tra cứu, ánh xạ toàn bộ hình ảnh biểu đồ, mockup và screenshot thực tế. |
| 3 | `CHAPTER5_PH4_AUDIT_REPORT.md` | Markdown (~4.5 KB) | Báo cáo kiểm định tổng hợp (Audit report) nghiệm thu toàn bộ tư liệu tạo dựng. |

---

## 3. DANH SÁCH HÌNH BÀI BÁO CÁO & MINH CHỨNG RUNTIME

### A. Biểu đồ kiến trúc & Mockup phác thảo (`docs/report/chapter5/figures/`)
1. **Hình 5.1 — `figures/5_4_1_a_bieu_do_thanh_phan.png` (102.9 KB):**
   - *Loại hình:* UML Component Diagram (Biểu đồ thành phần 4 tầng).
   - *Nội dung:* Thể hiện Presentation Layer (React 18 + Tailwind), Application Layer (Express Router/Controllers), Data Access Layer (Pool Client, Transactions) và Database Layer (PostgreSQL 18.6).
2. **Hình 5.2 — `figures/5_4_1_b_bieu_do_trien_khai.png` (91.2 KB):**
   - *Loại hình:* UML Deployment Diagram (Biểu đồ triển khai vật lý).
   - *Nội dung:* Client Desktop Browser kết nối HTTPS/WSS tới Node.js Web/API Server (Port 5173 / 5000), kết nối TCP/IP tới Database Server PostgreSQL 18.6 (Port 5432).
3. **Hình 5.3 — `figures/5_4_1_c_mockup_tong_quan_kho.png` (137.4 KB):**
   - *Loại hình:* Hand-drawn Wireframe UI Mockup (Bản vẽ tay đơn sắc phác thảo).
   - *Nội dung:* Phác thảo cấu trúc giao diện Tổng quan kho PH4: Sidebar phân hệ, KPIs thẻ kho, Bảng theo dõi định mức tồn kho và các nút tác vụ điều hướng.

### B. Ảnh chụp màn hình ứng dụng thực tế (`docs/report/chapter5/screenshots/`)
1. **Hình 5.4 — `screenshots/5_4_2_1_phieu_nhap_kho.png` (205.4 KB):**
   - *Chức năng:* Lập và quản lý Phiếu nhập kho vật tư may mặc.
   - *Route:* `http://localhost:5173/warehouse/receipts`
   - *Thành phần hiển thị:* Bộ lọc tìm kiếm, bảng danh sách phiếu nhập (PNK-20260309-001...), tình trạng trạng thái, modal lập phiếu nhập mới với thông tin số lô, hạn dùng, đơn giá và kho nhập.
2. **Hình 5.5 — `screenshots/5_4_2_2_phieu_xuat_kho.png` (207.9 KB):**
   - *Chức năng:* Lập và duyệt Phiếu xuất kho theo lô (Kiểm tra chống xuất âm).
   - *Route:* `http://localhost:5173/warehouse/issues`
   - *Thành phần hiển thị:* Danh sách phiếu xuất kho, bộ lọc trạng thái, form lập phiếu xuất kho chỉ định lô vật tư và cảnh báo kiểm soát tồn kho tức thời.
3. **Hình 5.6 — `screenshots/5_4_2_3_dieu_chuyen_kho.png` (201.5 KB):**
   - *Chức năng:* Điều chuyển vật tư nội bộ giữa các phân xưởng / kho tổng May 10.
   - *Route:* `http://localhost:5173/warehouse/transfers`
   - *Thành phần hiển thị:* Danh sách phiếu điều chuyển hai đầu kho (Kho xuất → Kho nhận), trạng thái vận chuyển, chi tiết số lượng chuyển đổi nguyên trạng số lô.

---

## 4. NGUỒN MÃ NGUỒN TRÍCH DẪN & ĐỐI CHIẾU THỰC TẾ

Tất cả các đoạn mã nguồn và logic trích dẫn trong Chương 5 được lấy chính xác từ các tệp tin trong dự án:

1. **Transaction & Tạo số lô nhập kho:**
   - Tập tin: `backend/src/controllers/phieuNhapController.js` (dòng 140–250).
   - Cơ chế: `pool.connect()`, `BEGIN`, sinh mã tự động `PNK-YYYYMMDD-XXX`, tạo mới bản ghi lô trong `lo_vat_tu`, ghi nhận `chi_tiet_phieu_nhap`, cập nhật tăng số lượng trong bảng `ton_kho` có khóa dòng `SELECT ... FOR UPDATE`, và `COMMIT`.
2. **Khóa chống xuất âm & Đồng thời:**
   - Tập tin: `backend/src/controllers/phieuXuatController.js` (dòng 156–217).
   - Cơ chế: Khóa dòng `SELECT so_luong FROM ton_kho WHERE ma_vat_tu = $1 AND ma_kho = $2 FOR UPDATE`. So sánh `tonHienTai < slXuat`, chủ động trả về mã lỗi HTTP 409 `INSUFFICIENT_STOCK` nếu thiếu hàng, trừ tồn theo lô trong `lo_vat_tu`.
3. **Điều chuyển kho nguyên tử 2 đầu:**
   - Tập tin: `backend/src/controllers/phieuChuyenController.js` (dòng 122–245).
   - Cơ chế: Ràng buộc `ma_kho_xuat !== ma_kho_nhap`, trừ tồn kho xuất và cộng tồn kho nhập cùng trong một Transaction duy nhất; nếu một trong hai thao tác gặp sự cố lập tức `ROLLBACK`.
4. **Cấu trúc cơ sở dữ liệu:**
   - Schema PostgreSQL: `backend/src/config/schema.sql` và cơ sở dữ liệu `erp_may10`.
   - Các bảng cốt lõi: `vat_tu`, `kho`, `lo_vat_tu`, `ton_kho`, `phieu_nhap`, `chi_tiet_phieu_nhap`, `phieu_xuat`, `chi_tiet_phieu_xuat`, `phieu_chuyen_kho`, `chi_tiet_phieu_chuyen`, `the_kho`, `users`, `roles`.

---

## 5. KẾT QUẢ KIỂM THỬ ĐÃ XÁC MINH (TEST RESULTS)

Hệ thống đã chạy thực nghiệm bộ kiểm thử tự động trên môi trường thực tế (Node.js v20.18.0, PostgreSQL 18.6):

### A. Kiểm thử chức năng và tích hợp (`tests/test_ph4_api.js`)
- **Tổng số ca kiểm thử:** 16/16 Test Cases đạt chuẩn (100% PASS).
- **Phạm vi kiểm tra:**
  1. Đăng nhập JWT & Phân quyền RBAC nhân viên kho.
  2. Tra cứu danh mục kho & vật tư dệt may.
  3. Lập phiếu nhập kho thành công & kiểm tra tăng tồn kho.
  4. Xác thực số lô (`ma_lo`) và hạn sử dụng.
  5. Xuất kho hợp lệ theo lô & kiểm tra giảm tồn kho.
  6. Ràng buộc chặn xuất âm khi số lượng yêu cầu vượt tồn hiện tại (HTTP 409).
  7. Ràng buộc điều chuyển kho (kho xuất khác kho nhận).
  8. Kiểm tra ghi nhận thẻ kho tự động (Audit trail).

### B. Kiểm thử tải đồng thời & Khóa dữ liệu (`tests/test_concurrency.js`)
- **Kịch bản:** 2 giao dịch song song đồng thời cùng yêu cầu xuất 60 đơn vị vải từ lô hàng chỉ còn tồn 100 đơn vị (Tổng cầu 120 > Tồn 100).
- **Kết quả thực tế:**
  - Giao dịch 1: Thành công (HTTP 201) — Trừ kho còn lại 40 đơn vị.
  - Giao dịch 2: Bị từ chối an toàn (HTTP 409 Conflict - `INSUFFICIENT_STOCK`).
  - Tồn kho cuối cùng: 40 đơn vị (Không xảy ra tình trạng Race Condition, không bị xuất âm).

---

## 6. ĐÁNH GIÁ MỨC ĐỘ HOÀN THIỆN VÀ PHẠM VI HỆ THỐNG
Trong bài báo cáo học thuật, nhóm tác giả đã trình bày trung thực, minh bạch về hiện trạng hệ thống:
- **Phân hệ 4 (Kho & Quản lý vật tư):** Hoàn thành trọn vẹn 100% phạm vi chức năng được giao, có đầy đủ frontend, backend, database và bộ test tích hợp.
- **Tích hợp toàn doanh nghiệp (Enterprise E2E):** Do các phân hệ PH1 (Kế hoạch kinh doanh), PH2 (Kỹ thuật công nghệ), PH3 (Kế hoạch sản xuất) và PH5 (Kế toán tài chính) đang trong quá trình phát triển độc lập của các nhóm khác, việc tích hợp xuyên suốt toàn doanh nghiệp được thực hiện thông qua chuẩn giao tiếp API/Hợp đồng dữ liệu (Data Contract) đã quy ước sẵn.

---

## 7. XÁC NHẬN CUỐI CÙNG
- [x] Không sửa đổi source code (`frontend/src`, `backend/src`).
- [x] Không chỉnh sửa cấu trúc database hoặc can thiệp dữ liệu ngoài test.
- [x] Không tạo Git commit hoặc push lên repository chung trong tác vụ này.
- [x] File báo cáo và hình ảnh được tổ chức đúng cấu trúc, sẵn sàng đưa trực tiếp vào Báo cáo Đồ án tốt nghiệp / Luận văn tốt nghiệp ERP May 10.
