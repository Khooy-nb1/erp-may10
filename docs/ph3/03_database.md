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
| `so_luong_loi_hong` | NUMERIC(18,3)| DEFAULT 0 | Số lượng lỗi hỏng ghi nhận khi kiểm nghiệm nhận hàng |
| `ghi_chu_kiem_dinh` | TEXT | | Ghi chú biên bản kiểm định chất lượng |
| `ngay_tao` | TIMESTAMPTZ | DEFAULT NOW() | Thời điểm tạo |
| `ngay_cap_nhat` | TIMESTAMPTZ | DEFAULT NOW() | Thời điểm cập nhật |

---

### 2.4. Bảng `yeu_cau_mua_hang` (Purchase Requisition Header - PR)
Quản lý yêu cầu mua nguyên phụ liệu từ các phân xưởng sản xuất hoặc nhu cầu tồn kho an toàn.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY | Khóa chính tự tăng |
| `ma_yeu_cau_mua` | VARCHAR(50) | UNIQUE, NOT NULL | Mã yêu cầu mua sắm (vd: `PR-20260911-001`) |
| `nguon_yeu_cau` | VARCHAR(50) | NOT NULL | `san_xuat`, `kho`, `noi_bo` |
| `ma_nhu_cau_npl` | BIGINT | NULL | Tham chiếu nhu cầu NPL từ Kế hoạch sản xuất |
| `ngay_yeu_cau` | TIMESTAMPTZ | NOT NULL | Ngày lập yêu cầu mua |
| `nguoi_yeu_cau` | BIGINT | REFERENCES `nguoi_dung(id)` | Người đề xuất mua |
| `nguoi_phe_duyet` | BIGINT | REFERENCES `nguoi_dung(id)` | Trưởng bộ phận / Quản lý duyệt |
| `ngay_phe_duyet` | TIMESTAMPTZ | | Thời điểm phê duyệt |
| `ghi_chu` | TEXT | | Lý do mua, phân xưởng sử dụng |
| `trang_thai` | VARCHAR(20) | DEFAULT 'cho_duyet' | `cho_duyet`, `da_duyet`, `da_tao_don`, `tu_choi`, `huy` |

---

### 2.5. Bảng `chi_tiet_yeu_cau_mua` (PR Line Items)
Danh sách chi tiết các mặt hàng cần mua sắm.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY | Khóa chính tự tăng |
| `ma_yeu_cau_mua_hang` | BIGINT | REFERENCES `yeu_cau_mua_hang(id)` | Khóa ngoại PR cha |
| `ma_vat_tu` | BIGINT | REFERENCES `vat_tu(id)` | Mã vật tư cần mua |
| `so_luong_yeu_cau` | NUMERIC(18,3) | NOT NULL, CHECK > 0 | Số lượng đề xuất |
| `don_gia_du_kien` | NUMERIC(18,2) | | Đơn giá dự toán (VNĐ) |
| `ngay_can_giao` | TIMESTAMPTZ | NOT NULL | Thời hạn yêu cầu vật tư về xưởng |
| `ma_kho_nhap` | BIGINT | REFERENCES `kho(id)` | Kho nhận hàng chỉ định |
| `ghi_chu` | TEXT | | Ghi chú quy cách kỹ thuật |

---

### 2.6. Bảng `yeu_cau_bao_gia` (Request for Quotation - RFQ Header)
Đợt mời chào giá gửi đến các nhà cung cấp tiềm năng.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY | Khóa chính tự tăng |
| `ma_rfq` | VARCHAR(50) | UNIQUE, NOT NULL | Mã đợt RFQ (vd: `RFQ-2026-001`) |
| `ma_yeu_cau_mua_hang` | BIGINT | REFERENCES `yeu_cau_mua_hang(id)` | Tham chiếu PR liên quan (nếu có) |
| `tieu_de` | VARCHAR(200) | NOT NULL | Tiêu đề đợt mời thầu/báo giá |
| `ngay_gui` | TIMESTAMPTZ | DEFAULT NOW() | Ngày phát hành yêu cầu báo giá |
| `han_bao_gia` | TIMESTAMPTZ | NOT NULL | Hạn chót nhận báo giá từ NCC |
| `dieu_khoan_thuong_mai` | TEXT | | Điều kiện giao hàng & thanh toán |
| `trang_thai` | VARCHAR(20) | DEFAULT 'dang_mo' | `dang_mo`, `da_chot`, `huy` |

---

### 2.7. Bảng `chi_tiet_bao_gia_ncc` (Supplier Quotes & Vendor Selection)
Báo giá phản hồi từ từng nhà cung cấp, lưu trữ ma trận so sánh và kết quả lựa chọn trúng thầu.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY | Khóa chính tự tăng |
| `ma_rfq` | BIGINT | REFERENCES `yeu_cau_bao_gia(id)` | Khóa ngoại RFQ cha |
| `ma_nha_cung_cap` | BIGINT | REFERENCES `nha_cung_cap(id)` | NCC gửi báo giá |
| `ma_vat_tu` | BIGINT | REFERENCES `vat_tu(id)` | Mặt hàng chào giá |
| `so_luong_chao` | NUMERIC(18,3) | NOT NULL | Số lượng chào thầu |
| `don_gia_chao` | NUMERIC(18,2) | NOT NULL | Đơn giá chào thầu (chưa VAT) |
| `thoi_gian_giao_hang_ngay` | INTEGER | DEFAULT 7 | Thời gian giao hàng cam kết (Lead time tính bằng ngày) |
| `dieu_kien_thanh_toan` | TEXT | | Điều kiện thanh toán của NCC |
| `da_chon` | BOOLEAN | DEFAULT FALSE | Đánh dấu báo giá được lựa chọn |
| `ly_do_chon` | TEXT | | **Ghi nhận lý do lựa chọn NCC** (giá, tiến độ, chất lượng) |

---

### 2.8. Bảng `danh_gia_ncc` (Supplier Quality & Performance Evaluation)
Đánh giá định kỳ chất lượng, tiến độ giao hàng và mức giá của đối tác.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY | Khóa chính tự tăng |
| `ma_nha_cung_cap` | BIGINT | REFERENCES `nha_cung_cap(id)` | NCC được đánh giá |
| `ky_danh_gia` | VARCHAR(20) | NOT NULL | Kỳ đánh giá (vd: `Q3-2026`, `2026-T09`) |
| `diem_chat_luong` | NUMERIC(3,1) | 0 - 10 | Điểm chất lượng nguyên phụ liệu (trọng số 40%) |
| `diem_giao_hang` | NUMERIC(3,1) | 0 - 10 | Điểm đúng hạn tiến độ giao hàng (trọng số 30%) |
| `diem_gia_ca` | NUMERIC(3,1) | 0 - 10 | Điểm cạnh tranh về giá & điều khoản (trọng số 30%) |
| `diem_tong_hop` | NUMERIC(3,1) | 0 - 10 | Điểm tổng hợp tự động tính = 0.4*CL + 0.3*GH + 0.3*GC |
| `nhan_xet` | TEXT | | Biên bản ghi nhận chi tiết |
| `nguoi_danh_gia` | BIGINT | REFERENCES `nguoi_dung(id)` | Cán bộ đánh giá |
| `ngay_danh_gia` | TIMESTAMPTZ | NOT NULL | Thời điểm lập đánh giá |

---

## 3. Quan hệ Toàn diện trong CSDL ERP May 10

```
  +--------------------+         1 : N         +--------------------+
  |  yeu_cau_mua_hang  |---------------------< |chi_tiet_yeu_cau_mua|
  +--------------------+                       +--------------------+
            | 1                                          |
            |                                            |
            v 0..1                                       |
  +--------------------+         1 : N                   |
  |  yeu_cau_bao_gia   |---------------------+           |
  +--------------------+                     |           |
            | 1                              v           v
            |                      +------------------------+
            +--------------------< |  chi_tiet_bao_gia_ncc  |
                                   +------------------------+
                                             |
                                             v (chọn NCC & tạo PO)
  +--------------------+         1 : N         +--------------------+
  |    nha_cung_cap    |---------------------< |    don_mua_hang    |
  +--------------------+                       +--------------------+
            | 1                                          | 1
            |                                            |
            | 1 : N                                      | 1 : N
            v                                            v
  +--------------------+                       +--------------------+
  |    danh_gia_ncc    |                       |  chi_tiet_don_mua  |
  +--------------------+                       +--------------------+
                                                         |
                                                         v (giao nhận & đối chiếu)
                                               +--------------------+
                                               |  phieu_nhap_kho    | (Kho PH4)
                                               +--------------------+
```
