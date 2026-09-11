import { Router } from 'express';
import { customerService } from '../services/customer.service.js';
import { receivableService } from '../services/receivable.service.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

export function createCustomerRoutes(service = customerService, auth = authenticate, recService = receivableService): Router {
  const router = Router();

  // All customer routes require authentication
  router.use(auth);

  // 1. List customers with search, filtering, and pagination
  router.get('/', requireRole('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
    try {
      const result = await service.listCustomers(req.query);
      sendPaginated(
        res,
        result.customers,
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

  // 2. Create customer
  router.post('/', requireRole('admin', 'ban_hang'), async (req, res, next) => {
    try {
      const customer = await service.createCustomer(req.body, req.userId || 1);
      sendSuccess(res, customer, 'Tạo khách hàng mới thành công.', 201);
    } catch (err) {
      next(err);
    }
  });

  // 3. Get customer detail
  router.get('/:id', requireRole('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
    try {
      const customer = await service.getCustomerById(Number(req.params.id));
      sendSuccess(res, customer);
    } catch (err) {
      next(err);
    }
  });

  // 4. Update customer general info
  router.patch('/:id', requireRole('admin', 'ban_hang'), async (req, res, next) => {
    try {
      const updated = await service.updateCustomer(Number(req.params.id), req.body, req.userId || 1);
      sendSuccess(res, updated, 'Cập nhật thông tin khách hàng thành công.');
    } catch (err) {
      next(err);
    }
  });

  // 5. Update customer status (Admin only)
  router.patch('/:id/status', requireRole('admin'), async (req, res, next) => {
    try {
      const updated = await service.updateCustomerStatus(Number(req.params.id), req.body, req.userId || 1);
      sendSuccess(res, updated, 'Cập nhật trạng thái khách hàng thành công.');
    } catch (err) {
      next(err);
    }
  });

  // 6. Get commercial summary
  router.get('/:id/summary', requireRole('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
    try {
      const summary = await service.getCustomerSummary(Number(req.params.id));
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  });
  // 7. Get customer specific receivables
  router.get('/:id/receivables', requireRole('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
    try {
      const result = await recService.getCustomerReceivables(Number(req.params.id), req.query);
      sendPaginated(
        res,
        result.receivables,
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

  return router;
}

export const customerRoutes = createCustomerRoutes();
