const db = require('../config/database');

// Lấy danh sách phiếu xuất kho
async function getDanhSachPhieuXuat(req, res, next) {
  try {
    const { ma_kho, loai_xuat, tu_ngay, den_ngay, search } = req.query;
    let query = `
      SELECT pxk.id, pxk.ma_phieu_xuat, pxk.loai_xuat,
             pxk.ma_kho_xuat, k.ten_kho AS ten_kho_xuat,
             pxk.ngay_xuat, pxk.thu_kho, nd_tk.ho_ten AS ten_thu_kho,
             pxk.nguoi_nhan, pxk.tong_gia_tri_xuat,
             pxk.ghi_chu, pxk.trang_thai, pxk.ngay_tao,
             dbh.ma_don_ban AS ma_don_hang, lsx.ma_lenh_san_xuat,
             COUNT(ct.id) AS so_mat_hang
      FROM phieu_xuat_kho pxk
      JOIN kho k ON pxk.ma_kho_xuat = k.id
      LEFT JOIN nguoi_dung nd_tk ON pxk.thu_kho = nd_tk.id
      LEFT JOIN don_ban_hang dbh ON pxk.ma_don_ban_hang = dbh.id
      LEFT JOIN lenh_san_xuat lsx ON pxk.ma_lenh_san_xuat = lsx.id
      LEFT JOIN chi_tiet_phieu_xuat ct ON pxk.id = ct.ma_phieu_xuat_kho
      WHERE 1=1
    `;
    const params = [];

    if (ma_kho) {
      params.push(ma_kho);
      query += ` AND pxk.ma_kho_xuat = $${params.length}`;
    }

    if (loai_xuat) {
      params.push(loai_xuat);
      query += ` AND pxk.loai_xuat = $${params.length}`;
    }

    if (tu_ngay) {
      params.push(tu_ngay);
      query += ` AND pxk.ngay_xuat >= $${params.length}`;
    }

    if (den_ngay) {
      params.push(den_ngay);
      query += ` AND pxk.ngay_xuat <= $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (pxk.ma_phieu_xuat ILIKE $${params.length} OR pxk.nguoi_nhan ILIKE $${params.length})`;
    }

    query += `
      GROUP BY pxk.id, k.ten_kho, nd_tk.ho_ten, dbh.ma_don_ban, lsx.ma_lenh_san_xuat
      ORDER BY pxk.id DESC
    `;

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// Lấy chi tiết một phiếu xuất kho
async function getChiTietPhieuXuat(req, res, next) {
  try {
    const { id } = req.params;
    const pxkRes = await db.query(
      `SELECT pxk.*, k.ten_kho AS ten_kho_xuat, nd_tk.ho_ten AS ten_thu_kho,
              nd_tao.ho_ten AS ten_nguoi_tao,
              dbh.ma_don_ban AS ma_don_hang, lsx.ma_lenh_san_xuat
       FROM phieu_xuat_kho pxk
       JOIN kho k ON pxk.ma_kho_xuat = k.id
       LEFT JOIN nguoi_dung nd_tk ON pxk.thu_kho = nd_tk.id
       LEFT JOIN nguoi_dung nd_tao ON pxk.nguoi_tao = nd_tao.id
       LEFT JOIN don_ban_hang dbh ON pxk.ma_don_ban_hang = dbh.id
       LEFT JOIN lenh_san_xuat lsx ON pxk.ma_lenh_san_xuat = lsx.id
       WHERE pxk.id = $1`,
      [id]
    );

    if (pxkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy phiếu xuất với ID ${id}`,
      });
    }

    const itemsRes = await db.query(
      `SELECT ct.*, vt.ten_vat_tu, vt.ma_vat_tu AS ma_vat_tu_code,
              dvt.ten_don_vi AS ten_dvt, l.ma_lo
       FROM chi_tiet_phieu_xuat ct
       JOIN vat_tu vt ON ct.ma_vat_tu = vt.id
       LEFT JOIN don_vi_tinh dvt ON vt.ma_don_vi_tinh = dvt.id
       LEFT JOIN lo_vat_tu l ON ct.ma_lo_vat_tu = l.id
       WHERE ct.ma_phieu_xuat_kho = $1
       ORDER BY ct.id ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...pxkRes.rows[0],
        chiTiet: itemsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Tạo phiếu xuất kho — BẮT BUỘC TRANSACTION VÀ KHÓA DÒNG FOR UPDATE CHỐNG RACE CONDITION
async function createPhieuXuat(req, res, next) {
  const client = await db.getClient();
  try {
    const {
      ma_phieu_xuat,
      loai_xuat, // giao_khach, xuat_san_xuat, chuyen_kho, huy_vat_tu
      ma_don_ban_hang,
      ma_lenh_san_xuat,
      ma_kho_xuat,
      ngay_xuat,
      thu_kho,
      nguoi_nhan,
      ghi_chu,
      chiTiet, // Array: [{ ma_vat_tu, ma_lo_vat_tu, so_luong_xuat, don_gia_xuat, ghi_chu }]
    } = req.body;

    const nguoiTao = req.user?.id || 1;

    if (!loai_xuat || !ma_kho_xuat || !chiTiet || !Array.isArray(chiTiet) || chiTiet.length === 0) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Vui lòng cung cấp: loai_xuat, ma_kho_xuat và danh sách chiTiet vật tư cần xuất.',
      });
    }

    await client.query('BEGIN');

    // 1. Kiểm tra và khóa dòng tồn kho cho từng mặt hàng với FOR UPDATE
    const validatedItems = [];
    let tongGiaTri = 0;

    for (const item of chiTiet) {
      const slXuat = parseFloat(item.so_luong_xuat);
      const dgXuat = parseFloat(item.don_gia_xuat) || 0;

      if (isNaN(slXuat) || slXuat <= 0) {
        const err = new Error(`Số lượng xuất của vật tư ID ${item.ma_vat_tu} phải lớn hơn 0.`);
        err.statusCode = 400;
        err.errorCode = 'INVALID_QUANTITY';
        throw err;
      }

      // Khóa dòng tồn kho: SELECT ... FOR UPDATE
      const tonRes = await client.query(
        `SELECT tk.id, tk.so_luong_ton, tk.gia_tri_ton_kho, vt.ten_vat_tu, vt.ma_vat_tu
         FROM ton_kho tk
         JOIN vat_tu vt ON tk.ma_vat_tu = vt.id
         WHERE tk.ma_kho = $1 AND tk.ma_vat_tu = $2
         FOR UPDATE`,
        [ma_kho_xuat, item.ma_vat_tu]
      );

      if (tonRes.rows.length === 0) {
        // Lấy tên vật tư để báo lỗi trực quan
        const vtInfo = await client.query(`SELECT ten_vat_tu, ma_vat_tu FROM vat_tu WHERE id = $1`, [item.ma_vat_tu]);
        const tenVT = vtInfo.rows[0]?.ten_vat_tu || `ID ${item.ma_vat_tu}`;
        const err = new Error(`Mặt hàng [${tenVT}] chưa từng có tồn kho tại kho này (Tồn khả dụng: 0, Yêu cầu xuất: ${slXuat}).`);
        err.statusCode = 409;
        err.errorCode = 'INSUFFICIENT_STOCK';
        throw err;
      }

      const tonRecord = tonRes.rows[0];
      const tonHienTai = parseFloat(tonRecord.so_luong_ton);

      // KIỂM TRA CHẶT CHẼ: KHÔNG CHO PHÉP TỒN KHO ÂM
      if (tonHienTai < slXuat) {
        const err = new Error(
          `Xung đột tồn kho: Mặt hàng [${tonRecord.ten_vat_tu}] (${tonRecord.ma_vat_tu}) không đủ số lượng để xuất. Tồn khả dụng hiện tại: ${tonHienTai}, Yêu cầu xuất: ${slXuat}. Giao dịch bị hủy bỏ.`
        );
        err.statusCode = 409;
        err.errorCode = 'INSUFFICIENT_STOCK';
        throw err;
      }

      // Nếu xuất theo lô, khóa dòng và kiểm tra tồn lô
      let loRecord = null;
      if (item.ma_lo_vat_tu) {
        const loRes = await client.query(
          `SELECT id, ma_lo, so_luong_hien_tai, trang_thai
           FROM lo_vat_tu 
           WHERE id = $1 
           FOR UPDATE`,
          [item.ma_lo_vat_tu]
        );

        if (loRes.rows.length === 0) {
          const err = new Error(`Lô vật tư ID ${item.ma_lo_vat_tu} không tồn tại.`);
          err.statusCode = 404;
          err.errorCode = 'LOT_NOT_FOUND';
          throw err;
        }

        loRecord = loRes.rows[0];
        const tonLo = parseFloat(loRecord.so_luong_hien_tai);
        if (tonLo < slXuat) {
          const err = new Error(
            `Lô vật tư [${loRecord.ma_lo}] không đủ số lượng để xuất. Tồn lô hiện tại: ${tonLo}, Yêu cầu xuất: ${slXuat}.`
          );
          err.statusCode = 409;
          err.errorCode = 'INSUFFICIENT_LOT_STOCK';
          throw err;
        }
      }

      const thanhTien = slXuat * dgXuat;
      tongGiaTri += thanhTien;

      validatedItems.push({
        ...item,
        tonRecordId: tonRecord.id,
        tonHienTai,
        slXuat,
        dgXuat,
        thanhTien,
        loRecord,
      });
    }

    // 2. Sinh mã phiếu xuất
    const maPhieu =
      ma_phieu_xuat ||
      `PXK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Tạo đầu phiếu xuất kho
    const insertPXK = await client.query(
      `INSERT INTO phieu_xuat_kho (
         ma_phieu_xuat, loai_xuat, ma_don_ban_hang, ma_lenh_san_xuat,
         ma_kho_xuat, ngay_xuat, thu_kho, nguoi_nhan,
         tong_gia_tri_xuat, ghi_chu, trang_thai, nguoi_tao, nguoi_cap_nhat
       ) VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()), $7, $8, $9, $10, 'da_xuat', $11, $11)
       RETURNING *`,
      [
        maPhieu,
        loai_xuat,
        ma_don_ban_hang || null,
        ma_lenh_san_xuat || null,
        ma_kho_xuat,
        ngay_xuat || null,
        thu_kho || nguoiTao,
        nguoi_nhan || null,
        tongGiaTri,
        ghi_chu || null,
        nguoiTao,
      ]
    );

    const phieuMoi = insertPXK.rows[0];

    // 4. Trừ tồn kho và cập nhật chi tiết phiếu xuất
    for (const vItem of validatedItems) {
      // Thêm dòng chi tiết phiếu xuất
      await client.query(
        `INSERT INTO chi_tiet_phieu_xuat (
           ma_phieu_xuat_kho, ma_vat_tu, ma_lo_vat_tu,
           so_luong_xuat, don_gia_xuat, thanh_tien,
           ghi_chu, nguoi_tao
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          phieuMoi.id,
          vItem.ma_vat_tu,
          vItem.ma_lo_vat_tu || null,
          vItem.slXuat,
          vItem.dgXuat,
          vItem.thanhTien,
          vItem.ghi_chu || null,
          nguoiTao,
        ]
      );

      // Cập nhật trừ số lượng trong bảng tồn kho
      await client.query(
        `UPDATE ton_kho 
         SET so_luong_ton = so_luong_ton - $1,
             gia_tri_ton_kho = GREATEST(0, gia_tri_ton_kho - $2),
             ngay_cap_nhat = NOW(),
             nguoi_cap_nhat = $3
         WHERE id = $4`,
        [vItem.slXuat, vItem.thanhTien, nguoiTao, vItem.tonRecordId]
      );

      // Nếu có xuất theo lô, trừ số lượng lô
      if (vItem.loRecord) {
        await client.query(
          `UPDATE lo_vat_tu
           SET so_luong_hien_tai = so_luong_hien_tai - $1,
               trang_thai = CASE WHEN (so_luong_hien_tai - $1) = 0 THEN 'het_hang' ELSE trang_thai END
           WHERE id = $2`,
          [vItem.slXuat, vItem.loRecord.id]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Lập phiếu xuất kho thành công. Đã trừ tồn kho chính xác.',
      data: phieuMoi,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = {
  getDanhSachPhieuXuat,
  getChiTietPhieuXuat,
  createPhieuXuat,
};
