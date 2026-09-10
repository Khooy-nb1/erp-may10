# BÁO CÁO TOÀN DIỆN: KHẮC PHỤC TRIỆT ĐỂ UI GAPS PHÂN HỆ PH4 THEO GLOBAL CORE UI V2.11
## MAY 10 ERP — CONTROLLED UI GAP FIX / ZERO BUSINESS LOGIC CHANGE REPORT
**Mã tài liệu:** `17_PH4_UI_V2_11_GAP_FIX_REPORT.md`  
**Ngày hoàn tất:** 10 Tháng 09 Năm 2026  
**Phân hệ:** PH4 — Kho & Quản lý vật tư (`/warehouse/*`)  
**Tài liệu cơ sở đối chiếu:** `16_PH4_UI_V2_11_FULL_AUDIT.md`  
**Nguyên tắc tối cao:** UI ONLY — ZERO BUSINESS LOGIC CHANGE — KHÔNG TẠO V2.12 / V2.13 — TUYỆT ĐỐI GIỮ NGUYÊN CORE SHELL & BACKEND.

---

## MỤC LỤC
1. [TỔNG QUAN ĐIỀU HÀNH & KẾT LUẬN (EXECUTIVE SUMMARY)](#1-tổng-quan-điều-hành--kết-luận-executive-summary)
2. [PHẠM VI ĐIỀU CHỈNH: 10 FILES ĐÃ SỬA](#2-phạm-vi-điều-chỉnh-10-files-đã-sửa)
3. [DANH MỤC VÙNG BĂNG GIÁ (FROZEN BOUNDARIES)](#3-danh-mục-vùng-băng-giá-frozen-boundaries)
4. [KẾT QUẢ XỬ LÝ GAP 1: PHỤC HỒI SHADOW & DEPTH TRÊN TAILWIND V3](#4-kết-quả-xử-lý-gap-1-phục-hồi-shadow--depth-trên-tailwind-v3)
5. [KẾT QUẢ XỬ LÝ GAP 2: ĐỒNG BỘ TOKEN V2.11 CHO MODULEHEADER](#5-kết-quả-xử-lý-gap-2-đồng-bộ-token-v211-cho-moduleheader)
6. [KẾT QUẢ XỬ LÝ GAP 3: TRIỆT TIÊU BLANK SCREEN & XỬ LÝ 401 SESSION EXPIRY](#6-kết-quả-xử-lý-gap-3-triệt-tiêu-blank-screen--xử-lý-401-session-expiry)
7. [BẢNG ĐỐI CHIẾU BEFORE VS AFTER (TRƯỚC VÀ SAU FIX)](#7-bảng-đối-chiếu-before-vs-after-trước-và-sau-fix)
8. [KẾT QUẢ BROWSER RUNTIME AUDIT CHI TIẾT (8 TABS + 401 STATE)](#8-kết-quả-browser-runtime-audit-chi-tiết-8-tabs--401-state)
9. [KẾT QUẢ KIỂM THỬ HỒI QUY TOÀN DIỆN (REGRESSION VERIFICATION)](#9-kết-quả-kiểm-thử-hồi-quy-toàn-diện-regression-verification)
10. [TỔNG HỢP GIT / CODE DIFF THỰC TẾ](#10-tổng-hợp-git--code-diff-thực-tế)
11. [CAM KẾT TOÀN VẸN NGHIỆP VỤ (INTEGRITY GUARANTEE)](#11-cam-kết-toàn-vẹn-nghiệp-vụ-integrity-guarantee)
12. [PHÁN QUYẾT CUỐI CÙNG (FINAL VERDICT)](#12-phán-quyết-cuối-cùng-final-verdict)

---

## 1. TỔNG QUAN ĐIỀU HÀNH & KẾT LUẬN (EXECUTIVE SUMMARY)

### 1.1. Bối cảnh thực hiện
Tại báo cáo kiểm định độc lập `16_PH4_UI_V2_11_FULL_AUDIT.md`, hệ thống đã làm rõ rằng source code PH4 đã được refactor 9/9 files, tuy nhiên người dùng chưa thấy sự thay đổi rõ ràng trên trình duyệt thực tế do **3 UI/Runtime Gaps cụ thể**:
1. **Lỗi cú pháp Tailwind Shadow v4 trên Tailwind v3.4.17:** Sử dụng các class `shadow-xs`, `shadow-2xs`, `backdrop-blur-xs` không tồn tại trong Tailwind v3, dẫn đến trình duyệt render `box-shadow: none` — các card bị phẳng lì, mất hoàn toàn chiều sâu thị giác.
2. **Lỗi lệch Token tại Header phân hệ (`ModuleHeader.jsx`):** Banner trên cùng vẫn dùng `rounded-xl` (12px) và `border-[#DCEAF4]` thay vì chuẩn V2.11 (`rounded-2xl` 16px, `border-[#E2EDF5]`, `shadow-sm`).
3. **Lỗi Blank Screen do xử lý 401 Unauthorized:** Tại `DashboardPage.jsx`, đoạn code `if (!stats) return null;` khiến màn hình biến thành một khoảng trắng trơn không phản hồi khi token phiên đăng nhập hết hạn hoặc API gặp sự cố.

### 1.2. Kết quả khắc phục
Đợt xử lý có kiểm soát (Controlled Gap Fix) đã hoàn thành 100% mục tiêu:
- **Khắc phục 10/10 files trong phạm vi cho phép.**
- **Không tạo design system mới, giữ vững chuẩn V2.11.**
- **Không sửa bất kỳ dòng code Backend, Database, Auth hoặc Core Shell nào.**
- **Đạt 100% tiêu chí kiểm định Runtime trên trình duyệt thực tế (Headless Chrome CDP):**
  - Toàn bộ ModuleHeader và Card/Container của cả 8 tab đều mang `boxShadow: rgba(0, 0, 0, 0.05) 0px 1px 2px 0px`.
  - Toàn bộ bo góc đạt chuẩn `borderRadius: 16px` (`rounded-2xl`).
  - Toàn bộ đường viền đạt chuẩn `borderColor: rgb(226, 237, 245)` (`#E2EDF5`).
- **Triệt tiêu 100% nguy cơ Blank Screen:** Hiển thị Card cảnh báo phiên hết hạn chuẩn Enterprise kèm nút CTA "Đăng nhập lại".
- **Hệ thống an toàn tuyệt đối:** 100% Test Suites (Build, PH4 API 16/16, Concurrency, RBAC 27/27) đều PASS hoàn toàn.

---

## 2. PHẠM VI ĐIỀU CHỈNH: 10 FILES ĐÃ SỬA

Tất cả các thay đổi được kiểm soát chặt chẽ, CHỈ chỉnh sửa các class Tailwind và JSX hiển thị trạng thái lỗi trong đúng 10 files sau:

| STT | File điều chỉnh | Vị trí | Nội dung thay đổi |
|:---:|---|---|---|
| 1 | `ModuleHeader.jsx` | `frontend/src/components/layout/` | Cập nhật container sang `rounded-2xl border-[#E2EDF5] shadow-sm`. Giữ nguyên 100% title, props, background ảnh và layout. |
| 2 | `WarehouseModule.jsx` | `frontend/src/pages/` | Thay `shadow-2xs`, `shadow-xs` -> `shadow-sm` trên navigation tab bar container. |
| 3 | `DashboardPage.jsx` | `frontend/src/pages/` | Thay `shadow-xs` -> `shadow-sm` trên 4 KPI Cards và bảng biểu; Xóa bỏ `if (!stats) return null;`; Bổ sung giao diện 401 Session Expiry và General Error Card kèm CTA. |
| 4 | `TonKhoPage.jsx` | `frontend/src/pages/` | Thay `shadow-xs`, `shadow-2xs`, `backdrop-blur-xs` -> `shadow-sm`, `backdrop-blur-sm` trên filter bar, table card, export dropdown. |
| 5 | `ViTriKhoPage.jsx` | `frontend/src/pages/` | Thay `shadow-xs`, `shadow-2xs`, `backdrop-blur-xs` -> `shadow-sm`, `backdrop-blur-sm` trên ô vị trí kho và filter controls. |
| 6 | `LoVatTuPage.jsx` | `frontend/src/pages/` | Thay `shadow-xs`, `shadow-2xs`, `backdrop-blur-xs` -> `shadow-sm`, `backdrop-blur-sm` trên table card, search input, filter pills. |
| 7 | `PhieuNhapPage.jsx` | `frontend/src/pages/` | Thay `shadow-xs`, `shadow-2xs`, `backdrop-blur-xs` -> `shadow-sm`, `backdrop-blur-sm` trên danh sách phiếu, action buttons. |
| 8 | `PhieuXuatPage.jsx` | `frontend/src/pages/` | Thay `shadow-xs`, `shadow-2xs`, `backdrop-blur-xs` -> `shadow-sm`, `backdrop-blur-sm` trên cảnh báo xuất kho, bảng phiếu xuất. |
| 9 | `PhieuChuyenPage.jsx` | `frontend/src/pages/` | Thay `shadow-xs`, `backdrop-blur-xs` -> `shadow-sm`, `backdrop-blur-sm` trên bảng luân chuyển kho liên xưởng. |
| 10 | `PhieuKiemKePage.jsx` | `frontend/src/pages/` | Thay `shadow-xs`, `backdrop-blur-xs` -> `shadow-sm`, `backdrop-blur-sm` trên bảng kiểm kê, giữ nguyên 100% cột chênh lệch và audit logic. |

---

## 3. DANH MỤC VÙNG BĂNG GIÁ (FROZEN BOUNDARIES)

Các khu vực sau được bảo vệ tuyệt đối và **KHÔNG CÓ BẤT KỲ SỰ THAY ĐỔI NÀO**:
1. **Backend & API:** Toàn bộ Controllers, Services, Route handlers, Express middleware trong `backend/src/` không bị đụng chạm.
2. **Database:** Cơ sở dữ liệu PostgreSQL `erp_may10`, schema, tables, triggers, indexes, transaction logic (`SELECT ... FOR UPDATE`) nguyên vẹn 100%.
3. **Core Shell & Portal Navigation:** Không sửa `Header.jsx`, `Sidebar.jsx`, `MainLayout.jsx`, `Breadcrumb.jsx`, `Homepage.jsx`.
4. **Authentication & Security:** Không can thiệp `AuthContext.jsx`, cơ chế token JWT, RBAC permissions matrix.
5. **Nghiệp vụ cốt lõi PH4:** Giữ nguyên 100% logic tính toán tồn kho, luân chuyển kho, trừ kho an toàn, cảnh báo số âm, kiểm kê cân đối.

---

## 4. KẾT QUẢ XỬ LÝ GAP 1: PHỤC HỒI SHADOW & DEPTH TRÊN TAILWIND V3

### 4.1. Cơ chế lỗi trước fix
Tailwind CSS phiên bản được cài đặt trong dự án là **v3.4.17**. Các class `shadow-xs` và `shadow-2xs` thuộc đặc tả dự thảo Tailwind v4. Khi viết `shadow-xs`, Tailwind v3 bỏ qua vì không nhận diện được token, dẫn đến CSS biên dịch không chứa rule `box-shadow`. Trên trình duyệt, các thẻ card có computed style `box-shadow: none`, làm giao diện hoàn toàn phẳng lì, mất chiều sâu thị giác.

### 4.2. Giải pháp thực hiện
Thay thế toàn diện và đồng bộ các class không được hỗ trợ sang chuẩn chính thức của Tailwind v3:
- `shadow-xs` / `shadow-2xs` -> **`shadow-sm`** (Sinh ra rule `box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);`).
- `backdrop-blur-xs` -> **`backdrop-blur-sm`**.

### 4.3. Kết quả đo lường thực tế trên Chrome CDP
Trích xuất computed style trực tiếp từ DOM của trình duyệt Chrome đang chạy:
- **ModuleHeader:** `boxShadow: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px"` -> Đã có đổ bóng thực tế.
- **Tab Navigation Bar:** `boxShadow: "... rgba(0, 0, 0, 0.05) 0px 1px 2px 0px"` -> Đã có đổ bóng thực tế.
- **4 KPI Cards (Dashboard):** `boxShadow: "... rgba(0, 0, 0, 0.05) 0px 1px 2px 0px"` -> Đã có đổ bóng thực tế.
- **Table Containers (Tồn kho, Vị trí, Lô hàng, Phiếu nhập, Phiếu xuất, Phiếu chuyển, Kiểm kê):** `boxShadow: "... rgba(0, 0, 0, 0.05) 0px 1px 2px 0px"` -> Đã có đổ bóng thực tế.

---

## 5. KẾT QUẢ XỬ LÝ GAP 2: ĐỒNG BỘ TOKEN V2.11 CHO MODULEHEADER

### 5.1. Cơ chế lỗi trước fix
Component banner đầu trang `frontend/src/components/layout/ModuleHeader.jsx` sử dụng class cũ:
```jsx
// Cũ:
className="relative overflow-hidden bg-white rounded-xl border border-[#DCEAF4] p-4 sm:p-5 shadow-xs mb-4 ..."
```
Do đó, khi vào PH4, phần banner đầu tiên đập vào mắt người dùng lại mang thông số của version cũ (bo góc nhỏ 12px, viền đậm màu `#DCEAF4`, không có bóng), tạo cảm giác rời rạc với phần nội dung bên dưới.

### 5.2. Giải pháp thực hiện
Cập nhật đúng thông số Design Tokens của Core UI V2.11:
```jsx
// Mới (V2.11 Aligned):
className="relative overflow-hidden bg-white rounded-2xl border border-[#E2EDF5] p-4 sm:p-5 shadow-sm mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 min-h-[105px]"
```
- Bo góc tăng từ `rounded-xl` (12px) -> `rounded-2xl` (16px).
- Màu viền chuyển từ `#DCEAF4` -> chuẩn Core `#E2EDF5`.
- Đổ bóng chuyển từ `shadow-xs` (lỗi không hiện) -> `shadow-sm` (nổi khối thực tế).
- Giữ nguyên toàn bộ cấu trúc: Title, Description, Quick-action Buttons, Badges, Hình nền dệt may May 10.

### 5.3. Kết quả đo lường thực tế trên Chrome CDP
- `borderRadius`: **`16px`** (Chính xác 100% chuẩn `rounded-2xl`).
- `borderColor`: **`rgb(226, 237, 245)`** (Chính xác 100% mã màu `#E2EDF5`).
- `boxShadow`: **`rgba(0, 0, 0, 0.05) 0px 1px 2px 0px`** (Chính xác 100% chuẩn `shadow-sm`).

---

## 6. KẾT QUẢ XỬ LÝ GAP 3: TRIỆT TIÊU BLANK SCREEN & XỬ LÝ 401 SESSION EXPIRY

### 6.1. Cơ chế lỗi trước fix
Tại `DashboardPage.jsx`, sau khi hoàn tất tải dữ liệu hoặc khi có lỗi:
```jsx
// Cũ (Nguy cơ cao):
if (loading) return <DashboardSkeleton />;
if (!stats) return null; // <--- KHI GẶP 401 HOẶC LỖI MẠNG SẼ RENDER NULL (MÀN HÌNH TRẮNG TRƠN)
```
Khi phiên làm việc hết hạn (HTTP 401), API không trả về stats hợp lệ, khiến component render `null`. Người dùng nhìn thấy một màn hình trống rỗng mà không nhận được bất kỳ chỉ dẫn nào, lầm tưởng rằng phân hệ PH4 bị hỏng hoặc chưa triển khai code.

### 6.2. Giải pháp thực hiện
Loại bỏ hoàn toàn lệnh `return null;` nguy hiểm. Xây dựng khối Fallback UX chuyên nghiệp, xử lý phân nhánh rõ ràng:
1. **Trường hợp lỗi 401 (Phiên đăng nhập đã hết hạn):**
   - Hiển thị Card cảnh báo trung tâm chuẩn Design System Core V2.11 (`rounded-2xl border-[#E2EDF5] shadow-sm bg-white`).
   - Icon ổ khóa vàng hổ phách (`Lock` trong nền `bg-amber-50 text-amber-600 border border-amber-200`).
   - Tiêu đề: **"Phiên đăng nhập đã hết hạn"**.
   - Mô tả: **"Vui lòng đăng nhập lại để tiếp tục."**.
   - Nút hành động nổi bật: **"Đăng nhập lại"** (`bg-[#0F5FAF] rounded-xl shadow-sm`) kích hoạt `logout()` và điều hướng về trang `/login`.
2. **Trường hợp lỗi hệ thống thông thường:**
   - Hiển thị Card cảnh báo lỗi (`AlertTriangle` trong nền `bg-red-50 text-red-600 border border-red-200`).
   - Tiêu đề: **"Không thể tải số liệu Dashboard"**.
   - Hiển thị chi tiết lỗi kỹ thuật thân thiện.
   - Nút hành động: **"Tải lại"** kích hoạt reload dữ liệu mà không cần tải lại toàn trang.

### 6.3. Kiểm chứng thực tế
Đã chụp ảnh màn hình xác nhận tại `docs/core-portal/gap_fix_screenshots/PH4_09_Session_401_State.png`. Trạng thái hiển thị sắc nét, chuyên nghiệp, xóa bỏ hoàn toàn hiện tượng blank screen.

---

## 7. BẢNG ĐỐI CHIẾU BEFORE VS AFTER (TRƯỚC VÀ SAU FIX)

| Tiêu chí | Hiện trạng Audit (Trước Fix) | Kết quả sau Controlled Fix | Minh chứng Kỹ thuật |
|---|---|---|---|
| **Độ nổi khối (Elevation & Shadow)** | Hoàn toàn phẳng (`box-shadow: none`) do class `shadow-xs` không hợp lệ trong Tailwind v3 | Đã nổi khối tinh tế (`box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05)`) | Trình duyệt Chrome đo được `rgba(0, 0, 0, 0.05) 0px 1px 2px 0px` trên 100% container |
| **Header Phân hệ (`ModuleHeader`)** | Bo góc 12px (`rounded-xl`), viền `#DCEAF4`, không bóng | Bo góc 16px (`rounded-2xl`), viền chuẩn `#E2EDF5`, có bóng `shadow-sm` | Trình duyệt Chrome đo được `borderRadius: 16px`, `borderColor: rgb(226, 237, 245)` |
| **Xử lý khi hết hạn Session (401)** | Render `null` -> Màn hình trắng xóa không tương tác | Card thông báo 401 chuyên nghiệp + Nút "Đăng nhập lại" | Ảnh chụp thực tế `PH4_09_Session_401_State.png` |
| **Xử lý khi lỗi mạng / Server** | Render `null` -> Màn hình trắng | Card thông báo lỗi chi tiết + Nút "Tải lại" | Đã tích hợp trực tiếp trong `DashboardPage.jsx` |
| **Độ đồng nhất với Core Portal** | Khác biệt vi mô gây cảm giác chưa đồng bộ | 100% thành phần tuân thủ cùng bộ thông số Design Tokens | Đồng bộ 10/10 file trong phân hệ |
| **Build & Bundle** | Cảnh báo class lạ | Vite build sạch 100%, 0 lỗi, thời gian 4.54s | Lệnh `npm run build` đạt Exit Code 0 |
| **Tính toàn vẹn nghiệp vụ** | Nguyên vẹn | Nguyên vẹn 100%, không sửa bất kỳ API nào | 16/16 PH4 API tests + 100% Concurrency test PASS |

---

## 8. KẾT QUẢ BROWSER RUNTIME AUDIT CHI TIẾT (8 TABS + 401 STATE)

Quá trình kiểm định được thực hiện bằng script tự động kết nối qua Chrome DevTools Protocol (CDP port 9224) trên trình duyệt Chrome thật đang mở URL `http://localhost:5173/warehouse`:

| STT | Màn hình / Tab | File ảnh minh chứng | `borderRadius` | `borderColor` | `boxShadow` thực tế |
|:---:|---|---|:---:|:---:|:---:|
| 1 | **Dashboard** | `PH4_01_Dashboard.png` | `16px` | `rgb(226, 237, 245)` | `rgba(0, 0, 0, 0.05) 0px 1px 2px 0px` |
| 2 | **Tồn kho** | `PH4_02_TonKho.png` | `16px` | `rgb(226, 237, 245)` | `rgba(0, 0, 0, 0.05) 0px 1px 2px 0px` |
| 3 | **Vị trí kho** | `PH4_03_ViTriKho.png` | `16px` | `rgb(226, 237, 245)` | `rgba(0, 0, 0, 0.05) 0px 1px 2px 0px` |
| 4 | **Lô hàng (FEFO)** | `PH4_04_LoVatTu.png` | `16px` | `rgb(226, 237, 245)` | `rgba(0, 0, 0, 0.05) 0px 1px 2px 0px` |
| 5 | **Phiếu nhập kho** | `PH4_05_PhieuNhap.png` | `16px` | `rgb(226, 237, 245)` | `rgba(0, 0, 0, 0.05) 0px 1px 2px 0px` |
| 6 | **Phiếu xuất kho** | `PH4_06_PhieuXuat.png` | `16px` | `rgb(226, 237, 245)` | `rgba(0, 0, 0, 0.05) 0px 1px 2px 0px` |
| 7 | **Phiếu chuyển kho** | `PH4_07_PhieuChuyen.png` | `16px` | `rgb(226, 237, 245)` | `rgba(0, 0, 0, 0.05) 0px 1px 2px 0px` |
| 8 | **Kiểm kê kho** | `PH4_08_PhieuKiemKe.png` | `16px` | `rgb(226, 237, 245)` | `rgba(0, 0, 0, 0.05) 0px 1px 2px 0px` |
| 9 | **401 Session State** | `PH4_09_Session_401_State.png` | `16px` | `rgb(226, 237, 245)` | `rgba(0, 0, 0, 0.05) 0px 1px 2px 0px` |

> Toàn bộ 9 file ảnh chứng minh định dạng PNG chất lượng cao được lưu trữ tại:  
> `E:\ERP\docs\core-portal\gap_fix_screenshots\`

---

## 9. KẾT QUẢ KIỂM THỬ HỒI QUY TOÀN DIỆN (REGRESSION VERIFICATION)

### 9.1. Kiểm thử Biên dịch Production Frontend (`npm run build`)
- **Lệnh thực hiện:** `npm run build`
- **Thời gian biên dịch:** 4.54 giây.
- **Kết quả:** **EXIT CODE 0 — 0 ERROR — 0 WARNING**.
- Tất cả các module PH4 được nạp vào chunk `WarehouseModule-B1GZ97P-.js` sạch sẽ, không có bất kỳ class CSS lỗi nào.

### 9.2. Kiểm thử API Phân hệ PH4 (`test_ph4_api.js`)
- **Lệnh thực hiện:** `node test_ph4_api.js`
- **Kết quả:** **16/16 TESTS PASSED (100%)**.
  - Kiểm tra tồn kho theo sản phẩm: PASS
  - Kiểm tra vị trí kho & sức chứa: PASS
  - Kiểm tra quản lý lô theo hạn dùng (FEFO): PASS
  - Tạo & duyệt phiếu nhập: PASS
  - Tạo & duyệt phiếu xuất: PASS
  - Chuyển kho liên xưởng May 10: PASS
  - Phiếu kiểm kê và cân đối kho: PASS

### 9.3. Kiểm thử Tranh chấp Đồng thời & Khóa dòng (`test_concurrency.js`)
- **Lệnh thực hiện:** `node test_concurrency.js`
- **Kết quả:** **100% PASSED**.
  - Cơ chế `SELECT ... FOR UPDATE` trong transaction PostgreSQL hoạt động chính xác tuyệt đối.
  - Khi có hai yêu cầu xuất kho cùng lúc vượt quá số lượng khả dụng, yêu cầu thứ hai lập tức nhận mã HTTP `409 Conflict` hợp lệ, ngăn chặn hoàn toàn tình trạng tồn kho âm.

### 9.4. Kiểm thử Ma trận Phân quyền RBAC (`test_rbac_security.js`)
- **Lệnh thực hiện:** `node test_rbac_security.js`
- **Kết quả:** **27/27 TESTS PASSED (100%)**.
  - Các quyền Thủ kho, Quản lý kho, Kế toán kho, Giám đốc sản xuất được phân định chính xác.
  - Tài khoản không có quyền duyệt phiếu xuất kho bị chặn 403 Forbidden chuẩn xác.

---

## 10. TỔNG HỢP GIT / CODE DIFF THỰC TẾ

Phân tích diff xác nhận các chỉnh sửa thuần túy là chuỗi class giao diện và cấu trúc thẻ hiển thị lỗi:

```diff
diff --git a/frontend/src/components/layout/ModuleHeader.jsx b/frontend/src/components/layout/ModuleHeader.jsx
- className="relative overflow-hidden bg-white rounded-xl border border-[#DCEAF4] p-4 sm:p-5 shadow-xs mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 min-h-[105px]"
+ className="relative overflow-hidden bg-white rounded-2xl border border-[#E2EDF5] p-4 sm:p-5 shadow-sm mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 min-h-[105px]"

diff --git a/frontend/src/pages/warehouse/WarehouseModule.jsx b/frontend/src/pages/warehouse/WarehouseModule.jsx
- className="bg-white rounded-2xl p-2 border border-[#E2EDF5] shadow-xs flex items-center gap-1.5 overflow-x-auto"
+ className="bg-white rounded-2xl p-2 border border-[#E2EDF5] shadow-sm flex items-center gap-1.5 overflow-x-auto"

diff --git a/frontend/src/pages/warehouse/DashboardPage.jsx b/frontend/src/pages/warehouse/DashboardPage.jsx
- if (!stats) return null;
+ const isAuthError =
+   error &&
+   (error.response?.status === 401 ||
+     error.status === 401 ||
+     error.message?.includes('401') ||
+     error.message?.includes('hết hạn') ||
+     error.message?.includes('Phiên đăng nhập'));
+ if (isAuthError) {
+   return (
+     <div className="bg-white rounded-2xl border border-[#E2EDF5] p-8 text-center max-w-md mx-auto my-8 shadow-sm">
+       ... nút "Đăng nhập lại" ...
+     </div>
+   );
+ }
```

---

## 11. CAM KẾT TOÀN VẸN NGHIỆP VỤ (INTEGRITY GUARANTEE)

Tôi xin cam kết tuyệt đối:
1. **Không tạo phiên bản thiết kế mới:** Dự án tiếp tục vận hành trên nền tảng chuẩn mực **Global Core UI V2.11**. Không sinh ra V2.12 hay V2.13.
2. **Không thay đổi Backend & Database:** 0 controller, 0 service, 0 bảng dữ liệu, 0 câu truy vấn nào bị thay đổi.
3. **Không ảnh hưởng Navigation & Shell:** Giữ nguyên 100% Header, Sidebar và Flow điều hướng tổng thể.
4. **Không làm thay đổi nghiệp vụ kế toán - kho:** Mọi công thức tồn kho, giá trị trung bình, tiêu chí FEFO đều được bảo toàn.

---

## 12. PHÁN QUYẾT CUỐI CÙNG (FINAL VERDICT)

Dựa trên toàn bộ kết quả kiểm tra mã nguồn, phân tích AST, kiểm tra bundle Vite, kiểm chứng computed style và ảnh chụp trực tiếp qua Chrome DevTools Protocol:

```text
======================================================================
                         FINAL VERDICT
             [ A. VERIFIED — UI V2.11 ALIGNED ]
======================================================================
 1. Cả 3 UI Gaps (Shadow, ModuleHeader, 401 State) đã được khắc phục 100%.
 2. Toàn bộ 8 màn hình PH4 đã hiển thị đổ bóng (shadow-sm) và viền/bo góc V2.11 chuẩn mực.
 3. Triệt tiêu hoàn toàn lỗi màn hình trắng khi hết hạn phiên đăng nhập.
 4. Zero Business Logic Change — 100% Regression Tests Passed.
======================================================================
```
