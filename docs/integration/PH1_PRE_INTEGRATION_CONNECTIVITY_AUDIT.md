# PH1 — STEP 1.5: PRE-INTEGRATION CONNECTIVITY AUDIT REPORT
**Hệ thống:** ERP May 10  
**Phân hệ:** PH1 — Bán hàng & Quản lý khách hàng (Sales & CRM)  
**Workspace:** `E:\ERP`  
**Branch kiểm tra:** `remotes/origin/ph1-bh-qlkh` (Commit: `4c991ea`)  
**Target Integration Branch:** `feature/ph4-core-portal` (Chứa Core Portal V2.11, PH2, PH3, PH4, PH5 FROZEN)  
**Cơ sở dữ liệu:** PostgreSQL 18.6 (`erp_may10`)  
**Audit Mode:** **STRICT READ-ONLY (ZERO CODE/DB MODIFICATIONS)**  
**Thời điểm thực hiện:** 13/09/2026  

---

## 1. Executive Summary (Tóm tắt Điều hành)

Đợt kiểm toán kết nối tiền tích hợp (Pre-Integration Connectivity Audit) cho Phân hệ 1 (PH1 - Bán hàng & Quản lý khách hàng) trên nhánh `ph1-bh-qlkh` đã được thực hiện độc lập, khách quan và tuân thủ nguyên tắc **READ-ONLY TUYỆT ĐỐI**.

### Kết luận tổng quan:
1. **Trạng thái nghiệp vụ và cơ sở dữ liệu:** Phân hệ PH1 trên nhánh `ph1-bh-qlkh` đã hoàn thành rất tốt logic nghiệp vụ cốt lõi (Khách hàng, Đơn bán hàng, Giao hàng, Hóa đơn, Công nợ phải thu, Dashboard) và tuân thủ **100% CSDL 41 bảng dùng chung** của ERP May 10 mà không đòi hỏi thêm bất kỳ lệnh `ALTER TABLE` hay migration nào.
2. **Xung đột kiến trúc và bảo mật nghiêm trọng:** Nhánh `ph1-bh-qlkh` được phát triển độc lập từ commit ban đầu (`c378a55`) dưới dạng một ứng dụng riêng biệt ("ERP Sales & CRM"), dẫn đến sự không tương thích sâu sắc với kiến trúc Core Portal hiện tại:
   - **Xác thực:** Dùng thư viện `jsonwebtoken` (JWT riêng với `JWT_SECRET`) thay vì chuẩn bảo mật máy chủ nội bộ **HMAC-SHA256** (`erp_token`) của Core Portal.
   - **Frontend:** Xây dựng trên **React 19**, **React Router v7**, dùng thư viện giao diện độc lập `@astryxdesign/core` và `@stylexjs/stylex`, có `AppShell` và trang `LoginPage` riêng biệt; hoàn toàn chưa được gắn vào `MainLayout`, `Global Header`, `Global Sidebar` của Core Portal V2.11 (React 18, React Router v6, Tailwind CSS).
   - **Backend:** Xây dựng bằng **TypeScript (ES Modules)** trong khi backend Core Portal là **Node.js (CommonJS)**.
   - **Liên phân hệ (PH1 → PH2, PH1 → PH4):** Chưa thiết lập API client gọi chính thức sang PH2 (`POST /api/v1/production/plans`) và PH4 (`POST /api/v1/phieu-xuat`).
3. **Quyết định kỹ thuật:** **KHÔNG ĐƯỢC PHÉP MERGE MÙ** (`git merge ph1-bh-qlkh`). PH1 hiện tại **CHƯA ĐỦ ĐIỀU KIỆN ĐỂ KẾT NỐI TRỰC TIẾP**. Cần thực hiện quy trình **PORTING & ADAPTATION** chuẩn hóa (tương tự quy trình đã tích hợp thành công PH2, PH3, PH5).

---

## 2. Git Audit (Kiểm tra Lịch sử & Nhánh Git)

- **Vị trí nhánh:** `remotes/origin/ph1-bh-qlkh`.
- **Commit đỉnh (HEAD của branch):** `4c991ea` (*"feat: Refactor SalesOrderDetailPage with new UI components and improved error handling"*).
- **Gốc phân nhánh:** Phân nhánh từ commit `c378a55` trên `origin/main` (thời điểm ban đầu của repository).
- **Phát hiện quan trọng:**
  - `ph1-bh-qlkh` **KHÔNG** chứa các commit của Core Portal V2.11, PH2, PH3, PH4, PH5.
  - Tổng số commit độc lập: 9 commits (`7950ff1` → `4c991ea`).
  - Thay đổi: 201 files, +32,014 dòng code.
  - **Cảnh báo xung đột:** Nếu thực hiện lệnh `git merge ph1-bh-qlkh` vào nhánh hiện tại `feature/ph4-core-portal`, toàn bộ file `package.json`, `index.html`, `AppRoutes`, `auth.js` của Core Portal sẽ bị ghi đè hoặc xung đột nghiêm trọng làm tê liệt hệ thống.

---

## 3. Architecture Audit (Kiểm tra Kiến trúc Hệ thống)

| Tiêu chí | Hệ thống hiện tại (`E:\ERP`) | Nhánh PH1 (`ph1-bh-qlkh`) | Đánh giá tương thích |
|---|---|---|:---:|
| **Frontend Framework** | React 18.3 | React 19.3 | ❌ Xung đột phiên bản |
| **Frontend Routing** | React Router v6.28 | React Router v7.18 | ❌ Xung đột phiên bản |
| **Design System / CSS** | Tailwind CSS 3.4 + Vanilla CSS | `@astryxdesign/core` + `@stylexjs/stylex` | ❌ Không tương thích UI |
| **Icons Library** | `lucide-react` | `lucide-react` | ✅ Tương thích |
| **Backend Runtime** | Node.js CommonJS (`require`) | Node.js TypeScript ESM (`import`) | ❌ Lệch chuẩn module |
| **Validation Layer** | Custom / Core Validators | `zod` 3.24 | ⚠️ Cần adapter |
| **ORM / Query Engine** | `pg` (Native Pool & Transactions) | `pg` (Native Client & Pool) | ✅ Tương thích CSDL |

---

## 4. Frontend Audit (Kiểm tra Giao diện & Layout)

### 4.1 Độc lập Layout (AppShell vs MainLayout)
- `ph1-bh-qlkh` triển khai component `AppShell.tsx` dựa trên `@astryxdesign/core/AppShell`, đi kèm `TopNav` và `SideNav` riêng mang nhãn hiệu *"ERP Sales & CRM"*.
- Có trang đăng nhập độc lập `frontend/src/pages/auth/LoginPage.tsx`.
- Điều hướng khai báo tại cấp gốc (`/dashboard`, `/customers`, `/products`, `/sales-orders`, `/deliveries`, `/invoices`, `/receivables`).

### 4.2 Khả năng kết nối vào Core Portal V2.11
- Không thể gắn trực tiếp `AppShell.tsx` vào Core Portal vì gây ra hiện tượng **Layout lồng Layout** (Double Sidebar, Double Header).
- Để tích hợp an toàn, toàn bộ các trang chức năng của PH1 phải được trích xuất (port) sang JSX/React 18, gỡ bỏ dependency `@astryxdesign/core` và `@stylexjs`, sau đó mount vào `MainLayout` dưới tiền tố `/sales/*` thông qua `SalesRoutes.jsx` (tương tự như `FinanceRoutes.jsx` của PH5).

---

## 5. Authentication Audit (Kiểm tra Xác thực)

### 5.1 Hiện trạng trên nhánh `ph1-bh-qlkh`
- Backend sử dụng gói `jsonwebtoken` (`jwt.sign`, `jwt.verify`) với `env.JWT_SECRET`.
- Frontend lưu trữ token tại key `localStorage.getItem('auth_token')` và user tại `auth_user`.
- API client `frontend/src/services/api.ts` gửi header: `Authorization: Bearer <jwt_token>`.

### 5.2 Chuẩn mực bắt buộc của ERP May 10 Core Portal
- Chuẩn Core Portal sử dụng token HMAC-SHA256: `erp_token_{userId}_{timestamp}.{signature}`.
- Frontend lưu trữ tại key `localStorage.getItem('erp_token')`.
- Backend xác thực bằng `verifyToken()` kết hợp tra cứu trạng thái tài khoản trong bảng `nguoi_dung`.
- **Kết luận:** **BLOCKED**. PH1 trên nhánh `ph1-bh-qlkh` không sử dụng cơ chế auth của Core Portal. Khi kết nối, bắt buộc phải thay thế `auth.middleware.ts` và `api.ts` bằng middleware `authMiddleware` và token `erp_token` của Core.

---

## 6. RBAC Audit (Kiểm tra Phân quyền)

### 6.1 Vai trò người dùng
- PH1 sử dụng các vai trò: `admin`, `ban_hang`, `kho`, `ke_toan`.
- Vai trò chính của phân hệ là `ban_hang`, hoàn toàn trùng khớp với **Canonical Role `ban_hang`** của ERP May 10 Core Portal.
- Không tự ý sinh ra các vai trò lạ như `sales_rep`, `sale_manager`, `customer_admin`.

### 6.2 Cơ chế chặn quyền
- Backend `auth.middleware.ts` áp dụng `requireRole('ban_hang', 'admin')`.
- Tuy nhiên, hệ thống chưa kết nối với ma trận `PERMISSIONS` chuẩn tiếng Anh/tiếng Việt của Core Portal (`sales.view`, `sales.create`, `sales.update`, `sales.approve`).
- **Đánh giá:** Đạt mức cơ bản (Role-based), cần ánh xạ sang Permission-based khi tích hợp.

---

## 7. Database Audit (Kiểm tra CSDL & Bảng dữ liệu)

Hệ thống đã thực hiện kiểm toán trực tiếp trên cơ sở dữ liệu thực tế `erp_may10` (PostgreSQL 18.6):

| Bảng CSDL | Trạng thái trong DB | Số dòng hiện tại | Khóa ngoại & Toàn vẹn |
|---|:---:|:---:|---|
| `nguoi_dung` | Tồn tại | 7 | Master users (id 1–7) hợp lệ |
| `khach_hang` | Tồn tại | 2 | Khách hàng KH001, KH002 hợp lệ |
| `san_pham` | Tồn tại | 8 | Sản phẩm may mặc sẵn sàng |
| `don_vi_tinh` | Tồn tại | 4 | Đơn vị tính hợp lệ |
| `don_ban_hang` | Tồn tại | 2 | Đơn DBH-2026-001, DBH-2026-002 |
| `chi_tiet_don_ban_hang` | Tồn tại | 2 | Dòng chi tiết đơn hàng khớp 100% |
| `giao_hang` | Tồn tại | 1 | Đợt giao GH-2026-001 khớp đơn bán |
| `kho` | Tồn tại | 3 | Kho thành phẩm, kho NPL hợp lệ |
| `hoa_don_ban_hang` | Tồn tại | 1 | Hóa đơn HDBH-2026-001 hợp lệ |
| `cong_no` (`phai_thu`) | Tồn tại | 1 | Khoản phải thu 375,200,000đ khớp hóa đơn |

- **Toàn vẹn khóa ngoại (Foreign Keys):** 0 lỗi FK mồ côi (Broken FK = 0).
- **Tồn kho âm (`ton_kho`):** 0 bản ghi âm.
- **Mã nghiệp vụ trùng lặp:** 0 bản ghi.
- **Kết luận:** **PASS 100% CSDL**.

---

## 8. PH1 Business Logic Coverage (Kiểm tra Nghiệp vụ)

Đối chiếu thực tế trong mã nguồn `backend/src/services/` của `ph1-bh-qlkh`:

| Nghiệp vụ PH1 | Source Service | REST API Controller | DB Table | Trạng thái Nghiệp vụ |
|---|---|---|---|:---:|
| **A. Quản lý Khách hàng** | `customer.service.ts` | `customer.routes.ts` | `khach_hang` | 🟢 READY |
| **B. Tra cứu Sản phẩm** | `product.service.ts` | `product.routes.ts` | `san_pham` | 🟢 READY |
| **C. Đơn bán hàng (SO)** | `order.service.ts` | `order.routes.ts` | `don_ban_hang` | 🟢 READY |
| **D. Chi tiết Đơn hàng** | `pricing.ts`, `order.service.ts`| `order.routes.ts` | `chi_tiet_don_ban_hang`| 🟢 READY |
| **E. Xác nhận Đơn hàng** | `order.service.ts` | `order.routes.ts` | `don_ban_hang` | 🟢 READY |
| **F. Máy trạng thái Đơn** | `order.service.ts` | `order.routes.ts` | `don_ban_hang` | 🟢 READY |
| **G. Quản lý Giao hàng** | `delivery.service.ts` | `delivery.routes.ts`| `giao_hang` | 🟢 READY |
| **H. Hóa đơn Bán hàng** | `invoice.service.ts` | `invoice.routes.ts` | `hoa_don_ban_hang` | 🟢 READY |
| **I. Công nợ Phải thu (AR)**| `receivable.service.ts`| `receivable.routes.ts`| `cong_no` (`phai_thu`)| 🟢 READY |
| **J. Dashboard Bán hàng** | `dashboard.service.ts` | `dashboard.routes.ts`| View/Aggregate | 🟢 READY |

---

## 9. Liên kết Phân hệ PH1 → PH2 (Sản xuất)

- **Kỳ vọng:** Khi đơn hàng xác nhận (`da_xac_nhan`), PH1 gọi API chính thức của PH2: `POST /api/v1/production/plans` để tạo kế hoạch sản xuất.
- **Thực tế trong `ph1-bh-qlkh`:**
  - Nhánh PH1 được phát triển độc lập khi PH2 chưa freeze.
  - Tài liệu `docs/architecture/module-ownership.md` (mục 3.1) ghi nhận rõ: *"In MVP (while PH2 Production is not implemented), this transition is treated as an explicit Admin/Production supervisor action endpoint... Sales module strictly reads this state."*
  - Hiện tại PH1 **CHƯA CÓ API client** gọi sang PH2.
- **Kết luận:** **PENDING / MISSING API CALL**. Cần bổ sung service gọi `POST /api/v1/production/plans` trong quá trình tích hợp.

---

## 10. Liên kết Phân hệ PH1 → PH4 (Kho & Quản lý vật tư)

- **Kỳ vọng:** Khi hoàn tất đợt giao hàng (`da_giao`), PH1 phải gọi official PH4 API `POST /api/v1/phieu-xuat` với `loai_xuat = 'xuat_ban_hang'` để trừ kho an toàn qua `SELECT ... FOR UPDATE`.
- **Thực tế trong `ph1-bh-qlkh`:**
  - **Điểm tích cực:** PH1 tuân thủ nghiêm ngặt nguyên tắc **KHÔNG ghi đè trực tiếp vào `ton_kho`**, **KHÔNG tự ý chèn bảng `phieu_xuat_kho`**.
  - **Điểm còn thiếu:** PH1 quản lý `giao_hang` như một thực thể theo dõi thương mại độc lập, chưa phát lệnh xuất kho sang PH4 API.
- **Kết luận:** **PENDING / MISSING WAREHOUSE DISPATCH CALL**.

---

## 11. Liên kết Phân hệ PH1 → PH5 (Tài chính - Kế toán)

- **Kỳ vọng:** PH1 phát hành hóa đơn và công nợ phải thu, PH5 kế toán ghi nhận doanh thu và đối soát.
- **Thực tế trong `ph1-bh-qlkh`:**
  - PH1 tạo hóa đơn trong `hoa_don_ban_hang` và tạo khoản phải thu tương ứng trong `cong_no` (`loai_cong_no = 'phai_thu'`).
  - PH1 **KHÔNG** tự ý chèn dữ liệu vào bảng `nhat_ky_hach_toan` (tôn trọng quyền sở hữu của PH5).
  - Phía PH5 (đã tích hợp tại `E:\ERP`) đã có sẵn service đọc dữ liệu từ `don_ban_hang` và `cong_no` để phân tích hiệu quả đơn hàng và báo cáo tài chính.
- **Kết luận:** **PENDING / BASELINE DATA COMPATIBLE**.

---

## 12. Liên kết Phân hệ PH1 ↔ PH3 (Mua hàng)

- Không có xung đột nghiệp vụ hay dữ liệu.
- PH1 không duplicate bảng `nha_cung_cap` hay `don_mua_hang`.
- **Kết luận:** **N/A (Tương thích hoàn toàn)**.

---

## 13. Regression Test (Kiểm thử Hồi quy Toàn diện trên ERP hiện tại)

Hệ thống ERP May 10 hiện hành tại `E:\ERP` được kiểm thử hồi quy để xác nhận trạng thái nền tảng:

| Bộ kiểm thử | Số lượng Test | Kết quả | Trạng thái |
|---|:---:|:---:|:---:|
| **PH2 Production Functional** (`npm run test:ph2`) | 38 | 38/38 PASS | 🟢 100% |
| **PH2 Production Concurrency** (`npm run test:ph2:concurrency`) | 7 | 7/7 PASS | 🟢 100% |
| **PH3 Purchasing Functional** (`npm run test:ph3`) | 58 | 58/58 PASS | 🟢 100% |
| **PH3 Purchasing Concurrency** (`npm run test:ph3:concurrency`) | 9 | 9/9 PASS | 🟢 100% |
| **PH4 Warehouse REST API** (`npm run test:api`) | 16 | 16/16 PASS | 🟢 100% |
| **PH4 Warehouse Concurrency** (`npm run test:concurrency`) | 2 | 2/2 PASS | 🟢 100% |
| **PH5 Finance Functional** (`npm run test:ph5`) | 24 | 24/24 PASS | 🟢 100% |
| **Core Portal RBAC Security** (`test_rbac_security.js`) | 27 | 27/27 PASS | 🟢 100% |
| **Frontend Production Build** (`npm run build`) | 1,760 modules | Vite Build Success (17.7s) | 🟢 100% |

**Khẳng định:** Nền tảng Core Portal V2.11 và 4 phân hệ PH2, PH3, PH4, PH5 hiện tại đạt độ ổn định tuyệt đối (100% PASS). Bất kỳ hoạt động tích hợp nào cũng không được làm suy giảm kết quả này.

---

## 14. Đánh giá 10 Tiêu chí Cổng Kiểm soát (Gate Evaluation G1–G10)

| Cổng kiểm soát (Gate) | Nội dung đánh giá | Kết quả | Chi tiết đánh giá |
|---|---|:---:|---|
| **G1 — Git & Architecture** | Nhánh Git, Module system, Typescript/CommonJS | 🛑 **BLOCKED** | Nhánh tách từ root cũ; TypeScript ESM xung đột CommonJS Core; không được merge mù. |
| **G2 — Core Portal UI** | Khả năng tương thích MainLayout & Design System | 🛑 **BLOCKED** | PH1 dùng `@astryxdesign/core`, React 19, `AppShell` riêng; cần chuyển đổi sang React 18 / Tailwind / `MainLayout`. |
| **G3 — Authentication** | Đồng bộ cơ chế đăng nhập và token | 🛑 **BLOCKED** | Dùng JWT riêng (`jsonwebtoken`) và `auth_token`; bắt buộc chuyển sang **HMAC-SHA256** (`erp_token`). |
| **G4 — RBAC Matrix** | Vai trò và đặc quyền người dùng | ⚠️ **PASS WITH MINOR FINDING** | Vai trò `ban_hang` chuẩn; cần ánh xạ thêm mã quyền `sales.*`. |
| **G5 — Database Alignment**| Khớp 41 bảng chuẩn, không tạo bảng trùng | 🟢 **PASS** | Khớp 100% CSDL `erp_may10`, không cần migration hay tạo bảng mới. |
| **G6 — API Convention** | REST API endpoints, mã phản hồi HTTP | ⚠️ **PASS WITH MINOR FINDING** | Endpoints chuẩn hóa tốt, cần chuyển từ TypeScript sang Express Router gắn tại `/api/v1/sales/*`. |
| **G7 — PH1 → PH2 Contract**| Bắn đơn hàng sang Kế hoạch SX PH2 | ⏳ **PENDING** | Chưa gọi `POST /api/v1/production/plans`. |
| **G8 — PH1 → PH4 Contract**| Phát lệnh xuất kho bán hàng sang PH4 | ⏳ **PENDING** | Chưa gọi `POST /api/v1/phieu-xuat`. |
| **G9 — PH1 → PH5 Contract**| Cung cấp hóa đơn và công nợ cho kế toán | ⏳ **PENDING** | Dữ liệu tương thích trong `cong_no`, cần liên kết báo cáo. |
| **G10 — Regression Safety**| Bảo vệ các phân hệ đã freeze | 🟢 **PASS** | Không sửa đổi các phân hệ freeze nếu thực hiện theo phương thức Porting. |

---

## 15. Danh mục các vấn đề phát hiện (Findings)

1. **Finding F-01 (Critical - Authentication Discrepancy):** Nhánh `ph1-bh-qlkh` sử dụng thư viện `jsonwebtoken` với secret độc lập, không thể giải mã hoặc chấp nhận token `erp_token` ký số HMAC-SHA256 của Core Portal.
2. **Finding F-02 (Critical - Frontend Framework & Dependency Incompatibility):** Frontend của PH1 sử dụng React 19, React Router v7 và thư viện đóng gói ngoài `@astryxdesign/core`, `@stylexjs/stylex`. Gói này không thể cài đặt hoặc chạy trực tiếp trong ứng dụng React 18 / Vite 6 của Core Portal mà không gây xung đột dependency nặng nề.
3. **Finding F-03 (Critical - Isolated Standalone Shell):** PH1 tự dựng giao diện với `AppShell` và `LoginPage` riêng, định tuyến tại `/` thay vì mount con dưới `/sales/*` trong `MainLayout`.
4. **Finding F-04 (Major - Missing Inter-module Triggers):** Thiếu logic kích hoạt API xuất kho PH4 (`/api/v1/phieu-xuat`) khi giao hàng và thiếu logic gửi yêu cầu sản xuất sang PH2 (`/api/v1/production/plans`) khi duyệt đơn.
5. **Finding F-05 (Minor - Module Language Mismatch):** Backend PH1 viết bằng TypeScript ESM trong khi ERP Core là CommonJS Node.js.

---

## 16. Kế hoạch Chuyển đổi Bắt buộc (Required Changes for Integration)

Khi tiến hành bước tích hợp (Integration Step):
1. **Tuyệt đối không chạy `git merge ph1-bh-qlkh`**: Áp dụng giải pháp **PORT & ADAPT** từng tầng.
2. **Tầng Backend:**
   - Chuyển đổi các services/controllers (`customer`, `order`, `delivery`, `invoice`, `receivable`, `dashboard`) từ TypeScript sang chuẩn JavaScript CommonJS của ERP Core.
   - Gắn toàn bộ router PH1 vào [`backend/src/routes/salesRoutes.js`](file:///E:/ERP/backend/src/routes/salesRoutes.js) và mount tại `/api/v1/sales/*` trong [`backend/src/app.js`](file:///E:/ERP/backend/src/app.js).
   - Sử dụng trực tiếp `authMiddleware` và `requireRoles('ban_hang', 'admin')` của Core.
   - Bổ sung adapter gọi PH2 (`production.plans`) và PH4 (`phieu-xuat`).
3. **Tầng Frontend:**
   - Chuyển đổi các trang chức năng từ TSX/Astryx Design sang JSX / Tailwind CSS theo Design System của Core Portal V2.11.
   - Tạo [`frontend/src/pages/SalesModule.jsx`](file:///E:/ERP/frontend/src/pages/SalesModule.jsx) và gắn vào [`frontend/src/routes/AppRoutes.jsx`](file:///E:/ERP/frontend/src/routes/AppRoutes.jsx) dưới route `/sales/*` bên trong `MainLayout`.
   - Cập nhật menu phân hệ Bán hàng trong [`frontend/src/config/menu.js`](file:///E:/ERP/frontend/src/config/menu.js).
   - Sử dụng client `apiFetch` dùng chung token `erp_token`.

---

## 17. Quyết định Cuối cùng (Final Decision)

# FINAL DECISION: C. NOT READY — IMPLEMENTATION REQUIRED

### Trả lời các câu hỏi kiểm toán bắt buộc:
- **PH1 có thể kết nối ngay được hay chưa?**
  👉 **CHƯA THỂ KẾT NỐI NGAY**. Nhánh `ph1-bh-qlkh` đang mang kiến trúc độc lập (React 19, JWT, Astryx Design, TypeScript ESM), nếu kết nối trực tiếp sẽ làm đổ vỡ Core Portal.
- **Những gì đã PASS?**
  👉 CSDL 100% PASS (10 bảng chuẩn `erp_may10`, 0 broken FK, 0 negative stock). Logic nghiệp vụ bán hàng (Khách hàng, Đơn hàng, Hóa đơn, Giao hàng, Công nợ AR) đã hoàn thiện đầy đủ. Toàn bộ 4 phân hệ đóng băng PH2, PH3, PH4, PH5 đạt 100% test hồi quy.
- **Những gì còn FAIL?**
  👉 Xác thực (JWT riêng), Kiến trúc Frontend (React 19 + Astryx vs Core React 18 + Tailwind), Module Shell (có Login/AppShell riêng).
- **Những gì còn PENDING?**
  👉 Tích hợp tự động gọi API sang PH2 (`production/plans`) và PH4 (`phieu-xuat`).
- **Có cần sửa PH1 trước khi kết nối không?**
  👉 **CÓ**. Cần port mã nguồn PH1 sang chuẩn CommonJS backend và React 18 Tailwind frontend của Core Portal.
- **Có cần sửa Core / PH2 / PH3 / PH4 / PH5 không?**
  👉 **KHÔNG**. Core Portal V2.11 và PH2, PH3, PH4, PH5 tiếp tục được giữ nguyên trạng thái đóng băng (FROZEN 100%).
- **Có nguy cơ phá frozen modules không?**
  👉 Có nguy cơ cực cao nếu "merge mù" git branch. Hoàn toàn không có nguy cơ nếu thực hiện porting có kiểm soát theo kiến trúc layered.

---
PH1 PRE-INTEGRATION CONNECTIVITY AUDIT COMPLETE — NO CODE CHANGED
