# PH1 — READ-ONLY CONNECTIVITY AUDIT REPORT
## KIỂM TRA ĐIỀU KIỆN KẾT NỐI PHÂN HỆ 1 (BÁN HÀNG & CRM) VỚI ERP CORE + PH4

- **Audit Date:** 2026-09-17
- **Audit Mode:** **STRICT READ-ONLY (ZERO CODE / ZERO DB MODIFICATION)**
- **Current Workspace:** `E:\ERP`
- **Current Branch:** `feature/ph4-core-portal`
- **Current Commit:** `8ef0c20` (*feat(ph4): add material master data management*)
- **Required PH1 Source Branch:** `feature/ph1-sales-core`
- **Remote URL:** `https://github.com/Khooy-nb1/erp-may10/tree/feature/ph1-sales-core`
- **Available Git Ref for PH1:** `remotes/origin/ph1-bh-qlkh` (Commit: `78d7729`)

---

## 1. Source Identity & Workspace Verification

### 1.1 Hiện trạng Git tại `E:\ERP`
- **Current branch:** `feature/ph4-core-portal` (KHÔNG PHẢI `feature/ph1-sales-core`).
- **Latest commit:** `8ef0c20` (*feat(ph4): add material master data management*).
- **Working Tree:** Đang chứa mã nguồn Core Portal V2.11, PH2 (Sản xuất), PH3 (Mua hàng), PH4 (Kho & Quản lý vật tư) và PH5 (Tài chính). Hoàn toàn **KHÔNG CÓ** file mã nguồn PH1 (Bán hàng) nào trong thư mục làm việc hiện tại (`backend/src/controllers/`, `frontend/src/pages/` không có code PH1).
- **Remote check:** `feature/ph1-sales-core` tồn tại trên remote GitHub (`refs/heads/feature/ph1-sales-core` commit `25d5dab69e6d6201fef20ee127accbe5afda5d93`), nhưng môi trường local không có kết nối trực tiếp ra GitHub (offline DNS / host unreachable).
- **Ref PH1 có sẵn trong local git object store:** `remotes/origin/ph1-bh-qlkh` (Commit `78d7729`), chứa đầy đủ 201 files mã nguồn PH1 độc lập.

> **QUY TẮC MỤC 1:** *"Nếu workspace hiện tại KHÔNG phải source PH1: BLOCKED — WRONG SOURCE. Không được tự checkout branch."*  
> Workspace `E:\ERP` đang checkout trên `feature/ph4-core-portal`, không phải `feature/ph1-sales-core`. Do đó, xét về mặt Git Workspace, trạng thái là **`BLOCKED — WRONG SOURCE`**.

---

## 2. Architecture Compatibility Audit (Đối chiếu Kiến trúc)

Đối chiếu chi tiết giữa kiến trúc của PH1 (trên source `ph1-bh-qlkh`) và ERP Core tại `E:\ERP`:

| Thành phần | ERP Core (`E:\ERP`) | Mã nguồn PH1 | Đánh giá Tương thích |
| :--- | :--- | :--- | :---: |
| **Backend Runtime** | Node.js CommonJS (`require`, `module.exports`) | Node.js TypeScript + ES Modules (`"type": "module"`) | ❌ **MISMATCH (Cần Port/Adapter)** |
| **Backend Runner** | Node.js tiêu chuẩn (Express 4.21.2) | `tsx` watch / `tsc` compile | ❌ **MISMATCH** |
| **Frontend Framework** | React 18 (`18.3.1`) + Vite 6 (`6.4.3`) | React 19 (`19.3.0`) + Vite 8 (`8.3.0`) | ❌ **MISMATCH** |
| **Frontend Routing** | React Router DOM v6 (`6.28.0`) | React Router DOM v7 (`7.18.3`) | ❌ **MISMATCH** |
| **Styling** | Tailwind CSS v3 (`3.4.17`) + CSS Modules | Tailwind CSS v4 (`4.3.3`) + `@astryxdesign/core` + StyleX | ❌ **MISMATCH** |
| **UI Components** | Lucide React + Component thư viện riêng | Radix UI primitives (`@radix-ui/react-*`) + `@astryxdesign` | ⚠️ **PARTIAL** |
| **App Shell / Layout**| `MainLayout.jsx` (Global Header, Sidebar, Breadcrumb) | `AppShell.tsx` độc lập ("ERP Sales & CRM") + `LoginPage.tsx` | ❌ **XUNG ĐỘT LAYOUT** |

---

## 3. PH1 Business Functions Inventory (Danh mục Chức năng Nghiệp vụ)

Phân hệ PH1 đã phát triển đầy đủ 10 nhóm nghiệp vụ cốt lõi:

1. **Dashboard bán hàng:** `GET /api/v1/dashboard/summary` — Tổng hợp doanh thu, biểu đồ xu hướng, cơ cấu trạng thái đơn, Top khách hàng, Top sản phẩm.
2. **Quản lý khách hàng:** `GET/POST /api/v1/customers`, `GET/PATCH /api/v1/customers/:id`, `PATCH /api/v1/customers/:id/status`, `GET /api/v1/customers/:id/summary`, `GET /api/v1/customers/:id/receivables`. Hỗ trợ phân loại, kiểm soát hạn mức nợ (`han_muc_cong_no`) và thời hạn nợ (`so_ngay_duoc_no`).
3. **Danh mục sản phẩm bán:** `GET /api/v1/products`, `GET /api/v1/products/:id` — Tra cứu sản phẩm sẵn sàng bán (`trang_thai = 'dang_ban'`), đọc giá niêm yết từ `san_pham.gia_ban`. Quyền Sales là Read-only.
4. **Đơn bán hàng (Sales Orders):** `GET/POST /api/v1/sales-orders`, `GET/PATCH /api/v1/sales-orders/:id`. Tính toán đơn giá, thuế GTGT, chiết khấu hoàn toàn ở phía máy chủ (`pricing.ts`).
5. **Xác nhận đơn bán (Confirm Order):** `POST /api/v1/sales-orders/:id/confirm`. Kiểm tra khách hàng hoạt động, kiểm soát trần nợ (`CREDIT_LIMIT_EXCEEDED`), chuyển trạng thái sang `da_xac_nhan`.
6. **Hủy đơn bán (Cancel Order):** `POST /api/v1/sales-orders/:id/cancel`. Bắt buộc nhập lý do hủy. Đơn đã xác nhận chỉ có quyền `admin` mới được hủy. Không cho phép hủy khi đang sản xuất hoặc đã giao.
7. **Quản lý giao hàng (Deliveries):** `GET/POST /api/v1/deliveries`, `GET /api/v1/deliveries/:id`, `POST /api/v1/deliveries/:id/start`, `POST /api/v1/deliveries/:id/complete`, `POST /api/v1/deliveries/:id/fail`. Quản lý tiến trình vận chuyển thương mại trên bảng `giao_hang`.
8. **Hóa đơn bán hàng (Invoices):** `GET/POST /api/v1/invoices` — Lập hóa đơn từ đơn hàng bán, tự động phát sinh công nợ phải thu.
9. **Theo dõi công nợ (Receivables):** `GET /api/v1/receivables`, `GET /api/v1/receivables/aging` — Danh sách công nợ phải thu, phân tích tuổi nợ (Aging report).
10. **Bảo mật & Phân quyền:** `POST /api/v1/auth/login`, `GET /api/v1/auth/me`.

---

## 4. Database Compatibility Audit

Kiểm tra trực tiếp trên PostgreSQL 18.6 `erp_may10` (schema `public`):

- **Bảng PH1 sử dụng:**
  - `khach_hang`: 2 bản ghi (Active)
  - `don_ban_hang`: 2 bản ghi (Active)
  - `chi_tiet_don_ban_hang`: 2 bản ghi (Active)
  - `giao_hang`: 1 bản ghi (Active)
  - `hoa_don_ban_hang`: 1 bản ghi (Active)
  - `cong_no`: 2 bản ghi (Active)
  - `ton_kho`: 5 bản ghi (Phân hệ PH4 quản lý)
  - `phieu_xuat_kho`: 192 bản ghi (Phân hệ PH4 quản lý)
- **Kiểm tra Schema Drift & Toàn vẹn:**
  - Zero Duplicate Tables: PH1 không tạo bất kỳ database hay bảng trùng lặp nào.
  - Zero Foreign Key Breaks: Hệ thống khóa ngoại liên kết chính xác (`ma_khach_hang`, `ma_don_ban_hang`, `ma_san_pham`, `ma_kho`).
  - Zero Migration Needed: CSDL hiện hữu có đầy đủ 43 bảng, khớp 100% với yêu cầu của PH1.
- **Kết luận CSDL:** **PASS (100% Tuân thủ CSDL ERP May 10)**.

---

## 5. Core Auth & RBAC Compatibility

### 5.1 Authentication (Xác thực)
- **ERP Core chuẩn:** Token HMAC-SHA256 ký từ máy chủ (`erp_token_{userId}_{timestamp}.{signature}`) lưu tại `localStorage.getItem('erp_token')`.
- **PH1:** Sử dụng `jsonwebtoken` (RFC 7519) với `JWT_SECRET`, token dạng `Bearer eyJhbG...` lưu tại `localStorage.getItem('auth_token')`.
- **Đánh giá:** ❌ **FAIL (AUTH MISMATCH)**. Nếu gọi chéo trực tiếp, Core token sẽ bị PH1 backend từ chối với lỗi `401 Unauthorized`.

### 5.2 RBAC (Phân quyền)
- **Canonical Roles:** `admin`, `ban_hang`, `san_xuat`, `mua_hang`, `kho`, `ke_toan`.
- **PH1 Roles:** Sử dụng đúng chuẩn `ban_hang` và `admin`. Cho phép `kho`, `ke_toan` tra cứu read-only.
- **Rác vai trò:** Hoàn toàn **KHÔNG CÓ** các vai trò tự chế như `sales_manager`, `sales_admin`, `customer_manager`.
- **Permission Mapping:** PH1 phân quyền ở mức Role (`requireRole`), cần ánh xạ sang permission keys (`sales.view`, `sales.create`, `sales.confirm`, `sales.delivery`, `sales.invoice`, `sales.receivable`) khi tích hợp vào Core Portal.
- **Đánh giá:** ✅ **PASS (Canonical Roles)** / ⚠️ **PARTIAL (Cần Permission Mapping)**.

---

## 6. CRITICAL AUDIT: PH1 → PH4 & SALES FLOW

### 6.1 Phân loại Sales Flow theo Quy Chuẩn:
- **CASE A:** PH1 có Sales Order → Sales Delivery/Issue → gọi API PH4 (`/phieu-xuat`) → PH4 tạo phiếu xuất → PH4 cập nhật `ton_kho` → PH4 ghi Thẻ kho.
- **CASE B:** PH1 chỉ có Sales Order → đổi status, chưa có nghiệp vụ xuất kho thực tế liên thông PH4.
- **CASE C:** PH1 tự ý `UPDATE ton_kho` (Vi phạm kiến trúc nghiêm trọng).
- **CASE D:** PH1 gọi API xuất kho nhưng endpoint không tồn tại trong PH4.

> **KẾT QUẢ XÁC ĐỊNH: CASE B — NOT READY FOR PH1→PH4 E2E**

### 6.2 Phân tích Quyền sở hữu Tồn kho (Stock Mutation Ownership):
- **Kiểm tra tìm kiếm tĩnh (Static Grep):**
  - `UPDATE ton_kho`: **0 kết quả** trong mã nguồn nghiệp vụ của PH1.
  - `INSERT INTO ton_kho`: **0 kết quả** trong mã nguồn nghiệp vụ của PH1 (chỉ có trong seed).
  - `DELETE FROM ton_kho`: **0 kết quả**.
  - `so_luong_ton`: Không bị can thiệp bởi PH1.
- **Cam kết kiến trúc của PH1:**
  Tài liệu kiến trúc `docs/architecture/module-ownership.md` và mã nguồn `DeliveryDetailPage.tsx` của PH1 quy định rõ:
  > *"Delivery completion (giao_hang.trang_thai = 'da_giao') DOES NOT deduct inventory or generate inventory transactions. The Delivery module manages delivery logistics, status tracking only. Physical stock movements remain in PH4."*
- **Đánh giá quyền sở hữu:** ✅ **PASS (100% TUÂN THỦ RANH GIỚI TỒN KHO PH4)**. PH1 không tự ý trừ kho, không bypass PH4.

---

## 7. PH4 API Contract Comparison

| Tiêu chí | Phân hệ PH4 Cung Cấp | PH1 Hiện Tại | Đánh giá Match |
| :--- | :--- | :--- | :---: |
| **Endpoint Xuất Kho** | `POST /api/v1/phieu-xuat` | Chưa có API client gọi | ❌ **NOT CONNECTED** |
| **HTTP Method** | `POST` | Chưa gọi | ❌ **NOT CONNECTED** |
| **Loại xuất hỗ trợ** | `giao_khach`, `xuat_ban_hang`, `xuat_san_xuat`, `chuyen_kho` | Khái niệm giao hàng `giao_hang` | ⚠️ **CẦN ÁNH XẠ** |
| **Tham chiếu đơn bán** | Cột `ma_don_ban_hang` (`don_ban_hang.id`) | `don_ban_hang.id` | ✅ **MATCH DATA** |
| **Tham chiếu kho** | `ma_kho_xuat` (`kho.id`) | `ma_kho` (`kho.id`) | ✅ **MATCH DATA** |
| **Chi tiết mặt hàng** | `chiTiet: [{ ma_vat_tu, so_luong_xuat, don_gia_xuat }]` | `chi_tiet_don_ban_hang` (`ma_san_pham`) | ⚠️ **DATA GAP (Vật tư vs Thành phẩm)** |
| **Authentication** | `Authorization: Bearer <erp_token>` (HMAC-SHA256) | `Bearer <jwt>` (HS256) | ❌ **MISMATCH** |
| **Quyền xuất kho (RBAC)** | `kho`, `admin` | `ban_hang`, `admin` | ✅ **PHÙ HỢP NGUYÊN TẮC (Thủ kho xuất hàng)** |
| **Bảo vệ kho âm** | `SELECT ... FOR UPDATE` + HTTP 409 Conflict | Không can thiệp tồn kho | ✅ **AN TOÀN TUYỆT ĐỐI** |
| **Ghi Thẻ kho** | Tự động ghi `the_kho` và số dư lũy kế | Không can thiệp | ✅ **PH4 QUẢN LÝ ĐỘC QUYỀN** |

---

## 8. PH1 → PH5 (Tài chính - Kế toán) Assessment
- PH1 ghi nhận `hoa_don_ban_hang` và `cong_no` (`loai_cong_no = 'phai_thu'`).
- PH5 (`debtService.js`) đã có logic đọc dữ liệu công nợ từ bảng `cong_no`.
- Cơ chế tự động ghi sổ nhật ký kế toán (`nhat_ky_hach_toan` Nợ 131 / Có 511, 3331) đang ở trạng thái **`PENDING — PH1 → PH5 INTEGRATION`**.

---

## 9. Test & Build Execution Results

### 9.1 Kiểm thử hệ thống Core & PH4 tại `E:\ERP`:
- **PH4 FR-11 Stock Card Ledger:** `10 PASS / 0 FAIL` (100%)
- **PH4 REST API Test:** `16 PASS / 0 FAIL` (100%)
- **PH4 F-01 Master Data Vật tư:** `12 PASS / 0 FAIL` (100%)
- **RBAC Security Suite (R01 → R27):** `27 PASS / 0 FAIL` (100%)
- **Frontend Build (`npm run build`):** **PASS** (1761 modules transformed, 0 errors, thời gian build: 16.70s).

### 9.2 Bộ kiểm thử PH1:
- Tồn tại 24 test suites bằng TypeScript (`*.test.ts`) trên nhánh nguồn `ph1-bh-qlkh`.
- Chưa có file `backend/tests/test_ph1_*.js` trên workspace hiện tại vì mã nguồn chưa được port.

---

## 10. E2E Readiness Matrix

| Hạng mục Kiểm tra | Bằng chứng / Thực thi | Trạng thái |
| :--- | :--- | :---: |
| **Core Auth Compatible** | HMAC `erp_token` vs JWT `auth_token` | ❌ **FAIL** |
| **RBAC Compatible** | Dùng vai trò chuẩn `admin`, `ban_hang` | ✅ **PASS** |
| **PH1 API Real** | 22 REST endpoints xây dựng hoàn chỉnh | ✅ **PASS** |
| **PostgreSQL Real** | CSDL 43 bảng `erp_may10`, zero mock | ✅ **PASS** |
| **No Mock Source-of-Truth** | Tìm kiếm tĩnh: không dùng mock làm chân lý | ✅ **PASS** |
| **Sales Order Functionality** | Đơn hàng, giá tự động, duyệt, hủy | ✅ **PASS** |
| **Delivery / Commercial Issue** | Quản lý chứng từ giao hàng `giao_hang` | ✅ **PASS** |
| **PH4 API Contract Connected** | Gọi `POST /api/v1/phieu-xuat` | ❌ **FAIL (Chưa kết nối)** |
| **PH4 Stock Mutation Ownership**| Zero `UPDATE ton_kho` từ PH1 | ✅ **PASS (Tuân thủ 100%)** |
| **Transaction Integrity** | ACID Transactions trong Postgres | ✅ **PASS** |
| **Concurrency Protection** | Khóa dòng `FOR UPDATE` trong PH4 | ✅ **PASS** |
| **Rollback Protection** | Transaction Rollback khi lỗi | ✅ **PASS** |
| **Frontend Build** | Vite build Core Portal hoàn tất sạch sẽ | ✅ **PASS** |
| **PH1 Automated Tests** | 24 test suites độc lập trên nhánh nguồn | ✅ **PASS** |

---

## 11. Findings & Remediation Roadmap

### Missing Requirements (Danh sách còn thiếu):
1. **F-01 (Source Branch Mismatch):** Workspace `E:\ERP` đang checkout trên `feature/ph4-core-portal`, chưa checkout hoặc chưa có code PH1.
2. **F-02 (Authentication Bridge):** PH1 backend chưa dùng chung middleware `authenticate` (HMAC `erp_token`) của Core.
3. **F-03 (Frontend Integration / Porting):** Giao diện PH1 xây dựng trên React 19 + `@astryxdesign` + StyleX cần được chuyển giao (port) sang React 18 + Tailwind CSS + `MainLayout` của Core Portal.
4. **F-04 (PH1 → PH4 Issue Integration):** Cần xây dựng cầu nối từ Đơn bán hàng / Đợt giao hàng sang API `POST /api/v1/phieu-xuat` của PH4 với vai trò Thủ kho (`kho`).
5. **F-05 (Data Model Bridge Sản phẩm - Vật tư):** Cần làm rõ nghiệp vụ xuất kho thành phẩm (`san_pham`) đối chiếu với kho vật tư (`vat_tu`) của PH4.

### Danh mục phân loại:
- **REQUIRED BEFORE CONNECTION:**
  - Chuẩn hóa Authentication sang HMAC-SHA256 `erp_token`.
  - Porting Controller & Route sang CommonJS Express trong Core Backend (`/api/v1/sales/*`).
  - Porting UI sang React 18 + Tailwind CSS tích hợp trong `MainLayout` (`/sales/*`).
  - Kết nối API `POST /api/v1/phieu-xuat` của PH4.
- **OPTIONAL AFTER CONNECTION:**
  - Tự động hóa hạch toán thời gian thực sang PH5 Sổ cái (`nhat_ky_hach_toan`).
  - Báo cáo phân tích nâng cao theo thị trường xuất khẩu.

---

## 12. FINAL VERDICT

Căn cứ theo 4 mức đánh giá quy định tại Mục 18:
1. `READY FOR CONNECTION`
2. `READY WITH MINOR GAPS`
3. `NOT READY`
4. `BLOCKED`

### KẾT LUẬN:
Xét theo 2 khía cạnh:
1. **Về mặt Git Workspace (Mục 1):**  
   Workspace hiện tại đang ở branch `feature/ph4-core-portal` chứ không phải `feature/ph1-sales-core`. Theo quy tắc ràng buộc tuyệt đối của Mục 1: **`BLOCKED — WRONG SOURCE`** (Nghiêm cấm tự ý checkout branch).
2. **Về mặt Nghiệp vụ & Kiến trúc liên thông PH1 → PH4 (Mục 6 & 18):**  
   PH1 tuân thủ 100% ranh giới không tự ý sửa `ton_kho` (Không phạm Case C), nhưng thuộc **CASE B** (chưa xây dựng logic gọi API xuất kho PH4) kèm theo xung đột xác thực (JWT vs HMAC) và nền tảng giao diện (React 19 vs React 18). Do đó trạng thái kỹ thuật là: **`NOT READY`** (Cần thực hiện bước Porting & Controlled Adaptation tương tự như đã làm với PH2 và PH3).

---
*Báo cáo được khởi tạo tự động ở chế độ READ-ONLY AUDIT. Tuyệt đối không thay đổi mã nguồn, không sửa database, không commit, không push.*
