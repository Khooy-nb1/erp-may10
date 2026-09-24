const db = require('../config/database');

// Báo cáo tồn kho tổng hợp
async function getBaoCaoTonKho(req, res, next) {
  try {
    const { ma_kho, loai_vat_tu, duoi_dinh_muc, search } = req.query;

    let query = `
      SELECT tk.id, tk.ma_kho, k.ma_kho AS ma_kho_code, k.ten_kho,
             tk.ma_vat_tu, vt.ma_vat_tu AS ma_vat_tu_code, vt.ten_vat_tu, vt.loai_vat_tu,
             dvt.ten_don_vi AS ten_dvt,
             tk.so_luong_ton,
             COALESCE(vt.muc_ton_toi_thieu, 0) AS dinh_muc_ton_toi_thieu,
             tk.gia_tri_ton_kho,
             CASE 
               WHEN tk.so_luong_ton <= 0 THEN 'het_hang'
               WHEN tk.so_luong_ton <= COALESCE(vt.muc_ton_toi_thieu, 0) THEN 'canh_bao_thap'
               ELSE 'an_toan'
             END AS trang_thai_ton,
             tk.ngay_cap_nhat,
             nd.ho_ten AS nguoi_cap_nhat_ten
      FROM ton_kho tk
      JOIN kho k ON tk.ma_kho = k.id
      JOIN vat_tu vt ON tk.ma_vat_tu = vt.id
      LEFT JOIN don_vi_tinh dvt ON tk.don_vi_tinh = dvt.id
      LEFT JOIN nguoi_dung nd ON tk.nguoi_cap_nhat = nd.id
      WHERE 1=1
    `;
    const params = [];

    if (ma_kho) {
      params.push(ma_kho);
      query += ` AND tk.ma_kho = $${params.length}`;
    }

    if (loai_vat_tu) {
      params.push(loai_vat_tu);
      query += ` AND vt.loai_vat_tu = $${params.length}`;
    }

    if (duoi_dinh_muc === 'true') {
      query += ` AND tk.so_luong_ton <= COALESCE(vt.muc_ton_toi_thieu, 0)`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (vt.ten_vat_tu ILIKE $${params.length} OR vt.ma_vat_tu ILIKE $${params.length} OR k.ten_kho ILIKE $${params.length})`;
    }

    query += ` ORDER BY k.id ASC, tk.so_luong_ton ASC`;

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// Thẻ kho: Tra cứu lịch sử nhập xuất của một vật tư tại một kho
async function getTheKho(req, res, next) {
  try {
    const { ma_kho, ma_vat_tu } = req.query;

    if (!ma_kho || !ma_vat_tu) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Vui lòng cung cấp ma_kho và ma_vat_tu để tra cứu thẻ kho.',
      });
    }

    // Lấy thông tin kho và vật tư
    const [infoRes, tonRes] = await Promise.all([
      db.query(
        `SELECT k.ten_kho, vt.ten_vat_tu, vt.ma_vat_tu, dvt.ten_don_vi AS ten_dvt
         FROM kho k, vat_tu vt
         LEFT JOIN don_vi_tinh dvt ON vt.ma_don_vi_tinh = dvt.id
         WHERE k.id = $1 AND vt.id = $2`,
        [ma_kho, ma_vat_tu]
      ),
      db.query(`SELECT so_luong_ton, gia_tri_ton_kho FROM ton_kho WHERE ma_kho = $1 AND ma_vat_tu = $2`, [
        ma_kho,
        ma_vat_tu,
      ]),
    ]);

    // Lấy tất cả biến động Nhập kho
    const nhapQuery = `
      SELECT pnk.ngay_nhap AS thoi_gian,
             pnk.ma_phieu_nhap AS ma_chung_tu,
             'nhap_kho' AS loai_bien_dong,
             pnk.loai_nhap AS dien_giai,
             ct.so_luong_nhap AS so_luong,
             ct.don_gia_nhap AS don_gia,
             ct.thanh_tien,
             l.ma_lo,
             vtk.ma_vi_tri
      FROM chi_tiet_phieu_nhap ct
      JOIN phieu_nhap_kho pnk ON ct.ma_phieu_nhap_kho = pnk.id
      LEFT JOIN lo_vat_tu l ON ct.ma_lo_vat_tu = l.id
      LEFT JOIN vi_tri_kho vtk ON ct.ma_vi_tri_kho = vtk.id
      WHERE pnk.ma_kho_nhap = $1 AND ct.ma_vat_tu = $2 AND pnk.trang_thai = 'da_nhap'
    `;

    // Lấy tất cả biến động Xuất kho
    const xuatQuery = `
      SELECT pxk.ngay_xuat AS thoi_gian,
             pxk.ma_phieu_xuat AS ma_chung_tu,
             'xuat_kho' AS loai_bien_dong,
             pxk.loai_xuat AS dien_giai,
             ct.so_luong_xuat AS so_luong,
             ct.don_gia_xuat AS don_gia,
             ct.thanh_tien,
             l.ma_lo,
             NULL AS ma_vi_tri
      FROM chi_tiet_phieu_xuat ct
      JOIN phieu_xuat_kho pxk ON ct.ma_phieu_xuat_kho = pxk.id
      LEFT JOIN lo_vat_tu l ON ct.ma_lo_vat_tu = l.id
      WHERE pxk.ma_kho_xuat = $1 AND ct.ma_vat_tu = $2 AND pxk.trang_thai = 'da_xuat'
    `;

    const [nhapRes, xuatRes] = await Promise.all([
      db.query(nhapQuery, [ma_kho, ma_vat_tu]),
      db.query(xuatQuery, [ma_kho, ma_vat_tu]),
    ]);

    // Hợp nhất và sắp xếp theo thời gian tăng dần
    const transactions = [...nhapRes.rows, ...xuatRes.rows].sort(
      (a, b) => new Date(a.thoi_gian).getTime() - new Date(b.thoi_gian).getTime()
    );

    res.json({
      success: true,
      data: {
        thongTinChung: infoRes.rows[0] || {},
        tonHienTai: tonRes.rows[0] || { so_luong_ton: 0, gia_tri_ton_kho: 0 },
        nhatKyBienDong: transactions,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Thống kê Dashboard cho module PH4
async function getDashboardStats(req, res, next) {
  try {
    const [
      tongVatTuRes,
      tongGiaTriRes,
      canhBaoRes,
      nhapThangRes,
      xuatThangRes,
      topTonRes,
      phanBoKhoRes,
    ] = await Promise.all([
      db.query(`SELECT COUNT(*) AS total_items FROM ton_kho WHERE so_luong_ton > 0`),
      db.query(`SELECT COALESCE(SUM(gia_tri_ton_kho), 0) AS total_val FROM ton_kho`),
      db.query(`
        SELECT COUNT(*) AS low_stock 
        FROM ton_kho tk
        JOIN vat_tu vt ON tk.ma_vat_tu = vt.id
        WHERE tk.so_luong_ton <= COALESCE(vt.muc_ton_toi_thieu, 0)
      `),
      db.query(`
        SELECT COUNT(*) AS count, COALESCE(SUM(tong_gia_tri_nhap), 0) AS total_val
        FROM phieu_nhap_kho
        WHERE ngay_nhap >= DATE_TRUNC('month', CURRENT_DATE) AND trang_thai = 'da_nhap'
      `),
      db.query(`
        SELECT COUNT(*) AS count, COALESCE(SUM(tong_gia_tri_xuat), 0) AS total_val
        FROM phieu_xuat_kho
        WHERE ngay_xuat >= DATE_TRUNC('month', CURRENT_DATE) AND trang_thai = 'da_xuat'
      `),
      db.query(`
        SELECT vt.ten_vat_tu, vt.ma_vat_tu, dvt.ten_don_vi AS ten_dvt, SUM(tk.so_luong_ton) AS tong_ton, SUM(tk.gia_tri_ton_kho) AS tong_gia_tri
        FROM ton_kho tk
        JOIN vat_tu vt ON tk.ma_vat_tu = vt.id
        LEFT JOIN don_vi_tinh dvt ON tk.don_vi_tinh = dvt.id
        GROUP BY vt.ten_vat_tu, vt.ma_vat_tu, dvt.ten_don_vi
        ORDER BY tong_gia_tri DESC
        LIMIT 5
      `),
      db.query(`
        SELECT k.ten_kho, COUNT(tk.id) AS so_loai_vt, COALESCE(SUM(tk.gia_tri_ton_kho), 0) AS gia_tri_kho
        FROM kho k
        LEFT JOIN ton_kho tk ON k.id = tk.ma_kho
        GROUP BY k.id, k.ten_kho
        ORDER BY gia_tri_kho DESC
      `),
    ]);

    res.json({
      success: true,
      data: {
        tongSoMatHangTon: parseInt(tongVatTuRes.rows[0].total_items, 10),
        tongGiaTriTonKho: parseFloat(tongGiaTriRes.rows[0].total_val),
        soMatHangCanhBao: parseInt(canhBaoRes.rows[0].low_stock, 10),
        phieuNhapTrongThang: {
          soLuong: parseInt(nhapThangRes.rows[0].count, 10),
          giaTri: parseFloat(nhapThangRes.rows[0].total_val),
        },
        phieuXuatTrongThang: {
          soLuong: parseInt(xuatThangRes.rows[0].count, 10),
          giaTri: parseFloat(xuatThangRes.rows[0].total_val),
        },
        topVatTuGiaTriCao: topTonRes.rows,
        phanBoTheoKho: phanBoKhoRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBaoCaoTonKho,
  getTheKho,
  getDashboardStats,
};
