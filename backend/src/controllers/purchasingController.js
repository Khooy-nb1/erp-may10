const db = require('../config/database');
const {
  validateSupplierInput,
  validatePurchaseOrderInput,
  isValidStatusTransition,
  validateReceiveStatusInput,
} = require('../validators/purchasingValidator');

/**
 * 1. KPI & DASHBOARD MUA HÀNG
 * GET /api/v1/purchasing/dashboard
 */
async function getDashboardStats(req, res, next) {
  try {
    // 1. Tổng số PO và phân bổ trạng thái
    const statusCountsRes = await db.query(`
      SELECT 
        COUNT(*) AS total_po,
        COUNT(CASE WHEN trang_thai = 'cho_duyet' THEN 1 END) AS cho_duyet,
        COUNT(CASE WHEN trang_thai = 'da_gui_ncc' THEN 1 END) AS da_gui_ncc,
        COUNT(CASE WHEN trang_thai = 'da_xac_nhan' THEN 1 END) AS da_xac_nhan,
        COUNT(CASE WHEN trang_thai = 'dang_giao' THEN 1 END) AS dang_giao,
        COUNT(CASE WHEN trang_thai = 'da_nhap_kho' THEN 1 END) AS da_nhap_kho,
        COUNT(CASE WHEN trang_thai = 'huy' THEN 1 END) AS da_huy,
        COUNT(CASE WHEN trang_thai IN ('cho_duyet', 'da_gui_ncc', 'da_xac_nhan', 'dang_giao') THEN 1 END) AS dang_xu_ly,
        COUNT(CASE WHEN ngay_giao_hang_yc < NOW() AND trang_thai NOT IN ('da_nhap_kho', 'huy') THEN 1 END) AS qua_han,
        COALESCE(SUM(tong_thanh_toan), 0) AS tong_gia_tri_tat_ca,
        COALESCE(SUM(CASE WHEN trang_thai = 'da_nhap_kho' THEN tong_thanh_toan ELSE 0 END), 0) AS tong_gia_tri_da_nhap,
        COALESCE(SUM(CASE WHEN trang_thai IN ('da_gui_ncc', 'da_xac_nhan', 'dang_giao') THEN tong_thanh_toan ELSE 0 END), 0) AS gia_tri_dang_giao
      FROM don_mua_hang
    `);

    // 2. Số lượng nhà cung cấp
    const supplierCountRes = await db.query(`
      SELECT 
        COUNT(*) AS total_suppliers,
        COUNT(CASE WHEN trang_thai = 'hoat_dong' THEN 1 END) AS active_suppliers,
        COUNT(CASE WHEN trang_thai = 'tam_ngung' THEN 1 END) AS suspended_suppliers,
        COALESCE(AVG(CASE WHEN diem_danh_gia > 0 THEN diem_danh_gia END), 0) AS avg_rating
      FROM nha_cung_cap
    `);

    // 3. Đơn hàng cần xử lý gấp (Chờ duyệt hoặc Quá hạn)
    const urgentOrdersRes = await db.query(`
      SELECT dmh.id, dmh.ma_don_mua, dmh.ngay_dat_hang, dmh.ngay_giao_hang_yc,
             dmh.tong_thanh_toan, dmh.trang_thai,
             ncc.ten_nha_cung_cap, ncc.ma_nha_cung_cap,
             CASE 
               WHEN dmh.ngay_giao_hang_yc < NOW() AND dmh.trang_thai NOT IN ('da_nhap_kho', 'huy') THEN true
               ELSE false
             END AS is_overdue
      FROM don_mua_hang dmh
      JOIN nha_cung_cap ncc ON dmh.ma_nha_cung_cap = ncc.id
      WHERE dmh.trang_thai = 'cho_duyet' 
         OR (dmh.ngay_giao_hang_yc < NOW() AND dmh.trang_thai NOT IN ('da_nhap_kho', 'huy'))
      ORDER BY is_overdue DESC, dmh.ngay_giao_hang_yc ASC
      LIMIT 10
    `);

    // 4. 5 Đơn mua hàng gần nhất
    const recentOrdersRes = await db.query(`
      SELECT dmh.id, dmh.ma_don_mua, dmh.ngay_dat_hang, dmh.ngay_giao_hang_yc,
             dmh.tong_thanh_toan, dmh.trang_thai,
             ncc.ten_nha_cung_cap,
             nd.ho_ten AS ten_nguoi_dat
      FROM don_mua_hang dmh
      JOIN nha_cung_cap ncc ON dmh.ma_nha_cung_cap = ncc.id
      LEFT JOIN nguoi_dung nd ON dmh.nguoi_dat_hang = nd.id
      ORDER BY dmh.id DESC
      LIMIT 5
    `);

    const stats = statusCountsRes.rows[0];
    const supStats = supplierCountRes.rows[0];

    res.json({
      success: true,
      data: {
        summary: {
          totalPOs: parseInt(stats.total_po, 10) || 0,
          pendingApproval: parseInt(stats.cho_duyet, 10) || 0,
          inProgress: parseInt(stats.dang_xu_ly, 10) || 0,
          overdue: parseInt(stats.qua_han, 10) || 0,
          completed: parseInt(stats.da_nhap_kho, 10) || 0,
          cancelled: parseInt(stats.da_huy, 10) || 0,
          totalValueAll: parseFloat(stats.tong_gia_tri_tat_ca) || 0,
          totalValueCompleted: parseFloat(stats.tong_gia_tri_da_nhap) || 0,
          totalValueInProgress: parseFloat(stats.gia_tri_dang_giao) || 0,
          totalSuppliers: parseInt(supStats.total_suppliers, 10) || 0,
          activeSuppliers: parseInt(supStats.active_suppliers, 10) || 0,
          avgSupplierRating: parseFloat(supStats.avg_rating) || 0,
        },
        urgentOrders: urgentOrdersRes.rows,
        recentOrders: recentOrdersRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 2. API CONTRACT CHO CORE HOMEPAGE
 * GET /api/v1/purchasing/core-kpi
 * Cung cấp số liệu Mua hàng cho Trang chủ không cần sửa trực tiếp Homepage
 */
async function getCoreKpiContract(req, res, next) {
  try {
    const kpiRes = await db.query(`
      SELECT 
        COUNT(*) AS so_po,
        COUNT(CASE WHEN trang_thai IN ('cho_duyet', 'da_gui_ncc', 'da_xac_nhan', 'dang_giao') THEN 1 END) AS po_dang_xu_ly,
        COUNT(CASE WHEN ngay_giao_hang_yc < NOW() AND trang_thai NOT IN ('da_nhap_kho', 'huy') THEN 1 END) AS po_qua_han,
        (SELECT COUNT(CASE WHEN trang_thai = 'hoat_dong' THEN 1 END) FROM nha_cung_cap) AS ncc,
        COALESCE(SUM(CASE WHEN trang_thai != 'huy' THEN tong_thanh_toan ELSE 0 END), 0) AS gia_tri_mua_hang
      FROM don_mua_hang
    `);

    const row = kpiRes.rows[0];
    res.json({
      success: true,
      data: {
        so_po: parseInt(row.so_po, 10) || 0,
        po_dang_xu_ly: parseInt(row.po_dang_xu_ly, 10) || 0,
        po_qua_han: parseInt(row.po_qua_han, 10) || 0,
        ncc: parseInt(row.ncc, 10) || 0,
        gia_tri_mua_hang: parseFloat(row.gia_tri_mua_hang) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 3. QUẢN LÝ NHÀ CUNG CẤP (SUPPLIERS)
 * GET /api/v1/purchasing/suppliers
 */
async function getSuppliers(req, res, next) {
  try {
    const { search, trang_thai, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT ncc.*,
             COUNT(dmh.id) AS tong_don_mua,
             COALESCE(SUM(dmh.tong_thanh_toan) FILTER (WHERE dmh.trang_thai != 'huy'), 0) AS tong_gia_tri_mua
      FROM nha_cung_cap ncc
      LEFT JOIN don_mua_hang dmh ON ncc.id = dmh.ma_nha_cung_cap
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (ncc.ten_nha_cung_cap ILIKE $${params.length} OR ncc.ma_nha_cung_cap ILIKE $${params.length} OR ncc.email ILIKE $${params.length} OR ncc.so_dien_thoai ILIKE $${params.length})`;
    }

    if (trang_thai) {
      params.push(trang_thai);
      query += ` AND ncc.trang_thai = $${params.length}`;
    }

    query += `
      GROUP BY ncc.id
      ORDER BY ncc.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await db.query(query, params);
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/purchasing/suppliers/:id
 */
async function getSupplierDetail(req, res, next) {
  try {
    const { id } = req.params;
    const nccRes = await db.query(
      `SELECT ncc.*, nd.ho_ten AS ten_nguoi_tao
       FROM nha_cung_cap ncc
       LEFT JOIN nguoi_dung nd ON ncc.nguoi_tao = nd.id
       WHERE ncc.id = $1`,
      [id]
    );

    if (nccRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy nhà cung cấp với ID ${id}`,
      });
    }

    // Lịch sử đơn mua của NCC này
    const poListRes = await db.query(
      `SELECT dmh.id, dmh.ma_don_mua, dmh.ngay_dat_hang, dmh.ngay_giao_hang_yc,
              dmh.tong_thanh_toan, dmh.trang_thai
       FROM don_mua_hang dmh
       WHERE dmh.ma_nha_cung_cap = $1
       ORDER BY dmh.id DESC
       LIMIT 10`,
      [id]
    );

    // Lịch sử đánh giá
    const ratingRes = await db.query(
      `SELECT dg.*, nd.ho_ten AS ten_nguoi_danh_gia
       FROM danh_gia_ncc dg
       LEFT JOIN nguoi_dung nd ON dg.nguoi_danh_gia = nd.id
       WHERE dg.ma_nha_cung_cap = $1
       ORDER BY dg.id DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...nccRes.rows[0],
        donMuaHang: poListRes.rows,
        danhGia: ratingRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/purchasing/suppliers
 */
async function createSupplier(req, res, next) {
  try {
    const validation = validateSupplierInput(req.body, false);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Dữ liệu nhà cung cấp không hợp lệ.',
        errors: validation.errors,
      });
    }

    const {
      ma_nha_cung_cap,
      ten_nha_cung_cap,
      ma_so_thue,
      dia_chi,
      quoc_gia = 'Viet Nam',
      nguoi_lien_he,
      so_dien_thoai,
      email,
      loai_hang_cung_cap,
      han_muc_tin_dung = 0,
      so_ngay_gia_han = 30,
      diem_danh_gia = 0,
      trang_thai = 'hoat_dong',
    } = req.body;

    const nguoiTao = req.user?.id || 1;

    // Tự sinh mã NCC nếu không truyền
    const maNCC =
      ma_nha_cung_cap ||
      `NCC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Kiểm tra trùng mã NCC
    const checkDup = await db.query('SELECT id FROM nha_cung_cap WHERE ma_nha_cung_cap = $1', [maNCC]);
    if (checkDup.rows.length > 0) {
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Mã nhà cung cấp [${maNCC}] đã tồn tại trong hệ thống.`,
      });
    }

    const insertRes = await db.query(
      `INSERT INTO nha_cung_cap (
         ma_nha_cung_cap, ten_nha_cung_cap, ma_so_thue, dia_chi, quoc_gia,
         nguoi_lien_he, so_dien_thoai, email, loai_hang_cung_cap,
         han_muc_tin_dung, so_ngay_gia_han, diem_danh_gia, trang_thai,
         nguoi_tao, nguoi_cap_nhat
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
       RETURNING *`,
      [
        maNCC,
        ten_nha_cung_cap.trim(),
        ma_so_thue || null,
        dia_chi.trim(),
        quoc_gia,
        nguoi_lien_he.trim(),
        so_dien_thoai.trim(),
        email.trim(),
        loai_hang_cung_cap || null,
        parseFloat(han_muc_tin_dung) || 0,
        parseInt(so_ngay_gia_han, 10) || 30,
        parseFloat(diem_danh_gia) || 0,
        trang_thai,
        nguoiTao,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Tạo mới nhà cung cấp thành công.',
      data: insertRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/purchasing/suppliers/:id
 */
async function updateSupplier(req, res, next) {
  try {
    const { id } = req.params;
    const checkExists = await db.query('SELECT id FROM nha_cung_cap WHERE id = $1', [id]);
    if (checkExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy nhà cung cấp với ID ${id}`,
      });
    }

    const validation = validateSupplierInput(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Dữ liệu cập nhật nhà cung cấp không hợp lệ.',
        errors: validation.errors,
      });
    }

    const {
      ten_nha_cung_cap,
      ma_so_thue,
      dia_chi,
      quoc_gia,
      nguoi_lien_he,
      so_dien_thoai,
      email,
      loai_hang_cung_cap,
      han_muc_tin_dung,
      so_ngay_gia_han,
      diem_danh_gia,
      trang_thai,
    } = req.body;

    const nguoiCapNhat = req.user?.id || 1;

    const updateRes = await db.query(
      `UPDATE nha_cung_cap SET
         ten_nha_cung_cap = COALESCE($1, ten_nha_cung_cap),
         ma_so_thue = COALESCE($2, ma_so_thue),
         dia_chi = COALESCE($3, dia_chi),
         quoc_gia = COALESCE($4, quoc_gia),
         nguoi_lien_he = COALESCE($5, nguoi_lien_he),
         so_dien_thoai = COALESCE($6, so_dien_thoai),
         email = COALESCE($7, email),
         loai_hang_cung_cap = COALESCE($8, loai_hang_cung_cap),
         han_muc_tin_dung = COALESCE($9, han_muc_tin_dung),
         so_ngay_gia_han = COALESCE($10, so_ngay_gia_han),
         diem_danh_gia = COALESCE($11, diem_danh_gia),
         trang_thai = COALESCE($12, trang_thai),
         nguoi_cap_nhat = $13,
         ngay_cap_nhat = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        ten_nha_cung_cap,
        ma_so_thue,
        dia_chi,
        quoc_gia,
        nguoi_lien_he,
        so_dien_thoai,
        email,
        loai_hang_cung_cap,
        han_muc_tin_dung,
        so_ngay_gia_han,
        diem_danh_gia,
        trang_thai,
        nguoiCapNhat,
        id,
      ]
    );

    res.json({
      success: true,
      message: 'Cập nhật nhà cung cấp thành công.',
      data: updateRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 4. QUẢN LÝ ĐƠN MUA HÀNG (PURCHASE ORDERS)
 * GET /api/v1/purchasing/purchase-orders
 */
async function getPurchaseOrders(req, res, next) {
  try {
    const { search, trang_thai, ma_nha_cung_cap, tu_ngay, den_ngay, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT dmh.id, dmh.ma_don_mua, dmh.ngay_dat_hang, dmh.ngay_giao_hang_yc,
             dmh.tong_tien_hang, dmh.tien_thue, dmh.tong_thanh_toan,
             dmh.dieu_kien_thanh_toan, dmh.trang_thai, dmh.ghi_chu,
             dmh.ngay_tao,
             ncc.id AS ncc_id, ncc.ma_nha_cung_cap, ncc.ten_nha_cung_cap,
             nd_dat.ho_ten AS ten_nguoi_dat,
             COUNT(ct.id) AS so_mat_hang,
             COALESCE(SUM(ct.so_luong_dat), 0) AS tong_so_luong_dat,
             COALESCE(SUM(ct.so_luong_da_nhap), 0) AS tong_so_luong_da_nhap
      FROM don_mua_hang dmh
      JOIN nha_cung_cap ncc ON dmh.ma_nha_cung_cap = ncc.id
      LEFT JOIN nguoi_dung nd_dat ON dmh.nguoi_dat_hang = nd_dat.id
      LEFT JOIN chi_tiet_don_mua ct ON dmh.id = ct.ma_don_mua_hang
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (dmh.ma_don_mua ILIKE $${params.length} OR ncc.ten_nha_cung_cap ILIKE $${params.length})`;
    }

    if (trang_thai) {
      params.push(trang_thai);
      query += ` AND dmh.trang_thai = $${params.length}`;
    }

    if (ma_nha_cung_cap) {
      params.push(ma_nha_cung_cap);
      query += ` AND dmh.ma_nha_cung_cap = $${params.length}`;
    }

    if (tu_ngay) {
      params.push(tu_ngay);
      query += ` AND dmh.ngay_dat_hang >= $${params.length}`;
    }

    if (den_ngay) {
      params.push(den_ngay);
      query += ` AND dmh.ngay_dat_hang <= $${params.length}`;
    }

    query += `
      GROUP BY dmh.id, ncc.id, nd_dat.ho_ten
      ORDER BY dmh.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await db.query(query, params);
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/purchasing/purchase-orders/:id
 */
async function getPurchaseOrderDetail(req, res, next) {
  try {
    const { id } = req.params;
    const poRes = await db.query(
      `SELECT dmh.*,
              ncc.ma_nha_cung_cap, ncc.ten_nha_cung_cap, ncc.dia_chi AS dia_chi_ncc,
              ncc.so_dien_thoai AS sdt_ncc, ncc.email AS email_ncc,
              nd_dat.ho_ten AS ten_nguoi_dat,
              nd_tao.ho_ten AS ten_nguoi_tao,
              ycm.ma_yeu_cau_mua
       FROM don_mua_hang dmh
       JOIN nha_cung_cap ncc ON dmh.ma_nha_cung_cap = ncc.id
       LEFT JOIN nguoi_dung nd_dat ON dmh.nguoi_dat_hang = nd_dat.id
       LEFT JOIN nguoi_dung nd_tao ON dmh.nguoi_tao = nd_tao.id
       LEFT JOIN yeu_cau_mua_hang ycm ON dmh.ma_yeu_cau_mua_hang = ycm.id
       WHERE dmh.id = $1`,
      [id]
    );

    if (poRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy đơn mua hàng với ID ${id}`,
      });
    }

    const itemsRes = await db.query(
      `SELECT ct.*,
              vt.ma_vat_tu, vt.ten_vat_tu, vt.quy_cach,
              dvt.ten_don_vi AS ten_dvt,
              (ct.so_luong_dat - ct.so_luong_da_nhap) AS so_luong_con_lai
       FROM chi_tiet_don_mua ct
       JOIN vat_tu vt ON ct.ma_vat_tu = vt.id
       LEFT JOIN don_vi_tinh dvt ON vt.ma_don_vi_tinh = dvt.id
       WHERE ct.ma_don_mua_hang = $1
       ORDER BY ct.id ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...poRes.rows[0],
        chiTiet: itemsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/purchasing/purchase-orders
 * Tạo mới đơn mua hàng (Transaction Boundary ACID)
 */
async function createPurchaseOrder(req, res, next) {
  const client = await db.getClient();
  try {
    // 1. Validation cú pháp & dữ liệu cơ bản
    const validation = validatePurchaseOrderInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Dữ liệu đơn mua hàng không hợp lệ.',
        errors: validation.errors,
      });
    }

    const {
      ma_don_mua,
      ma_nha_cung_cap,
      ma_yeu_cau_mua_hang,
      ngay_dat_hang,
      ngay_giao_hang_yc,
      dieu_kien_thanh_toan,
      ghi_chu,
      chiTiet, // [{ ma_vat_tu, so_luong_dat, don_gia, ghi_chu }]
    } = req.body;

    const nguoiTao = req.user?.id || 1;

    await client.query('BEGIN');

    // 2. Kiểm tra Nhà cung cấp hợp lệ và đang hoạt động
    const nccCheck = await client.query(
      'SELECT id, ten_nha_cung_cap, trang_thai FROM nha_cung_cap WHERE id = $1',
      [ma_nha_cung_cap]
    );
    if (nccCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: `Nhà cung cấp ID ${ma_nha_cung_cap} không tồn tại trong hệ thống.`,
      });
    }
    if (nccCheck.rows[0].trang_thai !== 'hoat_dong') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: `Nhà cung cấp [${nccCheck.rows[0].ten_nha_cung_cap}] đang bị tạm ngưng hoặc ngừng giao dịch.`,
      });
    }

    // 3. Kiểm tra danh sách vật tư tồn tại
    for (const item of chiTiet) {
      const vtCheck = await client.query('SELECT id, ten_vat_tu FROM vat_tu WHERE id = $1', [item.ma_vat_tu]);
      if (vtCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          errorCode: 'VALIDATION_ERROR',
          message: `Vật tư ID ${item.ma_vat_tu} không tồn tại trong hệ thống.`,
        });
      }
    }

    // 4. Sinh mã đơn mua hàng tự động nếu không truyền
    const maPO =
      ma_don_mua ||
      `DMH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Kiểm tra trùng mã PO
    const poDup = await client.query('SELECT id FROM don_mua_hang WHERE ma_don_mua = $1', [maPO]);
    if (poDup.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Mã đơn mua hàng [${maPO}] đã tồn tại.`,
      });
    }

    // 5. Tính toán thành tiền & thuế
    let tongTienHang = 0;
    chiTiet.forEach((item) => {
      const sl = parseFloat(item.so_luong_dat);
      const dg = parseFloat(item.don_gia);
      tongTienHang += sl * dg;
    });
    const tienThue = Math.round(tongTienHang * 0.08 * 100) / 100; // VAT 8%
    const tongThanhToan = tongTienHang + tienThue;

    // 6. Chèn vào bảng don_mua_hang
    const insertPORes = await client.query(
      `INSERT INTO don_mua_hang (
         ma_don_mua, ma_nha_cung_cap, ma_yeu_cau_mua_hang,
         ngay_dat_hang, ngay_giao_hang_yc,
         tong_tien_hang, tien_thue, tong_thanh_toan,
         dieu_kien_thanh_toan, nguoi_dat_hang, ghi_chu,
         trang_thai, nguoi_tao, nguoi_cap_nhat
       ) VALUES ($1, $2, $3, COALESCE($4, NOW()), $5, $6, $7, $8, $9, $10, $11, 'cho_duyet', $10, $10)
       RETURNING *`,
      [
        maPO,
        ma_nha_cung_cap,
        ma_yeu_cau_mua_hang || null,
        ngay_dat_hang || null,
        ngay_giao_hang_yc,
        tongTienHang,
        tienThue,
        tongThanhToan,
        dieu_kien_thanh_toan || 'Thanh toán sau khi nhận hàng và hóa đơn 30 ngày',
        nguoiTao,
        ghi_chu || null,
      ]
    );

    const newPO = insertPORes.rows[0];

    // 7. Chèn chi tiết chi_tiet_don_mua
    const insertedItems = [];
    for (const item of chiTiet) {
      const sl = parseFloat(item.so_luong_dat);
      const dg = parseFloat(item.don_gia);
      const tt = sl * dg;

      const itemRes = await client.query(
        `INSERT INTO chi_tiet_don_mua (
           ma_don_mua_hang, ma_vat_tu, so_luong_dat,
           don_gia, thanh_tien, so_luong_da_nhap,
           ghi_chu, nguoi_tao
         ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7)
         RETURNING *`,
        [newPO.id, item.ma_vat_tu, sl, dg, tt, item.ghi_chu || null, nguoiTao]
      );
      insertedItems.push(itemRes.rows[0]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Tạo đơn mua hàng mới thành công.',
      data: {
        ...newPO,
        chiTiet: insertedItems,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * 5. PHÊ DUYỆT ĐƠN MUA HÀNG (APPROVE PO)
 * POST /api/v1/purchasing/purchase-orders/:id/approve
 * Concurrency Protection với SELECT ... FOR UPDATE chống Double Approval
 */
async function approvePurchaseOrder(req, res, next) {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1;

    await client.query('BEGIN');

    // Khóa dòng bằng FOR UPDATE ngăn chặn 2 người hoặc 2 request phê duyệt song song
    const lockRes = await client.query(
      `SELECT id, ma_don_mua, trang_thai, tong_thanh_toan
       FROM don_mua_hang
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (lockRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy đơn mua hàng với ID ${id}`,
      });
    }

    const currentPO = lockRes.rows[0];

    // Kiểm tra trạng thái: chỉ cho phép duyệt khi trạng thái là 'cho_duyet'
    if (currentPO.trang_thai !== 'cho_duyet') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Không thể phê duyệt đơn mua hàng [${currentPO.ma_don_mua}]. Đơn hàng hiện đang ở trạng thái [${currentPO.trang_thai}] (chỉ được duyệt khi ở trạng thái 'cho_duyet').`,
        currentStatus: currentPO.trang_thai,
      });
    }

    // Cập nhật trạng thái sang 'da_gui_ncc'
    const updateRes = await client.query(
      `UPDATE don_mua_hang SET
         trang_thai = 'da_gui_ncc',
         nguoi_cap_nhat = $1,
         ngay_cap_nhat = NOW()
       WHERE id = $2 AND trang_thai = 'cho_duyet'
       RETURNING *`,
      [userId, id]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Không thể phê duyệt đơn mua hàng [${currentPO.ma_don_mua}] vì trạng thái đã bị thay đổi đồng thời bởi một giao dịch khác.`,
        currentStatus: currentPO.trang_thai,
      });
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Đơn mua hàng [${currentPO.ma_don_mua}] đã được phê duyệt và chuyển trạng thái gửi Nhà cung cấp thành công.`,
      data: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * 6. HỦY ĐƠN MUA HÀNG (CANCEL PO)
 * POST /api/v1/purchasing/purchase-orders/:id/cancel
 * Concurrency Protection với SELECT ... FOR UPDATE chống Double Cancel
 */
async function cancelPurchaseOrder(req, res, next) {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { ly_do_huy } = req.body;
    const userId = req.user?.id || 1;

    await client.query('BEGIN');

    // Khóa dòng bằng FOR UPDATE
    const lockRes = await client.query(
      `SELECT id, ma_don_mua, trang_thai
       FROM don_mua_hang
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (lockRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy đơn mua hàng với ID ${id}`,
      });
    }

    const currentPO = lockRes.rows[0];

    // Chống double cancel
    if (currentPO.trang_thai === 'huy') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Đơn mua hàng [${currentPO.ma_don_mua}] đã bị hủy trước đó.`,
        currentStatus: currentPO.trang_thai,
      });
    }

    // Không cho phép hủy khi đã nhập kho xong
    if (currentPO.trang_thai === 'da_nhap_kho') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Không thể hủy đơn mua hàng [${currentPO.ma_don_mua}] vì hàng đã được nhập đủ vào kho.`,
        currentStatus: currentPO.trang_thai,
      });
    }

    const updateRes = await client.query(
      `UPDATE don_mua_hang SET
         trang_thai = 'huy',
         ghi_chu = CASE 
           WHEN $1::text IS NOT NULL THEN COALESCE(ghi_chu || ' | Lý do hủy: ' || $1, 'Lý do hủy: ' || $1)
           ELSE ghi_chu
         END,
         nguoi_cap_nhat = $2,
         ngay_cap_nhat = NOW()
       WHERE id = $3 AND trang_thai NOT IN ('huy', 'da_nhap_kho')
       RETURNING *`,
      [ly_do_huy || null, userId, id]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Đơn mua hàng [${currentPO.ma_don_mua}] đã bị hủy hoặc thay đổi trạng thái bởi một giao dịch khác đồng thời.`,
        currentStatus: currentPO.trang_thai,
      });
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Đơn mua hàng [${currentPO.ma_don_mua}] đã được hủy thành công.`,
      data: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * 7. CHUYỂN DỊCH TRẠNG THÁI (STATUS TRANSITION)
 * POST /api/v1/purchasing/purchase-orders/:id/status
 */
async function updateStatusTransition(req, res, next) {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { trang_thai_moi, ghi_chu } = req.body;
    const userId = req.user?.id || 1;

    if (!trang_thai_moi) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Trạng thái mới (trang_thai_moi) là bắt buộc.',
      });
    }

    await client.query('BEGIN');

    const lockRes = await client.query(
      `SELECT id, ma_don_mua, trang_thai
       FROM don_mua_hang
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (lockRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy đơn mua hàng với ID ${id}`,
      });
    }

    const currentPO = lockRes.rows[0];

    // Kiểm tra tính hợp lệ của bước chuyển trạng thái
    if (!isValidStatusTransition(currentPO.trang_thai, trang_thai_moi)) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Chuyển trạng thái không hợp lệ: từ [${currentPO.trang_thai}] sang [${trang_thai_moi}] không được phép theo quy trình chuẩn.`,
        currentStatus: currentPO.trang_thai,
        requestedStatus: trang_thai_moi,
      });
    }

    const updateRes = await client.query(
      `UPDATE don_mua_hang SET
         trang_thai = $1,
         ghi_chu = CASE WHEN $2::text IS NOT NULL THEN COALESCE(ghi_chu || ' | ' || $2, $2) ELSE ghi_chu END,
         nguoi_cap_nhat = $3,
         ngay_cap_nhat = NOW()
       WHERE id = $4 AND trang_thai = $5
       RETURNING *`,
      [trang_thai_moi, ghi_chu || null, userId, id, currentPO.trang_thai]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Chuyển dịch trạng thái đơn mua hàng [${currentPO.ma_don_mua}] thất bại do trạng thái đã bị thay đổi đồng thời bởi một giao dịch khác.`,
        currentStatus: currentPO.trang_thai,
      });
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái đơn mua sang [${trang_thai_moi}].`,
      data: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * 8. ĐƠN MUA HÀNG ĐỦ ĐIỀU KIỆN NHẬP KHO (CHO PH3 VÀ PH4)
 * GET /api/v1/purchasing/receiving
 */
async function getReceivingOrders(req, res, next) {
  try {
    // Đơn mua đủ điều kiện nhập kho: trạng thái 'da_gui_ncc', 'da_xac_nhan', 'dang_giao'
    const result = await db.query(`
      SELECT dmh.id, dmh.ma_don_mua, dmh.ngay_dat_hang, dmh.ngay_giao_hang_yc,
             dmh.trang_thai, dmh.tong_thanh_toan,
             ncc.id AS ma_nha_cung_cap, ncc.ten_nha_cung_cap, ncc.ma_nha_cung_cap AS ncc_code
      FROM don_mua_hang dmh
      JOIN nha_cung_cap ncc ON dmh.ma_nha_cung_cap = ncc.id
      WHERE dmh.trang_thai IN ('da_gui_ncc', 'da_xac_nhan', 'dang_giao')
      ORDER BY dmh.id DESC
    `);

    // Gắn thêm chi tiết vật tư cần nhập cho từng đơn mua và chỉ lấy đơn còn hàng cần nhận
    const receivingOrders = [];
    for (const po of result.rows) {
      const itemsRes = await db.query(
        `SELECT ct.id, ct.ma_vat_tu, ct.so_luong_dat, ct.so_luong_da_nhap,
                (ct.so_luong_dat - ct.so_luong_da_nhap) AS so_luong_can_nhap,
                ct.don_gia,
                vt.ma_vat_tu AS ma_vat_tu_code, vt.ten_vat_tu,
                dvt.ten_don_vi AS ten_dvt
         FROM chi_tiet_don_mua ct
         JOIN vat_tu vt ON ct.ma_vat_tu = vt.id
         LEFT JOIN don_vi_tinh dvt ON vt.ma_don_vi_tinh = dvt.id
         WHERE ct.ma_don_mua_hang = $1
         ORDER BY ct.id ASC`,
        [po.id]
      );

      let tongDat = 0;
      let tongDaNhap = 0;
      let tongConLai = 0;

      itemsRes.rows.forEach((it) => {
        const dat = parseFloat(it.so_luong_dat) || 0;
        const daNhap = parseFloat(it.so_luong_da_nhap) || 0;
        tongDat += dat;
        tongDaNhap += daNhap;
        tongConLai += Math.max(0, dat - daNhap);
      });

      if (tongConLai > 0) {
        receivingOrders.push({
          ...po,
          so_dong_hang: itemsRes.rows.length,
          tong_dat: tongDat,
          tong_da_nhap: tongDaNhap,
          tong_con_lai: tongConLai,
          chiTiet: itemsRes.rows,
        });
      }
    }

    res.json({
      success: true,
      data: receivingOrders,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 9. CẬP NHẬT TIẾN ĐỘ NHẬP KHO (RECEIVE STATUS UPDATE)
 * POST /api/v1/purchasing/receive-status-update
 * Nhận một phần hoặc Toàn phần - Đảm bảo ranh giới Transaction ACID
 */
async function receiveStatusUpdate(req, res, next) {
  const client = await db.getClient();
  try {
    const validation = validateReceiveStatusInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Dữ liệu nhận hàng không hợp lệ.',
        errors: validation.errors,
      });
    }

    const { ma_don_mua_hang, chiTiet } = req.body;
    const userId = req.user?.id || 1;

    await client.query('BEGIN');

    // 1. Khóa dòng đơn mua hàng
    const poLock = await client.query(
      `SELECT id, ma_don_mua, trang_thai
       FROM don_mua_hang
       WHERE id = $1
       FOR UPDATE`,
      [ma_don_mua_hang]
    );

    if (poLock.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `Không tìm thấy đơn mua hàng ID ${ma_don_mua_hang}`,
      });
    }

    const po = poLock.rows[0];

    // Không nhận hàng cho đơn đã hủy hoặc đã đóng
    if (po.trang_thai === 'huy') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        message: `Đơn mua hàng [${po.ma_don_mua}] đã bị hủy, không thể nhận hàng.`,
      });
    }

    // 2. Cập nhật số lượng đã nhập trên từng dòng chi tiết
    for (const item of chiTiet) {
      const slNhap = parseFloat(item.so_luong_nhap);
      let queryItem;
      let paramsItem;

      if (item.id) {
        queryItem = `
          SELECT id, so_luong_dat, so_luong_da_nhap
          FROM chi_tiet_don_mua
          WHERE id = $1 AND ma_don_mua_hang = $2
          FOR UPDATE
        `;
        paramsItem = [item.id, ma_don_mua_hang];
      } else {
        queryItem = `
          SELECT id, so_luong_dat, so_luong_da_nhap
          FROM chi_tiet_don_mua
          WHERE ma_don_mua_hang = $1 AND ma_vat_tu = $2
          FOR UPDATE
        `;
        paramsItem = [ma_don_mua_hang, item.ma_vat_tu];
      }

      const itemLock = await client.query(queryItem, paramsItem);
      if (itemLock.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          errorCode: 'VALIDATION_ERROR',
          message: `Không tìm thấy dòng mặt hàng tương ứng trong đơn mua ${po.ma_don_mua}`,
        });
      }

      const ctRow = itemLock.rows[0];
      const newDaNhap = parseFloat(ctRow.so_luong_da_nhap) + slNhap;

      await client.query(
        `UPDATE chi_tiet_don_mua SET
           so_luong_da_nhap = $1,
           ngay_cap_nhat = NOW()
         WHERE id = $2`,
        [newDaNhap, ctRow.id]
      );
    }

    // 3. Đánh giá trạng thái tổng thể sau khi nhập:
    // Kiểm tra xem tất cả các dòng của đơn mua đã nhập đủ chưa
    const checkAllRes = await client.query(
      `SELECT id, so_luong_dat, so_luong_da_nhap
       FROM chi_tiet_don_mua
       WHERE ma_don_mua_hang = $1`,
      [ma_don_mua_hang]
    );

    let tongDat = 0;
    let tongDaNhap = 0;
    let soDongChuaDu = 0;

    for (const it of checkAllRes.rows) {
      const dat = parseFloat(it.so_luong_dat) || 0;
      const daNhap = parseFloat(it.so_luong_da_nhap) || 0;
      tongDat += dat;
      tongDaNhap += daNhap;
      if (daNhap < dat) {
        soDongChuaDu++;
      }
    }

    const newStatus = soDongChuaDu === 0 ? 'da_nhap_kho' : 'dang_giao';

    await client.query(
      `UPDATE don_mua_hang SET
         trang_thai = $1,
         nguoi_cap_nhat = $2,
         ngay_cap_nhat = NOW()
       WHERE id = $3`,
      [newStatus, userId, ma_don_mua_hang]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message:
        newStatus === 'da_nhap_kho'
          ? `Đơn mua hàng [${po.ma_don_mua}] đã được nhập kho TOÀN BỘ thành công.`
          : `Đơn mua hàng [${po.ma_don_mua}] đã ghi nhận nhập MỘT PHẦN hàng. Trạng thái hiện tại: Đang giao.`,
      data: {
        ma_don_mua_hang,
        ma_don_mua: po.ma_don_mua,
        trang_thai: newStatus,
        tongDat,
        tongDaNhap,
        hoanThanh: newStatus === 'da_nhap_kho',
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * 10. BÁO CÁO MUA HÀNG (PURCHASING REPORTS)
 * GET /api/v1/purchasing/reports
 */
async function getReports(req, res, next) {
  try {
    const { tu_ngay, den_ngay } = req.query;
    let dateFilterPO = '';
    const params = [];

    if (tu_ngay) {
      params.push(tu_ngay);
      dateFilterPO += ` AND dmh.ngay_dat_hang >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      dateFilterPO += ` AND dmh.ngay_dat_hang <= $${params.length}`;
    }

    // 1. Phân bổ chi phí theo Nhà cung cấp
    const bySupplierRes = await db.query(
      `SELECT ncc.id, ncc.ma_nha_cung_cap, ncc.ten_nha_cung_cap,
              COUNT(dmh.id) AS so_don_mua,
              COALESCE(SUM(dmh.tong_thanh_toan) FILTER (WHERE dmh.trang_thai != 'huy'), 0) AS tong_chi_phi,
              COALESCE(SUM(dmh.tong_thanh_toan) FILTER (WHERE dmh.trang_thai = 'da_nhap_kho'), 0) AS chi_phi_da_nhap
       FROM nha_cung_cap ncc
       LEFT JOIN don_mua_hang dmh ON ncc.id = dmh.ma_nha_cung_cap ${dateFilterPO}
       GROUP BY ncc.id
       ORDER BY tong_chi_phi DESC
       LIMIT 10`,
      params
    );

    // 2. Phân bổ theo loại vật tư
    const byMaterialTypeRes = await db.query(
      `SELECT vt.loai_vat_tu,
              COUNT(DISTINCT dmh.id) AS so_don_mua,
              COALESCE(SUM(ct.thanh_tien) FILTER (WHERE dmh.trang_thai != 'huy'), 0) AS tong_tien,
              COALESCE(SUM(ct.so_luong_dat) FILTER (WHERE dmh.trang_thai != 'huy'), 0) AS tong_so_luong
       FROM chi_tiet_don_mua ct
       JOIN don_mua_hang dmh ON ct.ma_don_mua_hang = dmh.id ${dateFilterPO}
       JOIN vat_tu vt ON ct.ma_vat_tu = vt.id
       GROUP BY vt.loai_vat_tu
       ORDER BY tong_tien DESC`,
      params
    );

    // 3. Tiến độ thực hiện theo tháng (6 tháng gần nhất)
    const monthlyTrendRes = await db.query(`
      SELECT 
        TO_CHAR(ngay_dat_hang, 'YYYY-MM') AS thang,
        COUNT(*) AS so_don,
        COALESCE(SUM(tong_thanh_toan) FILTER (WHERE trang_thai != 'huy'), 0) AS gia_tri
      FROM don_mua_hang
      WHERE ngay_dat_hang >= NOW() - INTERVAL '6 months'
      GROUP BY thang
      ORDER BY thang ASC
    `);

    res.json({
      success: true,
      data: {
        bySupplier: bySupplierRes.rows,
        byMaterialType: byMaterialTypeRes.rows,
        monthlyTrend: monthlyTrendRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardStats,
  getCoreKpiContract,
  getSuppliers,
  getSupplierDetail,
  createSupplier,
  updateSupplier,
  getPurchaseOrders,
  getPurchaseOrderDetail,
  createPurchaseOrder,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  updateStatusTransition,
  getReceivingOrders,
  receiveStatusUpdate,
  getReports,
};
