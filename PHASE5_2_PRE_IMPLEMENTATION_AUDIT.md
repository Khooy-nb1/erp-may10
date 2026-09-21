# PHASE 5.2 — PRE-IMPLEMENTATION AUDIT
## EXPOSE PH1 → PH4 FULFILLMENT API + INTEGRATE DELIVERY UI

**Dự án:** ERP May 10  
**Thư mục làm việc:** `E:\ERP`  
**Nhánh Git:** `feature/ph4-core-portal`  
**Thời điểm thực hiện:** 2026-09-17 23:48:00 +07:00  
**Baseline commit:** `8ef0c20` (`feat(ph4): add material master data management`)  

---

## 1. PHÂN TÍCH TỔNG THỂ HỆ THỐNG TRƯỚC TRIỂN KHAI

### 1.1 Git Branch, HEAD & Working Tree Status
- **Current Branch:** `feature/ph4-core-portal`
- **Recent Git Log (Top 5):**
  - `8ef0c20` feat(ph4): add material master data management
  - `1b22ccb` feat(ph4): integrate purchasing receiving workflow
  - `1e14542 fix(ph4): complete stock card running balance
  - `eaf8af0` fix(core): harden authentication and module RBAC
  - `e1c13c8` feat(admin): complete user management
- **Working Tree Audit:**
  - 5 tệp modified tồn đọng từ các phase tích hợp trước (`backend/package.json`, `backend/src/app.js`, `backend/src/validators/vatTuValidator.js`, `frontend/src/config/menu.js`, `frontend/src/routes/AppRoutes.jsx`).
  - Các tệp Phase 5.1 đã hoàn thành và kiểm thử 100%:
    - `backend/src/services/sales/fulfillment.service.js` (NEW)
    - `backend/tests/test_ph1_ph4_fulfillment.js` (NEW)
    - `backend/src/services/sales/delivery.service.js` (MODIFIED)
    - `backend/src/repositories/sales/delivery.repository.js` (MODIFIED)

---

## 2. PHÂN LOẠI TỆP TIN TRIỂN KHAI (FILE CLASSIFICATION MATRIX)

### 2.1 FILE KEEP (Giữ nguyên không thay đổi)
- `backend/src/services/sales/fulfillment.service.js`: Đã hoàn thiện toàn bộ ACID transaction, exclusive lock, auto issue ticket, trừ tồn kho, tính giá vốn bình quân, cập nhật `chi_tiet_don_ban_hang.so_luong_giao`.
- `backend/src/repositories/sales/delivery.repository.js`: Đã có đầy đủ query helper transaction-aware (`findByIdForUpdate`, `findFullDeliveryById`, `getOrderLinesForFulfillment`, `updateOrderLineDeliveredQty`, `updateDeliveryStatusWithClient`).
- `backend/src/middlewares/auth.js`: Đã cung cấp Core HMAC authentication và RBAC helpers (`requireAuth`, `requireRoles`, `requirePermission`).
- `backend/src/config/sales.js`: Cấu hình module Bán hàng.
- `database/schema.sql`: Tuyệt đối không thay đổi cấu trúc bảng.

### 2.2 FILE MODIFY (Điều chỉnh tối thiểu có kiểm soát)
1. `backend/src/routes/sales/deliveries.routes.js`:
   - Bổ sung explicit route `POST /:id/fulfill` bên cạnh `POST /:id/complete` (cả 2 đều trỏ đến fulfillment orchestrator với phân quyền `requireRoles('admin', 'kho')`).
2. `backend/src/routes/salesRoutes.js`:
   - Mount thêm alias `/deliveries` trỏ đến `deliveries.routes` để hỗ trợ cả 2 định dạng URL: `/api/v1/sales/giao-hang/*` và `/api/v1/sales/deliveries/*`.
3. `frontend/src/sales/services/deliveryService.js`:
   - Bổ sung hàm `fulfillDelivery(id)` gọi `POST /sales/giao-hang/:id/fulfill` (hoặc `/complete`).
4. `frontend/src/sales/pages/DeliveryDetailPage.jsx`:
   - Cập nhật nút bấm hành động chuẩn: **"Xuất kho / Hoàn tất giao hàng"** hiển thị cho vai trò `kho` và `admin`.
   - Cập nhật nội dung `AlertDialog` xác nhận rõ: *"Hệ thống sẽ tự động lập Phiếu xuất kho PH4, giảm trừ tồn kho thành phẩm và ghi sổ thẻ kho."*
   - Xóa bỏ banner disclaimer cũ của Phase 2 (*"không tự động trừ tồn kho..."*).
   - Xử lý mã lỗi chi tiết hiển thị toast thông báo nghiệp vụ chuẩn:
     - `DELIVERY_ALREADY_DISPATCHED` (409): *"Đợt giao hàng này đã được xuất kho xử lý trước đó"* $\rightarrow$ tự động nạp lại dữ liệu (`fetchDelivery`).
     - `INSUFFICIENT_STOCK` (409): *"Không đủ tồn kho khả dụng để xuất hàng"*.
     - `FINISHED_GOODS_NOT_MAPPED` / `PRODUCT_MATERIAL_MAPPING_NOT_FOUND` (422): *"Sản phẩm chưa được cấu hình liên kết thành phẩm trong kho"*.
     - `DELIVERY_QUANTITY_EXCEEDED` (409): *"Số lượng giao vượt quá số lượng còn lại của đơn hàng"*.
     - Transaction failure / 500: Thông báo lỗi và đồng bộ lại trạng thái.
5. `frontend/src/routes/AppRoutes.jsx`:
   - Đảm bảo vai trò `kho` và `admin` có thể truy cập màn hình `/sales/deliveries/:id` thông qua `permissions={['sales.view', 'kho.view', 'kho.xuat']}`.

### 2.3 FILE NEW (Tạo mới)
1. `backend/tests/test_ph5_2_fulfillment_api_ui.js`:
   - Suite kiểm thử runtime thực tế cho Phase 5.2: Kiểm tra endpoint API `/api/v1/sales/giao-hang/:id/fulfill`, `/api/v1/sales/deliveries/:id/fulfill`, kiểm tra RBAC (`ban_hang` trả về 403, `kho`/`admin` trả về 200), kiểm tra Idempotency (gọi lại trả về 409), kiểm tra biến động dữ liệu DB và thẻ kho.
2. `PHASE5_2_PRE_IMPLEMENTATION_AUDIT.md`: Tệp tài liệu này.
3. `PHASE5_2_INTEGRATION_AUDIT.md`: Báo cáo nghiệm thu Phase 5.2 sau triển khai.

### 2.4 FILE DO_NOT_TOUCH (Đóng băng tuyệt đối — FROZEN)
- `backend/src/controllers/tonKhoController.js`
- `backend/src/routes/tonKhoRoutes.js`
- `backend/tests/test_ph4_fr11_stock_card.js`
- `database/schema.sql`
- `database/migrations/*`
- Logic Sổ thẻ kho FR-11 (`getTheKho`, running balance, opening balance, ISSUE, RECEIPT).
- Mã nguồn các phân hệ: PH2 Production, PH3 Purchasing, PH5 Finance.

---

## 3. AUDIT ĐỐI SOÁT API & ĐIỀU PHỐI (API AUDIT)

### 3.1 Hiện trạng API Fulfillment
- Phase 5.1 đã liên kết hàm `completeDelivery(id, updaterId)` trong `delivery.service.js` với `fulfillmentService.dispatchFulfillmentDelivery(id, updaterId)`.
- Endpoint hiện có:
  `POST /api/v1/sales/giao-hang/:id/complete` (Gated: `requireRoles('admin', 'kho')`).

### 3.2 API Cần Bổ Sung / Expose Trong Phase 5.2
1. Bổ sung endpoint rõ ràng theo tài liệu nghiệp vụ:
   `POST /api/v1/sales/giao-hang/:id/fulfill`
   và alias:
   `POST /api/v1/sales/deliveries/:id/fulfill`
2. Bảo lưu nguyên vẹn:
   `POST /api/v1/sales/giao-hang/:id/complete`
   để giữ vững 100% tương thích hồi quy cho bộ test `test_ph1_sales_api.js` và `test_ph1_business_parity.js`.

---

## 4. AUDIT GIAO DIỆN NGƯỜI DÙNG (DELIVERY UI AUDIT)

### 4.1 Hiện trạng `DeliveryDetailPage.jsx`
- Đã có hook trạng thái `delivery`, nút `handleComplete`, modal `AlertDialog`.
- Tuy nhiên:
  - Text mô tả còn mang tính chất disclaimer cũ từ thời điểm Phase 2 chưa nối kho: *"Quy trình đầu phiếu, không trừ tồn kho vật tư"*.
  - Chưa xử lý phân tách các mã lỗi nghiệp vụ mới từ Fulfillment Orchestrator (409 `DELIVERY_ALREADY_DISPATCHED`, 409 `INSUFFICIENT_STOCK`, 422 `FINISHED_GOODS_NOT_MAPPED`, 409 `DELIVERY_QUANTITY_EXCEEDED`).
  - Phân quyền UI: Đã kiểm tra `isWarehouseOrAdmin = hasAnyRole(user, ['kho', 'admin'])`. Nhân viên `ban_hang` không nhìn thấy nút này.

### 4.2 Cải tiến cần thực hiện trong Phase 5.2
- Đổi tên và ngữ nghĩa nút: **"Xuất kho / Hoàn tất giao hàng"** (Icon `Check`).
- Hiển thị cho cả trường hợp đợt giao ở trạng thái `cho_giao` và `dang_giao` (vì orchestrator chấp nhận cả 2 trạng thái này).
- Cập nhật text trong dialog xác nhận: giải thích rõ việc tự động xuất kho PH4 và cập nhật thẻ kho.
- Cập nhật hàm xử lý lỗi: bắt đúng `err.errorCode` hoặc `err.code` để đưa ra thông báo thân thiện và điều phối `fetchDelivery()` đồng bộ lại giao diện khi gặp lỗi xung đột trạng thái.

---

## 5. AUDIT PHÂN QUYỀN RBAC (BACKEND & FRONTEND)

| Vai trò (Role) | Thao tác xem Giao hàng | Thao tác Bắt đầu vận chuyển | Thao tác Xuất kho / Hoàn tất giao hàng (Fulfillment) | Kết quả mong đợi tại Backend |
|:---|:---:|:---:|:---:|:---:|
| **ban_hang** (Kinh doanh) | CÓ | KHÔNG | **KHÔNG** (Ẩn nút, nếu cố tình gọi API $\rightarrow$ HTTP 403 Forbidden) | **HTTP 403 FORBIDDEN** |
| **kho** (Thủ kho) | CÓ | CÓ | **CÓ** (Hiển thị nút, thực hiện xuất kho thành công) | **HTTP 200 OK** |
| **admin** (Quản trị viên) | CÓ | CÓ | **CÓ** (Toàn quyền thực thi) | **HTTP 200 OK** |
| **san_xuat / mua_hang / ke_toan** | KHÔNG | KHÔNG | **KHÔNG** (Không có quyền vào route) | **HTTP 403 FORBIDDEN** |
| **Anonymous** (Không token) | KHÔNG | KHÔNG | **KHÔNG** (Bị từ chối ngay tại cửa ngõ) | **HTTP 401 UNAUTHORIZED** |

---

## 6. AUDIT KẾ HOẠCH KIỂM THỬ (TEST STRATEGY)

### 6.1 Các Bộ Test Hiện Tại Cần Giữ 100% PASS
1. `backend/tests/test_ph1_ph4_fulfillment.js` (17 tests)
2. `backend/tests/test_ph1_validation.js` (69 tests)
3. `backend/tests/test_ph1_business_parity.js` (70 tests)
4. `backend/tests/test_ph1_sales_api.js` (123 tests)
5. `backend/tests/test_ph4_fr11_stock_card.js` (10 tests)
6. `backend/tests/test_ph4_api.js` (16 tests)
7. `backend/tests/test_rbac_security.js` (27 tests)
8. `backend/tests/test_ph2_production.js` (38 tests)
9. `backend/tests/test_ph3_purchasing.js` (58 tests)
10. `backend/tests/test_ph5_finance.js` (24 tests)

### 6.2 Bộ Test Cần Bổ Sung (Phase 5.2 Specific)
- `backend/tests/test_ph5_2_fulfillment_api_ui.js`:
  - Test 1: Route `POST /api/v1/sales/giao-hang/:id/fulfill` với role `ban_hang` $\rightarrow$ Phản hồi HTTP 403.
  - Test 2: Route `POST /api/v1/sales/deliveries/:id/fulfill` với role `ban_hang` $\rightarrow$ Phản hồi HTTP 403.
  - Test 3: Route `POST /api/v1/sales/giao-hang/:id/fulfill` với role `kho` $\rightarrow$ Phản hồi HTTP 200.
  - Test 4: Gọi lại lần 2 $\rightarrow$ Phản hồi HTTP 409 `DELIVERY_ALREADY_DISPATCHED`.
  - Test 5: Route alias `/api/v1/sales/deliveries/:id/fulfill` với role `admin` $\rightarrow$ Nhận diện route và thực thi đúng.
  - Test 6: Kiểm tra các trường cơ sở dữ liệu sau fulfillment: `giao_hang.trang_thai = 'da_giao'`, `phieu_xuat_kho` được sinh, `ton_kho` giảm, thẻ kho ISSUE -1000 được ghi nhận.

---

## 7. KẾT LUẬN AUDIT & ĐÁNH GIÁ BLOCKER

- **Blocker phát hiện:** KHÔNG CÓ (0 Blocker).
- **Tính khả thi:** 100%. Nền tảng Phase 5.1 đã hoàn tất đầy đủ logic lõi; Phase 5.2 chỉ tập trung mở rộng endpoint API và hoàn thiện trải nghiệm giao diện người dùng.
- **Quyết định:** SẴN SÀNG TRIỂN KHAI PHASE 5.2.
