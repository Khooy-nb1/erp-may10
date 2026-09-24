# BÁO CÁO REFACTOR GIAO DIỆN PH4 → CORE PORTAL UI V2.11
## HỆ THỐNG QUẢN TRỊ ERP — TỔNG CÔNG TY MAY 10
**Mã phân hệ:** PH4 — Kho & Quản lý vật tư  
**Tiêu chuẩn thiết kế:** Core Portal UI V2.11  
**Phạm vi:** UI ONLY / ZERO BUSINESS LOGIC CHANGE  
**Ngày hoàn thành:** 10/09/2026  

---

## 1. Executive Summary
Thực hiện chỉ đạo chuẩn hóa giao diện hệ sinh thái May 10 ERP, phân hệ **PH4 — Kho & Quản lý vật tư** đã được rà soát và tái cấu trúc giao diện toàn diện nhằm đồng bộ hóa 100% với ngôn ngữ thiết kế **Core Portal UI V2.11**.

Quá trình refactor tuân thủ nguyên tắc cốt lõi:
- **UI Only:** Chuẩn hóa toàn bộ token giao diện (bảng màu May 10 Blue `#0F5FAF`, bo góc `rounded-2xl`, bóng đổ `shadow-xs`, đường viền `border-[#E2EDF5]`, typography, form controls, tables, status badges và modal dialogs).
- **Zero Business Logic Change:** Giữ nguyên 100% logic nghiệp vụ kho dệt may, kiểm soát đa kho, khóa dòng `SELECT ... FOR UPDATE`, xử lý tranh chấp 409 Conflict, xác thực định danh và ma trận phân quyền RBAC.
- **Tích hợp Native:** PH4 vận hành như một phân hệ nguyên bản (native) bên trong Core ERP Portal, sử dụng chung Global Header và Sidebar điều hướng của Portal.

---

## 2. Design System Alignment Matrix (Trước vs Sau)

| Thành phần UI | Trạng thái trước Refactor | Chuẩn hóa Core Portal UI V2.11 |
| :--- | :--- | :--- |
| **Viewport & Background** | Slate/Gray tự do hoặc thiếu padding chuẩn | `bg-[#F7FAFC]` đồng nhất toàn hệ thống |
| **Container Card** | `rounded-xl border-[#DCEAF4] shadow-sm` | `rounded-2xl border border-[#E2EDF5] bg-white shadow-xs` |
| **Bảng màu chủ đạo** | `#0F4C81`, `#0284c7`, màu xanh không đồng nhất | May 10 Blue `#0F5FAF` (Hover: `#0D4E90`, Active: `#0A3D70`, Light: `#EAF5FC`) |
| **Tab Navigation** | Bo góc nhỏ, viền đậm không đồng đều | Thẻ tab `rounded-2xl border-[#E2EDF5] shadow-xs`, tab items `rounded-xl font-semibold` |
| **KPI Metric Cards** | Chiều cao tùy biến, thiếu icon pill chuẩn | Chuẩn Core KPI Card: `min-h-[140px] rounded-2xl border-[#E2EDF5]`, icon pill `w-8 h-8 rounded-xl bg-[#EAF5FC] text-[#0F5FAF]`, số liệu `text-2xl font-bold` |
| **Data Tables** | Thead đậm nhạt khác nhau, border phân mảnh | `rounded-2xl border border-[#E2EDF5] overflow-hidden`, `thead bg-[#F7FAFC] text-[#5F6F82] font-semibold text-xs uppercase tracking-wider`, row `hover:bg-[#F9FBFC]` |
| **Form Inputs & Selects** | `rounded-lg border-[#DCEAF4]` | `rounded-xl border-[#E2EDF5] focus:border-[#0F5FAF] focus:ring-[#96C8EB]` |
| **Buttons** | `rounded-lg shadow-sm` | `rounded-xl font-semibold shadow-xs transition-colors` |
| **Status Badges** | Màu sắc và kích thước phân tán | `rounded-full px-2.5 py-0.5 text-xs font-semibold` (`emerald-50/700`, `amber-50/700`, `red-50/700`, `blue-50/700`, `slate-100/text-[#172033]`) |
| **Modal Dialogs** | Backdrop mờ nặng `bg-black/50 backdrop-blur-sm` | `bg-black/40 backdrop-blur-xs`, hộp thoại `rounded-2xl border-[#DCEAF4] shadow-xl overflow-hidden animate-in fade-in zoom-in-95` |

---

## 3. Danh Sách File Đã Refactor

Toàn bộ 9/9 file giao diện của phân hệ PH4 đã được refactor thành công:

1. `frontend/src/pages/WarehouseModule.jsx` (Module shell & Tab Navigation bar)
2. `frontend/src/pages/DashboardPage.jsx` (PH4 Dashboard & 4 KPI cards tổng quan kho)
3. `frontend/src/pages/TonKhoPage.jsx` (Báo cáo tồn kho tức thời & Modal tra cứu Thẻ kho chi tiết)
4. `frontend/src/pages/ViTriKhoPage.jsx` (Sơ đồ vị trí kho kệ & Modal định nghĩa vị trí mới)
5. `frontend/src/pages/LoVatTuPage.jsx` (Quản lý lô vật tư, cây vải, hạn dùng FEFO & Modal khai báo lô)
6. `frontend/src/pages/PhieuNhapPage.jsx` (Phiếu nhập kho, Master-Detail items, Modal xem & tạo mới)
7. `frontend/src/pages/PhieuXuatPage.jsx` (Phiếu xuất kho, Master-Detail items, cảnh báo tồn khả dụng & Modal)
8. `frontend/src/pages/PhieuChuyenPage.jsx` (Điều chuyển kho 2 chiều đồng thời & Modal chi tiết)
9. `frontend/src/pages/PhieuKiemKePage.jsx` (Kiểm kê kho thực tế, đối soát chênh lệch & cân đối tồn kho)

---

## 4. Chi Tiết Từng Màn Hình Đã Sửa

### 4.1. Module Shell & Tab Navigation (`WarehouseModule.jsx`)
- Khung điều hướng tab được bọc trong container `bg-white p-2 rounded-2xl border border-[#E2EDF5] shadow-xs`.
- Các tab nút bấm được chuẩn hóa bo góc `rounded-xl`, kích thước đồng đều, active state sử dụng May 10 Blue `#0F5FAF` và chữ trắng rõ nét.
- Giữ nguyên cơ chế chuyển tab qua URL query param `?tab=...` phục vụ deep linking và bookmark của người dùng.

### 4.2. Kho Dashboard (`DashboardPage.jsx`)
- 4 thẻ KPI tổng quan kho được chuẩn hóa theo đúng cấu trúc Core KPI Card:
  - Tổng số lượng tồn kho (Mét/Kg)
  - Tổng giá trị vật tư lưu kho (VNĐ)
  - Cảnh báo mặt hàng sắp hết định mức an toàn
  - Cảnh báo lô vải cận hạn dùng (FEFO)
- Bảng phân bổ kho và Top 5 vật tư luân chuyển cao được đưa vào khung `rounded-2xl border-[#E2EDF5]` sạch đẹp, bố cục cân đối.

### 4.3. Báo Cáo Tồn Kho & Thẻ Kho (`TonKhoPage.jsx`)
- Thanh bộ lọc đa tiêu chí (kho, nhóm vật tư, tìm kiếm mã) bo tròn `rounded-2xl border-[#E2EDF5]`.
- Bảng dữ liệu tồn kho phân cấp rõ ràng: Tồn thực tế, Giữ chỗ đơn hàng, Khả dụng xuất.
- Modal Thẻ kho chi tiết nâng cấp backdrop tinh tế `bg-black/40 backdrop-blur-xs`, khung `rounded-2xl shadow-xl`, hiển thị lịch sử nhập xuất tồn theo từng nghiệp vụ.

### 4.4. Quản Lý Vị Trí Kho Kệ (`ViTriKhoPage.jsx`)
- Bộ lọc kho và trạng thái ô kệ được bo góc `rounded-xl`.
- Bảng định vị vị trí: Kho, Dãy (Aisle), Kệ (Rack), Tầng (Shelf), Ô (Bin), Sức chứa và Trạng thái sẵn sàng.
- Modal Thêm mới vị trí chuẩn hóa layout 2 cột, form inputs `rounded-xl` đồng bộ.

### 4.5. Quản Lý Lô Vật Tư & Cây Vải (`LoVatTuPage.jsx`)
- Tích hợp nhãn cảnh báo hạn dùng FEFO dạng pill: `Còn hạn`, `Cận hạn (<= 30 ngày)`, `Hết hạn`.
- Bảng theo dõi số lô, nhà cung cấp, ngày sản xuất, ngày nhập kho và vị trí lưu trữ.
- Modal Khai báo lô vật tư mới chuẩn hóa header, footer và buttons.

### 4.6. Quản Lý Phiếu Nhập Kho (`PhieuNhapPage.jsx`)
- Bảng phiếu nhập hiển thị mã chứng từ `font-mono font-bold text-[#0F5FAF]`, ngày nhập, nhà cung cấp, tổng tiền và trạng thái hoàn thành.
- Modal Xem chi tiết phiếu: Bảng chi tiết vật tư nhập, đơn giá, thành tiền định dạng tiền tệ VNĐ.
- Modal Lập phiếu nhập kho Master-Detail: Cho phép thêm/xóa dòng linh hoạt, tính tổng tiền tự động, form inputs `rounded-xl`.

### 4.7. Quản Lý Xuất Kho & Kiểm Soát Tồn Khả Dụng (`PhieuXuatPage.jsx`)
- Bảng phiếu xuất hiển thị mục đích xuất (sản xuất, bán hàng, hủy), kho xuất, người nhận.
- Cảnh báo trực quan cho người dùng: Nhắc nhở quy tắc kiểm tra tồn khả dụng tức thời chống xuất âm.
- Modal Xem & Lập phiếu xuất: Layout Master-Detail đồng nhất, bảng dòng mặt hàng `bg-[#F9FBFC] rounded-xl`.

### 4.8. Quản Lý Phiếu Chuyển Kho Nội Bộ (`PhieuChuyenPage.jsx`)
- Bảng theo dõi chuyển kho 2 chiều (Kho nguồn xuất ➔ Kho đích nhập).
- Modal Lập phiếu chuyển kho: Bắt buộc chọn 2 kho khác nhau, quản lý danh sách chuyển dịch vật tư an toàn và đồng bộ.

### 4.9. Kiểm Kê Kho & Cân Đối Tự Động (`PhieuKiemKePage.jsx`)
- Bảng theo dõi các kỳ kiểm kê: Ngày kiểm, trưởng ban kiểm kê, số lượng lệch và tổng giá trị chênh lệch (đổi màu xanh/đỏ theo giá trị âm/dương).
- Modal Đối soát kiểm kê: Hiển thị song song Tồn sổ sách vs Tồn thực tế, tính chênh lệch tự động.
- Nút tác vụ `Cân Đối & Tự Động Điều Chỉnh Tồn Kho` nổi bật với màu xanh lục emerald `rounded-xl font-bold`.

---

## 5. Concurrency & Transaction Confirmation

Toàn bộ logic backend và database liên quan đến xử lý đồng thời (concurrency control) của phân hệ PH4 được **bảo toàn nguyên vẹn 100%**:
- Cơ chế khóa dòng: `SELECT ... FOR UPDATE` trên bảng `ton_kho` trong cùng database transaction được giữ nguyên.
- Không phát sinh bất kỳ thay đổi nào tại backend controllers (`phieuXuatController.js`, `phieuNhapController.js`, `phieuChuyenController.js`, `phieuKiemKeController.js`).
- Mã phản hồi HTTP `409 Conflict` (Xung đột tồn kho do hai người xuất cùng lúc vượt quá số lượng khả dụng) được client nhận và hiển thị dạng toast thông báo chuẩn xác.

---

## 6. RBAC & Security Confirmation

Ma trận phân quyền hệ thống (Role-Based Access Control) cho phân hệ PH4 được **giữ nguyên vẹn tuyệt đối**:
- **Admin (`vai_tro = 1`):** Toàn quyền truy cập tất cả chức năng quản trị, cấu hình, xuất/nhập/chuyển/kiểm kê.
- **Thủ kho (`vai_tro = 5`):** Được phép xem tồn kho, sơ đồ vị trí, lô vật tư, lập phiếu nhập, xuất, chuyển, kiểm kê; không truy cập danh bạ nhân sự trái quyền.
- **Bán hàng (`vai_tro = 2`):** Chỉ xem thông tin tồn kho cho phép; bị chặn truy cập thẻ kho chi tiết hoặc lập phiếu kho (403 Forbidden).
- Giao diện PH4 tiêu thụ dữ liệu an toàn thông qua JWT Bearer token và context `AuthContext`, không tạo bypass hay hardcode danh tính.

---

## 7. Build & Test Results

### 7.1. Frontend Production Build
```
Command: npm run build (in E:/ERP/frontend)
Status: PASSED (Exit Code: 0)
Modules Transformed: 1700 modules
Output Bundles:
- dist/index.html: 0.83 kB (gzip: 0.50 kB)
- dist/assets/index-jI_diiBH.css: 56.24 kB (gzip: 9.38 kB)
- dist/assets/index-mKa-7mqS.js: 482.59 kB (gzip: 126.09 kB)
Compile Errors: 0
```

### 7.2. PH4 REST API Integration Test Suite
```
Command: node tests/test_ph4_api.js (in E:/ERP/backend)
Status: 16/16 TESTS PASSED (100%)
- Health check & Master Data: PASS
- Vị trí kho & Lô vật tư: PASS
- Báo cáo tồn kho & Dashboard thống kê: PASS
- Tra cứu Thẻ kho chi tiết: PASS
- Lập phiếu nhập kho: PASS
- Xuất kho hợp lệ & Chặn xuất âm (409 Conflict): PASS
- Điều chuyển kho nội bộ: PASS
- Lập phiếu kiểm kê & Cân đối kho tự động: PASS
```

### 7.3. Concurrency & Race Condition Test
```
Command: node tests/test_concurrency.js (in E:/ERP/backend)
Status: 100% PASS
- Request A (xuất 80 mét) ➔ 201 Created (Thành công)
- Request B (xuất 50 mét) ➔ 409 Conflict (Bị hủy bỏ vì thiếu tồn khả dụng)
- Tồn kho cuối cùng trong PostgreSQL: 20 mét (Đúng tuyệt đối, không âm kho)
```

### 7.4. RBAC Zero-Trust & Security Test Suite
```
Command: node tests/test_rbac_security.js (in E:/ERP/backend)
Status: 27/27 TEST CASES PASSED (100%)
- Chặn Anonymous & Token giả mạo: PASS
- Bảo vệ Sensitive GET endpoints: PASS
- Phân quyền theo vai trò Thủ kho / Bán hàng / Admin: PASS
- Chống leo thang quyền (Privilege Escalation): PASS
```

---

## 8. Kết Luận
> **READY — PH4 UI ALIGNED WITH CORE V2.11**

Giao diện phân hệ PH4 (Kho & Quản lý vật tư) đã đạt chuẩn hoàn hảo về mỹ thuật doanh nghiệp và tính nhất quán với Core Portal May 10 ERP, sẵn sàng đưa vào vận hành và demo thuyết trình mà không ảnh hưởng đến bất kỳ quy tắc an toàn hệ thống nào.
