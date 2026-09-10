# TỔNG QUAN PHÂN HỆ MUA HÀNG & QUẢN LÝ NHÀ CUNG CẤP (PH3)
**Hệ thống:** ERP May 10  
**Phân hệ:** PH3 - Purchasing & Supplier Management (Mua hàng & Nhà cung cấp)  
**Nhánh:** `feature/ph3-purchasing`  
**Phiên bản:** 1.0.0  
**Ngày hoàn thiện:** 11/09/2026  

---

## 1. Mục tiêu và Định vị Nghiệp vụ
Phân hệ **PH3 (Mua hàng & Nhà cung cấp)** đóng vai trò mắt xích khởi đầu và then chốt trong chuỗi cung ứng của Tổng công ty May 10. Phân hệ đảm nhiệm:
1. **Quản lý Nhà cung cấp (Suppliers):** Quản lý hồ sơ pháp lý, mã số thuế, địa chỉ, hạn mức tín dụng, thời hạn nợ, điểm đánh giá chất lượng và danh mục nguyên phụ liệu cung cấp.
2. **Quy trình Đơn mua hàng (Purchase Orders - PO):** Lập PO từ nhu cầu thực tế, tính toán đơn giá, thành tiền và thuế VAT tự động (8%), quản lý phê duyệt đa cấp.
3. **Kiểm soát Trạng thái & Chống xung đột (State Machine & Concurrency Control):** Đảm bảo chuyển dịch trạng thái đơn hàng tuân thủ quy trình chuẩn (`cho_duyet` → `da_gui_ncc` → `da_xac_nhan` → `dang_giao` → `da_nhap_kho`), chống duyệt trùng lặp, chống hủy trùng lặp, chống xung đột ghi đồng thời bằng giao dịch ACID và khóa dòng bi quan `SELECT ... FOR UPDATE`.
4. **Tích hợp Liền mạch với Phân hệ Kho PH4:** Cung cấp danh sách đơn mua đủ điều kiện nhập kho và cập nhật tiến độ nhận hàng thực tế theo mã đơn mua hàng (`ma_don_mua_hang`), đồng bộ số lượng đã nhập vào chi tiết PO.
5. **Cung cấp Hợp đồng Dữ liệu KPI cho Core Homepage:** API `/api/v1/purchasing/core-kpi` phục vụ hiển thị số liệu thời gian thực trên Portal trung tâm mà không can thiệp trực tiếp vào mã nguồn Homepage.

---

## 2. Phạm vi Trách nhiệm (Boundaries & Ownership)

| Tiêu chí | Thuộc phạm vi PH3 | Không thuộc phạm vi PH3 (Frozen) |
|---|---|---|
| **Quản lý Nhà cung cấp** | CRUD nhà cung cấp, phân loại, đánh giá, kiểm soát hạn mức nợ | Master database chung `erp_may10` (bảng `nha_cung_cap`) |
| **Quản lý Đơn mua hàng** | Tạo PO, duyệt PO, hủy PO, quản lý chi tiết mặt hàng đặt mua | Quy trình tính nhu cầu tự động MRP (thuộc kế hoạch sản xuất PH2) |
| **Giao nhận hàng** | Quản lý trạng thái giao nhận (`dang_giao`, `da_nhap_kho`), tỷ lệ nhận | Thao tác vật lý kiểm kê, in tem mã vạch trong kho (thuộc PH4) |
| **Tích hợp Kho PH4** | Cung cấp PO chờ nhập kho, API cập nhật số lượng đã giao | Tạo phiếu nhập kho vật lý `phieu_nhap_kho`, cập nhật thẻ kho `the_kho` (thuộc PH4) |
| **Giao diện & UI** | 6 màn hình `/purchasing/*` lồng trong Core `MainLayout` | Core Portal Layout, Login, Header/Sidebar, Authentication Context |

---

## 3. Đối tượng Người dùng & Vai trò Sử dụng
- **Nhân viên Mua hàng / Cung ứng (`mua_hang`):**
  - Khảo sát và nhập liệu nhà cung cấp mới.
  - Lập đơn mua hàng (PO), theo dõi tiến độ giao hàng từ NCC.
  - Phối hợp với thủ kho đối chiếu số lượng thực nhận so với đơn đặt.
- **Lãnh đạo / Trưởng phòng Mua hàng / Ban Giám đốc (`admin` / `mua_hang` cấp cao):**
  - Phê duyệt đơn mua hàng hoặc từ chối / hủy đơn khi có biến động kế hoạch.
  - Xem báo cáo tổng hợp chi tiêu, cơ cấu nhà cung cấp, công nợ mua hàng.
- **Thủ kho / Nhân viên Quản lý Vật tư (`kho`):**
  - Tra cứu danh sách đơn mua hàng đã gửi NCC / đã xác nhận để chuẩn bị mặt bằng kho.
  - Thực hiện xác nhận số lượng nhận hàng tại điểm giao nhận liên kết với phân hệ PH4.

---

## 4. Cam kết Dữ liệu Thực (Zero Mock Policy)
- **100% Dữ liệu Thực:** Toàn bộ bảng dữ liệu, biểu đồ KPI, thẻ thống kê, danh sách nhà cung cấp, đơn mua hàng đều đọc và ghi trực tiếp vào cơ sở dữ liệu PostgreSQL.
- **Xử lý Khi Chưa Có Dữ liệu:** Nếu bảng chưa có bản ghi, giao diện hiển thị trạng thái chuẩn *"Chưa có dữ liệu"* hoặc *"0"*, tuyệt đối không chèn dữ liệu ảo, dữ liệu giả lập để làm đẹp màn hình.
