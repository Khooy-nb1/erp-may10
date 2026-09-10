# THIẾT KẾ CƠ SỞ DỮ LIỆU PHÂN HỆ MUA HÀNG (PH3)
**Hệ thống:** ERP May 10  
**Cơ sở dữ liệu:** PostgreSQL (`erp_may10`, Schema 41 bảng dùng chung)  
**Phiên bản:** 1.0.0  

---

## 1. Nguyên tắc Tổ chức Dữ liệu
1. **Một CSDL Duy nhất:** Toàn bộ hệ thống ERP May 10 sử dụng duy nhất cơ sở dữ liệu `erp_may10`. Phân hệ PH3 không tạo thêm CSDL riêng hay trùng lặp bảng danh mục (Không tạo bảng `ncc`, bảng `suppliers` mới khi đã có `nha_cung_cap`).
2. **Khóa Ngoại và Ràng buộc Toàn vẹn (Referential Integrity):**
   - Mọi bản ghi đơn mua hàng đều tham chiếu trực tiếp đến `nha_cung_cap(id)`, `nguoi_dung(id)`, `vat_tu(id)`.
   - Bảng nhập kho của PH4 (`phieu_nhap_kho`) có cột khóa ngoại `ma_don_mua_hang` tham chiếu trực tiếp đến `don_mua_hang(id)`.

---

## 2. Chi tiết Các Bảng Do PH3 Quản lý & Sở hữu

### 2.1. Bảng `nha_cung_cap` (Nhà cung cấp)
Lưu trữ hồ sơ đối tác cung ứng vải, phụ liệu, hóa chất, bao bì, máy móc cho May 10.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY | Khóa chính tự tăng |
| `ma_nha_cung_cap` | VARCHAR(50) | UNIQUE, NOT NULL | Mã nhà cung cấp (vd: `NCC-001`) |
| `ten_nha_cung_cap` | VARCHAR(200) | NOT NULL | Tên pháp nhân nhà cung cấp |
| `ma_so_thue` | VARCHAR(20) | | Mã số thuế doanh nghiệp |
| `dia_chi` | TEXT | NOT NULL | Trụ sở đăng ký kinh doanh |
| `quoc_gia` | VARCHAR(100) | DEFAULT 'Viet Nam' | Quốc gia xuất xứ |
| `nguoi_lien_he` | VARCHAR(150) | NOT NULL | Người đại diện giao dịch |
| `so_dien_thoai` | VARCHAR(20) | NOT NULL | Số điện thoại liên hệ |
| `email` | VARCHAR(100) | NOT NULL | Hộp thư điện tử chính thức |
| `loai_hang_cung_cap`| TEXT | | Chủng loại hàng (vải, chỉ, cúc, bao bì...) |
| `han_muc_tin_dung` | NUMERIC(18,2)| DEFAULT 0 | Hạn mức công nợ cho phép (VNĐ) |
| `so_ngay_gia_han` | INTEGER | DEFAULT 30 | Thời hạn thanh toán công nợ (ngày) |
| `diem_danh_gia` | NUMERIC(3,1) | DEFAULT 0 | Điểm xếp hạng chất lượng (thang điểm 5.0) |
| `trang_thai` | VARCHAR(20) | DEFAULT 'hoat_dong' | `hoat_dong`, `tam_dung`, `ngung_hop_tac` |
| `ngay_tao` | TIMESTAMPTZ | DEFAULT NOW() | Thời điểm tạo bản ghi |
| `ngay_cap_nhat` | TIMESTAMPTZ | DEFAULT NOW() | Thời điểm cập nhật cuối cùng |
| `nguoi_tao` | BIGINT | REFERENCES `nguoi_dung(id)` | Người nhập liệu ban đầu |
| `nguoi_cap_nhat` | BIGINT | REFERENCES `nguoi_dung(id)` | Người chỉnh sửa gần nhất |

---

### 2.2. Bảng `don_mua_hang` (Đơn mua hàng - PO Header)
Quản lý thông tin chung của hợp đồng hoặc đơn đặt hàng mua nguyên phụ liệu.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY | Khóa chính tự tăng |
| `ma_don_mua` | VARCHAR(50) | UNIQUE, NOT NULL | Mã định danh đơn mua (vd: `DMH-20260910-1234`) |
| `ma_nha_cung_cap` | BIGINT | NOT NULL, REFERENCES `nha_cung_cap(id)` | Khóa ngoại tới nhà cung cấp |
| `ma_yeu_cau_mua_hang` | BIGINT | NULL, REFERENCES `yeu_cau_mua_hang(id)` | Tham chiếu yêu cầu mua (nếu có) |
| `ngay_dat_hang` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Ngày phát hành đơn hàng |
| `ngay_giao_hang_yc`| TIMESTAMPTZ | NOT NULL | Hạn chót giao hàng theo cam kết |
| `tong_tien_hang` | NUMERIC(18,2)| NOT NULL | Tổng giá trị hàng trước thuế (VNĐ) |
| `tien_thue` | NUMERIC(18,2)| DEFAULT 0 | Tiền thuế GTGT (8% VAT) |
| `tong_thanh_toan` | NUMERIC(18,2)| NOT NULL | Tổng tiền phải trả (`tong_tien_hang + tien_thue`) |
| `dieu_kien_thanh_toan` | TEXT | | Điều khoản thanh toán thương mại |
| `nguoi_dat_hang` | BIGINT | REFERENCES `nguoi_dung(id)` | Cán bộ phụ trách đơn mua |
| `ghi_chu` | TEXT | | Ghi chú, chỉ dẫn hoặc lý do hủy đơn |
| `trang_thai` | VARCHAR(20) | DEFAULT 'cho_duyet' | `cho_duyet`, `da_gui_ncc`, `da_xac_nhan`, `dang_giao`, `da_nhap_kho`, `huy` |
| `ngay_tao` | TIMESTAMPTZ | DEFAULT NOW() | Thời điểm tạo |
| `ngay_cap_nhat` | TIMESTAMPTZ | DEFAULT NOW() | Thời điểm cập nhật |
| `nguoi_tao` | BIGINT | REFERENCES `nguoi_dung(id)` | Người lập đơn |
| `nguoi_cap_nhat` | BIGINT | REFERENCES `nguoi_dung(id)` | Người duyệt/hủy/chuyển trạng thái |

---

### 2.3. Bảng `chi_tiet_don_mua` (Chi tiết đơn mua hàng - Line Items)
Lưu từng mặt hàng nguyên phụ liệu cụ thể trong đơn mua hàng.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY | Khóa chính tự tăng |
| `ma_don_mua_hang` | BIGINT | NOT NULL, REFERENCES `don_mua_hang(id)` | Khóa ngoại tới đơn mua hàng cha |
| `ma_vat_tu` | BIGINT | NOT NULL, REFERENCES `vat_tu(id)` | Khóa ngoại tới danh mục vật tư |
| `so_luong_dat` | NUMERIC(18,3)| NOT NULL, CHECK (`so_luong_dat > 0`) | Số lượng đặt mua theo đơn vị chuẩn |
| `don_gia` | NUMERIC(18,2)| NOT NULL, CHECK (`don_gia >= 0`) | Đơn giá mua chưa VAT (VNĐ) |
| `thanh_tien` | NUMERIC(18,2)| NOT NULL | `so_luong_dat * don_gia` |
| `so_luong_da_nhap` | NUMERIC(18,3)| DEFAULT 0, CHECK (`so_luong_da_nhap >= 0`) | Lũy kế số lượng thực tế đã nhập kho |
| `ghi_chu` | TEXT | | Yêu cầu kỹ thuật, quy cách đóng gói |
| `ngay_tao` | TIMESTAMPTZ | DEFAULT NOW() | Thời điểm tạo |
| `ngay_cap_nhat` | TIMESTAMPTZ | DEFAULT NOW() | Thời điểm cập nhật |

---

## 3. Quan hệ Liên kết với Bảng Phân hệ Khác

```
+----------------+          1 : N         +-------------------+
|  nha_cung_cap  |----------------------< |   don_mua_hang    |
+----------------+                        +-------------------+
                                                    | 1
                                                    |
                                                    | N
                                          +-------------------+
                                          | chi_tiet_don_mua  |
                                          +-------------------+
                                                    | N
                                                    |
                                                    | 1
                                          +-------------------+
                                          |      vat_tu       |
                                          +-------------------+

+-------------------+       1 : N         +-------------------+
|   don_mua_hang    |-------------------< |  phieu_nhap_kho   | (Phân hệ Kho PH4)
+-------------------+                     +-------------------+
```
- **PH3 -> PH4:** Cột `phieu_nhap_kho.ma_don_mua_hang` là Foreign Key liên kết sang `don_mua_hang.id`.
- **Đảm bảo đồng bộ:** Khi PH4 tạo phiếu nhập kho, số lượng nhận sẽ được tích lũy vào `chi_tiet_don_mua.so_luong_da_nhap` thông qua endpoint `/api/v1/purchasing/receive-status-update`.
