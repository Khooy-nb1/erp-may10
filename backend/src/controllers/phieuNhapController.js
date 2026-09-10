const db = require('../config/database');

// Lấy danh sách phiếu nhập kho
async function getDanhSachPhieuNhap(req, res, next) {
  try {
    const { ma_kho, loai_nhap, tu_ngay, den_ngay, search } = req.query;
    let query = `
      SELECT pnk.id, pnk.ma_phieu_nhap, pnk.loai_nhap,
             pnk.ma_kho_nhap, k.ten_kho AS ten_kho_nhap,
             pnk.ngay_nhap, pnk.thu_kho, nd_tk.ho_ten AS ten_thu_kho,
             pnk.nguoi_giao_hang, pnk.tong_gia_tri_nhap,
             pnk.ghi_chu, pnk.trang_thai, pnk.ngay_tao,
             dmh.ma_don_mua, lsx.ma_lenh_san_xuat,
             COUNT(ct.id) AS so_mat_hang
      FROM phieu_nhap_kho pnk
      JOIN kho k ON pnk.ma_kho_nhap = k.id
      LEFT JOIN nguoi_dung nd_tk ON pnk.thu_kho = nd_tk.id
      LEFT JOIN don_mua_hang dmh ON pnk.ma_don_mua_hang = dmh.id
      LEFT JOIN lenh_san_xuat lsx ON pnk.ma_lenh_san_xuat = lsx.id
      LEFT JOIN chi_tiet_phieu_nhap ct ON pnk.id = ct.ma_phieu_nhap_kho
      WHERE 1=1
    `;
    const params = [];

    if (ma_kho) {
      params.push(ma_kho);
      query += ` AND pnk.ma_kho_nhap = $${params.length}`;
    }

    if (loai_nhap) {
      params.push(loai_nhap);
      query += ` AND pnk.loai_nhap = $${params.length}`;
    }

    if (tu_ngay) {
      params.push(tu_ngay);
      query += ` AND pnk.ngay_nhap >= $${params.length}`;
    }

    if (den_ngay) {
      params.push(den_ngay);
      query += ` AND pnk.ngay_nhap <= $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (pnk.ma_phieu_nhap ILIKE $${params.length} OR pnk.nguoi_giao_hang ILIKE $${params.length})`;
    }

    query += `
      GROUP BY pnk.id, k.ten_kho, nd_tk.ho_ten, dmh.ma_don_mua, lsx.ma_lenh_san_xuat
      ORDER BY pnk.id DESC
    `;

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// Lấy chi tiết một phiếu nhập kho
async function getChiTietPhieuNhap(req, res, next) {
  try {
    const { id } = req.params;
    const pnkRes = await db.query(
      `SELECT pnk.*, k.ten_kho AS ten_kho_nhap, nd_tk.ho_ten AS ten_thu_kho,
              nd_tao.ho_ten AS ten_nguoi_tao,
              dmh.ma_don_mua, lsx.ma_lenh_san_xuat
       FROM phieu_nhap_kho pnk
       JOIN kho k ON pnk.ma_kho_nhap = k.id
       LEFT JOIN nguoi_dung nd_tk ON pnk.thu_kho = nd_tk.id
       LEFT JOIN nguoi_dung nd_tao ON pnk.nguoi_tao = nd_tao.id
       LEFT JOIN don_mua_hang dmh ON pnk.ma_don_mua_hang = dmh.id
       LEFT JOIN lenh_san_xuat lsx ON pnk.ma_lenh_san_xuat = lsx.id
       WHERE pnk.id = $1`,
      [id]
    );

    if (pnkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy phiếu nhập với ID ${id}`,
      });
    }

    const itemsRes = await db.query(
      `SELECT ct.*, vt.ten_vat_tu, vt.ma_vat_tu AS ma_vat_tu_code,
              dvt.ten_don_vi AS ten_dvt, l.ma_lo, vtk.ma_vi_tri, vtk.ten_vi_tri
       FROM chi_tiet_phieu_nhap ct
       JOIN vat_tu vt ON ct.ma_vat_tu = vt.id
       LEFT JOIN don_vi_tinh dvt ON vt.ma_don_vi_tinh = dvt.id
       LEFT JOIN lo_vat_tu l ON ct.ma_lo_vat_tu = l.id
       LEFT JOIN vi_tri_kho vtk ON ct.ma_vi_tri_kho = vtk.id
       WHERE ct.ma_phieu_nhap_kho = $1
       ORDER BY ct.id ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...pnkRes.rows[0],
        chiTiet: itemsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Tạo phiếu nhập kho và cập nhật tồn kho an toàn với Transaction & Row-level Locking
async function createPhieuNhap(req, res, next) {
  const client = await db.getClient();
  try {
    const {
      ma_phieu_nhap,
      loai_nhap, // tu_mua_hang, thanh_pham_san_xuat, chuyen_kho, kiem_ke
      ma_don_mua_hang,
      ma_lenh_san_xuat,
      ma_kho_nhap,
      ngay_nhap,
      thu_kho,
      nguoi_giao_hang,
      ghi_chu,
      chiTiet, // Array: [{ ma_vat_tu, ma_lo_vat_tu, so_luong_nhap, don_gia_nhap, ma_vi_tri_kho, ghi_chu, tao_lo_moi, ma_lo_moi, han_su_dung }]
    } = req.body;

    const nguoiTao = req.user?.id || 1;

    if (!loai_nhap || !ma_kho_nhap || !chiTiet || !Array.isArray(chiTiet) || chiTiet.length === 0) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Vui lòng cung cấp: loai_nhap, ma_kho_nhap và danh sách chiTiet vật tư.',
      });
    }

    await client.query('BEGIN');

    // Sinh mã phiếu nếu không truyền
    const maPhieu =
      ma_phieu_nhap ||
      `PNK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Tính tổng giá trị phiếu nhập
    let tongGiaTri = 0;
    chiTiet.forEach((item) => {
      const sl = parseFloat(item.so_luong_nhap) || 0;
      const dg = parseFloat(item.don_gia_nhap) || 0;
      tongGiaTri += sl * dg;
    });

    // 1. Tạo phiếu nhập
    const insertPNK = await client.query(
      `INSERT INTO phieu_nhap_kho (
         ma_phieu_nhap, loai_nhap, ma_don_mua_hang, ma_lenh_san_xuat,
         ma_kho_nhap, ngay_nhap, thu_kho, nguoi_giao_hang,
         tong_gia_tri_nhap, ghi_chu, trang_thai, nguoi_tao, nguoi_cap_nhat
       ) VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()), $7, $8, $9, $10, 'da_nhap', $11, $11)
       RETURNING *`,
      [
        maPhieu,
        loai_nhap,
        ma_don_mua_hang || null,
        ma_lenh_san_xuat || null,
        ma_kho_nhap,
        ngay_nhap || null,
        thu_kho || nguoiTao,
        nguoi_giao_hang || null,
        tongGiaTri,
        ghi_chu || null,
        nguoiTao,
      ]
    );

    const phieuMoi = insertPNK.rows[0];

    // 2. Duyệt qua từng dòng chi tiết
    for (const item of chiTiet) {
      const slNhap = parseFloat(item.so_luong_nhap);
      const dgNhap = parseFloat(item.don_gia_nhap);
      const thanhTien = slNhap * dgNhap;
      let loId = item.ma_lo_vat_tu || null;

      if (slNhap <= 0) {
        throw new Error(`Số lượng nhập của vật tư ID ${item.ma_vat_tu} phải lớn hơn 0.`);
      }

      // Xử lý tạo lô mới nếu có yêu cầu
      if (item.tao_lo_moi && item.ma_lo_moi) {
        const insertLoRes = await client.query(
          `INSERT INTO lo_vat_tu (
             ma_lo, ma_vat_tu, ma_don_mua_hang, han_su_dung,
             so_luong_nhap, so_luong_hien_tai, don_gia_nhap,
             ma_vi_tri_kho, trang_thai, nguoi_tao
           ) VALUES ($1, $2, $3, $4, $5, $5, $6, $7, 'binh_thuong', $8)
           RETURNING id`,
          [
            item.ma_lo_moi,
            item.ma_vat_tu,
            ma_don_mua_hang || null,
            item.han_su_dung || null,
            slNhap,
            dgNhap,
            item.ma_vi_tri_kho || null,
            nguoiTao,
          ]
        );
        loId = insertLoRes.rows[0].id;
      } else if (loId) {
        // Cập nhật số lượng lô hiện có
        await client.query(
          `UPDATE lo_vat_tu 
           SET so_luong_hien_tai = so_luong_hien_tai + $1,
               trang_thai = 'binh_thuong'
           WHERE id = $2`,
          [slNhap, loId]
        );
      }

      // 3. Thêm chi tiết phiếu nhập
      await client.query(
        `INSERT INTO chi_tiet_phieu_nhap (
           ma_phieu_nhap_kho, ma_vat_tu, ma_lo_vat_tu,
           so_luong_nhap, don_gia_nhap, thanh_tien,
           ma_vi_tri_kho, ghi_chu, nguoi_tao
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          phieuMoi.id,
          item.ma_vat_tu,
          loId,
          slNhap,
          dgNhap,
          thanhTien,
          item.ma_vi_tri_kho || null,
          item.ghi_chu || null,
          nguoiTao,
        ]
      );

      // 4. Khóa dòng và cập nhật tồn kho (Row-Level Locking với FOR UPDATE)
      const lockTon = await client.query(
        `SELECT id, so_luong_ton, gia_tri_ton_kho 
         FROM ton_kho 
         WHERE ma_kho = $1 AND ma_vat_tu = $2 
         FOR UPDATE`,
        [ma_kho_nhap, item.ma_vat_tu]
      );

      if (lockTon.rows.length > 0) {
        // Đã có bản ghi tồn kho -> cập nhật cộng thêm
        await client.query(
          `UPDATE ton_kho 
           SET so_luong_ton = so_luong_ton + $1,
               gia_tri_ton_kho = gia_tri_ton_kho + $2,
               ngay_cap_nhat = NOW(),
               nguoi_cap_nhat = $3
           WHERE id = $4`,
          [slNhap, thanhTien, nguoiTao, lockTon.rows[0].id]
        );
      } else {
        // Chưa có bản ghi -> lấy đơn vị tính chuẩn của vật tư để chèn mới
        const vtDvtRes = await client.query(`SELECT ma_don_vi_tinh AS ma_dvt FROM vat_tu WHERE id = $1`, [item.ma_vat_tu]);
        const dvtId = vtDvtRes.rows[0]?.ma_dvt || null;

        await client.query(
          `INSERT INTO ton_kho (
             ma_kho, ma_vat_tu, so_luong_ton, don_vi_tinh, gia_tri_ton_kho, nguoi_cap_nhat
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [ma_kho_nhap, item.ma_vat_tu, slNhap, dvtId, thanhTien, nguoiTao]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Lập phiếu nhập kho thành công. Tồn kho đã được cập nhật chính xác.',
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
  getDanhSachPhieuNhap,
  getChiTietPhieuNhap,
  createPhieuNhap,
};
