'use strict';

const db = require('../../config/database');

/**
 * Product repository (ported from PH1 `repositories/product.repository.ts`).
 *
 * `gia_von` is never selected: cost price is Finance-only in the Core model,
 * so it must not leave the module through a product read.
 */

const ALLOWED_PRODUCT_SORT_COLUMNS = [
  'id',
  'ma_san_pham',
  'ten_san_pham',
  'gia_ban',
  'size',
  'mau_sac',
  'trang_thai',
  'ngay_tao',
];

async function list(filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const conditions = [];
  const params = [];

  // Search by code or name
  if (filters.search && filters.search.trim().length > 0) {
    params.push(`%${filters.search.trim()}%`);
    const pIdx = params.length;
    conditions.push(`(sp.ma_san_pham ILIKE $${pIdx} OR sp.ten_san_pham ILIKE $${pIdx})`);
  }

  if (filters.size && filters.size.trim().length > 0) {
    params.push(filters.size.trim());
    conditions.push(`sp.size = $${params.length}`);
  }

  if (filters.mau_sac && filters.mau_sac.trim().length > 0) {
    params.push(filters.mau_sac.trim());
    conditions.push(`sp.mau_sac = $${params.length}`);
  }

  // Default to 'dang_ban' if not explicitly provided
  if (filters.trang_thai) {
    params.push(filters.trang_thai);
    conditions.push(`sp.trang_thai = $${params.length}`);
  } else {
    conditions.push(`sp.trang_thai = 'dang_ban'`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Whitelist sorting
  let sortColumn = 'ten_san_pham';
  if (filters.sortBy && ALLOWED_PRODUCT_SORT_COLUMNS.includes(filters.sortBy)) {
    sortColumn = filters.sortBy;
  }
  const sortOrder = filters.sortOrder === 'DESC' ? 'DESC' : 'ASC';

  // Count Total
  const countSql = `SELECT COUNT(*) AS total FROM san_pham sp ${whereClause}`;
  const countResult = await db.query(countSql, params);
  const total = Number(countResult.rows[0]?.total || 0);
  const totalPages = Math.ceil(total / pageSize) || 1;

  // Fetch Items - strictly exclude gia_von from SELECT
  params.push(pageSize);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const dataSql = `
      SELECT sp.id, sp.ma_san_pham, sp.ten_san_pham, sp.mo_ta,
             sp.ma_don_vi_tinh, dvt.ten_don_vi, sp.gia_ban,
             sp.size, sp.mau_sac, sp.trang_thai,
             sp.ngay_tao, sp.ngay_cap_nhat
      FROM san_pham sp
      LEFT JOIN don_vi_tinh dvt ON dvt.id = sp.ma_don_vi_tinh
      ${whereClause}
      ORDER BY sp.${sortColumn} ${sortOrder}, sp.id ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

  const dataResult = await db.query(dataSql, params);

  return {
    products: dataResult.rows,
    total,
    page,
    pageSize,
    totalPages,
  };
}

async function findById(id) {
  const sql = `
      SELECT sp.id, sp.ma_san_pham, sp.ten_san_pham, sp.mo_ta,
             sp.ma_don_vi_tinh, dvt.ten_don_vi, sp.gia_ban,
             sp.size, sp.mau_sac, sp.trang_thai,
             sp.ngay_tao, sp.ngay_cap_nhat
      FROM san_pham sp
      LEFT JOIN don_vi_tinh dvt ON dvt.id = sp.ma_don_vi_tinh
      WHERE sp.id = $1
      LIMIT 1
    `;
  const result = await db.query(sql, [id]);
  return result.rows[0] || null;
}

async function findByCode(code) {
  const sql = `
      SELECT sp.id, sp.ma_san_pham, sp.ten_san_pham, sp.mo_ta,
             sp.ma_don_vi_tinh, dvt.ten_don_vi, sp.gia_ban,
             sp.size, sp.mau_sac, sp.trang_thai,
             sp.ngay_tao, sp.ngay_cap_nhat
      FROM san_pham sp
      LEFT JOIN don_vi_tinh dvt ON dvt.id = sp.ma_don_vi_tinh
      WHERE UPPER(sp.ma_san_pham) = UPPER($1)
      LIMIT 1
    `;
  const result = await db.query(sql, [code.trim()]);
  return result.rows[0] || null;
}

module.exports = {
  ALLOWED_PRODUCT_SORT_COLUMNS,
  list,
  findById,
  findByCode,
};
