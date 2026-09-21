# BÁO CÁO THẨM TRA TOÀN DIỆN & XỬ LÝ LỖI HIỂN THỊ PHÂN HỆ GLOBAL HEADER THEO RBAC
**DỰ ÁN ERP TỔNG CÔNG TY MAY 10 — HỆ THỐNG QUẢN TRỊ DOANH NGHIỆP TẬP ĐOÀN**  
**Tài liệu tham chiếu:** `docs/core-portal/21_GLOBAL_HEADER_FULL_RBAC_MODULE_VISIBILITY_AUDIT.md`  
**Ngày thực hiện:** 16/09/2026  
**Trạng thái kiểm tra:** Hoàn tất thẩm định & Sửa đổi có kiểm soát (100% Tests Pass)

---

## I. TỔNG QUAN VẤN ĐỀ & BẰNG CHỨNG THỰC TẾ

### 1. Hiện tượng ghi nhận
Trên giao diện Web Browser của Hệ thống ERP May 10, người dùng đăng nhập với các vai trò không thuộc bộ phận Kho Vận (`ke_toan`, `mua_hang`, `san_xuat`, `ban_hang`) vẫn nhìn thấy phân hệ **"Kho & Vật tư - PH4"** hiển thị trên thanh điều hướng chính (Global Header).

Cụ thể:
- **Case 1 (Kế toán):** User Hoàng Thị Toán (`ketoan@may10.vn`, vai trò `ke_toan`) đang ở phân hệ PH5 (Tài chính & Kế toán), nhưng Global Header vẫn hiển thị thẻ điều hướng `Kho & Vật tư - PH4`.
- **Case 2 (Mua hàng):** User Lê Thị Mua (`muahang@may10.vn`, vai trò `mua_hang`) đang ở phân hệ PH3 (Mua hàng), nhưng Global Header vẫn hiển thị thẻ điều hướng `Kho & Vật tư - PH4`.
- **Case 3 (Sản xuất):** User Trần Văn Xuất (`sanxuat@may10.vn`, vai trò `san_xuat`) đang ở phân hệ PH2 (Sản xuất), nhưng Global Header vẫn hiển thị thẻ điều hướng `Kho & Vật tư - PH4`.
- **Case 4 (Bán hàng):** User Nguyễn Văn Bán (`banhang@may10.vn`, vai trò `ban_hang`) đang ở phân hệ PH1 (Kinh doanh), nhưng Global Header cũng hiển thị thẻ điều hướng `Kho & Vật tư - PH4`.

---

## II. KẾT QUẢ ĐIỀU TRA READ-ONLY & NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE)

### 1. Cơ chế lọc điều hướng của Global Header (`Header.jsx`)
Trong file `frontend/src/components/layout/Header.jsx`:
- Mảng `TOP_NAV_SECTIONS` định nghĩa 7 phân hệ chính của tập đoàn:
  - `home` (Trang chủ): Không yêu cầu quyền (mọi người dùng đều thấy).
  - `sales` (Kinh doanh): Yêu cầu quyền `sales.view`.
  - `production` (Sản xuất): Yêu cầu quyền `production.view`.
  - `purchasing` (Mua hàng): Yêu cầu quyền `purchasing.view`.
  - `warehouse` (Kho & Vật tư): Yêu cầu quyền `warehouse.view`.
  - `accounting` (Tài chính): Yêu cầu quyền `accounting.view`.
  - `admin` (Quản trị): Yêu cầu quyền `admin.users`.
- Thuật toán lọc thanh điều hướng (Dòng 224–236):
  ```javascript
  const authorizedSections = TOP_NAV_SECTIONS.filter((section) => {
    if (!section.permission) return true;
    if (role === 'admin') return true;
    return hasPermission(section.permission);
  });
  ```
  Hàm `hasPermission(permissionCode)` kiểm tra xem `permissions` của tài khoản hiện hành có chứa `permissionCode` hay không.

### 2. Nguyên nhân gốc rễ (Root Cause Analysis)
Qua đối chiếu mã nguồn tại:
1. `backend/src/config/roleMapping.js`
2. `frontend/src/config/permissions.js`

Phát hiện lỗi cấu hình ma trận phân quyền:
- Trong ma trận `SALES_PERMISSIONS`, `PRODUCTION_PERMISSIONS`, `PURCHASING_PERMISSIONS`, và `ACCOUNTING_PERMISSIONS`, cả hai quyền `'kho.view'` và `'warehouse.view'` đã bị gán nhầm vào danh mục đặc quyền của tất cả 4 vai trò trên.
- **Hệ quả trực tiếp:**
  1. Khi người dùng (`ke_toan`, `mua_hang`, `san_xuat`, `ban_hang`) đăng nhập, API `POST /api/v1/auth/login` trả về danh sách `permissions` chứa `warehouse.view` và `kho.view`.
  2. Tại Frontend, `hasPermission('warehouse.view')` trả về `true` cho tất cả các vai trò.
  3. Phân hệ `warehouse` (`Kho & Vật tư - PH4`) vượt qua bộ lọc `authorizedSections` và hiển thị trên Global Header.
  4. Ngoài ra, tại `AppRoutes.jsx`, tuyến đường `/warehouse/*` được bảo vệ bởi `<PermissionGuard permission="kho.view">` cũng không chặn được người dùng non-warehouse khi họ nhập trực tiếp URL vào trình duyệt.

---

## III. GIẢI PHÁP KHẮC PHỤC CÓ KIỂM SOÁT (CONTROLLED REMEDIATION)

Tuân thủ nghiêm ngặt nguyên tắc:
- Không hard-code theo email, username hoặc ID người dùng.
- Không tạo role mới hoặc can thiệp vào kiến trúc RBAC Core.
- Không sửa đổi cấu trúc CSDL hoặc nghiệp vụ của các module PH1–PH5.

### 1. Chuẩn hóa ma trận quyền tại Backend (`backend/src/config/roleMapping.js`)
Loại bỏ đặc quyền `kho.view` và `warehouse.view` ra khỏi 4 vai trò nghiệp vụ độc lập:
- `SALES_PERMISSIONS` (`ban_hang`): Chỉ giữ `dashboard.view` và các quyền `sales.*`.
- `PRODUCTION_PERMISSIONS` (`san_xuat`): Chỉ giữ `dashboard.view` và các quyền `production.*`.
- `PURCHASING_PERMISSIONS` (`mua_hang`): Chỉ giữ `dashboard.view` và các quyền `purchasing.*`.
- `ACCOUNTING_PERMISSIONS` (`ke_toan`): Chỉ giữ `dashboard.view` và các quyền `accounting.*`.
- Vai trò `kho`: Tiếp tục nắm giữ đầy đủ quyền vận hành kho (`kho.*` và `warehouse.*`).
- Vai trò `admin`: Nắm giữ toàn bộ đặc quyền hệ thống.

### 2. Đồng bộ hóa ma trận quyền tại Frontend (`frontend/src/config/permissions.js`)
Đồng bộ hóa đối tượng `ROLE_PERMISSIONS` cho `ban_hang`, `san_xuat`, `mua_hang`, và `ke_toan`, loại bỏ `PERMISSIONS.KHO_VIEW` và `PERMISSIONS.WAREHOUSE_VIEW`.

### 3. Tăng cường bảo vệ Header Notification (`frontend/src/components/layout/Header.jsx`)
Tại dropdown thông báo vận hành, liên kết "Xem tất cả" được kiểm tra phân quyền động:
```jsx
<Link
  to={hasPermission('warehouse.view') ? '/warehouse?tab=ton-kho' : '/'}
  onClick={() => setShowNotifMenu(false)}
  className="text-[11px] text-[#0F5FAF] hover:underline font-medium"
>
  Xem tất cả
</Link>
```

---

## IV. KẾT QUẢ ĐỐI SOÁT & MA TRẬN HIỂN THỊ SAU KHẮC PHỤC

### 1. Ma trận phân hệ hiển thị trên Global Header theo từng vai trò
Sau khi áp dụng giải pháp, thuật toán lọc của Global Header cho ra kết quả chuẩn xác 100%:

| Vai trò Doanh nghiệp | Tài khoản mẫu | Danh mục phân hệ hiển thị trên Global Header | Đánh giá |
| :--- | :--- | :--- | :---: |
| `admin` | `admin@may10.vn` | `[Trang chủ, Kinh doanh, Sản xuất, Mua hàng, Kho & Vật tư, Tài chính, Quản trị]` | **PASS** |
| `ban_hang` | `banhang@may10.vn` | `[Trang chủ, Kinh doanh]` | **PASS** |
| `san_xuat` | `sanxuat@may10.vn` | `[Trang chủ, Sản xuất]` | **PASS** |
| `mua_hang` | `muahang@may10.vn` | `[Trang chủ, Mua hàng]` | **PASS** |
| `kho` | `kho@may10.vn` | `[Trang chủ, Kho & Vật tư]` | **PASS** |
| `ke_toan` | `ketoan@may10.vn` | `[Trang chủ, Tài chính]` | **PASS** |

### 2. Kiểm tra bảo vệ đường dẫn trực tiếp (Direct URL Protection)
Khi người dùng thuộc các vai trò không có thẩm quyền nhập trực tiếp đường dẫn `/warehouse` vào thanh địa chỉ:
- `<PermissionGuard permission="kho.view">` kiểm tra thấy tài khoản không sở hữu đặc quyền `kho.view`.
- Hệ thống tự động kích hoạt điều hướng an toàn về trang `/403` (Forbidden Access) với giao diện từ chối truy cập chuẩn mực của May 10.

---

## V. KẾT QUẢ HỒI QUY TOÀN DIỆN (REGRESSION VERIFICATION)

Toàn bộ các bộ kiểm thử tự động của hệ thống đều vượt qua 100%:

1. **Kiểm tra phản hồi thực tế từ API Backend (`POST /api/v1/auth/login`):**
   - `admin@may10.vn`: `warehouse.view=true, kho.view=true` -> **PASS**
   - `banhang@may10.vn`: `warehouse.view=false, kho.view=false` -> **PASS**
   - `sanxuat@may10.vn`: `warehouse.view=false, kho.view=false` -> **PASS**
   - `muahang@may10.vn`: `warehouse.view=false, kho.view=false` -> **PASS**
   - `kho@may10.vn`: `warehouse.view=true, kho.view=true` -> **PASS**
   - `ketoan@may10.vn`: `warehouse.view=false, kho.view=false` -> **PASS**

2. **Kiểm thử Bảo mật & Phân quyền RBAC (`test_rbac_security.js`):**
   - **27/27 test cases ĐẠT CHUẨN (100% PASS)**
   - R01 -> R27 vượt qua mọi rào chắn bảo mật (chặn Header injection, chống leo thang đặc quyền, xác thực chữ ký số HMAC, ngăn chặn giả mạo).

3. **Kiểm thử nghiệp vụ PH4 (`npm run test:api`):**
   - **16/16 test cases ĐẠT CHUẨN (100% PASS)**

4. **Kiểm thử nghiệp vụ PH2 (`npm run test:ph2` & `test:ph2:concurrency`):**
   - **38/38 functional tests ĐẠT CHUẨN (100% PASS)**
   - **7/7 concurrency tests ĐẠT CHUẨN (100% PASS)**

5. **Kiểm thử nghiệp vụ PH3 (`npm run test:ph3` & `test:ph3:concurrency`):**
   - **58/58 functional tests ĐẠT CHUẨN (100% PASS)**
   - **9/9 concurrency tests ĐẠT CHUẨN (100% PASS)**

6. **Kiểm thử nghiệp vụ PH5 (`npm run test:ph5`):**
   - **24/24 functional tests ĐẠT CHUẨN (100% PASS)**

7. **Kiểm thử Concurrency kho chung (`npm run test:concurrency`):**
   - Cơ chế PostgreSQL `SELECT ... FOR UPDATE` trong Transaction khóa dòng tuyệt đối an toàn.

8. **Kiểm thử Build Frontend (`npm run build`):**
   - `vite build`: Chuyển dịch thành công 1,760 modules không lỗi.

---

## VI. BẢNG CHECKLIST NGHIỆM THU

- [x] PH1 visibility đúng (`ban_hang` thấy PH1, các role khác không thấy)
- [x] PH2 visibility đúng (`san_xuat` thấy PH2, các role khác không thấy)
- [x] PH3 visibility đúng (`mua_hang` thấy PH3, các role khác không thấy)
- [x] PH4 visibility đúng (`kho` thấy PH4, các role khác không thấy)
- [x] PH5 visibility đúng (`ke_toan` thấy PH5, các role khác không thấy)
- [x] `ke_toan` không thấy PH4
- [x] `mua_hang` không thấy PH4
- [x] `san_xuat` không thấy PH4
- [x] `ban_hang` không thấy PH4
- [x] `kho` thấy PH4
- [x] `admin` đúng theo toàn bộ permission
- [x] Không hard-code email
- [x] Không hard-code username
- [x] Không hard-code user ID
- [x] Không tạo role mới
- [x] Không tạo RBAC engine mới
- [x] Không thay đổi Core Auth
- [x] Không thay đổi database
- [x] Không thay đổi business logic PH2
- [x] Không thay đổi business logic PH3
- [x] Không thay đổi business logic PH4
- [x] Không thay đổi business logic PH5
- [x] Backend authorization vẫn hoạt động
- [x] Direct URL vẫn được bảo vệ
- [x] Build Frontend PASS
- [x] RBAC regression PASS
- [x] Module regression PASS

---

## VII. FINAL VERDICT

```
============================================================
PASS — READY TO FREEZE
============================================================
```
