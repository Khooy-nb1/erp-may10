# BÁO CÁO KHẮC PHỤC LỖI TÀI KHOẢN THỦ KHO KHÔNG HIỆN DỮ LIỆU
## CONTROLLED REMEDIATION REPORT — MAY 10 ERP
### ROOT CAUSE: RC-01 → RC-05
**Tài liệu:** `14_WAREHOUSE_LOGIN_BUG_REMEDIATION.md`  
**Trạng thái:** REMEDIATED — WAREHOUSE LOGIN DATA RESTORED  
**Ngày thực hiện:** 10/09/2026  
**Chuyên viên thực hiện:** Senior ERP Security & Integration Architect  
**Cam kết tuân thủ:** Zero Database Change | Zero Business Logic Change | Zero UI Redesign  

---

## 1. TỔNG HỢP NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE SUMMARY)

| Mã lỗi | Vị trí | Hiện tượng & Cơ chế phát sinh | Trạng thái khắc phục |
|:---|:---|:---|:---:|
| **RC-01** | `backend/src/controllers/portalController.js` & `roleMapping.js` | Hàm `normalizeRole` tự động biến đổi vai trò tiếng Việt `'kho'` thành mã tiếng Anh `'warehouse'`, làm lệch chuẩn RBAC Contract. | **ĐÃ KHẮC PHỤC** |
| **RC-02** | `backend/src/controllers/portalController.js` (`getMe`) | Endpoint `GET /api/v1/auth/me` trả về `{ data: { ...user, role, permissions } }` thay vì bọc `{ data: { user: { ... }, role, permissions } }`, không đồng nhất với `login`. | **ĐÃ KHẮC PHỤC** |
| **RC-03** | `frontend/src/services/authService.js` | Bóc tách sai cấu trúc gây `TypeError: Cannot read properties of undefined (reading 'id')`, ghi chuỗi `"undefined"` vào LocalStorage và gây crash `JSON.parse`. | **ĐÃ KHẮC PHỤC** |
| **RC-04** | `frontend/src/config/permissions.js` & `roles.js` | Ma trận quyền thiếu khóa canonical tiếng Việt (`kho.view`, `kho.nhap`,...), tồn tại role `warehouse_manager` thừa ngoài chuẩn 6 role. | **ĐÃ KHẮC PHỤC** |
| **RC-05** | `frontend/src/routes/AppRoutes.jsx` & `Forbidden.jsx` | PH4 route guard kiểm tra `warehouse.view` thay vì `kho.view`; `Forbidden.jsx` và `AuthContext.jsx` ngầm định fallback sang Admin khi role không khớp. | **ĐÃ KHẮC PHỤC** |

---

## 2. DANH SÁCH CÁC FILE ĐÃ SỬA ĐỔI (FILES CHANGED)

Toàn bộ quá trình can thiệp chỉ thực hiện tối thiểu trên 9 file logic/contract, không chạm vào bất kỳ file CSS, styling, hay component layout dùng chung:

1. **`backend/src/config/roleMapping.js`** — Chuẩn hóa 6 vai trò canonical tiếng Việt và ma trận quyền.
2. **`backend/src/controllers/portalController.js`** — Chuẩn hóa response contract của `login` và `getMe` trả về canonical role `'kho'` và đối tượng `user`.
3. **`backend/src/middlewares/auth.js`** — Cập nhật `resolveUserIdentity`, `requireRoles`, `requirePermission` nhận diện vai trò tiếng Việt `'kho'`.
4. **`frontend/src/config/roles.js`** — Loại bỏ role thừa `warehouse_manager`, cố định 6 canonical roles.
5. **`frontend/src/config/permissions.js`** — Bổ sung các quyền chuẩn tiếng Việt (`kho.view`, `kho.nhap`, `kho.xuat`, `kho.chuyen`, `kho.kiem_ke`), loại bỏ role thừa.
6. **`frontend/src/services/authService.js`** — Loại bỏ triệt để lỗi crash JSON và silent admin fallback; validate cấu trúc dữ liệu theo contract.
7. **`frontend/src/components/rbac/AuthContext.jsx`** — Cập nhật khởi tạo phiên an toàn, không tự ý gán fallback Admin cho tài khoản non-admin.
8. **`frontend/src/routes/AppRoutes.jsx`** — Cập nhật PermissionGuard phân hệ PH4 kiểm tra quyền canonical `kho.view`.
9. **`frontend/src/pages/Forbidden.jsx`** — Xử lý hiển thị vai trò an toàn khi không có đặc quyền.

---

## 3. CHI TIẾT CÁC THAY ĐỔI CỤ THỂ (EXACT CHANGES)

### A. Backend (`roleMapping.js` & `portalController.js` & `auth.js`)
- **Vai trò Canonical:**
  ```javascript
  const CANONICAL_ROLES = {
    ADMIN: 'admin',
    KHO: 'kho',
    BAN_HANG: 'ban_hang',
    SAN_XUAT: 'san_xuat',
    MUA_HANG: 'mua_hang',
    KE_TOAN: 'ke_toan',
  };
  ```
- **Hàm `normalizeRole`:** Luôn trả về mã vai trò tiếng Việt viết thường (`'kho'`, `'admin'`, `'ban_hang'`,...).
- **Contract `GET /api/v1/auth/me` và `POST /api/v1/auth/login` đồng nhất:**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "5",
        "ho_ten": "Phạm Văn Kho",
        "email": "kho@may10.vn",
        "vai_tro": "kho",
        "phong_ban": "Bộ Phận Kho Vận",
        "trang_thai": "hoat_dong"
      },
      "role": "kho",
      "permissions": [
        "dashboard.view",
        "kho.view",
        "kho.nhap",
        "kho.xuat",
        "kho.chuyen",
        "kho.kiem_ke",
        "warehouse.view",
        "warehouse.receipt",
        "warehouse.issue",
        "warehouse.transfer",
        "warehouse.stocktake"
      ]
    }
  }
  ```

### B. Frontend (`authService.js` & `AuthContext.jsx`)
- Bóc tách đúng đối tượng `res.data.data.user` và validate đầy đủ `user.id`, `user.vai_tro`.
- Cơ chế LocalStorage an toàn: Kiểm tra giá trị chuỗi trước khi lưu; bọc `try/catch` bảo vệ khi phục hồi session từ LocalStorage; không lưu chuỗi `"undefined"`.
- Loại bỏ hoàn toàn fallback bí mật sang `admin` hoặc `defaultUserId = 1`. Nếu session không hợp lệ, hệ thống xóa session và chuyển hướng an toàn về đăng nhập.

### C. Routing & Permissions (`permissions.js` & `AppRoutes.jsx`)
- Bổ sung nhóm quyền canonical tiếng Việt cho PH4:
  - `kho.view`: Quyền tra cứu số dư tồn kho, vị trí kệ và lô vải.
  - `kho.nhap`: Lập & duyệt phiếu nhập kho.
  - `kho.xuat`: Lập & duyệt phiếu xuất kho.
  - `kho.chuyen`: Lập phiếu điều chuyển kho nội bộ.
  - `kho.kiem_ke`: Lập phiếu kiểm kê và cân đối kho.
- Route `/warehouse` tại `AppRoutes.jsx` áp dụng chuẩn:
  ```jsx
  <PermissionGuard
    permission="kho.view"
    redirect={true}
    fallback={<Forbidden />}
  >
    <WarehouseModule />
  </PermissionGuard>
  ```

---

## 4. XÁC NHẬN KIỂM THỬ TRÊN TRÌNH DUYỆT (BROWSER VERIFICATION)

Kiểm thử tự động hóa trên Google Chrome Headless thông qua giao thức Chrome DevTools Protocol (CDP):

1. **Đăng nhập Thủ kho (`kho@may10.vn`):**
   - Đăng nhập thành công, URL chuyển về trang chủ `http://localhost:5173/`.
   - LocalStorage ghi nhận chuẩn xác:
     - `erp_role`: `"kho"`
     - `erp_user`: `{"id":"5","ho_ten":"Phạm Văn Kho","vai_tro":"kho",...}`
     - `erp_user_id`: `"5"`
2. **Truy cập Phân hệ PH4 (`http://localhost:5173/warehouse`):**
   - **KẾT QUẢ:** URL giữ nguyên `http://localhost:5173/warehouse?tab=dashboard`. **HOÀN TOÀN KHÔNG BỊ CHUYỂN HƯỚNG SANG /403**.
   - **GIAO DIỆN:** Hiển thị danh tính: **Phạm Văn Kho** — Badge: **Thủ kho** (Không còn hiển thị nhầm là Admin hay Quản trị viên).
   - **DỮ LIỆU THỰC TẾ:**
     - Tổng giá trị tồn kho: **20.487.000 ₫**
     - Mặt hàng có tồn kho: **5 mặt hàng**
     - Cảnh báo thiếu hụt: **3 mặt hàng**
     - Cơ cấu tồn kho: Kho Phụ Liệu May Mặc (9.350.000 ₫), Kho Thành Phẩm May 10 (8.937.000 ₫), Kho Nguyên Phụ Liệu Số 1 (2.200.000 ₫).
3. **Kiểm tra 7 tab nghiệp vụ PH4:**
   - `?tab=ton-kho`: Tải danh sách tồn kho & thẻ kho thành công (200 OK).
   - `?tab=vi-tri`: Tải danh sách kệ, vị trí kho thành công (200 OK).
   - `?tab=lo-vat-tu`: Tải danh sách lô vải, cây vải thành công (200 OK).
   - `?tab=phieu-nhap`: Tải danh sách phiếu nhập kho thành công (200 OK).
   - `?tab=phieu-xuat`: Tải danh sách phiếu xuất kho thành công (200 OK).
   - `?tab=phieu-chuyen`: Tải danh sách phiếu điều chuyển thành công (200 OK).
   - `?tab=kiem-ke`: Tải danh sách phiếu kiểm kê thành công (200 OK).
4. **Kiểm tra Reload / Session Persistence:**
   - Tải lại trang (F5) tại `/warehouse?tab=ton-kho`: Phiên làm việc duy trì 100%, không phát sinh lỗi `TypeError`, không phát sinh `SyntaxError: "undefined" is not valid JSON`.
5. **Kiểm tra Phân quyền Tài khoản Admin:**
   - Đăng nhập tài khoản `admin@may10.com.vn`: Truy cập đầy đủ toàn bộ hệ thống và phân hệ PH4 bình thường mà không bị ảnh hưởng.

---

## 5. BỘ KIỂM THỬ HỒI QUY TOÀN DIỆN (REGRESSION TEST SUITES)

| Tên Test Suite | Lệnh thực thi | Kết quả | Trạng thái |
|:---|:---|:---:|:---:|
| **PH4 REST APIs** | `node backend/tests/test_ph4_api.js` | **16/16 PASS** | **100%** |
| **Concurrency & Race Condition** | `node backend/tests/test_concurrency.js` | **PASS** (`SELECT ... FOR UPDATE` an toàn) | **100%** |
| **RBAC Phase 1 Security Suite** | `node backend/tests/test_rbac_security.js` | **27/27 PASS** (R01 → R27) | **100%** |
| **Frontend Production Build** | `npm run build` (`e:\ERP\frontend`) | **PASS** (`built in 4.94s`, 0 error) | **100%** |

---

## 6. KIỂM ĐỊNH TÍNH TOÀN VẸN CƠ SỞ DỮ LIỆU (DATABASE INTEGRITY)

- **Tổng số bảng trong PostgreSQL `erp_may10`:** **41 bảng** (Không thay đổi, không tạo migration mới).
- **Dữ liệu bảng `nguoi_dung`:**
  - ID 1: `admin@may10.vn` — `vai_tro = 'admin'`
  - ID 2: `banhang@may10.vn` — `vai_tro = 'ban_hang'`
  - ID 3: `sanxuat@may10.vn` — `vai_tro = 'san_xuat'`
  - ID 4: `muahang@may10.vn` — `vai_tro = 'mua_hang'`
  - ID 5: `kho@may10.vn` — `vai_tro = 'kho'`
  - ID 6: `ketoan@may10.vn` — `vai_tro = 'ke_toan'`
- **Cam kết:** Không thực hiện bất kỳ lệnh `INSERT`, `UPDATE`, `DELETE` cấu trúc hay phân quyền nào trên Database.

---

## 7. KIỂM ĐỊNH GIT DIFF (GIT DIFF AUDIT)

Các file chỉnh sửa tuân thủ phạm vi cô lập tuyệt đối:
- **Backend:** 3 files (`roleMapping.js`, `portalController.js`, `auth.js`).
- **Frontend:** 6 files (`authService.js`, `roles.js`, `permissions.js`, `AuthContext.jsx`, `AppRoutes.jsx`, `Forbidden.jsx`).
- **Tài liệu:** 2 files (`13_WAREHOUSE_LOGIN_DATA_BUG_AUDIT.md`, `14_WAREHOUSE_LOGIN_BUG_REMEDIATION.md`).
- **Frozen Zone:** Giữ nguyên 100% CSS Tailwind, Header, Sidebar, MainLayout, Homepage, Database schema và Business logic PH4.

---

## 8. KẾT LUẬN CUỐI CÙNG (FINAL VERDICT)

```
================================================================================
                    FINAL VERDICT:
    REMEDIATED — WAREHOUSE LOGIN DATA RESTORED
================================================================================
```

Tài khoản Thủ kho (`kho@may10.vn`, `vai_tro = "kho"`) đã đăng nhập thành công, được cấp đúng quyền `kho.view`, truy cập bình thường vào phân hệ PH4 (`/warehouse`), và hiển thị đầy đủ 100% dữ liệu thực tế từ cơ sở dữ liệu PostgreSQL `erp_may10`. Toàn bộ 27 test case bảo mật RBAC, 16 test case PH4 API và cơ chế concurrency đều đạt chuẩn 100%.
