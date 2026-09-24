# 07 — BÁO CÁO KẾT QUẢ TRIỂN KHAI RBAC PHASE 1 (SECURITY FIX + CANONICAL ROLE ADAPTER)

> **Dự án:** Tổng Công ty May 10 — Phân hệ PH4: Kho & Quản lý vật tư  
> **Giai đoạn:** RBAC Phase 1 — Khắc phục lỗ hổng bảo mật & Bộ tương thích vai trò chuẩn hóa  
> **Kiến trúc:** Temporary Auth & Canonical Role Adapter (Mô hình xác thực chuyển tiếp chuẩn bị cho Central IAM Phase 2)  
> **Ngày hoàn thành:** 09/09/2026  
> **Trạng thái:** ✅ **HOÀN THÀNH 100% — PASS TOÀN BỘ BẢO MẬT & HỒI QUY**

---

## I. TỔNG QUAN MỤC TIÊU & NGUYÊN TẮC BẮT BUỘC

1. **Khắc phục triệt để lỗ hổng bảo mật nghiêm trọng đã ghi nhận trong Audit:**
   - **Xóa bỏ Fallback nặc danh:** Loại bỏ hoàn toàn cơ chế tự động gán `role = 'kho', userId = 1` khi request không có xác thực. Mọi truy cập trái phép hoặc thiếu thông tin nhận diện đều bị từ chối với **HTTP 401 Unauthorized**.
   - **Chặn đứng Leo quyền giả mạo Header (Header Spoofing):** Header `x-role` từ phía client **không còn là nguồn chân lý (Source of Truth)**. Vai trò người dùng luôn được phân giải và xác thực từ identity người dùng trong CSDL PostgreSQL `nguoi_dung`. Kẻ tấn công gửi `x-role: admin` nếu không phải tài khoản admin sẽ nhận ngay **HTTP 403 Forbidden**.
   - **Bảo vệ Endpoint Quản trị:** Bọc bảo vệ Route `/admin/permissions` trên Frontend bằng `<RoleGuard roles={['admin']}>` và bảo vệ API Backend.
   - **Bảo vệ Dữ liệu Tồn kho:** Thêm `requireAuth` và `requireRoles` cho các API tra cứu tồn kho, thẻ kho (`/api/v1/ton-kho/*`).
   - **Bổ sung Phân hệ Bán hàng:** Cập nhật ma trận quyền backend bổ sung `SALES` (không để người dùng bán hàng fallback về warehouse).

2. **Nguyên tắc kỹ thuật tuân thủ nghiêm ngặt:**
   - ❌ **Không thay đổi Database:** 41 bảng nguyên vẹn, không `ALTER TABLE`, không `DROP TABLE`, dữ liệu `nguoi_dung` giữ nguyên.
   - ❌ **Không phá vỡ PH4:** Giữ nguyên 8 màn hình, giữ nguyên contract API PH4, giữ nguyên khai báo nghiệp vụ `requireRoles('kho', 'admin')`.
   - ❌ **Không sửa giao diện Login & Core Portal:** Giữ nguyên visual chuẩn doanh nghiệp May 10.
   - ❌ **Tương thích ngược 100%:** Adapter chuẩn hóa `normalizeRole()` xử lý mượt mà cả mã tiếng Việt (`kho`, `ban_hang`, `san_xuat`, `mua_hang`, `ke_toan`, `admin`) và mã Canonical tiếng Anh (`WAREHOUSE`, `SALES`, `PRODUCTION`, `PURCHASING`, `ACCOUNTING`, `ADMIN`).

---

## II. DANH SÁCH FILE THAY ĐỔI & TẠO MỚI

| STT | Đường dẫn File | Loại thay đổi | Chi tiết tác vụ |
|:---:|:---|:---:|:---|
| 1 | [`backend/src/config/roleMapping.js`](file:///E:/ERP/backend/src/config/roleMapping.js) | **TẠO MỚI** | Khởi tạo bảng danh mục `CANONICAL_ROLES`, bộ từ điển ánh xạ song ngữ `ROLE_MAPPING`, hàm chuẩn hóa `normalizeRole()`, và ma trận quyền chuẩn `ROLE_PERMISSIONS` (bao gồm đầy đủ đặc quyền cho SALES/ban_hang). |
| 2 | [`backend/src/middlewares/auth.js`](file:///E:/ERP/backend/src/middlewares/auth.js) | **SỬA ĐỔI** | Viết lại `resolveUserIdentity()`: xác thực Bearer token / dev identity, tra cứu vai trò từ DB `nguoi_dung` thay vì tin cậy `x-role`. Thêm `requireAuth()`, nâng cấp `requireRoles()` tự động chuẩn hóa vai trò canonical, thêm `requirePermission()`. |
| 3 | [`backend/src/controllers/portalController.js`](file:///E:/ERP/backend/src/controllers/portalController.js) | **SỬA ĐỔI** | Tích hợp `roleMapping`, cấp đầy đủ quyền cho `SALES` (`sales.view`, `sales.create`, `sales.update`, `sales.approve`, `warehouse.view`), sửa truy vấn login tra cứu an toàn theo email/userId. |
| 4 | [`backend/src/routes/tonKhoRoutes.js`](file:///E:/ERP/backend/src/routes/tonKhoRoutes.js) | **SỬA ĐỔI** | Bổ sung `requireAuth` và phân quyền `requireRoles` cho các endpoints `/ton-kho`, `/ton-kho/the-kho`, `/ton-kho/dashboard`. |
| 5 | [`backend/src/routes/phieuNhapRoutes.js`](file:///E:/ERP/backend/src/routes/phieuNhapRoutes.js) | **SỬA ĐỔI** | Bổ sung `requireAuth` cho các endpoint đọc danh sách phiếu nhập. |
| 6 | [`backend/src/routes/phieuXuatRoutes.js`](file:///E:/ERP/backend/src/routes/phieuXuatRoutes.js) | **SỬA ĐỔI** | Bổ sung `requireAuth` cho các endpoint đọc danh sách phiếu xuất. |
| 7 | [`frontend/src/routes/AppRoutes.jsx`](file:///E:/ERP/frontend/src/routes/AppRoutes.jsx) | **SỬA ĐỔI** | Bọc bảo vệ route `/admin/permissions` với `<RoleGuard roles={['admin']} redirect={true} fallback={<Forbidden />}>`. |
| 8 | [`frontend/src/services/api.js`](file:///E:/ERP/frontend/src/services/api.js) | **SỬA ĐỔI** | Cập nhật Axios request interceptor tự động gửi `Authorization: Bearer <erp_token>` kèm theo `x-role` và `x-user-id`. |
| 9 | [`backend/tests/test_rbac_security.js`](file:///E:/ERP/backend/tests/test_rbac_security.js) | **TẠO MỚI** | Bộ kiểm thử bảo mật tự động gồm 16 test cases chuyên sâu kiểm tra 401 Unauthorized, chặn Header Spoofing, cô lập quyền liên phân hệ, xác thực Token và Permission Guard. |

---

## III. MA TRẬN ÁNH XẠ VAI TRÒ (CANONICAL ROLE ADAPTER)

```
                       ┌─────────────────────────┐
                       │  Client Request / Auth  │
                       └────────────┬────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │   resolveUserIdentity() in middlewares/auth.js         │
       │   - Tra cứu DB nguoi_dung theo Token / Validated User  │
       │   - LẤY VAI_TRO GỐC TỪ POSTGRESQL (Source of Truth)    │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │   normalizeRole(rawRole)                               │
       ├────────────────────────────┬───────────────────────────┤
       │ Input DB / Header Hint     │ Canonical Internal Role   │
       ├────────────────────────────┼───────────────────────────┤
       │ 'admin' / 'ADMIN'          │ ADMIN                     │
       │ 'kho' / 'warehouse'        │ WAREHOUSE                 │
       │ 'warehouse_manager'        │ WAREHOUSE_MANAGER         │
       │ 'ban_hang' / 'sales'       │ SALES                     │
       │ 'san_xuat' / 'production'  │ PRODUCTION                │
       │ 'mua_hang' / 'purchasing'  │ PURCHASING                │
       │ 'ke_toan' / 'accounting'   │ ACCOUNTING                │
       └────────────────────────────┴───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │   requireRoles('kho', 'admin')                         │
       │   - Tự động normalize: ['WAREHOUSE', 'ADMIN']          │
       │   - So sánh với req.user.role (WAREHOUSE) ➔ PASS ✅    │
       │   - PH4 Route declarations không cần sửa đổi!          │
       └────────────────────────────────────────────────────────┘
```

---

## IV. KẾT QUẢ KIỂM THỬ BẢO MẬT & HỒI QUY

### 1. Bộ Kiểm thử Bảo mật RBAC (`backend/tests/test_rbac_security.js`)
- **Kết quả:** **16/16 TESTS PASSED (100%)**
- **Chi tiết từng Test Case:**
  1. `[PASS] TC-01:` Request không có token/userId bị chặn với `HTTP 401 Unauthorized`.
  2. `[PASS] TC-02:` GET `/api/v1/ton-kho` không xác thực bị chặn với `HTTP 401 Unauthorized`.
  3. `[PASS] TC-03:` Người dùng Bán hàng gửi `x-role: admin` bị phát hiện và từ chối với `HTTP 403 Forbidden` (Chặn Header Spoofing thành công).
  4. `[PASS] TC-04:` Thủ kho (User 5 / kho) được phép tạo phiếu nhập kho (`HTTP 201 Created`).
  5. `[PASS] TC-05:` Admin (User 1) có toàn quyền tạo phiếu nhập kho (`HTTP 201 Created`).
  6. `[PASS] TC-06:` Bearer token `erp_token_5_...` được xác thực đúng vai trò `WAREHOUSE`.
  7. `[PASS] TC-07:` Chuyên viên Bán hàng được phép tra cứu tồn kho (`HTTP 200 OK`).
  8. `[PASS] TC-08:` Chuyên viên Bán hàng KHÔNG ĐƯỢC phép lập phiếu xuất kho (`HTTP 403 Forbidden`).
  9. `[PASS] TC-09:` Cán bộ Sản xuất KHÔNG ĐƯỢC phép tạo vị trí kệ kho (`HTTP 403 Forbidden`).
  10. `[PASS] TC-10:` Cán bộ Mua hàng KHÔNG ĐƯỢC phép lập phiếu chuyển kho (`HTTP 403 Forbidden`).
  11. `[PASS] TC-11:` Kế toán KHÔNG ĐƯỢC phép tự ý lập phiếu kiểm kê kho (`HTTP 403 Forbidden`).
  12. `[PASS] TC-12:` GET `/api/v1/health` hoạt động công khai không cần token (`HTTP 200 UP`).
  13. `[PASS] TC-13:` POST `/api/v1/auth/login` hoạt động công khai và trả về vai trò `admin` (`HTTP 200 OK`).
  14. `[PASS] TC-14:` GET `/api/v1/auth/me` trả về đúng ma trận quyền cho vai trò `SALES` (bao gồm `sales.view`, `sales.create`).
  15. `[PASS] TC-15:` Demo switch-role token `mock-jwt-token-ban_hang` ánh xạ đúng danh tính User Bán hàng.
  16. `[PASS] TC-16:` `requirePermission` cho phép ADMIN vượt qua kiểm tra đa đặc quyền.

### 2. Bộ Kiểm thử Nghiệp vụ PH4 (`npm run test:api`)
- **Kết quả:** **16/16 TESTS PASSED (100%)**
- Kiểm thử đầy đủ: Health check, Master Data, Vị trí kho, Lô vật tư / Cây vải, Tồn kho & Dashboard, Thẻ kho, Nhập kho, Xuất kho & Chặn xuất âm (409 Conflict), Chuyển kho, Kiểm kê & Cân đối kho.

### 3. Bộ Kiểm thử Đa luồng Concurrency (`node tests/test_concurrency.js`)
- **Kết quả:** **100% PASS**
- 2 Request đồng thời tranh chấp tồn kho: 1 request thành công (201 Created), 1 request bị từ chối chính xác (409 Conflict). Cơ chế PostgreSQL `SELECT ... FOR UPDATE` bảo toàn toàn vẹn dữ liệu.

### 4. Kiểm thử Frontend Build (`npm run build`)
- **Kết quả:** **0 Errors, 0 Warnings**. Bundle Vite hoàn thành thành công trong 5.79s.

---

## V. TUYÊN BỐ PHẠM VI (SCOPE & LIMITATIONS)

1. **Bản chất của Phase 1:**
   - Đây là **Temporary Auth & Canonical Role Adapter** được thiết kế để vá các lỗ hổng bảo mật cấp bách và chuẩn hóa danh mục vai trò giữa Frontend, Backend và Database.
   - Chưa thay thế hoàn toàn bằng dịch vụ Central Identity Provider độc lập (Central IAM) hoặc Signed JWT RSA-256. Cơ chế hiện tại sử dụng Identity Session Token gắn liền với bảng `nguoi_dung` của PostgreSQL.
2. **Kế hoạch Phase 2 (Central IAM / SSO):**
   - Di chuyển session tokens sang Signed JWT (JSON Web Token có chữ ký bảo mật bí mật `HMAC-SHA256` hoặc cặp khóa bất đối xứng `RS256`).
   - Tách biệt module xác thực tập trung dùng chung cho toàn bộ PH1 – PH5 May 10 khi mở rộng quy mô.
