# BÁO CÁO KIẾN TRÚC ĐIỀU HƯỚNG V2.6 — MAY 10 ERP
## ONE NAVIGATION SYSTEM PER CONTEXT (MỘT HỆ THỐNG ĐIỀU HƯỚNG THEO NGỮ CẢNH)
**Dự án**: ERP Tổng Công ty May 10  
**Tài liệu**: `docs/core-portal/09_navigation_architecture_v2.6.md`  
**Phiên bản**: V2.6 — Navigation Freeze  
**Ngày thực hiện**: 09/09/2026  

---

## 1. Nguyên nhân gốc rễ (Root Cause)

1. **Trùng lặp điều hướng (Duplicate Navigation)**:
   - Trước phiên bản V2.6, thanh `Header.jsx` được thiết kế chung cho toàn bộ ứng dụng và luôn luôn render thanh điều hướng đầy đủ gồm 7 phân hệ (`Trang chủ`, `Kinh doanh`, `Sản xuất`, `Mua hàng`, `Kho & Vật tư`, `Tài chính`, `Quản trị`) trên mọi route.
   - Khi người dùng truy cập vào bất kỳ trang phân hệ nào (ví dụ: `/warehouse`, `/sales`, `/production`), `MainLayout.jsx` kích hoạt thêm thanh `Sidebar.jsx` (256px) bên trái để điều hướng các nghiệp vụ nội bộ của phân hệ đó.
   - Kết quả: Trên màn hình phân hệ đồng thời tồn tại 2 hệ thống menu song song (Top Nav đa phân hệ và Left Sidebar phân hệ), gây rối mắt, dư thừa menu và vi phạm nguyên tắc phân cấp thông tin doanh nghiệp.

2. **Xung đột vị trí & Che lấp nội dung (Header Overflow / Overlap)**:
   - Trên các trang phân hệ, thanh Header cũ sử dụng định vị tuyệt đối/cố định với tọa độ tính toán tĩnh (`fixed top-3 lg:left-[280px] lg:right-6`) kết hợp thanh đệm nhân tạo (`<div className="h-16" />`).
   - Khoảng cách lề và khoảng đệm không đồng nhất dẫn đến hiện tượng thanh Header che khuất một phần thanh điều hướng phân cấp (`Breadcrumb`) hoặc tiêu đề trang khi cuộn và đổi độ phân giải.

---

## 2. Kiến trúc trước khi sửa (Architecture Before — V2.5)

```
HOMEPAGE (/):
┌─────────────────────────────────────────────────────────────┐
│ FLOATING HEADER: [Logo] [7 Module Menus] [Search|Notif|User]│
├─────────────────────────────────────────────────────────────┤
│ [Hero Welcome Panel]                                        │
│ [Business KPIs] - [Action Required] - [Workflow]            │
└─────────────────────────────────────────────────────────────┘

MODULE PAGES (/warehouse/*, /sales, etc.):
┌──────────────┬──────────────────────────────────────────────┐
│ SIDEBAR (L1) │ FLOATING HEADER (L2): [Logo] [7 Module Menus]│
│ [Trang chủ]  ├──────────────────────────────────────────────┤
│ [Tổng quan]  │ ⚠️ OVERLAP / DUPLICATE:                      │
│ [Tồn kho]    │ [Breadcrumb bị che khuất]                     │
│ [Nhập kho]   │ [Module Content Area]                        │
│ [Xuất kho]   │                                              │
└──────────────┴──────────────────────────────────────────────┘
=> Trùng lặp 2 hệ thống Primary Navigation, lãng phí không gian màn hình.
```

---

## 3. Kiến trúc sau khi sửa (Architecture After — V2.6)

Tuân thủ nguyên tắc: **ONE NAVIGATION SYSTEM PER CONTEXT**

```
HOMEPAGE (/):
- Global Top Navigation = PRIMARY NAVIGATION
- Left Sidebar = HIDDEN (display: none)
┌─────────────────────────────────────────────────────────────┐
│ GLOBAL FLOATING HEADER:                                     │
│ [Logo + Cổng Quản Trị] [7 Modules Top Nav] [Search|🔔|User] │
├─────────────────────────────────────────────────────────────┤
│ [Hero Welcome Panel] (pt-18 tạo khoảng đệm an toàn 72px)    │
│ [Business KPIs] - [Cần Xử Lý] - [Quy Trình Chuỗi Cung Ứng]  │
└─────────────────────────────────────────────────────────────┘

MODULE PAGES (/warehouse/*, /sales, /production, etc.):
- Module Sidebar = PRIMARY MODULE NAVIGATION
- Header = CLEAN UTILITY HEADER (Không lặp lại 7 module menu)
┌──────────────┬──────────────────────────────────────────────┐
│ MODULE       │ UTILITY HEADER (sticky top-0 h-14 z-30):     │
│ SIDEBAR      │ [☰ Logo ERP MAY 10] [Trang chủ > PH4] [🔍|🔔|👤]│
│ (Primary     ├──────────────────────────────────────────────┤
│ Navigation)  │ [Breadcrumb rõ ràng, không bị che lấp]       │
│ - Tổng quan  │ [Module Tab & Workspace]                     │
│ - Tồn kho    │                                              │
│ - Vị trí kho │                                              │
│ - Phiếu nhập │                                              │
│ - Phiếu xuất │                                              │
└──────────────┴──────────────────────────────────────────────┘
=> Loại bỏ hoàn toàn duplicate menu, phân cấp rõ ràng, tăng tối đa diện tích thao tác.
```

---

## 4. Điều hướng Trang chủ (Homepage Navigation)

- **Định vị**: Floating Frosted Glass căn giữa với `max-w-[1540px] mx-auto`, bo góc tròn 18px. Khi cuộn trang tự động chuyển sang `fixed top-3` với hiệu ứng kính mờ xanh dịu `#EAF4FB` (`blur-18px`).
- **Thành phần**:
  - **Bên trái**: Logo May 10 (`h-7.5`), định danh thương hiệu `ERP MAY 10` và nhãn `CỔNG QUẢN TRỊ`.
  - **Ở giữa**: Thanh điều hướng ngang đầy đủ 7 phân hệ (`Trang chủ`, `Kinh doanh`, `Sản xuất`, `Mua hàng`, `Kho & Vật tư [PH4]`, `Tài chính`, `Quản trị`) có dropdown menu cho các tiểu mục. Thẻ tab active mang sắc xanh `#0F5FAF`.
  - **Bên phải**: Ô tìm kiếm nhanh toàn hệ thống, chuông thông báo `[🔔]` có badge số đếm, avatar người dùng và menu chuyển đổi vai trò (Role Switcher).
- **Sidebar**: Tuyệt đối **ẨN** trên toàn bộ route `/`.

---

## 5. Điều hướng Phân hệ (Module Navigation)

- **Vai trò**: Khi truy cập `/warehouse/*`, `/sales`, `/production`, `/purchasing`, `/accounting`, `/admin/*`, thanh **Sidebar bên trái** đảm nhận 100% vai trò điều hướng phân hệ.
- **Thanh Header phân hệ (Utility Header)**:
  - Chiều cao cố định chuẩn: `h-14` (56px).
  - Vị trí: `sticky top-0 z-30 w-full` nằm trọn trong cột nội dung (`lg:pl-64`), không dùng tọa độ fixed tính toán tĩnh.
  - Nền: `bg-white/95 backdrop-blur-md border-b border-[#DCEAF4] shadow-2xs`.
  - **Bên trái**: Nút menu `[☰]` (chỉ hiện trên tablet/mobile để bật Sidebar drawer), logo May 10 nhỏ và chữ `ERP MAY 10` liên kết nhanh về Trang chủ Portal.
  - **Ở giữa**: Thẻ breadcrumb định danh phân hệ hiện hành (ví dụ: `Trang chủ > PH4 — Kho & Quản lý vật tư`) kèm chấm trạng thái xanh.
  - **Bên phải**: Tìm kiếm nhanh phân hệ, chuông thông báo `[🔔]`, avatar và menu đổi vai trò tài khoản.
  - **TUYỆT ĐỐI KHÔNG**: Hiển thị lại thanh 7 menu phân hệ (`Trang chủ | Kinh doanh | Sản xuất | Mua hàng | Kho | Tài chính | Quản trị`).

---

## 6. Xử lý Tràn lề và Che lấp nội dung (Header Behavior & No-Overlap)

1. **Khắc phục triệt để lỗi đè Breadcrumb**:
   - Chuyển cơ chế từ `fixed top-3 lg:left-[280px]` sang `sticky top-0 w-full`.
   - Do nằm trong dòng luồng tài liệu chuẩn (normal flow) của cột chính, thẻ `<main>` chứa `<Breadcrumb />` và `<Outlet />` bắt đầu ngay bên dưới Header, loại bỏ 100% nguy cơ che khuất Breadcrumb hay bảng dữ liệu kho.
2. **Khắc phục lỗi đè Hero trên Trang chủ**:
   - Hero Section (`DashboardHeader.jsx`) có `pt-17 sm:pt-18` (khoảng đệm 68–72px), đảm bảo thanh Floating Header (`h-54px`) nổi tự nhiên phía trên mà không che bất kỳ dòng chữ tiêu đề hay nút bấm nào.

---

## 7. Hành vi Sidebar (Sidebar Behavior)

- **Trang chủ (`/`)**: Không render hoặc `display: none`.
- **Trang phân hệ (`!== '/'`)**:
  - **Desktop (>= 1024px)**: Cố định bên trái màn hình (`fixed top-0 bottom-0 left-0 w-64 z-40 bg-white border-r border-[#DCEAF4]`), hiển thị danh mục nghiệp vụ chi tiết của phân hệ đang chọn.
  - **Mobile / Tablet (< 1024px)**: Ẩn mặc định (`-translate-x-full`), khi người dùng bấm nút `[☰]` trên Utility Header sẽ trượt ra dạng Drawer kèm màn mờ che nền (`backdrop-blur-xs`).

---

## 8. Bảng đối soát Responsive (Responsive Verification Matrix)

| Độ rộng màn hình | Homepage (`/`) | Module Pages (`/warehouse/*`) | Tình trạng menu | Hiện tượng Overlap |
| :--- | :--- | :--- | :--- | :--- |
| **>= 1440px (Desktop lớn)** | Floating Header đầy đủ 7 menu | Sidebar cố định 256px + Utility Header | 1 dòng duy nhất | **KHÔNG** |
| **1280px (Desktop chuẩn)** | Floating Header vừa vặn không wrap | Sidebar cố định 256px + Utility Header | 1 dòng duy nhất | **KHÔNG** |
| **1024px (Tablet ngang)** | Nút dropdown chuyển nhanh | Sidebar drawer thu gọn + Utility Header | Gọn gàng | **KHÔNG** |
| **768px (Tablet dọc)** | `[☰] [ERP MAY 10] [🔔] [User]` | `[☰] [PH4 Kho & Vật tư] [🔔] [User]` | Gọn gàng | **KHÔNG** |
| **390px (Mobile phone)** | `[☰] [ERP MAY 10] [🔔] [User]` | `[☰] [ERP MAY 10] [🔔] [User]` | 1 dòng, touch-ready | **KHÔNG (Zero horizontal scroll)** |

---

## 9. Danh sách File đã chỉnh sửa

1. [`frontend/src/components/layout/MainLayout.jsx`](file:///E:/ERP/frontend/src/components/layout/MainLayout.jsx):
   - Truyền rõ ràng thuộc tính `mode={isHomePage ? 'home' : 'module'}` vào component `<Header />`.
   - Chuẩn hóa layout indentation `lg:pl-64` chỉ kích hoạt trên trang module.
2. [`frontend/src/components/layout/Header.jsx`](file:///E:/ERP/frontend/src/components/layout/Header.jsx):
   - Tách biệt rõ 2 chế độ render:
     - `Case A (Module Mode)`: Render Utility Header thanh mảnh (`h-14`, sticky, brand link, module breadcrumb tag, search, notif, user menu). Loại bỏ hoàn toàn 7 menu phân hệ.
     - `Case B (Homepage Mode)`: Render Global Floating Navigation đầy đủ 7 phân hệ với dropdown menu và active pill.
   - Thêm helper `getModuleTitle()` ánh xạ tự động tên phân hệ.
   - Tích hợp nút `[☰]` điều khiển mở Sidebar drawer trên thiết bị di động.

---

## 10. Kết quả Kiểm thử (Test Suite Results)

### A. Frontend Production Build
```bash
npm run build
✓ 1697 modules transformed.
dist/index.html                   0.83 kB │ gzip:   0.51 kB
dist/assets/index-Bqw4GyOb.css   53.20 kB │ gzip:   8.99 kB
dist/assets/index-BWbO4zw2.js   468.13 kB │ gzip: 124.25 kB
✓ built in 4.18s — 0 errors, 0 warnings
```

### B. Kiểm thử Hồi quy REST API PH4
```bash
node tests/test_ph4_api.js
=======================================================
🎉 TỔNG KẾT KIỂM THỬ: 16/16 TESTS PASSED (100%)
=======================================================
```

### C. Kiểm thử Tranh chấp Đồng thời & Chặn Xuất Âm (Concurrency & Negative Stock)
```bash
node tests/test_concurrency.js
================================================================
✅ TEST RACE CONDITION THÀNH CÔNG RỰC RỠ (100% PASS)!
   - Khóa dòng an toàn tuyệt đối qua SELECT ... FOR UPDATE
   - HTTP 409 Conflict trả về chính xác khi vượt tồn khả dụng
   - Tồn kho cuối cùng: 20 mét (chính xác tuyệt đối)
================================================================
```

### D. Kiểm thử Bảo mật & Phân quyền Zero-Trust RBAC
```bash
node tests/test_rbac_security.js
================================================================
📊 TỔNG KẾT KIỂM THỬ: 27/27 TEST CASES ĐẠT CHUẨN (100%)
================================================================
```

---

## 11. Xác nhận Kiểm tra Trực quan (Visual Acceptance Checklist)

- [x] **AC01**: Mở `/` → Chỉ có 1 Primary Navigation (Global Floating Top Nav). Sidebar hoàn toàn ẩn. **(PASS)**
- [x] **AC02**: Mở `/warehouse` → Sidebar xuất hiện. Header KHÔNG chứa lại menu 7 phân hệ. **(PASS)**
- [x] **AC03**: Mở PH4 → Chỉ có 1 hệ thống điều hướng nghiệp vụ duy nhất là Sidebar. Header là Utility Header. **(PASS)**
- [x] **AC04**: Chuyển đổi giữa `Trang chủ` → `Kho` → `Tồn kho` → `Phiếu nhập` không bao giờ xuất hiện 2 thanh menu song song. **(PASS)**
- [x] **AC05**: Độ phân giải 1280px không bị nhảy dòng (no-wrap), không chồng lấn nội dung (no-overlap). **(PASS)**
- [x] **AC06**: Độ phân giải 1024px không tràn thanh cuộn ngang (zero horizontal scroll). **(PASS)**
- [x] **AC07**: Độ phân giải 768px nút `[☰]` mở Sidebar drawer hoạt động chuẩn xác. **(PASS)**
- [x] **AC08**: Độ phân giải 390px (Mobile) hiển thị tinh gọn, cảm ứng thoải mái. **(PASS)**
- [x] **Header có đè Hero không?**: KHÔNG. Khoảng đệm `pt-18` (72px) bảo vệ nội dung Hero hoàn hảo.
- [x] **Header có đè Breadcrumb không?**: KHÔNG. Utility Header dạng `sticky top-0` đẩy `<Breadcrumb />` nằm ngay dưới trong luồng tự nhiên.

---

## 12. Cam kết Toàn vẹn Hệ thống

> [!IMPORTANT]
> **Cam kết bảo toàn logic**:
> - Tuyệt đối **KHÔNG** thay đổi Authentication hoặc AuthContext.
> - Tuyệt đối **KHÔNG** thay đổi RBAC permissions hoặc role guards.
> - Tuyệt đối **KHÔNG** thay đổi REST API contracts hoặc backend services.
> - Tuyệt đối **KHÔNG** thay đổi PostgreSQL database schema, data hoặc migrations.
> - Tuyệt đối **KHÔNG** thay đổi nghiệp vụ PH4 (nhập kho, xuất kho, chuyển kho, kiểm kê, SELECT FOR UPDATE).

---

```
======================================================
KIẾN TRÚC ĐIỀU HƯỚNG V2.6: ĐÃ XÁC MINH & FREEZE
======================================================
```
