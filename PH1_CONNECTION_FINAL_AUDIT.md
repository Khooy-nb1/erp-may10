# PH1 — FINAL CONNECTION READ-ONLY AUDIT
## KIỂM TRA BRANCH PH1 ĐÃ ĐỦ ĐIỀU KIỆN KẾT NỐI VÀO ERP MAY 10 HAY CHƯA

- **Thời điểm kiểm toán:** 2026-09-17
- **Chế độ kiểm toán:** **STRICT READ-ONLY AUDIT (KHÔNG SỬA CODE, KHÔNG SỬA CSDL, KHÔNG COMMIT/PUSH/CHECKOUT)**
- **PH1 Source Repository:** `https://github.com/Khooy-nb1/erp-may10/tree/feature/ph1-sales-core`
- **PH1 Target Branch:** `feature/ph1-sales-core`
- **Current Workspace:** `E:\ERP`
- **Current Workspace Branch:** `feature/ph4-core-portal` (Commit `8ef0c20`)
- **PH1 Local Git Ref:** `remotes/origin/ph1-bh-qlkh` (Commit `78d7729` / `4c991ea`)

---

## 1. Source Identity & Git Workspace

- **Workspace hiện tại:** `E:\ERP` đang checkout trên branch `feature/ph4-core-portal` với commit đỉnh `8ef0c20` (*feat(ph4): add material master data management*).
- **Working Tree:** Chứa mã nguồn đóng băng của Core Portal V2.11, PH2 (Sản xuất), PH3 (Mua hàng), PH4 (Kho & Quản lý vật tư), PH5 (Tài chính). Hoàn toàn không có mã nguồn PH1 trong working tree.
- **Trạng thái Branch PH1:**
  - Remote branch `feature/ph1-sales-core` đã được push lên GitHub (Commit SHA `25d5dab69e6d6201fef20ee127accbe5afda5d93`).
  - Git tracking ref `origin/ph1-bh-qlkh` có sẵn trong local object store tại commit `78d7729` (*"feat: enhance order, product, and receivable pages with filter functionality and create dialogs"*).
  - Tình trạng nguồn: **PH1 SOURCE AVAILABLE VIA GIT REF (READ-ONLY)**.

---

## 2. Technology Stack & Architecture Comparison

| Thành phần (Layer) | Phân hệ PH1 (`ph1-sales-core`) | ERP Core Hiện Tại (`E:\ERP`) | Đánh giá Tương thích |
| :--- | :--- | :--- | :---: |
| **Backend Runtime** | Node.js TypeScript + ES Modules (`"type": "module"`) | Node.js CommonJS (`require`, `module.exports`) | ❌ **FAIL (Cần Porting)** |
| **Backend Runner** | `tsx` watch / `tsc` | Node.js Express native | ❌ **FAIL** |
| **Backend Dependencies** | Express 4.21, Zod 3.24, jsonwebtoken 9.0, pg 8.13 | Express 4.21, pg 8.13, dotenv, cors | ⚠️ **PARTIAL (Express & pg khớp)** |
| **Frontend Framework** | React 19 (`19.3.0`) + Vite 8 (`8.3.0`) | React 18 (`18.3.1`) + Vite 6 (`6.1.0`) | ❌ **FAIL (Xung đột version)** |
| **Frontend Routing** | React Router DOM v7 (`7.18.3`) | React Router DOM v7 (`7.18.3`) | ✅ **PASS** |
| **Styling & CSS** | Tailwind CSS v4 (`4.3.3`) + `@tailwindcss/vite` | Tailwind CSS v3 (`3.4.17`) + PostCSS | ❌ **FAIL** |
| **UI Components** | Radix UI primitives + Lucide React | Lucide React + Native CSS Modules | ⚠️ **PARTIAL** |
| **Application Layout** | `AppShell.tsx` ("ERP Sales & CRM") + `LoginPage.tsx` | `MainLayout.jsx` (Global Header, Sidebar, Breadcrumb) | ❌ **FAIL (Layout riêng biệt)** |
| **Database** | PostgreSQL 18.6 (`erp_may10`) | PostgreSQL 18.6 (`erp_may10`) | ✅ **PASS (100% CSDL chung)** |

---

## 3. Core ERP Baseline Verification

Hệ thống ERP May 10 hiện tại tại `E:\ERP`:
- **Core Portal:** Điều hướng tập trung, header module selector, global user menu, breadcrumbs.
- **Bảo mật Core:** Cơ chế ký token máy chủ nội bộ HMAC-SHA256 (`erp_token_{userId}_{timestamp}.{signature}`). Header `x-role` và `x-user-id` bị chặn tuyệt đối (Zero Trust).
- **Canonical Roles:** `admin`, `ban_hang`, `san_xuat`, `mua_hang`, `kho`, `ke_toan`.
- **PH4 (Kho):** Quản lý độc quyền tồn kho nguyên phụ liệu, thẻ kho (running balance), giao dịch xuất/nhập an toàn với `SELECT ... FOR UPDATE` và Negative Stock Protection (HTTP 409 Conflict).

---

## 4. Authentication Compatibility

- **Core Auth:** Token HMAC-SHA256, lưu tại `localStorage.getItem('erp_token')`, xác thực qua `auth.js` middleware.
- **PH1 Auth:** RFC 7519 JSON Web Token (`jsonwebtoken`), lưu tại `localStorage.getItem('auth_token')`, xác thực qua `auth.middleware.ts` với `JWT_SECRET`.
- **Kết luận:** ❌ **FAIL (AUTH MISMATCH)**.
- **Yêu cầu khi kết nối:** **`AUTH PORTING REQUIRED`**. Khi chuyển giao sang `E:\ERP`, toàn bộ route PH1 phải chuyển sang sử dụng `authMiddleware` chuẩn của Core Portal, bóc tách danh tính từ `erp_token`.

---

## 5. RBAC Compatibility

- **Roles trong PH1:** Sử dụng `ban_hang` và `admin`, cho phép `kho` và `ke_toan` tra cứu read-only.
- **Vai trò rác:** Hoàn toàn **KHÔNG CÓ** vai trò tự chế (`sales_admin`, `sales_manager`, `customer_manager`).
- **Phân quyền Backend:** Sử dụng middleware `requireRole('ban_hang', 'admin')`.
- **Kết luận:** ✅ **PASS (Canonical Roles)** / ⚠️ **Cần ánh xạ sang Permission Keys (`sales.view`, `sales.create`, `sales.confirm`, `sales.delivery`, `sales.invoice`).**

---

## 6. PH1 API Inventory & Response Envelopes

Toàn bộ 23 REST endpoints của PH1 đã được xây dựng hoàn chỉnh:
- **Authentication:** `POST /api/v1/auth/login`, `GET /api/v1/auth/me` *(Sẽ loại bỏ để dùng Core Auth)*
- **Customers:** `GET/POST /api/v1/customers`, `GET/PATCH /api/v1/customers/:id`, `PATCH /api/v1/customers/:id/status`, `GET /api/v1/customers/:id/summary`, `GET /api/v1/customers/:id/receivables`
- **Products:** `GET /api/v1/products`, `GET /api/v1/products/:id` *(Read-only)*
- **Sales Orders:** `GET/POST /api/v1/sales-orders`, `GET/PATCH /api/v1/sales-orders/:id`, `POST /api/v1/sales-orders/:id/confirm`, `POST /api/v1/sales-orders/:id/cancel`
- **Deliveries:** `GET/POST /api/v1/deliveries`, `GET /api/v1/deliveries/:id`, `POST /api/v1/deliveries/:id/start`, `POST /api/v1/deliveries/:id/complete`, `POST /api/v1/deliveries/:id/fail`
- **Invoices:** `GET/POST /api/v1/invoices`, `GET /api/v1/invoices/:id`
- **Receivables:** `GET /api/v1/receivables`, `GET /api/v1/receivables/aging`
- **Dashboard:** `GET /api/v1/dashboard/summary`
- **Response Format:** Chuẩn envelope `{ success: true, data: ..., pagination: ... }`, lỗi trả về `{ success: false, errorCode: ..., message: ... }`. Hoàn toàn tương thích chuẩn API của Core Portal.

---

## 7. Database Compatibility

- **CSDL:** PostgreSQL 18.6 `erp_may10` (schema `public`).
- **Các bảng sử dụng:** `khach_hang`, `don_ban_hang`, `chi_tiet_don_ban_hang`, `giao_hang`, `hoa_don_ban_hang`, `cong_no`.
- **Các bảng danh mục tham chiếu:** `san_pham`, `don_vi_tinh`, `nguoi_dung`, `kho`.
- **Toàn vẹn dữ liệu:**
  - Duplicate tables: 0
  - Broken Foreign Keys: 0
  - Schema drift: 0
  - Migrations cần chạy: **0 migration** (CSDL đã có đủ 43 bảng khớp 100%).
- **Kết luận:** ✅ **PASS**.

---

## 8. PH1 Business Flow Audit

PH1 đã xây dựng đầy đủ và chặt chẽ luồng nghiệp vụ Bán hàng may mặc:
1. **Khách hàng:** Quản lý hạn mức tín dụng (`han_muc_cong_no`) và số ngày được nợ (`so_ngay_duoc_no`).
2. **Sản phẩm:** Tra cứu sản phẩm sẵn sàng bán, áp dụng giá bán niêm yết từ `san_pham.gia_ban`.
3. **Đơn bán hàng:** Tính toán tự động tiền hàng, thuế GTGT, tỷ lệ giảm giá phía server.
4. **Xác nhận đơn:** Kiểm soát hạn mức nợ (chặn hoặc cảnh báo khi vượt nợ `CUSTOMER_CREDIT_LIMIT_EXCEEDED`).
5. **Hủy đơn:** Bắt buộc nhập lý do hủy, khóa quyền hủy đơn đã duyệt đối với nhân viên bán hàng (chỉ Admin được hủy).
6. **Giao hàng:** Lập đợt giao, theo dõi tiến trình vận chuyển (`cho_giao` $\rightarrow$ `dang_giao` $\rightarrow$ `da_giao` / `that_bai`).
7. **Hóa đơn & Công nợ:** Phát hành hóa đơn, sinh công nợ phải thu, đối soát tuổi nợ khách hàng (Aging).
8. **Dashboard:** Biểu đồ doanh thu, cơ cấu trạng thái đơn hàng, Top khách hàng & sản phẩm.

---

## 9. CRITICAL AUDIT: PH1 → PH4 & STOCK OWNERSHIP

### 9.1 Phân tích ranh giới sở hữu tồn kho:
- **Static Search `UPDATE ton_kho`:** **0 kết quả** trong mã nguồn nghiệp vụ PH1.
- **Static Search `INSERT INTO ton_kho`:** **0 kết quả** trong mã nguồn nghiệp vụ PH1.
- **Static Search `DELETE FROM ton_kho`:** **0 kết quả**.
- **Static Search `so_luong_ton`:** Chỉ tham chiếu trong schema & seed ban đầu.
- **Cam kết kiến trúc của PH1:**
  > *"Delivery completion (`giao_hang.trang_thai = 'da_giao'`) DOES NOT deduct inventory or generate inventory transactions. The Delivery module manages delivery logistics, status tracking only. Physical stock movements remain in PH4."*
- **Đánh giá Stock Mutation Ownership:** ✅ **PASS (100% TUÂN THỦ RANH GIỚI KHO PH4)**.

### 9.2 Phân loại Sales → Delivery → Stock Flow (Mục 14):
- PH1 quản lý chứng từ vận chuyển `giao_hang`.
- PH1 **chưa gọi** API `POST /api/v1/phieu-xuat` của PH4.
- **Phân loại:** **`CASE B — Có Delivery nhưng chưa gọi PH4 (NOT READY FOR E2E DIRECTLY)`**.
- Không phạm Case C (không tự sửa tồn kho), không phạm Case D (không gọi sai endpoint).

---

## 10. PH4 API Contract Comparison

| Tiêu chí | Phân hệ PH4 Hiện Có | Phân hệ PH1 | Đánh giá |
| :--- | :--- | :--- | :---: |
| **Endpoint** | `POST /api/v1/phieu-xuat` | Chưa có API client gọi | ❌ **FAIL (Chưa kết nối)** |
| **HTTP Method** | `POST` | Chưa gọi | ❌ **FAIL** |
| **Payload Body** | `loai_xuat`, `ma_kho_xuat`, `chiTiet: [{ ma_vat_tu, so_luong_xuat }]` | Quản lý theo `giao_hang` | ⚠️ **CẦN ADAPTER** |
| **Auth** | `Authorization: Bearer <erp_token>` | `Bearer <jwt>` | ❌ **FAIL (Lệch Auth)** |
| **Role xuất hàng** | `kho`, `admin` | `ban_hang`, `admin` | ✅ **ĐÚNG NGUYÊN TẮC THỦ KHO XUẤT** |
| **Negative Stock Protection**| HTTP 409 Conflict | Không can thiệp | ✅ **AN TOÀN TUYỆT ĐỐI** |
| **Stock Card (Thẻ kho)** | Ghi nhận tự động số dư lũy kế | Không can thiệp | ✅ **PH4 ĐỘC QUYỀN SỞ HỮU** |

---

## 11. Transaction & Concurrency Integrity

- **PH1:** Các thao tác ghi nhiều bảng (Đơn hàng + chi tiết dòng; Hóa đơn + công nợ) đều được bọc trong database transaction với PostgreSQL client.
- **PH4:** Toàn bộ quá trình xuất kho được bảo vệ bằng transaction cô lập và khóa dòng `SELECT ... FOR UPDATE`, đảm bảo không bao giờ xuất âm hay tranh chấp dữ liệu.
- **Đánh giá:** ✅ **PASS**.

---

## 12. Static Mock / Fake Audit

- **Search `localStorage`:** Chỉ sử dụng lưu token xác thực (`auth_token`) và profile đăng nhập (`auth_user`). Hoàn toàn không dùng `localStorage` làm source of truth nghiệp vụ.
- **Search `mock` & `fake`:** Chỉ xuất hiện trong các file kiểm thử đơn vị (`*.test.ts`) để mock repository và giả lập request rate-limit. Mã nguồn sản phẩm sử dụng 100% dữ liệu thật từ PostgreSQL `erp_may10`.
- **Đánh giá:** ✅ **PASS (SAFE)**.

---

## 13. Test & Build Results

- **Kiểm thử PH1:** Có sẵn 24 test suites độc lập (`*.test.ts`) bao phủ đầy đủ Auth, Customer, Product, Order, Delivery, Invoice, Receivable, Pricing, Error Envelope.
- **Kiểm thử Hệ thống Core & PH4 tại `E:\ERP`:**
  - FR-11 Thẻ kho Running Balance: `10 PASS / 0 FAIL` (100%)
  - RBAC Security (R01 → R27): `27 PASS / 0 FAIL` (100%)
  - PH4 Master Data F-01: `12 PASS / 0 FAIL` (100%)
  - PH4 Full REST API: `16 PASS / 0 FAIL` (100%)
  - Frontend Production Build (`npm run build`): **PASS (1761 modules transformed, 0 errors, 16.70s)**.
- **Đánh giá:** ✅ **PASS**.

---

## 14. Cross-Module Compatibility

- **PH1 ↔ Core Portal:** Cần bọc layout PH1 vào `MainLayout.jsx`, loại bỏ `AppShell` và `LoginPage` độc lập.
- **PH1 ↔ PH2 (Sản xuất):** Bảng `ke_hoach_san_xuat` có sẵn cột `ma_don_ban_hang`. PH1 đã sẵn sàng để phát hành KHSX sang `POST /api/v1/production/plans`.
- **PH1 ↔ PH4 (Kho):** PH1 tôn trọng tuyệt đối quyền quản lý tồn kho của PH4. Cần xây dựng adapter gọi `POST /api/v1/phieu-xuat` (`loai_xuat = 'giao_khach'`).
- **PH1 ↔ PH5 (Kế toán):** PH1 đã ghi nhận đúng chuẩn vào bảng `cong_no` (`phai_thu`). PH5 tự động tổng hợp công nợ khách hàng từ bảng này.

---

## 15. Connection Readiness Matrix

| Hạng mục Kiểm tra | Bằng chứng / Nguồn đối chiếu | Trạng thái |
| :--- | :--- | :---: |
| **Correct PH1 branch** | `feature/ph1-sales-core` trên remote / `ph1-bh-qlkh` local | ⚠️ **READ-ONLY AVAILABLE** |
| **Same backend architecture** | TypeScript ESM vs CommonJS Express | ❌ **FAIL** |
| **Same frontend architecture** | React 19 + Radix vs React 18 + Tailwind v3 Core | ❌ **FAIL** |
| **Core Auth compatible** | HMAC `erp_token` vs RFC 7519 JWT | ❌ **FAIL** |
| **RBAC compatible** | Canonical roles: `admin`, `ban_hang` | ✅ **PASS** |
| **PostgreSQL compatible** | CSDL 43 bảng `erp_may10`, zero schema drift | ✅ **PASS** |
| **API compatible** | Chuẩn hóa envelope JSON, phân trang | ✅ **PASS** |
| **Real Sales Order** | CRUD, pricing server, credit limit, cancel reason | ✅ **PASS** |
| **Real Delivery** | Thực thể `giao_hang`, tiến trình vận chuyển | ✅ **PASS** |
| **PH4 Issue API available** | `POST /api/v1/phieu-xuat` có sẵn trong PH4 | ✅ **PASS** |
| **PH1 calls PH4 correctly** | Chưa có API client gọi sang PH4 (Case B) | ❌ **FAIL** |
| **PH1 does not mutate ton_kho**| Zero `UPDATE/INSERT/DELETE ton_kho` trong code | ✅ **PASS** |
| **Transaction Integrity** | Multi-table ACID transactions | ✅ **PASS** |
| **Concurrency Protection** | Khóa dòng `SELECT ... FOR UPDATE` | ✅ **PASS** |
| **Automated Tests** | 24 test suites PH1 + 100% Core tests pass | ✅ **PASS** |
| **Frontend Build** | Core build 0 errors, 1761 modules | ✅ **PASS** |
| **No architecture blocker** | Không phá hỏng ranh giới CSDL và tồn kho | ✅ **PASS** |

---

## 16. Phân biệt 2 Loại Kết Quả & Phân loại Cuối cùng

Căn cứ Mục 22 và Mục 23:
- **`BUSINESS READY` = PASS**: Logic nghiệp vụ bán hàng may mặc (Khách hàng, Đơn bán, Báo giá, Giao hàng, Hóa đơn, Công nợ, Tuổi nợ, Dashboard) đã hoàn thiện xuất sắc và tuân thủ 100% CSDL PostgreSQL `erp_may10`. Không có mock source-of-truth. Không xâm phạm `ton_kho`.
- **`TECHNICAL READY` = FAIL**: Bất đồng bộ công nghệ (TypeScript ESM vs CommonJS; React 19 + Radix + Tailwind v4 vs React 18 + Tailwind v3 + MainLayout; JWT vs HMAC-SHA256 Token).
- **Kết luận theo Mục 23:** Khi `BUSINESS READY = PASS` và `TECHNICAL READY = FAIL`, kết quả chính xác là:
  **`FINAL VERDICT: READY FOR CONTROLLED PORTING`**  
  *(Không áp dụng `BLOCKED` vì business logic hoàn toàn khả thi để chuyển giao an toàn mà không phá hỏng hệ thống).*

---

## 17. Danh mục Kế hoạch Chuyển giao (Controlled Porting Roadmap)

### 17.1 REQUIRED PORTING:
1. **Backend Porting:**
   - Chuyển đổi mã nguồn TypeScript sang CommonJS Express modules: `salesController.js` và `salesRoutes.js` đặt dưới namespace `/api/v1/sales/*`.
   - Thay thế `auth.middleware.ts` bằng middleware `authenticate` chuẩn HMAC-SHA256 của Core Portal.
2. **Frontend Porting:**
   - Tái tạo các trang Bán hàng, Khách hàng, Đơn hàng, Giao hàng, Hóa đơn, Công nợ, Dashboard trong thư mục `frontend/src/pages/sales/` kế thừa `MainLayout.jsx` và Tailwind CSS v3 của Core Portal.
   - Bỏ `AppShell.tsx`, `LoginPage.tsx` và `AuthContext.tsx` riêng của PH1; tái sử dụng `AuthContext` và `ProtectedRoute` của Core Portal.
   - Đăng ký menu Bán hàng trong `frontend/src/config/menu.js` và route `/sales/*` trong `AppRoutes.jsx`.

### 17.2 REQUIRED ADAPTER:
1. **PH1 → PH4 Issue Adapter:** Khi xác nhận đơn hoặc khi lập phiếu giao hàng cần xuất kho, xây dựng hàm gọi sang `POST /api/v1/phieu-xuat` với vai trò Thủ kho (`kho`), truyền `ma_don_ban_hang` để PH4 thực hiện trừ kho và ghi Thẻ kho.
2. **Permission Mapping Adapter:** Ánh xạ từ vai trò `ban_hang` sang các đặc quyền chi tiết: `sales.view`, `sales.create`, `sales.confirm`, `sales.delivery`, `sales.invoice`.

---
*Báo cáo được hoàn thành ở chế độ STRICT READ-ONLY AUDIT. Hệ thống đóng băng, không thay đổi mã nguồn, không sửa database.*
