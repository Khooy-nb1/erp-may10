# QUY TẮC NGHIỆP VỤ VÀ KIỂM SOÁT TRANH CHẤP ĐỒNG THỜI (PH3 BUSINESS RULES & CONCURRENCY)
**Hệ thống:** ERP May 10  
**Phân hệ:** PH3 - Mua hàng & Nhà cung cấp  
**Phiên bản:** 1.0.0  

---

## 1. Ranh giới Giao dịch (Transaction Boundaries)
Mọi thao tác có tác động đến nhiều bảng hoặc yêu cầu tính toàn vẹn cao đều phải chạy bên trong khối giao dịch ACID chặt chẽ:

```javascript
const client = await db.getClient();
try {
  await client.query('BEGIN');

  // Thao tác 1: Kiểm tra hoặc khóa dòng với FOR UPDATE
  // Thao tác 2: Ghi dữ liệu bảng cha
  // Thao tác 3: Ghi dữ liệu bảng con

  await client.query('COMMIT');
  return res.json({ success: true, ... });
} catch (err) {
  await client.query('ROLLBACK');
  next(err);
} finally {
  client.release(); // TUYỆT ĐỐI KHÔNG ĐỂ RÒ RỈ CONNECTION
}
```
**Quy tắc bất di bất dịch:** Khối `finally { client.release(); }` luôn luôn được gọi để trả kết nối về pool, ngăn ngừa cạn kiệt connection pool trong điều kiện tải cao.

---

## 2. Máy Trạng thái Đơn Mua Hàng (PO State Machine)
Đơn mua hàng trải qua vòng đời nghiêm ngặt, chỉ được chuyển dịch trạng thái theo sơ đồ sau:

```
[cho_duyet] (Chờ duyệt)
    │
    ├── (Approve) ──────────────────────> [da_gui_ncc] (Đã gửi NCC)
    │                                           │
    ├── (Cancel) ───────┐                       ├── (NCC Confirm) ──> [da_xac_nhan] (Đã xác nhận)
    │                   │                       │                           │
    v                   v                       ├── (Cancel)                ├── (Shipping) ──> [dang_giao] (Đang giao)
[huy] (Đã hủy) <────────┴───────────────────────┴───────────────────────────┤                       │
  ▲ (Terminal)                                                              ├── (Cancel)            ├── (Full Received)
  │                                                                         │                       │
  └─────────────────────────────────────────────────────────────────────────┴───────────────────────┼──> [da_nhap_kho] (Đã nhập kho)
                                                                                                    │          ▲ (Terminal)
                                                                                                    └──────────┘
```

### Bảng Quy tắc Chuyển dịch Hợp lệ (`VALID_TRANSITIONS`):
- `cho_duyet` -> Cho phép: `da_gui_ncc`, `huy`
- `da_gui_ncc` -> Cho phép: `da_xac_nhan`, `huy`
- `da_xac_nhan` -> Cho phép: `dang_giao`, `huy`
- `dang_giao` -> Cho phép: `da_nhap_kho` (khi đã nhận một phần hàng, không cho phép hủy đơn nếu không có thủ tục hoàn trả)
- `da_nhap_kho` -> Trạng thái kết thúc (Terminal): không được phép chuyển đổi
- `huy` -> Trạng thái kết thúc (Terminal): không được phép chuyển đổi

---

## 3. Kiểm soát Tranh chấp Đồng thời (Concurrency Locking)

### 3.1. Chống Phê duyệt Trùng lặp (Double Approval Prevention)
- **Tình huống:** Hai cấp quản lý hoặc hai phiên duyệt cùng click phê duyệt cho 1 PO ID đồng thời.
- **Giải pháp:**
  1. Sử dụng `SELECT id, ma_don_mua, trang_thai FROM don_mua_hang WHERE id = $1 FOR UPDATE` để đặt khóa độc quyền (Exclusive Row Lock).
  2. Kiểm tra trạng thái hiện tại: nếu `currentPO.trang_thai !== 'cho_duyet'` thì `ROLLBACK` và trả về `HTTP 409 Conflict`.
  3. Cập nhật kèm điều kiện nguyên tử: `UPDATE don_mua_hang SET trang_thai = 'da_gui_ncc' ... WHERE id = $2 AND trang_thai = 'cho_duyet'`.
  4. Nếu `updateRes.rows.length === 0`, kích hoạt `ROLLBACK` và trả về `HTTP 409 Conflict`.

### 3.2. Chống Hủy Trùng lặp (Double Cancel Prevention)
- **Tình huống:** Yêu cầu hủy đơn được gửi lặp lại đồng thời.
- **Giải pháp:**
  1. Đặt khóa dòng `FOR UPDATE`.
  2. Kiểm tra `if (currentPO.trang_thai === 'huy')` -> trả về `HTTP 409 Conflict`.
  3. Kiểm tra `if (currentPO.trang_thai === 'da_nhap_kho')` -> trả về `HTTP 409 Conflict` (không được hủy đơn đã nhập kho).
  4. Cập nhật với điều kiện loại trừ: `UPDATE don_mua_hang SET trang_thai = 'huy' ... WHERE id = $3 AND trang_thai NOT IN ('huy', 'da_nhap_kho')`.

### 3.3. Chống Trùng lặp Bước Chuyển Trạng thái (Duplicate State Transition)
- Mọi câu lệnh cập nhật trạng thái đều gắn liền với giá trị trạng thái kỳ vọng tại thời điểm khóa:
  `WHERE id = $4 AND trang_thai = $5`.
- Nếu hai request song song cố gắng chuyển từ `da_gui_ncc` sang `da_xac_nhan`, chính xác 1 request thành công (HTTP 200 OK) và request còn lại bị chặn đứng với **HTTP 409 Conflict**.

---

## 4. Các Quy tắc Kiểm tra Hợp lệ Dữ liệu (Validation Rules)
1. **Nhà cung cấp:**
   - Tên nhà cung cấp, địa chỉ, người liên hệ là chuỗi không rỗng.
   - Số điện thoại phải đúng định dạng từ 7 - 20 ký tự số.
   - Email phải đúng cú pháp regex `name@domain`.
   - Hạn mức tín dụng và số ngày gia hạn nợ phải `>= 0`.
2. **Đơn mua hàng:**
   - Phải chọn nhà cung cấp tồn tại và đang ở trạng thái `hoat_dong`.
   - Ngày giao hàng yêu cầu (`ngay_giao_hang_yc`) phải hợp lệ và nằm trong tương lai.
   - Danh sách mặt hàng (`chiTiet`) phải có ít nhất 1 dòng.
   - `so_luong_dat` phải là số dương lớn hơn 0 (`> 0`).
   - `don_gia` phải là số không âm (`>= 0`).
   - Tự động tính thuế GTGT tiêu chuẩn 8% (`tongTienHang * 0.08`).
