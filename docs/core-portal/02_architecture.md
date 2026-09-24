# KIẾN TRÚC HỆ THỐNG CỔNG ĐIỀU HÀNH ERP MAY 10
**TỔNG CÔNG TY MAY 10 - CTCP**

---

## 1. Sơ Đồ Kiến Trúc Tổng Thể (System Architecture)

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        TRÌNH DUYỆT NGƯỜI DÙNG                          │
│  (Desktop / Tablet / Mobile — Giao diện May 10 Corporate Design System)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / HTTPS
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   FRONTEND LAYER (Vite + React 18)                     │
│  Port: 5173 (Development) / Nginx Production Build                    │
│                                                                        │
│  ├── React Router v7 / v6 Architecture                                 │
│  │   ├── Public Routes: /login, /403, /404                             │
│  │   ├── Protected Core Portal: /                                      │
│  │   ├── Module PH4 (Audited & Frozen): /warehouse/* (8 Sub-screens)   │
│  │   ├── Placeholder Modules: /sales, /production, /purchasing, ...    │
│  │   └── System Admin: /admin/users, /admin/roles, /admin/permissions  │
│  │                                                                     │
│  ├── RBAC Security & State:                                            │
│  │   ├── AuthProvider (Session, Current Role, Permissions Token)       │
│  │   ├── ProtectedRoute (Authentication Verification)                  │
│  │   ├── PermissionGuard (Fine-grained Action Protection)              │
│  │   └── RoleGuard (Enterprise Role Authorization)                     │
│  │                                                                     │
│  └── Services Abstraction:                                             │
│      ├── authService.js (Login, Token, Role Switcher)                  │
│      ├── portalService.js (Modules, Summary, Activity, Notifications)   │
│      └── api.js (Axios Instance with x-role & x-user-id interceptor)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API (/api/v1/*)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  BACKEND LAYER (Node.js + Express)                     │
│  Port: 5000                                                            │
│                                                                        │
│  ├── Middleware: CORS, Morgan Logging, JSON BodyParser, ErrorHandler    │
│  ├── Portal Controller & Routes:                                       │
│  │   ├── POST /api/v1/auth/login, GET /api/v1/auth/me                  │
│  │   ├── GET /api/v1/modules, GET /api/v1/permissions                  │
│  │   ├── GET /api/v1/dashboard/summary, GET /api/v1/dashboard/activity │
│  │   └── GET /api/v1/notifications                                     │
│  └── PH4 Audited Controllers (21 REST Endpoints, Concurrency Engine)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Connection Pool (Max: 25, FOR UPDATE)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   DATABASE LAYER (PostgreSQL 18.6)                     │
│  Port: 5432 | Database: erp_may10 | Schema: public (41 Tables)        │
│                                                                        │
│  ├── Người dùng & Phân quyền: nguoi_dung (6 roles)                     │
│  ├── Danh mục dùng chung: don_vi_tinh, nha_cung_cap, kho, vat_tu, ...  │
│  ├── Phân hệ PH4 lõi: ton_kho, vi_tri_kho, lo_vat_tu, phieu_nhap_kho,  │
│  │   phieu_xuat_kho, phieu_chuyen_kho, phieu_kiem_ke & chi_tiet        │
│  └── Khung dữ liệu chờ tích hợp: don_ban_hang (PH1), lenh_san_xuat     │
│      (PH2), don_mua_hang (PH3), but_toan_tong_hop (PH5)                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Nguyên Tắc Thiết Kế Bất Biến (Guiding Principles)

1. **Không phân tách Database:**  
   Không tạo database hay schema riêng cho từng phân hệ. Toàn bộ 5 phân hệ khai thác chung một database `erp_may10`.

2. **Bảo tồn tính nguyên vẹn của PH4:**  
   Toàn bộ 8 màn hình nghiệp vụ, 21 endpoints API và cơ chế chống xung đột đồng thời (`SELECT ... FOR UPDATE`) của PH4 được giữ nguyên vẹn 100%.

3. **Phân tách trách nhiệm (Separation of Concerns):**  
   Frontend giao tiếp với Backend thông qua các lớp Service trừu tượng (`authService`, `portalService`, `api`). Không bao giờ gọi API trực tiếp từ giao diện.

4. **Khả năng mở rộng (Extensibility):**  
   Khi bước vào Phase 2 phát triển PH1, PH2, PH3, PH5, các nhà phát triển chỉ cần cắm thêm màn hình vào thư mục `src/pages/` và cấu hình route tương ứng trong `AppRoutes.jsx` mà không cần tái cấu trúc Portal.
