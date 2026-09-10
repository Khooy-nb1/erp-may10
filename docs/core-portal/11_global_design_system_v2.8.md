# MAY 10 ERP — GLOBAL DESIGN SYSTEM ALIGNMENT V2.8
**Hệ thống Quản trị Tổng thể Doanh nghiệp May 10 — Enterprise ERP Portal**
**Ngày ban hành:** 09/09/2026  
**Phiên bản:** V2.8 — Global Design System Alignment (Homepage ↔ All Modules)  
**Trạng thái kiểm định:** PASS (Build Pass, 16/16 PH4 API, Race Condition Pass, 27/27 RBAC Pass)

---

## 1. CURRENT VISUAL PROBLEMS (VẤN ĐỀ TRƯỚC V2.8)

Trước phiên bản V2.8, dù kiến trúc điều hướng V2.7 đã giải quyết được vấn đề phân cấp Header và Sidebar, hệ thống vẫn tồn tại các điểm lệch pha thị giác giữa Trang chủ và Phân hệ:
1. **Lệch hệ màu (Color Token Inconsistency)**: Trang chủ dùng dải màu May 10 Corporate Blue (`#0F5FAF`, `#0F4C81`, `#EAF5FC`), trong khi các trang con phân hệ PH4 kế thừa hệ màu cũ (`may10-primary` màu đỏ gạch `#8B1E2D` và bảng màu xám `slate-200/500/800`).
2. **Lệch Card Language & Radius**: Homepage dùng card `rounded-xl` hoặc `rounded-2xl` với border `#DCEAF4`, trong khi PH4 dùng `rounded-lg` với border `slate-200`.
3. **Lệch Button System**: Homepage dùng nút bo góc xanh thương hiệu, trong khi các trang phân hệ PH4 dùng nút đỏ gạch `bg-may10-600` (`#7A1A27`) hoặc xám `slate-100`.
4. **Lệch Tabs & Data Table**: Tab bar của PH4 dùng nền đỏ active, bảng dữ liệu dùng `thead` xám `slate-50`, chữ mã vật tư đỏ `text-may10-700`, không đồng bộ với ngôn ngữ dữ liệu tại Dashboard.
5. **Trải nghiệm người dùng**: Tạo cảm giác như chuyển đổi qua lại giữa 2 ứng dụng độc lập của hai thời kỳ khác nhau.

---

## 2. GLOBAL DESIGN TOKENS (HỆ THỐNG TOKEN CHUẨN HÓA)

Đã thiết lập Single Source of Truth tại `frontend/src/config/designTokens.js` và ánh xạ vào `frontend/tailwind.config.js`:

| Token | Giá trị | Vai trò / Ứng dụng |
|---|---|---|
| **PRIMARY** | `#0F5FAF` | Màu chủ đạo nhận diện May 10, nút chính, pill active, icon active |
| **PRIMARY DARK** | `#0F4C81` | Màu hover nút chính, chữ thương hiệu, giá trị định lượng quan trọng |
| **PRIMARY LIGHT** | `#EAF5FC` | Nền tab active, hover nút thứ cấp, context card phân hệ |
| **PRIMARY PALE** | `#F4FAFE` | Nền thẻ phụ, nền hover hàng bảng dữ liệu |
| **BACKGROUND** | `#F7FAFC` | Nền toàn bộ ứng dụng, nền thead bảng dữ liệu |
| **SURFACE** | `#FFFFFF` | Nền các thẻ Card, Modal, Dropdown, Table row |
| **BORDER** | `#DCEAF4` | Viền chuẩn cho toàn bộ thẻ, bảng, form input, divider |
| **TEXT PRIMARY** | `#172033` | Tiêu đề chính, số liệu KPI, tên nghiệp vụ |
| **TEXT SECONDARY**| `#5F6F82` | Mô tả phân hệ, nhãn cột bảng dữ liệu, text phụ |
| **TEXT MUTED** | `#6B7785` | Ghi chú nhỏ, ngày tháng, placeholder input |
| **SUCCESS** | `#16A878` | `bg-emerald-50 text-emerald-700 border-emerald-200` (An toàn, hoạt động) |
| **WARNING** | `#D97706` | `bg-amber-50 text-amber-700 border-amber-200` (Cảnh báo tồn thấp, chờ duyệt) |
| **DANGER** | `#DC2626` | `bg-red-50 text-red-700 border-red-200` (Hủy, thiếu hụt nghiêm trọng) |
| **INFO** | `#3B82F6` | `bg-blue-50 text-blue-700 border-blue-200` (Đang triển khai, thông tin) |

---

## 3. HOMEPAGE ALIGNMENT (ĐỒNG BỘ TRANG CHỦ)

- **Executive Welcome Hero (`DashboardHeader.jsx`)**:
  - Chuẩn hóa container về `rounded-xl border border-[#DCEAF4] py-5 sm:py-6 px-5 sm:px-7`.
  - Nút Primary: `bg-[#0F5FAF] hover:bg-[#0F4C81] text-white rounded-lg font-medium text-xs sm:text-sm px-3.5 py-2 shadow-xs`.
  - Nút Secondary: `bg-white border border-[#DCEAF4] text-[#0F4C81] hover:bg-[#EAF5FC] rounded-lg font-medium text-xs sm:text-sm px-3.5 py-2 shadow-2xs`.
- **5 Nhóm KPI (`KPISection.jsx`)**:
  - Thẻ KPI `rounded-xl border border-[#DCEAF4] shadow-xs`, số liệu `text-lg lg:text-xl font-extrabold text-[#172033]`, số liệu nổi bật PH4 `text-[#0F4C81]`.
- **Cần xử lý (`ActionRequired.jsx`)**:
  - Container `rounded-xl border border-[#DCEAF4]`, thẻ con `rounded-xl border border-[#DCEAF4] bg-[#F9FBFC] hover:bg-[#F4FAFE]`.
- **Quy trình chuỗi cung ứng (`Workflow.jsx`)**:
  - Container `rounded-xl border border-[#DCEAF4]`, công đoạn active `border-[#0F5FAF] bg-[#EAF5FC]`.
- **Hoạt động & Nhật ký (`ActivityChart.jsx` & `RecentActivity.jsx`)**:
  - Container chuẩn `rounded-xl border border-[#DCEAF4]`, thead `bg-[#F7FAFC] text-[#5F6F82] border-y border-[#DCEAF4]`.

---

## 4. MODULE ALIGNMENT (ĐỒNG BỘ CÁC TRANG PHÂN HỆ)

- **Module Header Banner (`WarehouseModule.jsx` & `PlaceholderModule.jsx`)**:
  - Container: `bg-white rounded-xl p-4 sm:p-5 border border-[#DCEAF4] shadow-xs`.
  - Tiêu đề: `text-lg sm:text-xl font-bold text-[#172033]`.
  - Mô tả: `text-xs sm:text-sm text-[#5F6F82] mt-1`.
  - Badge trạng thái: `bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full text-xs font-medium`.
  - Nút làm mới: `bg-white border border-[#DCEAF4] text-[#0F4C81] hover:bg-[#EAF5FC] rounded-lg text-xs font-medium px-3.5 py-2 shadow-2xs`.
- **Module Tabs Bar**:
  - Container: `bg-white rounded-xl p-1.5 border border-[#DCEAF4] shadow-xs flex items-center gap-1 overflow-x-auto`.
  - Tab Active: `bg-[#0F5FAF] text-white font-semibold rounded-lg px-3.5 py-2 text-xs shadow-xs`.
  - Tab Inactive: `text-[#5F6F82] hover:text-[#0F5FAF] hover:bg-[#F4FAFE] rounded-lg px-3.5 py-2 text-xs font-medium`.
- **8 Màn hình chuyên sâu PH4 (`DashboardPage`, `TonKhoPage`, `ViTriKhoPage`, `LoVatTuPage`, `PhieuNhapPage`, `PhieuXuatPage`, `PhieuChuyenPage`, `PhieuKiemKePage`)**:
  - Thay thế toàn bộ dải màu đỏ cũ (`bg-may10-600`, `text-may10-700`) bằng Corporate Blue (`bg-[#0F5FAF]`, `text-[#0F4C81]`).
  - Chuẩn hóa toàn bộ thead về `bg-[#F7FAFC] text-[#5F6F82] border-b border-[#DCEAF4]`.
  - Chuẩn hóa toàn bộ hàng bảng về hover `hover:bg-[#F4FAFE]`.
  - Chuẩn hóa ô nhập liệu / select về viền `border-[#DCEAF4] focus:ring-1 focus:ring-[#96C8EB] focus:border-[#0F5FAF]`.

---

## 5. HEADER, SIDEBAR & BREADCRUMB ALIGNMENT

- **Global Header**: Cố định `sticky top-0 z-40 w-full h-14` nền kính mờ `bg-white/95 backdrop-blur-md border-b border-[#DCEAF4]`, hiển thị đồng nhất 7 phân hệ với active pill `bg-[#0F5FAF] text-white`.
- **Module Sidebar**: Vị trí `fixed top-14 bottom-0 left-0 w-64 z-30 bg-white border-r border-[#DCEAF4]`, thẻ context phân hệ `[PH4] Kho & Quản lý Vật tư`, menu active `bg-[#EAF5FC] text-[#0F5FAF] border-l-2 border-[#0F5FAF]`.
- **Breadcrumb**: `text-[#6B7785] hover:text-[#0F5FAF]`, phân cách `#96C8EB`, trang hiện tại `text-[#172033] font-semibold`.

---

## 6. CARD & BUTTON SYSTEM

- **Card System**: Chuẩn hóa toàn hệ thống theo một chuẩn duy nhất:
  - Radius: `rounded-xl` (Không dùng `rounded-2xl` hay `rounded-3xl` lẻ tẻ).
  - Viền: `border-[#DCEAF4]`.
  - Bóng mờ: `shadow-xs` tinh tế, hover `hover:border-[#96C8EB] hover:shadow-xs`.
- **Button System**:
  - Primary: `bg-[#0F5FAF] text-white hover:bg-[#0F4C81] rounded-lg font-medium text-xs sm:text-sm px-3.5 py-2 shadow-xs`.
  - Secondary: `bg-white border border-[#DCEAF4] text-[#0F4C81] hover:bg-[#EAF5FC] rounded-lg font-medium text-xs sm:text-sm px-3.5 py-2 shadow-2xs`.

---

## 7. RESPONSIVE VERIFICATION

Kiểm tra tại các breakpoint quy chuẩn:
- **1920px & 1440px**: Header đầy đủ 7 phân hệ; Homepage bố cục grid `max-w-[1480px]`; Module Workspace `lg:pl-64` kèm Sidebar cố định `w-64` hiển thị 8 tab và bảng dữ liệu thoáng đãng.
- **1280px & 1024px**: Header co giãn tự nhiên không tràn chữ; bảng dữ liệu có scroll ngang nội bộ trong card; Sidebar nằm gọn gàng bên trái.
- **768px & 390px (Mobile)**:
  - Header thu gọn: `[☰] [Logo ERP MAY 10] [🔍] [🔔] [User]`.
  - Nút `[☰]` kích hoạt Sidebar Drawer từ trái sang mượt mà.
  - Tabs phân hệ hỗ trợ cuộn ngang `overflow-x-auto` không gây vỡ viewport (`0 horizontal overflow`).

---

## 8. FILES CHANGED

| Đường dẫn file | Nội dung thay đổi |
|---|---|
| `frontend/src/config/designTokens.js` | **[NEW]** Single source of truth cho Design Tokens V2.8 |
| `frontend/tailwind.config.js` | Cập nhật ánh xạ màu thương hiệu May 10 Corporate Blue |
| `frontend/src/components/layout/Footer.jsx` | Đồng bộ viền `#DCEAF4`, text `#5F6F82`, logo May 10 xanh |
| `frontend/src/components/dashboard/DashboardHeader.jsx` | Chuẩn hóa `rounded-xl`, nút Primary / Secondary |
| `frontend/src/components/dashboard/ActionRequired.jsx` | Chuẩn hóa card container `rounded-xl`, viền `#DCEAF4` |
| `frontend/src/components/dashboard/Workflow.jsx` | Chuẩn hóa card container `rounded-xl`, viền `#DCEAF4` |
| `frontend/src/components/dashboard/ActivityChart.jsx` | Chuẩn hóa card container `rounded-xl`, viền `#DCEAF4` |
| `frontend/src/components/dashboard/RecentActivity.jsx` | Chuẩn hóa card container `rounded-xl`, thead `#F7FAFC` |
| `frontend/src/pages/WarehouseModule.jsx` | Chuẩn hóa Module Header, Tabs bar và nút làm mới |
| `frontend/src/pages/PlaceholderModule.jsx` | Chuẩn hóa Header, Button và Card |
| `frontend/src/pages/DashboardPage.jsx` | Đồng bộ bảng màu xanh, viền `#DCEAF4` |
| `frontend/src/pages/TonKhoPage.jsx` | Đồng bộ bảng dữ liệu, thead, input lọc, badge |
| `frontend/src/pages/ViTriKhoPage.jsx` | Đồng bộ sơ đồ vị trí kệ, viền, button |
| `frontend/src/pages/LoVatTuPage.jsx` | Đồng bộ bảng lô vải, thead, modal |
| `frontend/src/pages/PhieuNhapPage.jsx` | Đồng bộ bảng phiếu nhập, nút tạo phiếu, thead |
| `frontend/src/pages/PhieuXuatPage.jsx` | Đồng bộ bảng phiếu xuất, nút tạo phiếu, thead |
| `frontend/src/pages/PhieuChuyenPage.jsx` | Đồng bộ bảng điều chuyển kho, thead |
| `frontend/src/pages/PhieuKiemKePage.jsx` | Đồng bộ bảng kiểm kê, cân đối kho, thead |

---

## 9. REGRESSION TEST RESULTS (KẾT QUẢ KIỂM THỬ KHÔNG HỒI QUY)

Toàn bộ 4 bộ kiểm thử độc lập đã được thực thi và đạt chuẩn tuyệt đối 100%:

| Bộ kiểm thử | Mục tiêu | Kết quả thực tế | Trạng thái |
|---|---|---|---|
| **Vite Frontend Build** | Kiểm tra cú pháp JSX, đóng mở thẻ, Tailwind CSS, bundle size | `built in 5.49s — 0 errors` | ✅ **PASS** |
| **PH4 REST API Suite** (`test_ph4_api.js`) | Kiểm thử 16 API nghiệp vụ kho, thẻ kho, nhập/xuất/chuyển/kiểm kê | **16/16 Passed (100%)** | ✅ **PASS** |
| **Race Condition Suite** (`test_concurrency.js`) | Kiểm tra tranh chấp tồn kho với PostgreSQL `SELECT FOR UPDATE` | Chặn xuất âm tuyệt đối, mã HTTP 409 | ✅ **PASS** |
| **RBAC Security Suite** (`test_rbac_security.js`) | Kiểm thử 27 kịch bản xác thực, giả mạo token, phân quyền | **27/27 Passed (100%)** | ✅ **PASS** |

---

## 10. BEFORE / AFTER COMPARISON

| Tiêu chí | Trước V2.8 (V2.7) | Sau V2.8 (Global Design System) |
|---|---|---|
| **Hệ màu nhận diện** | Homepage dùng Blue; Module PH4 dùng Red gạch (`#8B1E2D`) | **100% thống nhất May 10 Corporate Blue (`#0F5FAF`)** |
| **Card Radius** | Pha trộn `rounded-lg`, `rounded-xl`, `rounded-2xl` | **Đồng nhất `rounded-xl` cho tất cả các Card** |
| **Bảng dữ liệu (Table)** | Thead xám `slate-50`, viền `slate-200`, text đỏ | **Thead `#F7FAFC`, viền `#DCEAF4`, giá trị chính `#0F4C81`** |
| **Hệ thống Nút (Button)** | Nút đỏ `bg-may10-600` và xám `slate-100` tại PH4 | **Primary `#0F5FAF`, Secondary viền `#DCEAF4` chữ `#0F4C81`** |
| **Tabs phân hệ** | Nền tab active đỏ `bg-may10-primary` | **Nền tab active xanh `#0F5FAF` chữ trắng chuẩn May 10** |
| **Trải nghiệm tổng thể** | Cảm giác 2 hệ thống giao diện khác nhau | **Một hệ thống May 10 ERP hoàn chỉnh, đồng nhất, chuyên nghiệp** |

---

## 11. REMAINING FINDINGS (GHI NHẬN TỒN ĐỌNG)

- **Không có lỗi nghiêm trọng (Zero Critical/High issues)**.
- Các phân hệ placeholder (PH1 Bán hàng, PH2 Sản xuất, PH3 Mua hàng, PH5 Kế toán) đang hiển thị ở trạng thái *"Đang triển khai"* theo đúng lộ trình kiến trúc đã được phê duyệt, dữ liệu và màn hình đã sẵn sàng kết nối API khi triển khai các phase tiếp theo.

---

## 12. FINAL VERDICT (KẾT LUẬN CUỐI CÙNG)

**TRẠNG THÁI NGHIỆM THU: PASS.**  
Hệ thống giao diện May 10 ERP đã đạt tính đồng bộ toàn diện về ngôn ngữ thiết kế, màu sắc, typography, card, nút bấm, bảng biểu và responsive trên cả Homepage lẫn toàn bộ các Phân hệ.
