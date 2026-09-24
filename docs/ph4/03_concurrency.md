# PHÂN HỆ 4: KHO & QUẢN LÝ VẬT TƯ (ERP MAY 10)
## 03. CƠ CHẾ KHÓA DÒNG (ROW-LEVEL LOCKING) & CHỐNG RACE CONDITION

---

### 1. Bản chất vấn đề Race Condition trong hệ thống Kho
Trong môi trường nhà máy may mặc May 10 với hàng chục xưởng may và bộ phận bán hàng cùng truy cập:
* Giả sử tồn kho mặt hàng **Vải Kate Lụa Trắng** tại Kho 1 còn: **100 mét**.
* Vào cùng một mili-giây:
  * **Request A (Xưởng may 1)**: Xin cấp 80 mét vải để cắt áo sơ mi.
  * **Request B (Xưởng may 2)**: Xin cấp 50 mét vải để chạy chuyền dự phòng.
* **Nếu không có cơ chế khóa dòng:**
  * Cả Request A và Request B đều đọc `SELECT so_luong_ton FROM ton_kho ...` và thấy kết quả là 100.
  * Request A tính: $100 - 80 = 20 \ge 0 \rightarrow$ Thành công.
  * Request B tính: $100 - 50 = 50 \ge 0 \rightarrow$ Thành công.
  * Kết quả: Tổng xuất là 130 mét, tồn kho bị ghi đè thành $20$ hoặc $-30$ (âm tồn kho). Đây là lỗi nghiêm trọng làm sai lệch báo cáo tài chính và ngưng trệ sản xuất.

---

### 2. Giải pháp kỹ thuật triển khai tại ERP May 10
Hệ thống sử dụng cơ chế **Row-Level Locking (Khóa dòng dữ liệu)** của PostgreSQL bên trong một **Database Transaction cô lập**:

```sql
BEGIN;

-- 1. Khóa dòng tồn kho cụ thể của kho và vật tư yêu cầu
SELECT id, so_luong_ton, gia_tri_ton_kho 
FROM ton_kho 
WHERE ma_kho = $1 AND ma_vat_tu = $2 
FOR UPDATE;

-- 2. Kiểm tra tồn kho khả dụng ngay tại luồng sở hữu khóa
-- Nếu so_luong_ton < so_luong_xuat:
--    ROLLBACK;
--    Trả về HTTP 409 Conflict.

-- 3. Cập nhật trừ tồn kho an toàn
UPDATE ton_kho 
SET so_luong_ton = so_luong_ton - $so_luong_xuat,
    gia_tri_ton_kho = GREATEST(0, gia_tri_ton_kho - $gia_tri_xuat),
    ngay_cap_nhat = NOW()
WHERE id = $id;

COMMIT;
```

#### Nguyên lý vận hành:
1. Mệnh đề `FOR UPDATE` đặt một khóa độc quyền (`Exclusive Lock`) trên bản ghi hàng tồn kho cụ thể `(ma_kho, ma_vat_tu)`.
2. Bất kỳ giao dịch nào khác cố gắng đọc để cập nhật cùng bản ghi đó sẽ **phải đợi** cho đến khi giao dịch đầu tiên hoàn tất (`COMMIT` hoặc `ROLLBACK`).
3. Khi giao dịch thứ hai được cấp quyền tiếp cận dòng dữ liệu, nó sẽ đọc được số lượng tồn **đã được cập nhật mới nhất** (trong kịch bản trên là 20 mét).
4. Logic kiểm tra nhận diện ngay $20 < 50$, lập tức kích hoạt `ROLLBACK` và trả về mã lỗi HTTP `409 Conflict`.

---

### 3. Kết quả nghiệm thu thực tế từ Test Script (`tests/test_concurrency.js`)
* **Thiết lập:** Kho 1, Vải Kate Lụa Trắng, Tồn kho ban đầu = 100 mét.
* **Thực thi:** Bắn đồng thời 2 Request A (80 mét) và Request B (50 mét) qua `Promise.all`.
* **Kết quả thu được:**
  * `Response A`: **HTTP 201 Created** — Lập phiếu xuất kho thành công.
  * `Response B`: **HTTP 409 Conflict** — `Xung đột tồn kho: Mặt hàng [Vải Kate Lụa Trắng Khổ 1.5m] (VT-VAI-KATE-01) không đủ số lượng để xuất. Tồn khả dụng hiện tại: 20, Yêu cầu xuất: 50. Giao dịch bị hủy bỏ.`
  * `Tồn kho đối soát cuối cùng trong PostgreSQL`: **Chính xác 20.000 mét**.
  * **Tồn kho tuyệt đối không bị âm!**
