# PH1 FINAL CONNECTION READINESS AUDIT
## HỆ THỐNG ERP MAY 10 — PHÂN HỆ BÁN HÀNG & QUẢN LÝ KHÁCH HÀNG (PH1)

- **Audit Date:** 2026-09-15
- **Audit Mode:** READ-ONLY / STRICT NON-MODIFYING (Không code, không merge, không port, không migration)
- **Current ERP Workspace:** `E:\ERP`
- **Current Core Branch:** `feature/ph4-core-portal` (Commit `bf5dca7`)
- **PH1 Source Repository:** `https://github.com/Khooy-nb1/erp-may10`
- **PH1 Audited Branch:** `origin/ph1-bh-qlkh`
- **Latest Commit Audited:** `78d7729` (*"feat: enhance order, product, and receivable pages with filter functionality and create dialogs"*)

---

## 1. Source Verification

Quá trình xác nhận nguồn đã thực hiện lệnh `git fetch origin ph1-bh-qlkh` để cập nhật trạng thái mới nhất từ remote:
- **Core Workspace:** `E:\ERP` đang checkout trên branch `feature/ph4-core-portal` với commit HEAD `bf5dca7`.
- **PH1 Source Branch:** Nhánh `origin/ph1-bh-qlkh` đã có commit mới:
  - Commit trước đó: `18ac419`
  - Commit mới nhất thực tế: `78d7729` (Đi trước thêm 4 commits: `ce3d0a2`, `8cbf7c7`, `6ac2dff`, `78d7729`).
- **Nội dung commit mới (`18ac419..78d7729`):**
  - Bổ sung UI components: Dialogs (`DeliveryCreateDialog.tsx`, `InvoiceCreateDialog.tsx`, `ReasonDialog.tsx`), KpiCards, Charts (`CategoryBarChart.tsx`, `TrendChart.tsx`).
  - Nâng cấp bộ lọc (FilterBar) và bảng dữ liệu cho các trang Orders, Products, Receivables, Dashboard.
  - Về backend: Thêm thuật toán `HS256` tường minh vào `jwt.verify` và `jwt.sign` (`auth.middleware.ts`, `auth.service.ts`).
  - **Kết luận xác nhận nguồn:** Audit được thực hiện đầy đủ trên commit mới nhất `78d7729`.

---

## 2. Architecture Compatibility

Đối chiếu chi tiết giữa kiến trúc của PH1 (commit `78d7729`) và ERP Core tại `E:\ERP`:

| Thành phần | ERP Core (`E:\ERP`) | PH1 Branch (`origin/ph1-bh-qlkh`) | Đánh giá Gate |
| :--- | :--- | :--- | :--- |
| **Backend Runtime** | Node.js CommonJS (`require`, `module.exports`) | Node.js TypeScript + ES Modules (`"type": "module"`) | **BLOCKED** |
| **Backend Runner** | Node.js chuẩn (Express 4.21.2) | `tsx` watch / `tsc` build | **BLOCKED** |
| **Frontend Framework** | React 18 (`18.3.1`) + Vite 6 | React 19 (`19.3.0`) + Vite 8 (`8.3.0`) | **BLOCKED** |
| **Frontend Routing** | React Router DOM v6 (`6.28.0`) | React Router DOM v7 (`7.18.3`) | **BLOCKED** |
| **Styling** | Tailwind CSS v3 (`3.4.17`) | Tailwind CSS v4 (`4.3.3`) + `@tailwindcss/vite` | **BLOCKED** |
| **UI Components** | Lucide React + CSS Modules | Radix UI primitives (`@radix-ui/react-*`) + Lucide | **PARTIAL** |
| **App Layout Shell** | `MainLayout.jsx` (Global Header, Sidebar, Breadcrumb) | `AppShell.tsx` riêng (Header title "ERP Sales & CRM") | **BLOCKED** |

> **KẾT LUẬN GATE 2**: **BLOCKED FOR DIRECT CONNECTION**  
> *"NOT READY FOR DIRECT MERGE — READY FOR CONTROLLED PORTING"*

---

## 3. Authentication

| Tiêu chí | ERP Core Hiện Tại | PH1 (`ph1-bh-qlkh`) | Tương thích Trực tiếp |
| :--- | :--- | :--- | :--- |
| **Cơ chế Token** | Custom HMAC-SHA256 server-signed | RFC 7519 JSON Web Token (`jsonwebtoken`) | **KHÔNG** |
| **Token String Format** | `erp_token_{userId}_{timestamp}.{signature}` | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` | **KHÔNG** |
| **Cấu hình Secret** | `AUTH_TOKEN_SECRET` | `JWT_SECRET` | **KHÔNG** |
| **Lưu trữ Client** | `localStorage.getItem('erp_token')` | `localStorage.getItem('auth_token')` | **KHÔNG** |
| **Luồng Login** | Đăng nhập tập trung Core Portal `/login` | `LoginPage.tsx` độc lập, form riêng | **KHÔNG** |
| **Context Quản lý** | `AuthContext.jsx` (Core Portal) | `AuthContext.tsx` riêng | **KHÔNG** |
| **Middleware Backend** | `backend/src/middlewares/auth.js` | `backend/src/middlewares/auth.middleware.ts` | **KHÔNG** |
| **Bảo mật Header** | Chặn hoàn toàn giả mạo `x-user-id`, `x-role` | Không dựa vào header giả mạo | Tương đồng an toàn |

> **KẾT LUẬN GATE 3**: **BLOCKED FOR DIRECT CONNECTION**  
> Nếu cắm trực tiếp, token đăng nhập từ Core Portal (`erp_token`) sẽ lập tức bị PH1 từ chối với lỗi `401 Unauthorized`.

---

## 4. RBAC (Role-Based Access Control)

- **Canonical Core Roles:** `admin`, `ban_hang`, `san_xuat`, `mua_hang`, `kho`, `ke_toan`.
- **Role tại PH1:** Sử dụng `ban_hang` và `admin`.
- **Vai trò rác:** Hoàn toàn **KHÔNG CÓ** các role tự chế như `sales`, `sale`, `sales_manager`, `sales_admin`, `customer_manager`.
- **Ủy quyền Backend (Backend Authorization):**
  - PH1 bảo vệ các endpoint chặt chẽ bằng `requireRole('admin', 'ban_hang')`, một số API tra cứu cho phép `'kho', 'ke_toan'`.
  - Core Portal yêu cầu kiểm soát theo permission keys (`ban_hang.view`, `ban_hang.create`, `ban_hang.confirm`, `ban_hang.delivery`, `ban_hang.invoice`, `ban_hang.receivable`).
  - **Khả năng chuyển đổi:** Cần ánh xạ permission khi porting route sang Core Portal.

> **KẾT LUẬN GATE 4**: **PASS (WITH MINOR PERMISSION MAPPING)**

---

## 5. Database Compatibility

- **Database Source of Truth:** `erp_may10` trên PostgreSQL 18.6 (schema `public`).
- **Database mới:** PH1 không tạo bất kỳ database riêng nào (`sales_db`, `ph1_db`... = 0).
- **Các bảng dữ liệu nghiệp vụ:**
  - `khach_hang`, `don_ban_hang`, `chi_tiet_don_ban_hang`, `giao_hang`, `hoa_don_ban_hang`, `cong_no`.
- **Các bảng danh mục dùng chung:**
  - `san_pham`, `vat_tu`, `don_vi_tinh`, `nguoi_dung`, `kho`.
- **Kiểm tra tính toàn vẹn (Integrity Audit):**
  - Duplicate tables: 0
  - Broken Foreign Keys: 0
  - Tồn kho âm: 0
  - Schema drift: 0
  - Số migration cần chạy: **0 migration** (Database schema đã khớp 100% với file `backend/database/schema.sql` 41 bảng).

> **KẾT LUẬN GATE 5**: **PASS**

---

## 6. API Compatibility

- **Prefix Canonical Core:** `/api/v1/...`
- **Prefix hiện tại của PH1:** Khai báo độc lập ở cấp root:
  - `/api/v1/customers`
  - `/api/v1/orders`
  - `/api/v1/deliveries`
  - `/api/v1/invoices`
  - `/api/v1/receivables`
  - `/api/v1/dashboard`
  - `/api/v1/auth` *(Trùng lặp với Core Auth - Cần loại bỏ)*
- **Response Format:** Chuẩn hóa theo JSON envelope `{ success: true, data: ..., message: ... }` tương thích hoàn toàn chuẩn Core Portal.
- **Yêu cầu khi tích hợp:** Mount toàn bộ logic dưới router namespace `/api/v1/sales/*`.

> **KẾT LUẬN GATE 6**: **PARTIAL (CẦN GOM NAMESPACE /api/v1/sales/* VÀ BỎ AUTH RIÊNG)**

---

## 7. PH1 → PH2 (Hợp Đồng Bán Hàng → Sản Xuất)

- **Quy trình nghiệp vụ:** `Đơn bán hàng (Xác nhận) → Kế hoạch sản xuất`.
- **Kiểm tra can thiệp trực tiếp Database:**
  - PH1 **KHÔNG** can thiệp trực tiếp (`INSERT/UPDATE/DELETE`) vào bảng `ke_hoach_san_xuat`.
- **Kết nối API chính thức:** PH1 hiện chưa gọi API `POST /api/v1/production/plans` của PH2 mà chỉ quản lý trạng thái nội bộ của đơn hàng bán (`don_ban_hang`).

> **KẾT LUẬN GATE 7**: **PENDING INTEGRATION** (An toàn dữ liệu, chờ cắm API call).

---

## 8. PH1 → PH4 (Hợp Đồng Giao Hàng → Xuất Kho)

- **Quy trình nghiệp vụ:** `Giao hàng → Phiếu xuất kho bán hàng → Trừ tồn kho`.
- **Kiểm tra can thiệp trực tiếp Database:**
  - PH1 **KHÔNG** tự ý `UPDATE`, `INSERT`, `DELETE` bảng `ton_kho`.
  - PH1 **KHÔNG** tự ý can thiệp bảng `phieu_xuat_kho` hay `chi_tiet_phieu_xuat`.
  - Nghiệp vụ PH1 ghi nhận giao nhận thuần túy ở cấp chứng từ thương mại `giao_hang`.
- **Kết nối API chính thức:** Chưa gọi API PH4: `POST /api/v1/phieu-xuat` với `loai_xuat = 'xuat_ban_hang'`.

> **KẾT LUẬN GATE 8**: **PENDING INTEGRATION** (An toàn dữ liệu, chờ cắm API call).

---

## 9. PH1 → PH5 (Hợp Đồng Hóa Đơn/Công Nợ → Sổ Kế Toán)

- **Quy trình nghiệp vụ:** `Hóa đơn bán hàng → Công nợ phải thu → Hạch toán kế toán`.
- **Kiểm tra can thiệp trực tiếp Database:**
  - PH1 quản lý `hoa_don_ban_hang` và `cong_no` (đúng trách nhiệm phân hệ bán hàng).
  - PH1 **KHÔNG** tự ý `INSERT` vào bảng `nhat_ky_hach_toan` (tôn trọng quyền sở hữu của Kế toán).
  - PH5 hiện tại đã có `debtService.js` tự động đọc tổng hợp công nợ từ bảng `cong_no`.
- **Kết nối API chính thức:** Chưa có trigger tự động sinh bút toán hạch toán thời gian thực sang PH5.

> **KẾT LUẬN GATE 9**: **PENDING INTEGRATION** (Cơ sở dữ liệu đồng nhất, chờ hoàn thiện trigger).

---

## 10. Data Ownership (Ranh Giới Quyền Sở Hữu Dữ Liệu)

| Dữ Liệu / Bảng | Phân Hệ Sở Hữu (Owner) | Phân Hệ Khác Thao Tác | Đánh Giá Tuân Thủ Của PH1 |
| :--- | :---: | :---: | :---: |
| **Khách hàng** (`khach_hang`) | **PH1** | Read-only | **TUÂN THỦ** |
| **Đơn bán hàng** (`don_ban_hang`) | **PH1** | Read-only (PH2, PH4, PH5) | **TUÂN THỦ** |
| **Chi tiết đơn bán** (`chi_tiet_don_ban_hang`) | **PH1** | Read-only | **TUÂN THỦ** |
| **Giao hàng** (`giao_hang`) | **PH1 / Contract** | Read-only | **TUÂN THỦ** |
| **Hóa đơn bán hàng** (`hoa_don_ban_hang`) | **PH1** | Read-only (PH5) | **TUÂN THỦ** |
| **Công nợ** (`cong_no`) | **Contract PH1/PH5** | PH1 tạo, PH5 theo dõi hạch toán | **TUÂN THỦ** |
| **Kế hoạch sản xuất** (`ke_hoach_san_xuat`) | **PH2** | PH1 KHÔNG ĐƯỢC GHI | **TUÂN THỦ TUYỆT ĐỐI** |
| **Lệnh sản xuất** (`lenh_san_xuat`) | **PH2** | PH1 KHÔNG ĐƯỢC GHI | **TUÂN THỦ TUYỆT ĐỐI** |
| **Tồn kho** (`ton_kho`) | **PH4** | PH1 KHÔNG ĐƯỢC GHI | **TUÂN THỦ TUYỆT ĐỐI** |
| **Phiếu xuất kho** (`phieu_xuat_kho`) | **PH4** | PH1 KHÔNG ĐƯỢC GHI | **TUÂN THỦ TUYỆT ĐỐI** |
| **Hạch toán** (`nhat_ky_hach_toan`) | **PH5** | PH1 KHÔNG ĐƯỢC GHI | **TUÂN THỦ TUYỆT ĐỐI** |
| **Giá thành** (`gia_thanh_san_pham`) | **PH5** | PH1 KHÔNG ĐƯỢC GHI | **TUÂN THỦ TUYỆT ĐỐI** |

> **KẾT LUẬN GATE 10**: **PASS (100% TUÂN THỦ DATA OWNERSHIP)**

---

## 11. Frontend Compatibility

- **Tuyến đường quy hoạch:** Mount toàn bộ giao diện bán hàng vào `/sales/*`.
- **Thành phần xung đột hiện tại của PH1:**
  - Tự dựng `AppShell.tsx`, `LoginPage.tsx`, `AuthContext.tsx`.
  - Bộ định tuyến root-level (`/dashboard`, `/customers`, `/sales-orders`,...).
- **Yêu cầu kết nối Core Portal:**
  - Bỏ `AppShell` và `LoginPage` độc lập.
  - Tái sử dụng `MainLayout`, `Header`, `Sidebar`, `Breadcrumb`, `ModuleHeader`, `ProtectedRoute`, `PermissionGuard` của Core Portal.
  - Chuyển đổi mã nguồn React 19 sang React 18 / React Router v6.

> **KẾT LUẬN GATE 11**: **BLOCKED FOR DIRECT CONNECTION — PORTING REQUIRED**

---

## 12. Core Protection

- Đối chiếu git diff giữa `origin/main` và `origin/ph1-bh-qlkh`:
  - Nhánh PH1 hoạt động hoàn toàn trong cây thư mục riêng, **KHÔNG SỬA ĐỔI BẤT KỲ FILE NÀO** của:
    - Core Portal V2.11 (`MainLayout.jsx`, `Header.jsx`, `Sidebar.jsx`, `roleMapping.js`, `auth.js`)
    - PH2 Sản xuất (`productionController.js`, `productionRoutes.js`, `ProductionModule.jsx`)
    - PH3 Mua hàng (`purchasingController.js`, `purchasingRoutes.js`, `PurchasingModule.jsx`)
    - PH4 Quản lý kho (`inventoryController.js`, `TonKhoPage.jsx`, `LoVatTuPage.jsx`)
    - PH5 Tài chính - Kế toán (`costController.js`, `financeRoutes.js`, `FinanceRoutes.jsx`)
    - Database schema chuẩn (`backend/database/schema.sql`)
  - **Mức độ an toàn:** **PASS** (Các phân hệ đóng băng được bảo vệ nguyên vẹn 100%).

> **KẾT LUẬN GATE 12**: **PASS**

---

## 13. Business Logic

Logic nghiệp vụ bán hàng may mặc trên commit `78d7729` đạt mức độ hoàn thiện cao:
- **Khách hàng**: Phân loại đối tác, kiểm tra hạn mức công nợ (`credit_limit`).
- **Đơn bán hàng**: Báo giá, quản lý chiết khấu, thuế GTGT, phê duyệt đơn, hủy đơn có lý do (`ReasonDialog`).
- **Giao hàng**: Lập phiếu giao hàng (`DeliveryCreateDialog`), theo dõi vận chuyển.
- **Hóa đơn & Công nợ**: Sinh hóa đơn (`InvoiceCreateDialog`), đối soát tuổi nợ và hạn thanh toán.
- **Báo cáo & Dashboard**: Trực quan hóa doanh số, xu hướng (`TrendChart.tsx`, `CategoryBarChart.tsx`, `KpiCard.tsx`).

> **KẾT LUẬN GATE 13**: **PASS**

---

## 14. Security

- **Đánh giá bảo mật:**
  - PH1 đã có middleware kiểm tra authentication và authorization theo vai trò (`ban_hang`, `admin`).
  - Đã cập nhật thuật toán ký xác thực chặt chẽ (`HS256`).
- **Xung đột khi cắm vào Core:**
  - Token mismatch: PH1 không chấp nhận token HMAC-SHA256 `erp_token` của Core Portal.
  - Cần bọc chung middleware `authenticate` của Core Portal khi porting sang `E:\ERP`.

> **KẾT LUẬN GATE 14**: **PARTIAL (CẦN TÍCH HỢP VÀO CORE AUTH SECURITY)**

---

## 15. Runtime (Real Runtime Status)

- **Trạng thái kết nối thực tế:**
  - Đăng nhập Core Portal (`/login`) sinh `erp_token`.
  - Route `/sales/*` chưa được đăng ký trong `frontend/src/routes/AppRoutes.jsx`.
  - Endpoint `/api/v1/sales/*` chưa được mount trong `backend/src/app.js`.
  - **Kết quả:** **NOT CONNECTED YET** (Chưa kết nối runtime vào hệ thống).

> **KẾT LUẬN GATE 15**: **PENDING (CHƯA KẾT NỐI)**

---

## 16. Regression Tests

Toàn bộ các bộ kiểm thử tự động của hệ thống `E:\ERP` đã được thực thi và xác nhận:

| Bộ Kiểm Thử (Test Suite) | Số Lượng Test | Kết Quả | Trạng Thái |
| :--- | :---: | :---: | :---: |
| **PH2 Production Tests** (`test_ph2_production.js`) | 38 tests | **38 PASS / 0 FAIL** | **PASS** |
| **PH2 Concurrency Tests** (`test_ph2_concurrency.js`) | 7 tests | **7 PASS / 0 FAIL** | **PASS** |
| **PH3 Purchasing Tests** (`test_ph3_purchasing.js`) | 58 tests | **58 PASS / 0 FAIL** | **PASS** |
| **PH3 Concurrency Tests** (`test_ph3_concurrency.js`) | 9 tests | **9 PASS / 0 FAIL** | **PASS** |
| **PH4 Warehouse API Tests** (`test_ph4_api.js`) | 16 tests | **16 PASS / 0 FAIL** | **PASS** |
| **PH4 Concurrency Tests** (`test_concurrency.js`) | 2 tests | **2 PASS / 0 FAIL** | **PASS** |
| **PH5 Finance Tests** (`test_ph5_finance.js`) | 24 tests | **24 PASS / 0 FAIL** | **PASS** |
| **RBAC Security Suite** (`test_rbac_security.js`) | 27 tests | **27 PASS / 0 FAIL** | **PASS** |
| **Database Integrity Audit** | 10 bảng PH1 | **0 LỖI / 0 DỮ LIỆU MỒ CÔI** | **PASS** |
| **Frontend Production Build** (`npm run build`) | 1,760 modules | **BUILD THÀNH CÔNG (17.7s)** | **PASS** |

> **KẾT LUẬN GATE 16**: **PASS (100% PASS TOÀN BỘ CÁC BỘ KIỂM THỬ)**

---

## 17. Blocking Findings (Các Rào Cản Ngăn Chặn Kết Nối Trực Tiếp)

1. **Xung đột Package Frontend**: React 19 (`^19.3.0`), React Router v7 (`^7.18.3`), Tailwind v4 (`^4.3.3`) trên PH1 xung đột trực tiếp với React 18, React Router v6, Tailwind v3 của Core Portal. Nếu merge sẽ làm gãy toàn bộ build của Core và các phân hệ PH2, PH3, PH4, PH5.
2. **Xung đột Module System Backend**: TypeScript ES Modules với `tsx` trên PH1 không thể import trực tiếp vào backend Node.js CommonJS hiện tại của `E:\ERP`.
3. **Xung đột Token Xác Thực**: PH1 dùng RFC JWT (`jsonwebtoken`) với `auth_token`, không nhận diện được token nội bộ HMAC-SHA256 (`erp_token`) của Core Portal.
4. **Cô lập Giao diện (Isolated AppShell)**: PH1 chạy trên `AppShell.tsx` và `LoginPage.tsx` độc lập, chưa mount vào `MainLayout` của Core Portal.

---

## 18. Required Actions (Kế Hoạch Cho Bước Tiếp Theo)

Để kết nối PH1 thành công vào hệ thống ERP May 10 mà **không làm ảnh hưởng đến Core Portal và các phân hệ FROZEN**:
1. **Thực hiện Controlled Porting (Không Git Merge mù)**.
2. **Backend**: Chuyển đổi các Service & Controller sang Node.js CommonJS, gắn auth middleware `authenticate` của Core Portal, mount tại `backend/src/routes/salesRoutes.js` (`/api/v1/sales/*`).
3. **Frontend**: Chuyển các Pages sang React 18 / Tailwind v3, gắn vào `MainLayout` tại `/sales/*`, sử dụng `apiClient` từ `api.js`.
4. **Hợp đồng liên phân hệ**: Kích hoạt gọi API `POST /api/v1/production/plans` (PH2) và `POST /api/v1/phieu-xuat` (PH4) khi có sự kiện nghiệp vụ tương ứng.

---

## 19. FINAL DECISION

### Bảng Tổng Hợp Đánh Giá 16 Cổng

| Gate | Tiêu Chí Kiểm Tra | Kết Quả | Ghi Chú |
| :---: | :--- | :---: | :--- |
| **1** | Source Verification | **PASS** | Xác nhận commit mới nhất `78d7729` trên `origin/ph1-bh-qlkh` |
| **2** | Architecture | **BLOCKED** | Khác biệt TS/ESM vs CJS, React 19 vs 18, Tailwind v4 vs v3 |
| **3** | Authentication | **BLOCKED** | JWT (`auth_token`) vs HMAC-SHA256 (`erp_token`) |
| **4** | RBAC | **PASS** | Đúng chuẩn canonical role `ban_hang` và `admin` |
| **5** | Database | **PASS** | 100% chuẩn hóa 41 bảng, 0 migration, 0 lỗi schema |
| **6** | API | **PARTIAL** | Format chuẩn; cần chuyển namespace về `/api/v1/sales/*` |
| **7** | PH1 → PH2 | **PENDING** | Nghiệp vụ an toàn; chưa cắm gọi `POST /api/v1/production/plans` |
| **8** | PH1 → PH4 | **PENDING** | Không sửa `ton_kho`; chưa cắm gọi `POST /api/v1/phieu-xuat` |
| **9** | PH1 → PH5 | **PENDING** | Bảng công nợ khớp; chưa cắm trigger hạch toán thời gian thực |
| **10**| Data Ownership | **PASS** | 100% tuân thủ, không vi phạm quyền sở hữu bảng của phân hệ khác |
| **11**| Frontend | **BLOCKED** | AppShell độc lập; cần mount vào MainLayout của Core |
| **12**| Core Protection | **PASS** | Core Portal, PH2, PH3, PH4, PH5 nguyên vẹn 100% |
| **13**| Business Logic | **PASS** | Nghiệp vụ bán hàng may mặc, chiết khấu, công nợ rất hoàn thiện |
| **14**| Security | **PARTIAL** | Cần chuyển sang dùng middleware auth tập trung của Core |
| **15**| Runtime | **PENDING** | Chưa kết nối runtime vào hệ thống Core hiện tại |
| **16**| Regression | **PASS** | 100% test suites của các phân hệ FROZEN vượt qua |

---

# FINAL DECISION:

### **B — READY FOR CONTROLLED PORTING**
*(NOT READY FOR DIRECT CONNECTION — CONTROLLED PORTING REQUIRED)*

> **KẾT LUẬN:**  
> PH1 **CHƯA ĐỦ ĐIỀU KIỆN KẾT NỐI TRỰC TIẾP (DIRECT CONNECTION)** do các bất tương thích về kiến trúc runtime (TypeScript ESM vs CJS), frontend version (React 19 vs 18) và cơ chế xác thực token (JWT vs HMAC).  
> Tuy nhiên, PH1 **HOÀN TOÀN ĐỦ ĐIỀU KIỆN ĐỂ TIẾN HÀNH CONTROLLED PORTING** (tương tự như quy trình đã thực hiện thành công cho PH2, PH3 và PH5) nhờ cơ sở dữ liệu PostgreSQL 18.6 hoàn toàn đồng nhất và nghiệp vụ bán hàng may mặc chuẩn mực.
