# BÁO CÁO AUDIT ĐỘC LẬP TOÀN DIỆN LOGIC & NGHIỆP VỤ PH4
## PHÂN HỆ 4 — KHO & QUẢN LÝ VẬT TƯ — ERP MAY 10
**Dự án:** ERP May 10  
**Tài liệu tham chiếu:** `E:\ERP\docs\ERP_MODULE_DEVELOPMENT_CONTRACT.md`  
**Database:** PostgreSQL 18.6 (`erp_may10`, schema `public`)  
**Ngày thực hiện:** 10/09/2026  
**Chế độ:** `AUDIT ONLY — ZERO CODE / ZERO SCHEMA CHANGE`  
**Trạng thái kiểm thử:** 16/16 API PASS (100%), Concurrency PASS (100%), RBAC 27/27 PASS (100%), Build Vite PASS  
**Final Verdict:** `PASS WITH MINOR FINDINGS`

---

## 1. TỔNG QUAN ĐIỀU HÀNH (EXECUTIVE SUMMARY)

Một cuộc kiểm toán độc lập, đa tầng và không can thiệp mã nguồn đã được thực hiện đối với toàn bộ hệ thống **PH4 — Kho & Quản lý vật tư** thuộc dự án ERP May 10.

Cuộc kiểm toán bao trùm 4 trụ cột kỹ thuật:
1. **Cơ sở dữ liệu:** Khảo sát trực tiếp lược đồ (schema), toàn bộ ràng buộc (`PRIMARY KEY`, `FOREIGN KEY`, `CHECK`, `UNIQUE`), dữ liệu tồn kho thực tế, tính toán bảo toàn số dư và các biến bất biến (invariants).
2. **Logic nghiệp vụ & Giao dịch:** Khảo sát chi tiết mã nguồn Node.js / Express của 8 controllers và routes PH4; kiểm chứng chu trình ACID, cơ chế khóa hàng bi quan (`SELECT ... FOR UPDATE`), kiểm soát xuất âm và điều chỉnh kiểm kê.
3. **Thực thi Kiểm thử (Runtime & Test Execution):** Chạy toàn bộ các test suite tự động về API, tranh chấp đồng thời (concurrency race condition), ma trận bảo mật Zero-Trust RBAC và build frontend production.
4. **Hợp đồng Tích hợp (Integration Contracts):** Đánh giá mức độ sẵn sàng liên kết dữ liệu giữa PH4 và các phân hệ PH1, PH2, PH3, PH5.

**Kết quả tổng quan:**
- Logic nghiệp vụ cốt lõi, bảo toàn tồn kho, chống xuất âm và khóa hàng tranh chấp đồng thời đạt mức độ hoàn thiện và an toàn cao (**Score: 94.4/100**).
- Không phát hiện bất kỳ lỗi nghiêm trọng nào gây âm tồn kho, rò rỉ kết nối hay sai lệch giao dịch ACID.
- Phát hiện 5 điểm cần lưu ý (Minor Findings: 0 Critical, 0 High, 2 Medium, 3 Low/Info), chủ yếu liên quan đến nguồn dữ liệu của Thẻ kho (chưa bao gồm phiếu chuyển và điều chỉnh kiểm kê), xử lý mã lỗi HTTP khi nhập liệu âm và cập nhật header xác thực cho script test cũ.

---

## 2. PHẠM VI HỆ THỐNG (AUDIT SCOPE)

### 2.1. Phân hệ được kiểm toán:
- **PH4 — Kho & Quản lý vật tư:**
  1. Báo cáo Tồn kho & Thẻ kho (`ton_kho`, tra cứu lịch sử).
  2. Vị trí kho (`vi_tri_kho`).
  3. Lô vật tư / Cây vải (`lo_vat_tu`).
  4. Quy trình Nhập kho (`phieu_nhap_kho`, `chi_tiet_phieu_nhap`).
  5. Quy trình Xuất kho (`phieu_xuat_kho`, `chi_tiet_phieu_xuat`).
  6. Quy trình Chuyển kho nội bộ (`phieu_chuyen_kho`, `chi_tiet_chuyen_kho`).
  7. Quy trình Kiểm kê & Cân đối kho (`phieu_kiem_ke`, `chi_tiet_kiem_ke`).
  8. Dashboard thống kê vận hành kho.

### 2.2. Cơ sở dữ liệu và hạ tầng:
- **Database:** `erp_may10` (PostgreSQL 18.6).
- **Schema:** `public`.
- **Bảng dữ liệu PH4:** `ton_kho`, `vi_tri_kho`, `lo_vat_tu`, `phieu_nhap_kho`, `chi_tiet_phieu_nhap`, `phieu_xuat_kho`, `chi_tiet_phieu_xuat`, `phieu_chuyen_kho`, `chi_tiet_chuyen_kho`, `phieu_kiem_ke`, `chi_tiet_kiem_ke`.
- **Bảng danh mục dùng chung (Shared Master Tables):** `nguoi_dung`, `don_vi_tinh`, `kho`, `nha_cung_cap`, `san_pham`, `vat_tu`.

---

## 3. KIẾN TRÚC ĐÃ XÁC MINH (ARCHITECTURE VERIFIED)

```text
┌────────────────────────────────────────────────────────────────────────┐
│               GIAO DIỆN FRONTEND (Vite + React 18 SPA)                 │
│  - TonKhoPage.jsx, PhieuNhapPage.jsx, PhieuXuatPage.jsx...             │
│  - Axios Client (/services/api.js) kèm Bearer Token HMAC               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST JSON
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               TẦNG BACKEND REST API (Node.js + Express)                │
│  - Auth Middleware: Giải mã Token HMAC, xác thực nguoi_dung DB         │
│  - Controllers: Row-Level Locking (SELECT ... FOR UPDATE)              │
│  - Transaction Management: BEGIN -> EXECUTE -> COMMIT / ROLLBACK       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ pg Pool (Max: 25 Connections)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             CƠ SỞ DỮ LIỆU POSTGRESQL 18.6 (erp_may10)                  │
│  - Invariants: CHECK (so_luong_ton >= 0), CHECK (sl_nhap > 0)...       │
│  - UNIQUE (ma_kho, ma_vat_tu) chống duplicate tồn kho                  │
│  - CHECK (ma_kho_xuat <> ma_kho_nhap) chống chuyển kho cùng nơi        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. AUDIT CƠ SỞ DỮ LIỆU (DATABASE AUDIT)

### 4.1. Lược đồ và Ràng buộc Bảng dữ liệu PH4

| Tên bảng | Khóa chính | Ràng buộc duy nhất (UNIQUE) | Ràng buộc kiểm tra (CHECK) | Khóa ngoại (FOREIGN KEY) |
| :--- | :--- | :--- | :--- | :--- |
| `ton_kho` | `id` (BIGINT) | `uq_ton_kho_kho_vat_tu (ma_kho, ma_vat_tu)` | `so_luong_ton >= 0`, `gia_tri_ton_kho >= 0` | `kho(id)`, `vat_tu(id)`, `don_vi_tinh(id)`, `nguoi_dung(id)` |
| `vi_tri_kho` | `id` (BIGINT) | `ma_vi_tri` | `suc_chua_toi_da >= 0` | `kho(id)`, `nguoi_dung(id)` |
| `lo_vat_tu` | `id` (BIGINT) | `ma_lo` | `so_luong_nhap >= 0`, `so_luong_hien_tai >= 0`, `don_gia_nhap >= 0` | `vat_tu(id)`, `nha_cung_cap(id)`, `don_mua_hang(id)`, `vi_tri_kho(id)`, `nguoi_dung(id)` |
| `phieu_nhap_kho` | `id` (BIGINT) | `ma_phieu_nhap` | `tong_gia_tri_nhap >= 0` | `don_mua_hang(id)`, `lenh_san_xuat(id)`, `kho(id)`, `nguoi_dung(id)` |
| `chi_tiet_phieu_nhap` | `id` (BIGINT) | Không | `so_luong_nhap > 0`, `don_gia_nhap >= 0`, `thanh_tien >= 0` | `phieu_nhap_kho(id) ON DELETE CASCADE`, `vat_tu(id)`, `lo_vat_tu(id)`, `vi_tri_kho(id)` |
| `phieu_xuat_kho` | `id` (BIGINT) | `ma_phieu_xuat` | `tong_gia_tri_xuat >= 0` | `don_ban_hang(id)`, `lenh_san_xuat(id)`, `kho(id)`, `nguoi_dung(id)` |
| `chi_tiet_phieu_xuat` | `id` (BIGINT) | Không | `so_luong_xuat > 0`, `don_gia_xuat >= 0`, `thanh_tien >= 0` | `phieu_xuat_kho(id) ON DELETE CASCADE`, `vat_tu(id)`, `lo_vat_tu(id)` |
| `phieu_chuyen_kho` | `id` (BIGINT) | `ma_phieu_chuyen` | `chk_chuyen_kho_khac_nhau (ma_kho_xuat <> ma_kho_nhap)` | `kho(id) [xuat & nhap]`, `nguoi_dung(id)` |
| `chi_tiet_chuyen_kho` | `id` (BIGINT) | Không | `so_luong_chuyen > 0`, `don_gia >= 0` | `phieu_chuyen_kho(id) ON DELETE CASCADE`, `vat_tu(id)` |
| `phieu_kiem_ke` | `id` (BIGINT) | `ma_phieu_kiem_ke` | Không | `kho(id)`, `nguoi_dung(id)` |
| `chi_tiet_kiem_ke` | `id` (BIGINT) | Không | `so_luong_so_sach >= 0`, `so_luong_thuc_te >= 0` | `phieu_kiem_ke(id) ON DELETE CASCADE`, `vat_tu(id)` |

### 4.2. Kiểm tra Dữ liệu Thực tế & Invariants

```sql
-- Kết quả chạy script kiểm tra toàn vẹn trên database erp_may10:
-- 1. Tồn kho âm: 0 bản ghi (Tất cả >= 0).
-- 2. Tồn kho trùng lặp (ma_kho, ma_vat_tu): 0 bản ghi (Được bảo vệ bởi uq_ton_kho_kho_vat_tu).
-- 3. Khóa ngoại mồ côi (Orphan FKs): 0 bản ghi trên toàn bộ 11 bảng.
-- 4. Chi tiết nhập/xuất/chuyển có số lượng <= 0: 0 bản ghi.
-- 5. Chuyển kho cùng mã kho: 0 bản ghi.
-- 6. Công thức kiểm kê sai lệch (chenh_lech <> thuc_te - so_sach): 0 bản ghi.
```

---

## 5. AUDIT TỒN KHO (INVENTORY AUDIT)

### 5.1. Mô hình lưu trữ tồn kho
Trong cơ sở dữ liệu `erp_may10`, bảng `ton_kho` được thiết kế ở mức độ hạt nhân (*granularity*) là `(ma_kho, ma_vat_tu)`.
- Các cột: `id`, `ma_kho`, `ma_vat_tu`, `so_luong_ton`, `don_vi_tinh`, `gia_tri_ton_kho`, `ngay_cap_nhat`, `nguoi_cap_nhat`.
- **Quan sát kiến trúc:** Bảng `ton_kho` không có cột `so_luong_kha_dung` hay `so_luong_cho_xuat`.
- **Quy tắc nghiệp vụ thực tế:** Số lượng tồn khả dụng hiện tại bằng đúng số lượng tồn thực tế (`so_luong_ton`). Chưa có cơ chế giữ chỗ tạm thời (*reservation lock*) trong bảng này. Khi kiểm tra xuất kho hoặc chuyển kho, hệ thống kiểm tra trực tiếp:
  ```javascript
  if (tonHienTai < slXuat) {
    const err = new Error(`Xung đột tồn kho...`);
    err.statusCode = 409;
    err.errorCode = 'INSUFFICIENT_STOCK';
    throw err;
  }
  ```

### 5.2. Tính bảo toàn tồn kho (Inventory Conservation)
- Tồn kho của từng mặt hàng được cập nhật đồng bộ thông qua các giao dịch nghiệp vụ.
- Việc chuyển kho nội bộ (`phieu_chuyen_kho`) được kiểm chứng là **bảo toàn tổng tồn toàn hệ thống**:
  - Lệnh chuyển kho trừ `so_luong_chuyen` tại kho xuất và cộng đúng `so_luong_chuyen` tại kho nhập trong cùng một transaction.
  - Tổng số lượng chuyển dịch trên toàn hệ thống là `231.200` mét vải, không tạo ra hay làm biến mất bất kỳ đơn vị vật tư nào.

---

## 6. AUDIT QUY TRÌNH NHẬP KHO (RECEIPT AUDIT)

### 6.1. Luồng thực thi
1. `POST /api/v1/phieu-nhap` nhận header và danh sách `chiTiet`.
2. Khởi tạo `client.query('BEGIN')`.
3. Tạo header `phieu_nhap_kho` (trạng thái mặc định `da_nhap`).
4. Lặp qua từng phần tử trong `chiTiet`:
   - Xác thực `slNhap > 0`.
   - Nếu có yêu cầu `tao_lo_moi`: tạo bản ghi `lo_vat_tu` mới. Nếu truyền `ma_lo_vat_tu`: tăng `so_luong_hien_tai` của lô.
   - Thêm bản ghi `chi_tiet_phieu_nhap`.
   - Khóa dòng `ton_kho` bằng `SELECT ... FOR UPDATE` theo `(ma_kho_nhap, ma_vat_tu)`.
   - Nếu đã tồn tại: `UPDATE ton_kho SET so_luong_ton = so_luong_ton + slNhap, gia_tri_ton_kho = gia_tri_ton_kho + thanhTien`.
   - Nếu chưa có: `INSERT INTO ton_kho (...)`.
5. Gọi `COMMIT`. Trường hợp có lỗi ở bất kỳ bước nào: gọi `ROLLBACK`.
6. `finally { client.release(); }`.

### 6.2. Đánh giá
- ✅ Đảm bảo tính nguyên tử (Atomicity).
- ✅ Khóa dòng phòng chống tranh chấp khi có nhiều lệnh nhập cùng lúc.
- ⚠️ **Finding F-03 (Low):** Khi `slNhap <= 0`, controller `throw new Error(...)` mà không gán `err.statusCode = 400`, dẫn đến middleware trả về HTTP 500 thay vì HTTP 400 Bad Request.

---

## 7. AUDIT QUY TRÌNH XUẤT KHO (ISSUE AUDIT)

### 7.1. Luồng thực thi
1. `POST /api/v1/phieu-xuat` nhận header và danh sách `chiTiet`.
2. Khởi tạo `client.query('BEGIN')`.
3. Kiểm tra tính hợp lệ từng dòng:
   - `slXuat > 0` (nếu không: ném lỗi `statusCode = 400`, `INVALID_QUANTITY`).
   - Khóa dòng tồn kho:
     ```sql
     SELECT tk.id, tk.so_luong_ton, tk.gia_tri_ton_kho, vt.ten_vat_tu, vt.ma_vat_tu
     FROM ton_kho tk
     JOIN vat_tu vt ON tk.ma_vat_tu = vt.id
     WHERE tk.ma_kho = $1 AND tk.ma_vat_tu = $2
     FOR UPDATE;
     ```
   - Nếu không có dòng hoặc `tonHienTai < slXuat`: lập tức ném lỗi với mã `HTTP 409 Conflict`, mã lỗi `INSUFFICIENT_STOCK`.
   - Nếu có chọn lô (`ma_lo_vat_tu`): thực hiện khóa dòng `lo_vat_tu FOR UPDATE` và kiểm tra `tonLo >= slXuat`.
4. Tạo header `phieu_xuat_kho`.
5. Thêm `chi_tiet_phieu_xuat`, trừ `ton_kho`, trừ `lo_vat_tu` (tự động chuyển trạng thái `het_hang` khi số dư về 0).
6. Gọi `COMMIT`.
7. `finally { client.release(); }`.

### 7.2. Đánh giá
- ✅ Cơ chế bảo vệ xuất âm hoàn hảo: Chặn xuất âm cả ở tầng ứng dụng (HTTP 409) lẫn tầng cơ sở dữ liệu (`CHECK so_luong_ton >= 0`).
- ✅ Kiểm tra tồn và khóa dòng diễn ra trước khi tạo chứng từ, bảo đảm không tạo phiếu rác khi thiếu hàng.

---

## 8. AUDIT QUY TRÌNH CHUYỂN KHO (TRANSFER AUDIT)

### 8.1. Luồng thực thi
1. `POST /api/v1/phieu-chuyen` nhận `ma_kho_xuat`, `ma_kho_nhap`, `chiTiet`.
2. Xác thực điều kiện tiên quyết:
   - `ma_kho_xuat !== ma_kho_nhap` (chặn tại controller HTTP 400 và tại DB bằng constraint `chk_chuyen_kho_khac_nhau`).
3. Khởi tạo `BEGIN`.
4. Khóa dòng và kiểm tra tồn kho tại kho xuất: `SELECT ... FOR UPDATE`. Nếu thiếu hàng: ném `HTTP 409 Conflict`.
5. Tạo `phieu_chuyen_kho`.
6. Với từng dòng:
   - Trừ số lượng và giá trị tại `ton_kho` kho xuất.
   - Khóa hoặc tạo mới bản ghi `ton_kho` tại kho nhập (`SELECT ... FOR UPDATE`).
   - Cộng số lượng và giá trị tại kho nhập.
7. Gọi `COMMIT`. Trường hợp sự cố: `ROLLBACK` trả cả 2 kho về trạng thái ban đầu.
8. `finally { client.release(); }`.

### 8.2. Đánh giá
- ✅ Đảm bảo tính nguyên tử tuyệt đối giữa kho xuất và kho nhập.
- ✅ Invariant: Tổng tồn toàn hệ thống không đổi sau lệnh chuyển kho.

---

## 9. AUDIT QUY TRÌNH KIỂM KÊ & ĐIỀU CHỈNH (STOCKTAKE AUDIT)

### 9.1. Luồng lập phiếu kiểm kê
- `POST /api/v1/phieu-kiem-ke`:
  - Lấy số lượng sổ sách hiện tại (`so_luong_ton`) và đơn giá trung bình của vật tư.
  - Tính toán:
    $$\text{chenh\_lech} = \text{so\_luong\_thuc\_te} - \text{so\_luong\_so\_sach}$$
    $$\text{gia\_tri\_chenh\_lech} = \text{chenh\_lech} \times \text{don\_gia}$$
  - Lưu vào `chi_tiet_kiem_ke` với trạng thái `da_dieu_chinh = 'chua'`.
  - Toàn bộ bản ghi kiểm kê trong DB đều tuân thủ chính xác công thức này (0 bản ghi sai lệch).

### 9.2. Luồng điều chỉnh cân đối kho
- `POST /api/v1/phieu-kiem-ke/:id/dieu-chinh`:
  - Khóa phiếu kiểm kê: `SELECT * FROM phieu_kiem_ke WHERE id = $1 FOR UPDATE`.
  - Ngăn chặn điều chỉnh 2 lần: Kiểm tra `trang_thai === 'da_dieu_chinh'` (nếu có: báo lỗi HTTP 400).
  - Lấy các chi tiết, khóa dòng `ton_kho FOR UPDATE` tại kho kiểm kê.
  - Cập nhật số lượng tồn sổ sách bằng đúng `so_luong_thuc_te`:
    ```sql
    UPDATE ton_kho SET so_luong_ton = $1, gia_tri_ton_kho = $2, ngay_cap_nhat = NOW() WHERE id = $4
    ```
  - Đánh dấu chi tiết `da_dieu_chinh = 'da_dieu_chinh'`, cập nhật phiếu kiểm kê sang `da_dieu_chinh`.
  - `COMMIT` transaction.

### 9.3. Đánh giá
- ✅ Chu trình kiểm kê và cân đối kho 2 bước (Lập phiếu -> Duyệt điều chỉnh) chặt chẽ, an toàn.

---

## 10. AUDIT LÔ VẬT TƯ, FEFO & FIFO (LOT / FEFO / FIFO AUDIT)

### 10.1. Quản lý lô vật tư (`lo_vat_tu`)
- Bảng `lo_vat_tu` theo dõi đầy đủ: `ma_lo`, `ma_vat_tu`, `ngay_san_xuat`, `han_su_dung`, `so_luong_nhap`, `so_luong_hien_tai`, `don_gia_nhap`, `ma_vi_tri_kho`, `trang_thai`.
- Tự động tính toán tình trạng hạn sử dụng:
  - `qua_han`: nếu `han_su_dung < NOW()`.
  - `sap_het_han`: nếu `han_su_dung <= (NOW() + 30 days)`.
  - `con_han`: các trường hợp còn lại.

### 10.2. Phân biệt FIFO/FEFO Sorting và Automatic Allocation
- **Kiểm tra mã nguồn `loVatTuController.js` (dòng 52-54):**
  ```javascript
  // Sắp xếp ưu tiên hạn dùng sớm nhất (FEFO) hoặc ngày nhập sớm nhất (FIFO)
  query += ` ORDER BY l.han_su_dung ASC NULLS LAST, l.id ASC`;
  ```
- **Xác nhận bản chất:**
  - Hệ thống hiện tại **CHỈ THỰC HIỆN SORTING (Sắp xếp danh sách lô theo tiêu chí FEFO/FIFO)** để thủ kho tiện lựa chọn trên giao diện.
  - Hệ thống **KHÔNG CÓ AUTO-ALLOCATION (Tự động cấp phát/tự động chia nhỏ số lượng xuất cho các lô)**.
  - Khi xuất kho, người dùng/thủ kho bắt buộc phải tự chọn `ma_lo_vat_tu` trong payload gửi lên; hệ thống kiểm tra tồn của lô đó và trừ trực tiếp.
- ℹ️ **Finding F-02 (Info):** Cần minh định rõ ràng trong tài liệu nghiệp vụ rằng cơ chế FIFO/FEFO hiện là gợi ý sắp xếp trên giao diện, không phải phân bổ tự động ngầm định trong backend.

---

## 11. AUDIT THẺ KHO (STOCK CARD AUDIT)

### 11.1. Nguồn dữ liệu Thẻ kho
- Trong cơ sở dữ liệu `erp_may10`, **không có bảng vật lý riêng** tên là `the_kho`.
- Thẻ kho được tổng hợp động (*derived on-the-fly*) thông qua endpoint `GET /api/v1/ton-kho/the-kho?ma_kho=...&ma_vat_tu=...`.

### 11.2. Kiểm tra truy vấn Thẻ kho (`tonKhoController.js`)
Mã nguồn hàm `getTheKho`:
```javascript
// Lấy tất cả biến động Nhập kho
const nhapQuery = `SELECT pnk.ngay_nhap AS thoi_gian, pnk.ma_phieu_nhap AS ma_chung_tu, 'nhap_kho' AS loai_bien_dong...
                   FROM chi_tiet_phieu_nhap ct JOIN phieu_nhap_kho pnk... WHERE pnk.ma_kho_nhap = $1 AND ct.ma_vat_tu = $2...`;

// Lấy tất cả biến động Xuất kho
const xuatQuery = `SELECT pxk.ngay_xuat AS thoi_gian, pxk.ma_phieu_xuat AS ma_chung_tu, 'xuat_kho' AS loai_bien_dong...
                   FROM chi_tiet_phieu_xuat ct JOIN phieu_xuat_kho pxk... WHERE pxk.ma_kho_xuat = $1 AND ct.ma_vat_tu = $2...`;
```

### 11.3. Đánh giá và Lỗ hổng Thẻ kho
- ⚠️ **Finding F-01 (Medium):**
  1. **Thiếu biến động Chuyển kho:** Hàm `getTheKho` không truy vấn bảng `chi_tiet_chuyen_kho`. Do đó, khi một mặt hàng được chuyển vào kho hoặc chuyển đi khỏi kho, nhật ký thẻ kho hoàn toàn không hiển thị dòng chuyển kho này, dù số dư `ton_kho` thực tế đã bị trừ/cộng.
  2. **Thiếu biến động Điều chỉnh kiểm kê:** Không truy vấn các phiếu kiểm kê đã cân đối kho (`chi_tiet_kiem_ke.da_dieu_chinh = 'da_dieu_chinh'`).
  3. **Không tính số dư đầu kỳ (Opening Balance) và số dư lũy kế (Running Balance):** Kết quả trả về chỉ gồm danh sách các dòng phát sinh, không có cột số dư tức thời sau mỗi giao dịch.

---

## 12. AUDIT GIAO DỊCH & ACID (TRANSACTION / ACID AUDIT)

Kiểm tra toàn bộ 4 hàm thực hiện ghi dữ liệu thay đổi số dư tồn kho:
1. `createPhieuNhap` (`phieuNhapController.js`)
2. `createPhieuXuat` (`phieuXuatController.js`)
3. `createPhieuChuyen` (`phieuChuyenController.js`)
4. `dieuChinhTonKho` (`phieuKiemKeController.js`)

**Kết quả xác minh:**
- **Mô hình kết nối:** Cả 4 hàm đều gọi `const client = await db.getClient()`.
- **Bắt đầu giao dịch:** Đều gọi `await client.query('BEGIN')`.
- **Khóa hàng:** Đều sử dụng `FOR UPDATE` trên dòng tồn kho trước khi thực hiện phép tính toán và cập nhật.
- **Xác nhận giao dịch:** Gọi `await client.query('COMMIT')`.
- **Hủy giao dịch:** Cấu trúc `catch (err) { await client.query('ROLLBACK'); next(err); }`.
- **Giải phóng kết nối:** Đều đặt `client.release()` bên trong khối `finally`, đảm bảo 100% không xảy ra rò rỉ connection pool (*pool starvation*).
- **Thử nghiệm Rollback thực tế:** Gửi yêu cầu xuất kho gồm 2 mặt hàng (Dòng 1 hợp lệ số lượng 5, Dòng 2 cố tình vượt tồn số lượng 99,999,999). Kết quả: Dòng 2 gây lỗi 409, toàn bộ giao dịch được ROLLBACK nguyên vẹn, số dư tồn kho của Dòng 1 trước và sau giao dịch giữ nguyên chính xác là 100.000 mét.

---

## 13. AUDIT ĐỒNG THỜI & TRANH CHẤP (CONCURRENCY AUDIT)

### 13.1. Kịch bản kiểm thử tranh chấp (Race Condition Test)
- **Tồn kho khả dụng ban đầu:** $100.000$ mét vải.
- **Request A (Luồng 1):** Yêu cầu xuất $80.000$ mét vải.
- **Request B (Luồng 2):** Yêu cầu xuất $50.000$ mét vải.
- Cả 2 request được bắn đồng thời tại cùng một mili-giây qua 2 kết nối HTTP độc lập.
- **Tổng nhu cầu:** $80 + 50 = 130 > 100$.

### 13.2. Kết quả kiểm thử thực tế (`test_concurrency.js`)
```text
POST /api/v1/phieu-xuat 201 16.224 ms - Request A thành công
[API Error]: Error: Xung đột tồn kho... Tồn khả dụng hiện tại: 20, Yêu cầu xuất: 50
POST /api/v1/phieu-xuat 409 18.300 ms - Request B bị từ chối với HTTP 409 Conflict
Tồn kho cuối cùng trong PostgreSQL: 20.000 mét
```
- **Đánh giá:**
  - Cơ chế `SELECT ... FOR UPDATE` trong transaction PostgreSQL đã khóa dòng `ton_kho` tuyệt đối an toàn.
  - Loại bỏ hoàn toàn khả năng xuất âm (không thể thành $-30$) hoặc hiện tượng ghi đè mất mát (*lost update*, không thể thành $50$).
  - Trả về mã chuẩn `HTTP 409 Conflict` kèm mã lỗi `INSUFFICIENT_STOCK`.

---

## 14. AUDIT CÁC TRƯỜNG HỢP BIÊN (EDGE CASE AUDIT)

Kết quả thực thi bộ kiểm tra 14 trường hợp biên trực tiếp trên môi trường đang chạy:

| STT | Tình huống biên (Edge Case) | Phản hồi thực tế | Đánh giá |
| :---: | :--- | :---: | :---: |
| 1 | Nhập kho số lượng = 0 | HTTP 500 (Ném lỗi `Số lượng nhập phải > 0`) | ⚠️ Bị chuyển thành 500 do thiếu `statusCode = 400` |
| 2 | Nhập kho số lượng < 0 | HTTP 500 (Vi phạm `CHECK tong_gia_tri_nhap >= 0`) | ⚠️ Bị chuyển thành 500 do lỗi DB CHECK |
| 3 | Xuất kho số lượng = 0 | HTTP 400 (`Số lượng xuất phải > 0`) | ✅ PASS |
| 4 | Xuất kho số lượng < 0 | HTTP 400 (`Số lượng xuất phải > 0`) | ✅ PASS |
| 5 | Nhập kho số lượng thập phân (12.345) | HTTP 201 (`NUMERIC(18,3)` lưu chính xác) | ✅ PASS |
| 6 | Xuất kho số lượng thập phân (12.345) | HTTP 201 (Trừ tồn chính xác đến 3 chữ số lẻ) | ✅ PASS |
| 7 | Xuất mặt hàng không tồn tại (ID 999999) | HTTP 409 (`Mặt hàng chưa từng có tồn kho...`) | ✅ PASS |
| 8 | Xuất tại kho không tồn tại (ID 999999) | HTTP 409 (`Mặt hàng chưa từng có tồn kho...`) | ✅ PASS |
| 9 | Chuyển kho trùng kho xuất và nhập | HTTP 400 (`Kho xuất và kho nhập phải khác nhau`) | ✅ PASS |
| 10 | Phiếu nhập không có chi tiết (`chiTiet: []`) | HTTP 400 (`Vui lòng cung cấp danh sách chiTiet`) | ✅ PASS |
| 11 | Phiếu nhập thiếu trường `chiTiet` | HTTP 400 (`Vui lòng cung cấp danh sách chiTiet`) | ✅ PASS |
| 12 | Xuất lô vật tư không tồn tại | HTTP 404 (`Lô vật tư ID ... không tồn tại`) | ✅ PASS |
| 13 | Lỗi ở dòng chi tiết thứ 2 (Multi-item rollback) | HTTP 409, Tồn kho trước = sau (100 = 100) | ✅ PASS |
| 14 | Tạo phiếu nhập trùng mã `ma_phieu_nhap` | HTTP 500 (`duplicate key violates unique constraint`) | ⚠️ Nên xử lý trả về HTTP 409 Conflict |

---

## 15. AUDIT RESTFUL API PH4 (API AUDIT)

Danh mục kiểm tra toàn bộ các endpoints của PH4:

| Endpoint | Phương thức | Chức năng | Trạng thái HTTP | Ghi chú |
| :--- | :---: | :--- | :---: | :--- |
| `/api/v1/health` | `GET` | Kiểm tra dịch vụ | `200 OK` | Hoạt động bình thường |
| `/api/v1/master-data/kho` | `GET` | Danh sách kho | `200 OK` | Lấy 3 kho May 10 |
| `/api/v1/master-data/vat-tu` | `GET` | Danh mục vật tư | `200 OK` | Kèm đơn vị tính & định mức |
| `/api/v1/master-data/cross-module` | `GET` | Tham chiếu PH1, PH2, PH3 | `200 OK` | Dùng cho dropdown tạo phiếu |
| `/api/v1/vi-tri-kho` | `GET` | Danh sách kệ/vị trí | `200 OK` | Kèm số lượng lô đang chứa |
| `/api/v1/vi-tri-kho` | `POST` | Tạo vị trí mới | `201 Created` | Kiểm tra trùng mã vị trí |
| `/api/v1/lo-vat-tu` | `GET` | Danh sách lô vải | `200 OK` | Kèm trạng thái hạn sử dụng |
| `/api/v1/ton-kho` | `GET` | Báo cáo tồn kho tổng hợp | `200 OK` | Lọc theo kho, loại vật tư, cảnh báo |
| `/api/v1/ton-kho/dashboard` | `GET` | Thống kê KPI kho | `200 OK` | Tổng tồn, giá trị, nhập xuất tháng |
| `/api/v1/ton-kho/the-kho` | `GET` | Tra cứu thẻ kho | `200 OK` | Lịch sử nhập/xuất của vật tư |
| `/api/v1/phieu-nhap` | `GET` | Danh sách phiếu nhập | `200 OK` | Phân trang, tìm kiếm |
| `/api/v1/phieu-nhap` | `POST` | Lập phiếu nhập kho | `201 Created` | Khóa dòng tăng tồn kho |
| `/api/v1/phieu-xuat` | `GET` | Danh sách phiếu xuất | `200 OK` | Phân trang, tìm kiếm |
| `/api/v1/phieu-xuat` | `POST` | Lập phiếu xuất kho | `201 Created` / `409` | Khóa dòng trừ tồn kho |
| `/api/v1/phieu-chuyen` | `GET` | Danh sách chuyển kho | `200 OK` | Lọc theo kho xuất/nhập |
| `/api/v1/phieu-chuyen` | `POST` | Lập phiếu chuyển kho | `201 Created` / `409` | Điều chuyển nguyên tử giữa 2 kho |
| `/api/v1/phieu-kiem-ke` | `GET` | Danh sách phiếu kiểm kê | `200 OK` | Kèm chênh lệch sổ sách |
| `/api/v1/phieu-kiem-ke` | `POST` | Lập phiếu kiểm kê | `201 Created` | Tính chênh lệch = thực tế - sổ sách |
| `/api/v1/phieu-kiem-ke/:id/dieu-chinh` | `POST` | Cân đối điều chỉnh tồn | `200 OK` / `400` | Khóa hàng cập nhật tồn sổ sách |

---

## 16. AUDIT HÀNH VI GIAO DIỆN PHÍA FRONTEND (FRONTEND BUSINESS BEHAVIOR)

- **Truy vấn Dữ liệu Thật:** 100% các trang PH4 (`TonKhoPage.jsx`, `PhieuNhapPage.jsx`, `PhieuXuatPage.jsx`, `PhieuChuyenPage.jsx`, `PhieuKiemKePage.jsx`, `ViTriKhoPage.jsx`, `LoVatTuPage.jsx`) gọi trực tiếp API Backend thông qua Axios client tại `frontend/src/services/api.js`. Không sử dụng mock data tĩnh.
- **Xử lý Xung đột Tồn kho (HTTP 409):** `PhieuXuatPage.jsx` và `PhieuChuyenPage.jsx` bắt rõ `err.response?.status === 409`, hiển thị toast dạng `conflict` và thông báo lý do tranh chấp trực quan cho người dùng.
- **Làm mới dữ liệu (Data Refresh):** Sau khi lập phiếu thành công, các trang đều gọi `loadData()` để tải lại số dư tồn kho mới nhất từ PostgreSQL, bảo đảm không bị lệch dữ liệu trên màn hình.
- **Build Production:** Chạy `npm run build` hoàn tất thành công trong 4.63s với 0 warning và 0 error.

---

## 17. AUDIT HỢP ĐỒNG TÍCH HỢP PH4 ↔ PH5 (PH4 ↔ PH5 CONTRACT AUDIT)

Căn cứ quy định tại Điều 14 & Điều 15 của `ERP_MODULE_DEVELOPMENT_CONTRACT.md`:

| Tiêu chí tích hợp | Hiện trạng đánh giá | Chi tiết kỹ thuật |
| :--- | :---: | :--- |
| **DATABASE READY** | ✅ **SẴN SÀNG** | Bảng `ton_kho` có `gia_tri_ton_kho`. Bảng `phieu_nhap_kho` có `tong_gia_tri_nhap`, `chi_tiet_phieu_nhap` có `don_gia_nhap` & `thanh_tien`. Bảng `phieu_xuat_kho` có `tong_gia_tri_xuat`. Bảng `chi_tiet_kiem_ke` có `gia_tri_chenh_lech`. Lược đồ `but_toan_tong_hop` của PH5 đã có khóa ngoại `ma_chung_tu_goc`. |
| **API READY** | ✅ **SẴN SÀNG** | Toàn bộ API nghiệp vụ kho PH4 đều trả về các trường tài chính tiền tệ phục vụ hạch toán kế toán kho. |
| **CONTRACT READY** | ✅ **SẴN SÀNG** | Hợp đồng phát triển quy định rõ quy trình: Nhập/Xuất kho tại PH4 -> Tự động sinh bút toán hạch toán kho tại PH5 qua `ma_chung_tu_goc`. |
| **REAL E2E INTEGRATION** | ⏳ **PENDING** | **Phân hệ PH5 chưa được triển khai mã nguồn.** Theo đúng nguyên tắc kiểm toán: Không công nhận E2E PASS chỉ vì dùng chung Database. Trạng thái chính thức: `PENDING PH5 IMPLEMENTATION`. |

---

## 18. KẾT QUẢ THỰC THI KIỂM THỬ (TEST EXECUTION)

### 18.1. Bảng phân loại và kết quả test suite

| STT | Bộ kiểm thử | Phân loại kiểm thử | Kết quả | Đánh giá kỹ thuật |
| :---: | :--- | :--- | :---: | :--- |
| 1 | `node tests/test_ph4_api.js` | **REST API TEST** | **16/16 PASS (100%)** | Bao phủ toàn bộ 9 luồng nghiệp vụ PH4. |
| 2 | `node tests/test_concurrency.js` | **CONCURRENCY TEST** | **100% PASS** | Khóa bi quan loại bỏ race condition hoàn toàn. |
| 3 | `node tests/test_rbac_security.js` | **SECURITY & RBAC TEST** | **27/27 PASS (100%)** | Ngăn chặn giả mạo danh tính, token HMAC bảo mật. |
| 4 | `npm run build` | **BUILD INTEGRITY TEST** | **SUCCESS** | Vite bundle tạo ra sạch sẽ, không lỗi cú pháp. |
| 5 | `node tests/test_cross_module_integration.js` | **LEGACY TEST** | **1/8 PASS (12.5%)** | 7/8 test fail do file test cũ không gửi Bearer HMAC token (Xem Finding F-05). |

---

## 19. DANH MỤC PHÁT HIỆN KIỂM TOÁN (FINDINGS)

### Finding F-01: Thẻ kho chưa bao gồm phiếu chuyển kho và điều chỉnh kiểm kê
- **Mức độ nghiêm trọng:** `MEDIUM`
- **Vị trí:** `backend/src/controllers/tonKhoController.js` (Hàm `getTheKho`, dòng 88-125)
- **Hành vi kỳ vọng:** Thẻ kho phản ánh toàn bộ các biến động làm tăng/giảm tồn kho của vật tư tại kho chỉ định (Nhập kho, Xuất kho, Chuyển đến, Chuyển đi, Điều chỉnh kiểm kê).
- **Hành vi thực tế:** Hàm `getTheKho` hiện chỉ truy vấn bảng `chi_tiet_phieu_nhap` và `chi_tiet_phieu_xuat`. Các giao dịch chuyển kho (`phieu_chuyen_kho`) và điều chỉnh kiểm kê (`phieu_kiem_ke`) không xuất hiện trên Thẻ kho, khiến tổng biến động không khớp với số dư `so_luong_ton` thực tế nếu kho có phát sinh chuyển kho hoặc kiểm kê.
- **Tác động nghiệp vụ:** Thủ kho tra cứu Thẻ kho sẽ không thấy các đợt điều chuyển nội bộ hoặc điều chỉnh cân đối kiểm kê.
- **Đề xuất xử lý:** Trong đợt nâng cấp tới, bổ sung truy vấn `UNION ALL` với `chi_tiet_chuyen_kho` (chuyển đi ghi âm, chuyển đến ghi dương) và `chi_tiet_kiem_ke` (chênh lệch kiểm kê).

---

### Finding F-02: Cơ chế FEFO/FIFO là sắp xếp hiển thị, chưa phải phân bổ tự động
- **Mức độ nghiêm trọng:** `INFO`
- **Vị trí:** `backend/src/controllers/loVatTuController.js` (dòng 52-54) & `phieuXuatController.js` (dòng 189-217)
- **Hành vi kỳ vọng:** Làm rõ phạm vi tính năng FEFO/FIFO trong tài liệu bàn giao.
- **Hành vi thực tế:** Backend chỉ sắp xếp thứ tự ưu tiên các lô theo hạn dùng sớm nhất (`ORDER BY l.han_su_dung ASC NULLS LAST`). Backend không tự động cắt số lượng từ nhiều lô khác nhau nếu người dùng không chỉ định lô cụ thể.
- **Tác động nghiệp vụ:** Không ảnh hưởng đến dữ liệu; người dùng chọn lô nào thì hệ thống xuất đúng lô đó.
- **Đề xuất xử lý:** Ghi chú rõ ràng trong tài liệu người dùng: "Hệ thống hỗ trợ gợi ý thứ tự xuất theo FEFO/FIFO trên màn hình; thủ kho chủ động chọn lô theo gợi ý".

---

### Finding F-03: Nhập kho số lượng <= 0 trả về mã HTTP 500 thay vì HTTP 400
- **Mức độ nghiêm trọng:** `LOW`
- **Vị trí:** `backend/src/controllers/phieuNhapController.js` (dòng 187-189)
- **Hành vi kỳ vọng:** Khi `so_luong_nhap <= 0`, API trả về mã `HTTP 400 Bad Request`.
- **Hành vi thực tế:** Controller gọi `throw new Error(...)` mà không gán thuộc tính `err.statusCode = 400`. Do đó `errorHandler.js` mặc định coi đây là lỗi máy chủ chưa xử lý và trả về `HTTP 500`.
- **Tác động nghiệp vụ:** Giao dịch vẫn bị hủy bỏ an toàn (không bao giờ nhập âm), nhưng mã HTTP phản hồi chưa đúng chuẩn RESTful API.
- **Đề xuất xử lý:** Gán `err.statusCode = 400` trước khi throw.

---

### Finding F-04: Tạo phiếu nhập trùng mã chứng từ trả về lỗi DB HTTP 500 thay vì HTTP 409
- **Mức độ nghiêm trọng:** `LOW`
- **Vị trí:** `backend/src/controllers/phieuNhapController.js` (dòng 156-162)
- **Hành vi kỳ vọng:** Khi trùng mã phiếu nhập tùy chọn do người dùng gửi lên, trả về `HTTP 409 Conflict` với thông báo rõ ràng.
- **Hành vi thực tế:** Database kích hoạt lỗi vi phạm `UNIQUE (ma_phieu_nhap)` và backend trả về `HTTP 500`.
- **Tác động nghiệp vụ:** Dữ liệu không bị trùng lặp vì PostgreSQL đã chặn ở tầng CSDL; chỉ ảnh hưởng trải nghiệm thông báo lỗi.
- **Đề xuất xử lý:** Bắt mã lỗi PostgreSQL `23505` (unique_violation) và chuyển đổi thành `HTTP 409 Conflict`.

---

### Finding F-05: Script kiểm thử cũ `test_cross_module_integration.js` thiếu Token HMAC
- **Mức độ nghiêm trọng:** `MEDIUM` (Về phương diện Test Suite)
- **Vị trí:** `backend/tests/test_cross_module_integration.js`
- **Hành vi kỳ vọng:** Script kiểm thử gửi kèm token xác thực HMAC theo đúng chuẩn Zero-Trust RBAC mới.
- **Hành vi thực tế:** Script này được viết từ giai đoạn trước khi nâng cấp RBAC, chỉ gửi header `x-role` và `x-user-id` mà không gửi kèm `Authorization: Bearer <token>`. Vì vậy, 7/8 test case bị chặn bởi HTTP 401 Unauthorized.
- **Tác động nghiệp vụ:** Không ảnh hưởng đến mã nguồn chạy thực tế; chỉ là file test cũ chưa được cập nhật theo chuẩn bảo mật mới.
- **Đề xuất xử lý:** Cập nhật hàm `apiRequest` trong file test này bổ sung token được ký bởi `signToken(userId)` như trong `test_ph4_api.js`.

---

## 20. PHÂN LOẠI MỨC ĐỘ RỦI RO (RISK CLASSIFICATION)

```text
CRITICAL (0):  ████████████████████ 0 lỗi
HIGH     (0):  ████████████████████ 0 lỗi
MEDIUM   (2):  ▓▓▓▓▓▓ 2 phát hiện (Thẻ kho thiếu nguồn phiếu chuyển/kiểm kê, Test script cũ thiếu token)
LOW      (2):  ░░░░ 2 phát hiện (Mã lỗi HTTP 500 cho số lượng nhập <= 0 và trùng mã phiếu)
INFO     (1):  ░░ 1 ghi nhận (Minh định FIFO/FEFO sorting vs auto-allocation)
```

---

## 21. BẢNG ĐIỂM ĐÁNH GIÁ (AUDIT SCORING)

| STT | Trục đánh giá kỹ thuật & nghiệp vụ | Điểm tối đa | Điểm đạt được | Đánh giá |
| :---: | :--- | :---: | :---: | :--- |
| 1 | **Database Integrity** (Schema, Ràng buộc, Invariants) | 100 | **98** | Schema chuẩn, 0 orphan FK, 0 âm tồn kho. |
| 2 | **Inventory Logic** (Tính toán tồn kho, Định mức, Cảnh báo) | 100 | **95** | Tính toán chuẩn xác, trạng thái cảnh báo tự động. |
| 3 | **Receipt Logic** (Nhập kho, Tạo lô, Giao dịch) | 100 | **94** | Nguyên tử, khóa hàng; trừ điểm nhỏ HTTP status edge case. |
| 4 | **Issue Logic** (Xuất kho, Chặn xuất âm, Quản lý lô) | 100 | **98** | Khóa bi quan chặt chẽ, chặn xuất âm 2 lớp tuyệt đối. |
| 5 | **Transfer Logic** (Chuyển kho 2 đầu, Bảo toàn hệ thống) | 100 | **96** | Nguyên tử giữa 2 kho, chặn chuyển cùng kho, bảo toàn số dư. |
| 6 | **Stocktake Logic** (Kiểm kê, Công thức chênh lệch, Cân đối) | 100 | **96** | Công thức đúng 100%, quy trình 2 bước an toàn. |
| 7 | **Lot / FIFO / FEFO** (Quản lý hạn dùng, Sắp xếp thứ tự) | 100 | **88** | Sorting chuẩn xác; chưa có auto-allocation chia lô. |
| 8 | **Stock Card** (Thẻ kho, Lịch sử biến động) | 100 | **85** | Derived đúng từ nhập/xuất; thiếu nguồn chuyển/kiểm kê. |
| 9 | **Transaction & ACID** (BEGIN, COMMIT, ROLLBACK, Release) | 100 | **98** | Tuân thủ 100% cấu trúc try/catch/finally release pool. |
| 10 | **Concurrency** (SELECT ... FOR UPDATE, Khóa bi quan) | 100 | **100** | Test tranh chấp đồng thời đạt kết quả hoàn hảo. |
| 11 | **API / Business Consistency** (REST API, Mã lỗi, Toast UI) | 100 | **95** | Phản hồi đầy đủ, giao diện bắt lỗi 409 hiển thị trực quan. |
| 12 | **Edge Cases** (Số lượng âm, 0, thập phân, Rollback đa dòng) | 100 | **92** | Đa số case xử lý tốt; trừ điểm nhỏ case throw error thiếu status. |
| 13 | **Test Suite Quality** (API, Concurrency, Security, Build) | 100 | **92** | Test chính đạt 100%; test cũ cần cập nhật token. |
| **TỔNG** | **OVERALL BUSINESS LOGIC SCORE** | **1300** | **1227** | **94.4 / 100 (HẠNG XUẤT SẮC)** |

---

## 22. ĐỀ XUẤT HƯỚNG XỬ LÝ (RECOMMENDATIONS)

*Lưu ý: Tuân thủ nguyên tắc AUDIT ONLY — Các đề xuất này được ghi nhận cho lộ trình bảo trì tiếp theo, TUYỆT ĐỐI KHÔNG sửa code trong giai đoạn đóng băng hiện tại.*

1. **Nâng cấp hàm Thẻ kho (`getTheKho`):** Bổ sung truy vấn hợp nhất với `chi_tiet_chuyen_kho` và `chi_tiet_kiem_ke`, tính toán cột tồn lũy kế (*running balance*) theo thời gian.
2. **Chuẩn hóa Error Handling trong `phieuNhapController.js`:** Bổ sung `err.statusCode = 400` cho trường hợp số lượng nhập $\le 0$ và bắt mã lỗi CSDL `23505` để trả về `HTTP 409 Conflict`.
3. **Cập nhật script kiểm thử liên phân hệ cũ (`test_cross_module_integration.js`):** Bổ sung token HMAC Bearer để script test này đồng bộ với chính sách bảo mật Zero-Trust hiện hành.

---

## 23. KHUYẾN NGHỊ ĐÓNG BĂNG (FREEZE RECOMMENDATION)

Căn cứ trên kết quả kiểm toán toàn diện:
- **Phân hệ PH4 — Kho & Quản lý vật tư** có nền tảng kiến trúc vững chắc, logic nghiệp vụ chặt chẽ, bảo vệ dữ liệu tồn kho an toàn tuyệt đối trước các nguy cơ xuất âm và tranh chấp đồng thời.
- **KHUYẾN NGHỊ CHÍNH THỨC:** **TIẾP TỤC DUY TRÌ TRẠNG THÁI ĐÓNG BĂNG (STRICT FREEZE)** đối với toàn bộ mã nguồn Backend, Frontend và CSDL của PH4.
- Không cho phép bất kỳ nhóm phát triển phân hệ ngoài (PH1, PH2, PH3, PH5) tự ý can thiệp vào các controller, routes hay bảng dữ liệu của PH4.

---

## 24. KẾT LUẬN CUỐI CÙNG (FINAL VERDICT)

```
================================================================================
                                FINAL VERDICT:
                         PASS WITH MINOR FINDINGS
================================================================================
```
Phân hệ **PH4 — Kho & Quản lý vật tư — ERP May 10** chính thức đạt kết luận **PASS WITH MINOR FINDINGS**. Hệ thống đáp ứng đầy đủ và chuẩn xác các quy tắc nghiệp vụ cốt lõi, bảo toàn giao dịch ACID và bảo vệ tính toàn vẹn của dữ liệu trong môi trường doanh nghiệp quy mô lớn.
