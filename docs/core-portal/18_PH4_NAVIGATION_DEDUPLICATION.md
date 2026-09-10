# BÁO CÁO TOÀN DIỆN: KHỬ TRÙNG LẶP NAVIGATION PHÂN HỆ PH4 (NAVIGATION DEDUPLICATION)
## MAY 10 ERP — REMOVE MIDDLE MENU ONLY / ZERO BUSINESS LOGIC CHANGE
**Mã tài liệu:** `18_PH4_NAVIGATION_DEDUPLICATION.md`  
**Ngày hoàn tất:** 10 Tháng 09 Năm 2026  
**Phân hệ:** PH4 — Kho & Quản lý vật tư (`/warehouse/*`)  
**Nguyên tắc tối cao tuân thủ:** UI ONLY — ZERO BUSINESS LOGIC CHANGE — GIỮ NGUYÊN CORE V2.11 — BẢO TOÀN TUYỆT ĐỐI GLOBAL HEADER, PH4 SIDEBAR, BACKEND & DATABASE.

---

## MỤC LỤC
1. [KIẾN TRÚC NAVIGATION TRƯỚC KHI SỬA (BEFORE ARCHITECTURE)](#1-kiến-trúc-navigation-trước-khi-sửa-before-architecture)
2. [XÁC ĐỊNH 3 TẦNG NAVIGATION TRONG HỆ THỐNG](#2-xác-định-3-tầng-navigation-trong-hệ-thống)
3. [XÁC ĐỊNH CHÍNH XÁC COMPONENT RENDER MIDDLE NAVIGATION (TẦNG C)](#3-xác-định-chính-xác-component-render-middle-navigation-tầng-c)
4. [CHI TIẾT LOGIC RENDER VÀ COMPONENT ĐÃ LOẠI BỎ](#4-chi-tiết-logic-render-và-component-đã-loại-bỏ)
5. [KIẾN TRÚC NAVIGATION SAU KHI SỬA (AFTER ARCHITECTURE)](#5-kiến-trúc-navigation-sau-khi-sửa-after-architecture)
6. [DANH MỤC FILE THAY ĐỔI (FILES CHANGED — DUY NHẤT 1 FILE)](#6-danh-mục-file-thay-đổi-files-changed--duy-nhất-1-file)
7. [DANH MỤC VÙNG BĂNG GIÁ TUYỆT ĐỐI KHÔNG SỬA (FILES UNTOUCHED)](#7-danh-mục-vùng-băng-giá-tuyệt-đối-không-sửa-files-untouched)
8. [MINH CHỨNG HÌNH ẢNH RUNTIME BROWSER TRƯỚC VÀ SAU (BEFORE / AFTER)](#8-minh-chứng-hình-ảnh-runtime-browser-trước-và-sau-before--after)
9. [KẾT QUẢ KIỂM THỬ RUNTIME 8 MÀN HÌNH PH4 TRÊN TRÌNH DUYỆT THẬT (CHROME CDP)](#9-kết-quả-kiểm-thử-runtime-8-màn-hình-ph4-trên-trình-duyệt-thật-chrome-cdp)
10. [KẾT QUẢ BIÊN DỊCH PRODUCTION FRONTEND (NPM RUN BUILD)](#10-kết-quả-biên-dịch-production-frontend-npm-run-build)
11. [KẾT QUẢ KIỂM THỬ HỒI QUY API PH4 (TEST_PH4_API.JS)](#11-kết-quả-kiểm-thử-hồi-quy-api-ph4-test_ph4_apijs)
12. [KẾT QUẢ KIỂM THỬ TRANH CHẤP ĐỒNG THỜI (TEST_CONCURRENCY.JS)](#12-kết-quả-kiểm-thử-tranh-chấp-đồng-thời-test_concurrencyjs)
13. [KẾT QUẢ KIỂM THỬ MA TRẬN PHÂN QUYỀN RBAC (TEST_RBAC_SECURITY.JS)](#13-kết-quả-kiểm-thử-ma-trận-phân-quyền-rbac-test_rbac_securityjs)
14. [TỔNG HỢP GIT DIFF VÀ KIỂM TOÁN SOURCE CODE (SOURCE DIFF AUDIT)](#14-tổng-hợp-git-diff-và-kiểm-toán-source-code-source-diff-audit)
15. [CAM KẾT TOÀN VẸN NGHIỆP VỤ (BUSINESS LOGIC INTEGRITY)](#15-cam-kết-toàn-vẹn-nghiệp-vụ-business-logic-integrity)
16. [PHÁN QUYẾT CUỐI CÙNG (FINAL VERDICT)](#16-phán-quyết-cuối-cùng-final-verdict)

---

## 1. KIẾN TRÚC NAVIGATION TRƯỚC KHI SỬA (BEFORE ARCHITECTURE)

Trước khi thực hiện đợt điều chỉnh này, phân hệ PH4 (Kho & Quản lý vật tư) xuất hiện **3 tầng điều hướng**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ ① GLOBAL HEADER (Sticky Top across Portal)                             │
│ Logo | Trang chủ | Bán hàng | Sản xuất | Mua hàng | Kho & Vật tư | ...│
└────────────────────────────────────────────────────────────────────────┘
┌─────────────────────┬──────────────────────────────────────────────────┐
│ ② PH4 SIDEBAR       │ NỘI DUNG PHÂN HỆ                                 │
│                     │ ┌──────────────────────────────────────────────┐ │
│ • Tổng quan kho     │ │ ModuleHeader (PH4 Banner)                    │ │
│ • Tồn kho & Thẻ kho │ └──────────────────────────────────────────────┘ │
│ • Vị trí kho        │ ┌──────────────────────────────────────────────┐ │
│ • Lô vật tư         │ │ ③ MIDDLE DUPLICATE TAB BAR (TRÙNG LẶP)       │ │
│ • Phiếu nhập kho    │ │ [Tổng quan] [Tồn kho] [Vị trí] [Lô hàng] ... │ │
│ • Phiếu xuất kho    │ └──────────────────────────────────────────────┘ │
│ • Điều chuyển kho   │ ┌──────────────────────────────────────────────┐ │
│ • Kiểm kê kho       │ │ Business Content (Cards, Tables, Filters)    │ │
│                     │ └──────────────────────────────────────────────┘ │
└─────────────────────┴──────────────────────────────────────────────────┘
```

**Vấn đề:**
- Thanh tab nằm ngang ③ (`div.rounded-2xl.p-2`) nằm ở giữa màn hình bên dưới `ModuleHeader` có đúng 8 nút bấm tương ứng với 8 chức năng đã hiện diện đầy đủ, rõ ràng và có thứ bậc trên **PH4 Sidebar (②)**.
- Sự tồn tại đồng thời của Sidebar bên trái và Thanh tab ở giữa gây lãng phí không gian chiều dọc (khoảng 50px), làm phân tán sự chú ý của người dùng, vi phạm nguyên tắc điều hướng tinh gọn (DRY Navigation) của Enterprise UX.

---

## 2. XÁC ĐỊNH 3 TẦNG NAVIGATION TRONG HỆ THỐNG

Quá trình trace luồng component từ Layout tổng thể đến màn hình chi tiết:

```text
<MainLayout />
  ├── ① <Header /> ───────────── Global Top Nav (Cấp Hệ Thống: chọn phân hệ)
  ├── ② <Sidebar /> ──────────── Module Context Sidebar (Cấp Phân Hệ: chọn chức năng PH4)
  └── <Outlet />
        └── <WarehouseModule />
              ├── <ModuleHeader /> (Banner tiêu đề + nút "Làm mới dữ liệu")
              ├── ③ Middle Tabs ── Tab Bar ngang (TRÙNG LẶP CHỨC NĂNG VỚI SIDEBAR)
              └── {renderActiveScreen()} (Màn hình nghiệp vụ chi tiết)
```

1. **Tầng A (Global Header):** `frontend/src/components/layout/Header.jsx`  
   - Điều hướng cấp Enterprise: Logo May 10, chuyển đổi giữa các phân hệ PH1, PH2, PH3, PH4, PH5, SYS.
2. **Tầng B (PH4 Contextual Sidebar):** `frontend/src/components/layout/Sidebar.jsx` (dữ liệu từ `frontend/src/config/menu.js`)  
   - Điều hướng chuyên trách của phân hệ PH4: Danh sách 8 chức năng nghiệp vụ, hỗ trợ phân quyền RBAC, lọc theo vai trò, tự động highlight mục active dựa trên query parameter `?tab=`.
3. **Tầng C (Middle Navigation / Horizontal Tab Menu):** `frontend/src/pages/WarehouseModule.jsx`  
   - Render thanh tab ngang chứa 8 button duyệt tab bên trong khu vực content. Đây chính là **tầng trùng lặp cần loại bỏ triệt để**.

---

## 3. XÁC ĐỊNH CHÍNH XÁC COMPONENT RENDER MIDDLE NAVIGATION (TẦNG C)

Kết quả audit source code toàn diện:
- **FILE:** `E:\ERP\frontend\src\pages\WarehouseModule.jsx`
- **COMPONENT:** `WarehouseModule`
- **ROUTE:** `/warehouse/*`
- **RENDER LOCATION:** Dòng 109 đến 130 (ngay sau `<ModuleHeader />` và ngay trước `{renderActiveScreen()}`).
- **MÃ NGUỒN CŨ BỊ TRÙNG LẶP:**
```jsx
{/* Sub-navigation Tabs aligned with Core V2.11 Tokens */}
<div className="bg-white rounded-2xl p-2 border border-[#E2EDF5] shadow-sm flex items-center gap-1.5 overflow-x-auto">
  {TABS.map((tab) => {
    const Icon = tab.icon;
    const isActive = currentTab === tab.id;

    return (
      <button
        key={tab.id}
        onClick={() => handleTabChange(tab.id)}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all font-semibold ${
          isActive
            ? 'bg-[#0F5FAF] text-white shadow-sm'
            : 'text-[#5F6F82] hover:text-[#0F5FAF] hover:bg-[#F4FAFE]'
        }`}
      >
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{tab.label}</span>
      </button>
    );
  })}
</div>
```

---

## 4. CHI TIẾT LOGIC RENDER VÀ COMPONENT ĐÃ LOẠI BỎ

Để khử trùng lặp hoàn toàn mà không làm gián đoạn trải nghiệm người dùng hay phá vỡ routing:
1. **Xóa bỏ khối JSX thanh tab ngang (dòng 109 - 130).**
2. **Xóa bỏ mảng khai báo `TABS`** và loại bỏ các icon thừa chỉ dùng cho thanh tab này (`LayoutDashboard`, `Package`, `Layers`, `Tag`, `ArrowDownLeft`, `ArrowUpRight`, `ClipboardCheck`, `CheckCircle2`, `Lock`). Giữ lại `RefreshCw` cho nút "Làm mới dữ liệu" trong `ModuleHeader`.
3. **Loại bỏ hàm nội bộ `handleTabChange`** (vì việc chuyển tab nay được thực hiện 100% qua `<Sidebar />` thông qua các NavLink chuẩn của React Router).
4. **Bổ sung cơ chế tự chuẩn hóa URL (URL Normalization):**  
   Khi người dùng truy cập trực tiếp vào `/warehouse` (không có query parameter), một hook `useEffect` gọn nhẹ sẽ cập nhật URL thành `/warehouse?tab=dashboard` (`replace: true`). Điều này đảm bảo mục "Tổng quan kho" trên PH4 Sidebar luôn được highlight active chính xác ngay lập tức.
5. **Nội dung màn hình nghiệp vụ (`{renderActiveScreen()}`)** nay được đưa lên ngay dưới `ModuleHeader`, loại bỏ khoảng trống thừa và mang lại không gian hiển thị rộng rãi, trực quan cho các bảng dữ liệu và thẻ KPI.

---

## 5. KIẾN TRÚC NAVIGATION SAU KHI SỬA (AFTER ARCHITECTURE)

Hệ thống đạt đúng chuẩn kiến trúc 2 tầng điều hướng duy nhất:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ ① GLOBAL HEADER (Enterprise Level Navigation)                          │
│ Logo May 10 | Trang chủ | Bán hàng | Sản xuất | Mua hàng | Kho ...    │
└────────────────────────────────────────────────────────────────────────┘
┌─────────────────────┬──────────────────────────────────────────────────┐
│ ② PH4 SIDEBAR       │ PH4 WORKSPACE / CONTENT                          │
│ (Module Navigation) │                                                  │
│                     │ ┌──────────────────────────────────────────────┐ │
│ • Tổng quan kho     │ │ ModuleHeader (Banner May 10 + Nút Làm mới)   │ │
│ • Tồn kho & Thẻ kho │ └──────────────────────────────────────────────┘ │
│ • Vị trí kho        │                                                  │
│ • Lô vật tư & Vải   │ ┌──────────────────────────────────────────────┐ │
│ • Phiếu nhập kho    │ │                                              │ │
│ • Phiếu xuất kho    │ │ BUSINESS CONTENT                             │ │
│ • Điều chuyển kho   │ │ (KPI Cards, Master Tables, Forms, Filters)   │ │
│ • Kiểm kê kho       │ │                                              │ │
│                     │ └──────────────────────────────────────────────┘ │
└─────────────────────┴──────────────────────────────────────────────────┘
```

**Đặc điểm kiến trúc:**
- **CORE LEVEL:** Global Header phụ trách chuyển đổi phân hệ trên toàn tập đoàn.
- **MODULE LEVEL:** PH4 Sidebar phụ trách điều hướng 8 chức năng nghiệp vụ nội bộ của Kho.
- **CONTENT LEVEL:** `ModuleHeader` tiêu đề + Trực tiếp nội dung nghiệp vụ.
- **HOÀN TOÀN KHÔNG CÒN TẦNG ĐIỀU HƯỚNG THỨ 3 Ở GIỮA.**

---

## 6. DANH MỤC FILE THAY ĐỔI (FILES CHANGED — DUY NHẤT 1 FILE)

Chỉ có duy nhất 1 file được phép và đã được điều chỉnh trong toàn bộ dự án:

| STT | Tên File | Đường dẫn tuyệt đối | Nội dung thay đổi |
|:---:|---|---|---|
| 1 | `WarehouseModule.jsx` | `E:\ERP\frontend\src\pages\WarehouseModule.jsx` | Xóa bỏ rendering thanh tab ngang giữa trang; dọn dẹp các icon không dùng; thêm hook chuẩn hóa route `?tab=dashboard`. Giữ nguyên 100% 8 trang con và cơ chế `showToast`/`refreshKey`. |

---

## 7. DANH MỤC VÙNG BĂNG GIÁ TUYỆT ĐỐI KHÔNG SỬA (FILES UNTOUCHED)

Tuân thủ nghiêm ngặt nguyên tắc đóng băng (Frozen Boundaries):

1. **Vỏ bọc Core Portal (Core Shell UI):**
   - `frontend/src/components/layout/Header.jsx`: **KHÔNG SỬA** (Giữ nguyên menu, dropdown hover bridge).
   - `frontend/src/components/layout/Sidebar.jsx`: **KHÔNG SỬA** (Giữ nguyên cấu trúc sidebar, token, rbac filter).
   - `frontend/src/components/layout/MainLayout.jsx`: **KHÔNG SỬA** (Giữ nguyên layout, breadcrumb, footer).
   - `frontend/src/components/layout/Breadcrumb.jsx`: **KHÔNG SỬA**.
   - `frontend/src/config/menu.js`: **KHÔNG SỬA** (Giữ nguyên danh mục menu và path `/warehouse?tab=...`).
2. **Xác thực & Bảo mật (Auth & Security):**
   - `frontend/src/components/rbac/AuthContext.jsx`: **KHÔNG SỬA**.
   - `frontend/src/components/rbac/ProtectedRoute.jsx`: **KHÔNG SỬA**.
   - `frontend/src/components/rbac/PermissionGuard.jsx`: **KHÔNG SỬA**.
3. **Các trang màn hình con PH4 (Child Screens):**
   - `DashboardPage.jsx`, `TonKhoPage.jsx`, `ViTriKhoPage.jsx`, `LoVatTuPage.jsx`, `PhieuNhapPage.jsx`, `PhieuXuatPage.jsx`, `PhieuChuyenPage.jsx`, `PhieuKiemKePage.jsx`: **KHÔNG SỬA**.
4. **Hệ thống Backend, API & Database:**
   - Tất cả Controllers, Routes, Middleware, Transaction (`SELECT ... FOR UPDATE`): **KHÔNG SỬA**.
   - Cơ sở dữ liệu PostgreSQL `erp_may10`, schema, tables: **KHÔNG SỬA**.

---

## 8. MINH CHỨNG HÌNH ẢNH RUNTIME BROWSER TRƯỚC VÀ SAU (BEFORE / AFTER)

| Màn hình | Trước khi sửa (Còn Middle Tab Menu) | Sau khi sửa (Chỉ còn Global Header + Sidebar) |
|---|---|---|
| **1. Tổng quan kho** | `docs/core-portal/gap_fix_screenshots/PH4_01_Dashboard.png` | `docs/core-portal/dedup_screenshots/PH4_01_Dashboard.png` |
| **2. Tồn kho & Thẻ kho** | `docs/core-portal/gap_fix_screenshots/PH4_02_TonKho.png` | `docs/core-portal/dedup_screenshots/PH4_02_TonKho.png` |
| **3. Vị trí kho** | `docs/core-portal/gap_fix_screenshots/PH4_03_ViTriKho.png` | `docs/core-portal/dedup_screenshots/PH4_03_ViTriKho.png` |
| **4. Lô vật tư & Cây vải** | `docs/core-portal/gap_fix_screenshots/PH4_04_LoVatTu.png` | `docs/core-portal/dedup_screenshots/PH4_04_LoVatTu.png` |
| **5. Phiếu nhập kho** | `docs/core-portal/gap_fix_screenshots/PH4_05_PhieuNhap.png` | `docs/core-portal/dedup_screenshots/PH4_05_PhieuNhap.png` |
| **6. Phiếu xuất kho** | `docs/core-portal/gap_fix_screenshots/PH4_06_PhieuXuat.png` | `docs/core-portal/dedup_screenshots/PH4_06_PhieuXuat.png` |
| **7. Điều chuyển kho** | `docs/core-portal/gap_fix_screenshots/PH4_07_PhieuChuyen.png` | `docs/core-portal/dedup_screenshots/PH4_07_PhieuChuyen.png` |
| **8. Kiểm kê kho** | `docs/core-portal/gap_fix_screenshots/PH4_08_PhieuKiemKe.png` | `docs/core-portal/dedup_screenshots/PH4_08_PhieuKiemKe.png` |

> Tất cả 8 ảnh chụp màn hình sau khi khử trùng lặp được lưu trữ tại thư mục:  
> `E:\ERP\docs\core-portal\dedup_screenshots\`

---

## 9. KẾT QUẢ KIỂM THỬ RUNTIME 8 MÀN HÌNH PH4 TRÊN TRÌNH DUYỆT THẬT (CHROME CDP)

Kiểm thử tự động thông qua giao thức Chrome DevTools Protocol (CDP port 9225) điều khiển trực tiếp trình duyệt Chrome, thực hiện click từng mục điều hướng trên **PH4 Sidebar** và trích xuất dữ liệu DOM:

| STT | Màn hình PH4 | URL Route | Có Global Header? | Có PH4 Sidebar? | Số lượng nút Middle Tab (Yêu cầu = 0) | Mục Sidebar đang Active | Màn hình Trắng (Blank)? | Trạng thái xác minh |
|:---:|---|---|:---:|:---:|:---:|---|:---:|:---:|
| 1 | **Tổng quan kho** | `/warehouse?tab=dashboard` | **CÓ** | **CÓ** | **0** | **"Tổng quan kho"** | **KHÔNG** | ✅ ĐẠT |
| 2 | **Tồn kho & Thẻ kho** | `/warehouse?tab=ton-kho` | **CÓ** | **CÓ** | **0** | **"Tồn kho & Thẻ kho"** | **KHÔNG** | ✅ ĐẠT |
| 3 | **Vị trí kho** | `/warehouse?tab=vi-tri` | **CÓ** | **CÓ** | **0** | **"Vị trí kho"** | **KHÔNG** | ✅ ĐẠT |
| 4 | **Lô vật tư & Cây vải** | `/warehouse?tab=lo-vat-tu` | **CÓ** | **CÓ** | **0** | **"Lô vật tư & Cây vải"** | **KHÔNG** | ✅ ĐẠT |
| 5 | **Phiếu nhập kho** | `/warehouse?tab=phieu-nhap` | **CÓ** | **CÓ** | **0** | **"Phiếu nhập kho"** | **KHÔNG** | ✅ ĐẠT |
| 6 | **Phiếu xuất kho** | `/warehouse?tab=phieu-xuat` | **CÓ** | **CÓ** | **0** | **"Phiếu xuất kho"** | **KHÔNG** | ✅ ĐẠT |
| 7 | **Điều chuyển kho** | `/warehouse?tab=phieu-chuyen` | **CÓ** | **CÓ** | **0** | **"Điều chuyển kho"** | **KHÔNG** | ✅ ĐẠT |
| 8 | **Kiểm kê kho** | `/warehouse?tab=kiem-ke` | **CÓ** | **CÓ** | **0** | **"Kiểm kê kho"** | **KHÔNG** | ✅ ĐẠT |

**Kết luận Runtime:**
- Cả 8/8 màn hình **HOÀN TOÀN KHÔNG CÒN MIDDLE TAB DUPLICATE** (`middleTabsCount = 0`).
- Cả 8/8 màn hình đều hiển thị đầy đủ Global Header và PH4 Sidebar.
- Điều hướng bằng Sidebar hoạt động mượt mà, phản hồi lập tức.
- Menu active trên Sidebar chính xác 100% với từng route tương ứng.
- Không có bất kỳ lỗi JavaScript runtime nào, không tràn layout, không blank screen.

---

## 10. KẾT QUẢ BIÊN DỊCH PRODUCTION FRONTEND (NPM RUN BUILD)

- **Lệnh thực hiện:** `npm run build` (tại thư mục `E:\ERP\frontend`)
- **Kết quả:** **PASS (Exit Code 0)**.
- **Thời gian build:** 19.45 giây.
- **Chi tiết:**
  ```text
  vite v6.4.3 building for production...
  transforming...
  ✓ 1700 modules transformed.
  rendering chunks...
  computing gzip size...
  dist/index.html                   0.83 kB │ gzip:   0.51 kB
  dist/assets/index-BmKM9G4n.css   56.29 kB │ gzip:   9.39 kB
  dist/assets/index-CCoL4oq5.js   483.70 kB │ gzip: 126.19 kB
  ✓ built in 19.45s
  ```
- Không có bất kỳ lỗi biên dịch nào, mã nguồn sạch sẽ.

---

## 11. KẾT QUẢ KIỂM THỬ HỒI QUY API PH4 (TEST_PH4_API.JS)

- **Lệnh thực hiện:** `node tests/test_ph4_api.js` (tại thư mục `E:\ERP\backend`)
- **Kết quả:** **16/16 TESTS PASSED (100%)**.
  1. Health check & Hệ thống: UP (200 OK)
  2. Danh mục kho (3 kho): PASS
  3. Danh mục vật tư (4 vật tư): PASS
  4. Liên kết liên phân hệ (PH1, PH2, PH3): PASS
  5. Danh sách vị trí kho: PASS
  6. Thêm mới vị trí kho: PASS
  7. Danh sách lô vật tư: PASS
  8. Báo cáo tồn kho: PASS
  9. Thống kê Dashboard kho: PASS
  10. Tra cứu thẻ kho chi tiết: PASS
  11. Lập phiếu nhập kho: PASS
  12. Xuất kho hợp lệ: PASS
  13. Chặn xuất quá tồn kho (HTTP 409 Conflict): PASS
  14. Lập phiếu chuyển kho nội bộ: PASS
  15. Lập phiếu kiểm kê: PASS
  16. Điều chỉnh cân đối tồn kho: PASS

---

## 12. KẾT QUẢ KIỂM THỬ TRANH CHẤP ĐỒNG THỜI (TEST_CONCURRENCY.JS)

- **Lệnh thực hiện:** `node tests/test_concurrency.js` (tại thư mục `E:\ERP\backend`)
- **Kết quả:** **100% PASSED**.
  - Gửi đồng thời 2 request xuất kho (80.000m và 50.000m) trên tổng tồn kho 100.000m.
  - Request 1 thành công (HTTP 201).
  - Request 2 bị chặn với HTTP 409 Conflict (`INSUFFICIENT_STOCK`).
  - Cơ chế `SELECT ... FOR UPDATE` trong Transaction PostgreSQL được bảo toàn nguyên vẹn, số dư tồn kho sau cùng chính xác tuyệt đối là 20.000m, triệt tiêu nguy cơ âm kho.

---

## 13. KẾT QUẢ KIỂM THỬ MA TRẬN PHÂN QUYỀN RBAC (TEST_RBAC_SECURITY.JS)

- **Lệnh thực hiện:** `node tests/test_rbac_security.js` (tại thư mục `E:\ERP\backend`)
- **Kết quả:** **27/27 TEST CASES PASSED (100%)**.
  - Kiểm tra Zero-trust, chống giả mạo token, chống leo thang đặc quyền `x-role`/`x-user-id`.
  - Phân quyền các phân hệ chặt chẽ: Thủ kho, Quản trị viên, Bán hàng.

---

## 14. TỔNG HỢP GIT DIFF VÀ KIỂM TOÁN SOURCE CODE (SOURCE DIFF AUDIT)

Kiểm toán toàn bộ cây thư mục dự án xác nhận duy nhất 1 file `WarehouseModule.jsx` có sự thay đổi:

```text
============================================================
SOURCE DIFF AUDIT VERIFICATION
============================================================
Backend changed:              NO  (0 files)
Database changed:             NO  (0 files)
API contracts changed:        NO  (0 files)
RBAC & Auth changed:          NO  (0 files)
Header.jsx changed:           NO  (0 files)
Sidebar.jsx changed:          NO  (0 files)
MainLayout.jsx changed:       NO  (0 files)
Breadcrumb.jsx changed:       NO  (0 files)
Homepage changed:             NO  (0 files)
PH4 business logic changed:   NO  (0 files)

Allowed Modification:
frontend/src/pages/WarehouseModule.jsx (PH4 navigation rendering only)
============================================================
```

Chi tiết diff tại `frontend/src/pages/WarehouseModule.jsx`:
```diff
--- a/frontend/src/pages/WarehouseModule.jsx
+++ b/frontend/src/pages/WarehouseModule.jsx
@@ -1,18 +1,7 @@
 import ModuleHeader from '../components/layout/ModuleHeader';
 import React, { useState, useEffect } from 'react';
-import { useSearchParams, useNavigate } from 'react-router-dom';
-import {
-  LayoutDashboard,
-  Package,
-  Layers,
-  Tag,
-  ArrowDownLeft,
-  ArrowUpRight,
-  RefreshCw,
-  ClipboardCheck,
-  CheckCircle2,
-  Lock,
-} from 'lucide-react';
+import { useSearchParams } from 'react-router-dom';
+import { RefreshCw } from 'lucide-react';
 import Toast from '../components/Toast';
 import { useAuth } from '../components/rbac/AuthContext';
 
@@ -25,17 +25,6 @@
 import PhieuChuyenPage from './PhieuChuyenPage';
 import PhieuKiemKePage from './PhieuKiemKePage';
 
-const TABS = [
-  { id: 'dashboard', label: 'Tổng Quan Kho', icon: LayoutDashboard },
-  { id: 'ton-kho', label: 'Tồn Kho & Thẻ Kho', icon: Package },
-  { id: 'vi-tri', label: 'Sơ Đồ Kệ Kho', icon: Layers },
-  { id: 'lo-vat-tu', label: 'Lô Vật Tư & Vải', icon: Tag },
-  { id: 'phieu-nhap', label: 'Phiếu Nhập Kho', icon: ArrowDownLeft },
-  { id: 'phieu-xuat', label: 'Phiếu Xuất Kho', icon: ArrowUpRight },
-  { id: 'phieu-chuyen', label: 'Điều Chuyển Kho', icon: RefreshCw },
-  { id: 'kiem-ke', label: 'Kiểm Kê Kho', icon: ClipboardCheck },
-];
-
 export default function WarehouseModule() {
   const [searchParams, setSearchParams] = useSearchParams();
   const currentTab = searchParams.get('tab') || 'dashboard';
@@ -42,6 +42,13 @@
   const [toast, setToast] = useState(null);
   const { hasPermission } = useAuth();
 
+  // Normalize /warehouse to /warehouse?tab=dashboard to keep PH4 Sidebar active state in sync
+  useEffect(() => {
+    if (!searchParams.get('tab')) {
+      setSearchParams({ tab: 'dashboard' }, { replace: true });
+    }
+  }, [searchParams, setSearchParams]);
+
   const showToast = (toastData) => {
     setToast(toastData);
     setTimeout(() => {
@@ -48,10 +48,6 @@
     }, 6000);
   };
 
-  const handleTabChange = (tabId) => {
-    setSearchParams({ tab: tabId });
-  };
-
   const handleRefresh = () => {
     setRefreshKey((prev) => prev + 1);
     showToast({
@@ -102,31 +102,8 @@
         </button>
       </ModuleHeader>
 
-      {/* Sub-navigation Tabs aligned with Core V2.11 Tokens */}
-      <div className="bg-white rounded-2xl p-2 border border-[#E2EDF5] shadow-sm flex items-center gap-1.5 overflow-x-auto">
-        {TABS.map((tab) => {
-          const Icon = tab.icon;
-          const isActive = currentTab === tab.id;
-
-          return (
-            <button
-              key={tab.id}
-              onClick={() => handleTabChange(tab.id)}
-              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all font-semibold ${
-                isActive
-                  ? 'bg-[#0F5FAF] text-white shadow-sm'
-                  : 'text-[#5F6F82] hover:text-[#0F5FAF] hover:bg-[#F4FAFE]'
-              }`}
-            >
-              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
-              <span>{tab.label}</span>
-            </button>
-          );
-        })}
-      </div>
-
-      {/* Active Screen Content */}
-      <div className="pt-1">
+      {/* Active Screen Content (Directly below ModuleHeader, No duplicate middle menu) */}
+      <div>
         {renderActiveScreen()}
       </div>
```

---

## 15. CAM KẾT TOÀN VẸN NGHIỆP VỤ (BUSINESS LOGIC INTEGRITY)

1. **Bảo tồn nguyên vẹn Global Shell:** Không thay đổi bất kỳ thuộc tính nào của Global Header (`Header.jsx`) và Contextual Sidebar (`Sidebar.jsx`).
2. **Bảo tồn nguyên vẹn 8 trang nghiệp vụ PH4:** Toàn bộ bảng dữ liệu tồn kho, sơ đồ vị trí kệ, theo dõi hạn dùng FEFO của lô vải, quy trình phiếu nhập, xuất, chuyển kho và kiểm kê không bị xáo trộn hay thay đổi API gọi dữ liệu.
3. **Bảo tồn cơ chế bảo vệ giao dịch:** Toàn bộ lệnh khóa dòng `SELECT ... FOR UPDATE` và logic chặn xuất âm kho trong cơ sở dữ liệu PostgreSQL `erp_may10` được kiểm thử và xác nhận hoạt động 100% chính xác.
4. **Không tạo phiên bản thiết kế mới:** Hệ thống tiếp tục vận hành trên nền tảng chuẩn mực duy nhất là **Global Core UI V2.11**.

---

## 16. PHÁN QUYẾT CUỐI CÙNG (FINAL VERDICT)

```text
======================================================================
                         FINAL VERDICT
      [ A. VERIFIED — PH4 HAS ONLY 2 NAVIGATION LEVELS ]
======================================================================
 1. Đã xóa bỏ hoàn toàn navigation tầng thứ 3 (Middle Tab Menu) ở giữa.
 2. Toàn bộ phân hệ PH4 nay chỉ có 2 tầng điều hướng:
    - Tầng 1: Global Top Header (chọn phân hệ ERP May 10)
    - Tầng 2: PH4 Contextual Sidebar (chọn 8 chức năng kho & vật tư)
 3. Header và Sidebar giữ nguyên 100%, không bị sửa đổi.
 4. Toàn bộ 8 màn hình PH4 hiển thị trực tiếp dưới ModuleHeader.
 5. 100% Kiểm thử hồi quy thành công (Build PASS, PH4 API 16/16 PASS,
    Concurrency 100% PASS, RBAC 27/27 PASS).
======================================================================
```
