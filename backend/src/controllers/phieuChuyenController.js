const db = require('../config/database');

// Lấy danh sách phiếu chuyển kho
async function getDanhSachPhieuChuyen(req, res, next) {
  try {
    const { ma_kho_xuat, ma_kho_nhap, search } = req.query;
    let query = `
      SELECT pck.id, pck.ma_phieu_chuyen,
             pck.ma_kho_xuat, k_xuat.ten_kho AS ten_kho_xuat,
             pck.ma_kho_nhap, k_nhap.ten_kho AS ten_kho_nhap,
             pck.ngay_chuyen, pck.nguoi_chuyen, nd.ho_ten AS ten_nguoi_chuyen,
             pck.ly_do, pck.ghi_chu, pck.trang_thai, pck.ngay_tao,
             COUNT(ct.id) AS so_mat_hang
      FROM phieu_chuyen_kho pck
      JOIN kho k_xuat ON pck.ma_kho_xuat = k_xuat.id
      JOIN kho k_nhap ON pck.ma_kho_nhap = k_nhap.id
      LEFT JOIN nguoi_dung nd ON pck.nguoi_chuyen = nd.id
      LEFT JOIN chi_tiet_chuyen_kho ct ON pck.id = ct.ma_phieu_chuyen_kho
      WHERE 1=1
    `;
    const params = [];

    if (ma_kho_xuat) {
      params.push(ma_kho_xuat);
      query += ` AND pck.ma_kho_xuat = $${params.length}`;
    }

    if (ma_kho_nhap) {
      params.push(ma_kho_nhap);
      query += ` AND pck.ma_kho_nhap = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (pck.ma_phieu_chuyen ILIKE $${params.length} OR pck.ly_do ILIKE $${params.length})`;
    }

    query += `
      GROUP BY pck.id, k_xuat.ten_kho, k_nhap.ten_kho, nd.ho_ten
      ORDER BY pck.id DESC
    `;

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// Lấy chi tiết phiếu chuyển kho
async function getChiTietPhieuChuyen(req, res, next) {
  try {
    const { id } = req.params;
    const pckRes = await db.query(
      `SELECT pck.*, 
              k_xuat.ten_kho AS ten_kho_xuat,
              k_nhap.ten_kho AS ten_kho_nhap,
              nd.ho_ten AS ten_nguoi_chuyen
       FROM phieu_chuyen_kho pck
       JOIN kho k_xuat ON pck.ma_kho_xuat = k_xuat.id
       JOIN kho k_nhap ON pck.ma_kho_nhap = k_nhap.id
       LEFT JOIN nguoi_dung nd ON pck.nguoi_chuyen = nd.id
       WHERE pck.id = $1`,
      [id]
    );

    if (pckRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy phiếu chuyển kho với ID ${id}`,
      });
    }

    const itemsRes = await db.query(
      `SELECT ct.*, vt.ten_vat_tu, vt.ma_vat_tu AS ma_vat_tu_code, dvt.ten_dvt
       FROM chi_tiet_chuyen_kho ct
       JOIN vat_tu vt ON ct.ma_vat_tu = vt.id
       LEFT JOIN don_vi_tinh dvt ON vt.ma_dvt = dvt.id
       WHERE ct.ma_phieu_chuyen_kho = $1
       ORDER BY ct.id ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...pckRes.rows[0],
        chiTiet: itemsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Tạo phiếu chuyển kho — Concurrency safe với Row-level Locking tại cả kho xuất và kho nhập
async function createPhieuChuyen(req, res, next) {
  const client = await db.getClient();
  try {
    const {
      ma_phieu_chuyen,
      ma_kho_xuat,
      ma_kho_nhap,
      ngay_chuyen,
      nguoi_chuyen,
      ly_do,
      ghi_chu,
      chiTiet, // Array: [{ ma_vat_tu, so_luong_chuyen, don_gia, ghi_chu }]
    } = req.body;

    const nguoiTao = req.user?.id || 1;

    if (!ma_kho_xuat || !ma_kho_nhap || !chiTiet || !Array.isArray(chiTiet) || chiTiet.length === 0) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Vui lòng cung cấp: ma_kho_xuat, ma_kho_nhap và danh sách chiTiet.',
      });
    }

    if (parseInt(ma_kho_xuat, 10) === parseInt(ma_kho_nhap, 10)) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_WAREHOUSE_SELECTION',
        message: 'Kho xuất và kho nhập phải khác nhau theo quy định chuyển kho.',
      });
    }

    await client.query('BEGIN');

    // 1. Kiểm tra tồn và khóa dòng tại KHO XUẤT
    const validatedItems = [];

    for (const item of chiTiet) {
      const slChuyen = parseFloat(item.so_luong_chuyen);
      const donGia = parseFloat(item.don_gia) || 0;

      if (isNaN(slChuyen) || slChuyen <= 0) {
        const err = new Error(`Số lượng chuyển của vật tư ID ${item.ma_vat_tu} phải lớn hơn 0.`);
        err.statusCode = 400;
        throw err;
      }

      // Khóa dòng tồn kho tại kho xuất
      const tonXuatRes = await client.query(
        `SELECT tk.id, tk.so_luong_ton, tk.gia_tri_ton_kho, vt.ten_vat_tu
         FROM ton_kho tk
         JOIN vat_tu vt ON tk.ma_vat_tu = vt.id
         WHERE tk.ma_kho = $1 AND tk.ma_vat_tu = $2
         FOR UPDATE`,
        [ma_kho_xuat, item.ma_vat_tu]
      );

      if (tonXuatRes.rows.length === 0) {
        const vtInfo = await client.query(`SELECT ten_vat_tu FROM vat_tu WHERE id = $1`, [item.ma_vat_tu]);
        const tenVT = vtInfo.rows[0]?.ten_vat_tu || `ID ${item.ma_vat_tu}`;
        const err = new Error(`Kho xuất không có mặt hàng [${tenVT}] trong tồn kho.`);
        err.statusCode = 409;
        err.errorCode = 'INSUFFICIENT_STOCK';
        throw err;
      }

      const tonRecord = tonXuatRes.rows[0];
      const tonHienTai = parseFloat(tonRecord.so_luong_ton);

      if (tonHienTai < slChuyen) {
        const err = new Error(
          `Không thể điều chuyển: Mặt hàng [${tonRecord.ten_vat_tu}] tại kho xuất chỉ còn ${tonHienTai}, không đủ để chuyển ${slChuyen}.`
        );
        err.statusCode = 409;
        err.errorCode = 'INSUFFICIENT_STOCK';
        throw err;
      }

      validatedItems.push({
        ...item,
        tonXuatId: tonRecord.id,
        slChuyen,
        donGia,
      });
    }

    // 2. Tạo phiếu chuyển kho
    const maPhieu =
      ma_phieu_chuyen ||
      `PCK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const insertPCK = await client.query(
      `INSERT INTO phieu_chuyen_kho (
         ma_phieu_chuyen, ma_kho_xuat, ma_kho_nhap, ngay_chuyen,
         nguoi_chuyen, ly_do, ghi_chu, trang_thai, nguoi_tao, nguoi_cap_nhat
       ) VALUES ($1, $2, $3, COALESCE($4, NOW()), $5, $6, $7, 'da_chuyen', $8, $8)
       RETURNING *`,
      [maPhieu, ma_kho_xuat, ma_kho_nhap, ngay_chuyen || null, nguoi_chuyen || nguoiTao, ly_do, ghi_chu, nguoiTao]
    );

    const phieuMoi = insertPCK.rows[0];

    // 3. Thực hiện chuyển dịch số lượng: Trừ tại kho xuất, cộng tại kho nhập
    for (const vItem of validatedItems) {
      // Ghi chi tiết chuyển kho
      await client.query(
        `INSERT INTO chi_tiet_chuyen_kho (
           ma_phieu_chuyen_kho, ma_vat_tu, so_luong_chuyen, don_gia, ghi_chu, nguoi_tao
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [phieuMoi.id, vItem.ma_vat_tu, vItem.slChuyen, vItem.donGia, vItem.ghi_chu || null, nguoiTao]
      );

      // Trừ kho xuất
      const giaTriTru = vItem.slChuyen * vItem.donGia;
      await client.query(
        `UPDATE ton_kho 
         SET so_luong_ton = so_luong_ton - $1,
             gia_tri_ton_kho = GREATEST(0, gia_tri_ton_kho - $2),
             ngay_cap_nhat = NOW(),
             nguoi_cap_nhat = $3
         WHERE id = $4`,
        [vItem.slChuyen, giaTriTru, nguoiTao, vItem.tonXuatId]
      );

      // Khóa hoặc tạo mới tại kho nhập
      const tonNhapRes = await client.query(
        `SELECT id, so_luong_ton, gia_tri_ton_kho 
         FROM ton_kho 
         WHERE ma_kho = $1 AND ma_vat_tu = $2 
         FOR UPDATE`,
        [ma_kho_nhap, vItem.ma_vat_tu]
      );

      if (tonNhapRes.rows.length > 0) {
        await client.query(
          `UPDATE ton_kho 
           SET so_luong_ton = so_luong_ton + $1,
               gia_tri_ton_kho = gia_tri_ton_kho + $2,
               ngay_cap_nhat = NOW(),
               nguoi_cap_nhat = $3
           WHERE id = $4`,
          [vItem.slChuyen, giaTriTru, nguoiTao, tonNhapRes.rows[0].id]
        );
      } else {
        const vtDvt = await client.query(`SELECT ma_don_vi_tinh AS ma_dvt FROM vat_tu WHERE id = $1`, [vItem.ma_vat_tu]);
        const dvtId = vtDvt.rows[0]?.ma_dvt || null;

        await client.query(
          `INSERT INTO ton_kho (
             ma_kho, ma_vat_tu, so_luong_ton, don_vi_tinh, gia_tri_ton_kho, nguoi_cap_nhat
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [ma_kho_nhap, vItem.ma_vat_tu, vItem.slChuyen, dvtId, giaTriTru, nguoiTao]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Lập phiếu chuyển kho thành công. Đã cập nhật cân đối tồn kho giữa 2 kho.',
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
  getDanhSachPhieuChuyen,
  getChiTietPhieuChuyen,
  createPhieuChuyen,
};
