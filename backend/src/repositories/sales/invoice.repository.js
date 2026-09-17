'use strict';

const db = require('../../config/database');
const { withTransaction } = require('../../utils/sales/transaction');

/**
 * Invoice repository (ported from PH1 `repositories/invoice.repository.ts`).
 *
 * Preserves the exact SQL queries, column selections, table joins,
 * atomic creation with row-level FOR UPDATE locking inside transaction,
 * due-date derivation, invoice code generation, and pagination/sorting rules.
 */

const ALLOWED_INVOICE_SORT_COLUMNS = [
  'id',
  'ma_hoa_don',
  'ngay_xuat_hoa_don',
  'ngay_dao_han',
  'tong_tien_sau_thue',
  'so_tien_da_thu',
  'trang_thai',
  'ngay_tao',
];

/**
 * Normalizes an invoice record by dynamically deriving its status based on
 * current payments and due date.
 *
 * @param {object} r
 * @returns {object}
 */
function normalizeInvoiceRecord(r) {
  const paid = Number(r.so_tien_da_thu) || 0;
  const total = Number(r.tong_tien_sau_thue) || 0;
  const dueDate = new Date(r.ngay_dao_han);

  let currentStatus = r.trang_thai;
  if (paid >= total) {
    currentStatus = 'da_thanh_toan';
  } else if (dueDate.getTime() < Date.now()) {
    currentStatus = 'qua_han';
  } else if (paid > 0) {
    currentStatus = 'thanh_toan_mot_phan';
  } else {
    currentStatus = 'chua_thanh_toan';
  }

  return {
    ...r,
    trang_thai: currentStatus,
  };
}

/**
 * Lists invoices with search, filters, pagination, and sorting.
 *
 * @param {object} filters
 * @returns {Promise<{invoices: object[], total: number, page: number, pageSize: number, totalPages: number}>}
 */
async function list(filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const conditions = [];
  const params = [];

  if (filters.search && filters.search.trim().length > 0) {
    params.push(`%${filters.search.trim()}%`);
    const pIdx = params.length;
    conditions.push(`(h.ma_hoa_don ILIKE $${pIdx} OR c.ten_khach_hang ILIKE $${pIdx})`);
  }

  if (filters.ma_hoa_don && filters.ma_hoa_don.trim().length > 0) {
    params.push(`%${filters.ma_hoa_don.trim()}%`);
    conditions.push(`h.ma_hoa_don ILIKE $${params.length}`);
  }

  if (filters.ma_don_ban_hang) {
    params.push(filters.ma_don_ban_hang);
    conditions.push(`h.ma_don_ban_hang = $${params.length}`);
  }

  if (filters.ma_khach_hang) {
    params.push(filters.ma_khach_hang);
    conditions.push(`h.ma_khach_hang = $${params.length}`);
  }

  if (filters.trang_thai) {
    params.push(filters.trang_thai);
    conditions.push(`h.trang_thai = $${params.length}`);
  }

  if (filters.fromDate) {
    params.push(filters.fromDate);
    conditions.push(`h.ngay_xuat_hoa_don >= $${params.length}`);
  }

  if (filters.toDate) {
    params.push(filters.toDate);
    conditions.push(`h.ngay_xuat_hoa_don <= $${params.length}`);
  }

  if (filters.dueFromDate) {
    params.push(filters.dueFromDate);
    conditions.push(`h.ngay_dao_han >= $${params.length}`);
  }

  if (filters.dueToDate) {
    params.push(filters.dueToDate);
    conditions.push(`h.ngay_dao_han <= $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  let sortColumn = 'ngay_xuat_hoa_don';
  if (filters.sortBy && ALLOWED_INVOICE_SORT_COLUMNS.includes(filters.sortBy)) {
    sortColumn = filters.sortBy;
  }
  const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';

  const countSql = `
      SELECT COUNT(*) AS total
      FROM hoa_don_ban_hang h
      LEFT JOIN khach_hang c ON c.id = h.ma_khach_hang
      ${whereClause}
    `;
  const countRes = await db.query(countSql, params);
  const total = Number(countRes.rows[0]?.total || 0);
  const totalPages = Math.ceil(total / pageSize) || 1;

  params.push(pageSize);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const dataSql = `
      SELECT h.id, h.ma_hoa_don, h.ma_don_ban_hang, o.ma_don_ban,
             h.ma_khach_hang, c.ten_khach_hang, c.ma_khach_hang AS ma_khach_hang_code,
             h.ngay_xuat_hoa_don, h.ngay_dao_han, h.tong_tien_truoc_thue,
             h.tien_thue, h.tong_tien_sau_thue, h.so_tien_da_thu,
             h.trang_thai, h.ghi_chu, h.ngay_tao, h.ngay_cap_nhat, h.nguoi_tao, h.nguoi_cap_nhat
      FROM hoa_don_ban_hang h
      LEFT JOIN don_ban_hang o ON o.id = h.ma_don_ban_hang
      LEFT JOIN khach_hang c ON c.id = h.ma_khach_hang
      ${whereClause}
      ORDER BY h.${sortColumn} ${sortOrder}, h.id DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

  const dataRes = await db.query(dataSql, params);

  return {
    invoices: dataRes.rows.map(normalizeInvoiceRecord),
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Finds an invoice by its primary key ID.
 *
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  const sql = `
      SELECT h.id, h.ma_hoa_don, h.ma_don_ban_hang, o.ma_don_ban,
             h.ma_khach_hang, c.ten_khach_hang, c.ma_khach_hang AS ma_khach_hang_code,
             h.ngay_xuat_hoa_don, h.ngay_dao_han, h.tong_tien_truoc_thue,
             h.tien_thue, h.tong_tien_sau_thue, h.so_tien_da_thu,
             h.trang_thai, h.ghi_chu, h.ngay_tao, h.ngay_cap_nhat, h.nguoi_tao, h.nguoi_cap_nhat
      FROM hoa_don_ban_hang h
      LEFT JOIN don_ban_hang o ON o.id = h.ma_don_ban_hang
      LEFT JOIN khach_hang c ON c.id = h.ma_khach_hang
      WHERE h.id = $1
      LIMIT 1
    `;
  const res = await db.query(sql, [id]);
  const inv = res.rows[0];
  return inv ? normalizeInvoiceRecord(inv) : null;
}

/**
 * Finds an invoice by its invoice code (case-insensitive).
 *
 * @param {string} code
 * @returns {Promise<object|null>}
 */
async function findByCode(code) {
  const sql = `
      SELECT h.id, h.ma_hoa_don, h.ma_don_ban_hang, o.ma_don_ban,
             h.ma_khach_hang, c.ten_khach_hang, c.ma_khach_hang AS ma_khach_hang_code,
             h.ngay_xuat_hoa_don, h.ngay_dao_han, h.tong_tien_truoc_thue,
             h.tien_thue, h.tong_tien_sau_thue, h.so_tien_da_thu,
             h.trang_thai, h.ghi_chu, h.ngay_tao, h.ngay_cap_nhat, h.nguoi_tao, h.nguoi_cap_nhat
      FROM hoa_don_ban_hang h
      LEFT JOIN don_ban_hang o ON o.id = h.ma_don_ban_hang
      LEFT JOIN khach_hang c ON c.id = h.ma_khach_hang
      WHERE UPPER(h.ma_hoa_don) = UPPER($1)
      LIMIT 1
    `;
  const res = await db.query(sql, [code.trim()]);
  const inv = res.rows[0];
  return inv ? normalizeInvoiceRecord(inv) : null;
}

/**
 * Finds an invoice by its sales order ID.
 *
 * @param {number} orderId
 * @returns {Promise<object|null>}
 */
async function findByOrderId(orderId) {
  const sql = `
      SELECT h.id, h.ma_hoa_don, h.ma_don_ban_hang, o.ma_don_ban,
             h.ma_khach_hang, c.ten_khach_hang, c.ma_khach_hang AS ma_khach_hang_code,
             h.ngay_xuat_hoa_don, h.ngay_dao_han, h.tong_tien_truoc_thue,
             h.tien_thue, h.tong_tien_sau_thue, h.so_tien_da_thu,
             h.trang_thai, h.ghi_chu, h.ngay_tao, h.ngay_cap_nhat, h.nguoi_tao, h.nguoi_cap_nhat
      FROM hoa_don_ban_hang h
      LEFT JOIN don_ban_hang o ON o.id = h.ma_don_ban_hang
      LEFT JOIN khach_hang c ON c.id = h.ma_khach_hang
      WHERE h.ma_don_ban_hang = $1
      LIMIT 1
    `;
  const res = await db.query(sql, [orderId]);
  const inv = res.rows[0];
  return inv ? normalizeInvoiceRecord(inv) : null;
}

/**
 * Creates an invoice directly inside a transaction.
 *
 * @param {object} params
 * @returns {Promise<object>}
 */
async function create(params) {
  return withTransaction(async (client) => {
    const sql = `
        INSERT INTO hoa_don_ban_hang (
          ma_hoa_don, ma_don_ban_hang, ma_khach_hang,
          ngay_xuat_hoa_don, ngay_dao_han,
          tong_tien_truoc_thue, tien_thue, tong_tien_sau_thue,
          so_tien_da_thu, trang_thai, ghi_chu,
          nguoi_tao, nguoi_cap_nhat
        ) VALUES (
          $1, $2, $3,
          $4, $5,
          $6, $7, $8,
          $9, $10, $11,
          $12, $12
        )
        RETURNING *
      `;
    const res = await client.query(sql, [
      params.ma_hoa_don,
      params.ma_don_ban_hang,
      params.ma_khach_hang,
      params.ngay_xuat_hoa_don,
      params.ngay_dao_han,
      params.tong_tien_truoc_thue,
      params.tien_thue,
      params.tong_tien_sau_thue,
      params.so_tien_da_thu,
      params.trang_thai,
      params.ghi_chu,
      params.creatorId,
    ]);
    return res.rows[0];
  });
}

/**
 * Creates an invoice atomically from an order under FOR UPDATE lock.
 *
 * @param {object} params
 * @returns {Promise<{invoice?: object, error?: string, details?: string}>}
 */
async function createInvoiceAtomic(params) {
  return withTransaction(async (client) => {
    // 1. Lock the order row and join customer to get authoritative credit days
    const orderSql = `
        SELECT o.id, o.ma_don_ban, o.ma_khach_hang, o.trang_thai,
               o.tong_tien_hang, o.tien_thue, o.tien_giam_gia, o.tong_thanh_toan,
               c.so_ngay_cong_no
        FROM don_ban_hang o
        JOIN khach_hang c ON c.id = o.ma_khach_hang
        WHERE o.id = $1
        FOR UPDATE OF o
      `;
    const orderRes = await client.query(orderSql, [params.orderId]);

    const order = orderRes.rows[0];
    if (!order) {
      return { error: 'ORDER_NOT_FOUND', details: 'Đơn bán hàng không tồn tại.' };
    }

    // 2. Validate order state under lock
    if (order.trang_thai === 'cho_xac_nhan' || order.trang_thai === 'huy') {
      return {
        error: 'INVOICE_INVALID_ORDER',
        details: `Không thể xuất hóa đơn cho đơn hàng đang ở trạng thái "${order.trang_thai}". Đơn hàng phải được xác nhận trước.`,
      };
    }

    // 3. Validate customer match under lock
    if (params.expectedCustomerId && params.expectedCustomerId !== Number(order.ma_khach_hang)) {
      return {
        error: 'INVOICE_CUSTOMER_MISMATCH',
        details: 'Khách hàng trong yêu cầu xuất hóa đơn không trùng khớp với khách hàng của đơn hàng.',
      };
    }

    // 4. Validate duplicate under lock
    const dupCheckSql = `
        SELECT id, ma_hoa_don
        FROM hoa_don_ban_hang
        WHERE ma_don_ban_hang = $1
        LIMIT 1
      `;
    const dupRes = await client.query(dupCheckSql, [params.orderId]);
    if (dupRes.rows.length > 0) {
      return {
        error: 'INVOICE_ALREADY_EXISTS',
        details: `Đơn hàng "${order.ma_don_ban}" đã được xuất hóa đơn (${dupRes.rows[0].ma_hoa_don}).`,
      };
    }

    // 5. Calculate authoritative amounts under lock
    const tongTienHang = Number(order.tong_tien_hang) || 0;
    const tienGiamGia = Number(order.tien_giam_gia) || 0;
    const tongTienTruocThue = Math.max(0, tongTienHang - tienGiamGia);
    const tienThue = Number(order.tien_thue) || 0;
    const tongTienSauThue = Number(order.tong_thanh_toan) || 0;

    if (params.paidAmount > tongTienSauThue) {
      return {
        error: 'VALIDATION_ERROR',
        details: 'Số tiền đã thu không được lớn hơn tổng số tiền thanh toán của hóa đơn.',
      };
    }

    // 6. Calculate due date & derive status under lock
    const creditDays = Number(order.so_ngay_cong_no) || 0;
    const dueDate = new Date(params.issueDate.getTime() + creditDays * 24 * 60 * 60 * 1000);

    let derivedStatus = 'chua_thanh_toan';
    if (params.paidAmount >= tongTienSauThue) {
      derivedStatus = 'da_thanh_toan';
    } else if (dueDate.getTime() < Date.now()) {
      derivedStatus = 'qua_han';
    } else if (params.paidAmount > 0) {
      derivedStatus = 'thanh_toan_mot_phan';
    }

    // 7. Generate code under lock with retry guard
    let maHoaDon = '';
    let isUnique = false;
    let attempts = 0;
    const year = new Date().getFullYear();

    while (!isUnique && attempts < 5) {
      attempts++;
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      maHoaDon = `HDBH-${year}-${randomSuffix}`;
      const found = await client.query('SELECT id FROM hoa_don_ban_hang WHERE ma_hoa_don = $1 LIMIT 1', [maHoaDon]);
      if (found.rows.length === 0) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      return {
        error: 'DATABASE_CONFLICT',
        details: 'Không thể tạo mã hóa đơn duy nhất sau nhiều lần thử. Vui lòng thử lại.',
      };
    }

    // 8. Insert invoice atomically
    const insertSql = `
        INSERT INTO hoa_don_ban_hang (
          ma_hoa_don, ma_don_ban_hang, ma_khach_hang,
          ngay_xuat_hoa_don, ngay_dao_han,
          tong_tien_truoc_thue, tien_thue, tong_tien_sau_thue,
          so_tien_da_thu, trang_thai, ghi_chu,
          nguoi_tao, nguoi_cap_nhat
        ) VALUES (
          $1, $2, $3,
          $4, $5,
          $6, $7, $8,
          $9, $10, $11,
          $12, $12
        )
        RETURNING *
      `;
    const insertRes = await client.query(insertSql, [
      maHoaDon,
      order.id,
      order.ma_khach_hang,
      params.issueDate,
      dueDate,
      tongTienTruocThue,
      tienThue,
      tongTienSauThue,
      params.paidAmount,
      derivedStatus,
      params.notes,
      params.creatorId,
    ]);

    return { invoice: insertRes.rows[0] };
  });
}

module.exports = {
  ALLOWED_INVOICE_SORT_COLUMNS,
  normalizeInvoiceRecord,
  list,
  findById,
  findByCode,
  findByOrderId,
  create,
  createInvoiceAtomic,
};

module.exports.invoiceRepository = module.exports;
