'use strict';

const { generateUniqueCode } = require('./codeGenerator');

/**
 * Sales -> Production (PH2) integration service.
 *
 * A confirmed sales order becomes production demand: one `lenh_san_xuat` per
 * order line, linked back to the sales order through `lenh_san_xuat.ma_don_ban_hang`
 * - the column PH2 reads to trace an order into the workshop. This is the only
 * place in the Sales module that writes production tables.
 *
 * Idempotency: an order that already owns production orders is left untouched,
 * so confirming twice (or retrying after a timeout) never duplicates demand.
 */

/**
 * Creates the production orders for a confirmed sales order.
 *
 * @param {import('pg').PoolClient} client Caller's transaction client.
 * @param {object} params
 * @param {object} params.order Sales order header (`id`, `ma_don_ban`, dates).
 * @param {object[]} params.lines Order lines (`ma_san_pham`, `so_luong`).
 * @param {number|null} params.actorId
 * @returns {Promise<{created: number, existing: number, orders: object[]}>}
 */
async function syncOrderProductionOrders(client, { order, lines, actorId }) {
  const existingResult = await client.query(
    `SELECT COUNT(*)::int AS total FROM lenh_san_xuat WHERE ma_don_ban_hang = $1`,
    [order.id]
  );
  const existing = existingResult.rows[0] ? Number(existingResult.rows[0].total) : 0;
  if (existing > 0 || !Array.isArray(lines) || lines.length === 0) {
    return { created: 0, existing, orders: [] };
  }

  const orders = [];
  for (const line of lines) {
    const maLenhSanXuat = await generateUniqueCode(client, 'lenh_san_xuat');
    const inserted = await client.query(
      `INSERT INTO lenh_san_xuat (
         ma_lenh_san_xuat, ma_ke_hoach_san_xuat, ma_don_ban_hang, ma_san_pham,
         so_luong_yeu_cau, so_luong_hoan_thanh,
         ngay_bat_dau, ngay_ket_thuc_yc, nguoi_phu_trach, ghi_chu,
         trang_thai, nguoi_tao, nguoi_cap_nhat
       ) VALUES (
         $1, NULL, $2, $3,
         $4, 0,
         $5, $6, NULL, $7,
         'chua_bat_dau', $8, $8
       )
       RETURNING *`,
      [
        maLenhSanXuat,
        order.id,
        line.ma_san_pham,
        line.so_luong,
        order.ngay_dat_hang,
        order.ngay_giao_hang_yc,
        `Lệnh sản xuất cho đơn bán hàng ${order.ma_don_ban}.`,
        actorId,
      ]
    );
    orders.push(inserted.rows[0]);
  }

  return { created: orders.length, existing: 0, orders };
}

/**
 * Reads the production orders a sales order owns.
 *
 * @param {import('pg').Pool|import('pg').PoolClient} client
 * @param {number} orderId
 * @returns {Promise<object[]>}
 */
async function findOrderProductionOrders(client, orderId) {
  const result = await client.query(
    `SELECT id, ma_lenh_san_xuat, ma_don_ban_hang, ma_san_pham, so_luong_yeu_cau,
            so_luong_hoan_thanh, trang_thai, ngay_bat_dau, ngay_ket_thuc_yc
     FROM lenh_san_xuat
     WHERE ma_don_ban_hang = $1
     ORDER BY id`,
    [orderId]
  );
  return result.rows;
}

module.exports = {
  syncOrderProductionOrders,
  findOrderProductionOrders,
};
