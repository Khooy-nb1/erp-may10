# TỔNG QUAN CỔNG ĐIỀU HÀNH ERP MAY 10 (CORE ERP PORTAL)
**TỔNG CÔNG TY MAY 10 - CTCP**  
**Dự án:** Hiện đại hóa Hệ thống Quản trị Doanh nghiệp Dệt may ERP May 10  
**Phiên bản:** ERP 2.0 (Giai đoạn đóng băng PH4 & Sẵn sàng tích hợp toàn hệ thống)

---

## 1. Mục Đích & Sứ Mệnh Của Cổng Điều Hành

Cổng điều hành tập trung (**Core ERP Portal**) là trung tâm chỉ huy số của Tổng Công ty May 10, đóng vai trò:

1. **Cửa ngõ truy cập duy nhất (Single Point of Entry):**  
   Tất cả cán bộ, công nhân viên từ Ban Tổng Giám đốc, Phòng Kinh doanh (PH1), Phòng Kỹ thuật & Quản lý SX (PH2), Phòng Cung ứng (PH3), Bộ phận Kho vận (PH4) đến Phòng Tài chính Kế toán (PH5) đều truy cập làm việc qua một giao diện tập trung.

2. **Bức tranh điều hành toàn cảnh (Executive Panoramic Dashboard):**  
   Cung cấp chỉ số KPI chuỗi cung ứng dệt may tức thời, mật độ giao dịch chứng từ, cảnh báo mức tồn an toàn nguyên phụ liệu (vải kate, poplin, khaki, chỉ may, cúc áo).

3. **Trung tâm kiểm soát phân quyền (RBAC Engine):**  
   Áp dụng mô hình **Role-Based Access Control** đa tầng, bảo mật theo đúng chức năng nhiệm vụ của 6 nhóm vai trò trong doanh nghiệp.

4. **Trục tích hợp xuyên suốt 5 phân hệ (Cross-Module Backbone):**  
   Xây dựng trên nền tảng **Cơ sở dữ liệu tập trung PostgreSQL `erp_may10` (Schema `public`, 41 bảng)**, loại bỏ triệt để hiện tượng phân mảnh dữ liệu (Data Silos) và bảo toàn tính toàn vẹn khóa ngoại (Foreign Keys).

---

## 2. Bản Đồ 5 Phân Hệ ERP May 10

| Mã PH | Tên Phân Hệ | Vai Trò Trong Chuỗi Giá Trị May 10 | Trạng Thái Hệ Thống |
| :--- | :--- | :--- | :--- |
| **PH1** | Bán hàng & Khách hàng | Tiếp nhận đơn đặt hàng may thời trang (SO), hợp đồng gia công xuất khẩu, quản lý đối tác. | Sẵn sàng tích hợp (Database sẵn có) |
| **PH2** | Sản xuất & Định mức NPL | Bóc tách BOM kỹ thuật (vải, chỉ, phụ liệu), lập chuyền may, phát hành Lệnh sản xuất (LSX). | Sẵn sàng tích hợp (Database sẵn có) |
| **PH3** | Mua hàng & Nhà cung cấp | Theo dõi nhu cầu NPL từ LSX, phát hành đơn mua hàng (PO), kiểm soát NCC vải dệt/nhuộm. | Sẵn sàng tích hợp (Database sẵn có) |
| **PH4** | Kho & Quản lý vật tư | Nhập kho, định vị kệ, quản lý lô/cây vải FEFO, cấp phát NPL chuyền may, điều chuyển, kiểm kê. | **Hoạt động 100% (Audited & Frozen)** |
| **PH5** | Tài chính – Kế toán & Giá thành | Hạch toán kho tự động Nợ/Có, quản lý công nợ NCC/khách hàng, tính giá thành đơn hàng may. | Sẵn sàng tích hợp (Database sẵn có) |

---

## 3. Đặc Tính Cốt Lõi Của Phiên Bản

* **Nhận diện thương hiệu May 10:** Tông màu đỏ đô truyền thống `#8B1E2D` kết hợp nền xám trang nhã `#F7F7F5`, font chữ chuẩn công nghiệp, responsive trên Desktop, Tablet và Mobile.
* **Bảo toàn 100% PH4:** Tích hợp liền mạch toàn bộ 8 màn hình nghiệp vụ kho đã được nghiệm thu và đóng băng tại STEP 4D mà không sửa đổi bất kỳ dòng mã logic nào.
* **Minh bạch dữ liệu:** Phân biệt rõ ràng giữa chỉ số thực tế từ PostgreSQL (PH4) và trạng thái chờ kết nối của các phân hệ tương lai (PH1, PH2, PH3, PH5), tuyệt đối không dùng dữ liệu giả mạo (fake data).
