const db = require('../config/database');

// Lấy danh sách phiếu kiểm kê
async function getDanhSachPhieuKiemKe(req, res, next) {
  try {
    const { ma_kho, trang_thai, search } = req.query;
    let query = `
      SELECT pkk.id, pkk.ma_phieu_kiem_ke, pkk.ma_kho, k.ten_kho,
             pkk.ky_kiem_ke, pkk.ngay_kiem_ke, pkk.truong_kiem_ke,
             nd.ho_ten AS ten_truong_kiem_ke, pkk.ghi_chu, pkk.trang_thai,
             pkk.ngay_tao,
             COUNT(ct.id) AS so_mat_hang,
             COALESCE(SUM(ct.gia_tri_chenh_lech), 0) AS tong_gia_tri_chenh_lech
      FROM phieu_kiem_ke pkk
      JOIN kho k ON pkk.ma_kho = k.id
      LEFT JOIN nguoi_dung nd ON pkk.truong_kiem_ke = nd.id
      LEFT JOIN chi_tiet_kiem_ke ct ON pkk.id = ct.ma_phieu_kiem_ke
      WHERE 1=1
    `;
    const params = [];

    if (ma_kho) {
      params.push(ma_kho);
      query += ` AND pkk.ma_kho = $${params.length}`;
    }

    if (trang_thai) {
      params.push(trang_thai);
      query += ` AND pkk.trang_thai = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (pkk.ma_phieu_kiem_ke ILIKE $${params.length} OR pkk.ky_kiem_ke ILIKE $${params.length})`;
    }

    query += `
      GROUP BY pkk.id, k.ten_kho, nd.ho_ten
      ORDER BY pkk.id DESC
    `;

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// Lấy chi tiết một phiếu kiểm kê
async function getChiTietPhieuKiemKe(req, res, next) {
  try {
    const { id } = req.params;
    const pkkRes = await db.query(
      `SELECT pkk.*, k.ten_kho, nd.ho_ten AS ten_truong_kiem_ke
       FROM phieu_kiem_ke pkk
       JOIN kho k ON pkk.ma_kho = k.id
       LEFT JOIN nguoi_dung nd ON pkk.truong_kiem_ke = nd.id
       WHERE pkk.id = $1`,
      [id]
    );

    if (pkkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy phiếu kiểm kê với ID ${id}`,
      });
    }

    const itemsRes = await db.query(
      `SELECT ct.*, vt.ten_vat_tu, vt.ma_vat_tu AS ma_vat_tu_code,
              vt.gia_nhap_trung_binh AS don_gia_chuan, dvt.ten_don_vi AS ten_dvt
       FROM chi_tiet_kiem_ke ct
       JOIN vat_tu vt ON ct.ma_vat_tu = vt.id
       LEFT JOIN don_vi_tinh dvt ON vt.ma_don_vi_tinh = dvt.id
       WHERE ct.ma_phieu_kiem_ke = $1
       ORDER BY ct.id ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...pkkRes.rows[0],
        chiTiet: itemsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Lập phiếu kiểm kê mới
async function createPhieuKiemKe(req, res, next) {
  const client = await db.getClient();
  try {
    const {
      ma_phieu_kiem_ke,
      ma_kho,
      ky_kiem_ke,
      ngay_kiem_ke,
      truong_kiem_ke,
      ghi_chu,
      chiTiet, // Array: [{ ma_vat_tu, so_luong_thuc_te, nguyen_nhan }]
    } = req.body;

    const nguoiTao = req.user?.id || 1;

    if (!ma_kho || !ky_kiem_ke || !chiTiet || !Array.isArray(chiTiet) || chiTiet.length === 0) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Vui lòng cung cấp: ma_kho, ky_kiem_ke và danh sách chiTiet kiểm kê.',
      });
    }

    await client.query('BEGIN');

    const maPhieu =
      ma_phieu_kiem_ke ||
      `PKK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const insertPKK = await client.query(
      `INSERT INTO phieu_kiem_ke (
         ma_phieu_kiem_ke, ma_kho, ky_kiem_ke, ngay_kiem_ke,
         truong_kiem_ke, ghi_chu, trang_thai, nguoi_tao, nguoi_cap_nhat
       ) VALUES ($1, $2, $3, COALESCE($4, NOW()), $5, $6, 'dang_kiem_ke', $7, $7)
       RETURNING *`,
      [maPhieu, ma_kho, ky_kiem_ke, ngay_kiem_ke || null, truong_kiem_ke || nguoiTao, ghi_chu || null, nguoiTao]
    );

    const phieuMoi = insertPKK.rows[0];

    for (const item of chiTiet) {
      // Tra cứu số lượng sổ sách hiện tại và đơn giá
      const tonRes = await client.query(
        `SELECT tk.so_luong_ton, COALESCE(vt.gia_nhap_trung_binh, 0) AS don_gia
         FROM ton_kho tk
         JOIN vat_tu vt ON tk.ma_vat_tu = vt.id
         WHERE tk.ma_kho = $1 AND tk.ma_vat_tu = $2`,
        [ma_kho, item.ma_vat_tu]
      );

      const soLuongSoSach = tonRes.rows.length > 0 ? parseFloat(tonRes.rows[0].so_luong_ton) : 0;
      const donGia = tonRes.rows.length > 0 ? parseFloat(tonRes.rows[0].don_gia) : 0;
      const soLuongThucTe = parseFloat(item.so_luong_thuc_te) || 0;
      const chenhLech = soLuongThucTe - soLuongSoSach;
      const giaTriChenhLech = chenhLech * donGia;

      await client.query(
        `INSERT INTO chi_tiet_kiem_ke (
           ma_phieu_kiem_ke, ma_vat_tu, so_luong_so_sach,
           so_luong_thuc_te, chenh_lech, gia_tri_chenh_lech,
           nguyen_nhan, da_dieu_chinh, nguoi_tao
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'chua', $8)`,
        [
          phieuMoi.id,
          item.ma_vat_tu,
          soLuongSoSach,
          soLuongThucTe,
          chenhLech,
          giaTriChenhLech,
          item.nguyen_nhan || null,
          nguoiTao,
        ]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Lập phiếu kiểm kê kho thành công.',
      data: phieuMoi,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// Điều chỉnh cân đối tồn kho theo kết quả kiểm kê
async function dieuChinhTonKho(req, res, next) {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const nguoiDieuChinh = req.user?.id || 1;

    await client.query('BEGIN');

    // Khóa phiếu kiểm kê
    const pkkRes = await client.query(`SELECT * FROM phieu_kiem_ke WHERE id = $1 FOR UPDATE`, [id]);
    if (pkkRes.rows.length === 0) {
      const err = new Error(`Không tìm thấy phiếu kiểm kê ID ${id}`);
      err.statusCode = 404;
      throw err;
    }

    const pkk = pkkRes.rows[0];
    if (pkk.trang_thai === 'da_dieu_chinh') {
      const err = new Error('Phiếu kiểm kê này đã được điều chỉnh cân đối kho trước đó.');
      err.statusCode = 400;
      throw err;
    }

    // Lấy chi tiết các dòng chưa điều chỉnh
    const itemsRes = await client.query(
      `SELECT ct.*, vt.gia_nhap_trung_binh AS don_gia_chuan, vt.ma_don_vi_tinh AS ma_dvt 
       FROM chi_tiet_kiem_ke ct
       JOIN vat_tu vt ON ct.ma_vat_tu = vt.id
       WHERE ct.ma_phieu_kiem_ke = $1`,
      [id]
    );

    for (const item of itemsRes.rows) {
      const soThucTe = parseFloat(item.so_luong_thuc_te);
      const donGia = parseFloat(item.don_gia_chuan) || 0;
      const giaTriMoi = soThucTe * donGia;

      // Khóa dòng tồn kho
      const tonRes = await client.query(
        `SELECT id FROM ton_kho WHERE ma_kho = $1 AND ma_vat_tu = $2 FOR UPDATE`,
        [pkk.ma_kho, item.ma_vat_tu]
      );

      if (tonRes.rows.length > 0) {
        await client.query(
          `UPDATE ton_kho 
           SET so_luong_ton = $1,
               gia_tri_ton_kho = $2,
               ngay_cap_nhat = NOW(),
               nguoi_cap_nhat = $3
           WHERE id = $4`,
          [soThucTe, giaTriMoi, nguoiDieuChinh, tonRes.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO ton_kho (
             ma_kho, ma_vat_tu, so_luong_ton, don_vi_tinh, gia_tri_ton_kho, nguoi_cap_nhat
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [pkk.ma_kho, item.ma_vat_tu, soThucTe, item.ma_dvt, giaTriMoi, nguoiDieuChinh]
        );
      }

      // Đánh dấu chi tiết đã điều chỉnh
      await client.query(
        `UPDATE chi_tiet_kiem_ke SET da_dieu_chinh = 'da_dieu_chinh' WHERE id = $1`,
        [item.id]
      );
    }

    // Cập nhật trạng thái phiếu kiểm kê
    await client.query(
      `UPDATE phieu_kiem_ke 
       SET trang_thai = 'da_dieu_chinh', ngay_cap_nhat = NOW(), nguoi_cap_nhat = $1 
       WHERE id = $2`,
      [nguoiDieuChinh, id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Cân đối điều chỉnh tồn kho thành công. Số tồn sổ sách đã khớp với thực tế.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = {
  getDanhSachPhieuKiemKe,
  getChiTietPhieuKiemKe,
  createPhieuKiemKe,
  dieuChinhTonKho,
};
