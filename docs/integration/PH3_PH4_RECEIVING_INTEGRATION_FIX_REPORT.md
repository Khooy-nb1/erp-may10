# BÁO CÁO NGHIỆM THU TÍCH HỢP ĐƠN MUA HÀNG PH3 ➔ NHẬP KHO PH4
## CONTROLLED BUSINESS LOGIC FIX — PH3 TO PH4 RECEIVING INTEGRATION

- **Hệ thống:** ERP Tổng Công Ty May 10
- **Phân hệ thực thi:** PH3 (Mua hàng) ↔ PH4 (Kho & Quản lý vật tư)
- **Môi trường:** `E:\ERP` | Branch: `feature/ph4-core-portal`
- **Cơ sở dữ liệu:** PostgreSQL 18.6 (`erp_may10`)
- **Ngày hoàn tất:** 16/09/2026
- **Cam kết:** **KHÔNG PHÁ RBAC — KHÔNG SỬA `tonKhoController.js` — KHÔNG GIT COMMIT/PUSH**

---

## 1. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE)

Trước khi thực hiện sửa lỗi:
1. **Frontend RBAC Block:** Màn hình *"Chờ nhập kho"* duy nhất của hệ thống (`ReceivingOrdersPage.jsx`) được đặt tại URL `/purchasing/receiving` thuộc PH3, được bảo vệ bằng quyền `purchasing.view`. Vai trò `kho` không sở hữu `purchasing.view` nên bị Frontend chặn hoàn toàn (ẩn khỏi menu và bị `PermissionGuard` chặn 403 khi gõ URL).
2. **Thiếu tính năng tại PH4:** Trong phân hệ PH4 (`/warehouse`), không có màn hình hoặc tab nào hiển thị danh sách các đơn mua hàng đang chờ nhập kho để thủ kho tiếp nhận.
3. **Chưa đồng bộ 2 chiều:** Khi lập phiếu nhập kho tại PH4 có liên kết `ma_don_mua_hang`, hệ thống chưa tự động cập nhật số lượng đã nhập (`chi_tiet_don_mua.so_luong_da_nhap`) và chưa cập nhật trạng thái đơn mua (`don_mua_hang.trang_thai`).

---

## 2. CÁC TẬP TIN ĐÃ THAY ĐỔI (FILES CHANGED)

| STT | Tập tin | Phân loại | Mục đích thay đổi |
|:---:|---|---|---|
| 1 | `backend/src/controllers/phieuNhapController.js` | Backend Controller | Trong cùng transaction ACID của `createPhieuNhap`, tự động cập nhật `chi_tiet_don_mua.so_luong_da_nhap` và chuyển trạng thái `don_mua_hang` sang `da_nhap_kho` (hoặc `dang_giao`). |
| 2 | `frontend/src/services/api.js` | Frontend API Client | Export hàm `getReceivingOrders()` gọi endpoint `/purchasing/receiving`. |
| 3 | `frontend/src/config/menu.js` | Menu Configuration | Bổ sung menu item *"Chờ nhập kho"* (`/warehouse?tab=cho-nhap`) vào nhóm `KHO & VẬT TƯ` với quyền `warehouse.receipt`. |
| 4 | `frontend/src/pages/WarehouseModule.jsx` | PH4 Layout Entry | Hỗ trợ điều hướng tab `cho-nhap` dẫn trực tiếp tới chế độ xem đơn chờ nhập. |
| 5 | `frontend/src/pages/PhieuNhapPage.jsx` | PH4 Receipt UI | Thêm tab *"Đơn mua hàng chờ nhập kho"* hiển thị danh sách PO đã duyệt (gọi `getReceivingOrders()`), nút "Nhập kho" tự động nạp PO vào modal lập phiếu nhập. |

> **BẢO TOÀN NGUYÊN VẸN:**  
> `backend/src/controllers/tonKhoController.js` (commit `1e14542`) **GIỮ NGUYÊN 100% KHÔNG CHỈNH SỬA**.

---

## 3. HỢP ĐỒNG PHÂN QUYỀN (PERMISSION CONTRACT)

- **Nguyên tắc RBAC:** Tuyệt đối **KHÔNG GÁN** quyền `purchasing.view` cho vai trò `kho`.
- **Thẩm quyền tại PH4:** Sử dụng quyền nghiệp vụ hiện có của thủ kho: `warehouse.receipt` (hoặc `kho.nhap`).
- **Thẩm quyền Backend API:**
  - Endpoint `GET /api/v1/purchasing/receiving` và `POST /api/v1/phieu-nhap`:
    Chỉ cho phép `kho`, `admin` (và `mua_hang` đối với purchasing).
  - Vai trò `ban_hang`, `san_xuat` bị từ chối với HTTP 403 Forbidden.
  - Người dùng ẩn danh bị từ chối với HTTP 401 Unauthorized.

---

## 4. HỢP ĐỒNG API (API CONTRACT)

### 1. Tra cứu đơn mua chờ nhập:
- **Method:** `GET`
- **Path:** `/api/v1/purchasing/receiving`
- **Headers:** `Authorization: Bearer <token_kho>`
- **Response Status:** `200 OK`
- **Output:** Mảng các PO có `trang_thai IN ('da_gui_ncc', 'da_xac_nhan', 'dang_giao')` và `tong_con_lai > 0`.

### 2. Tạo phiếu nhập kho và đồng bộ PO:
- **Method:** `POST`
- **Path:** `/api/v1/phieu-nhap`
- **Payload:**
  ```json
  {
    "ma_kho_nhap": 1,
    "loai_nhap": "tu_mua_hang",
    "ma_don_mua_hang": 91,
    "nguoi_giao_hang": "Công Ty Cổ Phần Dệt May Phong Phú",
    "ghi_chu": "Nhập kho từ đơn mua hàng DMH-20260916-5925",
    "chiTiet": [
      {
        "ma_vat_tu": 1,
        "so_luong_nhap": 800,
        "don_gia_nhap": 64000
      }
    ]
  }
  ```
- **Response Status:** `201 Created`

---

## 5. LUỒNG GIAO DIỆN (UI FLOW)

```
[Người dùng vai trò Kho hoặc Admin]
         ↓
Vào Menu: "KHO & VẬT TƯ" ➔ "Chờ nhập kho" (/warehouse?tab=cho-nhap)
         ↓
Hệ thống hiển thị Tab "Đơn mua hàng chờ nhập kho"
(Hiển thị PO DMH-20260916-5925, NCC Phong Phú, 800m Vải Kate, Còn lại: 800m)
         ↓
Thủ kho nhấn nút "Nhập kho" trên dòng PO 91
         ↓
Modal "Lập Phiếu Nhập Kho Mới" tự động mở ra:
- Tự chọn nguồn: "Từ đơn mua hàng (PH3)"
- Tự gắn liên kết: DMH-20260916-5925 (ID 91)
- Tự điền người giao: Công Ty Cổ Phần Dệt May Phong Phú
- Tự điền chi tiết: Mặt hàng VT-VAI-KATE-01, Số lượng: 800m, Đơn giá: 64,000đ
         ↓
Thủ kho chọn vị trí cất và nhấn "Xác nhận lập phiếu"
         ↓
Hệ thống báo Toast thành công, tự động chuyển đơn sang đã hoàn tất,
tăng tồn kho lên 867m và ghi nhận Sổ thẻ kho RECEIPT.
```

---

## 6. BẰNG CHỨNG KIỂM THỬ E2E TRÊN ĐƠN HÀNG THẬT (PO 91)

Đã thực hiện kịch bản E2E toàn diện bằng dữ liệu thực tế:

### Snapshot trước khi nhập:
- **Đơn mua hàng ID 91 (`DMH-20260916-5925`):**
  - Trạng thái: `da_gui_ncc`
  - `so_luong_dat`: `800.000` m
  - `so_luong_da_nhap`: `0.000` m
  - Còn lại chờ nhập: `800.000` m
- **Tồn kho VT 1 tại Kho 1:** `so_luong_ton = 67.000` m | `gia_tri_ton_kho = 4,325,000 VND`
- **Phiếu nhập kho gần nhất:** ID `258`

### Thực thi nhận hàng qua vai trò Kho (ID: 5, `kho@may10.vn`):
- Gọi `POST /api/v1/phieu-nhap` với payload liên kết PO 91, nhập `800.000` m.
- **Kết quả HTTP:** `201 Created` (Tạo phiếu `PNK-20260916-7364`, ID `259`).

### Xác minh dữ liệu sau khi nhập:
1. **Bảng `phieu_nhap_kho`:**
   - Phiếu mới ID `259` (`PNK-20260916-7364`), `ma_don_mua_hang = 91`, `loai_nhap = 'tu_mua_hang'`, `trang_thai = 'da_nhap'`.
2. **Bảng `chi_tiet_phieu_nhap`:**
   - Bản ghi chi tiết gắn với phiếu 259, `ma_vat_tu = 1`, `so_luong_nhap = 800.000`.
3. **Bảng `ton_kho`:**
   - Tồn kho ban đầu: `67.000` m
   - Số lượng nhập: `+800.000` m
   - Tồn kho sau nhập: `867.000` m (Tăng chính xác 100%).
   - Giá trị tồn kho: `55,525,000 VND`.
4. **Bảng `chi_tiet_don_mua` (PH3):**
   - `so_luong_da_nhap`: `800.000` m (khớp 100% số lượng đặt).
5. **Bảng `don_mua_hang` (PH3):**
   - Trạng thái tự động chuyển sang: `da_nhap_kho`.
6. **Sổ Thẻ Kho (PH4 FR-11 Stock Card):**
   - Truy vấn `GET /api/v1/ton-kho/the-kho?ma_kho=1&ma_vat_tu=1`:
     - Biến động mới nhất:
       - `movement_type`: `RECEIPT`
       - `loai_bien_dong`: `nhap_kho`
       - `ma_chung_tu`: `PNK-20260916-7364`
       - `quantity_change`: `+800`
       - `running_balance`: `867` (Khớp chính xác với số dư tồn kho cuối kỳ).
7. **Hàng đợi chờ nhận:**
   - Gọi lại `GET /api/v1/purchasing/receiving`: PO 91 **không còn xuất hiện** trong danh sách chờ vì đã hoàn tất 100%. Số đơn chờ giảm từ 33 xuống 32 đơn.

---

## 7. KẾT QUẢ KIỂM THỬ PHÂN QUYỀN (RBAC SECURITY RESULTS)

| Test Case | Actor / Role | Thao tác | Kỳ vọng | Kết quả thực tế | Đánh giá |
|:---:|---|---|:---:|:---:|:---:|
| RBAC-01 | Anonymous | `GET /api/v1/purchasing/receiving` | 401 Unauthorized | HTTP 401 | ✅ **PASS** |
| RBAC-02 | `ban_hang` (User 2) | `GET /api/v1/purchasing/receiving` | 403 Forbidden | HTTP 403 | ✅ **PASS** |
| RBAC-03 | `san_xuat` (User 3) | `GET /api/v1/purchasing/receiving` | 403 Forbidden | HTTP 403 | ✅ **PASS** |
| RBAC-04 | `mua_hang` (User 4) | `GET /api/v1/purchasing/receiving` | 200 OK | HTTP 200 | ✅ **PASS** |
| RBAC-05 | `kho` (User 5) | `GET /api/v1/purchasing/receiving` | 200 OK | HTTP 200 | ✅ **PASS** |
| RBAC-06 | `admin` (User 1) | `GET /api/v1/purchasing/receiving` | 200 OK | HTTP 200 | ✅ **PASS** |
| RBAC-07 | `kho` (User 5) | Truy cập `/warehouse?tab=cho-nhap` | Hiển thị PO chờ nhập | Hiển thị 33 PO | ✅ **PASS** |
| RBAC-08 | `kho` (User 5) | Quyền `purchasing.view` | Không có trong role | `hasPermission('purchasing.view') = false` | ✅ **PASS** |

---

## 8. KẾT QUẢ TOÀN BỘ CÁC BỘ KIỂM THỬ HỒI QUY (REGRESSION RESULTS)

| Bộ kiểm thử (Suite) | Lệnh thực thi | Số ca kiểm thử | Kết quả | Trạng thái |
|---|---|:---:|:---:|:---:|
| **PH4 FR-11 Stock Card** | `node backend/tests/test_ph4_fr11_stock_card.js` | 10 / 10 | 10 PASS, 0 FAIL | ✅ **100% PASS** |
| **PH4 REST API Suite** | `node backend/tests/test_ph4_api.js` | 16 / 16 | 16 PASS, 0 FAIL | ✅ **100% PASS** |
| **RBAC Security Suite** | `node backend/tests/test_rbac_security.js` | 27 / 27 | 27 PASS, 0 FAIL | ✅ **100% PASS** |
| **PH2 Production Suite** | `node backend/tests/test_ph2_production.js` | 38 / 38 | 38 PASS, 0 FAIL | ✅ **100% PASS** |
| **PH3 Purchasing Suite** | `npm run test:ph3` | 58 / 58 | 58 PASS, 0 FAIL | ✅ **100% PASS** |
| **PH5 Finance Suite** | `node backend/tests/test_ph5_finance.js` | 24 / 24 | 24 PASS, 0 FAIL | ✅ **100% PASS** |
| **Frontend Production Build** | `npm run build` | 1,761 modules | Zero error (6.77s) | ✅ **PASS** |

---

## 9. PHẠM VI GIT DIFF (GIT DIFF AUDIT)

Lệnh `git status --short` xác nhận các tệp chỉnh sửa trong task này:
- `backend/src/controllers/phieuNhapController.js` (+38 dòng logic đồng bộ PO trong ACID transaction)
- `frontend/src/services/api.js` (+1 dòng export `getReceivingOrders`)
- `frontend/src/config/menu.js` (+7 dòng menu `wh-cho-nhap`)
- `frontend/src/pages/WarehouseModule.jsx` (+2 dòng case `cho-nhap`)
- `frontend/src/pages/PhieuNhapPage.jsx` (+tab view Chờ nhập kho & liên kết nạp PO)

**CAM KẾT TUÂN THỦ:**
- KHÔNG chỉnh sửa `tonKhoController.js`.
- KHÔNG thay đổi cấu trúc database, không tạo migration mới.
- KHÔNG stage (`git add`), KHÔNG commit, KHÔNG push.

---

## VERDICT:
# **PASS — PH3 → PH4 RECEIVING INTEGRATION VERIFIED**
*(QUY TRÌNH DUYỆT ĐƠN MUA HÀNG PH3 ➔ HIỂN THỊ CHỜ NHẬP PH4 ➔ TẠO PHIẾU NHẬP ➔ TĂNG TỒN KHO ➔ GHI SỔ THẺ KHO RECEIPT RUNNING BALANCE ĐÃ ĐƯỢC XÁC MINH HOÀN TOÀN THÀNH CÔNG BẰNG DỮ LIỆU THỰC TẾ TRÊN TOÀN BỘ HỆ THỐNG)*
