'use strict';

const db = require('../../config/database');
const {
  NotFoundError,
  ConflictError,
  AppError,
} = require('../../utils/sales/errors');
const deliveryRepository = require('../../repositories/sales/delivery.repository');

/**
 * Fulfillment Orchestrator Service (PH1 -> PH4)
 *
 * Atomically links PH1 sales delivery completion with PH4 warehouse export:
 *  1. Locks delivery row FOR UPDATE to prevent race conditions and ensure idempotency.
 *  2. Resolves finished goods products to warehouse materials (loai_vat_tu = 'thanh_pham').
 *  3. Locks ton_kho FOR UPDATE and enforces non-negative stock constraint.
 *  4. Inserts phieu_xuat_kho and chi_tiet_phieu_xuat (movement type ISSUE).
 *  5. Decrements ton_kho balance and updates moving-average inventory valuation.
 *  6. Updates cumulative delivered quantity on chi_tiet_don_ban_hang.
 *  7. Transitions giao_hang status to 'da_giao'.
 *
 * Everything executes within a SINGLE PostgreSQL transaction client.
 */

async function dispatchFulfillmentDelivery(deliveryId, updaterId, options = {}) {
  const client = options.client || (await db.getClient());
  const isManagedTransaction = !options.client;

  try {
    if (isManagedTransaction) {
      await client.query('BEGIN');
    }

    // 1. LOCK DELIVERY FIRST (SELECT ... FOR UPDATE)
    const delivery = await deliveryRepository.findByIdForUpdate(client, deliveryId);
    if (!delivery) {
      throw new NotFoundError(
        'DELIVERY_NOT_FOUND',
        `Không tìm thấy đợt giao hàng có ID ${deliveryId}.`
      );
    }

    // 2. IDEMPOTENCY GUARD: Check if already dispatched
    if (delivery.trang_thai === 'da_giao') {
      throw new ConflictError(
        'DELIVERY_ALREADY_DISPATCHED',
        'Đợt giao hàng này đã được xác nhận hoàn thành trước đó. Không thể thực hiện lại.'
      );
    }

    // Check valid status for dispatch
    if (delivery.trang_thai !== 'cho_giao' && delivery.trang_thai !== 'dang_giao') {
      throw new ConflictError(
        'DELIVERY_NOT_READY',
        `Đợt giao hàng không ở trạng thái sẵn sàng để xuất kho (Hiện tại: "${delivery.trang_thai}").`
      );
    }

    // 3. LOAD SALES ORDER AND LINES
    const orderRes = await client.query(
      `SELECT id, ma_don_ban, ma_khach_hang, dia_chi_giao_hang, trang_thai
       FROM don_ban_hang
       WHERE id = $1
       FOR UPDATE`,
      [delivery.ma_don_ban_hang]
    );
    if (orderRes.rows.length === 0) {
      throw new NotFoundError('ORDER_NOT_FOUND', 'Đơn hàng liên kết với đợt giao hàng không tồn tại.');
    }
    const order = orderRes.rows[0];
    if (order.trang_thai === 'huy') {
      throw new AppError(422, 'ORDER_INVALID_STATE', 'Đơn hàng liên kết đã bị hủy.');
    }

    const orderLines = await deliveryRepository.getOrderLinesForFulfillment(client, delivery.ma_don_ban_hang);
    if (!orderLines || orderLines.length === 0) {
      throw new AppError(422, 'ORDER_NO_ITEMS', 'Đơn hàng không có mặt hàng nào để xuất kho giao hàng.');
    }

    // 4. RESOLVE PRODUCT -> FINISHED GOODS MATERIAL AND CHECK STOCKS
    const itemsToFulfill = [];
    let tongGiaTriXuat = 0;

    for (const line of orderLines) {
      const remainingQty = parseFloat(line.so_luong) - parseFloat(line.so_luong_giao);
      if (remainingQty <= 0) {
        continue; // Line already fully delivered
      }

      // Quantity to dispatch for this delivery (cumulative fulfillment)
      const dispatchQty = remainingQty;

      if (dispatchQty <= 0) {
        throw new ConflictError(
          'DELIVERY_QUANTITY_EXCEEDED',
          `Số lượng giao hàng vượt quá số lượng còn lại của mặt hàng [${line.ten_san_pham}].`
        );
      }

      // Resolve product -> vat_tu (loai_vat_tu = 'thanh_pham')
      const vtRes = await client.query(
        `SELECT id, ma_vat_tu, ten_vat_tu, loai_vat_tu, gia_nhap_trung_binh
         FROM vat_tu
         WHERE ma_vat_tu = $1 AND loai_vat_tu = 'thanh_pham'`,
        [line.ma_san_pham_code]
      );

      if (vtRes.rows.length === 0) {
        throw new AppError(
          422,
          'FINISHED_GOODS_NOT_MAPPED',
          `Không tìm thấy mặt hàng thành phẩm tương ứng trong danh mục vật tư cho mã sản phẩm [${line.ma_san_pham_code}].`
        );
      }
      if (vtRes.rows.length > 1) {
        throw new AppError(
          500,
          'DATA_INTEGRITY_ERROR',
          `Xung đột dữ liệu: Có nhiều hơn một bản ghi thành phẩm cho mã [${line.ma_san_pham_code}].`
        );
      }

      const material = vtRes.rows[0];

      // Lock ton_kho row FOR UPDATE
      const tonRes = await client.query(
        `SELECT tk.id, tk.ma_kho, tk.ma_vat_tu, tk.so_luong_ton, tk.gia_tri_ton_kho,
                vt.ten_vat_tu, vt.ma_vat_tu
         FROM ton_kho tk
         JOIN vat_tu vt ON tk.ma_vat_tu = vt.id
         WHERE tk.ma_kho = $1 AND tk.ma_vat_tu = $2
         FOR UPDATE OF tk`,
        [delivery.ma_kho, material.id]
      );

      if (tonRes.rows.length === 0) {
        throw new ConflictError(
          'INSUFFICIENT_STOCK',
          `Mặt hàng [${material.ten_vat_tu}] (${material.ma_vat_tu}) chưa từng có tồn kho tại kho xuất ID ${delivery.ma_kho} (Tồn khả dụng: 0, Yêu cầu xuất: ${dispatchQty}).`
        );
      }

      const tonRecord = tonRes.rows[0];
      const tonHienTai = parseFloat(tonRecord.so_luong_ton);

      if (tonHienTai < dispatchQty) {
        throw new ConflictError(
          'INSUFFICIENT_STOCK',
          `Xung đột tồn kho: Mặt hàng [${tonRecord.ten_vat_tu}] (${tonRecord.ma_vat_tu}) không đủ số lượng để xuất. Tồn khả dụng hiện tại: ${tonHienTai}, Yêu cầu xuất: ${dispatchQty}. Giao dịch bị hủy bỏ.`
        );
      }

      const donGiaXuat = parseFloat(line.don_gia) || parseFloat(material.gia_nhap_trung_binh) || 0;
      const thanhTien = Math.round(dispatchQty * donGiaXuat * 100) / 100;
      tongGiaTriXuat += thanhTien;

      // Cost per unit for inventory value deduction (using moving average cost / gia_nhap_trung_binh)
      const costPerUnit =
        parseFloat(material.gia_nhap_trung_binh) ||
        (tonHienTai > 0 ? parseFloat(tonRecord.gia_tri_ton_kho) / tonHienTai : 0);
      const giaTriGiam = Math.round(dispatchQty * costPerUnit * 100) / 100;

      itemsToFulfill.push({
        line,
        material,
        tonRecord,
        dispatchQty,
        donGiaXuat,
        thanhTien,
        giaTriGiam,
      });
    }

    if (itemsToFulfill.length === 0) {
      throw new ConflictError(
        'DELIVERY_QUANTITY_EXCEEDED',
        'Tất cả mặt hàng trong đơn hàng này đã được giao đủ trước đó.'
      );
    }

    // 5. CREATE PHIEU XUAT KHO (loai_xuat = 'giao_khach')
    const maPhieu = `PXK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const ghiChuPhieu = delivery.ghi_chu
      ? `${delivery.ghi_chu} (Xuất kho giao hàng theo ${delivery.ma_giao_hang})`
      : `Xuất kho giao hàng theo ${delivery.ma_giao_hang}`;

    const pxkRes = await client.query(
      `INSERT INTO phieu_xuat_kho (
         ma_phieu_xuat, loai_xuat, ma_don_ban_hang, ma_lenh_san_xuat,
         ma_kho_xuat, ngay_xuat, thu_kho, nguoi_nhan,
         tong_gia_tri_xuat, ghi_chu, trang_thai, nguoi_tao, nguoi_cap_nhat
       ) VALUES ($1, 'giao_khach', $2, NULL, $3, NOW(), $4, $5, $6, $7, 'da_xuat', $8, $8)
       RETURNING *`,
      [
        maPhieu,
        delivery.ma_don_ban_hang,
        delivery.ma_kho,
        updaterId || delivery.nguoi_giao_hang || 1,
        delivery.ten_nguoi_nhan,
        tongGiaTriXuat,
        ghiChuPhieu,
        updaterId || 1,
      ]
    );
    const phieuXuat = pxkRes.rows[0];

    // 6. INSERT CHI TIET PHIEU XUAT, DEDUCT TON KHO, UPDATE ORDER LINES
    for (const item of itemsToFulfill) {
      // Insert chi_tiet_phieu_xuat
      await client.query(
        `INSERT INTO chi_tiet_phieu_xuat (
           ma_phieu_xuat_kho, ma_vat_tu, ma_lo_vat_tu,
           so_luong_xuat, don_gia_xuat, thanh_tien,
           ghi_chu, nguoi_tao
         ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7)`,
        [
          phieuXuat.id,
          item.material.id,
          item.dispatchQty,
          item.donGiaXuat,
          item.thanhTien,
          item.line.ghi_chu || null,
          updaterId || 1,
        ]
      );

      // Deduct ton_kho
      await client.query(
        `UPDATE ton_kho
         SET so_luong_ton = so_luong_ton - $1,
             gia_tri_ton_kho = GREATEST(0, gia_tri_ton_kho - $2),
             ngay_cap_nhat = NOW(),
             nguoi_cap_nhat = $3
         WHERE id = $4`,
        [item.dispatchQty, item.giaTriGiam, updaterId || 1, item.tonRecord.id]
      );

      // Update chi_tiet_don_ban_hang (cumulative quantity delivered)
      await deliveryRepository.updateOrderLineDeliveredQty(client, item.line.id, item.dispatchQty);
    }

    // 7. CHECK IF ENTIRE ORDER IS DELIVERED AND UPDATE don_ban_hang IF SO
    const checkRemainingLines = await client.query(
      `SELECT COUNT(*) AS unfulfilled_count
       FROM chi_tiet_don_ban_hang
       WHERE ma_don_ban_hang = $1 AND so_luong > so_luong_giao`,
      [delivery.ma_don_ban_hang]
    );
    const unfulfilled = parseInt(checkRemainingLines.rows[0]?.unfulfilled_count || '0', 10);
    if (unfulfilled === 0) {
      await client.query(
        `UPDATE don_ban_hang
         SET trang_thai = 'da_giao', ngay_cap_nhat = NOW(), nguoi_cap_nhat = $1
         WHERE id = $2 AND trang_thai != 'huy'`,
        [updaterId || 1, delivery.ma_don_ban_hang]
      );
    }

    // 8. UPDATE DELIVERY STATUS TO 'da_giao'
    await deliveryRepository.updateDeliveryStatusWithClient(
      client,
      delivery.id,
      'da_giao',
      updaterId || 1
    );

    // 9. RETRIEVE FULL UPDATED DELIVERY RECORD
    const updatedDelivery = await deliveryRepository.findFullDeliveryById(client, delivery.id);

    if (isManagedTransaction) {
      await client.query('COMMIT');
    }

    return {
      ...updatedDelivery,
      phieu_xuat_kho: phieuXuat,
    };
  } catch (error) {
    if (isManagedTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('[FULFILLMENT_ROLLBACK_ERROR]', rollbackErr);
      }
    }
    throw error;
  } finally {
    if (isManagedTransaction) {
      client.release();
    }
  }
}

module.exports = {
  dispatchFulfillmentDelivery,
};
