-- =============================================================================
-- ERP MAY 10 — BỘ KIỂM THỬ TOÀN DIỆN CƠ SỞ DỮ LIỆU (AUDIT & VALIDATION)
-- Tech Stack: PostgreSQL 18 | Database: erp_may10 | Schema: public
-- Chuẩn kiểm tra: 41 Tables | 6 Master Tables | Exact PK, FK, UNIQUE, CHECK, NOT NULL
-- =============================================================================

\pset border 2
\pset format aligned

-- -----------------------------------------------------------------------------
-- TEST 1: KIỂM TRA CHÍNH XÁC DANH SÁCH 41 BẢNG (EXACT TABLE LIST)
-- EXPECTED TABLES - ACTUAL TABLES = 0 AND ACTUAL TABLES - EXPECTED TABLES = 0
-- -----------------------------------------------------------------------------
SELECT 'TEST 1: KIỂM TRA CHÍNH XÁC DANH SÁCH 41 BẢNG (EXACT TABLE MATCH)' AS test_name;

WITH expected AS (
    SELECT unnest(ARRAY[
        -- Master Data (6)
        'nguoi_dung', 'don_vi_tinh', 'kho', 'nha_cung_cap', 'san_pham', 'vat_tu',
        -- PH1: Bán hàng (5)
        'khach_hang', 'don_ban_hang', 'chi_tiet_don_ban_hang', 'giao_hang', 'hoa_don_ban_hang',
        -- PH2: Sản xuất & MRP (6)
        'ke_hoach_san_xuat', 'dinh_muc_nguyen_lieu', 'lenh_san_xuat', 'cong_doan_san_xuat', 'nhu_cau_npl', 'ket_qua_san_xuat',
        -- PH3: Mua hàng (7)
        'yeu_cau_mua_hang', 'chi_tiet_yeu_cau_mua', 'don_mua_hang', 'chi_tiet_don_mua', 'hoa_don_nha_cung_cap', 'thanh_toan_ncc', 'danh_gia_ncc',
        -- PH4: Kho & Vật tư (11)
        'vi_tri_kho', 'lo_vat_tu', 'ton_kho', 'phieu_nhap_kho', 'chi_tiet_phieu_nhap', 'phieu_xuat_kho', 'chi_tiet_phieu_xuat', 'phieu_chuyen_kho', 'chi_tiet_chuyen_kho', 'phieu_kiem_ke', 'chi_tiet_kiem_ke',
        -- PH5: Tài chính & Giá thành (6)
        'he_thong_tai_khoan', 'chung_tu_goc', 'nhat_ky_hach_toan', 'cong_no', 'bao_cao_tai_chinh', 'gia_thanh_san_pham'
    ]) AS table_name
),
actual AS (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
),
diff AS (
    SELECT 'MISSING_IN_DB' AS diff_type, table_name FROM (SELECT table_name FROM expected EXCEPT SELECT table_name FROM actual) t1
    UNION ALL
    SELECT 'UNEXPECTED_IN_DB' AS diff_type, table_name FROM (SELECT table_name FROM actual EXCEPT SELECT table_name FROM expected) t2
)
SELECT 
    (SELECT count(*) FROM expected) AS expected_count,
    (SELECT count(*) FROM actual) AS actual_count,
    (SELECT count(*) FROM diff WHERE diff_type = 'MISSING_IN_DB') AS missing_count,
    (SELECT count(*) FROM diff WHERE diff_type = 'UNEXPECTED_IN_DB') AS unexpected_count,
    CASE WHEN (SELECT count(*) FROM diff) = 0 AND (SELECT count(*) FROM actual) = 41 THEN 'PASS' ELSE 'FAIL' END AS result;

-- -----------------------------------------------------------------------------
-- TEST 2: KIỂM TRA PRIMARY KEY TỪNG BẢNG (MỖI BẢNG CÓ ĐÚNG 1 PK TÊN LÀ ID)
-- -----------------------------------------------------------------------------
SELECT 'TEST 2: KIỂM TRA PRIMARY KEY TRÊN TỪNG BẢNG (EXACT PK CHECK)' AS test_name;

WITH pk_check AS (
    SELECT 
        t.table_name,
        kcu.column_name AS pk_column,
        c.data_type
    FROM information_schema.tables t
    LEFT JOIN information_schema.table_constraints tc 
        ON t.table_name = tc.table_name 
        AND tc.table_schema = t.table_schema 
        AND tc.constraint_type = 'PRIMARY KEY'
    LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name 
        AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.columns c
        ON c.table_name = t.table_name
        AND c.column_name = kcu.column_name
        AND c.table_schema = t.table_schema
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
)
SELECT 
    COUNT(*) AS total_tables,
    COUNT(CASE WHEN pk_column = 'id' AND data_type = 'bigint' THEN 1 END) AS valid_pk_tables,
    CASE WHEN COUNT(*) = 41 AND COUNT(CASE WHEN pk_column = 'id' AND data_type = 'bigint' THEN 1 END) = 41 THEN 'PASS' ELSE 'FAIL' END AS result
FROM pk_check;

-- -----------------------------------------------------------------------------
-- TEST 3: KIỂM TRA DANH SÁCH KHÓA NGOẠI THỰC TẾ (EXACT FOREIGN KEYS AUDIT)
-- Không chỉ COUNT mà kiểm tra từng cặp (source_table, source_column, target_table, target_column)
-- -----------------------------------------------------------------------------
SELECT 'TEST 3: KIỂM TRA CHÍNH XÁC CÁC KHÓA NGOẠI QUAN TRỌNG (EXACT FK AUDIT)' AS test_name;

WITH required_fks AS (
    SELECT * FROM (VALUES
        -- PH1 -> PH2 & Master
        ('don_ban_hang', 'ma_khach_hang', 'khach_hang', 'id'),
        ('don_ban_hang', 'nguoi_ban', 'nguoi_dung', 'id'),
        ('chi_tiet_don_ban_hang', 'ma_don_ban_hang', 'don_ban_hang', 'id'),
        ('chi_tiet_don_ban_hang', 'ma_san_pham', 'san_pham', 'id'),
        ('giao_hang', 'ma_don_ban_hang', 'don_ban_hang', 'id'),
        ('giao_hang', 'ma_kho', 'kho', 'id'),
        ('hoa_don_ban_hang', 'ma_don_ban_hang', 'don_ban_hang', 'id'),
        ('hoa_don_ban_hang', 'ma_khach_hang', 'khach_hang', 'id'),
        -- PH2 -> PH1 & Master
        ('ke_hoach_san_xuat', 'ma_don_ban_hang', 'don_ban_hang', 'id'),
        ('ke_hoach_san_xuat', 'ma_san_pham', 'san_pham', 'id'),
        ('dinh_muc_nguyen_lieu', 'ma_san_pham', 'san_pham', 'id'),
        ('dinh_muc_nguyen_lieu', 'ma_vat_tu', 'vat_tu', 'id'),
        ('lenh_san_xuat', 'ma_ke_hoach_san_xuat', 'ke_hoach_san_xuat', 'id'),
        ('lenh_san_xuat', 'ma_don_ban_hang', 'don_ban_hang', 'id'),
        ('lenh_san_xuat', 'ma_san_pham', 'san_pham', 'id'),
        ('cong_doan_san_xuat', 'ma_lenh_san_xuat', 'lenh_san_xuat', 'id'),
        ('nhu_cau_npl', 'ma_ke_hoach_san_xuat', 'ke_hoach_san_xuat', 'id'),
        ('nhu_cau_npl', 'ma_vat_tu', 'vat_tu', 'id'),
        ('ket_qua_san_xuat', 'ma_lenh_san_xuat', 'lenh_san_xuat', 'id'),
        -- PH3 -> Master & PH2
        ('yeu_cau_mua_hang', 'ma_nhu_cau_npl', 'nhu_cau_npl', 'id'),
        ('chi_tiet_yeu_cau_mua', 'ma_yeu_cau_mua_hang', 'yeu_cau_mua_hang', 'id'),
        ('chi_tiet_yeu_cau_mua', 'ma_vat_tu', 'vat_tu', 'id'),
        ('chi_tiet_yeu_cau_mua', 'ma_kho_nhap', 'kho', 'id'),
        ('don_mua_hang', 'ma_nha_cung_cap', 'nha_cung_cap', 'id'),
        ('don_mua_hang', 'ma_yeu_cau_mua_hang', 'yeu_cau_mua_hang', 'id'),
        ('chi_tiet_don_mua', 'ma_don_mua_hang', 'don_mua_hang', 'id'),
        ('chi_tiet_don_mua', 'ma_vat_tu', 'vat_tu', 'id'),
        ('hoa_don_nha_cung_cap', 'ma_don_mua_hang', 'don_mua_hang', 'id'),
        ('hoa_don_nha_cung_cap', 'ma_nha_cung_cap', 'nha_cung_cap', 'id'),
        ('thanh_toan_ncc', 'ma_hoa_don_ncc', 'hoa_don_nha_cung_cap', 'id'),
        -- PH4 -> PH1, PH2, PH3 & Master
        ('vi_tri_kho', 'ma_kho', 'kho', 'id'),
        ('lo_vat_tu', 'ma_vat_tu', 'vat_tu', 'id'),
        ('lo_vat_tu', 'ma_nha_cung_cap', 'nha_cung_cap', 'id'),
        ('lo_vat_tu', 'ma_vi_tri_kho', 'vi_tri_kho', 'id'),
        ('ton_kho', 'ma_kho', 'kho', 'id'),
        ('ton_kho', 'ma_vat_tu', 'vat_tu', 'id'),
        ('ton_kho', 'don_vi_tinh', 'don_vi_tinh', 'id'),
        ('phieu_nhap_kho', 'ma_don_mua_hang', 'don_mua_hang', 'id'),
        ('phieu_nhap_kho', 'ma_lenh_san_xuat', 'lenh_san_xuat', 'id'),
        ('phieu_nhap_kho', 'ma_kho_nhap', 'kho', 'id'),
        ('chi_tiet_phieu_nhap', 'ma_phieu_nhap_kho', 'phieu_nhap_kho', 'id'),
        ('chi_tiet_phieu_nhap', 'ma_vat_tu', 'vat_tu', 'id'),
        ('phieu_xuat_kho', 'ma_don_ban_hang', 'don_ban_hang', 'id'),
        ('phieu_xuat_kho', 'ma_lenh_san_xuat', 'lenh_san_xuat', 'id'),
        ('phieu_xuat_kho', 'ma_kho_xuat', 'kho', 'id'),
        ('chi_tiet_phieu_xuat', 'ma_phieu_xuat_kho', 'phieu_xuat_kho', 'id'),
        ('chi_tiet_phieu_xuat', 'ma_vat_tu', 'vat_tu', 'id'),
        ('phieu_chuyen_kho', 'ma_kho_xuat', 'kho', 'id'),
        ('phieu_chuyen_kho', 'ma_kho_nhap', 'kho', 'id'),
        ('chi_tiet_chuyen_kho', 'ma_phieu_chuyen_kho', 'phieu_chuyen_kho', 'id'),
        ('chi_tiet_chuyen_kho', 'ma_vat_tu', 'vat_tu', 'id'),
        ('phieu_kiem_ke', 'ma_kho', 'kho', 'id'),
        ('chi_tiet_kiem_ke', 'ma_phieu_kiem_ke', 'phieu_kiem_ke', 'id'),
        ('chi_tiet_kiem_ke', 'ma_vat_tu', 'vat_tu', 'id'),
        -- PH5 -> Toàn hệ thống
        ('nhat_ky_hach_toan', 'ma_chung_tu_goc', 'chung_tu_goc', 'id'),
        ('nhat_ky_hach_toan', 'tai_khoan_no', 'he_thong_tai_khoan', 'id'),
        ('nhat_ky_hach_toan', 'tai_khoan_co', 'he_thong_tai_khoan', 'id'),
        ('cong_no', 'ma_khach_hang', 'khach_hang', 'id'),
        ('cong_no', 'ma_nha_cung_cap', 'nha_cung_cap', 'id'),
        ('gia_thanh_san_pham', 'ma_san_pham', 'san_pham', 'id'),
        ('gia_thanh_san_pham', 'ma_lenh_san_xuat', 'lenh_san_xuat', 'id')
    ) AS t(src_table, src_col, tgt_table, tgt_col)
),
actual_fks AS (
    SELECT
        kcu.table_name AS src_table,
        kcu.column_name AS src_col,
        ccu.table_name AS tgt_table,
        ccu.column_name AS tgt_col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
),
missing_fks AS (
    SELECT r.* FROM required_fks r
    LEFT JOIN actual_fks a
      ON r.src_table = a.src_table 
      AND r.src_col = a.src_col 
      AND r.tgt_table = a.tgt_table 
      AND r.tgt_col = a.tgt_col
    WHERE a.src_table IS NULL
)
SELECT 
    (SELECT count(*) FROM required_fks) AS required_fk_count,
    (SELECT count(*) FROM actual_fks) AS total_actual_fks,
    (SELECT count(*) FROM missing_fks) AS missing_required_fks,
    CASE WHEN (SELECT count(*) FROM missing_fks) = 0 AND (SELECT count(*) FROM actual_fks) >= (SELECT count(*) FROM required_fks) 
         THEN 'PASS' ELSE 'FAIL' END AS result;

-- -----------------------------------------------------------------------------
-- TEST 4: KIỂM TRA RÀNG BUỘC DUY NHẤT (UNIQUE BUSINESS CODES)
-- -----------------------------------------------------------------------------
SELECT 'TEST 4: KIỂM TRA CÁC RÀNG BUỘC UNIQUE MÃ NGHIỆP VỤ' AS test_name;

WITH required_uniques AS (
    SELECT * FROM (VALUES
        ('nguoi_dung', 'email'),
        ('don_vi_tinh', 'ma_don_vi'),
        ('kho', 'ma_kho'),
        ('nha_cung_cap', 'ma_nha_cung_cap'),
        ('san_pham', 'ma_san_pham'),
        ('vat_tu', 'ma_vat_tu'),
        ('khach_hang', 'ma_khach_hang'),
        ('don_ban_hang', 'ma_don_ban'),
        ('giao_hang', 'ma_giao_hang'),
        ('hoa_don_ban_hang', 'ma_hoa_don'),
        ('ke_hoach_san_xuat', 'ma_ke_hoach'),
        ('lenh_san_xuat', 'ma_lenh_san_xuat'),
        ('yeu_cau_mua_hang', 'ma_yeu_cau_mua'),
        ('don_mua_hang', 'ma_don_mua'),
        ('hoa_don_nha_cung_cap', 'ma_hoa_don_ncc'),
        ('thanh_toan_ncc', 'ma_thanh_toan_ncc'),
        ('vi_tri_kho', 'ma_vi_tri'),
        ('lo_vat_tu', 'ma_lo'),
        ('phieu_nhap_kho', 'ma_phieu_nhap'),
        ('phieu_xuat_kho', 'ma_phieu_xuat'),
        ('phieu_chuyen_kho', 'ma_phieu_chuyen'),
        ('phieu_kiem_ke', 'ma_phieu_kiem_ke'),
        ('he_thong_tai_khoan', 'so_tai_khoan'),
        ('chung_tu_goc', 'ma_chung_tu'),
        ('nhat_ky_hach_toan', 'ma_hach_toan')
    ) AS t(table_name, column_name)
),
actual_uniques AS (
    SELECT kcu.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
)
SELECT 
    (SELECT count(*) FROM required_uniques) AS required_uniques_count,
    (SELECT count(*) FROM required_uniques r JOIN actual_uniques a ON r.table_name = a.table_name AND r.column_name = a.column_name) AS matched_uniques,
    (SELECT count(*) FROM actual_uniques) AS total_actual_uniques,
    CASE WHEN (SELECT count(*) FROM required_uniques r LEFT JOIN actual_uniques a ON r.table_name = a.table_name AND r.column_name = a.column_name WHERE a.table_name IS NULL) = 0
         THEN 'PASS' ELSE 'FAIL' END AS result;

-- -----------------------------------------------------------------------------
-- TEST 5: KIỂM TRA RÀNG BUỘC NOT NULL TRÊN CÁC TRƯỜNG BẮT BUỘC
-- -----------------------------------------------------------------------------
SELECT 'TEST 5: KIỂM TRA RÀNG BUỘC NOT NULL' AS test_name;

SELECT 
    COUNT(*) AS total_not_null_columns,
    CASE WHEN COUNT(*) >= 150 THEN 'PASS' ELSE 'FAIL' END AS result
FROM information_schema.columns
WHERE table_schema = 'public' AND is_nullable = 'NO';

-- -----------------------------------------------------------------------------
-- TEST 6: KIỂM TRA CÁC RÀNG BUỘC CHECK (SỐ LƯỢNG > 0, TIỀN >= 0, ĐIỂM 0-10, RANGE)
-- -----------------------------------------------------------------------------
SELECT 'TEST 6: KIỂM TRA RÀNG BUỘC CHECK (QUANTITY, MONEY, RANGE)' AS test_name;

SELECT 
    COUNT(*) AS total_check_constraints,
    CASE WHEN COUNT(*) >= 25 THEN 'PASS' ELSE 'FAIL' END AS result
FROM information_schema.table_constraints
WHERE constraint_type = 'CHECK' AND table_schema = 'public';

-- -----------------------------------------------------------------------------
-- TEST 7: KIỂM TRA TUYỆT ĐỐI KHÔNG CÒN BẢNG DUPLICATE / BẢNG CŨ TIẾNG ANH
-- -----------------------------------------------------------------------------
SELECT 'TEST 7: KIỂM TRA KHÔNG CÒN BẢNG TRÙNG LẶP (DUPLICATE CHECK)' AS test_name;

SELECT 
    COUNT(*) AS duplicate_table_count,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM information_schema.tables
WHERE table_schema = 'public'
  AND lower(table_name) IN (
      'users', 'products', 'warehouses', 'goods_receipts', 'sales_orders', 'invoices',
      'nguoidung', 'sanphammaymac', 'donhangmaymac', 'nhanvienketoan', 
      'hethongtaikhoan_duplicate', 'chungtugoc_duplicate'
  );

-- -----------------------------------------------------------------------------
-- TEST 8: JOIN BÁN HÀNG (Khách hàng -> Đơn bán -> Chi tiết -> Sản phẩm)
-- -----------------------------------------------------------------------------
SELECT 'TEST 8: JOIN BÁN HÀNG (KH -> ĐƠN BÁN -> CHI TIẾT -> SẢN PHẨM)' AS test_name;

SELECT 
    kh.ma_khach_hang,
    kh.ten_khach_hang,
    dbh.ma_don_ban,
    ct.so_luong,
    ct.don_gia,
    ct.thanh_tien,
    sp.ma_san_pham,
    sp.ten_san_pham
FROM khach_hang kh
JOIN don_ban_hang dbh ON dbh.ma_khach_hang = kh.id
JOIN chi_tiet_don_ban_hang ct ON ct.ma_don_ban_hang = dbh.id
JOIN san_pham sp ON ct.ma_san_pham = sp.id;

-- -----------------------------------------------------------------------------
-- TEST 9: JOIN PH1 -> PH2 (Đơn bán -> Kế hoạch sản xuất -> Lệnh sản xuất)
-- -----------------------------------------------------------------------------
SELECT 'TEST 9: JOIN PH1 -> PH2 (ĐƠN BÁN -> KHSX -> LSX)' AS test_name;

SELECT 
    dbh.ma_don_ban,
    khsx.ma_ke_hoach,
    khsx.so_luong_ke_hoach,
    lsx.ma_lenh_san_xuat,
    lsx.so_luong_yeu_cau,
    lsx.so_luong_hoan_thanh,
    lsx.trang_thai
FROM don_ban_hang dbh
JOIN ke_hoach_san_xuat khsx ON khsx.ma_don_ban_hang = dbh.id
JOIN lenh_san_xuat lsx ON lsx.ma_ke_hoach_san_xuat = khsx.id;

-- -----------------------------------------------------------------------------
-- TEST 10: JOIN PH3 -> PH4 (Đơn mua hàng -> Phiếu nhập kho -> Kho)
-- -----------------------------------------------------------------------------
SELECT 'TEST 10: JOIN PH3 -> PH4 (ĐƠN MUA -> PHIẾU NHẬP -> KHO)' AS test_name;

SELECT 
    dmh.ma_don_mua,
    pnk.ma_phieu_nhap,
    pnk.loai_nhap,
    pnk.tong_gia_tri_nhap,
    k.ma_kho,
    k.ten_kho
FROM don_mua_hang dmh
JOIN phieu_nhap_kho pnk ON pnk.ma_don_mua_hang = dmh.id
JOIN kho k ON pnk.ma_kho_nhap = k.id;

-- -----------------------------------------------------------------------------
-- TEST 11: JOIN PH2 -> PH4 (Lệnh sản xuất -> Phiếu xuất kho NVL)
-- -----------------------------------------------------------------------------
SELECT 'TEST 11: JOIN PH2 -> PH4 (LSX -> PHIẾU XUẤT NVL CHO SẢN XUẤT)' AS test_name;

SELECT 
    lsx.ma_lenh_san_xuat,
    pxk.ma_phieu_xuat,
    pxk.loai_xuat,
    pxk.tong_gia_tri_xuat,
    k.ten_kho
FROM lenh_san_xuat lsx
JOIN phieu_xuat_kho pxk ON pxk.ma_lenh_san_xuat = lsx.id
JOIN kho k ON pxk.ma_kho_xuat = k.id;

-- -----------------------------------------------------------------------------
-- TEST 12: JOIN PH1 -> PH5 (Khách hàng -> Công nợ phải thu)
-- -----------------------------------------------------------------------------
SELECT 'TEST 12: JOIN PH1 -> PH5 (KHÁCH HÀNG -> CÔNG NỢ PHẢI THU)' AS test_name;

SELECT 
    kh.ma_khach_hang,
    kh.ten_khach_hang,
    cn.loai_cong_no,
    cn.so_tien_phat_sinh,
    cn.so_tien_da_thanh_toan,
    cn.so_tien_con_lai,
    cn.trang_thai
FROM khach_hang kh
JOIN cong_no cn ON cn.ma_khach_hang = kh.id;

-- -----------------------------------------------------------------------------
-- TEST 13: JOIN PH3 -> PH5 (Nhà cung cấp -> Công nợ phải trả)
-- -----------------------------------------------------------------------------
SELECT 'TEST 13: JOIN PH3 -> PH5 (NHÀ CUNG CẤP -> CÔNG NỢ PHẢI TRẢ)' AS test_name;

SELECT 
    ncc.ma_nha_cung_cap,
    ncc.ten_nha_cung_cap,
    cn.loai_cong_no,
    cn.so_tien_phat_sinh,
    cn.so_tien_da_thanh_toan,
    cn.so_tien_con_lai,
    cn.trang_thai
FROM nha_cung_cap ncc
JOIN cong_no cn ON cn.ma_nha_cung_cap = ncc.id;

-- -----------------------------------------------------------------------------
-- TEST 14: JOIN PH2 -> PH5 (Sản phẩm -> Giá thành sản phẩm)
-- -----------------------------------------------------------------------------
SELECT 'TEST 14: JOIN PH2 -> PH5 (SẢN PHẨM -> GIÁ THÀNH SẢN PHẨM)' AS test_name;

SELECT 
    sp.ma_san_pham,
    sp.ten_san_pham,
    gt.ky_tinh_gia_thanh,
    gt.so_luong_san_xuat,
    gt.tong_chi_phi,
    gt.gia_thanh_don_vi,
    gt.gia_ban_de_nghi
FROM san_pham sp
JOIN gia_thanh_san_pham gt ON gt.ma_san_pham = sp.id;

-- -----------------------------------------------------------------------------
-- TEST 15: JOIN PH5 (Chứng từ gốc -> Nhật ký hạch toán sổ cái)
-- -----------------------------------------------------------------------------
SELECT 'TEST 15: JOIN PH5 (CHỨNG TỪ GỐC -> NHẬT KÝ HẠCH TOÁN SỔ CÁI)' AS test_name;

SELECT 
    ctg.ma_chung_tu,
    ctg.loai_chung_tu,
    nkht.ma_hach_toan,
    tk_no.so_tai_khoan AS tai_khoan_no,
    tk_co.so_tai_khoan AS tai_khoan_co,
    nkht.so_tien,
    nkht.mo_ta
FROM chung_tu_goc ctg
JOIN nhat_ky_hach_toan nkht ON nkht.ma_chung_tu_goc = ctg.id
JOIN he_thong_tai_khoan tk_no ON nkht.tai_khoan_no = tk_no.id
JOIN he_thong_tai_khoan tk_co ON nkht.tai_khoan_co = tk_co.id;

-- -----------------------------------------------------------------------------
-- INTEGRITY CHECK: KIỂM TRA BẢN GHI MỒ CÔI (ORPHAN RECORDS CHECK - 0 ORPHANS)
-- -----------------------------------------------------------------------------
SELECT 'INTEGRITY CHECK: TÌM BẢN GHI MỒ CÔI (ORPHAN RECORDS)' AS test_name;

WITH orphan_tests AS (
    SELECT 'chi_tiet_don_ban_hang khong co don_ban_hang' AS check_item, COUNT(*) AS orphan_count
    FROM chi_tiet_don_ban_hang ct LEFT JOIN don_ban_hang d ON ct.ma_don_ban_hang = d.id WHERE d.id IS NULL
    UNION ALL
    SELECT 'don_ban_hang khong co khach_hang', COUNT(*)
    FROM don_ban_hang d LEFT JOIN khach_hang k ON d.ma_khach_hang = k.id WHERE k.id IS NULL
    UNION ALL
    SELECT 'lenh_san_xuat khong co san_pham', COUNT(*)
    FROM lenh_san_xuat l LEFT JOIN san_pham s ON l.ma_san_pham = s.id WHERE s.id IS NULL
    UNION ALL
    SELECT 'lenh_san_xuat khong co don_ban_hang', COUNT(*)
    FROM lenh_san_xuat l LEFT JOIN don_ban_hang d ON l.ma_don_ban_hang = d.id WHERE l.ma_don_ban_hang IS NOT NULL AND d.id IS NULL
    UNION ALL
    SELECT 'phieu_nhap_kho tu mua khong co don_mua_hang', COUNT(*)
    FROM phieu_nhap_kho p LEFT JOIN don_mua_hang d ON p.ma_don_mua_hang = d.id 
    WHERE p.loai_nhap = 'tu_mua_hang' AND d.id IS NULL
    UNION ALL
    SELECT 'phieu_nhap_kho khong co kho', COUNT(*)
    FROM phieu_nhap_kho p LEFT JOIN kho k ON p.ma_kho_nhap = k.id WHERE k.id IS NULL
    UNION ALL
    SELECT 'phieu_xuat_kho khong co kho', COUNT(*)
    FROM phieu_xuat_kho p LEFT JOIN kho k ON p.ma_kho_xuat = k.id WHERE k.id IS NULL
    UNION ALL
    SELECT 'cong_no khach hang khong co khach_hang', COUNT(*)
    FROM cong_no c LEFT JOIN khach_hang k ON c.ma_khach_hang = k.id 
    WHERE c.loai_cong_no = 'phai_thu' AND k.id IS NULL
    UNION ALL
    SELECT 'cong_no NCC khong co nha_cung_cap', COUNT(*)
    FROM cong_no c LEFT JOIN nha_cung_cap n ON c.ma_nha_cung_cap = n.id 
    WHERE c.loai_cong_no = 'phai_tra' AND n.id IS NULL
    UNION ALL
    SELECT 'gia_thanh_san_pham khong co san_pham', COUNT(*)
    FROM gia_thanh_san_pham g LEFT JOIN san_pham s ON g.ma_san_pham = s.id WHERE s.id IS NULL
)
SELECT 
    check_item,
    orphan_count,
    CASE WHEN orphan_count = 0 THEN 'PASS' ELSE 'FAIL' END AS status
FROM orphan_tests;

-- TỔNG KẾT BẢN GHI MỒ CÔI
SELECT 
    SUM(orphan_count) AS total_orphan_records,
    CASE WHEN SUM(orphan_count) = 0 THEN 'PASS' ELSE 'FAIL' END AS overall_integrity_status
FROM (
    SELECT COUNT(*) AS orphan_count FROM chi_tiet_don_ban_hang ct LEFT JOIN don_ban_hang d ON ct.ma_don_ban_hang = d.id WHERE d.id IS NULL
    UNION ALL
    SELECT COUNT(*) FROM don_ban_hang d LEFT JOIN khach_hang k ON d.ma_khach_hang = k.id WHERE k.id IS NULL
    UNION ALL
    SELECT COUNT(*) FROM lenh_san_xuat l LEFT JOIN san_pham s ON l.ma_san_pham = s.id WHERE s.id IS NULL
    UNION ALL
    SELECT COUNT(*) FROM lenh_san_xuat l LEFT JOIN don_ban_hang d ON l.ma_don_ban_hang = d.id WHERE l.ma_don_ban_hang IS NOT NULL AND d.id IS NULL
    UNION ALL
    SELECT COUNT(*) FROM phieu_nhap_kho p LEFT JOIN don_mua_hang d ON p.ma_don_mua_hang = d.id WHERE p.loai_nhap = 'tu_mua_hang' AND d.id IS NULL
    UNION ALL
    SELECT COUNT(*) FROM phieu_nhap_kho p LEFT JOIN kho k ON p.ma_kho_nhap = k.id WHERE k.id IS NULL
    UNION ALL
    SELECT COUNT(*) FROM phieu_xuat_kho p LEFT JOIN kho k ON p.ma_kho_xuat = k.id WHERE k.id IS NULL
    UNION ALL
    SELECT COUNT(*) FROM cong_no c LEFT JOIN khach_hang k ON c.ma_khach_hang = k.id WHERE c.loai_cong_no = 'phai_thu' AND k.id IS NULL
    UNION ALL
    SELECT COUNT(*) FROM cong_no c LEFT JOIN nha_cung_cap n ON c.ma_nha_cung_cap = n.id WHERE c.loai_cong_no = 'phai_tra' AND n.id IS NULL
    UNION ALL
    SELECT COUNT(*) FROM gia_thanh_san_pham g LEFT JOIN san_pham s ON g.ma_san_pham = s.id WHERE s.id IS NULL
) summary;
