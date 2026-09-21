# ============================================================
# PH1 — PRE-INTEGRATION CONNECTIVITY GATE AUDIT REPORT
# ERP MAY 10 — BÁN HÀNG & QUẢN LÝ KHÁCH HÀNG (SALES & CRM)
# ============================================================
# AUDIT TYPE: READ-ONLY PRE-INTEGRATION GATE AUDIT (G1–G10)
# REPOSITORY: https://github.com/Khooy-nb1/erp-may10
# TARGET WORKSPACE: E:\ERP (branch: feature/ph4-core-portal)
# SOURCE BRANCH AUDITED: origin/ph1-bh-qlkh (commit: 18ac419)
# DATE: 2026-09-13
# ============================================================

---

## 1. EXECUTIVE SUMMARY & FINAL DECISION

### FINAL DECISION:
**C. NOT READY — IMPLEMENTATION REQUIRED**

### Tóm tắt cốt lõi:
Nhánh `ph1-bh-qlkh` (commit `18ac419`) là một ứng dụng Bán hàng & Quản lý khách hàng độc lập (standalone monolithic full-stack app) được phát triển riêng rẽ từ initial commit (`c378a55`), hoàn toàn không kế thừa nền tảng Core Portal V2.11, PH2, PH3, PH4 hay PH5 đang chạy tại `E:\ERP`.

- **Về Nghiệp vụ & Cơ sở dữ liệu (Database & Business Logic)**: **100% TƯƠNG THÍCH**. Nhánh PH1 tuân thủ chính xác 10 bảng dữ liệu cốt lõi trong PostgreSQL 18.6 (`erp_may10`), không có xung đột schema, không cần chạy bất kỳ migration nào và không làm hỏng dữ liệu hiện tại.
- **Về Kiến trúc & Kỹ thuật kết nối (Architecture & Runtime)**: **BỊ CHẶN (BLOCKED)**. PH1 sử dụng công nghệ khác biệt hoàn toàn (Frontend: React 19 + React Router v7 + Tailwind v4 + Radix UI; Backend: TypeScript ES Modules + Zod + JWT tokens `jsonwebtoken`). Trong khi đó, Core ERP tại `E:\ERP` đang vận hành chuẩn hóa trên React 18 + React Router v6 + Tailwind v3 (Frontend) và Node.js CommonJS + Custom HMAC-SHA256 tokens (`erp_token`) (Backend).
- **Hệ quả nếu Merge trực tiếp**: Sẽ gây gãy đổ toàn bộ hệ thống (`BREAKING CHANGES`), ghi đè `package.json`, xóa bỏ cấu hình Vite/Tailwind của Core Portal, vô hiệu hóa cơ chế xác thực tập trung và làm sập 100% các phân hệ đã đóng băng (PH2, PH3, PH4, PH5).
- **Giải pháp bắt buộc**: Cần thực hiện **Implementation / Controlled Porting** (tương tự như đã triển khai thành công cho PH2, PH3 và PH5), bóc tách Business Logic, Services, Pages chuyển ngữ sang React 18 / Express CommonJS và gắn kết vào Core Portal theo đúng RBAC và URL routing (`/sales/*`).

---

## 2. METADATA & REPOSITORY INSPECTION

| Thuộc tính | Chi tiết kiểm tra |
| :--- | :--- |
| **Workspace hiện tại** | `E:\ERP` |
| **Branch đang chạy tại workspace** | `feature/ph4-core-portal` |
| **Remote Audited Branch** | `origin/ph1-bh-qlkh` |
| **Commit mới nhất trên ph1-bh-qlkh** | `18ac419` (`feat: add UI components for dialog, buttons, inputs, and more`) |
| **Merge-Base với `origin/main`** | `c378a5585ebba4dbefcfb088e8984da63f25c786` (Initial commit) |
| **Số commit đi trước merge-base** | 11 commits |
| **Số file thay đổi so với main** | 225 files (+33,215 lines, -6,116 lines) |
| **Trạng thái phân hệ tại E:\ERP** | **Core Portal V2.11**: FROZEN<br>**PH2 (Sản xuất)**: FROZEN (38/38 tests pass)<br>**PH3 (Mua hàng)**: FROZEN (58/58 tests pass)<br>**PH4 (Kho vận)**: FROZEN (16/16 tests pass)<br>**PH5 (Tài chính - Kế toán)**: FROZEN (24/24 tests pass) |

---

## 3. GATE 1 — ARCHITECTURE COMPATIBILITY (BỊ CHẶN - BLOCKED)

| Thành phần | Hệ thống hiện tại tại `E:\ERP` | Nhánh `ph1-bh-qlkh` | Đánh giá Gate |
| :--- | :--- | :--- | :--- |
| **Backend Runtime** | Node.js CommonJS (`require`) | Node.js TypeScript + ES Modules (`"type": "module"`) | **BLOCKED** |
| **Backend Framework** | Express 4.21.2 | Express 4.19.2 + `tsx` runner | **BLOCKED** |
| **Frontend Runtime** | React 18 (`18.3.1`) + Vite 6 | React 19 (`19.3.0`) + Vite 5 | **BLOCKED** |
| **Frontend Routing** | React Router DOM v6 (`6.28.0`) | React Router DOM v7 (`7.18.3`) | **BLOCKED** |
| **Styling** | Tailwind CSS v3 (`3.4.17`) | Tailwind CSS v4 (`4.3.3`) + `@tailwindcss/vite` | **BLOCKED** |
| **UI Components** | Lucide React + CSS Modules | Radix UI primitives + Lucide React | **BLOCKED** |
| **Validation Layer** | Express-validator / Custom schema | Zod (`3.23.8`) | **ADAPT REQUIRED** |

> **Kết luận G1**: Không thể merge trực tiếp mã nguồn. Yêu cầu porting backend controller/services về Express CommonJS và frontend JSX components về React 18 / React Router v6.

---

## 4. GATE 2 — CORE PORTAL COMPATIBILITY (BỊ CHẶN - BLOCKED)

1. **Về Layout & Shell**:
   - Nhánh `ph1-bh-qlkh` tự triển khai `AppShell.tsx` riêng với Sidebar, Header độc lập, mang tiêu đề cứng "ERP Sales & CRM".
   - Core ERP tại `E:\ERP` bắt buộc toàn bộ phân hệ chạy lồng bên trong `MainLayout.jsx` (`<Sidebar />`, `<Header />`, `<Breadcrumb />`, `<NotificationCenter />`).
2. **Về Cấu trúc Đường dẫn (Routing)**:
   - `ph1-bh-qlkh` khai báo routes ở root level: `/dashboard`, `/customers`, `/products`, `/orders`, `/deliveries`, `/reports`.
   - Core Portal quy hoạch toàn bộ phân hệ Bán hàng dưới namespace chuẩn: `/sales/*` (hoặc `/ban-hang/*`), ví dụ: `/sales/dashboard`, `/sales/orders`, `/sales/customers`.
3. **Về Menu Navigation**:
   - `frontend/src/config/menu.js` trong Core Portal đã định nghĩa sẵn menu Bán hàng (`ph1`, permission `sales.view`). PH1 cần liên kết vào cấu trúc menu này thay vì dựng thanh điều hướng riêng.

> **Kết luận G2**: Giao diện PH1 phải được tích hợp vào `MainLayout` của Core Portal, chuyển toàn bộ route con vào `/sales/*`.

---

## 5. GATE 3 — AUTHENTICATION SYSTEM (BỊ CHẶN - BLOCKED)

| Đặc tính | Core Portal V2.11 (`E:\ERP`) | Nhánh `ph1-bh-qlkh` | Tương thích |
| :--- | :--- | :--- | :--- |
| **Token Scheme** | Custom HMAC-SHA256 token | Standard RFC 7519 JSON Web Token (`jsonwebtoken`) | **KHÔNG** |
| **Token Format** | `erp_token_{userId}_{timestamp}.{signature}` | `eyJhbGciOiJIUzI1NiIsInR5cCI...` (Header.Payload.Sig) | **KHÔNG** |
| **Secret Config** | `process.env.AUTH_TOKEN_SECRET` | `process.env.JWT_SECRET` | **KHÔNG** |
| **Client Storage** | `localStorage.getItem('erp_token')` | `localStorage.getItem('auth_token')` | **KHÔNG** |
| **Token Extraction**| `req.headers.authorization?.split(' ')[1]` | `req.headers.authorization?.split(' ')[1]` | Tương đồng vị trí |
| **User Context** | Injected `req.user = { id, username, role, ... }` | Injected `req.user = { id, username, role }` | Tương đồng nghiệp vụ |

> **Kết luận G3**: Nếu cắm thẳng PH1, người dùng đăng nhập từ Core Portal sẽ bị trả lời `401 Unauthorized` ngay lập tức tại các API của PH1 vì hàm verify token không nhận diện được token format `erp_token`. Khi tích hợp, PH1 phải dùng chung middleware `authenticate` tại `backend/src/middlewares/auth.js`.

---

## 6. GATE 4 — RBAC & AUTHORIZATION (PASS WITH MINOR FINDING)

1. **Role Canonical Alignment**:
   - Nhánh `ph1-bh-qlkh` sử dụng role `ban_hang` và `admin`.
   - Đối chiếu với Core Portal (`backend/src/config/roleMapping.js` & `roles.js`): Role canonical đại diện cho kinh doanh/bán hàng chính xác là `ban_hang`.
   - Người dùng mẫu trong hệ thống `E:\ERP`: `banhang@may10.vn` (User ID 5, role: `ban_hang`).
2. **Permission Layer (Minor Finding)**:
   - PH1 kiểm tra quyền theo role trực tiếp (`authorizeRoles('ban_hang', 'admin')`).
   - Core ERP V2.11 yêu cầu kiểm tra mịn theo permission code (`requirePermission('sales.view')`, `requirePermission('sales.create')`, `requirePermission('sales.approve')`).

> **Kết luận G4**: **PASS WITH MINOR FINDING**. RBAC role hoàn toàn trùng khớp. Chỉ cần gắn thêm permission checking theo chuẩn Core Portal.

---

## 7. GATE 5 — DATABASE SCHEMA & DATA INTEGRITY (PASS 100%)

Quá trình audit đã thực hiện đối soát 10 bảng dữ liệu thực tế trên PostgreSQL 18.6 (`erp_may10`):

| Tên Bảng | Số Cột Schema | Bản ghi hiện tại | Trạng thái Foreign Keys | Đánh giá |
| :--- | :---: | :---: | :---: | :--- |
| `nguoi_dung` | 11 | 7 | Khớp `vai_tro` | **PASS** |
| `khach_hang` | 13 | 2 | Khớp mã khách hàng | **PASS** |
| `san_pham` | 14 | 8 | Khớp mã sản phẩm | **PASS** |
| `don_vi_tinh` | 5 | 4 | Chuẩn hóa đơn vị | **PASS** |
| `don_ban_hang` | 15 | 2 | FK -> `khach_hang`, `nguoi_dung` | **PASS** |
| `chi_tiet_don_ban_hang` | 10 | 2 | FK -> `don_ban_hang`, `san_pham` | **PASS** |
| `giao_hang` | 13 | 1 | FK -> `don_ban_hang` | **PASS** |
| `kho` | 7 | 3 | Chuẩn 3 kho (NVL, BTP, TP) | **PASS** |
| `hoa_don_ban_hang` | 15 | 1 | FK -> `don_ban_hang`, `khach_hang` | **PASS** |
| `cong_no` | 13 | 2 | Phân loại `phai_thu` / `phai_tra` | **PASS** |

- **Toàn vẹn dữ liệu (Data Integrity Checks)**:
  - Tồn kho âm (`negative stock`): 0 bản ghi.
  - Khóa ngoại mồ côi (`broken foreign keys`): 0.
  - Trùng lặp mã (`duplicate business codes`): 0.
  - Số bảng migration mới cần tạo: **0 bảng**.

> **Kết luận G5**: **PASS (100%)**. Database schema giữa PH1 và Core ERP là đồng nhất hoàn hảo.

---

## 8. GATE 6 — API ROUTE & PAYLOAD DESIGN (PASS WITH MINOR FINDING)

1. **Cấu trúc URL & Payload**:
   - `ph1-bh-qlkh` thiết kế các REST endpoint sạch:
     - `GET /api/v1/customers`, `POST /api/v1/customers`
     - `GET /api/v1/orders`, `POST /api/v1/orders`, `GET /api/v1/orders/:id`
     - `GET /api/v1/products`
     - `GET /api/v1/deliveries`, `POST /api/v1/deliveries`
     - `GET /api/v1/reports/sales`
   - Chuẩn response envelope:
     ```json
     {
       "success": true,
       "data": { ... },
       "message": "..."
     }
     ```
   - Envelope hoàn toàn tương đồng với chuẩn chung của Core Portal, PH2, PH3, PH4, PH5.
2. **Yêu cầu tinh chỉnh (Minor Adaptation)**:
   - Khi porting vào `E:\ERP`, cần mount dưới router `backend/src/routes/salesRoutes.js` (hoặc prefix `/api/v1/sales/*`) để tránh chiếm dụng namespace root của Core API.

> **Kết luận G6**: **PASS WITH MINOR FINDING**. Kiến trúc RESTful và Payload Envelope đạt chuẩn.

---

## 9. GATE 7 — INTER-MODULE: PH1 → PH2 CONTRACT (PENDING)

- **Quy trình nghiệp vụ**: Khi Đơn bán hàng (`don_ban_hang`) chuyển trạng thái `da_xac_nhan` (hoặc yêu cầu sản xuất đơn hàng may mặc), PH1 cần kích hoạt tạo Kế hoạch sản xuất (`ke_hoach_san_xuat`) trong PH2.
- **Hiện trạng trong `ph1-bh-qlkh`**: Nhánh PH1 hiện mới xử lý cập nhật trạng thái đơn hàng trong bảng `don_ban_hang`, chưa gọi endpoint tích hợp `POST /api/v1/production/plans` của PH2.
- **Đánh giá**: Không có vi phạm trực tiếp đến schema PH2, tuy nhiên hợp đồng tự động hóa luồng bán hàng -> sản xuất chưa được đấu nối.

> **Kết luận G7**: **PENDING (CHỜ ĐẤU NỐI API)**. Cần bổ sung hook/service gọi sang PH2 khi đơn hàng được phê duyệt.

---

## 10. GATE 8 — INTER-MODULE: PH1 → PH4 CONTRACT (PENDING)

- **Quy trình nghiệp vụ**: Khi xuất kho giao hàng cho khách (`giao_hang`), hệ thống phải tạo Phiếu xuất kho (`phieu_xuat_kho`) với `loai_xuat = 'xuat_ban_hang'` và giảm trừ tồn kho (`ton_kho`, `the_kho`) tuân theo quy tắc kiểm tra số dư an toàn (`FEFO / FIFO / Available Quantity`).
- **Hiện trạng trong `ph1-bh-qlkh`**:
  - Mã nguồn PH1 ghi nhận thông tin vào bảng `giao_hang`.
  - PH1 **KHÔNG** tự ý `UPDATE ton_kho` bằng câu lệnh SQL thô (đây là điểm an toàn xuất sắc, không làm phá vỡ logic kế toán kho PH4).
  - Tuy nhiên, PH1 **chưa gọi** API chính thức của PH4: `POST /api/v1/phieu-xuat`.
- **Đánh giá**: Cơ sở dữ liệu an toàn, hợp đồng gọi API giữa 2 phân hệ cần được kích hoạt khi tích hợp.

> **Kết luận G8**: **PENDING (CHỜ ĐẤU NỐI API)**. Cần tích hợp router tạo phiếu xuất kho PH4 từ phiếu giao hàng PH1.

---

## 11. GATE 9 — INTER-MODULE: PH1 → PH5 CONTRACT (PENDING)

- **Quy trình nghiệp vụ**: Khi xuất hóa đơn bán hàng (`hoa_don_ban_hang`) và phát sinh công nợ phải thu (`cong_no` loại `phai_thu`), hệ thống tài chính PH5 cần hạch toán vào Nhật ký chứng từ kế toán (`nhat_ky_hach_toan` - Nợ TK 131, Có TK 511, Có TK 33311).
- **Hiện trạng trong `ph1-bh-qlkh`**:
  - PH1 ghi nhận hóa đơn vào `hoa_don_ban_hang` và công nợ vào `cong_no` chuẩn xác theo schema PostgreSQL.
  - PH1 **KHÔNG** can thiệp vào `nhat_ky_hach_toan` (không gây sai lệch sổ sách kế toán PH5).
  - PH5 đã có sẵn các service tự động tổng hợp công nợ và doanh thu từ 2 bảng này (`debtService.js`, `financialReportService.js`).

> **Kết luận G9**: **PENDING (ĐỒNG BỘ NỀN TẢNG ĐẠT, CHỜ HOÀN THIỆN SỰ KIỆN TỰ ĐỘNG HẠCH TOÁN)**.

---

## 12. GATE 10 — REGRESSION SAFETY OF FROZEN MODULES (PASS 100%)

Đã thực hiện chạy toàn bộ test suite hồi quy trên hệ thống `E:\ERP`:

| Test Suite | Số lượng Test | Kết quả | Thời gian / Tỷ lệ |
| :--- | :---: | :---: | :---: |
| **PH2 Production Tests** (`test_ph2_production.js`) | 38 tests | **38 PASS / 0 FAIL** | 100% |
| **PH2 Concurrency Tests** (`test_ph2_concurrency.js`) | 7 tests | **7 PASS / 0 FAIL** | 100% |
| **PH3 Purchasing Tests** (`test_ph3_purchasing.js`) | 58 tests | **58 PASS / 0 FAIL** | 100% |
| **PH3 Concurrency Tests** (`test_ph3_concurrency.js`) | 9 tests | **9 PASS / 0 FAIL** | 100% |
| **PH4 Warehouse API Tests** (`test_ph4_api.js`) | 16 tests | **16 PASS / 0 FAIL** | 100% |
| **PH4 Concurrency Tests** (`test_concurrency.js`) | 2 tests | **2 PASS / 0 FAIL** | 100% |
| **PH5 Finance Tests** (`test_ph5_finance.js`) | 24 tests | **24 PASS / 0 FAIL** | 100% |
| **RBAC Security Suite** (`test_rbac_security.js`) | 27 tests | **27 PASS / 0 FAIL** | 100% |
| **Frontend Production Build** (`npm run build`) | 1,760 modules | **BUILD SUCCESS** | 17.7s |

> **Kết luận G10**: **PASS (100%)**. Toàn bộ 5 phân hệ đóng băng tại `E:\ERP` đang hoạt động ổn định tuyệt đối và sẵn sàng tiếp nhận phân hệ mới qua cổng giao tiếp an toàn.

---

## 13. MA TRẬN ĐÁNH GIÁ 10 CỔNG KIỂM SOÁT (GATE SUMMARY MATRIX)

| Cổng (Gate) | Tên tiêu chí kiểm tra | Kết quả | Mức độ nghiêm trọng / Hành động |
| :---: | :--- | :---: | :--- |
| **G1** | Kiến trúc hệ thống (Architecture) | **BLOCKED** | Không merge mã nguồn; Porting TS/ESM -> CJS, React 19 -> 18 |
| **G2** | Tương thích Core Portal (Layout/Route) | **BLOCKED** | Bỏ AppShell riêng; Gắn vào MainLayout dưới `/sales/*` |
| **G3** | Cơ chế Xác thực (Authentication) | **BLOCKED** | Chuyển `jsonwebtoken` sang Core HMAC `erp_token` |
| **G4** | Phân quyền người dùng (RBAC) | **PASS W/ MINOR**| Trùng khớp role `ban_hang`; Bổ sung permission checks |
| **G5** | Cơ sở dữ liệu (Database Schema) | **PASS** | 100% chuẩn hóa, 0 migration, 0 lỗi toàn vẹn |
| **G6** | Thiết kế API & Payload Envelope | **PASS W/ MINOR**| Envelope chuẩn; Prefix gom nhóm `/api/v1/sales/*` |
| **G7** | Hợp đồng liên phân hệ PH1 → PH2 | **PENDING** | Đấu nối gọi API `POST /api/v1/production/plans` |
| **G8** | Hợp đồng liên phân hệ PH1 → PH4 | **PENDING** | Đấu nối gọi API `POST /api/v1/phieu-xuat` |
| **G9** | Hợp đồng liên phân hệ PH1 → PH5 | **PENDING** | Khớp bảng công nợ; Đấu nối sinh chứng từ hạch toán tự động |
| **G10** | An toàn hồi quy các phân hệ FROZEN | **PASS** | 100% pass (PH2, PH3, PH4, PH5, Core RBAC, Frontend build) |

---

## 14. SO SÁNH DEPENDENCY & XUNG ĐỘT GÓI THƯ VIỆN

```
[FRONTEND DEPENDENCIES CONFLICT]
Core ERP (E:\ERP):
  ├── react: ^18.3.1
  ├── react-dom: ^18.3.1
  ├── react-router-dom: ^6.28.0
  ├── tailwindcss: ^3.4.17
  └── vite: ^6.0.5

Branch ph1-bh-qlkh:
  ├── react: ^19.3.0          <-- XUNG ĐỘT PHIÊN BẢN (BREAKING)
  ├── react-dom: ^19.3.0      <-- XUNG ĐỘT PHIÊN BẢN (BREAKING)
  ├── react-router-dom: ^7.18.3<-- XUNG ĐỘT ROUTER V6 vs V7 (BREAKING)
  ├── @tailwindcss/vite: ^4.3.3<-- XUNG ĐỘT TAILWIND V3 vs V4 (BREAKING)
  └── @radix-ui/*: ^1.x / 2.x  <-- Phụ thuộc bổ sung

[BACKEND DEPENDENCIES CONFLICT]
Core ERP (E:\ERP):
  ├── module format: CommonJS (require / module.exports)
  ├── auth: crypto (HMAC-SHA256)
  └── database: pg (Pool)

Branch ph1-bh-qlkh:
  ├── module format: ES Modules (import / export) with tsx / tsc
  ├── auth: jsonwebtoken + bcrypt
  └── validation: zod
```

---

## 15. DANH MỤC THÀNH PHẦN CẦN PORTING (IMPLEMENTATION SCOPE)

Khi tiến hành bước Step 2 Integration, các thành phần sau sẽ được porting có chọn lọc vào `E:\ERP`:

### Backend Components (`E:\ERP\backend\`):
1. **Controllers**:
   - `src/controllers/customerController.js` (Quản lý khách hàng, công nợ ban đầu)
   - `src/controllers/salesOrderController.js` (Đơn đặt hàng, phê duyệt, báo giá)
   - `src/controllers/deliveryController.js` (Giao hàng, phiếu xuất giao)
   - `src/controllers/salesReportController.js` (Báo cáo doanh số theo mặt hàng, khách hàng)
2. **Services**:
   - `src/services/customerService.js`
   - `src/services/salesOrderService.js`
   - `src/services/deliveryService.js`
   - `src/services/salesReportService.js`
3. **Routes**:
   - `src/routes/salesRoutes.js` (Tập hợp các route `/api/v1/sales/*` gắn auth middleware `authenticate` và check permissions)
4. **Validators**:
   - `src/validators/salesValidator.js` (Chuẩn hóa input validation dùng schema gọn nhẹ)

### Frontend Components (`E:\ERP\frontend\`):
1. **Pages (`src/pages/sales/`)**:
   - `SalesDashboardPage.jsx` (Tổng quan bán hàng & CRM)
   - `CustomersPage.jsx` & `CustomerDetailPage.jsx` (Danh bạ & lịch sử giao dịch khách hàng)
   - `SalesOrdersPage.jsx` & `SalesOrderDetailPage.jsx` (Lập & theo dõi đơn bán hàng)
   - `DeliveryOrdersPage.jsx` (Theo dõi giao nhận hàng)
   - `SalesReportsPage.jsx` (Biểu đồ doanh thu kinh doanh)
2. **Services (`src/services/salesService.js`)**:
   - Tích hợp `apiClient` từ `src/services/api.js` (tự động đính kèm `Bearer erp_token`)
3. **Integration vào Core Portal**:
   - Đăng ký routes vào `src/routes/AppRoutes.jsx` bên dưới `<MainLayout />`.
   - Phân quyền hiển thị theo `roleMapping.js` và menu cấu hình tại `src/config/menu.js`.

---

## 16. KẾ HOẠCH BẢO VỆ CÁC PHÂN HỆ ĐÃ ĐÓNG BĂNG

1. **Tuyệt đối không chạy `git merge ph1-bh-qlkh`**:
   - Quy trình porting phải thực hiện thủ công theo từng file (tương tự PH2, PH3, PH5).
2. **Không sửa đổi Database Schema**:
   - Không chạy lệnh `ALTER TABLE`, không thêm cột, không đổi kiểu dữ liệu của bất kỳ bảng nào trong số 41 bảng hiện tại.
3. **Không sửa đổi Core Auth & RBAC Foundation**:
   - `backend/src/middlewares/auth.js` và `backend/src/config/roleMapping.js` giữ nguyên vẹn.
4. **Bảo tồn tính toàn vẹn của PH2, PH3, PH4, PH5**:
   - Mọi giao tiếp liên phân hệ được thực hiện qua HTTP API hoặc query read-only, không can thiệp trực tiếp vào logic nội bộ của các phân hệ khác.
5. **Chạy regression suite trước và sau mỗi bước porting**:
   - Đảm bảo 100% pass trên toàn bộ các bộ test hiện có.

---

PH1 PRE-INTEGRATION GATE AUDIT COMPLETE — NO CODE CHANGED
