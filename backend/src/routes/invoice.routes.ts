import { Router } from 'express';
import { invoiceService } from '../services/invoice.service.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

export function createInvoiceRoutes(service = invoiceService, auth = authenticate): Router {
  const router = Router();

  router.use(auth);

  // 1. List invoices (allowed for admin, ban_hang, ke_toan)
  router.get('/', requireRole('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
    try {
      const result = await service.listInvoices(req.query);
      sendPaginated(
        res,
        result.invoices,
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

  // 2. Create invoice (restricted to admin and ke_toan ONLY per RBAC matrix)
  router.post('/', requireRole('admin', 'ke_toan'), async (req, res, next) => {
    try {
      const invoice = await service.createInvoice(req.body, req.userId || 1);
      sendSuccess(res, invoice, 'Xuất hóa đơn bán hàng thành công.', 201);
    } catch (err) {
      next(err);
    }
  });

  // 3. Get invoice detail
  router.get('/:id', requireRole('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
    try {
      const invoice = await service.getInvoiceById(Number(req.params.id));
      sendSuccess(res, invoice);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export const invoiceRoutes = createInvoiceRoutes();
