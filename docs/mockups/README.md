# BỘ MOCKUP WIREFRAME GIAO DIỆN PHÂN HỆ 4 — KHO & QUẢN LÝ VẬT TƯ
## TÀI LIỆU MINH HỌA DÙNG CHO BÁO CÁO ĐỒ ÁN ERP MAY 10

Bộ mockup wireframe được thiết kế đồng bộ theo tỷ lệ chuẩn **Desktop 16:9 (1600 x 900 px)**, định dạng **PNG** độ nét cao, phong cách phác thảo giao diện Enterprise ERP tối giản (nét vẽ xám đen, nền trắng/sáng, bảng biểu chuẩn mực, không dùng hiệu ứng 3D hay màu mè). 

Tất cả các hình ảnh đều dùng chung một bộ khung nhận diện (Header May 10, Sidebar 8 chức năng, highlight menu chuẩn), đảm bảo tính nhất quán của một hệ thống ERP thực tế.

---

### DANH MỤC HÌNH ẢNH MINH HỌA VÀ ĐỀ XUẤT CHÚ THÍCH BÁO CÁO

| STT | Tên file ảnh (PNG 16:9) | Tên màn hình | Đề xuất chú thích chèn vào Báo cáo / Đồ án |
|:---:|---|---|---|
| **01** | `01_dashboard_kho.png` | Dashboard Kho | **Hình 4.1.** Mockup giao diện Dashboard Kho & Quản lý vật tư |
| **02** | `02_quan_ly_vat_tu.png` | Danh mục vật tư | **Hình 4.2.** Mockup giao diện Danh mục và Quản lý định mức vật tư |
| **03** | `03_quan_ly_kho.png` | Quản lý kho & Vị trí | **Hình 4.3.** Mockup giao diện Quản lý kho và Sơ đồ vị trí kệ ô |
| **04** | `04_phieu_nhap_kho.png` | Phiếu nhập kho | **Hình 4.4.** Mockup giao diện Danh sách phiếu nhập kho |
| **05** | `05_chi_tiet_phieu_nhap.png` | Chi tiết phiếu nhập | **Hình 4.5.** Mockup giao diện Chi tiết phiếu nhập kho và Ghi tăng tồn kho |
| **06** | `06_phieu_xuat_kho.png` | Phiếu xuất kho | **Hình 4.6.** Mockup giao diện Danh sách phiếu xuất kho sản xuất và bán hàng |
| **07** | `07_chuyen_kho.png` | Chuyển kho nội bộ | **Hình 4.7.** Mockup giao diện Lập phiếu điều chuyển kho nội bộ |
| **08** | `08_kiem_ke.png` | Kiểm kê & Cân đối kho | **Hình 4.8.** Mockup giao diện Đối soát kiểm kê và Cân đối tồn kho thực tế |
| **09** | `09_lo_vat_tu.png` | Quản lý Lô & Cây vải | **Hình 4.9.** Mockup giao diện Quản lý Lô vật tư, Cây vải và Hạn sử dụng |
| **10** | `10_the_kho.png` | Thẻ kho (Stock Card) | **Hình 4.10.** Mockup giao diện Tra cứu Thẻ kho (Stock Card) chi tiết |

---

### ĐẶC TẢ CHI TIẾT 10 MÀN HÌNH WIREFRAME

#### 1. Mockup 01 — `01_dashboard_kho.png`
- **Mục đích:** Thể hiện bức tranh toàn cảnh về hoạt động kho vận của Tổng Công ty May 10.
- **Khu vực hiển thị:**
  - 6 thẻ chỉ số KPI điều hành: Tổng số vật tư (`1.240`), Tổng tồn kho (`158.420`), Giá trị tồn kho (`14,8 tỷ VNĐ`), Vật tư dưới định mức (`12`), Phiếu nhập trong kỳ (`48`), Phiếu xuất trong kỳ (`65`).
  - Bảng cảnh báo: "Vật tư dưới định mức an toàn (Cần mua bổ sung)" hiển thị mã VT, tên VT, kho, tồn kho, mức tối thiểu, mức thiếu hụt.
  - Khung "Hoạt động kho gần đây" hiển thị nhật ký các giao dịch nhập, xuất, chuyển, kiểm kê mới nhất.

#### 2. Mockup 02 — `02_quan_ly_vat_tu.png`
- **Mục đích:** Quản lý danh mục nguyên phụ liệu dệt may tập trung.
- **Khu vực hiển thị:**
  - Thanh công cụ: Ô tìm kiếm đa năng, Bộ lọc nhóm vật tư (Vải chính, Phụ liệu, Bao bì), Bộ lọc trạng thái tồn kho, Nút `[+ Thêm vật tư mới]`.
  - Bảng dữ liệu: Checkbox chọn nhiều dòng, Mã VT (`VT001` - `VT007`), Tên vật tư & Quy cách kỹ thuật (sợi dệt, khổ vải, định lượng), ĐVT, Tồn khả dụng, Đơn giá vốn bình quân, Kho lưu trữ, Trạng thái, Cột thao tác (`[Sửa]`, `[Thẻ kho]`).
  - Thanh phân trang chuẩn: `◀ 1 2 3 4 5 ▶`.

#### 3. Mockup 03 — `03_quan_ly_kho.png`
- **Mục đích:** Thiết lập mạng lưới kho và cây phân cấp vị trí lưu trữ hàng hóa.
- **Khu vực hiển thị:**
  - Bảng danh mục kho: Kho Nguyên Phụ Liệu Số 1 (`WH-NPL`), Kho Thành Phẩm May 10 (`WH-TP`), Kho Phụ Liệu May Mặc (`WH-PL`), Kho Bán Thành Phẩm (`WH-CAT`).
  - Thông tin đi kèm: Địa điểm cụ thể trong khuôn viên nhà máy May 10, sức chứa thiết kế, số mặt hàng đang lưu trữ, thủ kho phụ trách.
  - Khung mô tả cấu trúc định danh vị trí: Phân cấp 6 tầng chuẩn hóa: `Kho (WH) ➔ Khu vực (Zone) ➔ Dãy (Aisle) ➔ Kệ (Rack) ➔ Tầng (Shelf) ➔ Ô (Bin Code: VT-A-01-02-01)`.

#### 4. Mockup 04 — `04_phieu_nhap_kho.png`
- **Mục đích:** Theo dõi quy trình tiếp nhận nguyên phụ liệu từ Nhà cung cấp và nhập điều chuyển.
- **Khu vực hiển thị:**
  - Bộ lọc: Tìm kiếm theo mã phiếu, bộ lọc kho nhập, bộ lọc trạng thái (`Chờ xử lý`, `Đã nhập kho`, `Hoàn tất`), chọn ngày.
  - Bảng phiếu nhập: Mã phiếu tự sinh (`PNK-YYYYMMDD-XXXX`), ngày lập, nguồn nhập kèm mã đơn mua tham chiếu (`PO-089`), kho nhập, người lập phiếu, tổng số lượng, tổng giá trị (VNĐ), trạng thái quy trình.

#### 5. Mockup 05 — `05_chi_tiet_phieu_nhap.png`
- **Mục đích:** Minh họa nghiệp vụ xác nhận nhập kho thực tế làm tăng số dư tồn kho tức thời.
- **Khu vực hiển thị:**
  - Khung thông tin chứng từ: Mã phiếu, ngày giờ lập, Nhà cung cấp (`Cty Dệt May Hà Nội`), Kho nhận hàng, Đơn mua hàng tham chiếu (`PO-2026-0910-01`), Người lập (`Phạm Văn Kho`).
  - Bảng chi tiết dòng hàng: Mã VT, Tên vật tư, Lô sản xuất (`LÔ-202609-01`), Vị trí xếp (`A-01-02-01`), Số lượng nhập, ĐVT, Đơn giá, Thành tiền, và Cột tác động kho nổi bật (`↑ +3.000 m`).
  - Hàng tổng kết tài chính: Tổng số lượng, Tổng giá trị hàng, Thuế VAT 8%, Tổng thanh toán (`243.000.000 đ`).
  - Nút hành động: `[Hủy bỏ]`, `[In phiếu nhập]`, `[✅ Hoàn tất nhập kho (Tăng số dư tồn kho)]`.

#### 6. Mockup 06 — `06_phieu_xuat_kho.png`
- **Mục đích:** Theo dõi quy trình cấp phát nguyên phụ liệu cho các chuyền may và xuất bán hàng.
- **Khu vực hiển thị:**
  - Bộ lọc mục đích xuất: Xuất sản xuất theo lệnh (`LSX`), Xuất bán hàng (`SO`), Xuất kiểm định chất lượng, Xuất gia công thêu ngoài.
  - Bảng phiếu xuất: Mã phiếu (`PXK-YYYYMMDD-XXXX`), bộ phận nhận (Xưởng May 01, Xưởng May 02, Khách hàng Showroom), người lập, số lượng, trạng thái.
  - Khung thông báo bảo mật Concurrency: Ghi rõ cơ chế khóa dòng bi quan `SELECT ... FOR UPDATE` tự động chặn xuất âm tồn kho tức thời (Mã HTTP 409 Conflict).

#### 7. Mockup 07 — `07_chuyen_kho.png`
- **Mục đích:** Xử lý điều chuyển vật tư nội bộ giữa các kho vật lý.
- **Khu vực hiển thị:**
  - Khung thiết lập tuyến chuyển: Kho nguồn (Nơi trừ tồn) ➔ Kho đích (Nơi cộng tồn), thông tin thủ kho xuất và thủ kho nhận.
  - Bảng mặt hàng điều chuyển: Mã VT, tên vật tư, ĐVT, tồn kho xuất ban đầu, số lượng chuyển, tồn kho sau chuyển, vị trí xuất và vị trí đích dự kiến.
  - Nút xác nhận: `[🔄 Xác nhận chuyển kho (Giao dịch nguyên tử 2 bước)]`.

#### 8. Mockup 08 — `08_kiem_ke.png`
- **Mục đích:** Đối soát định kỳ giữa số dư sổ sách và tồn kho thực tế, cân đối chênh lệch.
- **Khu vực hiển thị:**
  - Khung thông tin đợt kiểm kê: Đợt kiểm kê (`PKK-20260910-001`), kho kiểm kê, ban kiểm kê liên tịch (Thủ kho + Kế toán kho).
  - Bảng đối soát: Tồn hệ thống (sổ sách), Tồn thực tế (đếm được), Chênh lệch (+/-), Giá trị chênh lệch (VNĐ), Lý do hao hụt (cắt mẫu, co ngót, đóng gói dư), Trạng thái xử lý.
  - Khung cân đối cuối trang: Tổng giá trị lệch cần xử lý (`-2.917.500 VNĐ`), nút `[⚖️ Xác nhận cân đối tồn kho (Cập nhật thẻ kho)]`.

#### 9. Mockup 09 — `09_lo_vat_tu.png`
- **Mục đích:** Quản lý truy xuất nguồn gốc theo Lô sản xuất (Lot/Batch) và Cây vải dệt may.
- **Khu vực hiển thị:**
  - Thanh chuyển tab: `[Danh sách vật tư] - [Quản lý Lô vật tư & Cây vải] - [Định mức tồn an toàn]`.
  - Bảng quản lý lô: Mã lô (`LO-KATE-2601`), Mã VT, Tên cây vải, Ngày nhập, Ngày sản xuất, Hạn sử dụng, Số lượng tồn, Vị trí ô, Trạng thái hạn dùng.
  - Chiến lược xuất kho: Tự động đề xuất theo nguyên tắc `FIFO` (Nhập trước xuất trước) cho vải cây may mặc và `FEFO` (Hạn trước xuất trước) cho keo ép mex/hóa chất nhuộm.

#### 10. Mockup 10 — `10_the_kho.png`
- **Mục đích:** Cung cấp Thẻ kho (Stock Card) chi tiết phục vụ đối soát nghiệp vụ và kiểm toán kế toán.
- **Khu vực hiển thị:**
  - Khung đầu: Mã VT (`VT001`), Tên vật tư (`Vải Kate Lụa Trắng`), Kho lưu trữ, ĐVT, Tồn đầu kỳ (`10.700 mét`), Tồn hiện tại (`12.450 mét`), khung chọn khoảng thời gian tra cứu.
  - Bảng lịch sử biến động: Cột Ngày CT, Số hiệu chứng từ (`DUK`, `PNK`, `PXK`, `PCK`, `PKK`), Diễn giải nghiệp vụ, Đơn giá vốn, Số lượng Nhập, Số lượng Xuất, Tồn kho lũy kế sau mỗi giao dịch, Người ký xác nhận.
  - Tổng kết chân trang: Tổng phát sinh nhập (`+4.500 m`), Tổng phát sinh xuất (`2.750 m`), Tồn cuối kỳ (`12.450 m`) tuân thủ Chế độ Kế toán Doanh nghiệp Thông tư 200/2014/TT-BTC.
