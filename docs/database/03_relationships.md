# 03 — QUAN HỆ KHÓA NGOẠI VÀ LIÊN KẾT XUYÊN PHÂN HỆ

Tài liệu thống kê toàn bộ các quan hệ khóa ngoại (Foreign Keys) trong CSDL `erp_may10` và giải thích vai trò của chúng trong luồng vận hành của doanh nghiệp may mặc May 10.
Database có tổng cộng **158 khóa ngoại (Foreign Keys)**, kết nối 41 bảng (gồm 6 bảng Master Data và 5 phân hệ).

---

## 1. Danh Sách Chi Tiết Khóa Ngoại Theo Từng Phân Hệ

### A. Dữ liệu dùng chung (Master Data — 6 Bảng)
| Bảng nguồn | Cột khóa ngoại | Bảng đích (Tham chiếu) | Mục đích nghiệp vụ |
|---|---|---|---|
| `nguoi_dung` | `nguoi_tao` / `nguoi_cap_nhat` | `nguoi_dung(id)` | Self-referencing audit trail |
| `don_vi_tinh` | `nguoi_tao` | `nguoi_dung(id)` | Theo dõi người tạo đơn vị tính |
| `kho` | `nguoi_quan_ly` | `nguoi_dung(id)` | Thủ kho quản lý |
| `kho` | `nguoi_tao` / `nguoi_cap_nhat` | `nguoi_dung(id)` | Audit trail |
| `nha_cung_cap` | `nguoi_tao` / `nguoi_cap_nhat` | `nguoi_dung(id)` | Audit trail |
| `san_pham` | `ma_don_vi_tinh` | `don_vi_tinh(id)` | Đơn vị đo lường sản phẩm (cái, bộ) |
| `san_pham` | `nguoi_tao` / `nguoi_cap_nhat` | `nguoi_dung(id)` | Audit trail |
| `vat_tu` | `ma_don_vi_tinh` | `don_vi_tinh(id)` | Đơn vị đo lường NPL (mét, kg, cuộn) |
| `vat_tu` | `nha_cung_cap_chinh` | `nha_cung_cap(id)` | NCC chính cấp vật tư này |
| `vat_tu` | `nguoi_tao` / `nguoi_cap_nhat` | `nguoi_dung(id)` | Audit trail |

---

### B. PH1 — Bán hàng và Quản lý khách hàng (5 Bảng)
| Bảng nguồn | Cột khóa ngoại | Bảng đích | Mục đích nghiệp vụ |
|---|---|---|---|
| `khach_hang` | `nguoi_tao` / `nguoi_cap_nhat` | `nguoi_dung(id)` | Audit trail |
| `don_ban_hang` | `ma_khach_hang` | `khach_hang(id)` | Đơn hàng thuộc về khách hàng nào |
| `don_ban_hang` | `nguoi_ban` | `nguoi_dung(id)` | Nhân viên kinh doanh phụ trách |
| `don_ban_hang` | `nguoi_tao` / `nguoi_cap_nhat` | `nguoi_dung(id)` | Audit trail |
| `chi_tiet_don_ban_hang`| `ma_don_ban_hang` | `don_ban_hang(id)` | Thuộc đơn bán hàng nào (ON DELETE CASCADE) |
| `chi_tiet_don_ban_hang`| `ma_san_pham` | `san_pham(id)` | Sản phẩm may mặc nào được bán |
| `chi_tiet_don_ban_hang`| `nguoi_tao` | `nguoi_dung(id)` | Audit trail |
| `giao_hang` | `ma_don_ban_hang` | `don_ban_hang(id)` | Giao hàng cho đơn bán nào |
| `giao_hang` | `ma_kho` | `kho(id)` | Xuất hàng từ kho nào đi giao |
| `giao_hang` | `nguoi_giao_hang` | `nguoi_dung(id)` | Nhân viên giao hàng |
| `hoa_don_ban_hang` | `ma_don_ban_hang` | `don_ban_hang(id)` | Hóa đơn xuất cho đơn bán nào |
| `hoa_don_ban_hang` | `ma_khach_hang` | `khach_hang(id)` | Người mua chịu trách nhiệm thanh toán |

---

### C. PH2 — Sản xuất và Hoạch định nhu cầu NPL (6 Bảng)
| Bảng nguồn | Cột khóa ngoại | Bảng đích | Mục đích nghiệp vụ |
|---|---|---|---|
| `ke_hoach_san_xuat` | `ma_don_ban_hang` | `don_ban_hang(id)` | Lập kế hoạch cho đơn bán nào (PH1 -> PH2) |
| `ke_hoach_san_xuat` | `ma_san_pham` | `san_pham(id)` | Sản phẩm may mặc cần lập kế hoạch |
| `ke_hoach_san_xuat` | `nguoi_lap_ke_hoach` | `nguoi_dung(id)` | Kỹ sư lập kế hoạch sản xuất |
| `dinh_muc_nguyen_lieu`| `ma_san_pham` | `san_pham(id)` | Định mức kỹ thuật của sản phẩm nào |
| `dinh_muc_nguyen_lieu`| `ma_vat_tu` | `vat_tu(id)` | Tiêu hao nguyên phụ liệu nào |
| `lenh_san_xuat` | `ma_ke_hoach_san_xuat` | `ke_hoach_san_xuat(id)` | Lệnh SX thuộc kế hoạch nào |
| `lenh_san_xuat` | `ma_don_ban_hang` | `don_ban_hang(id)` | Lệnh SX đáp ứng đơn bán nào |
| `lenh_san_xuat` | `ma_san_pham` | `san_pham(id)` | Sản phẩm phân xưởng cần may |
| `lenh_san_xuat` | `nguoi_phu_trach` | `nguoi_dung(id)` | Quản đốc / Tổ trưởng xưởng may |
| `cong_doan_san_xuat` | `ma_lenh_san_xuat` | `lenh_san_xuat(id)` | Công đoạn thuộc lệnh sản xuất nào |
| `cong_doan_san_xuat` | `nguoi_phu_trach` | `nguoi_dung(id)` | Người phụ trách công đoạn |
| `nhu_cau_npl` | `ma_ke_hoach_san_xuat` | `ke_hoach_san_xuat(id)` | Nhu cầu MRP phát sinh từ kế hoạch nào |
| `nhu_cau_npl` | `ma_vat_tu` | `vat_tu(id)` | Loại vật tư cần mua/cấp |
| `nhu_cau_npl` | `ma_yeu_cau_mua_hang` | `yeu_cau_mua_hang(id)` | Liên kết tới đề xuất mua hàng (PH2 -> PH3) |
| `ket_qua_san_xuat` | `ma_lenh_san_xuat` | `lenh_san_xuat(id)` | Báo cáo sản lượng của lệnh nào |
| `ket_qua_san_xuat` | `ma_phieu_nhap_kho` | `phieu_nhap_kho(id)` | Liên kết phiếu nhập kho thành phẩm (PH2 -> PH4) |
| `ket_qua_san_xuat` | `nguoi_bao_cao` | `nguoi_dung(id)` | Thống kê viên phân xưởng |

---

### D. PH3 — Mua hàng (7 Bảng nghiệp vụ)
| Bảng nguồn | Cột khóa ngoại | Bảng đích | Mục đích nghiệp vụ |
|---|---|---|---|
| `yeu_cau_mua_hang` | `ma_nhu_cau_npl` | `nhu_cau_npl(id)` | Đề xuất mua hàng từ MRP xưởng may |
| `yeu_cau_mua_hang` | `nguoi_yeu_cau` | `nguoi_dung(id)` | Người đề xuất mua |
| `yeu_cau_mua_hang` | `nguoi_phe_duyet` | `nguoi_dung(id)` | Giám đốc / Trưởng phòng duyệt mua |
| `chi_tiet_yeu_cau_mua`| `ma_yeu_cau_mua_hang`| `yeu_cau_mua_hang(id)`| Thuộc yêu cầu mua nào |
| `chi_tiet_yeu_cau_mua`| `ma_vat_tu` | `vat_tu(id)` | Vật tư cần mua |
| `chi_tiet_yeu_cau_mua`| `ma_kho_nhap` | `kho(id)` | Kho dự kiến nhập về |
| `don_mua_hang` | `ma_nha_cung_cap` | `nha_cung_cap(id)` | Đặt hàng cho NCC nào |
| `don_mua_hang` | `ma_yeu_cau_mua_hang` | `yeu_cau_mua_hang(id)`| Mua theo đề xuất nào |
| `don_mua_hang` | `nguoi_dat_hang` | `nguoi_dung(id)` | Nhân viên mua hàng phụ trách |
| `chi_tiet_don_mua` | `ma_don_mua_hang` | `don_mua_hang(id)` | Chi tiết thuộc đơn PO nào |
| `chi_tiet_don_mua` | `ma_vat_tu` | `vat_tu(id)` | Mặt hàng NPL đặt mua |
| `hoa_don_nha_cung_cap`| `ma_don_mua_hang` | `don_mua_hang(id)` | Hóa đơn từ đơn mua hàng nào |
| `hoa_don_nha_cung_cap`| `ma_nha_cung_cap` | `nha_cung_cap(id)` | Nhà cung cấp phát hành hóa đơn |
| `thanh_toan_ncc` | `ma_hoa_don_ncc` | `hoa_don_nha_cung_cap(id)`| Thanh toán cho hóa đơn nào |
| `thanh_toan_ncc` | `nguoi_thanh_toan` | `nguoi_dung(id)` | Kế toán thanh toán |
| `danh_gia_ncc` | `ma_nha_cung_cap` | `nha_cung_cap(id)` | Đánh giá nhà cung cấp nào |
| `danh_gia_ncc` | `nguoi_danh_gia` | `nguoi_dung(id)` | Cán bộ phòng cung ứng đánh giá |

---

### E. PH4 — Kho và Quản lý vật tư (11 Bảng)
| Bảng nguồn | Cột khóa ngoại | Bảng đích | Mục đích nghiệp vụ |
|---|---|---|---|
| `vi_tri_kho` | `ma_kho` | `kho(id)` | Vị trí nằm trong kho nào |
| `lo_vat_tu` | `ma_vat_tu` | `vat_tu(id)` | Lô của loại vật tư nào |
| `lo_vat_tu` | `ma_nha_cung_cap` | `nha_cung_cap(id)` | Nguồn gốc lô từ NCC nào |
| `lo_vat_tu` | `ma_don_mua_hang` | `don_mua_hang(id)` | Nhập về theo đơn mua hàng nào |
| `lo_vat_tu` | `ma_vi_tri_kho` | `vi_tri_kho(id)` | Đang để tại kệ/ngăn nào |
| `ton_kho` | `ma_kho` | `kho(id)` | Tồn kho tại kho nào |
| `ton_kho` | `ma_vat_tu` | `vat_tu(id)` | Vật tư tồn kho |
| `ton_kho` | `don_vi_tinh` | `don_vi_tinh(id)` | Đơn vị tính số dư tồn kho |
| `phieu_nhap_kho` | `ma_don_mua_hang` | `don_mua_hang(id)` | Nhập kho từ PO mua hàng (PH3 -> PH4) |
| `phieu_nhap_kho` | `ma_lenh_san_xuat` | `lenh_san_xuat(id)` | Nhập kho thành phẩm may từ LSX (PH2 -> PH4) |
| `phieu_nhap_kho` | `ma_kho_nhap` | `kho(id)` | Nhập vào kho nào |
| `phieu_nhap_kho` | `thu_kho` | `nguoi_dung(id)` | Thủ kho ký nhận |
| `chi_tiet_phieu_nhap` | `ma_phieu_nhap_kho` | `phieu_nhap_kho(id)` | Thuộc phiếu nhập kho nào |
| `chi_tiet_phieu_nhap` | `ma_vat_tu` | `vat_tu(id)` | Vật tư / sản phẩm nhập |
| `chi_tiet_phieu_nhap` | `ma_lo_vat_tu` | `lo_vat_tu(id)` | Lô vật tư tương ứng |
| `chi_tiet_phieu_nhap` | `ma_vi_tri_kho` | `vi_tri_kho(id)` | Cất vào vị trí nào |
| `phieu_xuat_kho` | `ma_don_ban_hang` | `don_ban_hang(id)` | Xuất hàng giao khách (PH1 -> PH4) |
| `phieu_xuat_kho` | `ma_lenh_san_xuat` | `lenh_san_xuat(id)` | Xuất NVL cho sản xuất (PH2 -> PH4) |
| `phieu_xuat_kho` | `ma_kho_xuat` | `kho(id)` | Xuất đi từ kho nào |
| `phieu_xuat_kho` | `thu_kho` | `nguoi_dung(id)` | Thủ kho ký xuất |
| `chi_tiet_phieu_xuat` | `ma_phieu_xuat_kho` | `phieu_xuat_kho(id)` | Thuộc phiếu xuất nào |
| `chi_tiet_phieu_xuat` | `ma_vat_tu` | `vat_tu(id)` | Vật tư / sản phẩm xuất |
| `chi_tiet_phieu_xuat` | `ma_lo_vat_tu` | `lo_vat_tu(id)` | Lô hàng được xuất (FIFO) |
| `phieu_chuyen_kho` | `ma_kho_xuat` | `kho(id)` | Kho nguồn |
| `phieu_chuyen_kho` | `ma_kho_nhap` | `kho(id)` | Kho đích |
| `phieu_chuyen_kho` | `nguoi_chuyen` | `nguoi_dung(id)` | Nhân viên điều chuyển |
| `chi_tiet_chuyen_kho`| `ma_phieu_chuyen_kho`| `phieu_chuyen_kho(id)`| Thuộc phiếu chuyển nào |
| `chi_tiet_chuyen_kho`| `ma_vat_tu` | `vat_tu(id)` | Vật tư điều chuyển |
| `phieu_kiem_ke` | `ma_kho` | `kho(id)` | Kho được kiểm kê |
| `phieu_kiem_ke` | `truong_kiem_ke` | `nguoi_dung(id)` | Trưởng đoàn kiểm kê |
| `chi_tiet_kiem_ke` | `ma_phieu_kiem_ke` | `phieu_kiem_ke(id)` | Thuộc đợt kiểm kê nào |
| `chi_tiet_kiem_ke` | `ma_vat_tu` | `vat_tu(id)` | Vật tư kiểm đếm |

---

### F. PH5 — Tài chính – Kế toán và Giá thành (6 Bảng)
| Bảng nguồn | Cột khóa ngoại | Bảng đích | Mục đích nghiệp vụ |
|---|---|---|---|
| `he_thong_tai_khoan` | `tai_khoan_cha` | `he_thong_tai_khoan(id)`| Phân cấp tài khoản kế toán |
| `nhat_ky_hach_toan` | `ma_chung_tu_goc` | `chung_tu_goc(id)` | Bút toán phát sinh từ chứng từ nào |
| `nhat_ky_hach_toan` | `tai_khoan_no` | `he_thong_tai_khoan(id)`| Tài khoản ghi Nợ |
| `nhat_ky_hach_toan` | `tai_khoan_co` | `he_thong_tai_khoan(id)`| Tài khoản ghi Có |
| `nhat_ky_hach_toan` | `nguoi_hach_toan` | `nguoi_dung(id)` | Kế toán viên ghi sổ |
| `nhat_ky_hach_toan` | `nguoi_phe_duyet` | `nguoi_dung(id)` | Kế toán trưởng duyệt |
| `cong_no` | `ma_khach_hang` | `khach_hang(id)` | Khách hàng phải thu (PH1 -> PH5) |
| `cong_no` | `ma_nha_cung_cap` | `nha_cung_cap(id)` | NCC phải trả (PH3 -> PH5) |
| `bao_cao_tai_chinh` | `nguoi_lap` | `nguoi_dung(id)` | Kế toán lập báo cáo |
| `bao_cao_tai_chinh` | `nguoi_phe_duyet` | `nguoi_dung(id)` | Giám đốc tài chính duyệt |
| `gia_thanh_san_pham` | `ma_san_pham` | `san_pham(id)` | Tính giá thành cho sản phẩm nào |
| `gia_thanh_san_pham` | `ma_lenh_san_xuat` | `lenh_san_xuat(id)` | Tính giá thành theo lệnh sản xuất nào |
| `gia_thanh_san_pham` | `nguoi_tinh` | `nguoi_dung(id)` | Kế toán giá thành |

---

## 2. 7 Chuỗi Liên Kết Nghiệp Vụ Cốt Lõi (Core Business Chains)

1. **Chuỗi Bán hàng -> Kế hoạch -> Sản xuất**:
   `khach_hang` -> `don_ban_hang` -> `ke_hoach_san_xuat` -> `lenh_san_xuat` -> `cong_doan_san_xuat`.
2. **Chuỗi Hoạch định vật tư -> Mua hàng -> Kho**:
   `ke_hoach_san_xuat` -> `nhu_cau_npl` -> `yeu_cau_mua_hang` -> `don_mua_hang` -> `phieu_nhap_kho` -> `ton_kho`.
3. **Chuỗi Cung ứng sản xuất**:
   `lenh_san_xuat` -> `phieu_xuat_kho` (xuất vải/chỉ) -> Phân xưởng may -> `ket_qua_san_xuat` -> `phieu_nhap_kho` (nhập áo sơ mi/quần âu thành phẩm).
4. **Chuỗi Giao hàng bán**:
   `don_ban_hang` -> `phieu_xuat_kho` (xuất thành phẩm) -> `giao_hang` -> Khách hàng ký nhận.
5. **Chuỗi Hóa đơn & Công nợ Phải thu**:
   `don_ban_hang` -> `hoa_don_ban_hang` -> `cong_no` (loại `phai_thu`) -> Thu tiền mặt/chuyển khoản.
6. **Chuỗi Hóa đơn & Công nợ Phải trả**:
   `don_mua_hang` -> `hoa_don_nha_cung_cap` -> `cong_no` (loại `phai_tra`) -> `thanh_toan_ncc`.
7. **Chuỗi Kế toán sổ cái & Giá thành**:
   Chứng từ kho/hóa đơn -> `chung_tu_goc` -> `nhat_ky_hach_toan` (Nợ/Có TK 111, 112, 131, 152, 155, 331, 511, 632) & `lenh_san_xuat` -> `gia_thanh_san_pham` (cập nhật giá vốn về `san_pham`).
