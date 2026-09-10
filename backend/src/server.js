const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const db = require('./config/database');

async function ensureDatabase() {
  try {
    await db.query('SELECT 1');
    console.log('✅ Đã kết nối thành công tới PostgreSQL cơ sở dữ liệu erp_may10.');
  } catch (err) {
    console.log('ℹ️  PostgreSQL không khả dụng trên localhost:5432. Tự động khởi tạo môi trường in-memory pg-mem erp_may10...');
    const { newDb } = require('pg-mem');
    const memDb = newDb();

    memDb.public.registerFunction({
      name: 'now',
      returns: memDb.public.getType('timestamp with time zone') || memDb.public.getType('timestamp'),
      implementation: () => new Date(),
    });

    memDb.public.registerFunction({
      name: 'to_char',
      args: [memDb.public.getType('timestamp with time zone') || memDb.public.getType('timestamp'), memDb.public.getType('text')],
      returns: memDb.public.getType('text'),
      implementation: (d, fmt) => {
        const date = new Date(d);
        if (isNaN(date.getTime())) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        if (fmt === 'YYYY-MM') return `${y}-${m}`;
        if (fmt === 'YYYY-MM-DD') return `${y}-${m}-${day}`;
        return `${y}-${m}`;
      },
    });

    const { Pool } = memDb.adapters.createPg();
    const memPool = new Pool();

    db.pool = memPool;
    db.query = (text, params) => memPool.query(text, params);
    db.getClient = () => memPool.connect();

    await memPool.query(`
      CREATE TABLE IF NOT EXISTS nguoi_dung (
        id SERIAL PRIMARY KEY,
        ho_ten VARCHAR(150) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        mat_khau VARCHAR(255) NOT NULL,
        so_dien_thoai VARCHAR(20),
        vai_tro VARCHAR(50) NOT NULL,
        phong_ban VARCHAR(100),
        trang_thai VARCHAR(20) DEFAULT 'hoat_dong',
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT,
        nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS don_vi_tinh (
        id SERIAL PRIMARY KEY,
        ma_don_vi VARCHAR(20) UNIQUE NOT NULL,
        ten_don_vi VARCHAR(100) NOT NULL,
        ghi_chu TEXT,
        trang_thai VARCHAR(20) DEFAULT 'hoat_dong',
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT
      );

      CREATE TABLE IF NOT EXISTS kho (
        id SERIAL PRIMARY KEY,
        ma_kho VARCHAR(50) UNIQUE NOT NULL,
        ten_kho VARCHAR(200) NOT NULL,
        dia_chi TEXT,
        dien_tich NUMERIC(18,3),
        suc_chua NUMERIC(18,3),
        loai_kho VARCHAR(50) NOT NULL,
        nguoi_quan_ly BIGINT,
        trang_thai VARCHAR(20) DEFAULT 'hoat_dong',
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT,
        nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS ton_kho (
        id SERIAL PRIMARY KEY,
        ma_vat_tu BIGINT NOT NULL,
        ma_kho BIGINT NOT NULL,
        so_luong_ton NUMERIC(18,3) DEFAULT 0,
        vi_tri_kho VARCHAR(100),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS nha_cung_cap (
        id SERIAL PRIMARY KEY,
        ma_nha_cung_cap VARCHAR(50) UNIQUE NOT NULL,
        ten_nha_cung_cap VARCHAR(200) NOT NULL,
        ma_so_thue VARCHAR(20),
        so_gpkd VARCHAR(50),
        dia_chi TEXT NOT NULL,
        quoc_gia VARCHAR(100) DEFAULT 'Viet Nam',
        nguoi_lien_he VARCHAR(150) NOT NULL,
        so_dien_thoai VARCHAR(20) NOT NULL,
        email VARCHAR(100) NOT NULL,
        so_tai_khoan_ngan_hang VARCHAR(50),
        ten_ngan_hang VARCHAR(100),
        chi_nhanh_ngan_hang VARCHAR(150),
        loai_hang_cung_cap TEXT,
        han_muc_tin_dung NUMERIC(18,2) DEFAULT 0,
        so_ngay_gia_han INTEGER DEFAULT 30,
        diem_danh_gia NUMERIC(3,1) DEFAULT 0,
        trang_thai VARCHAR(20) DEFAULT 'hoat_dong',
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT,
        nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS vat_tu (
        id SERIAL PRIMARY KEY,
        ma_vat_tu VARCHAR(50) UNIQUE NOT NULL,
        ten_vat_tu VARCHAR(200) NOT NULL,
        loai_vat_tu VARCHAR(50) NOT NULL,
        ma_don_vi_tinh BIGINT,
        quy_cach VARCHAR(100),
        muc_ton_toi_thieu NUMERIC(18,3) DEFAULT 0,
        muc_ton_toi_da NUMERIC(18,3),
        gia_nhap_trung_binh NUMERIC(18,2) DEFAULT 0,
        nha_cung_cap_chinh BIGINT,
        trang_thai VARCHAR(20) DEFAULT 'dang_su_dung',
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT,
        nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS yeu_cau_mua_hang (
        id SERIAL PRIMARY KEY,
        ma_yeu_cau_mua VARCHAR(50) UNIQUE NOT NULL,
        nguon_yeu_cau VARCHAR(50) NOT NULL,
        ma_nhu_cau_npl BIGINT,
        ngay_yeu_cau TIMESTAMPTZ NOT NULL,
        nguoi_yeu_cau BIGINT,
        nguoi_phe_duyet BIGINT,
        ngay_phe_duyet TIMESTAMPTZ,
        ghi_chu TEXT,
        trang_thai VARCHAR(20) DEFAULT 'cho_duyet',
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT,
        nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS chi_tiet_yeu_cau_mua (
        id SERIAL PRIMARY KEY,
        ma_yeu_cau_mua_hang BIGINT NOT NULL,
        ma_vat_tu BIGINT NOT NULL,
        so_luong_yeu_cau NUMERIC(18,3) NOT NULL,
        don_gia_du_kien NUMERIC(18,2),
        ngay_can_giao TIMESTAMPTZ NOT NULL,
        ma_kho_nhap BIGINT,
        ghi_chu TEXT,
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT
      );

      CREATE TABLE IF NOT EXISTS yeu_cau_bao_gia (
        id SERIAL PRIMARY KEY,
        ma_rfq VARCHAR(50) UNIQUE NOT NULL,
        ma_yeu_cau_mua_hang BIGINT,
        tieu_de VARCHAR(200) NOT NULL,
        ngay_gui TIMESTAMPTZ DEFAULT NOW(),
        han_bao_gia TIMESTAMPTZ NOT NULL,
        dieu_khoan_thuong_mai TEXT,
        ghi_chu TEXT,
        trang_thai VARCHAR(20) DEFAULT 'dang_mo',
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT,
        nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS chi_tiet_bao_gia_ncc (
        id SERIAL PRIMARY KEY,
        ma_rfq BIGINT NOT NULL,
        ma_nha_cung_cap BIGINT NOT NULL,
        ma_vat_tu BIGINT NOT NULL,
        so_luong_chao NUMERIC(18,3) NOT NULL,
        don_gia_chao NUMERIC(18,2) NOT NULL,
        thoi_gian_giao_hang_ngay INTEGER DEFAULT 7,
        dieu_kien_thanh_toan TEXT,
        ghi_chu TEXT,
        da_chon BOOLEAN DEFAULT FALSE,
        ly_do_chon TEXT,
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT
      );

      CREATE TABLE IF NOT EXISTS don_mua_hang (
        id SERIAL PRIMARY KEY,
        ma_don_mua VARCHAR(50) UNIQUE NOT NULL,
        ma_nha_cung_cap BIGINT NOT NULL,
        ma_yeu_cau_mua_hang BIGINT,
        ngay_dat_hang TIMESTAMPTZ NOT NULL,
        ngay_giao_hang_yc TIMESTAMPTZ NOT NULL,
        tong_tien_hang NUMERIC(18,2) NOT NULL,
        tien_thue NUMERIC(18,2) DEFAULT 0,
        tong_thanh_toan NUMERIC(18,2) NOT NULL,
        dieu_kien_thanh_toan TEXT,
        nguoi_dat_hang BIGINT,
        ghi_chu TEXT,
        trang_thai VARCHAR(20) DEFAULT 'cho_duyet',
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT,
        nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS chi_tiet_don_mua (
        id SERIAL PRIMARY KEY,
        ma_don_mua_hang BIGINT NOT NULL,
        ma_vat_tu BIGINT NOT NULL,
        so_luong_dat NUMERIC(18,3) NOT NULL,
        don_gia NUMERIC(18,2) NOT NULL,
        thanh_tien NUMERIC(18,2) NOT NULL,
        so_luong_da_nhap NUMERIC(18,3) DEFAULT 0,
        so_luong_loi_hong NUMERIC(18,3) DEFAULT 0,
        ghi_chu_kiem_dinh TEXT,
        ghi_chu TEXT,
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT,
        nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS phieu_nhap_kho (
        id SERIAL PRIMARY KEY,
        ma_phieu_nhap VARCHAR(50) UNIQUE NOT NULL,
        loai_nhap VARCHAR(50) NOT NULL,
        ma_don_mua_hang BIGINT,
        ma_lenh_san_xuat BIGINT,
        ma_kho_nhap BIGINT NOT NULL,
        ngay_nhap TIMESTAMPTZ NOT NULL,
        thu_kho BIGINT,
        nguoi_giao_hang VARCHAR(150),
        tong_gia_tri_nhap NUMERIC(18,2) DEFAULT 0,
        ghi_chu TEXT,
        trang_thai VARCHAR(20) DEFAULT 'da_nhap',
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT,
        nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS danh_gia_ncc (
        id SERIAL PRIMARY KEY,
        ma_nha_cung_cap BIGINT NOT NULL,
        ky_danh_gia VARCHAR(20) NOT NULL,
        diem_chat_luong NUMERIC(3,1),
        diem_giao_hang NUMERIC(3,1),
        diem_gia_ca NUMERIC(3,1),
        diem_tong_hop NUMERIC(3,1),
        nhan_xet TEXT,
        nguoi_danh_gia BIGINT,
        ngay_danh_gia TIMESTAMPTZ NOT NULL,
        ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT
      );
    `);

    // Insert Seed Data
    await memPool.query(`
      INSERT INTO nguoi_dung (id, ho_ten, email, mat_khau, vai_tro, phong_ban, trang_thai) VALUES
      (1, 'Quản Trị Viên Hệ Thống', 'admin@may10.vn', 'hash', 'admin', 'CNTT', 'hoat_dong'),
      (2, 'Nguyễn Văn Bán', 'banhang@may10.vn', 'hash', 'ban_hang', 'Kinh Doanh', 'hoat_dong'),
      (3, 'Trần Văn Xuất', 'sanxuat@may10.vn', 'hash', 'san_xuat', 'Kỹ Thuật', 'hoat_dong'),
      (4, 'Lê Thị Mua', 'muahang@may10.vn', 'hash', 'mua_hang', 'Cung Ứng', 'hoat_dong'),
      (5, 'Phạm Văn Kho', 'kho@may10.vn', 'hash', 'kho', 'Kho Vận', 'hoat_dong'),
      (6, 'Hoàng Thị Toán', 'ketoan@may10.vn', 'hash', 'ke_toan', 'Kế Toán', 'hoat_dong');

      INSERT INTO don_vi_tinh (id, ma_don_vi, ten_don_vi) VALUES
      (1, 'cai', 'Cái'),
      (2, 'met', 'Mét'),
      (3, 'cuon', 'Cuộn');

      INSERT INTO kho (id, ma_kho, ten_kho, loai_kho) VALUES
      (1, 'KNL01', 'Kho Nguyên Phụ Liệu Số 1', 'nguyen_lieu'),
      (2, 'KTP01', 'Kho Thành Phẩm', 'thanh_pham');

      INSERT INTO nha_cung_cap (id, ma_nha_cung_cap, ten_nha_cung_cap, ma_so_thue, so_gpkd, dia_chi, nguoi_lien_he, so_dien_thoai, email, so_tai_khoan_ngan_hang, ten_ngan_hang, chi_nhanh_ngan_hang, loai_hang_cung_cap, han_muc_tin_dung, so_ngay_gia_han, diem_danh_gia, trang_thai) VALUES
      (1, 'NCC001', 'Công Ty Cổ Phần Dệt May Phong Phú', '0301456789', '0301456789-GP', 'Khu CN Phong Phú, TP. Thủ Đức', 'Đỗ Mạnh Cường', '0283896012', 'sales@phongphu.com.vn', '190382910283', 'Techcombank', 'CN Sài Gòn', 'Vải dệt thoi, vải kate', 2000000000.00, 45, 9.2, 'hoat_dong'),
      (2, 'NCC002', 'Công Ty TNHH Phụ Liệu May Thăng Long', '0105678901', '0105678901-GP', 'Cụm CN Duyên Thái, Thường Tín', 'Trịnh Thị Mai', '0243867123', 'contact@thanglongacc.vn', '001100456789', 'Vietcombank', 'CN Hoàn Kiếm', 'Chỉ may, cúc áo', 500000000.00, 30, 8.8, 'hoat_dong'),
      (3, 'NCC003', 'Công Ty TNHH Sợi Dệt Bảo Minh', '0108912345', '0108912345-GP', 'KCN Bảo Minh, Vụ Bản, Nam Định', 'Nguyễn Tiến Dũng', '0228389100', 'info@baominhtextile.vn', '112000123456', 'VietinBank', 'CN Nam Định', 'Bông cotton, sợi dệt', 1500000000.00, 60, 9.0, 'hoat_dong');

      INSERT INTO vat_tu (id, ma_vat_tu, ten_vat_tu, loai_vat_tu, ma_don_vi_tinh, quy_cach, muc_ton_toi_thieu, gia_nhap_trung_binh, nha_cung_cap_chinh, trang_thai) VALUES
      (1, 'VT-VAI-KATE-01', 'Vải Kate Lụa Trắng Khổ 1.5m', 'vai_chinh', 2, 'Khổ 1.5m', 500.000, 65000.00, 1, 'dang_su_dung'),
      (2, 'VT-CHI-MAY-02', 'Chỉ May Poly 40/2 Trắng', 'chi_may', 3, 'Cuộn 5000m', 50.000, 28000.00, 2, 'dang_su_dung'),
      (3, 'VT-CUC-AO-03', 'Cúc Áo Nhựa 4 Lỗ 18L Trắng Trong', 'phu_lieu', 1, 'Túi 1000 cái', 1000.000, 120.00, 2, 'dang_su_dung');

      INSERT INTO yeu_cau_mua_hang (id, ma_yeu_cau_mua, nguon_yeu_cau, ngay_yeu_cau, nguoi_yeu_cau, ghi_chu, trang_thai) VALUES
      (1, 'PR-2026-0001', 'san_xuat', NOW() - INTERVAL '2 days', 3, 'Vải may áo sơ mi nam xuất khẩu đợt 1', 'cho_duyet');

      INSERT INTO chi_tiet_yeu_cau_mua (ma_yeu_cau_mua_hang, ma_vat_tu, so_luong_yeu_cau, don_gia_du_kien, ngay_can_giao, ma_kho_nhap, ghi_chu) VALUES
      (1, 1, 1000, 65000, NOW() + INTERVAL '7 days', 1, 'Vải chất lượng cao');

      INSERT INTO don_mua_hang (id, ma_don_mua, ma_nha_cung_cap, ngay_dat_hang, ngay_giao_hang_yc, tong_tien_hang, tien_thue, tong_thanh_toan, dieu_kien_thanh_toan, nguoi_dat_hang, ghi_chu, trang_thai) VALUES
      (1, 'DMH-20260908-1001', 1, NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', 65000000, 5200000, 70200000, 'Chuyển khoản 30 ngày', 4, 'Đơn vải kate sơ mi hè', 'da_gui_ncc'),
      (2, 'DMH-20260909-1002', 2, NOW() - INTERVAL '2 days', NOW() + INTERVAL '3 days', 14000000, 1120000, 15120000, 'Chuyển khoản 45 ngày', 4, 'Đơn chỉ may và phụ liệu', 'dang_giao');

      INSERT INTO chi_tiet_don_mua (ma_don_mua_hang, ma_vat_tu, so_luong_dat, don_gia, thanh_tien, so_luong_da_nhap, so_luong_loi_hong, ghi_chu) VALUES
      (1, 1, 1000, 65000, 65000000, 0, 0, 'Vải kate trắng lụa'),
      (2, 2, 500, 28000, 14000000, 200, 0, 'Chỉ may cuộn');
    `);
    console.log('✅ Đã nạp seed data thành công cho môi trường in-memory.');
  }
}

async function startServer() {
  await ensureDatabase();

  const app = require('./app');
  const PORT = process.env.PORT || 5000;

  const server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 ERP MAY 10 — HỆ THỐNG ĐÃ SẴN SÀNG`);
    console.log(`📡 Backend API:  http://localhost:${PORT}`);
    console.log(`🩺 Health check: http://localhost:${PORT}/api/v1/health`);
    console.log(`=======================================================`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
