import { Router } from 'express';
import { receivableService } from '../services/receivable.service.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

export function createReceivableRoutes(service = receivableService, auth = authenticate): Router {
  const router = Router();

  router.use(auth);

  // 1. Get receivable summary KPIs (allowed for admin, ban_hang, ke_toan)
  router.get('/summary', requireRole('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
    try {
      const summary = await service.getSummaryForQuery(req.query);
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  });

  // 2. Get receivable aging bucket report (reserved for Finance / Accounting & Admin)
  router.get('/aging', requireRole('admin', 'ke_toan'), async (_req, res, next) => {
    try {
      const aging = await service.getAgingReport();
      sendSuccess(res, aging);
    } catch (err) {
      next(err);
    }
  });

  // 3. List receivables with filters and pagination
  router.get('/', requireRole('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
    try {
      const result = await service.listReceivables(req.query);
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

export const receivableRoutes = createReceivableRoutes();
