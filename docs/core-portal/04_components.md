# DANH MỤC CÁC COMPONENT GIAO DIỆN (UI COMPONENTS)
**TỔNG CÔNG TY MAY 10 - CTCP**

---

## 1. Cấu Trúc Khung Layout (`src/components/layout/`)

### 1.1. `MainLayout.jsx`
* **Vị trí:** Khung bao bọc toàn bộ các trang nội bộ của Cổng Portal.
* **Chức năng:** Quản trị trạng thái Sidebar (Mở/Đóng trên Mobile), điều phối Sticky Header, thanh điều hướng Breadcrumb, vùng hiển thị `<Outlet />`, và Chân trang Footer.

### 1.2. `Header.jsx`
* **Vị trí:** Thanh tiêu đề cố định trên cùng màn hình.
* **Thành phần:**
  * Logo thương hiệu May 10 với chữ viết tắt `M10` trên nền đỏ `#8B1E2D`.
  * Thanh tìm kiếm nhanh chứng từ, đơn hàng, mã vật tư toàn hệ thống.
  * **RBAC Role Switcher:** Dropdown cho phép chuyển đổi vai trò kiểm thử trực tiếp (Admin, Bán hàng, Sản xuất, Mua hàng, Thủ kho, Kế toán).
  * **Chuông thông báo (Notification Bell):** Hiển thị số lượng cảnh báo tồn kho thấp thực tế từ PH4.
  * Menu tài khoản người dùng với chức năng xem quyền hạn và đăng xuất.

### 1.3. `Sidebar.jsx`
* **Vị trí:** Cột điều hướng bên trái (cố định trên Desktop, dạng Drawer trên Mobile).
* **Phân nhóm menu:**
  * *Tổng quan:* Trang chủ Portal.
  * *Phân hệ ERP May 10:* PH1 Bán hàng, PH2 Sản xuất, PH3 Mua hàng, PH4 Kho & Vật tư, PH5 Kế toán.
  * *Quản trị hệ thống:* Người dùng, Vai trò doanh nghiệp, Ma trận phân quyền (RBAC).
* **Tính năng thông minh:**
  * Đối với PH4 Kho & Vật tư: Cho phép bấm mở rộng xem 8 mục con (Tổng quan kho, Tồn kho, Vị trí kệ, Lô vật tư, Phiếu nhập, Phiếu xuất, Điều chuyển, Kiểm kê).
  * Tự động ẩn hoặc hiển thị biểu tượng ổ khóa đối với các mục người dùng không có quyền truy cập.

### 1.4. `Breadcrumb.jsx`
* Hiển thị đường dẫn vị trí trang hiện tại trực quan, hỗ trợ bấm quay lại các cấp cha.

### 1.5. `Footer.jsx`
* Thể hiện thông tin pháp nhân đầy đủ của **Tổng Công ty May 10 - CTCP**, địa chỉ 765 Nguyễn Văn Linh, Sài Đồng, Long Biên, Hà Nội, đường dây nóng, và phiên bản hệ thống ERP.

---

## 2. Các Khối Chức Năng Trang Chủ (`src/components/dashboard/`)

| Tên Component | Mục Đích & Nội Dung Hiển Thị |
| :--- | :--- |
| `Hero.jsx` | Banner đồ họa May 10, lời chào cá nhân hóa theo người dùng, thông số CSDL tập trung, nút truy cập nhanh PH4. |
| `ActionRequired.jsx` | Danh sách nhiệm vụ khẩn cấp theo vai trò (cảnh báo min-stock cho Thủ kho, duyệt đơn cho Bán hàng, cấp NPL cho Sản xuất). |
| `ModuleCards.jsx` | 5 thẻ phân hệ tương tác, hiển thị trạng thái hoạt động/chờ kết nối, danh sách bảng dữ liệu, kiểm tra quyền trước khi vào. |
| `ERPOverview.jsx` | Sơ đồ luồng nghiệp vụ chuỗi cung ứng 5 bước từ Bán hàng đến Kế toán, giải thích kiến trúc CSDL dùng chung. |
| `KPISection.jsx` | 4 thẻ chỉ số điều hành then chốt: Giá trị tồn kho PH4, Cảnh báo tồn thấp, Đơn bán hàng PH1, Lệnh sản xuất PH2. |
| `ActivityChart.jsx` | Biểu đồ mật độ giao dịch chứng từ kho (Phiếu nhập, Phiếu xuất, Điều chuyển, Kiểm kê). |
| `Workflow.jsx` | Sơ đồ 4 giai đoạn chuỗi giá trị dệt may May 10. |
| `RecentActivity.jsx` | Bảng nhật ký giao dịch chứng từ thời gian thực, có bộ lọc theo loại nghiệp vụ (Nhập/Xuất/Chuyển/Kiểm kê). |
