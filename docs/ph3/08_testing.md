# BÁO CÁO VÀ TÀI LIỆU KIỂM THỬ PHÂN HỆ MUA HÀNG (PH3 TEST SUITE)
**Hệ thống:** ERP May 10  
**Phân hệ:** PH3 - Mua hàng & Nhà cung cấp  
**Kết quả tổng thể:** 100% PASS (47/47 Test Cases)  
**Ngày thực hiện:** 11/09/2026  

---

## 1. Tóm tắt Kết quả Kiểm thử

| Bộ kiểm thử (Test Suite) | File thực thi | Tổng số test | PASS | FAIL | Tỷ lệ đạt |
|---|---|:---:|:---:|:---:|:---:|
| **Bộ kiểm thử Chức năng (12 tiêu chí)** | `backend/tests/test_ph3_purchasing.js` | 38 | 38 | 0 | **100%** |
| **Bộ kiểm thử Tranh chấp & Đồng thời** | `backend/tests/test_ph3_concurrency.js` | 9 | 9 | 0 | **100%** |
| **Kiểm tra cú pháp Backend** | `node -c src/app.js` | - | PASS | 0 | **100%** |
| **Kiểm tra biên dịch Frontend** | `npm run build` (Vite) | 1,708 modules | PASS | 0 | **100%** |
| **TỔNG CỘNG** | | **47** | **47** | **0** | **100% PASS** |

---

## 2. Chi tiết Bộ Kiểm thử Chức năng 12 Tiêu chí (`test:ph3`)

```
================================================================
🧪 BẮT ĐẦU BỘ KIỂM THỬ TOÀN DIỆN 12 TIÊU CHÍ PH3 (MUA HÀNG & NCC)
================================================================
```

### Tiêu chí 1: Create supplier (Tạo nhà cung cấp mới)
- ✅ `[PASS]` Tạo NCC trả về HTTP 201 Created
- ✅ `[PASS]` Mã NCC đúng: `NCC-TEST-8123`
- ✅ `[PASS]` Trạng thái NCC ban đầu: `hoat_dong`

### Tiêu chí 2: Create PO (Tạo mới đơn mua hàng)
- ✅ `[PASS]` Tạo PO trả về HTTP 201 Created
- ✅ `[PASS]` Trạng thái PO ban đầu là `cho_duyet`
- ✅ `[PASS]` Đã lưu đủ 2 mặt hàng trong `chi_tiet_don_mua`
- ✅ `[PASS]` Tính toán tổng thanh toán chính xác (Kỳ vọng: 38,124,000 VNĐ, Thực tế: 38,124,000 VNĐ - VAT 8%)

### Tiêu chí 3: Approve PO (Phê duyệt đơn mua)
- ✅ `[PASS]` Duyệt PO trả về HTTP 200 OK
- ✅ `[PASS]` Trạng thái PO sau khi duyệt chuyển sang `da_gui_ncc`

### Tiêu chí 4: Reject invalid quantity & price (Chặn số lượng âm/bằng 0)
- ✅ `[PASS]` Số lượng <= 0 bị từ chối với HTTP 400 Bad Request (Mã lỗi: `VALIDATION_ERROR`)
- ✅ `[PASS]` Đơn giá < 0 bị từ chối với HTTP 400 Bad Request

### Tiêu chí 5: Unauthorized (Kiểm tra xác thực)
- ✅ `[PASS]` Không có token bị từ chối với HTTP 401 Unauthorized (Mã lỗi: `UNAUTHORIZED`)
- ✅ `[PASS]` Token giả mạo sai chữ ký HMAC bị từ chối với HTTP 401

### Tiêu chí 6: Forbidden (Kiểm tra phân quyền RBAC)
- ✅ `[PASS]` Vai trò không được cấp phép (`ban_hang`) bị từ chối với HTTP 403 Forbidden (Mã lỗi: `FORBIDDEN`)

### Tiêu chí 7: Duplicate approval (Chống duyệt trùng lặp)
- ✅ `[PASS]` Duyệt lại PO đã duyệt trả về HTTP 409 Conflict (Mã lỗi: `CONFLICT`)

### Tiêu chí 8: Cancel PO & Duplicate Cancel (Hủy đơn an toàn)
- ✅ `[PASS]` Hủy đơn PO thành công trả về HTTP 200 OK
- ✅ `[PASS]` Trạng thái PO chuyển sang `huy`
- ✅ `[PASS]` Hủy lại PO đã hủy trả về HTTP 409 Conflict (Chống Double Cancel)

### Tiêu chí 9: PO waiting receiving (Danh sách chờ nhập kho)
- ✅ `[PASS]` Tra cứu đơn chờ nhập kho trả về HTTP 200 OK
- ✅ `[PASS]` Dữ liệu trả về là danh sách mảng chuẩn
- ✅ `[PASS]` Tìm thấy đơn PO đủ điều kiện trong danh sách
- ✅ `[PASS]` Số lượng còn lại chờ nhập > 0

### Tiêu chí 10: Partial receiving (Nhập kho một phần hàng)
- ✅ `[PASS]` Nhập hàng một phần trả về HTTP 200 OK
- ✅ `[PASS]` Trạng thái PO tự động cập nhật sang `dang_giao`
- ✅ `[PASS]` Cờ trạng thái hoàn thành: `false`

### Tiêu chí 11: Full receiving (Nhập kho đủ 100% hàng còn lại)
- ✅ `[PASS]` Nhập hàng đủ trả về HTTP 200 OK
- ✅ `[PASS]` Trạng thái PO tự động chuyển sang `da_nhap_kho` khi đủ 100%
- ✅ `[PASS]` Cờ trạng thái hoàn thành: `true`

### Tiêu chí 12: PH3 -> PH4 contract (Khóa ngoại và hợp đồng dữ liệu)
- ✅ `[PASS]` Tạo phiếu nhập kho PH4 liên kết `ma_don_mua_hang` thành công
- ✅ `[PASS]` Khóa ngoại `ma_don_mua_hang` khớp 100% ID đơn mua
- ✅ `[PASS]` Core Homepage contract endpoint (`/api/v1/purchasing/core-kpi`) trả về 200 OK
- ✅ `[PASS]` Số liệu PO và NCC phản ánh thực tế từ database

---

## 3. Chi tiết Bộ Kiểm thử Tranh chấp Đồng thời (`test:ph3:concurrency`)

```
================================================================
⚡ BẮT ĐẦU KIỂM THỬ TRANH CHẤP & ĐỒNG THỜI (CONCURRENCY LOCKING)
================================================================
```

### Kịch bản 1: Tranh chấp phê duyệt đồng thời (Race Condition: Double Approval)
- Bắn đồng thời 10 requests `POST /api/v1/purchasing/purchase-orders/1/approve`
- ✅ `[PASS]` Chính xác 1 request thành công (200 OK)
- ✅ `[PASS]` 9 requests còn lại bị chặn đứng với HTTP 409 Conflict
- ✅ `[PASS]` Trạng thái PO cuối cùng chính xác là `da_gui_ncc`

### Kịch bản 2: Tranh chấp hủy đơn đồng thời (Race Condition: Double Cancel)
- Bắn đồng thời 10 requests `POST /api/v1/purchasing/purchase-orders/2/cancel`
- ✅ `[PASS]` Chính xác 1 request hủy thành công (200 OK)
- ✅ `[PASS]` 9 requests còn lại bị chặn đứng với HTTP 409 Conflict
- ✅ `[PASS]` Trạng thái PO cuối cùng chính xác là `huy`

### Kịch bản 3: Tranh chấp chuyển trạng thái đồng thời (Duplicate Status Transition)
- Bắn đồng thời 10 requests `POST /api/v1/purchasing/purchase-orders/1/status` sang `da_xac_nhan`
- ✅ `[PASS]` Chính xác 1 request chuyển trạng thái thành công (200 OK)
- ✅ `[PASS]` 9 requests còn lại bị chặn đứng với HTTP 409 Conflict
- ✅ `[PASS]` Trạng thái PO sau chuyển đổi chính xác là `da_xac_nhan`

---

## 4. Hướng dẫn Tái hiện & Chạy Kiểm thử

### Chạy bộ test chức năng:
```bash
cd backend
npm run test:ph3
```

### Chạy bộ test tranh chấp đồng thời:
```bash
cd backend
npm run test:ph3:concurrency
```

### Kiểm tra build frontend:
```bash
cd frontend
npm run build
```
