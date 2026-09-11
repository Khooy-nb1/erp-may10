import { Router } from 'express';
import { deliveryService } from '../services/delivery.service.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

export function createDeliveryRoutes(service = deliveryService, auth = authenticate): Router {
  const router = Router();

  router.use(auth);

  // 1. List deliveries (allowed for admin, ban_hang, kho)
  router.get('/', requireRole('admin', 'ban_hang', 'kho'), async (req, res, next) => {
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
  router.post('/', requireRole('admin', 'kho', 'ban_hang'), async (req, res, next) => {
    try {
      const delivery = await service.createDelivery(req.body, req.userId || 1);
      sendSuccess(res, delivery, 'Tạo đợt giao hàng thành công.', 201);
    } catch (err) {
      next(err);
    }
  });

  // 3. Get delivery detail
  router.get('/:id', requireRole('admin', 'ban_hang', 'kho'), async (req, res, next) => {
    try {
      const delivery = await service.getDeliveryById(Number(req.params.id));
      sendSuccess(res, delivery);
    } catch (err) {
      next(err);
    }
  });

  // 4. Start delivery (dispatches delivery: dang_giao) - admin & kho ONLY
  router.post('/:id/start', requireRole('admin', 'kho'), async (req, res, next) => {
    try {
      const updated = await service.startDelivery(Number(req.params.id), req.userId || 1);
      sendSuccess(res, updated, 'Bắt đầu vận chuyển đợt giao hàng thành công.');
    } catch (err) {
      next(err);
    }
  });

  // 5. Complete delivery (da_giao) - admin & kho ONLY
  router.post('/:id/complete', requireRole('admin', 'kho'), async (req, res, next) => {
    try {
      const updated = await service.completeDelivery(Number(req.params.id), req.userId || 1);
      sendSuccess(res, updated, 'Hoàn thành đợt giao hàng thành công.');
    } catch (err) {
      next(err);
    }
  });

  // 6. Fail delivery (that_bai) - admin & kho ONLY
  router.post('/:id/fail', requireRole('admin', 'kho'), async (req, res, next) => {
    try {
      const updated = await service.failDelivery(Number(req.params.id), req.body, req.userId || 1);
      sendSuccess(res, updated, 'Đã cập nhật trạng thái giao hàng thất bại.');
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export const deliveryRoutes = createDeliveryRoutes();
