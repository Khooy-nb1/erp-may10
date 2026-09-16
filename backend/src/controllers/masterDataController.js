const db = require('../config/database');
const { validateVatTuInput } = require('../validators/vatTuValidator');

// Lấy danh sách kho
async function getDanhSachKho(req, res, next) {
  try {
    const result = await db.query(
      `SELECT id, ma_kho, ten_kho, loai_kho, dia_chi, trang_thai
       FROM kho
       ORDER BY id ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// Lấy danh sách vật tư kèm đơn vị tính và nhà cung cấp chính (FR-01)
async function getDanhSachVatTu(req, res, next) {
  try {
    const { loai_vat_tu, trang_thai, search } = req.query;
    let query = `
      SELECT vt.id, vt.ma_vat_tu, vt.ten_vat_tu, vt.loai_vat_tu,
             vt.ma_don_vi_tinh AS ma_dvt,
             dvt.ten_don_vi AS ten_dvt,
             vt.quy_cach,
             vt.muc_ton_toi_thieu AS dinh_muc_ton_toi_thieu,
             vt.muc_ton_toi_da,
             vt.gia_nhap_trung_binh AS don_gia_chuan,
             vt.nha_cung_cap_chinh AS ma_ncc,
             ncc.ten_nha_cung_cap AS ten_ncc,
             vt.trang_thai,
             vt.ngay_tao,
             vt.ngay_cap_nhat
      FROM vat_tu vt
      LEFT JOIN don_vi_tinh dvt ON vt.ma_don_vi_tinh = dvt.id
      LEFT JOIN nha_cung_cap ncc ON vt.nha_cung_cap_chinh = ncc.id
      WHERE 1=1
    `;
    const params = [];

    if (loai_vat_tu) {
      params.push(loai_vat_tu);
      query += ` AND vt.loai_vat_tu = $${params.length}`;
    }

    if (trang_thai) {
      params.push(trang_thai);
      query += ` AND vt.trang_thai = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (vt.ma_vat_tu ILIKE $${params.length} OR vt.ten_vat_tu ILIKE $${params.length} OR vt.quy_cach ILIKE $${params.length})`;
    }

    query += ` ORDER BY vt.id ASC`;

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// Lấy chi tiết 1 vật tư theo ID (FR-01)
async function getChiTietVatTu(req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT vt.id, vt.ma_vat_tu, vt.ten_vat_tu, vt.loai_vat_tu,
              vt.ma_don_vi_tinh AS ma_dvt,
              dvt.ten_don_vi AS ten_dvt,
              vt.quy_cach,
              vt.muc_ton_toi_thieu AS dinh_muc_ton_toi_thieu,
              vt.muc_ton_toi_da,
              vt.gia_nhap_trung_binh AS don_gia_chuan,
              vt.nha_cung_cap_chinh AS ma_ncc,
              ncc.ten_nha_cung_cap AS ten_ncc,
              vt.trang_thai,
              vt.ngay_tao,
              vt.ngay_cap_nhat
       FROM vat_tu vt
       LEFT JOIN don_vi_tinh dvt ON vt.ma_don_vi_tinh = dvt.id
       LEFT JOIN nha_cung_cap ncc ON vt.nha_cung_cap_chinh = ncc.id
       WHERE vt.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy vật tư với ID ${id}.`,
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Tạo mới vật tư (FR-01)
async function createVatTu(req, res, next) {
  try {
    const {
      ma_vat_tu,
      ten_vat_tu,
      loai_vat_tu,
      ma_don_vi_tinh,
      quy_cach,
      muc_ton_toi_thieu,
      muc_ton_toi_da,
      gia_nhap_trung_binh,
      nha_cung_cap_chinh,
    } = req.body;

    // Validate đầu vào
    const validation = validateVatTuInput(req.body, false);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: validation.errors.join(' '),
      });
    }

    const cleanMa = ma_vat_tu.trim().toUpperCase();

    // Kiểm tra trùng mã vật tư (HTTP 409)
    const checkExist = await db.query('SELECT id FROM vat_tu WHERE ma_vat_tu = $1', [cleanMa]);
    if (checkExist.rows.length > 0) {
      return res.status(409).json({
        success: false,
        errorCode: 'ALREADY_EXISTS',
        message: `Mã vật tư [${cleanMa}] đã tồn tại trong hệ thống.`,
      });
    }

    const nguoiTao = req.user?.id || 1;

    const result = await db.query(
      `INSERT INTO vat_tu (
         ma_vat_tu, ten_vat_tu, loai_vat_tu, ma_don_vi_tinh,
         quy_cach, muc_ton_toi_thieu, muc_ton_toi_da,
         gia_nhap_trung_binh, nha_cung_cap_chinh, trang_thai,
         nguoi_tao, ngay_tao, ngay_cap_nhat
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'dang_su_dung', $10, NOW(), NOW())
       RETURNING *`,
      [
        cleanMa,
        ten_vat_tu.trim(),
        loai_vat_tu || 'vai_chinh',
        parseInt(ma_don_vi_tinh, 10),
        quy_cach ? quy_cach.trim() : null,
        muc_ton_toi_thieu !== undefined ? parseFloat(muc_ton_toi_thieu) : 0,
        muc_ton_toi_da !== undefined ? parseFloat(muc_ton_toi_da) : 0,
        gia_nhap_trung_binh !== undefined ? parseFloat(gia_nhap_trung_binh) : 0,
        nha_cung_cap_chinh ? parseInt(nha_cung_cap_chinh, 10) : null,
        nguoiTao,
      ]
    );

    res.status(201).json({
      success: true,
      message: `Tạo mới vật tư [${cleanMa}] thành công.`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// Cập nhật thông tin vật tư (FR-01)
async function updateVatTu(req, res, next) {
  try {
    const { id } = req.params;
    const {
      ma_vat_tu,
      ten_vat_tu,
      loai_vat_tu,
      ma_don_vi_tinh,
      quy_cach,
      muc_ton_toi_thieu,
      muc_ton_toi_da,
      gia_nhap_trung_binh,
      nha_cung_cap_chinh,
    } = req.body;

    // Kiểm tra vật tư có tồn tại không
    const checkExist = await db.query('SELECT * FROM vat_tu WHERE id = $1', [id]);
    if (checkExist.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy vật tư với ID ${id}.`,
      });
    }

    const currentVt = checkExist.rows[0];

    // Validate đầu vào
    const validation = validateVatTuInput(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: validation.errors.join(' '),
      });
    }

    // Nếu đổi mã vật tư, kiểm tra trùng lặp
    const newMa = ma_vat_tu ? ma_vat_tu.trim().toUpperCase() : currentVt.ma_vat_tu;
    if (newMa !== currentVt.ma_vat_tu) {
      const dupCheck = await db.query('SELECT id FROM vat_tu WHERE ma_vat_tu = $1 AND id <> $2', [newMa, id]);
      if (dupCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          errorCode: 'ALREADY_EXISTS',
          message: `Mã vật tư [${newMa}] đã được sử dụng bởi vật tư khác.`,
        });
      }
    }

    const nguoiCapNhat = req.user?.id || 1;

    const result = await db.query(
      `UPDATE vat_tu
       SET ma_vat_tu = $1,
           ten_vat_tu = $2,
           loai_vat_tu = $3,
           ma_don_vi_tinh = $4,
           quy_cach = $5,
           muc_ton_toi_thieu = $6,
           muc_ton_toi_da = $7,
           gia_nhap_trung_binh = $8,
           nha_cung_cap_chinh = $9,
           nguoi_cap_nhat = $10,
           ngay_cap_nhat = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        newMa,
        ten_vat_tu !== undefined ? ten_vat_tu.trim() : currentVt.ten_vat_tu,
        loai_vat_tu !== undefined ? loai_vat_tu : currentVt.loai_vat_tu,
        ma_don_vi_tinh !== undefined ? parseInt(ma_don_vi_tinh, 10) : currentVt.ma_don_vi_tinh,
        quy_cach !== undefined ? (quy_cach ? quy_cach.trim() : null) : currentVt.quy_cach,
        muc_ton_toi_thieu !== undefined ? parseFloat(muc_ton_toi_thieu) : currentVt.muc_ton_toi_thieu,
        muc_ton_toi_da !== undefined ? parseFloat(muc_ton_toi_da) : currentVt.muc_ton_toi_da,
        gia_nhap_trung_binh !== undefined ? parseFloat(gia_nhap_trung_binh) : currentVt.gia_nhap_trung_binh,
        nha_cung_cap_chinh !== undefined ? (nha_cung_cap_chinh ? parseInt(nha_cung_cap_chinh, 10) : null) : currentVt.nha_cung_cap_chinh,
        nguoiCapNhat,
        id,
      ]
    );

    res.json({
      success: true,
      message: `Cập nhật vật tư [${newMa}] thành công.`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// Bật / tắt trạng thái sử dụng vật tư (Soft Deactivation - FR-01)
async function toggleTrangThaiVatTu(req, res, next) {
  try {
    const { id } = req.params;
    const { trang_thai } = req.body;

    const validStatuses = ['dang_su_dung', 'ngung_su_dung'];
    if (!trang_thai || !validStatuses.includes(trang_thai)) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${validStatuses.join(', ')}.`,
      });
    }

    const checkExist = await db.query('SELECT * FROM vat_tu WHERE id = $1', [id]);
    if (checkExist.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy vật tư với ID ${id}.`,
      });
    }

    const nguoiCapNhat = req.user?.id || 1;

    const result = await db.query(
      `UPDATE vat_tu
       SET trang_thai = $1,
           nguoi_cap_nhat = $2,
           ngay_cap_nhat = NOW()
       WHERE id = $3
       RETURNING *`,
      [trang_thai, nguoiCapNhat, id]
    );

    const actionText = trang_thai === 'dang_su_dung' ? 'kích hoạt lại' : 'ngừng sử dụng';
    res.json({
      success: true,
      message: `Đã ${actionText} vật tư [${result.rows[0].ma_vat_tu}].`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// Lấy danh sách đơn vị tính
async function getDanhSachDVT(req, res, next) {
  try {
    const result = await db.query(
      `SELECT id, ma_don_vi AS ma_dvt, ten_don_vi AS ten_dvt FROM don_vi_tinh ORDER BY id ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// Lấy danh sách nhà cung cấp
async function getDanhSachNCC(req, res, next) {
  try {
    const result = await db.query(
      `SELECT id, ma_nha_cung_cap AS ma_ncc, ten_nha_cung_cap AS ten_ncc,
              so_dien_thoai, email, dia_chi, trang_thai
       FROM nha_cung_cap
       ORDER BY id ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// Lấy danh sách người dùng (thủ kho, nhân viên)
async function getDanhSachNguoiDung(req, res, next) {
  try {
    const result = await db.query(
      `SELECT id, ho_ten, email, so_dien_thoai, vai_tro, phong_ban, trang_thai
       FROM nguoi_dung
       ORDER BY id ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// Lấy danh mục liên kết liên phân hệ (Đơn bán hàng PH1, Lệnh sản xuất PH2, Đơn mua hàng PH3)
async function getCrossModuleReferences(req, res, next) {
  try {
    const [donBan, lenhSX, donMua] = await Promise.all([
      db.query(`SELECT id, ma_don_ban AS ma_don_hang, ngay_dat_hang, trang_thai FROM don_ban_hang ORDER BY id DESC LIMIT 50`),
      db.query(`SELECT id, ma_lenh_san_xuat AS ma_lenh, ngay_bat_dau, trang_thai FROM lenh_san_xuat ORDER BY id DESC LIMIT 50`),
      db.query(`SELECT id, ma_don_mua, ngay_dat_hang, trang_thai FROM don_mua_hang ORDER BY id DESC LIMIT 50`),
    ]);

    res.json({
      success: true,
      data: {
        donBanHang: donBan.rows,
        lenhSanXuat: lenhSX.rows,
        donMuaHang: donMua.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDanhSachKho,
  getDanhSachVatTu,
  getChiTietVatTu,
  createVatTu,
  updateVatTu,
  toggleTrangThaiVatTu,
  getDanhSachDVT,
  getDanhSachNCC,
  getDanhSachNguoiDung,
  getCrossModuleReferences,
};
