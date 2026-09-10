# PHÂN HỆ 4: KHO & QUẢN LÝ VẬT TƯ (ERP MAY 10)
## 01. TỔNG QUAN KIẾN TRÚC & PHẠM VI HỆ THỐNG

---

### 1. Giới thiệu phân hệ
Phân hệ **PH4 — Kho & Quản lý vật tư** là trung tâm kiểm soát toàn bộ dòng vật tư, nguyên phụ liệu (vải chính, vải lót, chỉ may, cúc bấm, khóa kéo, bao bì đóng gói) và thành phẩm may mặc của Tổng Công ty May 10.

Hệ thống được thiết kế theo mô hình **3-Tier Architecture hiện đại**:
```
[Client Web SPA: React.js + Tailwind CSS] (Port 5173)
                   │
                   ▼ (HTTP/REST API JSON - UTF-8)
[Backend Server: Node.js + Express.js] (Port 5000)
                   │
                   ▼ (pg Pool - PostgreSQL Transaction + FOR UPDATE)
[Database: PostgreSQL 18.6 - Database: erp_may10, Schema: public] (Port 5432)
```

---

### 2. Danh mục 11 bảng dữ liệu PH4
Hệ thống kết nối trực tiếp 100% vào database `erp_may10` đã chuẩn hóa ở STEP 1, không tạo thêm bảng dư thừa:

1. **`vi_tri_kho`**: Quản lý kệ, giá đỡ, tầng, ô, sức chứa tối đa và trạng thái (trống, có hàng, đầy) theo từng kho.
2. **`lo_vat_tu`**: Quản lý từng cây vải / lô phụ liệu, số lượng nhập, số lượng hiện tại, đơn giá nhập, hạn dùng (FEFO) và trạng thái.
3. **`ton_kho`**: Quản lý tổng hợp số lượng và giá trị tồn kho theo từng cặp `(ma_kho, ma_vat_tu)`, ràng buộc `UNIQUE(ma_kho, ma_vat_tu)`.
4. **`phieu_nhap_kho`**: Đầu phiếu nhập kho từ đơn mua hàng NCC, thành phẩm may sau KCS, chuyển kho hoặc cân đối kiểm kê.
5. **`chi_tiet_phieu_nhap`**: Dòng chi tiết vật tư nhập, liên kết lô, đơn giá, thành tiền và vị trí cất.
6. **`phieu_xuat_kho`**: Đầu phiếu xuất kho phục vụ xưởng may (PH2), giao khách (PH1), điều chuyển nội bộ hoặc xuất hủy.
7. **`chi_tiet_phieu_xuat`**: Dòng chi tiết vật tư xuất, trừ số lượng tồn kho và số lượng lô tương ứng.
8. **`phieu_chuyen_kho`**: Phiếu điều chuyển nội bộ giữa 2 kho với ràng buộc `CHECK (ma_kho_xuat <> ma_kho_nhap)`.
9. **`chi_tiet_chuyen_kho`**: Dòng chi tiết vật tư điều chuyển.
10. **`phieu_kiem_ke`**: Đợt kiểm kê định kỳ hoặc đột xuất tại từng kho.
11. **`chi_tiet_kiem_ke`**: Đối soát số tồn sổ sách vs thực tế kiểm đếm, tính chênh lệch và giá trị chênh lệch.

---

### 3. Nguyên tắc bảo vệ tính toàn vẹn kho
1. **Không cho phép tồn kho âm:** Bất kỳ thao tác xuất kho hoặc chuyển kho nào đều kiểm tra `so_luong_ton >= so_luong_xuat`. Nếu vượt quá, giao dịch lập tức bị hủy bỏ (`ROLLBACK`) và trả về HTTP `409 Conflict`.
2. **Chống Race Condition bằng Khóa dòng:** Áp dụng `SELECT ... FROM ton_kho WHERE ma_kho = $1 AND ma_vat_tu = $2 FOR UPDATE;` trong PostgreSQL Transaction. Mọi luồng đồng thời phải chờ khóa được giải phóng hoặc bị từ chối an toàn.
3. **Đồng bộ Master Data:** Sử dụng thống nhất 6 bảng Master Data (`nguoi_dung`, `don_vi_tinh`, `kho`, `nha_cung_cap`, `san_pham`, `vat_tu`).
