'use strict';

const { AppError, ConflictError } = require('../../../utils/sales/errors');
const { generateUniqueCode } = require('./codeGenerator');

/**
 * Sales -> Warehouse (PH4) integration service: delivery fulfilment.
 *
 * This is the **only** place in the Sales module that writes warehouse tables
 * (`phieu_xuat_kho`, `chi_tiet_phieu_xuat`, `ton_kho`). The sales services call
 * it with their own transaction client, so the stock movement is part of the
 * same transaction as the delivery status change (contract §11).
 *
 * Stock item resolution is explicit: a product points at the warehouse item it
 * is drawn from through `san_pham.ma_vat_tu_ton_kho`. Products without that
 * link are refused (`PRODUCT_STOCK_ITEM_NOT_FOUND`) instead of guessing, because
 * `ton_kho.ma_vat_tu` references `vat_tu`, not `san_pham`.
 */

/** `phieu_xuat_kho.loai_xuat` value for a delivery to a customer. */
const XUAT_GIAO_KHACH = 'giao_khach';

const PRODUCT_NOT_STOCKED_MESSAGE =
  'chưa được gắn mặt hàng tồn kho. Vui lòng cấu hình mặt hàng tồn kho cho sản phẩm trước khi giao hàng.';

/**
 * Locks and returns the order lines that still have quantity to deliver.
 *
 * @param {import('pg').PoolClient} client
 * @param {number} orderId
 * @returns {Promise<object[]>}
 */
async function lockDeliverableLines(client, orderId) {
  const result = await client.query(
    `SELECT l.id, l.ma_san_pham, sp.ma_san_pham AS ma_san_pham_code, sp.ten_san_pham,
            sp.ma_vat_tu_ton_kho, l.so_luong, l.so_luong_giao, l.don_gia
     FROM chi_tiet_don_ban_hang l
     JOIN san_pham sp ON sp.id = l.ma_san_pham
     WHERE l.ma_don_ban_hang = $1
     ORDER BY l.id
     FOR UPDATE OF l`,
    [orderId]
  );
  return result.rows;
}

/**
 * Locks the warehouse balance of one stock item.
 *
 * @param {import('pg').PoolClient} client
 * @param {number} warehouseId
 * @param {number} stockItemId `vat_tu.id`
 * @returns {Promise<{id: number, so_luong_ton: string, ma_vat_tu: string, ten_vat_tu: string}|null>}
 */
async function lockStockBalance(client, warehouseId, stockItemId) {
  const result = await client.query(
    `SELECT tk.id, tk.so_luong_ton, vt.ma_vat_tu, vt.ten_vat_tu
     FROM ton_kho tk
     JOIN vat_tu vt ON vt.id = tk.ma_vat_tu
     WHERE tk.ma_kho = $1 AND tk.ma_vat_tu = $2
     FOR UPDATE OF tk`,
    [warehouseId, stockItemId]
  );
  return result.rows[0] || null;
}

/**
 * Executes warehouse fulfilment for a delivery inside the caller's transaction:
 * validates stock, writes the `giao_khach` issue note, deducts `ton_kho`,
 * advances `chi_tiet_don_ban_hang.so_luong_giao`, and marks the order delivered.
 *
 * Idempotency is owned by the caller: it locks the delivery and only calls this
 * function when the delivery actually transitions into `da_giao`. Lines that are
 * already fully delivered are skipped, so re-running can never deduct twice.
 *
 * @param {import('pg').PoolClient} client
 * @param {{ delivery: object, actorId: number|null }} params
 * @returns {Promise<{fulfilled: boolean, phieu_xuat: object|null, lines: object[], totalValue: number}>}
 */
async function fulfillDelivery(client, { delivery, actorId }) {
  const orderId = Number(delivery.ma_don_ban_hang);
  const warehouseId = Number(delivery.ma_kho);

  const candidateLines = await lockDeliverableLines(client, orderId);
  const requested = [];

  for (const line of candidateLines) {
    const remaining = Number(line.so_luong) - Number(line.so_luong_giao);
    if (remaining <= 0) continue;

    if (!line.ma_vat_tu_ton_kho) {
      throw new AppError(
        422,
        'PRODUCT_STOCK_ITEM_NOT_FOUND',
        `Sản phẩm "${line.ten_san_pham}" (${line.ma_san_pham_code}) ${PRODUCT_NOT_STOCKED_MESSAGE}`,
        [{ field: 'lines', message: `Sản phẩm ${line.ma_san_pham_code} chưa được gắn mặt hàng tồn kho.` }]
      );
    }

    const balance = await lockStockBalance(client, warehouseId, Number(line.ma_vat_tu_ton_kho));
    const onHand = balance ? Number(balance.so_luong_ton) : 0;
    const stockCode = balance ? balance.ma_vat_tu : null;

    if (onHand < remaining) {
      const label = balance ? `[${balance.ma_vat_tu}] ${balance.ten_vat_tu}` : line.ten_san_pham;
      const message = `Không đủ tồn kho để giao hàng: ${label} chỉ còn ${onHand}, cần xuất ${remaining}.`;
      throw new ConflictError('INSUFFICIENT_STOCK', message, [
        { field: 'lines', message },
      ]);
    }

    requested.push({
      lineId: line.id,
      stockItemId: Number(line.ma_vat_tu_ton_kho),
      stockCode,
      quantity: remaining,
      unitPrice: Number(line.don_gia) || 0,
      balanceId: balance.id,
    });
  }

  const totalValue = requested.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  let issueNote = null;
  if (requested.length > 0) {
    const maPhieuXuat = await generateUniqueCode(client, 'phieu_xuat_kho');
    const noteResult = await client.query(
      `INSERT INTO phieu_xuat_kho (
         ma_phieu_xuat, loai_xuat, ma_don_ban_hang, ma_lenh_san_xuat,
         ma_kho_xuat, ngay_xuat, thu_kho, nguoi_nhan,
         tong_gia_tri_xuat, ghi_chu, trang_thai, nguoi_tao, nguoi_cap_nhat
       ) VALUES (
         $1, $2, $3, NULL,
         $4, COALESCE($5, NOW()), $6, $7,
         $8, $9, 'da_xuat', $6, $6
       )
       RETURNING *`,
      [
        maPhieuXuat,
        XUAT_GIAO_KHACH,
        orderId,
        warehouseId,
        delivery.ngay_giao || null,
        actorId,
        delivery.ten_nguoi_nhan || null,
        totalValue,
        `Xuất kho giao khách theo đợt giao hàng ${delivery.ma_giao_hang} (đơn ${delivery.ma_don_ban || orderId}).`,
      ]
    );
    issueNote = noteResult.rows[0];

    for (const item of requested) {
      const lineValue = item.quantity * item.unitPrice;
      await client.query(
        `INSERT INTO chi_tiet_phieu_xuat (
           ma_phieu_xuat_kho, ma_vat_tu, ma_lo_vat_tu,
           so_luong_xuat, don_gia_xuat, thanh_tien, ghi_chu, nguoi_tao
         ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7)`,
        [
          issueNote.id,
          item.stockItemId,
          item.quantity,
          item.unitPrice,
          lineValue,
          `Đơn bán hàng #${orderId}`,
          actorId,
        ]
      );

      // Same deduction shape as PH4's own `POST /api/v1/phieu-xuat`.
      await client.query(
        `UPDATE ton_kho
         SET so_luong_ton = so_luong_ton - $1,
             gia_tri_ton_kho = GREATEST(0, gia_tri_ton_kho - $2),
             ngay_cap_nhat = NOW(),
             nguoi_cap_nhat = $3
         WHERE id = $4`,
        [item.quantity, lineValue, actorId, item.balanceId]
      );

      await client.query(
        `UPDATE chi_tiet_don_ban_hang
         SET so_luong_giao = so_luong_giao + $1,
             trang_thai = CASE
               WHEN so_luong_giao + $1 >= so_luong THEN 'da_giao_du'
               ELSE 'giao_mot_phan'
             END
         WHERE id = $2`,
        [item.quantity, item.lineId]
      );
    }
  }

  const orderResult = await client.query(
    `UPDATE don_ban_hang
     SET trang_thai = 'da_giao',
         ngay_giao_thuc_te = NOW(),
         nguoi_cap_nhat = $2,
         ngay_cap_nhat = NOW()
     WHERE id = $1
     RETURNING *`,
    [orderId, actorId]
  );

  return {
    fulfilled: requested.length > 0,
    phieu_xuat: issueNote,
    lines: requested,
    totalValue,
    order: orderResult.rows[0] || null,
  };
}

module.exports = {
  XUAT_GIAO_KHACH,
  fulfillDelivery,
};
