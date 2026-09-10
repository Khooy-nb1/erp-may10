# TÀI LIỆU KỸ THUẬT V2.11 — TÁI HIỆN BẢN THIẾT KẾ HOMEPAGE ERP MAY 10
## PHIÊN BẢN CHUẨN HÓA VISUAL BLUEPRINT & TWO-COLUMN DASHBOARD LAYOUT

---

### 1. TỔNG QUAN YÊU CẦU & BỐI CẢNH
Dựa trên hình ảnh thiết kế đối chiếu mẫu (`media_1788974791237.png`), giao diện Trang chủ (`/`) của hệ thống May 10 ERP được nâng cấp giao diện trực quan chuẩn Enterprise Corporate Portal với các đặc điểm:
1. **Hero Section Toàn Cảnh May 10**: Sử dụng hình ảnh trụ sở chính Tổng Công ty May 10 với bầu trời xanh, cờ đỏ sao vàng và biểu tượng tòa nhà May 10 Garco 10. Tích hợp lớp phủ gradient mềm ở cánh trái để văn bản màu trắng luôn đạt độ tương phản tối đa.
2. **Top Navigation Thấu Kính (Transparent Glass Nav)**:
   - Khi ở đỉnh trang: Floating pill bằng kính mờ trong suốt (`bg-white/12 backdrop-blur-md border border-white/25`), chữ trắng, logo trắng, ô tìm kiếm kính trắng trong suốt, icon Home + "Trang chủ" được làm nổi bật.
   - Khi cuộn chuột (`scrollY > 30px`): Chuyển trạng thái mượt mà sang thanh kính mờ xanh dương nhạt (`bg-[#EBF5FF]/92 backdrop-blur-xl border border-white/60 shadow-lg text-[#164E78]`).
3. **Bố cục 2 Cột Dưới Hero**:
   - Cột trái (~256px): Thẻ điều hướng danh mục nhanh (`DashboardNavSidebar`) với các liên kết Trang chủ, Bán hàng & Đơn hàng, Sản xuất, Mua hàng, Kho & Vật tư, Tài chính, Quản trị cùng chevron chỉ hướng.
   - Cột phải (`flex-1 min-w-0`):
     - **Hàng 6 KPI chỉ số**: Đơn hàng tháng (258), Sản xuất (1.245.000), Tồn kho (856.320), Doanh thu (12.850.000.000), Công nợ phải thu (2.340.000.000), Công nợ phải trả (1.760.000.000) lấy dữ liệu thực từ `portalService.getDashboardSummary()`.
     - **Công việc cần xử lý (3 việc)**: Thiết kế dạng lưới 3 cột ngang (`grid-cols-1 md:grid-cols-3 gap-3.5`) với mức độ ưu tiên (Cao, Chờ xử lý, Định kỳ).
     - **Các khối chức năng nghiệp vụ**: Quy trình vận hành (Workflow), 5 phân hệ ERP (ModuleCards), Biểu đồ vận hành (ActivityChart), và Dòng thời gian chứng từ (RecentActivity).

---

### 2. CÁC THAY ĐỔI COMPONENT

#### A. `MainLayout.jsx`
- Đảm bảo Trang chủ (`isHomePage = location.pathname === '/'`) trải rộng 100% chiều ngang và đẩy lên mép trên cùng của màn hình dưới thanh header trong suốt (`w-full relative`).
- Giữ nguyên cấu trúc phân hệ (`/warehouse/*`, `/sales/*`, v.v.) với sidebar bên trái và breadcrumb tiêu chuẩn.

#### B. `Header.jsx`
- Tích hợp hook theo dõi vị trí cuộn `window.scrollY > 30`.
- Thêm logic `isTransparentOnHero = isHomePage && !isScrolled`.
- Tự động chuyển đổi màu chữ, biểu tượng, ô tìm kiếm và badge thông báo sang phiên bản trắng tinh tế khi nằm trên nền Hero trời xanh.
- Bảo lưu 100% Hover Bridge (padding `pt-2`) và timeout trễ 180ms đã giải quyết ở V2.10, chống biến mất dropdown menu con.

#### C. `DashboardHeader.jsx`
- Background: Toàn cảnh trụ sở chính May 10 chuẩn kích thước 1920x560 (`/images/may10-hero-bg.png`).
- Typography:
  - Lời chào: `Xin chào,`
  - Tên người dùng: `Quản Trị Viên Hệ Thống` (hoặc `user.ho_ten`) với cỡ chữ lớn `lg:text-[40px] font-bold text-white drop-shadow-md`.
  - Phụ đề: `Chào mừng bạn đến với hệ thống ERP Tổng Công ty May 10`.
  - Live Badges: Thẻ pill trạng thái `[🟢 Hệ thống đang hoạt động]` và `[🕒 Thứ Tư, 09/09/2026 | 08:30]`.

#### D. `DashboardNavSidebar.jsx`
- Component điều hướng danh mục nhanh dạng card độc lập.
- Sử dụng các icon chuẩn Lucide tương ứng với các phân hệ May 10.
- Highlight mục đang truy cập với màu nền `#EAF5FC` và chữ xanh `#0F5FAF`.

#### E. `KPISection.jsx`
- Tái cấu trúc thành hàng 6 thẻ KPI:
  1. Đơn hàng tháng
  2. Sản xuất
  3. Tồn kho (highlight PH4 kết nối trực tiếp CSDL)
  4. Doanh thu
  5. Công nợ phải thu
  6. Công nợ phải trả
- Hiển thị badge tỉ lệ tăng trưởng và subtext mô tả rõ ràng.

#### F. `ActionRequired.jsx`
- Chuyển đổi từ danh sách dọc sang lưới 3 cột ngang (`grid-cols-1 md:grid-cols-3`).
- 3 việc xử lý trọng yếu:
  - Vật tư dưới mức tồn tối thiểu (Mức độ: Cao)
  - Phiếu nhập chờ xử lý (Mức độ: Chờ xử lý)
  - Kiểm kê cần thực hiện (Mức độ: Định kỳ)

#### G. `Dashboard.jsx`
- Tích hợp 2 cột: Cột trái chứa `DashboardNavSidebar`, cột phải chứa `KPISection`, `ActionRequired`, `Workflow`, `ModuleCards`, `ActivityChart`, `RecentActivity`.
- Thẻ nội dung được đẩy nhẹ đè lên chân Hero (`-mt-6 sm:-mt-8`) tạo chiều sâu thị giác phân tầng cao cấp.

---

### 3. KẾT QUẢ KIỂM THỬ HỆ THỐNG
1. **Frontend Compilation**: `npm run build` thành công 100%, 0 lỗi, 0 cảnh báo.
2. **PH4 REST API Regression**: `test_ph4_api.js` đạt 16/16 tests (100%).
3. **Concurrency & Race Condition**: `test_concurrency.js` đạt 100%, PostgreSQL `SELECT ... FOR UPDATE` chặn xuất âm tồn kho an toàn tuyệt đối.
4. **RBAC Security Suite**: `test_rbac_security.js` đạt 27/27 test cases (100%).
