# 02 — TỪ ĐIỂN DỮ LIỆU CHI TIẾT (SCHEMA DICTIONARY)

Hệ thống CSDL `erp_may10` bao gồm **chính xác 41 bảng** được chuẩn hóa theo Chương 4, ERP.docx và Database Contract:

---

## PHẦN 1: MASTER DATA (DỮ LIỆU DÙNG CHUNG — 6 BẢNG)

### 1. `nguoi_dung` — Người dùng hệ thống
| Tên cột | Kiểu dữ liệu | Ràng buộc | Giá trị mặc định | Mô tả |
|---|---|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY | Next sequence | Khóa chính tự tăng |
| `ho_ten` | VARCHAR(150) | NOT NULL | | Họ tên người dùng |
| `email` | VARCHAR(100) | UNIQUE, NOT NULL | | Email đăng nhập |
| `mat_khau` | VARCHAR(255) | NOT NULL | | Mật khẩu hash bcrypt |
| `so_dien_thoai` | VARCHAR(20) | NULLABLE | | Số điện thoại liên hệ |
| `vai_tro` | VARCHAR(50) | NOT NULL | | Vai trò: `admin`, `ke_toan`, `ban_hang`, `san_xuat`, `kho`, `mua_hang` |
| `phong_ban` | VARCHAR(100) | NULLABLE | | Phòng ban công tác |
| `trang_thai` | VARCHAR(20) | NOT NULL | `'hoat_dong'` | `hoat_dong`, `khoa`, `nghi_viec` |
| `ngay_tao` | TIMESTAMPTZ | NOT NULL | `NOW()` | Ngày tạo |
| `ngay_cap_nhat` | TIMESTAMPTZ | NOT NULL | `NOW()` | Ngày cập nhật |
| `nguoi_tao` | BIGINT | FK -> `nguoi_dung(id)` | | Người tạo bản ghi |
| `nguoi_cap_nhat` | BIGINT | FK -> `nguoi_dung(id)` | | Người cập nhật |

### 2. `don_vi_tinh` — Danh mục đơn vị tính
| Tên cột | Kiểu dữ liệu | Ràng buộc | Giá trị mặc định | Mô tả |
|---|---|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY | Next sequence | Khóa chính |
| `ma_don_vi` | VARCHAR(20) | UNIQUE, NOT NULL | | Mã ĐVT: cai, met, kg, cuon, bo |
| `ten_don_vi` | VARCHAR(100) | NOT NULL | | Tên đơn vị tính |
| `ghi_chu` | TEXT | NULLABLE | | Ghi chú |
| `trang_thai` | VARCHAR(20) | NOT NULL | `'hoat_dong'` | `hoat_dong`, `khong_su_dung` |
| `ngay_tao` | TIMESTAMPTZ | NOT NULL | `NOW()` | Ngày tạo |
| `nguoi_tao` | BIGINT | FK -> `nguoi_dung(id)` | | Người tạo |

### 3. `kho` — Danh mục kho lưu trữ
| Tên cột | Kiểu dữ liệu | Ràng buộc | Giá trị mặc định | Mô tả |
|---|---|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY | Next sequence | Khóa chính |
| `ma_kho` | VARCHAR(50) | UNIQUE, NOT NULL | | Mã kho: KNL01, KTP01, KPL01 |
| `ten_kho` | VARCHAR(200) | NOT NULL | | Tên kho hàng |
| `dia_chi` | TEXT | NULLABLE | | Địa chỉ vật lý |
| `dien_tich` | NUMERIC(18,3) | CHECK >= 0 | | Diện tích (m²) |
| `suc_chua` | NUMERIC(18,3) | CHECK >= 0 | | Sức chứa tối đa |
| `loai_kho` | VARCHAR(50) | NOT NULL | | `nguyen_lieu`, `thanh_pham`, `vat_tu_phu` |
| `nguoi_quan_ly` | BIGINT | FK -> `nguoi_dung(id)` | | Thủ kho phụ trách |
| `trang_thai` | VARCHAR(20) | NOT NULL | `'hoat_dong'` | `hoat_dong`, `dong_cua`, `sua_chua` |
| `ngay_tao` | TIMESTAMPTZ | NOT NULL | `NOW()` | Ngày tạo |
| `ngay_cap_nhat` | TIMESTAMPTZ | NOT NULL | `NOW()` | Ngày cập nhật |
| `nguoi_tao` | BIGINT | FK -> `nguoi_dung(id)` | | Người tạo |
| `nguoi_cap_nhat`| BIGINT | FK -> `nguoi_dung(id)` | | Người cập nhật |

### 4. `nha_cung_cap` — Danh mục nhà cung cấp
| Tên cột | Kiểu dữ liệu | Ràng buộc | Giá trị mặc định | Mô tả |
|---|---|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY | Next sequence | Khóa chính |
| `ma_nha_cung_cap`| VARCHAR(50) | UNIQUE, NOT NULL | | Mã nhà cung cấp: NCC001, NCC002... |
| `ten_nha_cung_cap`| VARCHAR(200) | NOT NULL | | Tên công ty / tổ chức |
| `ma_so_thue` | VARCHAR(20) | NULLABLE | | Mã số thuế |
| `dia_chi` | TEXT | NOT NULL | | Địa chỉ trụ sở |
| `quoc_gia` | VARCHAR(100) | NULLABLE | `'Viet Nam'` | Quốc gia |
| `nguoi_lien_he`| VARCHAR(150) | NOT NULL | | Người đại diện liên hệ |
| `so_dien_thoai`| VARCHAR(20) | NOT NULL | | Số điện thoại |
| `email` | VARCHAR(100) | NOT NULL | | Email giao dịch |
| `loai_hang_cung_cap`| TEXT | NULLABLE | | Mặt hàng cung cấp |
| `han_muc_tin_dung`| NUMERIC(18,2)| CHECK >= 0 | `0` | Hạn mức công nợ cho phép |
| `so_ngay_gia_han`| INTEGER | CHECK >= 0 | `30` | Thời hạn nợ (ngày) |
| `diem_danh_gia`| NUMERIC(3,1) | CHECK 0 - 10 | `0` | Điểm đánh giá NCC |
| `trang_thai` | VARCHAR(20) | NOT NULL | `'hoat_dong'` | `hoat_dong`, `tam_ngung`, `ngung_giao_dich` |
| `ngay_tao` | TIMESTAMPTZ | NOT NULL | `NOW()` | Ngày tạo |
| `ngay_cap_nhat`| TIMESTAMPTZ | NOT NULL | `NOW()` | Ngày cập nhật |
| `nguoi_tao` | BIGINT | FK -> `nguoi_dung(id)` | | Người tạo |
| `nguoi_cap_nhat`| BIGINT | FK -> `nguoi_dung(id)` | | Người cập nhật |

### 5. `san_pham` — Sản phẩm may mặc
| Tên cột | Kiểu dữ liệu | Ràng buộc | Giá trị mặc định | Mô tả |
|---|---|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY | Next sequence | Khóa chính |
| `ma_san_pham` | VARCHAR(50) | UNIQUE, NOT NULL | | Mã sản phẩm: SP001, SP-SM-NAM-01 |
| `ten_san_pham` | VARCHAR(200) | NOT NULL | | Tên sản phẩm đầy đủ |
| `mo_ta` | TEXT | NULLABLE | | Mô tả kiểu dáng, chất liệu |
| `ma_don_vi_tinh`| BIGINT | FK -> `don_vi_tinh(id)` | | Đơn vị tính |
| `gia_ban` | NUMERIC(18,2) | NOT NULL, CHECK >= 0 | | Giá niêm yết bán |
| `gia_von` | NUMERIC(18,2) | CHECK >= 0 | | Giá vốn sản phẩm |
| `thoi_gian_san_xuat`| NUMERIC(18,3)| CHECK >= 0 | | Thời gian sản xuất (giờ/sp) |
| `dinh_muc_vai`| NUMERIC(18,3) | CHECK >= 0 | | Định mức vải chính (mét/sp) |
| `size` | VARCHAR(20) | NULLABLE | | Kích cỡ: S, M, L, XL, XXL, 32... |
| `mau_sac` | VARCHAR(50) | NULLABLE | | Màu sắc |
| `trang_thai` | VARCHAR(20) | NOT NULL | `'dang_ban'` | `dang_ban`, `ngung_ban`, `mau_moi` |
| `ngay_tao` | TIMESTAMPTZ | NOT NULL | `NOW()` | Ngày tạo |
| `ngay_cap_nhat`| TIMESTAMPTZ | NOT NULL | `NOW()` | Ngày cập nhật |
| `nguoi_tao` | BIGINT | FK -> `nguoi_dung(id)` | | Người tạo |
| `nguoi_cap_nhat`| BIGINT | FK -> `nguoi_dung(id)` | | Người cập nhật |

### 6. `vat_tu` — Danh mục nguyên phụ liệu
| Tên cột | Kiểu dữ liệu | Ràng buộc | Giá trị mặc định | Mô tả |
|---|---|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY | Next sequence | Khóa chính |
| `ma_vat_tu` | VARCHAR(50) | UNIQUE, NOT NULL | | Mã vật tư: VT001... |
| `ten_vat_tu` | VARCHAR(200) | NOT NULL | | Tên vật tư |
| `loai_vat_tu` | VARCHAR(50) | NOT NULL | | `vai_chinh`, `vai_lot`, `chi_may`, `cuc_kep`, `khoa_keo`, `phu_lieu` |
| `ma_don_vi_tinh`| BIGINT | FK -> `don_vi_tinh(id)` | | Đơn vị tính |
| `quy_cach` | VARCHAR(100) | NULLABLE | | Khổ vải, độ dày, màu... |
| `muc_ton_toi_thieu`| NUMERIC(18,3)| CHECK >= 0 | `0` | Mức tồn an toàn tối thiểu |
| `muc_ton_toi_da`| NUMERIC(18,3)| CHECK >= muc_ton_toi_thieu | | Mức tồn tối đa cho phép |
| `gia_nhap_trung_binh`| NUMERIC(18,2)| CHECK >= 0 | `0` | Giá bình quân gia quyền |
| `nha_cung_cap_chinh`| BIGINT | FK -> `nha_cung_cap(id)` | | Nhà cung cấp ưu tiên |
| `trang_thai` | VARCHAR(20) | NOT NULL | `'dang_su_dung'` | `dang_su_dung`, `ngung_su_dung` |
| `ngay_tao` | TIMESTAMPTZ | NOT NULL | `NOW()` | Ngày tạo |
| `ngay_cap_nhat`| TIMESTAMPTZ | NOT NULL | `NOW()` | Ngày cập nhật |
| `nguoi_tao` | BIGINT | FK -> `nguoi_dung(id)` | | Người tạo |
| `nguoi_cap_nhat`| BIGINT | FK -> `nguoi_dung(id)` | | Người cập nhật |

---

## PHẦN 2: PHÂN HỆ 1 — BÁN HÀNG VÀ QUẢN LÝ KHÁCH HÀNG (5 BẢNG)

### 7. `khach_hang` — Khách hàng & Đại lý
- `id` (BIGSERIAL PK), `ma_khach_hang` (VARCHAR(50) UNIQUE NOT NULL), `ten_khach_hang` (VARCHAR(200) NOT NULL), `loai_khach_hang` (`ca_nhan`, `to_chuc`, `dai_ly`, `xuat_khau`), `ma_so_thue` (VARCHAR(20)), `so_dien_thoai` (VARCHAR(20) NOT NULL), `email` (VARCHAR(100)), `dia_chi` (TEXT NOT NULL), `tinh_thanh_pho` (VARCHAR(100) NOT NULL), `nguoi_lien_he` (VARCHAR(150)), `han_muc_cong_no` (NUMERIC(18,2) DEFAULT 0), `so_ngay_cong_no` (INTEGER DEFAULT 0), `ghi_chu` (TEXT), `trang_thai` (`hoat_dong`, `tam_khoa`, `ngung_giao_dich`), audit columns (`ngay_tao`, `ngay_cap_nhat`, `nguoi_tao`, `nguoi_cap_nhat`).

### 8. `don_ban_hang` — Đơn bán hàng
- `id` (BIGSERIAL PK), `ma_don_ban` (VARCHAR(50) UNIQUE NOT NULL), `ma_khach_hang` (BIGINT FK -> `khach_hang(id)`), `ngay_dat_hang` (TIMESTAMPTZ NOT NULL), `ngay_giao_hang_yc` (TIMESTAMPTZ NOT NULL), `ngay_giao_thuc_te` (TIMESTAMPTZ), `dia_chi_giao_hang` (TEXT NOT NULL), `tong_tien_hang` (NUMERIC(18,2) NOT NULL), `tien_thue` (NUMERIC(18,2) DEFAULT 0), `tien_giam_gia` (NUMERIC(18,2) DEFAULT 0), `tong_thanh_toan` (NUMERIC(18,2) NOT NULL), `nguoi_ban` (BIGINT FK -> `nguoi_dung(id)`), `trang_thai` (`cho_xac_nhan`, `da_xac_nhan`, `dang_san_xuat`, `da_giao`, `huy`), audit columns.

### 9. `chi_tiet_don_ban_hang` — Chi tiết mặt hàng bán
- `id` (BIGSERIAL PK), `ma_don_ban_hang` (BIGINT FK -> `don_ban_hang(id)` ON DELETE CASCADE), `ma_san_pham` (BIGINT FK -> `san_pham(id)`), `so_luong` (NUMERIC(18,3) NOT NULL CHECK > 0), `don_gia` (NUMERIC(18,2) NOT NULL CHECK >= 0), `ty_le_giam_gia` (NUMERIC(5,2) DEFAULT 0 CHECK 0-100), `thanh_tien` (NUMERIC(18,2) NOT NULL), `so_luong_giao` (NUMERIC(18,3) DEFAULT 0), `ghi_chu` (TEXT), `trang_thai` (`chua_giao`, `giao_mot_phan`, `da_giao_du`), audit columns.

### 10. `giao_hang` — Phiếu giao hàng
- `id` (BIGSERIAL PK), `ma_giao_hang` (VARCHAR(50) UNIQUE NOT NULL), `ma_don_ban_hang` (BIGINT FK -> `don_ban_hang(id)`), `ma_kho` (BIGINT FK -> `kho(id)`), `ngay_giao` (TIMESTAMPTZ NOT NULL), `ten_nguoi_nhan` (VARCHAR(150) NOT NULL), `dia_chi_giao` (TEXT NOT NULL), `phuong_tien_van_chuyen` (VARCHAR(100)), `nguoi_giao_hang` (BIGINT FK -> `nguoi_dung(id)`), `ghi_chu` (TEXT), `trang_thai` (`cho_giao`, `dang_giao`, `da_giao`, `that_bai`), audit columns.

### 11. `hoa_don_ban_hang` — Hóa đơn bán hàng
- `id` (BIGSERIAL PK), `ma_hoa_don` (VARCHAR(50) UNIQUE NOT NULL), `ma_don_ban_hang` (BIGINT FK -> `don_ban_hang(id)`), `ma_khach_hang` (BIGINT FK -> `khach_hang(id)`), `ngay_xuat_hoa_don` (TIMESTAMPTZ NOT NULL), `ngay_dao_han` (TIMESTAMPTZ NOT NULL), `tong_tien_truoc_thue` (NUMERIC(18,2) NOT NULL), `tien_thue` (NUMERIC(18,2) DEFAULT 0), `tong_tien_sau_thue` (NUMERIC(18,2) NOT NULL), `so_tien_da_thu` (NUMERIC(18,2) DEFAULT 0), `trang_thai` (`chua_thanh_toan`, `thanh_toan_mot_phan`, `da_thanh_toan`, `qua_han`), audit columns.

---

## PHẦN 3: PHÂN HỆ 2 — SẢN XUẤT VÀ HOẠCH ĐỊNH NGUYÊN PHỤ LIỆU (6 BẢNG)

### 12. `ke_hoach_san_xuat` — Kế hoạch sản xuất
- `id` (BIGSERIAL PK), `ma_ke_hoach` (VARCHAR(50) UNIQUE NOT NULL), `ma_don_ban_hang` (BIGINT FK -> `don_ban_hang(id)`), `ma_san_pham` (BIGINT FK -> `san_pham(id)`), `so_luong_ke_hoach` (NUMERIC(18,3) NOT NULL CHECK > 0), `ngay_bat_dau` (TIMESTAMPTZ NOT NULL), `ngay_ket_thuc` (TIMESTAMPTZ NOT NULL CHECK ngay_ket_thuc >= ngay_bat_dau), `nguoi_lap_ke_hoach` (BIGINT FK -> `nguoi_dung(id)`), `ghi_chu` (TEXT), `trang_thai` (`cho_duyet`, `da_duyet`, `dang_thuc_hien`, `hoan_thanh`, `huy`), audit columns.

### 13. `dinh_muc_nguyen_lieu` — BOM (Bill of Materials)
- `id` (BIGSERIAL PK), `ma_san_pham` (BIGINT FK -> `san_pham(id)`), `ma_vat_tu` (BIGINT FK -> `vat_tu(id)`), `dinh_muc` (NUMERIC(18,3) NOT NULL CHECK > 0), `ty_le_hao_hut` (NUMERIC(5,2) DEFAULT 0 CHECK 0-100), `dinh_muc_thuc_te` (NUMERIC(18,3) NOT NULL CHECK > 0), `phien_ban` (VARCHAR(20) DEFAULT '1.0'), `ghi_chu` (TEXT), `trang_thai` (`hieu_luc`, `het_hieu_luc`), audit columns, UNIQUE(ma_san_pham, ma_vat_tu, phien_ban).

### 14. `lenh_san_xuat` — Lệnh điều hành sản xuất xưởng
- `id` (BIGSERIAL PK), `ma_lenh_san_xuat` (VARCHAR(50) UNIQUE NOT NULL), `ma_ke_hoach_san_xuat` (BIGINT FK -> `ke_hoach_san_xuat(id)`), `ma_don_ban_hang` (BIGINT FK -> `don_ban_hang(id)`), `ma_san_pham` (BIGINT FK -> `san_pham(id)`), `so_luong_yeu_cau` (NUMERIC(18,3) NOT NULL CHECK > 0), `so_luong_hoan_thanh` (NUMERIC(18,3) DEFAULT 0), `ngay_bat_dau` (TIMESTAMPTZ NOT NULL), `ngay_ket_thuc_yc` (TIMESTAMPTZ NOT NULL), `ngay_hoan_thanh` (TIMESTAMPTZ), `nguoi_phu_trach` (BIGINT FK -> `nguoi_dung(id)`), `ghi_chu` (TEXT), `trang_thai` (`chua_bat_dau`, `dang_san_xuat`, `tam_dung`, `hoan_thanh`, `huy`), audit columns.

### 15. `cong_doan_san_xuat` — Quy trình công nghệ
- `id` (BIGSERIAL PK), `ma_lenh_san_xuat` (BIGINT FK -> `lenh_san_xuat(id)` ON DELETE CASCADE), `ten_cong_doan` (VARCHAR(200) NOT NULL), `so_thu_tu` (INTEGER NOT NULL CHECK > 0), `thoi_gian_chuan` (NUMERIC(18,3) NOT NULL), `so_cong_nhan` (INTEGER DEFAULT 1 CHECK > 0), `ngay_bat_dau` (TIMESTAMPTZ), `ngay_ket_thuc` (TIMESTAMPTZ), `nguoi_phu_trach` (BIGINT FK -> `nguoi_dung(id)`), `ghi_chu` (TEXT), `trang_thai` (`cho_thuc_hien`, `dang_thuc_hien`, `hoan_thanh`), audit columns.

### 16. `nhu_cau_npl` — Tính toán nhu cầu vật tư (MRP)
- `id` (BIGSERIAL PK), `ma_ke_hoach_san_xuat` (BIGINT FK -> `ke_hoach_san_xuat(id)`), `ma_vat_tu` (BIGINT FK -> `vat_tu(id)`), `so_luong_can` (NUMERIC(18,3) NOT NULL CHECK > 0), `so_luong_ton_kho` (NUMERIC(18,3) DEFAULT 0), `so_luong_can_mua` (NUMERIC(18,3) DEFAULT 0), `ngay_can` (TIMESTAMPTZ NOT NULL), `da_tao_yeu_cau_mua` (`chua`, `da_tao`), `ma_yeu_cau_mua_hang` (BIGINT FK -> `yeu_cau_mua_hang(id)`), `ghi_chu` (TEXT), audit columns.

### 17. `ket_qua_san_xuat` — Báo cáo sản lượng ca/ngày
- `id` (BIGSERIAL PK), `ma_lenh_san_xuat` (BIGINT FK -> `lenh_san_xuat(id)`), `ngay_bao_cao` (TIMESTAMPTZ NOT NULL), `so_luong_hoan_thanh` (NUMERIC(18,3) NOT NULL CHECK >= 0), `so_luong_loi` (NUMERIC(18,3) DEFAULT 0), `so_luong_tai_che` (NUMERIC(18,3) DEFAULT 0), `nhan_cong_thuc_te` (NUMERIC(18,3)), `ma_phieu_nhap_kho` (BIGINT FK -> `phieu_nhap_kho(id)`), `ghi_chu` (TEXT), `nguoi_bao_cao` (BIGINT FK -> `nguoi_dung(id)`), audit columns.

---

## PHẦN 4: PHÂN HỆ 3 — MUA HÀNG (7 BẢNG NGHIỆP VỤ)

### 18. `yeu_cau_mua_hang` — Phiếu đề xuất mua hàng
- `id` (BIGSERIAL PK), `ma_yeu_cau_mua` (VARCHAR(50) UNIQUE NOT NULL), `nguon_yeu_cau` (`san_xuat`, `kho`), `ma_nhu_cau_npl` (BIGINT FK -> `nhu_cau_npl(id)`), `ngay_yeu_cau` (TIMESTAMPTZ NOT NULL), `nguoi_yeu_cau` (BIGINT FK -> `nguoi_dung(id)`), `nguoi_phe_duyet` (BIGINT FK -> `nguoi_dung(id)`), `ngay_phe_duyet` (TIMESTAMPTZ), `ghi_chu` (TEXT), `trang_thai` (`cho_duyet`, `da_duyet`, `da_tao_don`, `huy`), audit columns.

### 19. `chi_tiet_yeu_cau_mua` — Chi tiết đề xuất mua
- `id` (BIGSERIAL PK), `ma_yeu_cau_mua_hang` (BIGINT FK -> `yeu_cau_mua_hang(id)` ON DELETE CASCADE), `ma_vat_tu` (BIGINT FK -> `vat_tu(id)`), `so_luong_yeu_cau` (NUMERIC(18,3) NOT NULL CHECK > 0), `don_gia_du_kien` (NUMERIC(18,2)), `ngay_can_giao` (TIMESTAMPTZ NOT NULL), `ma_kho_nhap` (BIGINT FK -> `kho(id)`), `ghi_chu` (TEXT), audit columns.

### 20. `don_mua_hang` — Đơn đặt mua hàng (PO)
- `id` (BIGSERIAL PK), `ma_don_mua` (VARCHAR(50) UNIQUE NOT NULL), `ma_nha_cung_cap` (BIGINT FK -> `nha_cung_cap(id)`), `ma_yeu_cau_mua_hang` (BIGINT FK -> `yeu_cau_mua_hang(id)`), `ngay_dat_hang` (TIMESTAMPTZ NOT NULL), `ngay_giao_hang_yc` (TIMESTAMPTZ NOT NULL), `tong_tien_hang` (NUMERIC(18,2) NOT NULL), `tien_thue` (NUMERIC(18,2) DEFAULT 0), `tong_thanh_toan` (NUMERIC(18,2) NOT NULL), `dieu_kien_thanh_toan` (TEXT), `nguoi_dat_hang` (BIGINT FK -> `nguoi_dung(id)`), `ghi_chu` (TEXT), `trang_thai` (`cho_duyet`, `da_gui_ncc`, `da_xac_nhan`, `dang_giao`, `da_nhap_kho`, `huy`), audit columns.

### 21. `chi_tiet_don_mua` — Chi tiết hàng đặt mua
- `id` (BIGSERIAL PK), `ma_don_mua_hang` (BIGINT FK -> `don_mua_hang(id)` ON DELETE CASCADE), `ma_vat_tu` (BIGINT FK -> `vat_tu(id)`), `so_luong_dat` (NUMERIC(18,3) NOT NULL CHECK > 0), `don_gia` (NUMERIC(18,2) NOT NULL), `thanh_tien` (NUMERIC(18,2) NOT NULL), `so_luong_da_nhap` (NUMERIC(18,3) DEFAULT 0), `ghi_chu` (TEXT), audit columns.

### 22. `hoa_don_nha_cung_cap` — Hóa đơn đầu vào từ NCC
- `id` (BIGSERIAL PK), `ma_hoa_don_ncc` (VARCHAR(50) UNIQUE NOT NULL), `ma_don_mua_hang` (BIGINT FK -> `don_mua_hang(id)`), `ma_nha_cung_cap` (BIGINT FK -> `nha_cung_cap(id)`), `so_hoa_don_ncc` (VARCHAR(50) NOT NULL), `ngay_hoa_don` (TIMESTAMPTZ NOT NULL), `ngay_dao_han` (TIMESTAMPTZ NOT NULL), `tong_tien_truoc_thue` (NUMERIC(18,2) NOT NULL), `tien_thue` (NUMERIC(18,2) DEFAULT 0), `tong_thanh_toan` (NUMERIC(18,2) NOT NULL), `so_tien_da_tra` (NUMERIC(18,2) DEFAULT 0), `trang_thai` (`chua_thanh_toan`, `thanh_toan_mot_phan`, `da_thanh_toan`, `qua_han`), audit columns.

### 23. `thanh_toan_ncc` — Phiếu chi trả nợ NCC
- `id` (BIGSERIAL PK), `ma_thanh_toan_ncc` (VARCHAR(50) UNIQUE NOT NULL), `ma_hoa_don_ncc` (BIGINT FK -> `hoa_don_nha_cung_cap(id)`), `so_tien_thanh_toan` (NUMERIC(18,2) NOT NULL CHECK > 0), `ngay_thanh_toan` (TIMESTAMPTZ NOT NULL), `hinh_thuc_thanh_toan` (`chuyen_khoan`, `tien_mat`, `sec`), `so_tham_chieu` (VARCHAR(100)), `nguoi_thanh_toan` (BIGINT FK -> `nguoi_dung(id)`), `ghi_chu` (TEXT), `trang_thai` (`da_thanh_toan`, `huy`), audit columns.

### 24. `danh_gia_ncc` — Đánh giá NCC định kỳ
- `id` (BIGSERIAL PK), `ma_nha_cung_cap` (BIGINT FK -> `nha_cung_cap(id)`), `ky_danh_gia` (VARCHAR(20) NOT NULL), `diem_chat_luong` (NUMERIC(3,1) CHECK 0-10), `diem_giao_hang` (NUMERIC(3,1) CHECK 0-10), `diem_gia_ca` (NUMERIC(3,1) CHECK 0-10), `diem_tong_hop` (NUMERIC(3,1) CHECK 0-10), `nhan_xet` (TEXT), `nguoi_danh_gia` (BIGINT FK -> `nguoi_dung(id)`), `ngay_danh_gia` (TIMESTAMPTZ NOT NULL), audit columns.

---

## PHẦN 5: PHÂN HỆ 4 — KHO VÀ QUẢN LÝ VẬT TƯ (11 BẢNG)

### 25. `vi_tri_kho` — Kệ / Tầng kho
- `id` (BIGSERIAL PK), `ma_kho` (BIGINT FK -> `kho(id)`), `ma_vi_tri` (VARCHAR(50) UNIQUE NOT NULL), `ten_vi_tri` (VARCHAR(100) NOT NULL), `khu_vuc` (VARCHAR(50)), `tang` (VARCHAR(20)), `suc_chua_toi_da` (NUMERIC(18,3)), `trang_thai` (`trong`, `co_hang`, `day`), audit columns.

### 26. `lo_vat_tu` — Quản lý theo lô / Cây vải
- `id` (BIGSERIAL PK), `ma_lo` (VARCHAR(50) UNIQUE NOT NULL), `ma_vat_tu` (BIGINT FK -> `vat_tu(id)`), `ma_nha_cung_cap` (BIGINT FK -> `nha_cung_cap(id)`), `ma_don_mua_hang` (BIGINT FK -> `don_mua_hang(id)`), `ngay_san_xuat` (TIMESTAMPTZ), `han_su_dung` (TIMESTAMPTZ), `so_luong_nhap` (NUMERIC(18,3) NOT NULL), `so_luong_hien_tai` (NUMERIC(18,3) NOT NULL), `don_gia_nhap` (NUMERIC(18,2) NOT NULL), `ma_vi_tri_kho` (BIGINT FK -> `vi_tri_kho(id)`), `trang_thai` (`binh_thuong`, `het_hang`, `hong_hu`, `qua_han`), audit columns.

### 27. `ton_kho` — Số dư tồn kho thực tế
- `id` (BIGSERIAL PK), `ma_kho` (BIGINT FK -> `kho(id)`), `ma_vat_tu` (BIGINT FK -> `vat_tu(id)`), `so_luong_ton` (NUMERIC(18,3) NOT NULL DEFAULT 0), `don_vi_tinh` (BIGINT FK -> `don_vi_tinh(id)`), `gia_tri_ton_kho` (NUMERIC(18,2) DEFAULT 0), `ngay_cap_nhat` (TIMESTAMPTZ), `nguoi_cap_nhat` (BIGINT FK -> `nguoi_dung(id)`), UNIQUE(`ma_kho`, `ma_vat_tu`).

### 28. `phieu_nhap_kho` — Phiếu nhập kho (Bảng gốc dùng chung)
- `id` (BIGSERIAL PK), `ma_phieu_nhap` (VARCHAR(50) UNIQUE NOT NULL), `loai_nhap` (`tu_mua_hang`, `thanh_pham_san_xuat`, `chuyen_kho`, `kiem_ke`), `ma_don_mua_hang` (BIGINT FK -> `don_mua_hang(id)`), `ma_lenh_san_xuat` (BIGINT FK -> `lenh_san_xuat(id)`), `ma_kho_nhap` (BIGINT FK -> `kho(id)`), `ngay_nhap` (TIMESTAMPTZ NOT NULL), `thu_kho` (BIGINT FK -> `nguoi_dung(id)`), `nguoi_giao_hang` (VARCHAR(150)), `tong_gia_tri_nhap` (NUMERIC(18,2) DEFAULT 0), `ghi_chu` (TEXT), `trang_thai` (`cho_duyet`, `da_nhap`, `huy`), audit columns.

### 29. `chi_tiet_phieu_nhap` — Chi tiết dòng nhập kho
- `id` (BIGSERIAL PK), `ma_phieu_nhap_kho` (BIGINT FK -> `phieu_nhap_kho(id)` ON DELETE CASCADE), `ma_vat_tu` (BIGINT FK -> `vat_tu(id)`), `ma_lo_vat_tu` (BIGINT FK -> `lo_vat_tu(id)`), `so_luong_nhap` (NUMERIC(18,3) NOT NULL CHECK > 0), `don_gia_nhap` (NUMERIC(18,2) NOT NULL), `thanh_tien` (NUMERIC(18,2) NOT NULL), `ma_vi_tri_kho` (BIGINT FK -> `vi_tri_kho(id)`), `ghi_chu` (TEXT), audit columns.

### 30. `phieu_xuat_kho` — Phiếu xuất kho (Bảng gốc dùng chung)
- `id` (BIGSERIAL PK), `ma_phieu_xuat` (VARCHAR(50) UNIQUE NOT NULL), `loai_xuat` (`giao_khach`, `xuat_san_xuat`, `chuyen_kho`, `huy_vat_tu`), `ma_don_ban_hang` (BIGINT FK -> `don_ban_hang(id)`), `ma_lenh_san_xuat` (BIGINT FK -> `lenh_san_xuat(id)`), `ma_kho_xuat` (BIGINT FK -> `kho(id)`), `ngay_xuat` (TIMESTAMPTZ NOT NULL), `thu_kho` (BIGINT FK -> `nguoi_dung(id)`), `nguoi_nhan` (VARCHAR(150)), `tong_gia_tri_xuat` (NUMERIC(18,2) DEFAULT 0), `ghi_chu` (TEXT), `trang_thai` (`cho_duyet`, `da_xuat`, `huy`), audit columns.

### 31. `chi_tiet_phieu_xuat` — Chi tiết dòng xuất kho
- `id` (BIGSERIAL PK), `ma_phieu_xuat_kho` (BIGINT FK -> `phieu_xuat_kho(id)` ON DELETE CASCADE), `ma_vat_tu` (BIGINT FK -> `vat_tu(id)`), `ma_lo_vat_tu` (BIGINT FK -> `lo_vat_tu(id)`), `so_luong_xuat` (NUMERIC(18,3) NOT NULL CHECK > 0), `don_gia_xuat` (NUMERIC(18,2) NOT NULL), `thanh_tien` (NUMERIC(18,2) NOT NULL), `ghi_chu` (TEXT), audit columns.

### 32. `phieu_chuyen_kho` — Lệnh điều chuyển kho
- `id` (BIGSERIAL PK), `ma_phieu_chuyen` (VARCHAR(50) UNIQUE NOT NULL), `ma_kho_xuat` (BIGINT FK -> `kho(id)`), `ma_kho_nhap` (BIGINT FK -> `kho(id)` CHECK ma_kho_xuat <> ma_kho_nhap), `ngay_chuyen` (TIMESTAMPTZ NOT NULL), `nguoi_chuyen` (BIGINT FK -> `nguoi_dung(id)`), `ly_do` (TEXT), `trang_thai` (`cho_duyet`, `da_chuyen`, `huy`), audit columns.

### 33. `chi_tiet_chuyen_kho` — Chi tiết vật tư điều chuyển
- `id` (BIGSERIAL PK), `ma_phieu_chuyen_kho` (BIGINT FK -> `phieu_chuyen_kho(id)` ON DELETE CASCADE), `ma_vat_tu` (BIGINT FK -> `vat_tu(id)`), `so_luong_chuyen` (NUMERIC(18,3) NOT NULL CHECK > 0), `don_gia` (NUMERIC(18,2)), `ghi_chu` (TEXT), audit columns.

### 34. `phieu_kiem_ke` — Phiếu kiểm kê kho định kỳ
- `id` (BIGSERIAL PK), `ma_phieu_kiem_ke` (VARCHAR(50) UNIQUE NOT NULL), `ma_kho` (BIGINT FK -> `kho(id)`), `ky_kiem_ke` (VARCHAR(50) NOT NULL), `ngay_kiem_ke` (TIMESTAMPTZ NOT NULL), `truong_kiem_ke` (BIGINT FK -> `nguoi_dung(id)`), `ghi_chu` (TEXT), `trang_thai` (`dang_kiem_ke`, `hoan_thanh`, `da_dieu_chinh`), audit columns.

### 35. `chi_tiet_kiem_ke` — Chi tiết kiểm đếm thực tế
- `id` (BIGSERIAL PK), `ma_phieu_kiem_ke` (BIGINT FK -> `phieu_kiem_ke(id)` ON DELETE CASCADE), `ma_vat_tu` (BIGINT FK -> `vat_tu(id)`), `so_luong_so_sach` (NUMERIC(18,3) NOT NULL), `so_luong_thuc_te` (NUMERIC(18,3) NOT NULL), `chenh_lech` (NUMERIC(18,3) NOT NULL), `gia_tri_chenh_lech` (NUMERIC(18,2) NOT NULL), `nguyen_nhan` (TEXT), `da_dieu_chinh` (`chua`, `da_dieu_chinh`), audit columns.

---

## PHẦN 6: PHÂN HỆ 5 — TÀI CHÍNH – KẾ TOÁN VÀ GIÁ THÀNH (6 BẢNG)

### 36. `he_thong_tai_khoan` — Danh mục hệ thống tài khoản (VN GAAP)
- `id` (BIGSERIAL PK), `so_tai_khoan` (VARCHAR(20) UNIQUE NOT NULL), `ten_tai_khoan` (VARCHAR(200) NOT NULL), `loai_tai_khoan` (`tai_san`, `no_phai_tra`, `von_chu_so_huu`, `doanh_thu`, `chi_phi`), `tai_khoan_cha` (BIGINT FK -> `he_thong_tai_khoan(id)`), `cap_tai_khoan` (INTEGER CHECK 1-4), `cho_phep_hach_toan` (`co`, `khong`), `ghi_chu` (TEXT), `trang_thai` (`hoat_dong`, `khong_su_dung`), audit columns.

### 37. `chung_tu_goc` — Sổ quản lý chứng từ gốc
- `id` (BIGSERIAL PK), `ma_chung_tu` (VARCHAR(50) UNIQUE NOT NULL), `loai_chung_tu` (`hoa_don_ban`, `hoa_don_mua`, `phieu_thu`, `phieu_chi`, `phieu_nhap_xuat_kho`), `ma_chung_tu_lien_quan` (BIGINT), `bang_chung_tu_lien_quan` (VARCHAR(100)), `ngay_chung_tu` (TIMESTAMPTZ NOT NULL), `so_tien` (NUMERIC(18,2) NOT NULL CHECK >= 0), `mo_ta` (TEXT), `file_dinh_kem` (TEXT), `trang_thai` (`hieu_luc`, `huy`, `dieu_chinh`), audit columns.

### 38. `nhat_ky_hach_toan` — Sổ cái bút toán Nợ/Có
- `id` (BIGSERIAL PK), `ma_hach_toan` (VARCHAR(50) UNIQUE NOT NULL), `ma_chung_tu_goc` (BIGINT FK -> `chung_tu_goc(id)` ON DELETE CASCADE), `ngay_hach_toan` (TIMESTAMPTZ NOT NULL), `tai_khoan_no` (BIGINT FK -> `he_thong_tai_khoan(id)`), `tai_khoan_co` (BIGINT FK -> `he_thong_tai_khoan(id)`), `so_tien` (NUMERIC(18,2) NOT NULL CHECK > 0), `mo_ta` (TEXT NOT NULL), `ky_ke_toan` (VARCHAR(20) NOT NULL), `nguoi_hach_toan` (BIGINT FK -> `nguoi_dung(id)`), `nguoi_phe_duyet` (BIGINT FK -> `nguoi_dung(id)`), `trang_thai` (`cho_duyet`, `da_hach_toan`, `da_dao_but_toan`), audit columns.

### 39. `cong_no` — Sổ công nợ tổng hợp (Phải thu / Phải trả)
- `id` (BIGSERIAL PK), `loai_cong_no` (`phai_thu`, `phai_tra`), `ma_khach_hang` (BIGINT FK -> `khach_hang(id)`), `ma_nha_cung_cap` (BIGINT FK -> `nha_cung_cap(id)`), `ma_hoa_don` (BIGINT), `bang_hoa_don` (VARCHAR(100)), `so_tien_phat_sinh` (NUMERIC(18,2) NOT NULL), `so_tien_da_thanh_toan` (NUMERIC(18,2) DEFAULT 0), `so_tien_con_lai` (NUMERIC(18,2) NOT NULL), `ngay_dao_han` (TIMESTAMPTZ NOT NULL), `trang_thai` (`chua_thanh_toan`, `mot_phan`, `da_thanh_toan`, `qua_han`), CHECK: phải có `ma_khach_hang` khi `phai_thu` và `ma_nha_cung_cap` khi `phai_tra`, audit columns.

### 40. `bao_cao_tai_chinh` — Báo cáo tài chính tổng hợp
- `id` (BIGSERIAL PK), `loai_bao_cao` (`bang_can_doi_ke_toan`, `ket_qua_kinh_doanh`, `luu_chuyen_tien_te`, `thuyet_minh`), `ky_bao_cao` (VARCHAR(20) NOT NULL), `ngay_lap_bao_cao` (TIMESTAMPTZ NOT NULL), `tong_tai_san` (NUMERIC(18,2)), `tong_no_phai_tra` (NUMERIC(18,2)), `von_chu_so_huu` (NUMERIC(18,2)), `doanh_thu_thuan` (NUMERIC(18,2)), `gia_von_hang_ban` (NUMERIC(18,2)), `loi_nhuan_truoc_thue` (NUMERIC(18,2)), `loi_nhuan_sau_thue` (NUMERIC(18,2)), `nguoi_lap` (BIGINT FK -> `nguoi_dung(id)`), `nguoi_phe_duyet` (BIGINT FK -> `nguoi_dung(id)`), `trang_thai` (`nhap`, `cho_duyet`, `da_phe_duyet`, `da_nop`), audit columns.

### 41. `gia_thanh_san_pham` — Giá thành sản phẩm may mặc
- `id` (BIGSERIAL PK), `ma_san_pham` (BIGINT FK -> `san_pham(id)`), `ma_lenh_san_xuat` (BIGINT FK -> `lenh_san_xuat(id)`), `ky_tinh_gia_thanh` (VARCHAR(20) NOT NULL), `so_luong_san_xuat` (NUMERIC(18,3) NOT NULL CHECK > 0), `chi_phi_vat_lieu_truc_tiep` (NUMERIC(18,2) NOT NULL), `chi_phi_nhan_cong_truc_tiep` (NUMERIC(18,2) NOT NULL), `chi_phi_san_xuat_chung` (NUMERIC(18,2) NOT NULL), `tong_chi_phi` (NUMERIC(18,2) NOT NULL), `gia_thanh_don_vi` (NUMERIC(18,2) NOT NULL), `gia_ban_de_nghi` (NUMERIC(18,2)), `ghi_chu` (TEXT), `nguoi_tinh` (BIGINT FK -> `nguoi_dung(id)`), `trang_thai` (`du_thao`, `da_duyet`, `da_cap_nhat_vao_san_pham`), audit columns.
