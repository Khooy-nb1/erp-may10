# 05 — KẾT QUẢ KIỂM THỬ CƠ SỞ DỮ LIỆU (DATABASE TEST REPORT)

Tài liệu ghi nhận kết quả kiểm thử tính toàn vẹn dữ liệu, các ràng buộc toàn vẹn và khả năng truy vấn liên kết (JOIN) giữa 5 phân hệ trên cơ sở dữ liệu `erp_may10` (PostgreSQL 18.6) sau khi áp dụng bộ kiểm thử chính xác (Exact Test Audit) của STEP 1.1.

---

## 1. Tóm Tắt Kết Quả Kiểm Thử Toàn Diện

| Mã kiểm thử | Nội dung kiểm tra | Phương pháp kiểm tra | Kết quả thực tế | Trạng thái |
|:---:|---|---|:---:|:---:|
| **TEST 1** | Kiểm tra chính xác danh sách 41 bảng | So sánh tập hợp: `Expected - Actual = 0` và `Actual - Expected = 0` | Khớp 41/41 bảng, 0 thiếu, 0 thừa | **PASS** |
| **TEST 2** | Kiểm tra khóa chính từng bảng (PK) | Duyệt từng bảng trong 41 bảng, xác nhận cột `id` kiểu `bigint` làm PK | 41/41 bảng có đúng 1 PK `id bigint` | **PASS** |
| **TEST 3** | Kiểm tra chính xác các khóa ngoại (FK) | Truy vấn `key_column_usage` kiểm tra từng cặp (src_table, col, tgt_table, col) | 61/61 FK cốt lõi khớp 100%, tổng 158 FKs | **PASS** |
| **TEST 4** | Kiểm tra UNIQUE mã nghiệp vụ | Xác nhận ràng buộc UNIQUE trên toàn bộ mã nghiệp vụ của 25 đối tượng | 25/25 mã nghiệp vụ có UNIQUE | **PASS** |
| **TEST 5** | Kiểm tra ràng buộc NOT NULL | Rà soát các cột bắt buộc nhập liệu theo nghiệp vụ | 188 cột có NOT NULL | **PASS** |
| **TEST 6** | Kiểm tra ràng buộc CHECK | Kiểm tra miền giá trị (số lượng > 0, tiền >= 0, điểm 0-10, tỷ lệ 0-100%) | 269 CHECK constraints | **PASS** |
| **TEST 7** | Kiểm tra bảng trùng lặp (Duplicate) | Quét toàn bộ bảng tiếng Anh cũ (`users`, `products`, `warehouses`...) | 0 bảng trùng lặp tồn tại | **PASS** |
| **TEST 8** | JOIN Bán hàng: KH -> Đơn bán -> Chi tiết -> Sản phẩm | Khách hàng An Phước -> Đơn bán `DBH_2026_001` -> Sơ mi nam trắng | 2 dòng liên kết hợp lệ | **PASS** |
| **TEST 9** | JOIN PH1 -> PH2: Đơn bán -> KHSX -> LSX | Đơn `DBH_2026_001` -> KHSX `KHSX_2026_001` -> LSX `LSX_2026_001` | 2 dòng liên kết hợp lệ | **PASS** |
| **TEST 10** | JOIN PH3 -> PH4: Đơn mua -> Phiếu nhập kho -> Kho | Đơn mua `PO_2026_001` -> Phiếu nhập `PNK_2026_001` -> Kho NPL | 1 dòng liên kết hợp lệ | **PASS** |
| **TEST 11** | JOIN PH2 -> PH4: LSX -> Phiếu xuất kho NVL | Lệnh `LSX_2026_001` -> Phiếu xuất `PXK_2026_001` -> Kho NPL | 1 dòng liên kết hợp lệ | **PASS** |
| **TEST 12** | JOIN PH1 -> PH5: Khách hàng -> Công nợ phải thu | Khách hàng Viettel -> Công nợ phải thu 49.500.000 VNĐ | 1 dòng công nợ hợp lệ | **PASS** |
| **TEST 13** | JOIN PH3 -> PH5: Nhà cung cấp -> Công nợ phải trả | Nhà cung cấp Dệt may -> Công nợ phải trả 18.700.000 VNĐ | 1 dòng công nợ hợp lệ | **PASS** |
| **TEST 14** | JOIN PH2 -> PH5: Sản phẩm -> Giá thành | Sản phẩm Áo sơ mi nam -> Giá thành đơn vị 220.000 VNĐ | 1 dòng giá thành hợp lệ | **PASS** |
| **TEST 15** | JOIN PH5: Chứng từ gốc -> Nhật ký hạch toán | Chứng từ `CTG_2026_001` -> Bút toán Nợ 131 / Có 511 | 1 dòng hạch toán hợp lệ | **PASS** |
| **INTEGRITY**| Kiểm tra bản ghi mồ côi (Orphan records) | Quét 10 quan hệ cha-con cốt lõi giữa 5 phân hệ | 0 bản ghi mồ côi | **PASS** |

---

## 2. Nhật Ký Kết Quả Thực Thi Từ PostgreSQL 18

### TEST 1: Kiểm tra chính xác 41 bảng
```text
+----------------+--------------+---------------+------------------+--------+
| expected_count | actual_count | missing_count | unexpected_count | result |
+----------------+--------------+---------------+------------------+--------+
|             41 |           41 |             0 |                0 | PASS   |
+----------------+--------------+---------------+------------------+--------+
```

### TEST 2: Kiểm tra khóa chính từng bảng
```text
+--------------+-----------------+--------+
| total_tables | valid_pk_tables | result |
+--------------+-----------------+--------+
|           41 |              41 | PASS   |
+--------------+-----------------+--------+
```

### TEST 3: Kiểm tra các khóa ngoại cốt lõi
```text
+-------------------+------------------+----------------------+--------+
| required_fk_count | total_actual_fks | missing_required_fks | result |
+-------------------+------------------+----------------------+--------+
|                61 |              158 |                    0 | PASS   |
+-------------------+------------------+----------------------+--------+
```

### TEST 4: Kiểm tra UNIQUE mã nghiệp vụ
```text
+------------------------+-----------------+----------------------+--------+
| required_uniques_count | matched_uniques | total_actual_uniques | result |
+------------------------+-----------------+----------------------+--------+
|                     25 |              25 |                   25 | PASS   |
+------------------------+-----------------+----------------------+--------+
```

### TEST 7: Kiểm tra bảng trùng lặp
```text
+-----------------------+--------+
| duplicate_table_count | result |
+-----------------------+--------+
|                     0 | PASS   |
+-----------------------+--------+
```

### TEST 8 đến TEST 15: Kết quả các phép JOIN liên phân hệ
- **TEST 8 (Bán hàng)**: `khach_hang` JOIN `don_ban_hang` JOIN `chi_tiet_don_ban_hang` JOIN `san_pham`: Trả về 2 dòng -> **PASS**.
- **TEST 9 (PH1 -> PH2)**: `don_ban_hang` JOIN `ke_hoach_san_xuat` JOIN `lenh_san_xuat`: Trả về 2 dòng -> **PASS**.
- **TEST 10 (PH3 -> PH4)**: `don_mua_hang` JOIN `phieu_nhap_kho` JOIN `kho`: Trả về 1 dòng -> **PASS**.
- **TEST 11 (PH2 -> PH4)**: `lenh_san_xuat` JOIN `phieu_xuat_kho` JOIN `kho`: Trả về 1 dòng -> **PASS**.
- **TEST 12 (PH1 -> PH5)**: `khach_hang` JOIN `cong_no`: Trả về 1 dòng -> **PASS**.
- **TEST 13 (PH3 -> PH5)**: `nha_cung_cap` JOIN `cong_no`: Trả về 1 dòng -> **PASS**.
- **TEST 14 (PH2 -> PH5)**: `san_pham` JOIN `gia_thanh_san_pham`: Trả về 1 dòng -> **PASS**.
- **TEST 15 (PH5)**: `chung_tu_goc` JOIN `nhat_ky_hach_toan`: Trả về 1 dòng -> **PASS**.

### Kiểm tra bản ghi mồ côi (Integrity Check)
```text
+---------------------------------------------+--------------+--------+
|                 check_item                  | orphan_count | status |
+---------------------------------------------+--------------+--------+
| chi_tiet_don_ban_hang khong co don_ban_hang |            0 | PASS   |
| don_ban_hang khong co khach_hang            |            0 | PASS   |
| lenh_san_xuat khong co san_pham             |            0 | PASS   |
| lenh_san_xuat khong co don_ban_hang         |            0 | PASS   |
| phieu_nhap_kho tu mua khong co don_mua_hang |            0 | PASS   |
| phieu_nhap_kho khong co kho                 |            0 | PASS   |
| phieu_xuat_kho khong co kho                 |            0 | PASS   |
| cong_no khach hang khong co khach_hang      |            0 | PASS   |
| cong_no NCC khong co nha_cung_cap           |            0 | PASS   |
| gia_thanh_san_pham khong co san_pham        |            0 | PASS   |
+---------------------------------------------+--------------+--------+
| Total Orphan Records                        |            0 | PASS   |
+---------------------------------------------+--------------+--------+
```

---

## 3. Kết Luận
Toàn bộ 41 bảng, 6 bảng Master Data, 158 khóa ngoại, 25 ràng buộc UNIQUE, 269 ràng buộc CHECK, 188 cột NOT NULL, và các liên kết nghiệp vụ xuyên phân hệ đã được kiểm thử và xác thực đạt chuẩn **100% PASS**.
Cơ sở dữ liệu hoàn toàn sẵn sàng làm nền tảng vững chắc cho các bước phát triển tiếp theo.
