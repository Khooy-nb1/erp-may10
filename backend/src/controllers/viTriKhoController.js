const db = require('../config/database');

// Lấy danh sách vị trí kho kèm thông tin tên kho
async function getDanhSachViTri(req, res, next) {
  try {
    const { ma_kho, trang_thai, search } = req.query;
    let query = `
      SELECT vtk.id, vtk.ma_kho, k.ten_kho, k.ma_kho AS ma_kho_code,
             vtk.ma_vi_tri, vtk.ten_vi_tri, vtk.khu_vuc, vtk.tang,
             vtk.suc_chua_toi_da, vtk.trang_thai, vtk.ngay_tao,
             nd.ho_ten AS nguoi_tao_ten,
             COUNT(lvt.id) AS so_luong_lo_dang_chua
      FROM vi_tri_kho vtk
      JOIN kho k ON vtk.ma_kho = k.id
      LEFT JOIN nguoi_dung nd ON vtk.nguoi_tao = nd.id
      LEFT JOIN lo_vat_tu lvt ON vtk.id = lvt.ma_vi_tri_kho AND lvt.so_luong_hien_tai > 0
      WHERE 1=1
    `;
    const params = [];

    if (ma_kho) {
      params.push(ma_kho);
      query += ` AND vtk.ma_kho = $${params.length}`;
    }

    if (trang_thai) {
      params.push(trang_thai);
      query += ` AND vtk.trang_thai = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (vtk.ma_vi_tri ILIKE $${params.length} OR vtk.ten_vi_tri ILIKE $${params.length} OR vtk.khu_vuc ILIKE $${params.length})`;
    }

    query += `
      GROUP BY vtk.id, k.ten_kho, k.ma_kho, nd.ho_ten
      ORDER BY vtk.ma_kho ASC, vtk.ma_vi_tri ASC
    `;

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// Lấy chi tiết một vị trí kho
async function getChiTietViTri(req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT vtk.*, k.ten_kho 
       FROM vi_tri_kho vtk 
       JOIN kho k ON vtk.ma_kho = k.id 
       WHERE vtk.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy vị trí kho với ID ${id}`,
      });
    }

    // Lấy các lô vật tư đang lưu tại vị trí này
    const loRes = await db.query(
      `SELECT l.id, l.ma_lo, vt.ten_vat_tu, l.so_luong_hien_tai, l.han_su_dung, l.trang_thai
       FROM lo_vat_tu l
       JOIN vat_tu vt ON l.ma_vat_tu = vt.id
       WHERE l.ma_vi_tri_kho = $1 AND l.so_luong_hien_tai > 0`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        danhSachLo: loRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Thêm mới vị trí kho
async function createViTri(req, res, next) {
  try {
    const { ma_kho, ma_vi_tri, ten_vi_tri, khu_vuc, tang, suc_chua_toi_da } = req.body;
    const nguoiTao = req.user?.id || 1;

    if (!ma_kho || !ma_vi_tri || !ten_vi_tri) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Vui lòng cung cấp đầy đủ thông tin bắt buộc: ma_kho, ma_vi_tri, ten_vi_tri.',
      });
    }

    const checkExist = await db.query(`SELECT id FROM vi_tri_kho WHERE ma_vi_tri = $1`, [ma_vi_tri]);
    if (checkExist.rows.length > 0) {
      return res.status(409).json({
        success: false,
        errorCode: 'ALREADY_EXISTS',
        message: `Mã vị trí [${ma_vi_tri}] đã tồn tại trên hệ thống.`,
      });
    }

    const result = await db.query(
      `INSERT INTO vi_tri_kho (ma_kho, ma_vi_tri, ten_vi_tri, khu_vuc, tang, suc_chua_toi_da, trang_thai, nguoi_tao)
       VALUES ($1, $2, $3, $4, $5, $6, 'trong', $7)
       RETURNING *`,
      [ma_kho, ma_vi_tri, ten_vi_tri, khu_vuc, tang, suc_chua_toi_da || null, nguoiTao]
    );

    res.status(201).json({
      success: true,
      message: 'Tạo vị trí kho thành công.',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// Cập nhật vị trí kho
async function updateViTri(req, res, next) {
  try {
    const { id } = req.params;
    const { ten_vi_tri, khu_vuc, tang, suc_chua_toi_da, trang_thai } = req.body;

    const result = await db.query(
      `UPDATE vi_tri_kho 
       SET ten_vi_tri = COALESCE($1, ten_vi_tri),
           khu_vuc = COALESCE($2, khu_vuc),
           tang = COALESCE($3, tang),
           suc_chua_toi_da = COALESCE($4, suc_chua_toi_da),
           trang_thai = COALESCE($5, trang_thai)
       WHERE id = $6
       RETURNING *`,
      [ten_vi_tri, khu_vuc, tang, suc_chua_toi_da, trang_thai, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy vị trí kho với ID ${id}`,
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật vị trí kho thành công.',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// Xóa vị trí kho
async function deleteViTri(req, res, next) {
  try {
    const { id } = req.params;
    // Kiểm tra xem có lô nào đang tham chiếu không
    const checkRef = await db.query(`SELECT id FROM lo_vat_tu WHERE ma_vi_tri_kho = $1 LIMIT 1`, [id]);
    if (checkRef.rows.length > 0) {
      return res.status(409).json({
        success: false,
        errorCode: 'CANNOT_DELETE',
        message: 'Không thể xóa vị trí này vì đang có lô vật tư được lưu trữ.',
      });
    }

    const result = await db.query(`DELETE FROM vi_tri_kho WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy vị trí kho với ID ${id}`,
      });
    }

    res.json({
      success: true,
      message: 'Xóa vị trí kho thành công.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDanhSachViTri,
  getChiTietViTri,
  createViTri,
  updateViTri,
  deleteViTri,
};
