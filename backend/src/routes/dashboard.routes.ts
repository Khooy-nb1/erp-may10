import { Router } from 'express';
import { dashboardService } from '../services/dashboard.service.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { sendSuccess } from '../utils/response.js';

/**
 * P9 dashboard aggregate endpoints.
 * RBAC per docs/security/roles-permissions.md §3.2: `kho` is limited to fulfillment metrics
 * (`/summary`, `/order-status`) and is denied every money-backed endpoint.
 */
export function createDashboardRoutes(service = dashboardService, auth = authenticate): Router {
  const router = Router();

  router.use(auth);

  // 1. Role-scoped KPI summary (admin/ban_hang: full, kho: fulfillment, ke_toan: financial)
  router.get('/summary', requireRole('admin', 'ban_hang', 'kho', 'ke_toan'), async (req, res, next) => {
    try {
      const summary = await service.getSummary(req.query, req.user?.vai_tro ?? '');
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  });

  // 2. Invoice revenue by period (money metric: kho denied)
  router.get('/revenue-chart', requireRole('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
    try {
      const chart = await service.getRevenueChart(req.query, req.user?.vai_tro ?? '');
      sendSuccess(res, chart);
    } catch (err) {
      next(err);
    }
  });

  // 3. Order distribution by status (fulfillment metric)
  router.get('/order-status', requireRole('admin', 'ban_hang', 'kho', 'ke_toan'), async (req, res, next) => {
    try {
      const breakdown = await service.getOrderStatus(req.query, req.user?.vai_tro ?? '');
      sendSuccess(res, breakdown);
    } catch (err) {
      next(err);
    }
  });

  // 4. Top customers by order value (money metric: kho denied)
  router.get('/top-customers', requireRole('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
    try {
      const topCustomers = await service.getTopCustomers(req.query, req.user?.vai_tro ?? '');
      sendSuccess(res, topCustomers);
    } catch (err) {
      next(err);
    }
  });

  // 5. Top products by ordered value (money metric: kho denied)
  router.get('/top-products', requireRole('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
    try {
      const topProducts = await service.getTopProducts(req.query, req.user?.vai_tro ?? '');
      sendSuccess(res, topProducts);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export const dashboardRoutes = createDashboardRoutes();
