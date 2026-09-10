# HỢP ĐỒNG PHÁT TRIỂN PHÂN HỆ ERP MAY 10
## ERP MODULE DEVELOPMENT CONTRACT — CORE FOUNDATION FROZEN
**TỔNG CÔNG TY MAY 10 - CTCP**  
**Mã tài liệu:** `ERP-M10-DEV-CONTRACT-2026`  
**Phiên bản:** `1.1 — VIETNAMESE RBAC STANDARDIZED RELEASE`  
**Ngày ban hành:** 10 Tháng 09 Năm 2026  
**Cơ quan ban hành:** Ban Kiến trúc Hệ thống & An ninh Thông tin May 10 ERP  
**Đối tượng áp dụng:** Đội ngũ phát triển các phân hệ **PH1 (Bán hàng)**, **PH2 (Sản xuất)**, **PH3 (Mua hàng)**, **PH5 (Tài chính - Kế toán)**  
**Trạng thái nền tảng:** `CORE FOUNDATION & PH4 FROZEN — STRICT INTEGRATION GATE`

---

## MỤC LỤC

1. [MỤC TIÊU TÀI LIỆU (PURPOSE)](#1-mục-tiêu-tài-liệu-purpose)
2. [TỔNG QUAN KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)](#2-tổng-quan-kiến-trúc-hệ-thống-system-architecture)
3. [QUY ƯỚC CÔNG NGHỆ BẮT BUỘC (TECHNOLOGY CONTRACT)](#3-quy-ước-công-nghệ-bắt-buộc-technology-contract)
4. [QUY ƯỚC GIAO DIỆN CHUẨN DOANH NGHIỆP (GLOBAL UI CONTRACT)](#4-quy-ước-giao-diện-chuẩn-doanh-nghiệp-global-ui-contract)
5. [QUY ƯỚC XÁC THỰC DANH TÍNH (AUTHENTICATION CONTRACT)](#5-quy-ước-xác-thực-danh-tính-authentication-contract)
6. [QUY ƯỚC PHÂN QUYỀN VAI TRÒ CHUẨN TIẾNG VIỆT (CANONICAL RBAC CONTRACT)](#6-quy-ước-phân-quyền-vai-trò-chuẩn-tiếng-việt-canonical-rbac-contract)
7. [QUY ƯỚC MÃ ĐẶC QUYỀN PHÂN HỆ (PERMISSION CONTRACT)](#7-quy-ước-mã-đặc-quyền-phân-hệ-permission-contract)
8. [QUY ƯỚC CƠ SỞ DỮ LIỆU & ĐẶT TÊN TIẾNG VIỆT (DATABASE NAMING CONTRACT)](#8-quy-ước-cơ-sở-dữ-liệu--đặt-tên-tiếng-việt-database-naming-contract)
9. [QUY ƯỚC THIẾT KẾ RESTFUL API (API CONTRACT)](#9-quy-ước-thiết-kế-restful-api-api-contract)
10. [QUY ƯỚC NGHIỆP VỤ PHÍA MÁY CHỦ (BUSINESS LOGIC CONTRACT)](#10-quy-ước-nghiệp-vụ-phía-máy-chủ-business-logic-contract)
11. [QUY ƯỚC GIAO DỊCH DỮ LIỆU ACID (TRANSACTION CONTRACT)](#11-quy-ước-giao-dịch-dữ-liệu-acid-transaction-contract)
12. [QUY ƯỚC CHỐNG TRANH CHẤP ĐỒNG THỜI (CONCURRENCY CONTRACT)](#12-quy-ước-chống-tranh-chấp-đồng-thời-concurrency-contract)
13. [RANH GIỚI TRÁCH NHIỆM & QUYỀN SỞ HỮU MODULE (MODULE OWNERSHIP BOUNDARY)](#13-ranh-giới-trách-nhiệm--quyền-sở-hữu-module-module-ownership-boundary)
14. [QUY CHUẨN TÍCH HỢP LIÊN PHÂN HỆ (CROSS-MODULE INTEGRATION)](#14-quy-chuẩn-tích-hợp-liên-phân-hệ-cross-module-integration)
15. [QUY TẮC ĐÓNG BĂNG BẢO VỆ PHÂN HỆ PH4 (PH4 FREEZE & COMPATIBILITY RULE)](#15-quy-tắc-đóng-băng-bảo-vệ-phân-hệ-ph4-ph4-freeze--compatibility-rule)
16. [QUY TẮC ĐÓNG BĂNG VỎ LÕI PORTAL (CORE PORTAL FREEZE RULE)](#16-quy-tắc-đóng-băng-vỏ-lõi-portal-core-portal-freeze-rule)
17. [KỶ LUẬT PHÁT TRIỂN DÀNH CHO CÁC NHÓM PHÂN HỆ (MODULE TEAM RULES)](#17-kỷ-luật-phát-triển-dành-cho-các-nhóm-phân-hệ-module-team-rules)
18. [ĐỊNH HƯỚNG CENTRAL IAM / RBAC PHASE 2 (FUTURE SCOPE BOUNDARY)](#18-định-hướng-central-iam--rbac-phase-2-future-scope-boundary)
19. [QUY ƯỚC KIỂM THỬ BẮT BUỘC (TESTING CONTRACT)](#19-quy-ước-kiểm-thử-bắt-buộc-testing-contract)
20. [QUY CHUẨN GÓI BÀN GIAO (REQUIRED HANDOVER PACKAGE)](#20-quy-chuẩn-gói-bàn-giao-required-handover-package)
21. [CỔNG KIỂM DUYỆT NGHIỆM THU (HANDOVER ACCEPTANCE GATE)](#21-cổng-kiểm-duyệt-nghiệm-thu-handover-acceptance-gate)
22. [DANH MỤC KIỂM TRA BẢO MẬT (SECURITY ACCEPTANCE CHECKLIST)](#22-danh-mục-kiểm-tra-bảo-mật-security-acceptance-checklist)
23. [DANH MỤC KIỂM TRA GIAO DIỆN (UI ACCEPTANCE CHECKLIST)](#23-danh-mục-kiểm-tra-giao-diện-ui-acceptance-checklist)
24. [QUY TRÌNH PHÁT TRIỂN 13 BƯỚC (DEVELOPMENT WORKFLOW)](#24-quy-trình-phát-triển-13-bước-development-workflow)
25. [TRÁCH NHIỆM CỦA INTEGRATION OWNER & HIỆN TRẠNG DỰ ÁN](#25-trách-nhiệm-của-integration-owner--hiện-trạng-dự-án)
26. [TỔNG HỢP CÁC ĐIỂM CHƯA THỐNG NHẤT TRONG TÀI LIỆU CŨ (DOCUMENTATION INCONSISTENCIES)](#26-tổng-hợp-các-điểm-chưa-thống-nhất-trong-tài-liệu-cũ-documentation-inconsistencies)

---

## 1. MỤC TIÊU TÀI LIỆU (PURPOSE)

Hệ thống ERP Tổng Công ty May 10 đã hoàn tất và nghiệm thu toàn bộ khối nền tảng cốt lõi (**Core Foundation**), bao gồm:
1. Màn hình Xác thực & Đăng nhập trung tâm (`/login`).
2. Cổng Điều hành Doanh nghiệp lõi (Core ERP Portal `/`).
3. Thanh điều hướng toàn cục cấp Enterprise (`Header.jsx`).
4. Khung điều hướng phân hệ thông minh (`Sidebar.jsx`).
5. Bố cục tổng thể doanh nghiệp (`MainLayout.jsx` & `Breadcrumb.jsx`).
6. Hệ thống Nhận diện & Thiết kế Doanh nghiệp thống nhất (**Global UI Design System V2.11**).
7. Hệ thống Kiểm soát Truy cập Dựa trên Vai trò (**RBAC Phase 1 Remediation**).
8. Phân hệ lõi **PH4 — Kho & Quản lý vật tư** (`/warehouse/*`).

> [!IMPORTANT]
> Toàn bộ 8 thành phần trên đã được kiểm thử hồi quy 100% và đang ở trạng thái **FROZEN (ĐÓNG BĂNG BẤT BIẾN)**.  
> Tài liệu này thiết lập **Hợp đồng Kỹ thuật Bắt buộc (Mandatory Technical Contract)** giữa Ban Kiến trúc Hệ thống (Integration Owner) và các nhóm phát triển phân hệ **PH1 (Bán hàng)**, **PH2 (Sản xuất)**, **PH3 (Mua hàng)**, **PH5 (Tài chính - Kế toán)**.
> 
> **NGUYÊN TẮC CỐT LÕI VỀ RBAC & CƠ SỞ DỮ LIỆU:**  
> Cơ sở dữ liệu và mã nguồn hiện tại của dự án sử dụng **chuẩn định danh Tiếng Việt** (`erp_may10`, schema `public`). Toàn bộ 6 vai trò người dùng trong CSDL được định danh bằng tiếng Việt (`admin`, `ban_hang`, `san_xuat`, `mua_hang`, `kho`, `ke_toan`). Tuyệt đối **KHÔNG** được chuyển đổi CSDL hoặc mã vai trò sang tiếng Anh. Bất kỳ sự sai lệch nào so với chuẩn định danh này sẽ bị từ chối tích hợp ngay tại Cổng Nghiệm thu.

---

## 2. TỔNG QUAN KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

Hệ thống ERP May 10 tuân theo mô hình phân tầng chặt chẽ. Mọi phân hệ mới phải được gắn kết như một thành phần bản địa (*native module*) bên trong cấu trúc đã định hình sẵn:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                TRÌNH DUYỆT NGƯỜI DÙNG                                  │
│                (Giao diện May 10 Corporate Design System V2.11 — 2 Tầng Nav)           │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTP / HTTPS
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          TẦNG FRONTEND (Vite + React 18 SPA)                           │
│                                                                                        │
│  ├── Core Shell: Header (Sticky Top) | Sidebar (Left w-64) | MainLayout | Breadcrumb   │
│  ├── Global RBAC: AuthContext | ProtectedRoute | PermissionGuard | RoleGuard           │
│  ├── Module Routing Layer (/routes/AppRoutes.jsx):                                     │
│  │   ├── /                 -> Core ERP Homepage (FROZEN)                               │
│  │   ├── /warehouse/*      -> PH4: Kho & Vật tư (8 Sub-screens) (FROZEN)               │
│  │   ├── /sales/*          -> PH1: Bán hàng & Khách hàng (ĐANG MỞ PHÁT TRIỂN)          │
│  │   ├── /production/*     -> PH2: Quản lý Sản xuất & BOM (ĐANG MỞ PHÁT TRIỂN)        │
│  │   ├── /purchasing/*     -> PH3: Mua hàng & Nhà cung cấp (ĐANG MỞ PHÁT TRIỂN)        │
│  │   ├── /accounting/*     -> PH5: Tài chính & Kế toán (ĐANG MỞ PHÁT TRIỂN)            │
│  │   └── /admin/*          -> SYS: Quản trị Hệ thống & Người dùng (FROZEN)             │
│  └── Services Abstraction: REST API Client (Axios Instance kèm Bearer Token)           │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ REST API JSON (/api/v1/*)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         TẦNG BACKEND (Node.js + Express REST API)                      │
│                                                                                        │
│  ├── Global Security Middlewares:                                                      │
│  │   ├── requireAuth (Giải mã HMAC-SHA256 Bearer Token, kiểm tra trạng thái DB)        │
│  │   ├── requireRoles & requirePermission (Kiểm tra ma trận quyền tiếng Việt, chặn 403)│
│  │   └── RateLimiting, CORS whitelist, Security Headers (Helmet, no X-Powered-By)     │
│  └── Module Route Handlers:                                                            │
│      ├── /api/v1/auth/*, /api/v1/dashboard/*, /api/v1/master-data/* (FROZEN)           │
│      ├── /api/v1/ton-kho/*, /api/v1/phieu-nhap/*, /api/v1/vi-tri-kho/* (PH4 - FROZEN)  │
│      ├── /api/v1/sales/*           (PH1 Endpoints)                                     │
│      ├── /api/v1/production/*      (PH2 Endpoints)                                     │
│      ├── /api/v1/purchasing/*      (PH3 Endpoints)                                     │
│      └── /api/v1/accounting/*      (PH5 Endpoints)                                     │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ PostgreSQL Connection Pool (Max: 25)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        TẦNG CƠ SỞ DỮ LIỆU (PostgreSQL 18.6)                           │
│                 Database duy nhất: erp_may10  |  Schema duy nhất: public               │
│                   Quy ước đặt tên thực thể: 100% TIẾNG VIỆT (snake_case)               │
│                                                                                        │
│  ├── Bảng danh mục dùng chung: nguoi_dung (6 roles), don_vi_tinh, nha_cung_cap...      │
│  ├── Bảng PH4 lõi: kho, vat_tu, vi_tri_kho, lo_vat_tu, ton_kho, phieu_nhap_kho...      │
│  └── Bảng phân hệ mở rộng: don_ban_hang (PH1), lenh_san_xuat (PH2),                    │
│      don_mua_hang (PH3), but_toan_tong_hop (PH5)                                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. QUY ƯỚC CÔNG NGHỆ BẮT BUỘC (TECHNOLOGY CONTRACT)

Tất cả các nhóm phát triển phân hệ bắt buộc phải triển khai trên nền tảng công nghệ đã chuẩn hóa của dự án:

### 3.1. Frontend Stack
- **Framework:** React 18.3+ (Functional Components, React Hooks).
- **Công cụ Build & Bundler:** Vite 6.x.
- **Styling Engine:** Tailwind CSS v3.4.17 (Tuyệt đối không dùng class dự thảo v4 không được hỗ trợ).
- **Routing:** React Router v6 / v7 (`react-router-dom`).
- **Iconography:** `lucide-react` (Bộ icon đồng bộ toàn hệ thống).
- **API Client:** Axios instance được cấu hình tại `frontend/src/services/api.js`.

### 3.2. Backend Stack
- **Runtime Environment:** Node.js LTS (>= v20.x).
- **Web Framework:** Express.js 4.x.
- **Kiến trúc giao tiếp:** RESTful API, định dạng trao đổi dữ liệu 100% JSON, bảng mã UTF-8.
- **Xử lý bất đồng bộ:** `async/await` chuẩn, bắt lỗi tập trung qua Express Error Middleware.

### 3.3. Database Stack
- **Hệ quản trị CSDL:** PostgreSQL 18.6.
- **Driver kết nối:** `pg` (node-postgres) sử dụng Connection Pooling chung (`backend/src/config/database.js`).
- **Tên Database duy nhất:** `erp_may10`.
- **Schema duy nhất:** `public`.
- **Quy ước ngôn ngữ:** 100% Tiếng Việt (snake_case).

> [!CAUTION]
> **CÁC HÀNH VI BỊ NGHIÊM CẤM TUYỆT ĐỐI:**
> - Tự ý đổi Frontend sang Next.js, Vue, Angular hoặc nhúng thư viện UI ngoài (Ant Design, MUI, Bootstrap).
> - Tự ý đổi Backend sang Python/Django, Java/Spring, .NET hoặc PHP.
> - Tự ý đổi Database sang MySQL, MongoDB, SQL Server hay tạo SQLite cục bộ.
> - Tự ý yêu cầu đổi tên bảng, cột trong PostgreSQL sang tiếng Anh.
> - Tự ý triển khai GraphQL hoặc gRPC khi chưa có quyết định bằng văn bản từ Ban Kiến trúc.

---

## 4. QUY ƯỚC GIAO DIỆN CHUẨN DOANH NGHIỆP (GLOBAL UI CONTRACT)

Toàn bộ hệ thống May 10 ERP sử dụng **duy nhất một Design System (Core V2.11)**. Người dùng khi di chuyển giữa các phân hệ phải có cảm giác đang làm việc trên cùng một nền tảng phần mềm đồng nhất.

### 4.1. Kiến trúc Điều hướng 2 Tầng Bất Biến (Strict 2-Level Navigation)
Căn cứ theo tài liệu nghiệm thu `18_PH4_NAVIGATION_DEDUPLICATION.md`, hệ thống chỉ có đúng 2 tầng điều hướng:
1. **Tầng 1 (Core Level):** Global Header (`Header.jsx`) — Chuyển đổi giữa các phân hệ May 10.
2. **Tầng 2 (Module Level):** Contextual Sidebar (`Sidebar.jsx`) — Điều hướng các chức năng nghiệp vụ nội bộ của phân hệ.
3. **Tầng Nội dung (Content Level):** `ModuleHeader` tiêu đề + Trực tiếp nội dung nghiệp vụ (Bảng biểu, KPI, Form).

> [!WARNING]
> **NGHIÊM CẤM TẠO NAVIGATION TẦNG THỨ 3:**  
> Tuyệt đối không được tạo thanh tab ngang, sub-menu hay horizontal tab bar thứ hai nằm giữa `ModuleHeader` và nội dung nghiệp vụ. Toàn bộ việc chuyển đổi tính năng phải được đặt trên **PH4/PHx Sidebar**.

### 4.2. Danh mục Thành phần Giao diện Bắt buộc Sử dụng

```text
CÁC THÀNH PHẦN PHẢI DÙNG CHUNG TỪ CORE PORTAL:
├── Layout Shell: <MainLayout />, <Breadcrumb />, <Footer />
├── Navigation: <Header />, <Sidebar />
├── Module Banner: <ModuleHeader /> (truyền code, title, description, badgeText, imageKey)
├── Thẻ dữ liệu (Cards): bg-white rounded-2xl border border-[#E2EDF5] shadow-sm
├── Thẻ chỉ số (KPI): min-h-[140px] rounded-2xl border border-[#E2EDF5] shadow-sm
├── Bảng dữ liệu (Tables): Container rounded-2xl border border-[#E2EDF5] shadow-sm overflow-hidden
│   ├── thead: bg-[#F7FAFC] text-[#5F6F82] font-semibold text-xs uppercase tracking-wider
│   └── tbody tr: hover:bg-[#F9FBFC] transition-colors border-b border-[#E2EDF5]
├── Nút bấm (Buttons):
│   ├── Primary: bg-[#0F5FAF] hover:bg-[#0D4E90] active:bg-[#0A3D70] text-white rounded-xl shadow-sm
│   ├── Secondary: bg-white border border-[#DCEAF4] text-[#0F4C81] hover:bg-[#EAF5FC] rounded-xl
│   └── Danger: bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm
├── Ô nhập liệu (Form Inputs): rounded-xl border border-[#E2EDF5] focus:border-[#0F5FAF] focus:ring-1
└── Trạng thái (Status Badges): rounded-full px-2.5 py-0.5 text-xs font-semibold
    ├── Success (Hoàn thành, an toàn): bg-emerald-50 text-emerald-700 border border-emerald-200
    ├── Warning (Chờ duyệt, cảnh báo): bg-amber-50 text-amber-700 border border-amber-200
    ├── Danger (Hủy, từ chối, hết hàng): bg-red-50 text-red-700 border border-red-200
    └── Info (Đang xử lý, dự thảo): bg-blue-50 text-blue-700 border border-blue-200
```

### 4.3. Bảng Màu Thương Hiệu May 10 Chuẩn Hóa

| Tên Token | Mã Màu Hex | Ứng Dụng Trong Phân Hệ |
|---|---|---|
| **Primary** | `#0F5FAF` | Màu xanh thương hiệu May 10, nút chính, icon active, viền highlight |
| **Primary Dark** | `#0F4C81` | Màu hover của nút chính, chữ thương hiệu đậm, tiêu đề phân hệ |
| **Primary Active** | `#0A3D70` | Trạng thái nhấn giữ (active state) của nút bấm |
| **Primary Light** | `#EAF5FC` | Nền menu active trên Sidebar, nền badge thông tin |
| **Primary Pale** | `#F4FAFE` | Nền hover các hàng trong bảng dữ liệu |
| **Canvas Background** | `#F7FAFC` | Nền toàn bộ không gian làm việc của phân hệ |
| **Card Surface** | `#FFFFFF` | Nền các khối Card, Bảng biểu, Modal Dialog |
| **Border Line** | `#E2EDF5` | Đường viền chuẩn cho toàn bộ Card, Table, Input và Divider |
| **Text Primary** | `#172033` | Tiêu đề chính, số liệu KPI, tên mã hàng, dữ liệu chứng từ |
| **Text Secondary** | `#5F6F82` | Nhãn form, tiêu đề cột bảng dữ liệu, mô tả tính năng |
| **Text Muted** | `#8DA0B3` | Ghi chú ngày tháng, placeholder ô tìm kiếm, breadcrumb bậc thấp |

---

## 5. QUY ƯỚC XÁC THỰC DANH TÍNH (AUTHENTICATION CONTRACT)

Mọi phân hệ phải thừa hưởng và sử dụng cơ chế xác thực tập trung của Core Portal.

### 5.1. Định Dạng Token Chuẩn Doanh Nghiệp
- Mọi request yêu cầu xác thực từ Frontend gửi lên Backend phải đính kèm token trong HTTP Request Header:
  ```http
  Authorization: Bearer <erp_token>
  ```
- Cấu trúc token chuẩn (đã được khắc phục an ninh tại `11_rbac_critical_remediation.md`):
  ```text
  erp_token_{userId}_{timestamp}.{hmac_sha256_signature}
  ```
- Chữ ký số được sinh ra bởi máy chủ bằng bí mật nội bộ `AUTH_SECRET`. Token có thời hạn sử dụng tối đa là 24 giờ.

### 5.2. Các Hành Vi Nghiêm Cấm Trong Xác Thực
1. **CẤM** tạo màn hình Login riêng hoặc form đăng nhập nhúng trong module.
2. **CẤM** tự ý giải mã hoặc giả lập token ở client-side.
3. **CẤM** sử dụng các header giả mạo như `x-user-id` hoặc `x-role` để xác định danh tính người dùng. Mọi danh tính (`req.user`) phải do middleware `requireAuth` tại Backend phân giải và xác thực từ cơ sở dữ liệu.
4. **CẤM** sử dụng cơ chế fallback nguy hiểm gán người dùng ẩn danh thành Admin (ví dụ: `const userId = req.user?.id || 1;`). Khi không có token hợp lệ, Backend **bắt buộc trả về HTTP 401 Unauthorized**.

---

## 6. QUY ƯỚC PHÂN QUYỀN VAI TRÒ CHUẨN TIẾNG VIỆT (CANONICAL RBAC CONTRACT)

Cơ sở dữ liệu PostgreSQL `erp_may10` lưu trữ người dùng tại bảng `nguoi_dung`, với cột `vai_tro` mang các giá trị định danh **100% Tiếng Việt**.

### 6.1. Bảng 6 Vai Trò Doanh Nghiệp Chính Thức (Official Canonical Roles)

Toàn bộ hệ thống May 10 ERP hoạt động dựa trên đúng **6 vai trò chính thức** sau:

| Role Code | Tên nghiệp vụ | Phạm vi phân hệ | Quyền hạn mặc định |
|---|---|:---:|---|
| **`admin`** | Quản trị hệ thống | Toàn ERP | Toàn quyền kiểm soát, cấu hình hệ thống, quản lý người dùng và phê duyệt tối cao |
| **`ban_hang`** | Bán hàng | PH1 | Quản lý khách hàng, báo giá, hợp đồng, đơn bán hàng (SO), xem tồn kho khả dụng |
| **`san_xuat`** | Sản xuất | PH2 | Định mức kỹ thuật (BOM), kế hoạch sản xuất, lệnh sản xuất (LSX), xem tồn kho NPL |
| **`mua_hang`** | Mua hàng | PH3 | Quản lý nhà cung cấp, yêu cầu mua sắm, đơn mua hàng (PO), xem tồn kho NPL |
| **`kho`** | Kho & Quản lý vật tư | PH4 | Quản lý kho vải, NPL, lập/duyệt phiếu nhập, xuất, chuyển kho, kiểm kê cân đối |
| **`ke_toan`** | Tài chính – Kế toán & Giá thành | PH5 | Sổ cái, bút toán kho tự động, công nợ phải thu/trả, giá thành sản phẩm may |

> [!NOTE]
> **VỀ CÁC TÊN TIẾNG ANH TRONG TÀI LIỆU CŨ:**  
> Trong một số tài liệu khảo sát trước đây có xuất hiện các định danh tiếng Anh như `ADMIN`, `SALES`, `PRODUCTION`, `PURCHASING`, `WAREHOUSE`, `WAREHOUSE_MANAGER`, `ACCOUNTING`.  
> Ban Kiến trúc Hệ thống xác nhận: **Đây là các đề xuất khảo sát lịch sử (Historical audit proposal) — KHÔNG PHẢI LÀ ROLE CONTRACT HIỆN TẠI CỦA CƠ SỞ DỮ LIỆU VÀ TUYỆT ĐỐI KHÔNG ĐƯỢC SỬ DỤNG LÀM ROLE CODE TRONG CÁC MODULE PH1, PH2, PH3, PH4, PH5.**  
> Hệ thống **KHÔNG CÓ** vai trò `warehouse_manager`. Mọi thao tác quản lý kho thuộc thẩm quyền của vai trò `kho` và `admin`.

### 6.2. Nguyên Tắc Thẩm Quyền Máy Chủ (Server-side Enforcement)
- **Frontend Hiding KHÔNG PHẢI là Bảo Mật:** Việc ẩn nút bấm, ẩn menu Sidebar hoặc sử dụng `<PermissionGuard>`, `<RoleGuard>` chỉ phục vụ trải nghiệm người dùng (UX).
- **Backend bắt buộc phải kiểm tra quyền trên 100% Endpoints:**
  - Nếu request chưa có token: Trả về **`HTTP 401 Unauthorized`**.
  - Nếu request có token nhưng tài khoản không có vai trò/quyền hợp lệ: Trả về **`HTTP 403 Forbidden`**.
  - Tuyệt đối không trả về `HTTP 200 OK` kèm thông báo lỗi dạng `{ success: false, message: "Không có quyền" }`.

---

## 7. QUY ƯỚC MÃ ĐẶC QUYỀN PHÂN HỆ (PERMISSION CONTRACT)

Mọi thao tác nghiệp vụ phải được định danh bằng mã quyền phân cấp theo quy tắc chuẩn: `[module].[hành_động]`. Mã module sử dụng **tên tiếng Việt** theo đúng hợp đồng phân hệ.

### 7.1. Danh Mục Mã Quyền Chuẩn

```text
CÚ PHÁP: [ten_module_tieng_viet].[hanh_dong]
```

- **Tổng quan dùng chung:**
  - `dashboard.view`: Quyền truy cập Trang chủ điều hành May 10 ERP (cấp cho tất cả 6 vai trò).
- **PH1 — Bán hàng (`ban_hang`):**
  - `ban_hang.view`: Xem danh sách đơn bán hàng, khách hàng, báo cáo doanh số.
  - `ban_hang.create`: Tạo mới đơn bán hàng, thêm hồ sơ khách hàng.
  - `ban_hang.update`: Sửa đổi thông tin đơn hàng dự thảo.
  - `ban_hang.delete`: Hủy bỏ đơn bán hàng chưa duyệt.
  - `ban_hang.approve`: Phê duyệt đơn đặt hàng may mặc chính thức.
- **PH2 — Sản xuất (`san_xuat`):**
  - `san_xuat.view`: Tra cứu kế hoạch và tiến độ chuyền may.
  - `san_xuat.create`: Lập kế hoạch sản xuất, thiết lập định mức nguyên phụ liệu (BOM).
  - `san_xuat.update`: Cập nhật sản lượng may từng công đoạn / tổ may.
  - `san_xuat.approve`: Phê duyệt Lệnh sản xuất (LSX) chính thức.
- **PH3 — Mua hàng (`mua_hang`):**
  - `mua_hang.view`: Xem danh mục nhà cung cấp vải/phụ liệu, danh sách đơn mua PO.
  - `mua_hang.create`: Tạo mới đơn mua hàng nguyên phụ liệu.
  - `mua_hang.update`: Điều chỉnh đơn giá, điều khoản giao hàng.
  - `mua_hang.approve`: Phê duyệt đơn mua hàng chính thức gửi đối tác.
- **PH4 — Kho & Quản lý vật tư (`kho`):**
  - `kho.view`: Tra cứu số dư tồn kho, vị trí kệ, thẻ kho chi tiết.
  - `kho.nhap`: Lập và phê duyệt phiếu nhập kho (từ mua hàng hoặc thành phẩm may).
  - `kho.xuat`: Lập và phê duyệt phiếu xuất kho (cấp phát chuyền may hoặc giao khách).
  - `kho.chuyen`: Lập phiếu điều chuyển kho nội bộ giữa các xưởng May 10.
  - `kho.kiem_ke`: Lập phiếu kiểm kê và điều chỉnh cân đối số dư tồn kho.
  > *(Ghi chú tương thích: Tại tầng adapter Phase 1 hiện tại, PH4 đồng thời hỗ trợ bộ alias `warehouse.*` để bảo đảm tương thích ngược 100% với các test suite hiện hữu).*
- **PH5 — Tài chính & Kế toán (`ke_toan`):**
  - `ke_toan.view`: Xem sổ sách kế toán, bảng cân đối số phát sinh, báo cáo tài chính.
  - `ke_toan.create`: Lập chứng từ kế toán, hạch toán bút toán tổng hợp.
  - `ke_toan.update`: Điều chỉnh bút toán kế toán dự thảo.
  - `ke_toan.approve`: Phê duyệt sổ sách, khóa sổ kỳ kế toán, chốt giá thành sản phẩm.
- **Quản trị hệ thống (`admin`):**
  - `admin.users`: Quản lý danh bạ tài khoản cán bộ công nhân viên.
  - `admin.roles`: Quản trị ma trận vai trò doanh nghiệp.
  - `admin.permissions`: Cấu hình phân bổ đặc quyền chi tiết.

### 7.2. Quy Trình Đề Xuất Mã Quyền Mới
Nghiêm cấm các nhóm tự ý đặt ra các mã quyền phi chuẩn (ví dụ: `canDoAll`, `superUser`, `sales_admin`). Nếu nghiệp vụ thực tế yêu cầu quyền mới:
1. Gửi văn bản Đề xuất Mã quyền lên Ban Kiến trúc Hệ thống.
2. Nêu rõ: Tên mã quyền tiếng Việt, nghiệp vụ chi tiết, các vai trò được cấp quyền, danh sách API endpoint cần bảo vệ.
3. Chờ Integration Owner phê duyệt và cập nhật vào `backend/src/middlewares/auth.js` tập trung.

---

## 8. QUY ƯỚC CƠ SỞ DỮ LIỆU & ĐẶT TÊN TIẾNG VIỆT (DATABASE NAMING CONTRACT)

Cơ sở dữ liệu PostgreSQL `erp_may10` là tài sản thông tin cốt lõi dùng chung của toàn bộ Tổng Công ty May 10.

### 8.1. Nguyên Tắc Đặt Tên Bảng & Cột Bằng Tiếng Việt (Vietnamese Naming Standard)
Toàn bộ các bảng, trường dữ liệu, khóa chính, khóa ngoại trong schema `public` đều tuân theo quy ước **100% Tiếng Việt không dấu, chữ thường, phân cách bằng dấu gạch dưới (snake_case)**:

```text
DANH MỤC CÁC THỰC THỂ CƠ SỞ DỮ LIỆU CHUẨN HIỆN TẠI:
├── Quản trị người dùng: nguoi_dung
├── Danh mục dùng chung: don_vi_tinh, nha_cung_cap, kho, vat_tu, san_pham
├── Phân hệ PH4 (Kho lõi): vi_tri_kho, lo_vat_tu, ton_kho, phieu_nhap_kho,
│   chi_tiet_phieu_nhap, phieu_xuat_kho, chi_tiet_phieu_xuat, phieu_chuyen_kho,
│   chi_tiet_phieu_chuyen, phieu_kiem_ke, chi_tiet_phieu_kiem_ke
├── Phân hệ PH1 (Bán hàng): don_ban_hang, chi_tiet_don_ban_hang, khach_hang
├── Phân hệ PH2 (Sản xuất): lenh_san_xuat, chi_tiet_lenh_san_xuat, dinh_muc_bom
├── Phân hệ PH3 (Mua hàng): don_mua_hang, chi_tiet_don_mua_hang
└── Phân hệ PH5 (Kế toán): but_toan_tong_hop, chi_tiet_but_toan, so_cai
```

> [!CAUTION]
> **NGHIÊM CẤM YÊU CẦU ĐỔI TÊN CSDL SANG TIẾNG ANH:**  
> Tuyệt đối không được yêu cầu đổi tên bảng `nguoi_dung` thành `users`, `kho` thành `warehouses`, `vat_tu` thành `materials`, `ton_kho` thành `inventory`. Các nhóm phải tôn trọng và kế thừa 100% cấu trúc thực thể tiếng Việt hiện hữu.

### 8.2. Quy Định Tạo Bảng Mới
Khi thiết kế bảng mới cho các phân hệ PH1, PH2, PH3, PH5:
1. **Kiểm tra trùng lặp:** Rà soát danh mục 41 bảng hiện hữu để tránh tạo bảng trùng lặp dữ liệu master.
2. **Khóa Ngoại Bắt Buộc:** Phải thiết lập ràng buộc Foreign Key chuẩn đến các bảng Master Data:
   - Tham chiếu vật tư: `REFERENCES vat_tu(id)`
   - Tham chiếu kho: `REFERENCES kho(id)`
   - Tham chiếu đơn vị tính: `REFERENCES don_vi_tinh(id)`
   - Tham chiếu nhà cung cấp: `REFERENCES nha_cung_cap(id)`
   - Tham chiếu người dùng: `REFERENCES nguoi_dung(id)`
3. **Các Cột Kiểm Toán Bắt Buộc (Audit Columns):**
   ```sql
   ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   nguoi_tao_id INTEGER REFERENCES nguoi_dung(id),
   ngay_cap_nhat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   nguoi_cap_nhat_id INTEGER REFERENCES nguoi_dung(id)
   ```
4. **Tuyệt Đối Không:** Chạy lệnh `DROP TABLE`, `TRUNCATE TABLE`, `ALTER TABLE` làm thay đổi cấu trúc bảng của các phân hệ khác.

---

## 9. QUY ƯỚC THIẾT KẾ RESTFUL API (API CONTRACT)

Tất cả API endpoint phục vụ phân hệ phải tuân thủ chuẩn mực thiết kế RESTful của May 10:

### 9.1. Cấu Trúc Định Tuyến Endpoint
```text
/api/v1/[ten-phan-he]/[tai-nguyen]
```
- Ví dụ:
  - `GET /api/v1/sales/don-hang`: Lấy danh sách đơn bán hàng.
  - `POST /api/v1/sales/don-hang`: Tạo mới đơn bán hàng.
  - `GET /api/v1/sales/don-hang/:id`: Lấy chi tiết đơn bán hàng.
  - `PUT /api/v1/sales/don-hang/:id`: Cập nhật đơn bán hàng.
  - `POST /api/v1/sales/don-hang/:id/phe-duyet`: Phê duyệt đơn hàng.

### 9.2. Chuẩn Hóa Mã Trạng Thái HTTP (HTTP Status Codes)

| Mã HTTP | Tên Trạng Thái | Điều Kiện Trả Về |
|---|---|---|
| **200 OK** | Thành công | Áp dụng cho các request GET, PUT, DELETE xử lý thành công |
| **201 Created** | Tạo mới thành công | Áp dụng cho các request POST tạo bản ghi mới |
| **400 Bad Request** | Lỗi dữ liệu đầu vào | Thiếu trường bắt buộc, sai định dạng dữ liệu |
| **401 Unauthorized** | Chưa xác thực | Không gửi token, token sai chữ ký hoặc token đã hết hạn |
| **403 Forbidden** | Bị từ chối quyền | Đã đăng nhập nhưng vai trò không có quyền thực hiện thao tác |
| **404 Not Found** | Không tìm thấy | Bản ghi hoặc tài nguyên yêu cầu không tồn tại trong hệ thống |
| **409 Conflict** | Xung đột nghiệp vụ | Tranh chấp dữ liệu, tồn kho không đủ xuất, khóa đồng thời |
| **422 Unprocessable** | Sai quy tắc nghiệp vụ | Dữ liệu hợp lệ cú pháp nhưng vi phạm logic kinh doanh |
| **500 Server Error** | Lỗi máy chủ | Lỗi ngoại lệ chưa được xử lý, lỗi kết nối cơ sở dữ liệu |

### 9.3. Định Dạng Phản Hồi Thống Nhất (Response Envelope)
- **Khi thành công:**
  ```json
  {
    "success": true,
    "message": "Thao tác thực hiện thành công.",
    "data": { ... }
  }
  ```
- **Khi thất bại:**
  ```json
  {
    "success": false,
    "message": "Mô tả nguyên nhân lỗi bằng tiếng Việt rõ ràng.",
    "errorCode": "INSUFFICIENT_STOCK",
    "details": null
  }
  ```
- **Tuyệt đối không:** Lộ stack trace, câu truy vấn SQL thô hoặc thông tin nhạy cảm của server trong môi trường triển khai.

---

## 10. QUY ƯỚC NGHIỆP VỤ PHÍA MÁY CHỦ (BUSINESS LOGIC CONTRACT)

1. **Backend là Nguồn Sự Thật Duy Nhất (Single Source of Truth):**
   - Mọi phép tính toán số tiền, đơn giá, chiết khấu, thuế VAT, định mức tiêu hao nguyên phụ liệu, số lượng tồn kho khả dụng bắt buộc phải được tính toán và kiểm tra lại tại Backend Controller.
   - Frontend chỉ gửi dữ liệu đầu vào từ người dùng. Backend không bao giờ được tin tưởng dữ liệu tổng tiền hoặc trạng thái gửi từ Frontend.
2. **Quản Lý Trạng Thái Chứng Từ (Document State Machine):**
   - Các chứng từ quan trọng (Đơn hàng, Phiếu xuất, Lệnh sản xuất, Bút toán) phải tuân theo vòng đời trạng thái hữu hạn:
     `Dự thảo (draft)` ➔ `Chờ duyệt (pending)` ➔ `Đã duyệt (approved)` ➔ `Đang thực hiện (processing)` ➔ `Hoàn thành (completed)` / `Đã hủy (cancelled)`.
   - Backend phải chặn các chuyển đổi trạng thái không hợp lệ (ví dụ: chứng từ đã "Hoàn thành" thì không được phép chuyển ngược về "Dự thảo").

---

## 11. QUY ƯỚC GIAO DỊCH DỮ LIỆU ACID (TRANSACTION CONTRACT)

Mọi thao tác nghiệp vụ cập nhật từ 2 bảng dữ liệu trở lên hoặc yêu cầu tính toàn vẹn tuyệt đối bắt buộc phải được bọc trong **Database Transaction**.

```javascript
// Chuẩn thực hiện Transaction bắt buộc trong Backend Node.js:
const client = await pool.connect();
try {
  await client.query('BEGIN');
  
  // 1. Kiểm tra điều kiện nghiệp vụ & Khóa dòng nếu cần
  // 2. Cập nhật bảng cha (Header)
  // 3. Cập nhật bảng con (Details)
  // 4. Cập nhật bảng liên kết liên phân hệ (nếu có)

  await client.query('COMMIT');
  res.status(201).json({ success: true, message: 'Giao dịch hoàn tất.' });
} catch (error) {
  await client.query('ROLLBACK');
  next(error);
} finally {
  client.release();
}
```

> [!CAUTION]
> Nghiêm cấm việc thực hiện `UPDATE` bảng A xong commit rồi mới thực hiện `UPDATE` bảng B mà không có transaction bao quanh. Mọi lỗi phát sinh ở bất kỳ bước nào đều phải kích hoạt `ROLLBACK` toàn phần.

---

## 12. QUY ƯỚC CHỐNG TRANH CHẤP ĐỒNG THỜI (CONCURRENCY CONTRACT)

Trong môi trường nhà máy may quy mô lớn với hàng trăm người dùng truy cập cùng lúc, các tài nguyên hữu hạn (tồn kho vải, hạn mức tín dụng khách hàng, công suất chuyền may) rất dễ xảy ra xung đột tranh chấp (*Race Condition*).

### 12.1. Yêu Cầu Kỹ Thuật Bắt Buộc
- Khi thực hiện trừ tồn kho, cấp phát nguyên phụ liệu hoặc cập nhật số dư công nợ, phân hệ bắt buộc phải sử dụng cơ chế khóa bi quan (*Pessimistic Locking*):
  ```sql
  SELECT so_luong_ton FROM ton_kho 
  WHERE ma_kho = $1 AND ma_vat_tu = $2 
  FOR UPDATE;
  ```
- Khi phát hiện số lượng tồn khả dụng không đủ đáp ứng yêu cầu xuất kho/cấp phát:
  - Lập tức hủy bỏ giao dịch (`ROLLBACK`).
  - Phản hồi mã **`HTTP 409 Conflict`** kèm mã lỗi rõ ràng: `INSUFFICIENT_STOCK`.
- Tuyệt đối không để xảy ra hiện tượng tồn kho âm (*negative inventory*) dưới bất kỳ tình huống nào.

---

## 13. RANH GIỚI TRÁCH NHIỆM & QUYỀN SỞ HỮU MODULE (MODULE OWNERSHIP BOUNDARY)

Mỗi vai trò chính thức chịu trách nhiệm chuyên môn chính đối với một phân hệ nghiệp vụ, nhưng **không bị cô lập cứng nhắc**:

### 13.1. Phân Định Quyền Sở Hữu Phân Hệ (Ownership Mapping)
- **`admin`:** Quản trị toàn bộ hệ thống, toàn quyền truy cập tất cả các phân hệ PH1, PH2, PH3, PH4, PH5, SYS.
- **`ban_hang`:** Sở hữu chính phân hệ **PH1 — Bán hàng & Khách hàng**. Quản lý đơn hàng bán (SO), khách hàng, tiến độ giao hàng.
- **`san_xuat`:** Sở hữu chính phân hệ **PH2 — Quản lý Sản xuất & BOM**. Quản lý định mức nguyên phụ liệu, kế hoạch sản xuất, lệnh sản xuất (LSX).
- **`mua_hang`:** Sở hữu chính phân hệ **PH3 — Mua hàng & Nhà cung cấp**. Quản lý đối tác cung ứng, đơn mua hàng (PO), theo dõi giao hàng.
- **`kho`:** Sở hữu chính phân hệ **PH4 — Kho & Quản lý vật tư**. Quản lý số dư tồn kho, vị trí kệ, lô vải hạn dùng (FEFO), xuất/nhập/chuyển/kiểm kê.
- **`ke_toan`:** Sở hữu chính phân hệ **PH5 — Tài chính – Kế toán & Giá thành**. Quản lý sổ cái, bút toán hạch toán kho, công nợ, giá thành sản phẩm may.

### 13.2. Nguyên Tắc Phân Quyền Xuyên Phân Hệ (Cross-Access by Permission)
- Tuyệt đối **không hard-code giả định** rằng một vai trò chỉ được phép truy cập duy nhất một module.
- Khi một vai trò cần dữ liệu từ phân hệ khác để phục vụ nghiệp vụ (ví dụ: Chuyên viên `ban_hang`, Kỹ sư `san_xuat`, Cán bộ `mua_hang` đều cần tra cứu số dư tồn kho tại PH4), hệ thống sẽ cấp quyền cụ thể `kho.view` cho vai trò đó trong ma trận quyền.
- Mọi quyết định truy cập dữ liệu đều phải căn cứ trên **Mã quyền (Permission)** được xác thực tại Backend, không phụ thuộc vào tên trang hay URL.

---

## 14. QUY CHUẨN TÍCH HỢP LIÊN PHÂN HỆ (CROSS-MODULE INTEGRATION)

Dữ liệu giữa các phân hệ chảy theo chuỗi giá trị khép kín của Tổng Công ty May 10:

```text
PH1: Đơn Bán Hàng (SO) 
       │
       ▼
PH2: Kế hoạch Sản xuất & Nhu cầu NPL (BOM / LSX)
       │
       ▼
PH3: Đơn Mua Hàng Nguyên Phụ Liệu (PO)
       │
       ▼
PH4: Nhập Kho NPL & Xuất Kho Cấp Phát Chuyền May (Receipt & Issue)
       │
       ▼
PH5: Hạch Toán Tự Động Bút Toán Kho & Tính Giá Thành (Journal & Cost)
```

### Quy Tắc Tích Hợp Kỹ Thuật:
1. **Giao tiếp qua Hợp đồng Dữ liệu:** Khi PH1 cần kiểm tra tồn kho, phải gọi API của PH4 hoặc truy vấn view tồn kho khả dụng do Ban Kiến trúc cung cấp.
2. **Không Gọi Thẳng Controller của Phân Hệ Khác:** Nghiêm cấm việc `require('../ph4/phieuXuatController')` từ trong code của PH1 hay PH2.
3. **Liên kết Khóa Ngoại Rõ Ràng:**
   - Phiếu xuất kho giao hàng: `phieu_xuat_kho.ma_don_ban_hang` liên kết đến `don_ban_hang.id`.
   - Phiếu xuất kho sản xuất: `phieu_xuat_kho.ma_lenh_san_xuat` liên kết đến `lenh_san_xuat.id`.
   - Phiếu nhập kho từ mua sắm: `phieu_nhap_kho.ma_don_mua_hang` liên kết đến `don_mua_hang.id`.
   - Bút toán kho: `but_toan_tong_hop.ma_chung_tu_goc` liên kết đến ID phiếu nhập/xuất của PH4.

---

## 15. QUY TẮC ĐÓNG BĂNG BẢO VỆ PHÂN HỆ PH4 (PH4 FREEZE & COMPATIBILITY RULE)

Phân hệ PH4 — Kho & Quản lý vật tư đang vận hành ổn định trên môi trường thực tế với vai trò chuẩn là **`kho`** và **`admin`**.

> [!CAUTION]
> **LỆNH ĐÓNG BĂNG TUYỆT ĐỐI ĐỐI VỚI PH4:**
> 1. Tuyệt đối **KHÔNG ĐƯỢC ĐỔI** vai trò `kho` và `admin` thành `WAREHOUSE` và `ADMIN`.
> 2. Không nhóm nào được phép sửa đổi bất kỳ file nào trong `frontend/src/pages/warehouse/` và `frontend/src/pages/WarehouseModule.jsx`.
> 3. Không sửa đổi các controller, route, service của kho trong `backend/src/controllers/` (liên quan đến tồn kho, phiếu nhập, xuất, chuyển, kiểm kê).
> 4. Không sửa đổi cấu trúc các bảng dữ liệu: `ton_kho`, `vi_tri_kho`, `lo_vat_tu`, `phieu_nhap_kho`, `phieu_xuat_kho`, `phieu_chuyen_kho`, `phieu_kiem_ke`.
> 5. Nếu phân hệ mới cần thêm thông tin từ kho mà API hiện tại chưa hỗ trợ: **Bắt buộc phải lập "Phiếu Yêu Cầu Tích Hợp" (Integration Request)** gửi lên Ban Kiến trúc Hệ thống. Tuyệt đối không tự ý chỉnh sửa code PH4.

---

## 16. QUY TẮC ĐÓNG BĂNG VỎ LÕI PORTAL (CORE PORTAL FREEZE RULE)

Các thành phần giao diện toàn cục sau đây được bảo vệ ở mức cao nhất:

1. `frontend/src/components/layout/Header.jsx`: **FROZEN**.
2. `frontend/src/components/layout/Sidebar.jsx`: **FROZEN**.
3. `frontend/src/components/layout/MainLayout.jsx`: **FROZEN**.
4. `frontend/src/components/layout/Breadcrumb.jsx`: **FROZEN**.
5. `frontend/src/components/rbac/AuthContext.jsx`: **FROZEN**.
6. `frontend/src/pages/Login.jsx`: **FROZEN**.
7. `frontend/src/pages/Dashboard.jsx` (Trang chủ May 10 ERP): **FROZEN**.

Mọi yêu cầu điều chỉnh vỏ lõi chỉ được phép thực hiện bởi **Integration Owner**. Nếu phân hệ mới phát triển bị lệch giao diện hoặc xung đột, phân hệ đó phải tự điều chỉnh mã nguồn của mình để tương thích với chuẩn Core V2.11 hiện hành.

---

## 17. KỶ LUẬT PHÁT TRIỂN DÀNH CHO CÁC NHÓM PHÂN HỆ (MODULE TEAM RULES)

Các nhóm phát triển **PH1, PH2, PH3, PH5** bắt buộc phải tuân thủ nghiêm ngặt các điều cấm kỵ sau:

1. ❌ **Không tự tạo màn hình Login riêng:** Phải dùng màn hình Login trung tâm của Portal.
2. ❌ **Không tự tạo Header hoặc Sidebar riêng:** Phải kế thừa `Header.jsx` và cấu hình menu vào `Sidebar.jsx` thông qua file `config/menu.js`.
3. ❌ **Không tự tạo mã Role riêng:** Phải dùng đúng 6 mã vai trò tiếng Việt (`admin`, `ban_hang`, `san_xuat`, `mua_hang`, `kho`, `ke_toan`).
4. ❌ **Không tự tạo role `warehouse_manager`** hoặc các role tiếng Anh (`SALES`, `PRODUCTION`, `PURCHASING`, `ACCOUNTING`).
5. ❌ **Không tự đổi quy ước đặt tên quyền:** Phải tuân theo `[module_tieng_viet].[action]`.
6. ❌ **Không tự đổi cấu trúc CSDL sang tiếng Anh:** Phải đặt tên bảng và cột bằng tiếng Việt (snake_case).
7. ❌ **Không sửa mã nguồn PH4** để phục vụ việc chạy module của mình.
8. ❌ **Không sửa Core UI tokens** để làm giao diện phân hệ mình trông khác biệt.

### Quy Trình 5 Bước Khi Cần Bổ Sung Quyền / Vai Trò Mới:
Nếu phân hệ có yêu cầu nghiệp vụ thực sự cấp thiết:
1. Ghi rõ nghiệp vụ chi tiết cần giải quyết.
2. Trình bày lý do tại sao 6 vai trò và các quyền hiện hữu không đáp ứng được.
3. Đề xuất tên mã quyền/vai trò mới theo chuẩn tiếng Việt.
4. Chờ Integration Owner thẩm định và phê duyệt bằng văn bản.
5. Cập nhật Hợp đồng này trước khi tiến hành viết code.

---

## 18. ĐỊNH HƯỚNG CENTRAL IAM / RBAC PHASE 2 (FUTURE SCOPE BOUNDARY)

Hệ thống quản lý định danh tập trung (**Central IAM / SSO**) và **RBAC Phase 2** là phạm vi phát triển trong tương lai của Tổng Công ty May 10.

### 18.1. Nội Dung Dự Kiến Của Phase 2 (Tương Lai)
- Hệ thống Single Sign-On (SSO) toàn tập đoàn.
- Nâng cấp Token sang chuẩn OpenID Connect / OAuth2 hoàn chỉnh.
- Quản lý chính sách an ninh mật khẩu nâng cao (Password policy, MFA/2FA).
- Giao diện quản trị phân quyền tập trung cấp độ Enterprise.
- Kiểm toán an ninh nâng cao (Audit logging, SIEM integration).

### 18.2. Ranh Giới Đóng Băng Đối Với Phase 2
> [!IMPORTANT]
> Kế hoạch phát triển Phase 2 trong tương lai **KHÔNG PHẢI LÀ LÝ DO** để các nhóm tự ý thay đổi vai trò hoặc bảng dữ liệu hiện tại sang tiếng Anh. Nếu sau này kiến trúc Central IAM yêu cầu một bộ định danh nội bộ quốc tế, Ban Kiến trúc sẽ tự xây dựng một lớp tương thích trung gian (*adapter/mapping layer*) mà **không làm thay đổi role code trong cơ sở dữ liệu hiện hữu**.

---

## 19. QUY ƯỚC KIỂM THỬ BẮT BUỘC (TESTING CONTRACT)

Mỗi nhóm phát triển bắt buộc phải nộp kèm bộ kịch bản kiểm thử tự động (*Automated Test Suite*) có thể thực thi độc lập:

1. **Kiểm thử Biên dịch Frontend:** `npm run build` phải đạt Exit Code 0, 0 lỗi cú pháp, 0 cảnh báo nghiêm trọng.
2. **Kiểm thử API Endpoint:** Tối thiểu 100% các route nghiệp vụ chính phải có kịch bản test phản hồi đúng mã HTTP (200, 201, 400, 404).
3. **Kiểm thử Phân quyền (RBAC Tests):** Phải kiểm tra ít nhất 3 kịch bản cho mỗi endpoint:
   - Request không token ➔ Bị chặn 401.
   - User vai trò khác không có quyền ➔ Bị chặn 403.
   - User đúng vai trò được cấp quyền ➔ Thành công (200/201).
4. **Kiểm thử Giao dịch (Transaction Rollback Test):** Kiểm tra khi bước thứ hai trong chuỗi cập nhật bị lỗi, toàn bộ dữ liệu bước một phải được rollback sạch sẽ.
5. **Kiểm thử Tranh chấp Đồng thời (Concurrency Test):** Nếu phân hệ có nghiệp vụ trừ hạn mức/số lượng, phải có kịch bản gửi đồng thời 2 request vượt ngưỡng để xác nhận cơ chế khóa dòng chặn thành công với mã 409 Conflict.

---

## 20. QUY CHUẨN GÓI BÀN GIAO (REQUIRED HANDOVER PACKAGE)

Khi hoàn tất giai đoạn phát triển, nhóm phụ trách phân hệ phải đóng gói sản phẩm theo đúng cấu trúc thư mục sau:

```text
PHx_HANDOVER/
├── README.md                 # Hướng dẫn tổng quan, phạm vi, cách chạy test
├── API_SPEC.md               # Đặc tả chi tiết 100% endpoints, payload, status code
├── RBAC.md                   # Ma trận vai trò tiếng Việt, mã quyền và endpoint
├── BUSINESS_RULES.md         # Quy tắc tính toán, máy trạng thái, điều kiện validate
├── TEST_REPORT.md            # Báo cáo thực thi test thực tế (Logs đầu ra, tỷ lệ pass)
├── INTEGRATION.md            # Điểm tiếp xúc với PH4 và các phân hệ khác, foreign keys
├── frontend/                 # Toàn bộ mã nguồn giao diện (đặt trong thư mục phân hệ)
├── backend/                  # Controllers, routes, services của phân hệ
└── database/
    ├── schema.sql            # Script DDL tạo bảng mới (100% tiếng Việt), constraints
    └── seed.sql              # Dữ liệu khởi tạo mẫu để phục vụ kiểm thử
```

---

## 21. CỔNG KIỂM DUYỆT NGHIỆM THU (HANDOVER ACCEPTANCE GATE)

Ban Kiến trúc Hệ thống sẽ áp dụng quy trình kiểm duyệt nghiêm ngặt trước khi hợp nhất mã nguồn vào nhánh chính:

```text
               BÀN GIAO PHÂN HỆ (PHx HANDOVER)
                             │
                             ▼
     ┌───────────────────────────────────────────────┐
     │ CỔNG 1: BẢO TOÀN NỀN TẢNG & COMPATIBILITY     │ ──► Vi phạm Core/PH4 ──► TỪ CHỐI (REJECT)
     └───────────────────────┬───────────────────────┘
                             │ Đạt
                             ▼
     ┌───────────────────────────────────────────────┐
     │ CỔNG 2: KIỂM ĐỊNH GIAO DIỆN CHUẨN V2.11       │ ──► Lệch màu/Theme/Tab ─► TỪ CHỐI (REJECT)
     └───────────────────────┬───────────────────────┘
                             │ Đạt
                             ▼
     ┌───────────────────────────────────────────────┐
     │ CỔNG 3: BẢO MẬT & RBAC TIẾNG VIỆT CHUẨN       │ ──► Sai role/Spoofing ──► TỪ CHỐI (REJECT)
     └───────────────────────┬───────────────────────┘
                             │ Đạt
                             ▼
     ┌───────────────────────────────────────────────┐
     │ CỔNG 4: THỰC THI KIỂM THỬ HỒI QUY TỰ ĐỘNG     │ ──► Fail test/Build lỗi ─► TỪ CHỐI (REJECT)
     └───────────────────────┬───────────────────────┘
                             │ Đạt
                             ▼
               HỢP NHẤT HỆ THỐNG (MERGE ACCEPTED)
```

---

## 22. DANH MỤC KIỂM TRA BẢO MẬT (SECURITY ACCEPTANCE CHECKLIST)

Mỗi phân hệ bắt buộc phải vượt qua toàn bộ 15 tiêu chí kiểm thử an ninh:

- [ ] **SEC-01:** Request ẩn danh (không gửi Header Authorization) tới API nhạy cảm bị chặn chính xác với `HTTP 401`.
- [ ] **SEC-02:** Token sai chữ ký HMAC-SHA256 hoặc bị chỉnh sửa payload bị từ chối `HTTP 401`.
- [ ] **SEC-03:** Token đã quá hạn sử dụng (24 giờ) bị từ chối `HTTP 401`.
- [ ] **SEC-04:** Kẻ tấn công gửi kèm header giả mạo `x-role: admin` không thể leo thang đặc quyền (Backend kiểm tra từ DB).
- [ ] **SEC-05:** Kẻ tấn công gửi kèm header giả mạo `x-user-id: 1` không thể mạo danh tài khoản khác.
- [ ] **SEC-06:** Người dùng có vai trò khác không được cấp quyền bị chặn với `HTTP 403 Forbidden`.
- [ ] **SEC-07:** Các API cấu hình đặc quyền Quản trị (`admin.*`) chỉ duy nhất tài khoản `admin` truy cập được.
- [ ] **SEC-08:** Câu truy vấn Database sử dụng Parameterized Query (`$1`, `$2`), triệt tiêu 100% lỗ hổng SQL Injection.
- [ ] **SEC-09:** Ràng buộc toàn vẹn dữ liệu: Foreign Key không hợp lệ bị cơ sở dữ liệu chặn và trả về lỗi chuẩn.
- [ ] **SEC-10:** Dữ liệu đầu vào bắt buộc được validate chặt chẽ (kiểm tra kiểu dữ liệu, độ dài, khoảng giá trị).
- [ ] **SEC-11:** Chống xung đột nghiệp vụ: Không cho phép tạo trùng mã chứng từ, mã khách hàng, mã đơn hàng.
- [ ] **SEC-12:** Chống tấn công Mass Assignment: Chỉ trích xuất đúng các trường cho phép từ `req.body`.
- [ ] **SEC-13:** Không để lộ mật khẩu, mã hash hoặc thông tin cá nhân nhạy cảm trong phản hồi API.
- [ ] **SEC-14:** Bắt lỗi tập trung: Tuyệt đối không để lộ stack trace nội bộ khi máy chủ gặp sự cố ngoại lệ (500).
- [ ] **SEC-15:** CORS: Không mở cấu hình wildcard `*` cho các phương thức có xác thực.

---

## 23. DANH MỤC KIỂM TRA GIAO DIỆN (UI ACCEPTANCE CHECKLIST)

Mỗi màn hình phân hệ phải đáp ứng đầy đủ 12 tiêu chí nhận diện thương hiệu Core V2.11:

- [ ] **UI-01:** Kế thừa nguyên vẹn Global Top Header từ `Header.jsx`, không tự tạo thanh menu ngang riêng.
- [ ] **UI-02:** Kế thừa nguyên vẹn Contextual Sidebar từ `Sidebar.jsx`, hiển thị đúng menu của phân hệ mình.
- [ ] **UI-03:** Nằm gọn gàng bên trong khung `MainLayout.jsx` và hiển thị đường dẫn `Breadcrumb` chính xác.
- [ ] **UI-04:** Đầu trang sử dụng component `ModuleHeader` chuẩn với ảnh dệt may May 10, tiêu đề và badge trạng thái.
- [ ] **UI-05:** TUYỆT ĐỐI KHÔNG CÓ thanh tab bar điều hướng thứ 3 nằm ngang giữa `ModuleHeader` và nội dung.
- [ ] **UI-06:** Typography sử dụng font hệ thống `Inter/Roboto/sans-serif`, mã chứng từ dùng `font-mono font-bold`.
- [ ] **UI-07:** Màu sắc tuân thủ nghiêm ngặt bảng màu Corporate: Xanh chủ đạo `#0F5FAF`, nền `#F7FAFC`, viền `#E2EDF5`.
- [ ] **UI-08:** Tất cả các khối Card, Bảng biểu sử dụng bo góc lớn `rounded-2xl`, viền `#E2EDF5` và đổ bóng nhẹ `shadow-sm`.
- [ ] **UI-09:** Bảng dữ liệu có tiêu đề `thead` nền `#F7FAFC`, chữ xám `#5F6F82`, hiệu ứng hover hàng `hover:bg-[#F9FBFC]`.
- [ ] **UI-10:** Nút bấm hành động chính mang màu xanh `#0F5FAF`, bo góc `rounded-xl`, đổ bóng `shadow-sm`.
- [ ] **UI-11:** Các Modal hộp thoại sử dụng backdrop làm mờ `bg-black/40 backdrop-blur-sm`, bo góc `rounded-2xl`.
- [ ] **UI-12:** Giao diện co giãn đáp ứng hoàn hảo trên cả 3 độ phân giải: Desktop ($\ge 1024$px), Tablet (768px-1023px) và Mobile ($< 768$px).

---

## 24. QUY TRÌNH PHÁT TRIỂN 13 BƯỚC (DEVELOPMENT WORKFLOW)

Các nhóm phát triển phải bám sát quy trình chuẩn từ khởi động đến bàn giao:

```text
[BƯỚC 1]  Đọc kỹ và ký cam kết tuân thủ Hợp đồng Phát triển (tài liệu này).
    ↓
[BƯỚC 2]  Rà soát hiện trạng CSDL erp_may10, xác định các bảng master data tiếng Việt cần tái sử dụng.
    ↓
[BƯỚC 3]  Rà soát các API hiện có và tài liệu tích hợp liên phân hệ (06_cross_module_integration.md).
    ↓
[BƯỚC 4]  Thiết kế chi tiết phân hệ (Mô hình ERD tiếng Việt mở rộng, danh sách API, wireframe màn hình V2.11).
    ↓
[BƯỚC 5]  Lập trình Backend (Controllers, Services, Routes, Database Migrations tiếng Việt sạch).
    ↓
[BƯỚC 6]  Lập trình Frontend (Components con, Tables, Forms, tích hợp ModuleHeader, dùng design tokens).
    ↓
[BƯỚC 7]  Tích hợp cơ chế bảo vệ phân quyền RBAC tiếng Việt (requireAuth, requireRoles, requirePermission).
    ↓
[BƯỚC 8]  Thực thi kiểm thử nghiệp vụ nội bộ (Validation, tính toán số liệu, máy trạng thái chứng từ).
    ↓
[BƯỚC 9]  Thực thi kiểm thử an ninh & bảo mật (15 kịch bản trong Security Checklist).
    ↓
[BƯỚC 10] Thực thi kiểm thử biên dịch Frontend production (npm run build).
    ↓
[BƯỚC 11] Thực thi kiểm thử tích hợp liên phân hệ với PH4 (gọi API kho kiểm tra tồn, luân chuyển chứng từ).
    ↓
[BƯỚC 12] Đóng gói hồ sơ bàn giao chuẩn (PHx_HANDOVER theo đúng cấu trúc Mục 20).
    ↓
[BƯỚC 13] Gửi hồ sơ lên Ban Kiến trúc Hệ thống (Integration Owner) để tiến hành thẩm định nghiệm thu.
```

---

## 25. TRÁCH NHIỆM CỦA INTEGRATION OWNER & HIỆN TRẠNG DỰ ÁN

### 25.1. Trách Nhiệm Của Integration Owner
1. **Bảo hộ Nền tảng Cốt lõi:** Quản lý và kiểm soát duy nhất đối với Core Portal, Login, Global Shell, Layout và RBAC Engine.
2. **Thẩm định & Phê duyệt Thiết kế:** Xem xét các đề xuất mở rộng schema CSDL tiếng Việt, đề xuất bổ sung mã quyền mới từ các nhóm phân hệ.
3. **Điều phối Tích hợp Liên phân hệ:** Giám sát dòng dữ liệu nghiệp vụ xuyên suốt giữa PH1 ➔ PH2 ➔ PH3 ➔ PH4 ➔ PH5.
4. **Tổ chức Cổng Nghiệm thu:** Trực tiếp thực thi các kịch bản kiểm thử độc lập, rà quét an ninh mã nguồn trước khi hợp nhất.
5. **Đóng gói & Phát hành:** Chịu trách nhiệm thực hiện build production toàn diện và phát hành các phiên bản ERP tổng thể của Tổng Công ty May 10.

### 25.2. Bảng Trạng Thái Thành Phần Hiện Tại

| Thành Phần Hệ Thống | Trạng Thái Kỹ Thuật | Ghi Chú Kiến Trúc |
|---|:---:|---|
| **Cổng Đăng nhập (`/login`)** | **FROZEN** | Đã nghiệm thu, bảo vệ bằng mã hóa HMAC-SHA256 |
| **Cổng Doanh nghiệp (`/`)** | **FROZEN** | Đã nghiệm thu, tích hợp KPI thời gian thực |
| **Global UI Design System** | **FROZEN (V2.11)** | Đã nghiệm thu, chuẩn hóa bảng màu Corporate Blue |
| **Kiến trúc Điều hướng 2 Tầng**| **FROZEN** | Đã loại bỏ hoàn toàn navigation trùng lặp ở giữa |
| **Hệ thống Bảo mật RBAC Phase 1**| **FROZEN** | Đã khắc phục triệt để các lỗi F01 → F09, 27/27 test pass |
| **Phân hệ PH4 (Kho & Vật tư)** | **FROZEN** | 8 màn hình hoàn tất, 16/16 API pass, khóa dòng 100% pass |
| **Phân hệ PH1 (Bán hàng)** | **PENDING** | Đang mở tiếp nhận phát triển theo Hợp đồng này |
| **Phân hệ PH2 (Sản xuất)** | **PENDING** | Đang mở tiếp nhận phát triển theo Hợp đồng này |
| **Phân hệ PH3 (Mua hàng)** | **PENDING** | Đang mở tiếp nhận phát triển theo Hợp đồng này |
| **Phân hệ PH5 (Kế toán)** | **PENDING** | Đang mở tiếp nhận phát triển theo Hợp đồng này |
| **Toàn bộ ERP End-to-End** | **PENDING** | Sẽ tiến hành kiểm thử khi đủ 5 phân hệ tích hợp |
| **Central IAM / SSO Nâng cao** | **FUTURE PHASE** | Kế hoạch triển khai tập trung ở giai đoạn vận hành sau |

> [!NOTE]
> Việc phân hệ **PH4** và **Core Foundation** đã hoàn thành xuất sắc các bài kiểm tra bảo mật và kiểm thử hồi quy **KHÔNG ĐỒNG NGHĨA** với việc toàn bộ hệ sinh thái May 10 ERP đã sẵn sàng đưa vào vận hành thực tế (*Production Ready*). Toàn bộ hệ thống chỉ được coi là sẵn sàng vận hành khi cả 4 phân hệ còn lại (PH1, PH2, PH3, PH5) hoàn tất phát triển, vượt qua Cổng Nghiệm thu và hoàn thành chu trình kiểm thử liên thông End-to-End toàn tập đoàn.

---

## 26. TỔNG HỢP CÁC ĐIỂM CHƯA THỐNG NHẤT TRONG TÀI LIỆU CŨ (DOCUMENTATION INCONSISTENCIES)

Căn cứ theo yêu cầu rà soát đối chiếu tài liệu lịch sử, Ban Kiến trúc chính thức ghi nhận và chốt phương án xử lý tập trung:

1. **Về Mã Vai Trò Doanh Nghiệp (Role Naming Inconsistency):**
   - *Tài liệu khảo sát cũ:* Xuất hiện danh sách role tiếng Anh (`ADMIN`, `SALES`, `PRODUCTION`, `PURCHASING`, `WAREHOUSE`, `WAREHOUSE_MANAGER`, `ACCOUNTING`).
   - *Chuẩn chính thức xác lập:* **Duy nhất 6 vai trò Tiếng Việt (`admin`, `ban_hang`, `san_xuat`, `mua_hang`, `kho`, `ke_toan`) khớp 100% với Database hiện tại.** Không có vai trò `warehouse_manager`. Các tên tiếng Anh cũ chỉ mang tính tham chiếu lịch sử.
2. **Về Mã Đặc Quyền Phân Hệ (Permission Naming Inconsistency):**
   - *Tài liệu cũ:* Dùng tiền tố tiếng Anh (`sales.*`, `production.*`, `purchasing.*`, `warehouse.*`, `accounting.*`).
   - *Chuẩn chính thức xác lập:* Tuân thủ tiền tố module tiếng Việt (`ban_hang.*`, `san_xuat.*`, `mua_hang.*`, `kho.*`, `ke_toan.*`, `admin.*`).
3. **Về Phương Thức Xác Thực (Authentication Header):**
   - *Tài liệu cũ (`02_architecture.md`, dòng 35):* Đề cập việc Axios client tự động gắn header `x-role` và `x-user-id`.
   - *Chuẩn bảo mật hiện hành (`11_rbac_critical_remediation.md` & Hợp đồng này):* Cấm tuyệt đối việc sử dụng `x-role` và `x-user-id` làm nguồn xác thực. Mọi request phải dùng `Authorization: Bearer <erp_token>` có chữ ký số HMAC-SHA256 hợp lệ.
4. **Về Bảng Màu Nhận Diện (Color System):**
   - *Tài liệu cũ (`07_ui_ux_design_system.md`, dòng 14):* Ghi nhận màu chủ đạo là đỏ đô truyền thống `may10-primary` (`#8B1E2D`).
   - *Chuẩn giao diện hiện hành (V2.8 đến V2.11):* Đã chuyển đổi đồng bộ sang bảng màu May 10 Corporate Blue (`#0F5FAF`, `#0F4C81`, `#EAF5FC`, `#F7FAFC`, `#E2EDF5`) để chống lóa mắt và phù hợp với tiêu chuẩn phần mềm công nghiệp hiện đại.
5. **Về Tầng Điều Hướng Module (Navigation Layers):**
   - *Tài liệu giai đoạn V2.7 - V2.8:* Cho phép tồn tại thanh tab bar nằm ngang trong trang phân hệ.
   - *Chuẩn tinh gọn hiện hành (`18_PH4_NAVIGATION_DEDUPLICATION.md`):* Đã khử trùng lặp hoàn toàn, chỉ duy trì 2 tầng điều hướng duy nhất (Global Header + Contextual Sidebar).

---

## PHÁN QUYẾT CHÍNH THỨC (FINAL VERDICT)

```text
======================================================================
                         FINAL VERDICT
      [ RBAC CONTRACT CORRECTED — READY FOR MODULE HANDOVER ]
======================================================================
 1. Hợp đồng phát triển đã được chuẩn hóa 100% theo bộ Role tiếng Việt:
    admin, ban_hang, san_xuat, mua_hang, kho, ke_toan.
 2. Loại bỏ hoàn toàn sự tồn tại của role warehouse_manager.
 3. Các role tiếng Anh cũ được xác định rõ là đề xuất khảo sát lịch sử,
    không phải contract hiện tại của Database.
 4. Thống nhất quy ước Permission tiếng Việt: [module_tieng_viet].[action].
 5. Xác lập nguyên tắc bảo vệ CSDL tiếng Việt erp_may10 (snake_case).
 6. Bảo vệ nguyên vẹn 100% tính tương thích của phân hệ kho PH4.
 7. Zero Source Code Change — Zero Database Change.
======================================================================
```
