'use strict';

const express = require('express');
const { requireRoles, requirePermission } = require('../../middlewares/auth');
const { orderService } = require('../../services/sales/order.service');
const { sendSuccess, sendPaginated } = require('../../utils/sales/response');
const { parseIdParam } = require('../../utils/sales/request');
const { currentUserId, currentRole } = require('../../utils/sales/identity');

/**
 * Order routes - mounted at `/don-ban-hang` in sales routes.
 *
 * Authorization guards, by ruling R-2:
 *  - reads keep PH1's role set (`admin`, `ban_hang`, `kho`, `ke_toan`) because no
 *    shipped permission covers it (`sales.view` omits `kho`/`ke_toan`);
 *  - writes use the shipped `sales.*` permissions, whose holder sets are exactly
 *    PH1's: create/update -> {`ban_hang`, `admin`}, confirm -> `sales.approve`.
 */
function createOrderRoutes(service = orderService) {
  const router = express.Router();

  // 1. List sales orders
  router.get('/', requireRoles('admin', 'ban_hang', 'kho', 'ke_toan'), async (req, res, next) => {
    try {
      const result = await service.listOrders(req.query);
      sendPaginated(
        res,
        result.orders,
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

  // 2. Create sales order
  router.post('/', requirePermission('sales.create'), async (req, res, next) => {
    try {
      const order = await service.createOrder(req.body, currentUserId(req));
      sendSuccess(res, order, 'Tạo đơn bán hàng thành công.', 201);
    } catch (err) {
      next(err);
    }
  });

  // 3. Get sales order detail
  router.get('/:id', requireRoles('admin', 'ban_hang', 'kho', 'ke_toan'), async (req, res, next) => {
    try {
      const order = await service.getOrderById(parseIdParam(req.params.id, 'id', 'Mã đơn bán hàng'));
      sendSuccess(res, order);
    } catch (err) {
      next(err);
    }
  });

  // 4. Update pending sales order
  router.patch('/:id', requirePermission('sales.update'), async (req, res, next) => {
    try {
      const updated = await service.updateOrder(parseIdParam(req.params.id, 'id', 'Mã đơn bán hàng'), req.body, currentUserId(req));
      sendSuccess(res, updated, 'Cập nhật đơn bán hàng thành công.');
    } catch (err) {
      next(err);
    }
  });

  // 5. Confirm sales order
  router.post('/:id/confirm', requirePermission('sales.approve'), async (req, res, next) => {
    try {
      const confirmed = await service.confirmOrder(parseIdParam(req.params.id, 'id', 'Mã đơn bán hàng'), req.body, currentUserId(req));
      sendSuccess(res, confirmed, 'Xác nhận đơn bán hàng thành công.');
    } catch (err) {
      next(err);
    }
  });

  // 6. Cancel sales order
  router.post('/:id/cancel', requirePermission('sales.update'), async (req, res, next) => {
    try {
      const cancelled = await service.cancelOrder(
        parseIdParam(req.params.id, 'id', 'Mã đơn bán hàng'),
        req.body,
        currentUserId(req),
        currentRole(req)
      );
      sendSuccess(res, cancelled, 'Hủy đơn bán hàng thành công.');
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createOrderRoutes();
module.exports.createOrderRoutes = createOrderRoutes;
