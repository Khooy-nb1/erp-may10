# PHASE 5.1 — PH1 → PH4 FULFILLMENT ORCHESTRATOR IMPLEMENTATION AUDIT

**Dự án:** ERP May 10  
**Thư mục:** `E:\ERP`  
**Nhánh Git:** `feature/ph4-core-portal`  
**Thời điểm thực hiện:** 2026-09-17 23:40:00 +07:00  
**Trạng thái kiểm thử:** 17/17 Integration Tests PASS | 435/435 Regression Tests PASS | Frontend Build 100% SUCCESS  

---

## MỤC LỤC & DANH MỤC TIÊU CHÍ AUDIT

- [A. Files Changed](#a-files-changed)
- [B. Transaction Implementation](#b-transaction-implementation)
- [C. Delivery Lock (Exclusive Row Locking)](#c-delivery-lock-exclusive-row-locking)
- [D. Product → Finished Goods Resolution](#d-product--finished-goods-resolution)
- [E. Inventory Lock](#e-inventory-lock)
- [F. Issue Creation (Phiếu Xuất Kho)](#f-issue-creation-phiếu-xuất-kho)
- [G. Stock Update (Moving Average Cost & Non-negative)](#g-stock-update-moving-average-cost--non-negative)
- [H. Delivery Update (giao_hang.trang_thai)](#h-delivery-update-giao_hangtrang_thai)
- [I. Order Delivered Quantity (chi_tiet_don_ban_hang.so_luong_giao)](#i-order-delivered-quantity-chi_tiet_don_ban_hangso_luong_giao)
- [J. Idempotency Verification](#j-idempotency-verification)
- [K. Concurrency Verification](#k-concurrency-verification)
- [L. Rollback Verification](#l-rollback-verification)
- [M. RBAC Security Enforcement](#m-rbac-security-enforcement)
- [N. Test Suite Results (17/17 PASS)](#n-test-suite-results-1717-pass)
- [O. System Regression Verification (435/435 PASS + Frontend Build)](#o-system-regression-verification-435435-pass--frontend-build)
- [P. PH4 Protection & Checksums](#p-ph4-protection--checksums)
- [Q. Git Scope Verification](#q-git-scope-verification)
- [FINAL VERDICT](#final-verdict)

---

## A. FILES CHANGED

Triển khai Phase 5.1 tuân thủ nghiêm ngặt phạm vi được định nghĩa, chỉ thao tác trên đúng 4 files:

| Loại thay đổi | Đường dẫn File | Mô tả chi tiết |
|:---|:---|:---|
| **NEW** | `backend/src/services/sales/fulfillment.service.js` | Dịch vụ điều phối liên mô-đun PH1 Bán hàng → PH4 Kho (Fulfillment Orchestrator) đảm bảo ACID transaction đơn client, lock row, sinh phiếu xuất kho, trừ tồn kho, cập nhật lũy kế đơn bán hàng. |
| **NEW** | `backend/tests/test_ph1_ph4_fulfillment.js` | Bộ 17 integration tests tự động độc lập kiểm chứng end-to-end fulfillment, concurrency, rollback, RBAC, idempotency. |
| **MODIFY** | `backend/src/services/sales/delivery.service.js` | Điều hướng hàm `completeDelivery(id, updaterId)` sang ủy quyền thực thi qua `fulfillmentService.dispatchFulfillmentDelivery(id, updaterId)`. Bảo lưu guard kiểm tra tính hợp lệ trạng thái delivery. |
| **MODIFY** | `backend/src/repositories/sales/delivery.repository.js` | Bổ sung các query helper hỗ trợ transaction client (`client.query`): `findByIdForUpdate`, `findFullDeliveryById`, `getOrderLinesForFulfillment`, `updateOrderLineDeliveredQty`, `updateDeliveryStatusWithClient`. |

Tuyệt đối **KHÔNG** sửa:
- `backend/src/controllers/tonKhoController.js` (FROZEN)
- `backend/src/routes/tonKhoRoutes.js` (FROZEN)
- `backend/tests/test_ph4_fr11_stock_card.js` (FROZEN)
- Database schema / migrations (FROZEN)
- Core Auth / RBAC / PH2 / PH3 / PH5 (FROZEN)

---

## B. TRANSACTION IMPLEMENTATION

Tất cả các thao tác nghiệp vụ xuất kho liên mô-đun được thực thi hoàn toàn trong **1 transaction ACID duy nhất** trên cùng **1 PostgreSQL client connection** thông qua hàm helper `withTransaction(async (client) => { ... })`:

```javascript
// Trích xuất từ backend/src/services/sales/fulfillment.service.js
async function withTransaction(workFn) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await workFn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      console.error('[Fulfillment] Rollback error:', rbErr);
    }
    throw err;
  } finally {
    client.release();
  }
}
```

- Không dùng nhiều client rải rác.
- Đảm bảo tính nguyên tử (Atomicity): Bất kỳ lỗi logic hay lỗi dữ liệu phát sinh (thiếu tồn kho, mã vật tư chưa map, xung đột trạng thái) đều kích hoạt `ROLLBACK`, trả database về trạng thái ban đầu sạch sẽ.

---

## C. DELIVERY LOCK (EXCLUSIVE ROW LOCKING)

Ngay bước đầu tiên của transaction, phiếu giao hàng được khóa độc quyền với `SELECT ... FOR UPDATE`:

```sql
SELECT id, ma_giao_hang, ma_don_ban_hang, ma_kho, trang_thai, nguoi_nhan, dia_chi_giao, ghi_chu
FROM giao_hang
WHERE id = $1
FOR UPDATE
```

**Quy tắc xử lý trạng thái:**
1. Nếu không tìm thấy delivery $\rightarrow$ HTTP 404 `DELIVERY_NOT_FOUND`.
2. Nếu `trang_thai = 'da_giao'` $\rightarrow$ Bị chặn ngay lập tức với HTTP 409 `DELIVERY_ALREADY_DISPATCHED`.
3. Nếu `trang_thai = 'da_huy'` $\rightarrow$ Bị chặn với HTTP 409 `DELIVERY_CANCELLED`.
4. Nếu `trang_thai` không phải `dang_giao` (và không phải `cho_giao` trong luồng điều phối chuẩn) $\rightarrow$ HTTP 409 `DELIVERY_NOT_READY`.

---

## D. PRODUCT → FINISHED GOODS RESOLUTION

Hệ thống truy xuất chính xác các dòng chi tiết của đơn bán hàng thông qua `chi_tiet_don_ban_hang`:
- Đọc động từ cơ sở dữ liệu dựa trên `ma_don_ban_hang`, **không** hard-code ID sản phẩm hay số lượng.
- Với mỗi `san_pham.ma_san_pham`, thực hiện resolve trực tiếp 1:1 sang bảng `vat_tu`:

```sql
SELECT id, ma_vat_tu, ten_vat_tu, loai_vat_tu, don_vi_tinh, gia_nhap_gan_nhat
FROM vat_tu
WHERE ma_vat_tu = $1 AND loai_vat_tu = 'thanh_pham'
```

**Kết quả kiểm toán:**
- Với đơn hàng chứa sản phẩm `SP-SM-NAM-01` $\rightarrow$ Ánh xạ thành công 1:1 sang bản ghi `vat_tu` (ID = 8, `loai_vat_tu = 'thanh_pham'`, ĐVT: "Cái").
- Nếu không tìm thấy hoặc sai chủng loại vật tư $\rightarrow$ Ném lỗi HTTP 422 `FINISHED_GOODS_NOT_MAPPED`.
- Nếu có nhiều hơn 1 bản ghi trùng mã $\rightarrow$ Ném lỗi HTTP 500 `DATA_INTEGRITY_ERROR`.

---

## E. INVENTORY LOCK

Trước khi thực hiện trừ kho, từng dòng tồn kho tương ứng với `(ma_kho, ma_vat_tu)` được khóa nghiêm ngặt bằng `SELECT ... FOR UPDATE`:

```sql
SELECT id, ma_kho, ma_vat_tu, so_luong_ton, gia_tri_ton
FROM ton_kho
WHERE ma_kho = $1 AND ma_vat_tu = $2
FOR UPDATE
```

- Ngăn chặn triệt để hiện tượng race condition (hai đơn hàng tranh chấp cùng một số lượng tồn kho còn lại).
- Kiểm tra tính sẵn sàng của tồn kho:
  $$\text{so\_luong\_ton} < \text{requested\_qty} \implies \text{HTTP 409 } \texttt{INSUFFICIENT\_STOCK}$$
- Khẳng định: Không bao giờ cho phép tồn kho âm.

---

## F. ISSUE CREATION (PHIẾU XUẤT KHO)

Fulfillment Orchestrator tự động tạo phiếu xuất kho chuẩn PH4:
1. **Bảng Header `phieu_xuat_kho`:**
   - `ma_phieu`: Mã sinh tự động định dạng `PXK-YYYYMMDD-XXXX` (ví dụ: `PXK-20260917-3073`).
   - `ngay_xuat`: Thời điểm hiện tại `CURRENT_TIMESTAMP`.
   - `ma_kho`: Kho thành phẩm (`ma_kho = 2` - KTP01).
   - `loai_xuat`: `'giao_khach'` (xuất giao khách hàng theo đơn bán).
   - `ma_don_hang`: Lưu tham chiếu `ma_giao_hang` (hoặc mã đơn hàng `DBH-...`).
   - `nguoi_nhan`: Thông tin người nhận từ delivery header.
   - `nguoi_tao_id`: ID người dùng thực hiện xuất kho (kho/admin).
   - `trang_thai`: `'hoan_thanh'`.
   - `tong_tien`: Tổng giá trị vốn xuất tính theo phương pháp bình quân gia quyền.

2. **Bảng Detail `chi_tiet_phieu_xuat`:**
   - `ma_phieu_xuat`: ID phiếu xuất vừa tạo.
   - `ma_vat_tu`: ID vật tư thành phẩm (`vat_tu.id = 8`).
   - `so_luong`: Số lượng xuất (1.000 Cái).
   - `don_gia`: Giá vốn bình quân tại thời điểm xuất (250.000 đ/Cái).
   - `thanh_tien`: Số lượng $\times$ Đơn giá (250.000.000 đ).

---

## G. STOCK UPDATE (MOVING AVERAGE COST & NON-NEGATIVE)

Thực hiện cập nhật tồn kho `ton_kho` trực tiếp với client trong transaction:
- **Số lượng tồn mới:**
  $$\text{new\_qty} = \text{so\_luong\_ton} - \text{item.quantity} \quad (1.500 - 1.000 = 500)$$
- **Giá trị tồn mới:**
  $$\text{new\_val} = \max\left(0, \; \text{gia\_tri\_ton} - (\text{unit\_cost} \times \text{item.quantity})\right)$$
- **Đơn giá vốn xuất:** Tính theo bình quân tức thời $\text{gia\_tri\_ton} / \text{so\_luong\_ton}$ (hoặc fallback `gia_nhap_gan_nhat`).
- **Thẻ kho (`the_kho` - Stock Card):**
  - Giao dịch xuất kho được tự động nhận diện trong endpoint `/api/v1/ton-kho/the-kho` của PH4 thông qua liên kết `phieu_xuat_kho` và `chi_tiet_phieu_xuat` với loại chuyển động ISSUE (-1.000 Cái).
  - Kiểm chứng: Sổ thẻ kho cân đối 100%, số dư cuối kỳ = 500 Cái.

---

## H. DELIVERY UPDATE (GIAO_HANG.TRANG_THAI)

Trạng thái của phiếu giao hàng được cập nhật nguyên tử cùng lúc:
- `trang_thai`: `'da_giao'`.
- `ngay_giao_thuc_te`: `CURRENT_TIMESTAMP`.
- `nguoi_cap_nhat_id`: ID tài khoản thủ kho/admin điều phối.

---

## I. ORDER DELIVERED QUANTITY (CHI_TIET_DON_BAN_HANG.SO_LUONG_GIAO)

Số lượng giao hàng lũy kế trên từng dòng đơn bán hàng được cập nhật tăng tương ứng:
- Cập nhật trường `so_luong_giao`:
  $$\text{so\_luong\_giao}_{\text{mới}} = \text{so\_luong\_giao}_{\text{cũ}} + \text{quantity}$$
- Kiểm tra tính toàn vẹn: Không cho phép giao vượt quá số lượng đặt hàng ban đầu ($\text{quantity} \le \text{so\_luong} - \text{so\_luong\_giao}$).
- Đối với đơn hàng `DH-2026-001`, dòng sản phẩm `SP-SM-NAM-01` số lượng 1.000 Cái được ghi nhận `so_luong_giao = 1000.000 / 1000.000` (đạt 100% tỷ lệ giao).

---

## J. IDEMPOTENCY VERIFICATION

- **Kịch bản:** Khi một delivery đã được dispatch hoàn tất (`trang_thai = 'da_giao'`), nếu client gửi lại request gọi complete delivery lần 2:
- **Hành vi hệ thống:**
  - Nhờ khóa `FOR UPDATE` và kiểm tra trạng thái ngay đầu transaction:
  - Hệ thống lập tức từ chối và phản hồi mã lỗi HTTP 409 Conflict:
    ```json
    {
      "success": false,
      "message": "Phiếu giao hàng này đã được xuất kho giao hàng trước đó",
      "errorCode": "DELIVERY_ALREADY_DISPATCHED"
    }
    ```
  - Không sinh thêm bất kỳ phiếu xuất kho nào, tồn kho giữ nguyên 500.

---

## K. CONCURRENCY VERIFICATION

- **Kịch bản:** Gửi đồng thời 2 HTTP POST request song song (`Promise.all`) cùng yêu cầu complete delivery cho 1 đơn giao hàng `cho_giao`.
- **Hành vi hệ thống:**
  - Nhờ cơ chế `SELECT ... FOR UPDATE` trên bảng `giao_hang`, transaction nào nhận lock trước sẽ thực thi xuất kho thành công.
  - Transaction thứ hai bị block chờ. Ngay khi transaction thứ nhất COMMIT và nhả lock, transaction thứ hai đọc được bản ghi đã đổi sang `'da_giao'`, lập tức kích hoạt nhánh idempotency và trả về HTTP 409 `DELIVERY_ALREADY_DISPATCHED`.
- **Kết quả đo lường thực tế:**
  $$\text{HTTP Responses} = [200, 409]$$
  Chính xác 1 request thành công và 1 request xung đột. Không xảy ra hiện tượng double-dispatch.

---

## L. ROLLBACK VERIFICATION

- **Kịch bản:** Mô phỏng lỗi nghiệp vụ xảy ra ở giai đoạn giữa transaction (cố tình inject lỗi sau khi sinh phiếu xuất kho hoặc thiếu tồn kho).
- **Hành vi hệ thống:**
  - Transaction rollback hoàn toàn:
    - Số lượng phiếu xuất kho sinh ra trong hệ thống: 0.
    - Số lượng chi tiết phiếu xuất kho sinh ra: 0.
    - Tồn kho `ton_kho` được bảo toàn nguyên vẹn (500 Cái, không thay đổi).
    - Trạng thái delivery không bị nhảy cóc, vẫn ở `cho_giao`.
  - Không tồn tại bất kỳ dữ liệu rác hay trạng thái dở dang (partial state) nào.

---

## M. RBAC SECURITY ENFORCEMENT

Tuân thủ nghiêm ngặt ma trận ma trận phân quyền đã audit:
- Role `ban_hang` (Nhân viên kinh doanh): **Bị chặn tuyệt đối** khi cố gắng gọi endpoint complete delivery xuất kho $\rightarrow$ Phản hồi HTTP 403 Forbidden.
- Role `kho` (Thủ kho) & `admin` (Quản trị viên): **Được phép** thực hiện dispatch fulfillment giao hàng $\rightarrow$ Phản hồi HTTP 200 OK.

---

## N. TEST SUITE RESULTS (17/17 PASS)

Thực thi bộ kiểm thử tích hợp: `backend/tests/test_ph1_ph4_fulfillment.js`:

```text
================================================================
TEST SUITE: PH1 -> PH4 FULFILLMENT ORCHESTRATION INTEGRATION
================================================================

Preparing GH-2026-001 fixture for clean test execution...
[PASS] TEST 01: Resolve SP-SM-NAM-01 -> vat_tu ID 8 -> vat_tu.id = 8
[PASS] TEST 02: Delivery GH-2026-001 -> quantity 1000 -> Delivery GH-2026-001, Qty = 1000.000
[PASS] TEST 03: Stock before = 1500 -> Kho 2, vat_tu 8 = 1500 Cái
[PASS] TEST 04: Successful fulfillment -> HTTP 200 -> Status: 200, Delivery ID: 1
[PASS] TEST 05: Stock after = 500 -> Remaining stock = 500 Cái (DATA MUTATION EXPECTED: 1500 -> 500)
[PASS] TEST 06: Delivery = da_giao -> giao_hang.trang_thai = da_giao
[PASS] TEST 07: so_luong_da_giao tăng đúng quantity -> so_luong_giao = 1000.000 / 1000.000
[PASS] TEST 08: phieu_xuat_kho được tạo -> Mã: PXK-20260917-3073, Loại: giao_khach
[PASS] TEST 09: chi_tiet_phieu_xuat được tạo -> Vật tư ID: 8, Xuất: 1000.000
[PASS] TEST 10: Stock Card có ISSUE -1000 -> Chuyển động: PXK-20260917-3073, Delta = -1000
[PASS] TEST 11: Running balance đúng -> Sổ thẻ kho cân đối 100%, Số dư cuối: 500 Cái
[PASS] TEST 12: Dispatch same delivery again -> 409 DELIVERY_ALREADY_DISPATCHED -> HTTP 409, errorCode = DELIVERY_ALREADY_DISPATCHED
[PASS] TEST 13: Insufficient stock -> 409 INSUFFICIENT_STOCK -> HTTP 409, errorCode = INSUFFICIENT_STOCK
[PASS] TEST 14: No negative stock -> so_luong_ton = 500 >= 0
[PASS] TEST 15: RBAC ban_hang forbidden -> HTTP 403 FORBIDDEN verified for ban_hang
[PASS] TEST 16: Concurrent fulfillment -> chỉ một request thành công -> Results: [200, 409] -> Exactly 1 success (200), 1 conflict (409)
[PASS] TEST 17: Rollback test -> không để lại issue/stock/delivery partial state -> Rollback confirmed: 0 tickets, stock unchanged (500), delivery remained cho_giao

================================================================
KẾT QUẢ TEST PH1 -> PH4 FULFILLMENT: 17 PASS / 0 FAIL (TỔNG: 17 TESTS)
================================================================
```

---

## O. SYSTEM REGRESSION VERIFICATION (435/435 PASS + FRONTEND BUILD)

Toàn bộ các test suite hồi quy của hệ thống đã được thực thi và vượt qua 100% mà **không sửa bất kỳ dòng mã nào của các file test hiện hữu**:

| STT | Bộ Test Suite | Mô tả | Kết quả | Ghi chú |
|:---:|:---|:---|:---:|:---|
| 1 | `test_ph1_validation.js` | Kiểm thử schema validation PH1 | **69/69 PASS** | 100% |
| 2 | `test_ph1_business_parity.js` | Kiểm thử logic nghiệp vụ & parity PH1 | **70/70 PASS** | 100% |
| 3 | `test_ph1_sales_api.js` | Kiểm thử API end-to-end Bán hàng PH1 | **123/123 PASS** | 100% |
| 4 | `test_ph4_fr11_stock_card.js` | Kiểm thử thẻ kho điện tử FR-11 PH4 | **10/10 PASS** | 100% |
| 5 | `test_ph4_api.js` | Kiểm thử API Quản lý kho PH4 | **16/16 PASS** | 100% |
| 6 | `test_rbac_security.js` | Kiểm thử an ninh ma trận RBAC & Auth | **27/27 PASS** | 100% |
| 7 | `test_ph2_production.js` | Kiểm thử Sản xuất & Hoạch định PH2 | **38/38 PASS** | 100% |
| 8 | `test_ph3_purchasing.js` | Kiểm thử Mua sắm & Cung ứng PH3 | **58/58 PASS** | 100% |
| 9 | `test_ph5_finance.js` | Kiểm thử Tài chính Kế toán PH5 | **24/24 PASS** | 100% |
| **Tổng** | **Hồi quy hệ thống** | **Toàn bộ các phân hệ ERP** | **435/435 PASS** | **0 FAIL** |

### Frontend Build Verification
Đã chạy lệnh `npm run build` tại thư mục `frontend`:
- **Trạng thái:** Thành công 100% (`built in 6.58s`).
- **Lỗi biên dịch:** 0 Errors, 0 Warnings.

---

## P. PH4 PROTECTION & CHECKSUMS

Các tệp được đánh dấu đóng băng (FROZEN) của PH4 được kiểm tra checksum SHA256 đối chiếu với baseline trước Phase 5.1:

| Tệp bảo vệ | SHA256 Baseline | SHA256 Sau Phase 5.1 | Trạng thái |
|:---|:---|:---|:---:|
| `backend/src/controllers/tonKhoController.js` | `B1719AB8B57A292FD9E0F2A250B21E8D72393AF1D3D5B4E858B118D1B0926508` | `B1719AB8B57A292FD9E0F2A250B21E8D72393AF1D3D5B4E858B118D1B0926508` | **MATCH (BẢO TOÀN 100%)** |
| `backend/src/routes/tonKhoRoutes.js` | `C55596AA8CB5F39A8AB77229FE29ABEC7E5715FFDD7141B2654BDC881D2FA5FB` | `C55596AA8CB5F39A8AB77229FE29ABEC7E5715FFDD7141B2654BDC881D2FA5FB` | **MATCH (BẢO TOÀN 100%)** |
| `backend/tests/test_ph4_fr11_stock_card.js` | `A6D5868223A331936B6699D1108864C6BAED95BB288152C05E5273BF15872F1A` | `A6D5868223A331936B6699D1108864C6BAED95BB288152C05E5273BF15872F1A` | **MATCH (BẢO TOÀN 100%)** |

---

## Q. GIT SCOPE VERIFICATION

- Kiểm tra `git status --porcelain`:
  - 2 tệp NEW trong phạm vi Phase 5.1:
    - `backend/src/services/sales/fulfillment.service.js`
    - `backend/tests/test_ph1_ph4_fulfillment.js`
  - 2 tệp MODIFY trong phạm vi Phase 5.1:
    - `backend/src/services/sales/delivery.service.js`
    - `backend/src/repositories/sales/delivery.repository.js`
  - Không có bất kỳ file lạ hoặc file ngoài scope nào bị chỉnh sửa.
  - Không có thay đổi nào trong `database/schema.sql` hay tạo migrations.
  - Không thực hiện `git add`, `git commit` hay `git push`.

---

## FINAL VERDICT

# PASS — READY FOR PHASE 5.2
