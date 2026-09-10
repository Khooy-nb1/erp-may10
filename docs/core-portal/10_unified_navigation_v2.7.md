# MAY 10 ERP — KIẾN TRÚC ĐIỀU HƯỚNG & DESIGN SYSTEM THỐNG NHẤT V2.7
**Hệ thống Quản trị Tổng thể Doanh nghiệp May 10 — Enterprise ERP Portal**
**Ngày ban hành:** 09/09/2026  
**Phiên bản:** V2.7 — Unified Global Navigation & Design System  
**Trạng thái kiểm định:** ĐẠT CHUẨN 100% (16/16 PH4 API, Race Condition Pass, 27/27 RBAC Pass, Build Pass)

---

## 1. BỐI CẢNH & VẤN ĐỀ ĐƯỢC GIẢI QUYẾT TẠI V2.7

### 1.1. Hiện trạng sau V2.6
Ở phiên bản V2.6, hệ thống đã giải quyết thành công tình trạng đè Breadcrumb và loại bỏ menu trùng lặp. Tuy nhiên, việc phân tách thành 2 kiểu Header khác nhau:
- **Trang chủ (`/`)**: Floating Header với 7 phân hệ đầy đủ.
- **Trang Phân hệ (`/warehouse/*`, `/sales`, ...)**: Utility Header rút gọn không có 7 phân hệ, chỉ hiển thị thông tin phân hệ.

Điều này tạo ra cảm giác người dùng như đang chuyển đổi giữa hai ứng dụng rời rạc thay vì trải nghiệm trong một hệ thống ERP hợp nhất duy nhất.

### 1.2. Mục tiêu V2.7
Xây dựng một kiến trúc điều hướng 2 cấp độ rõ ràng (**Two-Level Navigation Hierarchy**) áp dụng xuyên suốt toàn bộ ứng dụng May 10 ERP:
1. **Level 1 — ERP Level (Global Header)**: Hiện diện trên mọi trang (Trang chủ & Tất cả phân hệ). Chứa đầy đủ 7 phân hệ cốt lõi của Tổng Công ty May 10, hiển thị trạng thái active bằng pill màu xanh nhận diện (`#0F5FAF`), tích hợp tìm kiếm, thông báo vận hành và chuyển đổi vai trò người dùng (RBAC).
2. **Level 2 — Module Level (Contextual Sidebar)**: CHỈ xuất hiện khi người dùng truy cập vào một phân hệ cụ thể (`pathname !== '/'`). Sidebar tự động lọc theo ngữ cảnh, chỉ hiển thị danh mục nghiệp vụ chuyên sâu của chính phân hệ đang mở (ví dụ: PH4 hiển thị đúng 8 nghiệp vụ Kho & Vật tư).
3. **Breadcrumb**: Nằm tự nhiên trong luồng tài liệu (`document flow`), bên dưới Global Header và phía trên nội dung nghiệp vụ, triệt tiêu hoàn toàn hiện tượng chèn/đè hoặc khoảng trắng thừa.

---

## 2. KIẾN TRÚC ĐIỀU HƯỚNG 2 CẤP ĐỘ (TWO-LEVEL NAVIGATION)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: GLOBAL TOP NAVIGATION (h-14 / 56px - Sticky top-0 z-40 - Toàn bộ ERP)         │
│ [GARCO 10 LOGO]  Trang chủ | Kinh doanh | Sản xuất | Mua hàng | [Kho (PH4)] | Tài chính │ [🔍 Search] [🔔] [👤 Admin] │
└────────────────────────────────────────────────────────────────────────────────────────┘
┌───────────────────────┬────────────────────────────────────────────────────────────────┐
│ LEVEL 2: CONTEXT SIDEBAR│ CONTENT AREA (max-w-7xl / document flow)                      │
│ (top-14 w-64 fixed)   │ 🏠 Trang chủ Portal > PH4 — Kho & Quản lý vật tư              │
│ 🏢 [PH4] KHO & VẬT TƯ │ ────────────────────────────────────────────────────────────── │
│ < Về Cổng Doanh nghiệp │ [Banner Phân hệ Kho & Quản lý vật tư]                          │
│                       │ [Thẻ Tổng quan] [Tồn kho] [Vị trí kệ] [Lô vật tư] ...          │
│ • Tổng quan kho       │                                                                │
│ • Tồn kho & Thẻ kho   │                                                                │
│ • Vị trí kho & Kệ     │                                                                │
│ • Lô vật tư & Cây vải │                                                                │
│ • Phiếu nhập kho      │                                                                │
│ • Phiếu xuất kho      │                                                                │
│ • Điều chuyển kho     │                                                                │
│ • Kiểm kê kho         │                                                                │
└───────────────────────┴────────────────────────────────────────────────────────────────┘
```

---

## 3. CHI TIẾT CÁC THÀNH PHẦN GIAO DIỆN

### 3.1. Global Top Navigation (`Header.jsx`)
- **Vị trí & Chiều cao**: Cố định trên cùng (`sticky top-0 z-40 w-full`), chiều cao chuẩn `h-14` (56px).
- **Background & Hiệu ứng**: `bg-white/95 backdrop-blur-md border-b border-[#DCEAF4] shadow-2xs`. Mang đặc trưng kính mờ thanh lịch của bộ nhận diện May 10.
- **Brand Identity**: Logo May 10 (`garco10-logo.svg`), thương hiệu `ERP MAY 10` với chỉ báo vận hành trực tuyến.
- **7 Phân hệ Điều hành**:
  1. **Trang chủ** (`/`): Cổng điều hành tổng quan doanh nghiệp.
  2. **Kinh doanh** (`/sales`): Bán hàng, đơn hàng xuất khẩu, hợp đồng may.
  3. **Sản xuất** (`/production`): Lệnh sản xuất (LSX), kế hoạch chuyền may.
  4. **Mua hàng** (`/purchasing`): Đơn mua vật tư (PO), quản lý nhà cung cấp.
  5. **Kho & Vật tư** (`/warehouse?tab=dashboard`): Quản trị kho vải & phụ liệu (Badge `PH4`).
  6. **Tài chính** (`/accounting`): Sổ cái kế toán, công nợ, định mức chi phí.
  7. **Quản trị** (`/admin/users`): Phân quyền người dùng, vai trò bảo mật RBAC.
- **Active State Indicator**:
  - Khi tại `/`: Tag **Trang chủ** nổi bật với pill màu xanh `bg-[#0F5FAF] text-white font-semibold rounded-full px-3.5 py-1.5 shadow-xs`.
  - Khi tại `/warehouse/*`: Tag **Kho & Vật tư** nổi bật với pill màu xanh `#0F5FAF`.
  - Tương tự với từng phân hệ khi người dùng truy cập.
- **Tiện ích tích hợp**:
  - Ô tìm kiếm nhanh với placeholder và icon `#5A8CAE`.
  - Chuông thông báo vận hành thời gian thực (`portalService.getNotifications`).
  - Menu tài khoản với định danh nhân sự, chức vụ, bộ chuyển đổi 5 vai trò demo (`admin`, `giam_doc`, `truong_phong_kd`, `quan_ly_kho`, `thu_kho`) và nút đăng xuất an toàn.
  - Hỗ trợ màn hình nhỏ: Nút toggle danh mục 7 phân hệ (`xl:hidden`) và nút toggle Module Sidebar (`lg:hidden` khi ở module).

### 3.2. Module Contextual Sidebar (`Sidebar.jsx`)
- **Vị trí**: Nằm dưới Global Header: `fixed top-14 bottom-0 left-0 w-64 z-30 bg-white border-r border-[#DCEAF4] flex flex-col`.
- **Ngữ cảnh chuyên biệt**: Tự động nhận diện phân hệ đang chạy:
  - Khi ở `/warehouse/*`: Hiển thị Context Box `[PH4] Kho & Quản lý Vật tư`, link `< Về Cổng Doanh nghiệp` và danh mục 8 nghiệp vụ chi tiết của phân hệ Kho (Tổng quan kho, Tồn kho & Thẻ kho, Vị trí kho, Lô vật tư & Cây vải, Phiếu nhập kho, Phiếu xuất kho, Điều chuyển kho, Kiểm kê kho).
- **Trạng thái Active**: `bg-[#EAF5FC] text-[#0F5FAF] font-semibold border-l-2 border-[#0F5FAF]`, icon `#0F5FAF`.
- **Trạng thái Inactive**: `text-[#4A7D9D] hover:bg-[#F0F7FC] hover:text-[#0F3B66]`, icon `#5A8CAE`.
- **Trang chủ (`/`)**: Không render Sidebar (MainLayout kiểm soát `!isHomePage`).

### 3.3. Breadcrumb Điều hướng (`Breadcrumb.jsx`)
- Nằm trong `document flow` ngay đầu vùng nội dung `<main>`.
- Ẩn hoàn toàn trên Trang chủ (`/`).
- Màu sắc: Text `#6B7785`, hover `#0F5FAF`, trang hiện tại `#172033`, icon phân cách `#96C8EB`.

### 3.4. Bố cục tổng thể (`MainLayout.jsx`)
```jsx
<div className="min-h-screen bg-[#F7FAFC] flex flex-col antialiased selection:bg-[#0F5FAF] selection:text-white">
  {/* 1. Global Header: Luôn ở trên cùng, sticky top-0 trên toàn bộ ERP */}
  <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />

  {/* 2. Nội dung: Phân tách Trang chủ (toàn chiều rộng) vs Phân hệ (Sidebar + Content) */}
  {isHomePage ? (
    <main className="flex-1 w-full max-w-[1480px] mx-auto px-4 sm:px-6 xl:px-8 py-4 sm:py-6">
      <Outlet />
    </main>
  ) : (
    <div className="flex-1 flex w-full relative">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Breadcrumb />
          <Outlet />
        </main>
      </div>
    </div>
  )}

  {/* 3. Footer Doanh nghiệp */}
  <div className={!isHomePage ? 'lg:pl-64' : ''}>
    <Footer />
  </div>
</div>
```

---

## 4. KẾT QUẢ KIỂM THỬ KHÔNG HỒI QUY (ZERO REGRESSION)

Toàn bộ các bộ kiểm thử độc lập đã được thực thi và vượt qua 100%:

| Bộ kiểm thử | Mục tiêu | Kết quả | Trạng thái |
|---|---|---|---|
| **Vite Frontend Build** | Kiểm tra cú pháp JSX, đóng mở thẻ, CSS Tailwind, bundle size | 0 Lỗi (4.23s, 467 kB JS, 53 kB CSS) | ✅ PASS |
| **PH4 REST API Suite** (`test_ph4_api.js`) | Kiểm thử toàn bộ 16 API nghiệp vụ kho, thẻ kho, nhập/xuất/kiểm kê | 16/16 Passed (100%) | ✅ PASS |
| **Race Condition Suite** (`test_concurrency.js`) | Kiểm tra tranh chấp tồn kho đồng thời với SELECT FOR UPDATE | Chặn xuất âm tuyệt đối, trả mã 409 Conflict | ✅ PASS |
| **RBAC Security Suite** (`test_rbac_security.js`) | Kiểm thử 27 kịch bản xác thực, giả mạo token, phân quyền | 27/27 Passed (100%) | ✅ PASS |

---

## 5. CAM KẾT ĐÓNG BĂNG & KẾT LUẬN (FREEZE STATEMENT)

- Kiến trúc Navigation 2 cấp độ V2.7 đã giải quyết triệt để sự bất nhất giữa Trang chủ và Trang phân hệ.
- Trải nghiệm toàn bộ hệ sinh thái phần mềm May 10 ERP đạt tính đồng bộ, chuyên nghiệp cao cấp chuẩn doanh nghiệp may mặc hàng đầu Việt Nam.
- Toàn bộ nghiệp vụ Backend, Database PostgreSQL, Cơ chế phân quyền RBAC và Phân hệ Kho PH4 được bảo vệ nguyên vẹn 100%.

**KẾT LUẬN CUỐI CÙNG: VERIFIED — FREEZE.**
