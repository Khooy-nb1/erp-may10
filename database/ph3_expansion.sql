-- =============================================================================
-- ERP MAY 10 — BỔ SUNG CƠ SỞ DỮ LIỆU PHÂN HỆ 3 (MUA HÀNG & NHÀ CUNG CẤP)
-- Hạng mục: PR (Yêu cầu mua sắm), RFQ (Yêu cầu báo giá), So sánh NCC, Kiểm nghiệm
-- =============================================================================

-- 1. Bổ sung thông tin ngân hàng & pháp lý cho nha_cung_cap
ALTER TABLE nha_cung_cap ADD COLUMN IF NOT EXISTS so_tai_khoan_ngan_hang VARCHAR(50);
ALTER TABLE nha_cung_cap ADD COLUMN IF NOT EXISTS ten_ngan_hang VARCHAR(150);
ALTER TABLE nha_cung_cap ADD COLUMN IF NOT EXISTS chi_nhanh_ngan_hang VARCHAR(200);
ALTER TABLE nha_cung_cap ADD COLUMN IF NOT EXISTS so_gpkd VARCHAR(50);

-- 2. Bảng Yêu cầu báo giá (Request for Quotation - RFQ)
CREATE TABLE IF NOT EXISTS yeu_cau_bao_gia (
    id BIGSERIAL PRIMARY KEY,
    ma_rfq VARCHAR(50) UNIQUE NOT NULL,
    ma_yeu_cau_mua_hang BIGINT REFERENCES yeu_cau_mua_hang(id),
    tieu_de VARCHAR(200) NOT NULL,
    ngay_gui TIMESTAMPTZ DEFAULT NOW(),
    han_bao_gia TIMESTAMPTZ NOT NULL,
    dieu_khoan_thuong_mai TEXT,
    ghi_chu TEXT,
    trang_thai VARCHAR(20) DEFAULT 'dang_mo', -- dang_mo, da_chot, huy
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id),
    nguoi_cap_nhat BIGINT REFERENCES nguoi_dung(id)
);

-- 3. Bảng Chi tiết báo giá của Nhà cung cấp (Vendor Quotations)
CREATE TABLE IF NOT EXISTS chi_tiet_bao_gia_ncc (
    id BIGSERIAL PRIMARY KEY,
    ma_rfq BIGINT NOT NULL REFERENCES yeu_cau_bao_gia(id) ON DELETE CASCADE,
    ma_nha_cung_cap BIGINT NOT NULL REFERENCES nha_cung_cap(id),
    ma_vat_tu BIGINT NOT NULL REFERENCES vat_tu(id),
    so_luong_chao NUMERIC(18,3) NOT NULL CHECK (so_luong_chao > 0),
    don_gia_chao NUMERIC(18,2) NOT NULL CHECK (don_gia_chao >= 0),
    thoi_gian_giao_hang_ngay INTEGER DEFAULT 7 CHECK (thoi_gian_giao_hang_ngay >= 0),
    dieu_kien_thanh_toan TEXT,
    ghi_chu TEXT,
    da_chon BOOLEAN DEFAULT FALSE,
    ly_do_chon TEXT,
    ngay_tao TIMESTAMPTZ DEFAULT NOW(),
    nguoi_tao BIGINT REFERENCES nguoi_dung(id)
);

-- 4. Bổ sung trường kiểm định chất lượng vào chi_tiet_don_mua
ALTER TABLE chi_tiet_don_mua ADD COLUMN IF NOT EXISTS so_luong_loi_hong NUMERIC(18,3) DEFAULT 0;
ALTER TABLE chi_tiet_don_mua ADD COLUMN IF NOT EXISTS ghi_chu_kiem_dinh TEXT;
