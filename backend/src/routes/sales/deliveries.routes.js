'use strict';

const express = require('express');
const { requireRoles } = require('../../middlewares/auth');
const { deliveryService } = require('../../services/sales/delivery.service');
const { sendSuccess, sendPaginated } = require('../../utils/sales/response');
const { parseIdParam } = require('../../utils/sales/request');

/**
 * Delivery routes - mounted at `/giao-hang` in sales routes.
 *
 * Authorization guards follow the Core permission matrix:
 *  - read endpoints keep PH1's role set (`admin`, `ban_hang`, `kho`) because no
 *    shipped permission matches it exactly (`kho.view` also covers `ke_toan`);
 *  - the create endpoint keeps PH1's role set (`admin`, `kho`, `ban_hang`)
 *    because no shipped permission covers it;
 *  - the lifecycle transitions (`start`, `complete`, `fail`) stay role-gated
 *    (`admin`, `kho`) per ruling R-1: `kho` holds no `sales.*` permission.
 */
function createDeliveryRoutes(service = deliveryService) {
  const router = express.Router();

  // 1. List deliveries (allowed for admin, ban_hang, kho)
  router.get('/', requireRoles('admin', 'ban_hang', 'kho'), async (req, res, next) => {
    try {
      const result = await service.listDeliveries(req.query);
      sendPaginated(
        res,
        result.deliveries,
        {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        },
        null,
        200
      );
    } catch (err) {
      next(err);
    }
  });

  // 2. Create delivery header (allowed for admin, kho, ban_hang)
  router.post('/', requireRoles('admin', 'kho', 'ban_hang'), async (req, res, next) => {
    try {
      const userId = (req.user && req.user.id) || 1;
      const delivery = await service.createDelivery(req.body, userId);
      sendSuccess(res, delivery, 'Tạo đợt giao hàng thành công.', 201);
    } catch (err) {
      next(err);
    }
  });

  // 3. Get delivery detail
  router.get('/:id', requireRoles('admin', 'ban_hang', 'kho'), async (req, res, next) => {
    try {
      const delivery = await service.getDeliveryById(parseIdParam(req.params.id, 'id', 'Mã đơn giao hàng'));
      sendSuccess(res, delivery);
    } catch (err) {
      next(err);
    }
  });

  // 4. Start delivery (dispatches delivery: dang_giao) - admin & kho ONLY
  router.post('/:id/start', requireRoles('admin', 'kho'), async (req, res, next) => {
    try {
      const userId = (req.user && req.user.id) || 1;
      const updated = await service.startDelivery(parseIdParam(req.params.id, 'id', 'Mã đơn giao hàng'), userId);
      sendSuccess(res, updated, 'Bắt đầu vận chuyển đợt giao hàng thành công.');
    } catch (err) {
      next(err);
    }
  });

  // 5. Complete delivery (da_giao) - admin & kho ONLY
  router.post('/:id/complete', requireRoles('admin', 'kho'), async (req, res, next) => {
    try {
      const userId = (req.user && req.user.id) || 1;
      const updated = await service.completeDelivery(parseIdParam(req.params.id, 'id', 'Mã đơn giao hàng'), userId);
      sendSuccess(res, updated, 'Hoàn thành đợt giao hàng thành công.');
    } catch (err) {
      next(err);
    }
  });

  // 6. Fail delivery (that_bai) - admin & kho ONLY
  router.post('/:id/fail', requireRoles('admin', 'kho'), async (req, res, next) => {
    try {
      const userId = (req.user && req.user.id) || 1;
      const updated = await service.failDelivery(parseIdParam(req.params.id, 'id', 'Mã đơn giao hàng'), req.body, userId);
      sendSuccess(res, updated, 'Đã cập nhật trạng thái giao hàng thất bại.');
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createDeliveryRoutes();
module.exports.createDeliveryRoutes = createDeliveryRoutes;
