# BÁO CÁO KIỂM TOÁN TÍCH HỢP PH3 → PH4
## TRUY VẾT: ĐƠN MUA HÀNG ĐÃ DUYỆT NHƯNG PH4 KHÔNG HIỂN THỊ TRONG "CHỜ NHẬP KHO"

- **Dự án:** ERP May 10
- **Phân hệ liên quan:** PH3 (Mua hàng) ↔ PH4 (Kho & Quản lý vật tư)
- **Môi trường:** `E:\ERP` | Branch: `feature/ph4-core-portal`
- **Cơ sở dữ liệu:** PostgreSQL `erp_may10` (Port 5432)
- **Thời điểm kiểm toán:** 16/09/2026
- **Chế độ kiểm toán:** 🔴 **READ-ONLY AUDIT (KHÔNG SỬA CODE - KHÔNG THAY ĐỔI DB - KHÔNG GIT COMMIT)**

---

## 1. ĐƠN MUA HÀNG (PO) THỰC TẾ ĐƯỢC KIỂM TRA

Đã truy vấn trực tiếp cơ sở dữ liệu `erp_may10` trên bảng `don_mua_hang` và `chi_tiet_don_mua`:

### A. Đơn mua hàng đã duyệt gần nhất trong hệ thống:
- **Mã đơn mua hàng (`ma_don_mua`):** `DMH-20260916-5925`
- **ID đơn hàng:** `91`
- **Mã nhà cung cấp (`ma_nha_cung_cap`):** `1` (`Công Ty Cổ Phần Dệt May Phong Phú`, Code: `NCC001`)
- **Trạng thái hiện tại:** `da_gui_ncc`
- **Ngày đặt hàng:** `2026-09-16T06:00:50.941Z`
- **Tổng thanh toán:** `55,296,000 VND` (Tiền hàng: `51,200,000 VND`, Thuế VAT 8%: `4,096,000 VND`)
- **Tổng số lượng đặt:** `800.000` mét
- **Số lượng đã nhập:** `0.000` mét
- **Số lượng còn nợ cần nhập:** `800.000` mét
- **Chi tiết mặt hàng:**
  - Vật tư ID: `1`
  - Mã vật tư: `VT-VAI-KATE-01`
  - Tên vật tư: `Vải Kate Lụa Trắng Khổ 1.5m`
  - Đơn vị tính: `Mét`
  - Đơn giá: `64,000 VND/m`
  - Thành tiền: `51,200,000 VND`

### B. Đơn mua hàng đang giao dở dang (Partially Received):
- **Mã đơn mua hàng:** `DMH-20260916-4033` (ID: `92`)
- **Trạng thái:** `dang_giao`
- **Tổng đặt:** `1,000.000` m | **Đã nhập:** `500.000` m | **Còn lại:** `500.000` m

### C. Đơn mua hàng chờ duyệt (Pending Approval):
- **Mã đơn mua hàng:** `DMH-20260916-7968` (ID: `87`)
- **Trạng thái:** `cho_duyet`

### D. Dữ liệu E2E lịch sử (Historical Test PO):
- **Mã đơn mua:** `DMH-20260911-9096` (ID: `17`)
- **Nhà cung cấp:** `NCC-2026-8714` (ID: `9`, `Công Ty Dệt Nhuộm E2E Hà Nội`)
- **Phiếu nhập kho PH4 liên kết:** `PNK-20260911-1295` (ID: `200`)
- **Trạng thái hiện tại trong DB:** `da_nhap_kho` (Số lượng đặt: 250m, đã nhập: 250m, tồn kho tăng từ 520m lên 770m).
- **Kết luận về dữ liệu E2E lịch sử:** Dữ liệu này **VẪN CÒN NGUYÊN VẸN TRONG CƠ SỞ DỮ LIỆU**, không bị xóa hay cleanup. Vì đơn này đã nhận đủ 100% (`so_luong_con_lai = 0`), nó không còn nằm trong danh sách chờ nhận hàng (đúng chuẩn nghiệp vụ).

---

## 2. DATABASE EVIDENCE (BẰNG CHỨNG CƠ SỞ DỮ LIỆU)

Thống kê trực tiếp trạng thái các đơn mua hàng trên bảng `don_mua_hang`:
```sql
SELECT trang_thai, COUNT(*) FROM don_mua_hang GROUP BY trang_thai;
```
**Kết quả thực tế từ PostgreSQL:**
- `da_nhap_kho`: 19 đơn
- `dang_giao`: 15 đơn
- `cho_duyet`: 15 đơn
- `da_xac_nhan`: 10 đơn
- `da_gui_ncc`: 8 đơn
- `huy`: 25 đơn
- **Tổng cộng:** 92 đơn mua hàng.

> **ĐẶC BIỆT LƯU Ý:**  
> Trong bảng `don_mua_hang`, **HOÀN TOÀN KHÔNG CÓ** trạng thái nào tên là `da_duyet`.  
> Khác với Phân hệ 2 (Kế hoạch sản xuất có trạng thái `da_duyet`) và Yêu cầu mua sắm PR (`yeu_cau_mua_hang` có trạng thái `da_duyet`), vòng đời State Machine của Đơn mua hàng (PO) trong PH3 được quy chuẩn như sau:  
> `cho_duyet` ➔ `da_gui_ncc` ➔ `da_xac_nhan` ➔ `dang_giao` ➔ `da_nhap_kho` (hoặc `huy`).

---

## 3. TRUY VẾT PH3 (FLOW DUYỆT ĐƠN MUA HÀNG)

- **API lấy danh sách PO:**  
  `GET /api/v1/purchasing/purchase-orders`  
  Controller: `purchasingController.getPurchaseOrders`
- **API duyệt đơn mua hàng:**  
  `POST /api/v1/purchasing/purchase-orders/:id/approve`  
  Controller: `purchasingController.approvePurchaseOrder` (dòng 807 - 870 của `purchasingController.js`)
- **Khi bấm "Duyệt" trên giao diện PH3:**
  - Endpoint gọi: `POST /api/v1/purchasing/purchase-orders/:id/approve`
  - Payload: rỗng `{}` (chỉ truyền `id` trên URL param).
  - Transaction xử lý với khóa bi quan: `SELECT ... FROM don_mua_hang WHERE id = $1 FOR UPDATE`.
  - Cột cập nhật trong DB:
    ```sql
    UPDATE don_mua_hang SET
       trang_thai = 'da_gui_ncc',
       nguoi_cap_nhat = $1,
       ngay_cap_nhat = NOW()
    WHERE id = $2 AND trang_thai = 'cho_duyet'
    RETURNING *;
    ```
- **Trạng thái sau update:** `da_gui_ncc` (Đã gửi nhà cung cấp).
- **Trường biểu thị "Đơn đã sẵn sàng để kho tiếp nhận":**  
  Chính là `trang_thai = 'da_gui_ncc'` kết hợp với `trang_thai IN ('da_gui_ncc', 'da_xac_nhan', 'dang_giao')` và điều kiện số lượng hàng chưa nhận hết (`tong_con_lai > 0`).

---

## 4. TRUY VẾT PH4 “CHỜ NHẬP KHO”

Truy vết màn hình và mã nguồn của cả hai phân hệ:
1. **Màn hình có tên "Chờ nhập kho" trong toàn bộ hệ thống:**
   - Tập tin frontend: `frontend/src/pages/purchasing/ReceivingOrdersPage.jsx`
   - Tiêu đề màn hình: *"Đơn mua hàng chờ giao & kiểm nghiệm nhập kho (PH3 ➔ PH4)"* (sub-tab *"Chờ nhập kho"*).
   - Component entry: `PurchasingModule.jsx` (đường dẫn `/purchasing/receiving`).
   - Service gọi: `getReceivingOrders()` trong `frontend/src/services/purchasingService.js`.
   - Backend endpoint: `GET /api/v1/purchasing/receiving`.
   - Backend controller: `purchasingController.getReceivingOrders` (`purchasingController.js`, dòng 1069 - 1130).
   - Phân quyền backend: `requireRoles('mua_hang', 'kho', 'admin')`.

2. **Màn hình của Phân hệ PH4 (Kho & Quản lý vật tư):**
   - Đường dẫn: `/warehouse`.
   - Tập tin entry: `frontend/src/pages/WarehouseModule.jsx`.
   - **Các sub-tab hiện có của PH4:**
     1. `dashboard`: Tổng quan kho (`DashboardPage.jsx`)
     2. `ton-kho`: Tồn kho & Thẻ kho (`TonKhoPage.jsx`)
     3. `vi-tri`: Vị trí kho (`ViTriKhoPage.jsx`)
     4. `lo-vat-tu`: Lô vật tư & Cây vải (`LoVatTuPage.jsx`)
     5. `phieu-nhap`: Phiếu nhập kho (`PhieuNhapPage.jsx`)
     6. `phieu-xuat`: Phiếu xuất kho (`PhieuXuatPage.jsx`)
     7. `phieu-chuyen`: Điều chuyển kho (`PhieuChuyenPage.jsx`)
     8. `kiem-ke`: Kiểm kê kho (`PhieuKiemKePage.jsx`)
   - **KẾT QUẢ:** Trong PH4 (`WarehouseModule.jsx`) **HOÀN TOÀN KHÔNG CÓ SUB-TAB HOẶC MÀN HÌNH NÀO TÊN LÀ "CHỜ NHẬP KHO"**!

---

## 5. KIỂM TRA ĐIỀU KIỆN SQL CỦA PH4

Truy xuất SQL mà Backend sử dụng cho API `/api/v1/purchasing/receiving`:
```sql
SELECT dmh.id, dmh.ma_don_mua, dmh.ngay_dat_hang, dmh.ngay_giao_hang_yc,
       dmh.trang_thai, dmh.tong_thanh_toan,
       ncc.id AS ma_nha_cung_cap, ncc.ten_nha_cung_cap, ncc.ma_nha_cung_cap AS ncc_code
FROM don_mua_hang dmh
JOIN nha_cung_cap ncc ON dmh.ma_nha_cung_cap = ncc.id
WHERE dmh.trang_thai IN ('da_gui_ncc', 'da_xac_nhan', 'dang_giao')
ORDER BY dmh.id DESC;
```
Kèm truy vấn chi tiết từng dòng mặt hàng:
```sql
SELECT ct.id, ct.ma_vat_tu, ct.so_luong_dat, ct.so_luong_da_nhap,
       (ct.so_luong_dat - ct.so_luong_da_nhap) AS so_luong_can_nhap,
       ct.don_gia,
       vt.ma_vat_tu AS ma_vat_tu_code, vt.ten_vat_tu,
       dvt.ten_don_vi AS ten_dvt
FROM chi_tiet_don_mua ct
JOIN vat_tu vt ON ct.ma_vat_tu = vt.id
LEFT JOIN don_vi_tinh dvt ON vt.ma_don_vi_tinh = dvt.id
WHERE ct.ma_don_mua_hang = $1
ORDER BY ct.id ASC;
```
Và lọc số lượng còn lại:
```javascript
if (tongConLai > 0) {
  receivingOrders.push(...);
}
```

### So sánh điều kiện WHERE với Database hiện tại:
- DB hiện tại sau khi Duyệt: `trang_thai = 'da_gui_ncc'`
- Backend query `WHERE`: `trang_thai IN ('da_gui_ncc', 'da_xac_nhan', 'dang_giao')`
- **KẾT QUẢ ĐỐI CHIẾU:** **MATCH 100%**. Câu lệnh SQL của Backend hoàn toàn tìm thấy đơn mua hàng đã duyệt và còn lượng hàng cần nhập!

---

## 6. KIỂM TRA QUAN HỆ PH3 → PH4

- Khóa ngoại liên kết giữa hai phân hệ:
  `phieu_nhap_kho.ma_don_mua_hang` tham chiếu `don_mua_hang.id`.
- Khi tạo phiếu nhập kho độc lập trong `PhieuNhapPage.jsx` (PH4):
  Trường `ma_don_mua_hang` được lấy từ danh sách tham chiếu chéo `getCrossModuleReferences` (`masterDataController.js`):
  ```sql
  SELECT id, ma_don_mua, ngay_dat_hang, trang_thai FROM don_mua_hang ORDER BY id DESC LIMIT 50;
  ```
  Query này lấy 50 đơn mua hàng gần nhất mà không lọc trạng thái. Đơn hàng ID `91` (`DMH-20260916-5925`) hoàn toàn xuất hiện trong danh sách này.

---

## 7. KIỂM TRA API RESPONSE THỰC TẾ

Đã thực hiện HTTP GET trực tiếp lên máy chủ nội bộ đang chạy trên cổng 5000:
- **API Call:** `GET /api/v1/purchasing/receiving`
- **Xác thực:** Bearer Token ký bằng HMAC-SHA256 bí mật
- **Kiểm thử 3 vai trò:**
  1. `admin` (ID: 1): HTTP Status `200 OK` | Records: `33`
  2. `mua_hang` (ID: 4): HTTP Status `200 OK` | Records: `33`
  3. `kho` (ID: 5, `kho@may10.vn`): HTTP Status `200 OK` | Records: `33`
- **Kiểm tra sự hiện diện của PO thực tế:**
  - PO ID `91` (`DMH-20260916-5925`, `da_gui_ncc`, còn nợ 800m): **CÓ MẶT (YES)**
  - PO ID `92` (`DMH-20260916-4033`, `dang_giao`, còn nợ 500m): **CÓ MẶT (YES)**
  - PO ID `88` (`DMH-20260916-9687`, `dang_giao`, còn nợ 500m): **CÓ MẶT (YES)**
  - PO ID `17` (`DMH-20260911-9096`, `da_nhap_kho`, đã nhận 100%): **KHÔNG CÓ (ĐÚNG)**

---

## 8. KIỂM TRA FRONTEND RENDERING PATH

Dữ liệu Backend API trả về đầy đủ 33 đơn hàng (trong đó có PO 91 vừa duyệt), nhưng tại sao người dùng trong vai trò Kho ("PH4 — Kho & Quản lý vật tư") lại không thấy đơn hàng trong màn hình "Chờ nhập kho"?

### Phân tích luồng thực tế trên giao diện:
1. **Frontend RBAC Permission Gate (`AppRoutes.jsx`):**
   ```jsx
   {/* PH3: Mua hàng */}
   <Route
     path="purchasing/*"
     element={
       <PermissionGuard
         permission="purchasing.view"
         redirect={true}
         fallback={<Forbidden />}
       >
         <PurchasingModule />
       </PermissionGuard>
     }
   />
   ```
2. **Cấu hình menu Sidebar (`frontend/src/config/menu.js`):**
   ```javascript
   {
     group: 'MUA HÀNG (PH3)',
     permission: 'purchasing.view',
     items: [
       ...
       {
         id: 'purchasing-receiving',
         title: 'Chờ nhập kho',
         path: '/purchasing/receiving',
         icon: 'Truck',
         permission: 'purchasing.view',
       },
     ],
   }
   ```
3. **Ma trận quyền hạn thực tế của người dùng Kho (`backend/src/config/roleMapping.js`):**
   ```javascript
   ROLE_PERMISSIONS['kho'] = [
     'dashboard.view',
     'kho.view',
     'kho.nhap',
     'kho.xuat',
     'kho.chuyen',
     'kho.kiem_ke',
     'warehouse.view',
     'warehouse.receipt',
     'warehouse.issue',
     'warehouse.transfer',
     'warehouse.stocktake'
   ];
   ```
   **Nhân viên Kho hoàn toàn KHÔNG CÓ quyền `purchasing.view`!**

4. **Hệ quả trực tiếp trên UI:**
   - Khi nhân viên kho (`kho@may10.vn`) đăng nhập:
     - Header và Sidebar **ẨN TOÀN BỘ** nhóm "MUA HÀNG (PH3)", bao gồm mục "Chờ nhập kho".
     - Nếu nhân viên kho cố gõ trực tiếp URL `/purchasing/receiving`, `PermissionGuard` chặn với màn hình Forbidden / redirect.
   - Khi nhân viên kho ở màn hình PH4 (`/warehouse`):
     - Màn hình PH4 **KHÔNG HỀ CÓ** tab hoặc danh sách "Chờ nhập kho".
     - Trang "Phiếu nhập kho" (`PhieuNhapPage.jsx`) chỉ hiển thị các phiếu nhập đã lập (`phieu_nhap_kho`), chứ không hiển thị danh sách đơn mua hàng đang chờ giao tới kho.
     - Khi bấm nút "Lập phiếu nhập kho", modal chỉ có dropdown chọn `ma_don_mua_hang` từ `crossRef.donMuaHang`, nhưng không hiển thị danh sách vật tư cần nhận, không đối chiếu số lượng đặt và số lượng thực nhận, và không cập nhật trạng thái đơn mua.

---

## 9. ROOT CAUSE CHÍNH XÁC

Có 2 nguyên nhân cốt lõi dẫn đến tình trạng trên:

1. **Xung đột phân quyền Frontend ↔ Backend (RBAC Mismatch):**
   - Backend API `GET /api/v1/purchasing/receiving` đã mở quyền cho vai trò `kho`:  
     `requireRoles('mua_hang', 'kho', 'admin')`.
   - Nhưng Frontend route `/purchasing/*` và menu item "Chờ nhập kho" lại bị khóa cứng bởi quyền `purchasing.view`, mà vai trò `kho` không hề có quyền này. Do đó, thủ kho không thể thấy hoặc mở màn hình "Chờ nhập kho".

2. **Bố trí chức năng lệch phân hệ (Misplaced Feature / UX Gap):**
   - Màn hình *"Chờ nhập kho"* (`ReceivingOrdersPage.jsx`) là màn hình chuyên dụng để kiểm nghiệm và nhập hàng từ đơn mua (PH3 ➔ PH4), nhưng lại được thiết kế nằm độc quyền bên trong module PH3 (`/purchasing/receiving`).
   - Phân hệ PH4 (`/warehouse`) hoàn toàn không có view/tab "Chờ nhập kho", dẫn đến người dùng phụ trách Kho khi làm việc tại phân hệ của mình (PH4) không có bất kỳ giao diện nào để thấy các đơn mua hàng đã duyệt đang chờ nhập về kho.

---

## 10. CLASSIFICATION (PHÂN LOẠI)

### **D. BLOCKED — CONTRACT MISMATCH**
*(Xung đột hợp đồng phân quyền RBAC giữa Frontend và Backend, kết hợp với sự thiếu đồng bộ về phân bổ giao diện giữa PH3 và PH4)*

- Backend SQL: **ĐÃ LẤY ĐƯỢC DỮ LIỆU (PASS)**.
- Database PO: **ĐÚNG TRẠNG THÁI `da_gui_ncc` (PASS)**.
- API Endpoint: **TRẢ VỀ 33 BẢN GHI HỢP LỆ (PASS)**.
- RBAC Frontend & Route: **BỊ CHẶN BỞI `purchasing.view` VÀ THIẾU ENTRYPOINT PH4 (BLOCKED)**.

---

## 11. TẬP TIN LIÊN QUAN (RELEVANT FILES)

1. `backend/src/config/roleMapping.js` (Ma trận quyền `ROLE_PERMISSIONS['kho']`)
2. `frontend/src/routes/AppRoutes.jsx` (Guarded route `/purchasing/*`)
3. `frontend/src/config/menu.js` (Cấu hình quyền hiển thị sidebar menu của `purchasing-receiving`)
4. `frontend/src/pages/WarehouseModule.jsx` (Điều hướng các tab của PH4)
5. `frontend/src/pages/purchasing/ReceivingOrdersPage.jsx` (Giao diện Chờ nhập kho)
6. `backend/src/controllers/purchasingController.js` (Hàm `getReceivingOrders` và `approvePurchaseOrder`)
7. `backend/src/routes/purchasingRoutes.js` (Định tuyến `/receiving` và `/receive-status-update`)
8. `frontend/src/pages/PhieuNhapPage.jsx` (Giao diện lập phiếu nhập kho hiện tại của PH4)

---

## 12. PHẠM VI SỬA ĐỀ XUẤT (PROPOSED FIX SCOPE — CHỈ MÔ TẢ, KHÔNG SỬA CODE)

Để giải quyết triệt để và đúng chuẩn nghiệp vụ ERP May 10 mà không vi phạm quy tắc:

### Giải pháp A (Cấp quyền RBAC - Nhanh nhất & Tối thiểu):
- Cấp bổ sung quyền xem nhận hàng cho vai trò `kho` trong `roleMapping.js`:
  - Thêm `'purchasing.view'` vào danh sách quyền của role `'kho'` (hoặc định nghĩa quyền chuyên biệt `'purchasing.receiving.view'`).
  - Trong `frontend/src/config/menu.js`, cho phép người dùng có quyền `'warehouse.receipt'` hoặc `'kho.nhap'` nhìn thấy menu *"Chờ nhập kho"*.

### Giải pháp B (Tích hợp UI vào PH4 - Trải nghiệm người dùng chuẩn mực):
- Trong PH4 (`WarehouseModule.jsx` và `menu.js` nhóm KHO & VẬT TƯ):
  - Thêm một tab chuyên dụng: *"Chờ nhập kho (PO)"* hoặc tích hợp ngay trong `PhieuNhapPage.jsx`.
  - Tab này tái sử dụng component hoặc gọi API `/api/v1/purchasing/receiving` để thủ kho có thể trực tiếp thấy danh sách các đơn mua hàng đã duyệt đang trên đường giao tới.
  - Khi thủ kho nhấn "Nhận hàng & Nhập kho", hệ thống vừa tạo `phieu_nhap_kho` (cập nhật tồn kho, thẻ kho PH4) vừa gọi `receive-status-update` để đồng bộ hoàn tất PO bên PH3.

---

## VERDICT & ROOT CAUSE

### **VERDICT:**
# **BLOCKED**

### **ROOT CAUSE:**
**Hệ thống Backend PH3 đã tạo và duyệt PO đúng quy trình (`trang_thai = 'da_gui_ncc'`), Backend API `/api/v1/purchasing/receiving` đã trả về đầy đủ 33 đơn chờ nhập (bao gồm cả PO 91 vừa duyệt). Tuy nhiên, nhân sự Phân hệ PH4 (Kho & Quản lý vật tư) không thể nhìn thấy đơn hàng vì:**
1. **Màn hình "Chờ nhập kho" (`ReceivingOrdersPage.jsx`) đang nằm độc quyền tại URL `/purchasing/receiving` thuộc PH3, được bảo vệ bởi quyền `purchasing.view`. Vai trò `kho` bị Frontend RBAC chặn truy cập và ẩn menu hoàn toàn.**
2. **Trong Phân hệ PH4 (`/warehouse`), hoàn toàn chưa có màn hình/tab hoặc điểm gắn kết nào để hiển thị danh sách các đơn mua hàng đang chờ nhập kho.**
