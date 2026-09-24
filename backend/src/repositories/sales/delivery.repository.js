'use strict';

const db = require('../../config/database');
const { withTransaction } = require('../../utils/sales/transaction');
const warehouseIntegration = require('../../services/sales/integration/warehouse.integration');

/**
 * Delivery repository (ported from PH1 `repositories/delivery.repository.ts`).
 *
 * Preserves the exact SQL queries, column selections, table joins, status
 * transition logic (with row-level FOR UPDATE locking inside transaction),
 * and pagination/sorting rules.
 */

const ALLOWED_DELIVERY_SORT_COLUMNS = [
  'id',
  'ma_giao_hang',
  'ngay_giao',
  'trang_thai',
  'ngay_tao',
];

/**
 * Lists deliveries with search, filters, pagination, and sorting.
 * @param {object} filters
 * @returns {Promise<{deliveries: object[], total: number, page: number, pageSize: number, totalPages: number}>}
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
    conditions.push(`(g.ma_giao_hang ILIKE $${pIdx} OR g.ten_nguoi_nhan ILIKE $${pIdx})`);
  }

  if (filters.ma_don_ban_hang) {
    params.push(filters.ma_don_ban_hang);
    conditions.push(`g.ma_don_ban_hang = $${params.length}`);
  }

  if (filters.ma_kho) {
    params.push(filters.ma_kho);
    conditions.push(`g.ma_kho = $${params.length}`);
  }

  if (filters.trang_thai) {
    params.push(filters.trang_thai);
    conditions.push(`g.trang_thai = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  let sortColumn = 'ngay_giao';
  if (filters.sortBy && ALLOWED_DELIVERY_SORT_COLUMNS.includes(filters.sortBy)) {
    sortColumn = filters.sortBy;
  }
  const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';

  const countSql = `SELECT COUNT(*) AS total FROM giao_hang g ${whereClause}`;
  const countRes = await db.query(countSql, params);
  const total = Number(countRes.rows[0]?.total || 0);
  const totalPages = Math.ceil(total / pageSize) || 1;

  params.push(pageSize);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const dataSql = `
      SELECT g.id, g.ma_giao_hang, g.ma_don_ban_hang, o.ma_don_ban, c.ten_khach_hang,
             g.ma_kho, k.ten_kho, g.ngay_giao, g.ten_nguoi_nhan, g.dia_chi_giao,
             g.phuong_tien_van_chuyen, g.nguoi_giao_hang, u.ho_ten AS ten_nguoi_giao,
             g.ghi_chu, g.trang_thai, g.ngay_tao, g.ngay_cap_nhat, g.nguoi_tao, g.nguoi_cap_nhat
      FROM giao_hang g
      LEFT JOIN don_ban_hang o ON o.id = g.ma_don_ban_hang
      LEFT JOIN khach_hang c ON c.id = o.ma_khach_hang
      LEFT JOIN kho k ON k.id = g.ma_kho
      LEFT JOIN nguoi_dung u ON u.id = g.nguoi_giao_hang
      ${whereClause}
      ORDER BY g.${sortColumn} ${sortOrder}, g.id DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

  const dataRes = await db.query(dataSql, params);

  return {
    deliveries: dataRes.rows,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Finds a delivery record by its primary key ID.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  const sql = `
      SELECT g.id, g.ma_giao_hang, g.ma_don_ban_hang, o.ma_don_ban, c.ten_khach_hang,
             g.ma_kho, k.ten_kho, g.ngay_giao, g.ten_nguoi_nhan, g.dia_chi_giao,
             g.phuong_tien_van_chuyen, g.nguoi_giao_hang, u.ho_ten AS ten_nguoi_giao,
             g.ghi_chu, g.trang_thai, g.ngay_tao, g.ngay_cap_nhat, g.nguoi_tao, g.nguoi_cap_nhat
      FROM giao_hang g
      LEFT JOIN don_ban_hang o ON o.id = g.ma_don_ban_hang
      LEFT JOIN khach_hang c ON c.id = o.ma_khach_hang
      LEFT JOIN kho k ON k.id = g.ma_kho
      LEFT JOIN nguoi_dung u ON u.id = g.nguoi_giao_hang
      WHERE g.id = $1
      LIMIT 1
    `;
  const res = await db.query(sql, [id]);
  return res.rows[0] || null;
}

/**
 * Finds a delivery record by its unique code (case-insensitive).
 * @param {string} code
 * @returns {Promise<object|null>}
 */
async function findByCode(code) {
  const sql = `
      SELECT g.id, g.ma_giao_hang, g.ma_don_ban_hang, o.ma_don_ban, c.ten_khach_hang,
             g.ma_kho, k.ten_kho, g.ngay_giao, g.ten_nguoi_nhan, g.dia_chi_giao,
             g.phuong_tien_van_chuyen, g.nguoi_giao_hang, u.ho_ten AS ten_nguoi_giao,
             g.ghi_chu, g.trang_thai, g.ngay_tao, g.ngay_cap_nhat, g.nguoi_tao, g.nguoi_cap_nhat
      FROM giao_hang g
      LEFT JOIN don_ban_hang o ON o.id = g.ma_don_ban_hang
      LEFT JOIN khach_hang c ON c.id = o.ma_khach_hang
      LEFT JOIN kho k ON k.id = g.ma_kho
      LEFT JOIN nguoi_dung u ON u.id = g.nguoi_giao_hang
      WHERE UPPER(g.ma_giao_hang) = UPPER($1)
      LIMIT 1
    `;
  const res = await db.query(sql, [code.trim()]);
  return res.rows[0] || null;
}

/**
 * Creates a new delivery record.
 * @param {object} params
 * @returns {Promise<object>}
 */
async function create(params) {
  const sql = `
      INSERT INTO giao_hang (
        ma_giao_hang, ma_don_ban_hang, ma_kho, ngay_giao,
        ten_nguoi_nhan, dia_chi_giao, phuong_tien_van_chuyen,
        nguoi_giao_hang, ghi_chu, trang_thai,
        nguoi_tao, nguoi_cap_nhat
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, 'cho_giao',
        $10, $10
      )
      RETURNING *
    `;
  const res = await db.query(sql, [
    params.ma_giao_hang,
    params.ma_don_ban_hang,
    params.ma_kho,
    params.ngay_giao,
    params.ten_nguoi_nhan,
    params.dia_chi_giao,
    params.phuong_tien_van_chuyen,
    params.nguoi_giao_hang,
    params.ghi_chu,
    params.creatorId,
  ]);
  return res.rows[0];
}

/**
 * Updates status of a delivery directly.
 * @param {number} id
 * @param {string} status
 * @param {number} updaterId
 * @param {{ ghi_chu?: string|null }} [extra]
 * @returns {Promise<object|null>}
 */
async function updateStatus(id, status, updaterId, extra) {
  const fields = ['trang_thai = $2', 'nguoi_cap_nhat = $3', 'ngay_cap_nhat = NOW()'];
  const params = [id, status, updaterId];

  if (extra && extra.ghi_chu !== undefined) {
    params.push(extra.ghi_chu);
    fields.push(`ghi_chu = $${params.length}`);
  }

  const sql = `
      UPDATE giao_hang
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
  const res = await db.query(sql, params);
  return res.rows[0] || null;
}

/**
 * Atomically validates expectedStatus and transitions to newStatus inside a transaction
 * with row-level locking (SELECT ... FOR UPDATE).
 * @param {number} id
 * @param {string} expectedStatus
 * @param {string} newStatus
 * @param {number} updaterId
 * @param {{ ghi_chu?: string|null }} [extra]
 * @returns {Promise<{success: boolean, currentRecord: object|null}>}
 */
async function transitionStatus(id, expectedStatus, newStatus, updaterId, extra) {
  return withTransaction(async (client) => {
    const selectSql = `
        SELECT g.id, g.ma_giao_hang, g.ma_don_ban_hang, o.ma_don_ban, c.ten_khach_hang,
               g.ma_kho, k.ten_kho, g.ngay_giao, g.ten_nguoi_nhan, g.dia_chi_giao,
               g.phuong_tien_van_chuyen, g.nguoi_giao_hang, u.ho_ten AS ten_nguoi_giao,
               g.ghi_chu, g.trang_thai, g.ngay_tao, g.ngay_cap_nhat, g.nguoi_tao, g.nguoi_cap_nhat
        FROM giao_hang g
        LEFT JOIN don_ban_hang o ON o.id = g.ma_don_ban_hang
        LEFT JOIN khach_hang c ON c.id = o.ma_khach_hang
        LEFT JOIN kho k ON k.id = g.ma_kho
        LEFT JOIN nguoi_dung u ON u.id = g.nguoi_giao_hang
        WHERE g.id = $1
        FOR UPDATE OF g
      `;
    const selectRes = await client.query(selectSql, [id]);
    const current = selectRes.rows[0] || null;
    if (!current) {
      return { success: false, currentRecord: null };
    }

    if (current.trang_thai !== expectedStatus) {
      return { success: false, currentRecord: current };
    }

    const fields = ['trang_thai = $2', 'nguoi_cap_nhat = $3', 'ngay_cap_nhat = NOW()'];
    const params = [id, newStatus, updaterId];

    if (extra && extra.ghi_chu !== undefined) {
      params.push(extra.ghi_chu);
      fields.push(`ghi_chu = $${params.length}`);
    }

    const updateSql = `
        UPDATE giao_hang
        SET ${fields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;
    const updateRes = await client.query(updateSql, params);
    const updated = {
      ...current,
      ...updateRes.rows[0],
    };

    return { success: true, currentRecord: updated };
  });
}

/**
 * Completes a delivery atomically.
 *
 * One transaction covers the whole fulfilment: the delivery row is locked, the
 * warehouse integration writes the `giao_khach` issue note, deducts `ton_kho`
 * and advances `so_luong_giao`, and only then does the delivery move to
 * `da_giao` (the warehouse integration also marks the order delivered).
 *
 * Idempotent: a delivery that is already `da_giao` is returned untouched, so a
 * retried request can never deduct stock a second time.
 *
 * @param {number} id
 * @param {number|null} updaterId
 * @returns {Promise<{success: boolean, alreadyCompleted: boolean, currentRecord: object|null, fulfillment: object|null}>}
 */
async function completeDeliveryAtomic(id, updaterId) {
  return withTransaction(async (client) => {
    const selectSql = `
        SELECT g.id, g.ma_giao_hang, g.ma_don_ban_hang, o.ma_don_ban, c.ten_khach_hang,
               g.ma_kho, k.ten_kho, g.ngay_giao, g.ten_nguoi_nhan, g.dia_chi_giao,
               g.phuong_tien_van_chuyen, g.nguoi_giao_hang, u.ho_ten AS ten_nguoi_giao,
               g.ghi_chu, g.trang_thai, g.ngay_tao, g.ngay_cap_nhat, g.nguoi_tao, g.nguoi_cap_nhat
        FROM giao_hang g
        LEFT JOIN don_ban_hang o ON o.id = g.ma_don_ban_hang
        LEFT JOIN khach_hang c ON c.id = o.ma_khach_hang
        LEFT JOIN kho k ON k.id = g.ma_kho
        LEFT JOIN nguoi_dung u ON u.id = g.nguoi_giao_hang
        WHERE g.id = $1
        FOR UPDATE OF g
      `;
    const selectRes = await client.query(selectSql, [id]);
    const current = selectRes.rows[0] || null;

    if (!current) {
      return { success: false, alreadyCompleted: false, currentRecord: null, fulfillment: null };
    }
    if (current.trang_thai === 'da_giao') {
      return { success: true, alreadyCompleted: true, currentRecord: current, fulfillment: null };
    }
    if (current.trang_thai !== 'dang_giao') {
      return { success: false, alreadyCompleted: false, currentRecord: current, fulfillment: null };
    }

    const fulfillment = await warehouseIntegration.fulfillDelivery(client, {
      delivery: current,
      actorId: updaterId,
    });

    const updateSql = `
        UPDATE giao_hang
        SET trang_thai = 'da_giao',
            nguoi_cap_nhat = $2,
            ngay_cap_nhat = NOW()
        WHERE id = $1
        RETURNING *
      `;
    const updateRes = await client.query(updateSql, [id, updaterId]);

    return {
      success: true,
      alreadyCompleted: false,
      currentRecord: { ...current, ...updateRes.rows[0] },
      fulfillment,
    };
  });
}

/**
 * Checks whether warehouse exists and has status 'hoat_dong'.
 * @param {number} warehouseId
 * @returns {Promise<boolean>}
 */
async function checkWarehouseActive(warehouseId) {
  const res = await db.query(
    `SELECT id FROM kho WHERE id = $1 AND trang_thai = 'hoat_dong' LIMIT 1`,
    [warehouseId]
  );
  return res.rows.length > 0;
}

/**
 * Checks whether order exists for delivery.
 * @param {number} orderId
 * @returns {Promise<{id: number, trang_thai: string, dia_chi_giao_hang: string}|null>}
 */
async function checkOrderForDelivery(orderId) {
  const res = await db.query(
    `SELECT id, trang_thai, dia_chi_giao_hang FROM don_ban_hang WHERE id = $1 LIMIT 1`,
    [orderId]
  );
  return res.rows[0] || null;
}

module.exports = {
  ALLOWED_DELIVERY_SORT_COLUMNS,
  list,
  findById,
  findByCode,
  create,
  updateStatus,
  transitionStatus,
  completeDeliveryAtomic,
  checkWarehouseActive,
  checkOrderForDelivery,
};
