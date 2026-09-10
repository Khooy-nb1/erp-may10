const db = require('../config/database');

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

// Lấy danh sách vật tư kèm đơn vị tính
async function getDanhSachVatTu(req, res, next) {
  try {
    const result = await db.query(
      `SELECT vt.id, vt.ma_vat_tu, vt.ten_vat_tu, vt.loai_vat_tu, 
              vt.ma_don_vi_tinh AS ma_dvt, 
              dvt.ten_don_vi AS ten_dvt, 
              vt.muc_ton_toi_thieu AS dinh_muc_ton_toi_thieu, 
              vt.gia_nhap_trung_binh AS don_gia_chuan, 
              vt.trang_thai
       FROM vat_tu vt
       LEFT JOIN don_vi_tinh dvt ON vt.ma_don_vi_tinh = dvt.id
       ORDER BY vt.id ASC`
    );
    res.json({ success: true, data: result.rows });
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
  getDanhSachDVT,
  getDanhSachNCC,
  getDanhSachNguoiDung,
  getCrossModuleReferences,
};
