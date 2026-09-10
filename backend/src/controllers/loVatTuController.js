const db = require('../config/database');

// Lấy danh sách lô vật tư / cây vải kèm tính toán hạn dùng (FIFO, cảnh báo)
async function getDanhSachLo(req, res, next) {
  try {
    const { ma_vat_tu, ma_kho, trang_thai, search } = req.query;
    let query = `
      SELECT l.id, l.ma_lo, l.ma_vat_tu, vt.ma_vat_tu AS ma_vat_tu_code, vt.ten_vat_tu,
             dvt.ten_don_vi AS ten_dvt,
             l.ma_nha_cung_cap, ncc.ten_nha_cung_cap AS ten_ncc,
             l.ma_don_mua_hang, dmh.ma_don_mua,
             l.ngay_san_xuat, l.han_su_dung,
             l.so_luong_nhap, l.so_luong_hien_tai, l.don_gia_nhap,
             l.ma_vi_tri_kho, vtk.ma_vi_tri, vtk.ten_vi_tri, k.ten_kho, k.id AS ma_kho,
             l.trang_thai, l.ngay_tao,
             CASE 
               WHEN l.han_su_dung IS NOT NULL AND l.han_su_dung < NOW() THEN 'qua_han'
               WHEN l.han_su_dung IS NOT NULL AND l.han_su_dung <= (NOW() + INTERVAL '30 days') THEN 'sap_het_han'
               ELSE 'con_han'
             END AS tinh_trang_han
      FROM lo_vat_tu l
      JOIN vat_tu vt ON l.ma_vat_tu = vt.id
      LEFT JOIN don_vi_tinh dvt ON vt.ma_don_vi_tinh = dvt.id
      LEFT JOIN nha_cung_cap ncc ON l.ma_nha_cung_cap = ncc.id
      LEFT JOIN don_mua_hang dmh ON l.ma_don_mua_hang = dmh.id
      LEFT JOIN vi_tri_kho vtk ON l.ma_vi_tri_kho = vtk.id
      LEFT JOIN kho k ON vtk.ma_kho = k.id
      WHERE 1=1
    `;
    const params = [];

    if (ma_vat_tu) {
      params.push(ma_vat_tu);
      query += ` AND l.ma_vat_tu = $${params.length}`;
    }

    if (ma_kho) {
      params.push(ma_kho);
      query += ` AND vtk.ma_kho = $${params.length}`;
    }

    if (trang_thai) {
      params.push(trang_thai);
      query += ` AND l.trang_thai = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (l.ma_lo ILIKE $${params.length} OR vt.ten_vat_tu ILIKE $${params.length} OR ncc.ten_nha_cung_cap ILIKE $${params.length})`;
    }

    // Sắp xếp ưu tiên hạn dùng sớm nhất (FEFO) hoặc ngày nhập sớm nhất (FIFO)
    query += ` ORDER BY l.han_su_dung ASC NULLS LAST, l.id ASC`;

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// Lấy chi tiết 1 lô
async function getChiTietLo(req, res, next) {
  try {
    const { id } = req.params;
    const query = `
      SELECT l.*, vt.ten_vat_tu, vt.ma_vat_tu AS ma_vat_tu_code, dvt.ten_don_vi AS ten_dvt,
             ncc.ten_nha_cung_cap AS ten_ncc, vtk.ma_vi_tri, vtk.ten_vi_tri, k.ten_kho
      FROM lo_vat_tu l
      JOIN vat_tu vt ON l.ma_vat_tu = vt.id
      LEFT JOIN don_vi_tinh dvt ON vt.ma_don_vi_tinh = dvt.id
      LEFT JOIN nha_cung_cap ncc ON l.ma_nha_cung_cap = ncc.id
      LEFT JOIN vi_tri_kho vtk ON l.ma_vi_tri_kho = vtk.id
      LEFT JOIN kho k ON vtk.ma_kho = k.id
      WHERE l.id = $1
    `;
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy lô vật tư với ID ${id}`,
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Tạo lô vật tư mới
async function createLoVatTu(req, res, next) {
  try {
    const {
      ma_lo,
      ma_vat_tu,
      ma_nha_cung_cap,
      ma_don_mua_hang,
      ngay_san_xuat,
      han_su_dung,
      so_luong_nhap,
      don_gia_nhap,
      ma_vi_tri_kho,
    } = req.body;
    const nguoiTao = req.user?.id || 1;

    if (!ma_lo || !ma_vat_tu || so_luong_nhap === undefined || don_gia_nhap === undefined) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Vui lòng cung cấp: ma_lo, ma_vat_tu, so_luong_nhap, don_gia_nhap.',
      });
    }

    const checkExist = await db.query(`SELECT id FROM lo_vat_tu WHERE ma_lo = $1`, [ma_lo]);
    if (checkExist.rows.length > 0) {
      return res.status(409).json({
        success: false,
        errorCode: 'ALREADY_EXISTS',
        message: `Mã lô [${ma_lo}] đã tồn tại.`,
      });
    }

    const result = await db.query(
      `INSERT INTO lo_vat_tu (
         ma_lo, ma_vat_tu, ma_nha_cung_cap, ma_don_mua_hang,
         ngay_san_xuat, han_su_dung, so_luong_nhap, so_luong_hien_tai,
         don_gia_nhap, ma_vi_tri_kho, trang_thai, nguoi_tao
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, 'binh_thuong', $10)
       RETURNING *`,
      [
        ma_lo,
        ma_vat_tu,
        ma_nha_cung_cap || null,
        ma_don_mua_hang || null,
        ngay_san_xuat || null,
        han_su_dung || null,
        so_luong_nhap,
        don_gia_nhap,
        ma_vi_tri_kho || null,
        nguoiTao,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Tạo lô vật tư thành công.',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// Cập nhật trạng thái lô hoặc đổi vị trí kho
async function updateLoVatTu(req, res, next) {
  try {
    const { id } = req.params;
    const { trang_thai, ma_vi_tri_kho, han_su_dung } = req.body;

    const result = await db.query(
      `UPDATE lo_vat_tu
       SET trang_thai = COALESCE($1, trang_thai),
           ma_vi_tri_kho = COALESCE($2, ma_vi_tri_kho),
           han_su_dung = COALESCE($3, han_su_dung)
       WHERE id = $4
       RETURNING *`,
      [trang_thai, ma_vi_tri_kho, han_su_dung, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy lô vật tư với ID ${id}`,
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật lô vật tư thành công.',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDanhSachLo,
  getChiTietLo,
  createLoVatTu,
  updateLoVatTu,
};
