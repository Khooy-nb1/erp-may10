# MAY 10 ERP — ENTERPRISE VISUAL DEPTH & BRAND IMAGERY V2.9
**Hệ thống Quản trị Tổng thể Doanh nghiệp May 10 — Enterprise ERP Portal**
**Ngày ban hành:** 09/09/2026  
**Phiên bản:** V2.9 — Enterprise Visual Depth & May 10 Brand Imagery  
**Trạng thái kiểm định:** PASS (Build Pass 4.36s, 16/16 PH4 API Pass, Concurrency Pass, 27/27 RBAC Pass)

---

## 1. MỤC TIÊU V2.9
Nâng tầm chiều sâu thị giác (Visual Depth) cho toàn bộ hệ sinh thái **May 10 ERP**, chuyển đổi từ cảm giác *"trang web trắng với các thẻ card"* sang trải nghiệm *"Cổng ERP Doanh nghiệp Dệt may Công nghiệp Hiện đại"*.
- **Phạm vi**:
  1. Homepage Hero (`DashboardHeader.jsx`)
  2. Module Header của các phân hệ (`WarehouseModule.jsx`, `PlaceholderModule.jsx`)
  3. Single Source of Truth cho Asset hình ảnh (`imageAssets.js`)
  4. Thành phần dùng chung `ModuleHeader.jsx`
- **Quy tắc bất biến**:
  - `CONTENT > DATA > UI > IMAGE`
  - Hình ảnh chỉ làm nền tạo chiều sâu và định vị thương hiệu, tuyệt đối không che chữ, không cản trở việc đọc dữ liệu KPI, biểu đồ, nút bấm hay bảng dữ liệu.

---

## 2. BEFORE / AFTER COMPARISON

| Hạng mục | Trước V2.9 (V2.8) | Sau V2.9 (Visual Depth) |
|---|---|---|
| **Homepage Hero** | Card nền trơn `#F4FAFE`, có watermark logo mờ `0.03`, thiếu chiều sâu công nghiệp | **Hero 2 cột: Bên trái là text & actions, bên phải (40-45%) là ảnh thực tế trụ sở/nhà máy May 10 với lớp phủ linear gradient hòa sắc mượt mà vào nền trắng** |
| **Module Header** | Thẻ card phẳng viền xanh đơn giản, không có hình ảnh đặc thù của phân hệ | **ModuleHeader dùng chung có lớp visual panel (25-35%) bên phải mờ dần, hiển thị hình ảnh kho vận, chuyền may theo từng ngữ cảnh nghiệp vụ** |
| **Quản lý Hình ảnh** | Hardcode đường dẫn SVG rải rác | **Single Source of Truth tại `frontend/src/config/imageAssets.js`** |
| **Kiến trúc Component** | Mỗi module tự viết div header riêng | **Tái sử dụng thống nhất qua `frontend/src/components/layout/ModuleHeader.jsx`** |
| **Độ nhận diện thương hiệu** | Cảm giác dashboard hành chính thông thường | **Đậm chất Tổng Công ty May 10: Tổ hợp nhà máy dệt may, chuyền may công nghiệp, kho thành phẩm xuất khẩu** |

---

## 3. CÁC FILE ĐÃ THAY ĐỔI & TẠO MỚI

| Đường dẫn file | Trạng thái | Mô tả chi tiết |
|---|---|---|
| `frontend/src/config/imageAssets.js` | **[NEW]** | Quản trị tập trung toàn bộ hình ảnh thương hiệu May 10 (`MAY10_IMAGES`) |
| `frontend/src/components/layout/ModuleHeader.jsx` | **[NEW]** | Component Module Header dùng chung chuẩn Global Design System với visual depth panel |
| `frontend/src/components/dashboard/DashboardHeader.jsx` | **[UPDATED]** | Bố cục Hero 2 cột với ảnh nhà máy May 10 và gradient hòa tan êm ái |
| `frontend/src/pages/WarehouseModule.jsx` | **[UPDATED]** | Tích hợp `ModuleHeader` với hình ảnh kho thành phẩm & logistics May 10 |
| `frontend/src/pages/PlaceholderModule.jsx` | **[UPDATED]** | Tích hợp `ModuleHeader` ánh xạ ảnh theo phân hệ (Kinh doanh, Sản xuất, Mua hàng, Kế toán) |

---

## 4. IMAGE ASSETS ĐÃ SỬ DỤNG & NGUỒN GỐC (IMAGE SOURCE)

Tất cả hình ảnh đều có định dạng chuẩn WebP tối ưu dung lượng, nguồn gốc trực tiếp từ hệ thống cổng thông tin chính thức của Tổng Công ty May 10 (`garco10.com.vn`):

1. **`may10-factory.webp`** (29 KB):
   - *Nội dung*: Khu phức hợp Trụ sở chính & Nhà máy May 10 tại 765 Nguyễn Văn Linh, Sài Đồng, Long Biên, Hà Nội.
   - *Sử dụng*: Homepage Hero Banner (`DashboardHeader.jsx`) & PH5 Kế toán / Quản trị.
2. **`may10-production.webp`** (252 KB):
   - *Nội dung*: Dây chuyền may công nghiệp hiện đại, công nhân may vận hành máy may tự động.
   - *Sử dụng*: PH2 Quản lý Sản xuất & PH3 Mua hàng nguyên phụ liệu.
3. **`may10-export.webp`** (391 KB):
   - *Nội dung*: Đóng gói, lưu kho xuất khẩu và logistics áo sơ mi / veston cao cấp May 10.
   - *Sử dụng*: PH4 Kho & Quản lý Vật tư & PH1 Bán hàng xuất khẩu.
4. **`garco10-logo.svg`** (322 KB):
   - *Nội dung*: Biểu trưng thương hiệu May 10 vector chính thống.
   - *Sử dụng*: Global Header, watermark Hero nền mờ `opacity-[0.05]`.

---

## 5. HOMEPAGE VISUAL TREATMENT (XỬ LÝ THỊ GIÁC HERO)

- **Cấu trúc Hero**:
  - Chiều cao chuẩn desktop: `min-h-[185px] lg:h-[200px]` (hoàn toàn nằm trong khoảng khuyến nghị 180–220px).
  - Khung bao: `bg-white rounded-xl border border-[#DCEAF4] shadow-xs relative overflow-hidden`.
- **Phân bổ không gian**:
  - Cột trái (55–60%): Chứa trọn vẹn thông tin điều hành: Huy hiệu *"CỔNG ĐIỀU HÀNH DOANH NGHIỆP"*, lời chào người dùng, phòng ban, tình trạng trực tuyến, lịch ngày tháng tiếng Việt, nút *"Tra cứu tồn kho"* (Secondary) và nút *"Lập phiếu kho"* (Primary).
  - Cột phải (40–45%): Lớp hình ảnh nhà máy May 10 (`may10-factory.webp`) với `opacity: 0.80–0.85`.
- **Kỹ thuật Gradient Blending**:
  ```css
  background: linear-gradient(
    to right,
    rgba(255,255,255,1) 0%,
    rgba(255,255,255,0.92) 20%,
    rgba(255,255,255,0.40) 60%,
    rgba(255,255,255,0.15) 100%
  );
  ```
  Lớp phủ gradient này đảm bảo 100% phần chữ bên trái nằm trên nền trắng tinh khiết, độ tương phản tuyệt đối, không có hiện tượng chữ bị chồng chéo hay rối mắt trên nền ảnh.
- **Brand Watermark**: Logo vector May 10 đặt ở góc phải với độ mờ `opacity-[0.05]`, tạo cảm giác chìm tinh tế.

---

## 6. MODULE HEADER VISUAL TREATMENT

- **Component `ModuleHeader.jsx`**:
  - Chiều cao gọn gàng: `min-h-[105px]`.
  - Khung bao: `bg-white rounded-xl border border-[#DCEAF4] shadow-xs`.
  - Panel hình ảnh (25–35% bên phải): Hiển thị hình ảnh đặc thù cho từng phân hệ:
    - **PH4 (Kho & Vật tư)**: Hiển thị `may10-export.webp` (Kho thành phẩm & đóng gói xuất khẩu).
    - **PH1 (Kinh doanh)**: Hiển thị `may10-export.webp` (Thương mại quốc tế).
    - **PH2 (Sản xuất)**: Hiển thị `may10-production.webp` (Chuyền may công nghiệp).
    - **PH3 (Mua hàng)**: Hiển thị `may10-production.webp` (Nguyên phụ liệu chuyền may).
    - **PH5 (Tài chính)**: Hiển thị `may10-factory.webp` (Tổ hợp điều hành).
  - Gradient hòa tan tương tự Hero: `linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0.92) 20%, rgba(255,255,255,0.35) 70%, rgba(255,255,255,0.10) 100%)`.
  - Nút chức năng (`Làm mới dữ liệu` hoặc `Vào phân hệ Kho & Vật tư`) luôn nổi bật ở tầng `z-10`.

---

## 7. RESPONSIVE VERIFICATION

| Breakpoint | Chiều rộng | Trạng thái hiển thị |
|---|---|---|
| **Large Desktop** | 1920px & 1440px | Hero 2 cột hoàn mỹ; ảnh chiếm 40% bên phải, hòa tan vào nền trắng; text rộng rãi. |
| **Desktop** | 1280px & 1024px | Bố cục cân đối; ảnh giữ tỷ lệ `object-cover`; không tràn viền. |
| **Tablet** | 768px | Hình ảnh tự động điều chỉnh tỷ lệ 35%; gradient bảo vệ text không bị đè. |
| **Mobile** | 390px | Ảnh chuyển thành nền mờ tự nhiên phía sau; các nút hành động tự động xuống dòng gọn gàng; **0 horizontal scroll**; không gây tăng chiều cao Hero đột biến. |

---

## 8. PERFORMANCE & ACCESSIBILITY CONSIDERATIONS

1. **Hiệu năng (Performance)**:
   - Các hình ảnh đều ở định dạng tối ưu WebP (`29KB` đến `391KB`).
   - Tổng dung lượng ảnh tải trong màn hình đầu tiên < 450KB, thời gian build Vite duy trì ở mức xuất sắc (`4.36s`).
   - Kích thước thẻ hình ảnh được kiểm soát thông qua container cha với `min-height` cố định, triệt tiêu hoàn toàn hiện tượng nhảy khung hình (**Zero Cumulative Layout Shift - CLS**).
2. **Khả năng tiếp cận (Accessibility)**:
   - Toàn bộ hình ảnh nền đóng vai trò minh họa trang trí (`decorative assets`) nên được gán `alt=""` và `pointer-events-none`.
   - Độ tương phản chữ đạt chuẩn WCAG AA: Text chính màu `#172033` và `#5F6F82` hiển thị trên lớp gradient trắng tinh khiết (`rgba(255,255,255,1)`).
   - Nếu hình ảnh không tải được do mạng chậm, toàn bộ nội dung text và nút bấm vẫn hiển thị sắc nét 100% trên nền trắng.

---

## 9. KẾT QUẢ KIỂM THỬ HỆ THỐNG (100% PASS)

| Bộ kiểm thử | Mục tiêu | Kết quả thực tế | Trạng thái |
|---|---|---|---|
| **Vite Frontend Build** | Đóng gói sản phẩm, kiểm tra cú pháp JSX/CSS/Assets | `built in 4.36s — 0 errors` | ✅ **PASS** |
| **PH4 REST API Suite** (`test_ph4_api.js`) | 16 API nghiệp vụ kho, thẻ kho, nhập/xuất/chuyển/kiểm kê | **16/16 Passed (100%)** | ✅ **PASS** |
| **Race Condition Suite** (`test_concurrency.js`) | Kiểm tra tranh chấp tồn kho với PostgreSQL `SELECT FOR UPDATE` | Chặn xuất âm an toàn, trả HTTP 409 Conflict | ✅ **PASS** |
| **RBAC Security Suite** (`test_rbac_security.js`) | 27 kịch bản kiểm tra danh tính, token, ma trận phân quyền | **27/27 Passed (100%)** | ✅ **PASS** |

---

## 10. CAM KẾT BẢO TOÀN KIẾN TRÚC & HỆ THỐNG (CONFIRMATION)

- [x] **Zero Authentication changes**: `AuthContext.jsx`, `auth.js`, token handling được giữ nguyên 100%.
- [x] **Zero RBAC changes**: Phân quyền, role matrix, guards không bị sửa đổi.
- [x] **Zero API changes**: Các endpoint REST API, schema payload và response contract giữ nguyên 100%.
- [x] **Zero Database changes**: PostgreSQL schema, cấu trúc bảng và dữ liệu giữ nguyên 100%.
- [x] **Zero PH4 logic changes**: Thuật toán tính tồn kho, xuất kho chặn âm, transaction `SELECT ... FOR UPDATE` giữ nguyên 100%.
- [x] **Navigation Architecture V2.7 & Global Design System V2.8**: Bảo toàn nguyên vẹn 100%.

---

## 11. KẾT LUẬN CUỐI CÙNG (FINAL VERDICT)

**TRẠNG THÁI NGHIỆM THU: PASS.**  
MAY 10 ERP đã sở hữu chiều sâu thị giác doanh nghiệp cao cấp, chân thực và đậm đà bản sắc dệt may công nghiệp May 10, trong khi vẫn duy trì tối đa tốc độ, độ ổn định và tính toàn vẹn nghiệp vụ dữ liệu.
