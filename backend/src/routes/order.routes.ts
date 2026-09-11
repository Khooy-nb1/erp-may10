import { Router } from 'express';
import { orderService } from '../services/order.service.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

export function createOrderRoutes(service = orderService, auth = authenticate): Router {
  const router = Router();

  router.use(auth);

  // 1. List sales orders
  router.get('/', requireRole('admin', 'ban_hang', 'kho', 'ke_toan'), async (req, res, next) => {
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
  router.post('/', requireRole('admin', 'ban_hang'), async (req, res, next) => {
    try {
      const order = await service.createOrder(req.body, req.userId || 1);
      sendSuccess(res, order, 'Tạo đơn bán hàng thành công.', 201);
    } catch (err) {
      next(err);
    }
  });

  // 3. Get sales order detail
  router.get('/:id', requireRole('admin', 'ban_hang', 'kho', 'ke_toan'), async (req, res, next) => {
    try {
      const order = await service.getOrderById(Number(req.params.id));
      sendSuccess(res, order);
    } catch (err) {
      next(err);
    }
  });

  // 4. Update pending sales order
  router.patch('/:id', requireRole('admin', 'ban_hang'), async (req, res, next) => {
    try {
      const updated = await service.updateOrder(Number(req.params.id), req.body, req.userId || 1);
      sendSuccess(res, updated, 'Cập nhật đơn bán hàng thành công.');
    } catch (err) {
      next(err);
    }
  });

  // 5. Confirm sales order
  router.post('/:id/confirm', requireRole('admin', 'ban_hang'), async (req, res, next) => {
    try {
      const confirmed = await service.confirmOrder(Number(req.params.id), req.body, req.userId || 1);
      sendSuccess(res, confirmed, 'Xác nhận đơn bán hàng thành công.');
    } catch (err) {
      next(err);
    }
  });

  // 6. Cancel sales order
  router.post('/:id/cancel', requireRole('admin', 'ban_hang'), async (req, res, next) => {
    try {
      const cancelled = await service.cancelOrder(
        Number(req.params.id),
        req.body,
        req.userId || 1,
        req.user?.vai_tro || 'ban_hang'
      );
      sendSuccess(res, cancelled, 'Hủy đơn bán hàng thành công.');
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export const orderRoutes = createOrderRoutes();
