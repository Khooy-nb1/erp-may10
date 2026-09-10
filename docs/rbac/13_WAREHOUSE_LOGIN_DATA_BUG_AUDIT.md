# BÁO CÁO ĐIỀU TRA LỖI TRUY CẬP DỮ LIỆU TÀI KHOẢN THỦ KHO (AUDIT ONLY)
## PHÂN TÍCH TOÀN DIỆN NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)
### DỰ ÁN: TỔNG CÔNG TY MAY 10 — HỆ THỐNG QUẢN TRỊ ERP
**Tài liệu:** `13_WAREHOUSE_LOGIN_DATA_BUG_AUDIT.md`  
**Trạng thái:** AUDIT COMPLETED — ZERO CODE CHANGE — ZERO DATABASE CHANGE  
**Ngày thực hiện:** 10/09/2026  
**Chuyên viên kiểm toán:** Senior ERP Security & Integration Architect  

---

## TỔNG QUAN VẤN ĐỀ (EXECUTIVE SUMMARY)

Sau khi ban hành và chuẩn hóa RBAC Contract theo 6 vai trò chuẩn tiếng Việt (`admin`, `ban_hang`, `san_xuat`, `mua_hang`, `kho`, `ke_toan`), phát sinh hiện tượng:
> **"Tài khoản THỦ KHO (`kho@may10.vn`) đăng nhập thành công vào hệ thống nhưng toàn bộ dữ liệu phân hệ PH4 (Kho & Vật tư) không hiển thị hoặc bị từ chối truy cập (chuyển hướng sang trang lỗi 403 Forbidden)."**

Theo quy trình kiểm định nghiêm ngặt (**Audit Only — Zero Code Change / Zero DB Change**), đội ngũ kiểm toán đã thực hiện truy vết luồng dữ liệu end-to-end từ Database PostgreSQL, REST API Backend, Middleware xác thực, Token Payload đến Frontend State Management (AuthContext), Storage và UI Routing Guard.

### KẾT LUẬN SƠ BỘ (KEY TAKEAWAYS):
1. **Dữ liệu Database và Backend API PH4 hoạt động hoàn hảo 100%:** Toàn bộ bảng dữ liệu (`nguoi_dung`, `kho`, `vat_tu`, `ton_kho`, `phieu_nhap`, `phieu_xuat`,...) trong cơ sở dữ liệu `erp_may10` đều đầy đủ, toàn vẹn và hợp lệ. Tất cả các endpoint API PH4 (`/api/v1/ton-kho`, `/api/v1/ton-kho/dashboard`, `/api/v1/vi-tri-kho`,...) khi được gọi trực tiếp bằng token hợp lệ đều phản hồi `HTTP 200 OK` với dữ liệu chính xác.
2. **Bộ test hồi quy Backend đạt chuẩn 100%:**
   - `test_ph4_api.js`: **16/16 tests PASS (100%)**
   - `test_concurrency.js`: **100% PASS** (Chặn race condition bằng `SELECT ... FOR UPDATE` trong Transaction)
   - `test_rbac_security.js`: **27/27 tests PASS (100%)**
3. **Nguyên nhân cốt lõi (Root Cause):** Lỗi bắt nguồn từ **3 sai lệch dây chuyền (Cascade Mismatch)** giữa quy ước định danh vai trò (Role Naming), cấu trúc phản hồi API `/auth/me` (Response Contract Mismatch), và cơ chế nạp quyền trong Frontend AuthContext:
   - **Sai lệch 1 (Role Code Mismatch):** Database lưu `vai_tro = 'kho'`, nhưng `portalController.js` và `roleMapping.js` tự động chuyển đổi sang mã tiếng Anh `'warehouse'`. Frontend chỉ cấu hình quyền và siêu dữ liệu cho mã tiếng Việt `'kho'`, hoàn toàn không có định nghĩa cho `'warehouse'`.
   - **Sai lệch 2 (Response Schema Mismatch trên `/auth/me`):** Endpoint `GET /api/v1/auth/me` trả về đối tượng dẹt `{ data: { ...user, role, permissions } }` thay vì lồng `{ data: { user: { ... }, role, permissions } }`. File `authService.js` đọc `res.data.data.user` bị `undefined`, ghi đè chuỗi `"undefined"` vào `localStorage['erp_user']`, gây sập `JSON.parse` và làm gãy hoàn toàn hàm khởi tạo phiên `initAuth()`.
   - **Sai lệch 3 (Permission Empty Array & 403 Redirect):** Do không nạp được quyền, `AuthContext` rơi vào trạng thái rỗng `permissions = []`. Khi truy cập `/warehouse`, `PermissionGuard` kiểm tra `hasPermission('warehouse.view')` trả về `false`, lập tức chuyển hướng người dùng sang `/403 Forbidden` và hiển thị sai tiêu đề thành *"Quản trị viên Hệ thống (warehouse)"*.

---

## PHẦN I: TRUY VẾT CƠ SỞ DỮ LIỆU POSTGRESQL

Kiểm tra trực tiếp trong PostgreSQL `erp_may10`, bảng `nguoi_dung`:
```sql
SELECT id, ho_ten, email, vai_tro, phong_ban, trang_thai 
FROM nguoi_dung 
WHERE vai_tro = 'kho' OR email LIKE '%kho%';
```

**Kết quả truy vấn thực tế:**
| id | ho_ten | email | vai_tro | phong_ban | trang_thai |
|:---|:---|:---|:---|:---|:---|
| 5 | Phạm Văn Kho | kho@may10.vn | **kho** | Bộ Phận Kho Vận | **hoat_dong** |

**Đánh giá:**
- Bản ghi người dùng hoàn toàn nguyên vẹn, hợp lệ và đang ở trạng thái `hoat_dong`.
- Giá trị trường `vai_tro` trong DB chính xác là **`kho`** (chuẩn tiếng Việt theo RBAC Contract).

---

## PHẦN II: TRUY VẾT BACKEND CONTROLLER & ROLE MAPPING

### 1. Luồng xử lý tại `backend/src/controllers/portalController.js`
Trong hàm `login(req, res)`:
```javascript
// Tra cứu user từ database
const user = result.rows[0]; // vai_tro = 'kho'

const standardRole = normalizeRole(user.vai_tro); // Gọi normalizeRole('kho')
const permissions = ROLE_PERMISSIONS[standardRole] || ROLE_PERMISSIONS.warehouse;

const token = signToken(user.id);

res.json({
  success: true,
  message: `Đăng nhập thành công với vai trò [${standardRole.toUpperCase()}].`,
  data: {
    user,
    role: standardRole, // <--- TRẢ VỀ "warehouse" THAY VÌ "kho"
    permissions,
    token,
  },
});
```

### 2. Định nghĩa tại `backend/src/config/roleMapping.js`
```javascript
const CANONICAL_ROLES = {
  ADMIN: 'ADMIN',
  WAREHOUSE: 'WAREHOUSE',
  ...
};

const ROLE_MAPPING = {
  'kho': CANONICAL_ROLES.WAREHOUSE, // 'WAREHOUSE'
  'warehouse': CANONICAL_ROLES.WAREHOUSE,
  ...
};

function normalizeRole(rawRole) {
  if (!rawRole) return 'warehouse';
  const canonical = canonicalNormalizeRole(rawRole);
  if (!canonical) return 'warehouse';
  return canonical.toLowerCase(); // <--- 'WAREHOUSE'.toLowerCase() === 'warehouse'
}
```
**Hậu quả:** 
Dù người dùng trong DB có `vai_tro = 'kho'`, API đăng nhập trả về:
```json
{
  "success": true,
  "data": {
    "user": { "id": "5", "vai_tro": "kho", "ho_ten": "Phạm Văn Kho" },
    "role": "warehouse",
    "permissions": ["dashboard.view", "warehouse.view", "warehouse.receipt", "warehouse.issue", "warehouse.transfer", "warehouse.stocktake"],
    "token": "erp_token_5_..."
  }
}
```

---

## PHẦN III: LỖI SCHEMA MISMATCH & CRASH JSON TẠI ENDPOINT `/auth/me`

### 1. Phản hồi thực tế của `GET /api/v1/auth/me`
File `backend/src/controllers/portalController.js` (dòng 50-57):
```javascript
res.json({
  success: true,
  data: {
    ...user, // <--- Flattening trực tiếp các trường id, ho_ten, email, vai_tro
    role: standardRole,
    permissions,
  },
});
```
Phản hồi JSON thực tế trả về browser:
```json
{
  "success": true,
  "data": {
    "id": "5",
    "ho_ten": "Phạm Văn Kho",
    "email": "kho@may10.vn",
    "vai_tro": "kho",
    "phong_ban": "Bộ Phận Kho Vận",
    "trang_thai": "hoat_dong",
    "role": "warehouse",
    "permissions": ["dashboard.view", "warehouse.view", "warehouse.receipt", "warehouse.issue", "warehouse.transfer", "warehouse.stocktake"]
  }
}
```

### 2. Cách tiếp nhận và bóc tách tại `frontend/src/services/authService.js`
Dòng 86-94 trong `authService.js`:
```javascript
const res = await api.get('/auth/me');
if (res.data && res.data.success) {
  const { user, role, permissions } = res.data.data; // <--- res.data.data KHÔNG HỀ CÓ thuộc tính 'user'
  localStorage.setItem(USER_KEY, JSON.stringify(user)); // <--- JSON.stringify(undefined) => lưu chuỗi "undefined"
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(USER_ID_KEY, String(user.id)); // <--- THROW ERROR: TypeError: Cannot read properties of undefined (reading 'id')
  return res.data.data;
}
```

### 3. Hậu quả dây chuyền của lỗi crash:
1. Lệnh `user.id` ném ra ngoại lệ `TypeError`.
2. Khối `catch (e)` được kích hoạt:
   `console.warn('Lấy thông tin /auth/me thất bại, dùng cached session:', e.message)`
3. Code nhảy xuống khối `Local fallback`:
   ```javascript
   const rawUser = localStorage.getItem(USER_KEY); // Trả về chuỗi "undefined"
   const currentRole = localStorage.getItem(ROLE_KEY) || 'admin';
   const roleInfo = ROLE_DETAILS[currentRole] || ROLE_DETAILS.admin;

   const user = rawUser
     ? JSON.parse(rawUser) // <--- CRASH: SyntaxError: "undefined" is not valid JSON
     : { ... };
   ```
4. Tại `frontend/src/components/rbac/AuthContext.jsx` (dòng 18-32):
   ```javascript
   const initAuth = async () => {
     try {
       const data = await authService.getMe(); // Bị văng ngoại lệ SyntaxError
       if (data && data.user) {
         setUser(data.user);
         setRole(data.role);
         setPermissions(data.permissions || ROLE_PERMISSIONS[data.role] || []);
       }
     } catch (err) {
       console.warn('Lỗi đồng bộ xác thực ban đầu:', err); // In ra console cảnh báo lỗi
     } finally {
       setLoading(false);
     }
   };
   ```
5. `setPermissions` **hoàn toàn không bao giờ được gọi** để cập nhật quyền từ server!

---

## PHẦN IV: CƠ CHẾ KHỞI TẠO STATE VÀ SỰ BIẾN MẤT CỦA PERMISSIONS

Khi trang web tải hoặc reload, `AuthContext` khởi tạo state ban đầu (dòng 9-13):
```javascript
const [user, setUser] = useState(authService.getCurrentUser());
const [role, setRole] = useState(authService.getCurrentRole()); // Đọc ra 'warehouse'
const [permissions, setPermissions] = useState(
  ROLE_PERMISSIONS[authService.getCurrentRole()] || [] // Tìm ROLE_PERMISSIONS['warehouse']
);
```

Kiểm tra file cấu hình `frontend/src/config/permissions.js`:
```javascript
export const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS),
  kho: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.WAREHOUSE_VIEW,
    PERMISSIONS.WAREHOUSE_RECEIPT,
    PERMISSIONS.WAREHOUSE_ISSUE,
    PERMISSIONS.WAREHOUSE_TRANSFER,
    PERMISSIONS.WAREHOUSE_STOCKTAKE,
  ],
  warehouse_manager: [ ... ],
  ban_hang: [ ... ],
  san_xuat: [ ... ],
  mua_hang: [ ... ],
  ke_toan: [ ... ],
};
```
**Phát hiện chí mạng:**
- Trong `ROLE_PERMISSIONS`, khóa quyền của Thủ kho là **`kho`**, **HOÀN TOÀN KHÔNG CÓ KHÓA `'warehouse'`**!
- Do đó, `ROLE_PERMISSIONS['warehouse']` trả về `undefined`.
- State `permissions` trong React được gán giá trị mặc định là **mảng rỗng: `[]`**!

---

## PHẦN V: ĐIỀU TRA ĐIỀU HƯỚNG ROUTING & TRANG LỖI 403 FORBIDDEN

### 1. Tại `frontend/src/routes/AppRoutes.jsx`:
```jsx
{/* PH4: Kho & Quản lý vật tư (Audited & Frozen) */}
<Route
  path="warehouse/*"
  element={
    <PermissionGuard
      permission="warehouse.view"
      redirect={true}
      fallback={<Forbidden />}
    >
      <WarehouseModule />
    </PermissionGuard>
  }
/>
```

### 2. Tại `frontend/src/components/rbac/PermissionGuard.jsx`:
```javascript
const { hasPermission } = useAuth();

let isAllowed = hasPermission('warehouse.view');

if (isAllowed) {
  return <>{children}</>;
}

if (redirect) {
  return <Navigate to="/403" replace />; // <--- CHUYỂN HƯỚNG NGAY LẬP TỨC ĐẾN /403
}
```

### 3. Tại `frontend/src/components/rbac/AuthContext.jsx`:
```javascript
const hasPermission = (permissionCode) => {
  if (!permissionCode) return true;
  if (role === 'admin') return true; // role là 'warehouse' => không phải admin
  return permissions.includes(permissionCode); // permissions là [] => includes() trả về FALSE!
};
```

### 4. Tại `frontend/src/pages/Forbidden.jsx`:
```jsx
const { role, roleMeta } = useAuth();
// role = 'warehouse'
// ROLE_DETAILS['warehouse'] là undefined
// roleMeta = ROLE_DETAILS[role] || ROLE_DETAILS.admin => Fallback sang ROLE_DETAILS.admin!
// ROLE_DETAILS.admin.name = 'Quản trị viên Hệ thống'
```
Kết quả render trên màn hình:
> **"Tài khoản của đồng chí đang đăng nhập với vai trò Quản trị viên Hệ thống (warehouse), không có đặc quyền warehouse.view để thực hiện thao tác trên Phân hệ yêu cầu."**

Người dùng Thủ kho bị chặn 100% không thể vào phân hệ PH4, dù tài khoản hoàn toàn hợp lệ và có quyền thật sự trong database!

---

## PHẦN VI: BẰNG CHỨNG THỰC NGHIỆM TRÊN CHROME HEADLESS (E2E CDP EVIDENCE)

Chạy kịch bản tự động hóa trên Chrome Headless (CDP Trace):
1. **Đăng nhập form:** Gửi email `kho@may10.vn`, mật khẩu `password`.
   - Request `POST /api/v1/auth/login` phản hồi `200 OK`.
   - LocalStorage được ghi nhận:
     ```json
     {
       "token": "erp_token_5_1789009282361...",
       "role": "warehouse",
       "user": "{\"id\":\"5\",\"ho_ten\":\"Phạm Văn Kho\",\"email\":\"kho@may10.vn\",\"vai_tro\":\"kho\",\"phong_ban\":\"Bộ Phận Kho Vận\",\"trang_thai\":\"hoat_dong\"}",
       "userId": "5"
     }
     ```
2. **Khởi tạo `/auth/me`:**
   - Request `GET /api/v1/auth/me` phản hồi `200 OK`.
   - Console ghi nhận lỗi nghiêm trọng:
     ```
     [warning] Lấy thông tin /auth/me thất bại, dùng cached session: Cannot read properties of undefined (reading 'id')
     [warning] Lỗi đồng bộ xác thực ban đầu: SyntaxError: "undefined" is not valid JSON
         at JSON.parse (<anonymous>)
         at Object.getMe (authService.js:104:14)
         at async initAuth (AuthContext.jsx:34:22)
     ```
3. **Truy cập đường dẫn `/warehouse`:**
   - Trình duyệt bị redirect ngay lập tức sang: `http://localhost:5173/403`.
   - Nội dung hiển thị:
     `MÃ LỖI 403 — TRUY CẬP BỊ TỪ CHỐI`
     `Không Đủ Quyền Hạn Truy Cập`
     `Tài khoản của đồng chí đang đăng nhập với vai trò Quản trị viên Hệ thống (warehouse)...`
   - File ảnh bằng chứng đã lưu:
     - `scratch/home_as_kho.png`
     - `scratch/warehouse_as_kho.png`

---

## PHẦN VII: KẾT QUẢ KIỂM THỬ HỒI QUY HỆ THỐNG (REGRESSION TEST RESULTS)

| Test Suite | File thực thi | Kết quả | Ghi chú an toàn |
|:---|:---|:---:|:---|
| **PH4 Business APIs** | `backend/tests/test_ph4_api.js` | **16/16 PASS (100%)** | Toàn bộ 8 màn hình và quy trình Nhập - Xuất - Chuyển - Kiểm kê hoạt động chính xác tuyệt đối. |
| **Concurrency & Deadlock** | `backend/tests/test_concurrency.js` | **100% PASS** | Khóa dòng `SELECT ... FOR UPDATE` bảo vệ an toàn tồn kho, triệt tiêu race condition. |
| **RBAC Phase 1 Security** | `backend/tests/test_rbac_security.js` | **27/27 PASS (100%)** | Kiểm tra R01 → R27: Chặn mạo danh token, chặn leo thang quyền, bảo vệ API nhạy cảm. |

---

## PHẦN VIII: BẢNG TỔNG HỢP NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE MATRIX)

| STT | Vị trí phát sinh | Hiện tượng | Nguyên nhân kỹ thuật | Mức độ nghiêm trọng |
|:---:|:---|:---|:---|:---:|
| **RC-01** | `backend/src/controllers/portalController.js` & `roleMapping.js` | Login trả về `role: 'warehouse'` thay vì `role: 'kho'`. | Hàm `normalizeRole` tự ý chuyển mã vai trò tiếng Việt `'kho'` sang mã tiếng Anh `'warehouse'`, đi ngược lại với chuẩn RBAC Contract 6 role tiếng Việt. | **CRITICAL** |
| **RC-02** | `backend/src/controllers/portalController.js` (`getMe`) | Response `GET /auth/me` trả về `{ data: { ...user, role, permissions } }`. | Backend không bọc thông tin người dùng trong thuộc tính `user: { ... }` như hợp đồng của `login`, làm gãy code đọc dữ liệu ở Frontend. | **CRITICAL** |
| **RC-03** | `frontend/src/services/authService.js` (`getMe`) | Bị crash với `TypeError: Cannot read properties of undefined (reading 'id')` và `SyntaxError: "undefined" is not valid JSON`. | Frontend đọc `res.data.data.user` không phòng vệ (defensive check), lưu chuỗi `"undefined"` vào LocalStorage và parse JSON lỗi. | **CRITICAL** |
| **RC-04** | `frontend/src/config/permissions.js` & `roles.js` | `ROLE_PERMISSIONS['warehouse']` và `ROLE_DETAILS['warehouse']` không tồn tại. | Frontend định nghĩa theo 6 role chuẩn tiếng Việt (`kho`, `ban_hang`,...), không có key `'warehouse'`, dẫn đến quyền bị fallback về `[]`. | **HIGH** |
| **RC-05** | `frontend/src/routes/AppRoutes.jsx` & `PermissionGuard.jsx` | Người dùng bị chuyển hướng sang `/403 Forbidden` khi vào `/warehouse`. | Do `permissions = []`, hàm `hasPermission('warehouse.view')` trả về `false`, kích hoạt chuyển hướng cưỡng bức tới trang lỗi 403. | **HIGH** |

---

## PHẦN IX: ĐỀ XUẤT KẾ HOẠCH KHẮC PHỤC CÓ KIỂM SOÁT (CONTROLLED REMEDIATION PLAN)

> [!IMPORTANT]
> **CAM KẾT AN TOÀN TUYỆT ĐỐI:**
> Không sửa đổi cấu trúc Database, không sửa đổi nghiệp vụ PH4, không sửa đổi giao diện Core Portal V2.11, không làm thay đổi các quy tắc bảo mật RBAC Phase 1 đã được thẩm định.

### Bước 1: Chuẩn hóa Role Code trên Backend (`portalController.js` & `roleMapping.js`)
- Đảm bảo `normalizeRole('kho')` trả về mã chuẩn **`kho`** (hoặc hỗ trợ chuẩn hóa đồng nhất 6 vai trò: `admin`, `ban_hang`, `san_xuat`, `mua_hang`, `kho`, `ke_toan`).
- Khi người dùng `kho` đăng nhập hoặc gọi `/auth/me`, trường `role` phản hồi chính xác là `'kho'` (đồng thời giữ alias backward-compatible nếu cần).

### Bước 2: Chuẩn hóa cấu trúc dữ liệu trả về của `/auth/me` trên Backend
- Sửa hàm `getMe` trong `portalController.js` để trả về định dạng nhất quán với `login`:
  ```javascript
  res.json({
    success: true,
    data: {
      user,
      role: standardRole,
      permissions,
    },
  });
  ```

### Bước 3: Nâng cấp cơ chế phòng vệ (Defensive Parsing) trong `authService.js` (Frontend)
- Cập nhật hàm `getMe()` và `login()` trong `authService.js` để hỗ trợ cả 2 định dạng phản hồi (dù `user` nằm lồng trong `data.user` hay dẹt trong `data`):
  ```javascript
  const user = res.data.data.user || res.data.data;
  const role = res.data.data.role || user.vai_tro || 'kho';
  ```
- Kiểm tra hợp lệ trước khi `JSON.stringify` và `JSON.parse` để triệt tiêu vĩnh viễn lỗi crash `SyntaxError: "undefined" is not valid JSON`.

### Bước 4: Bổ sung Alias tương thích trong Frontend `roles.js` và `permissions.js`
- Bổ sung alias hai chiều trong `ROLE_DETAILS` và `ROLE_PERMISSIONS` cho cả `'kho'` và `'warehouse'`, đảm bảo hệ thống luôn tìm thấy quyền và metadata ngay cả khi có sự chuyển tiếp giữa các phiên bản.

### Bước 5: Kiểm định End-to-End sau sửa lỗi
- Thực thi kiểm tra đăng nhập bằng Chrome Headless cho tài khoản `kho@may10.vn`.
- Xác nhận truy cập mượt mà vào `/warehouse`, hiển thị đầy đủ số liệu tồn kho, bảng biểu, vị trí kho, lô hàng mà không gặp bất kỳ lỗi 403 nào.
- Chạy lại toàn bộ 3 bộ test suite hồi quy Backend (`test_ph4_api.js`, `test_concurrency.js`, `test_rbac_security.js`) để xác nhận 100% PASS.

---

## KẾT LUẬN KIỂM TOÁN (FINAL VERDICT)

```
================================================================================
STATUS: ROOT CAUSE IDENTIFIED — ZERO CODE/DB MODIFICATION APPLIED
DEFECT TYPE: AUTH CONTRACT SCHEMA MISMATCH & ROLE ALIAS DESYNCHRONIZATION
READINESS: READY FOR CONTROLLED REMEDIATION UPON USER CONFIRMATION
================================================================================
```
Báo cáo này hoàn thành đầy đủ nhiệm vụ điều tra độc lập. Đội ngũ kiểm toán đã đóng băng toàn bộ mã nguồn và sẵn sàng tiến hành khắc phục có kiểm soát ngay khi nhận được chỉ thị phê duyệt từ Quản trị dự án.
