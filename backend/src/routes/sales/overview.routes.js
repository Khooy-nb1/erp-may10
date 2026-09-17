'use strict';

const express = require('express');
const { requireRoles } = require('../../middlewares/auth');
const { overviewService } = require('../../services/sales/overview.service');
const { sendSuccess } = require('../../utils/sales/response');
const { currentRole } = require('../../utils/sales/identity');

/**
 * P9 dashboard aggregate endpoints (ported from PH1 `routes/dashboard.routes.ts`).
 * RBAC per docs/security/roles-permissions.md §3.2: `kho` is limited to fulfillment metrics
 * (`/summary`, `/order-status`) and is denied every money-backed endpoint.
 *
 * Routes keep PH1's role sets verbatim: no shipped Core permission matches them exactly
 * (`sales.view` covers only `admin`/`ban_hang`, `dashboard.view` also covers `kho`), so a
 * permission guard would either over- or under-grant. The service re-asserts the scope.
 */
function createOverviewRoutes(service = overviewService) {
  const router = express.Router();

  // 1. Role-scoped KPI summary (admin/ban_hang: full, kho: fulfillment, ke_toan: financial)
  router.get('/summary', requireRoles('admin', 'ban_hang', 'kho', 'ke_toan'), async (req, res, next) => {
    try {
      const summary = await service.getSummary(req.query, currentRole(req));
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  });

  // 2. Invoice revenue by period (money metric: kho denied)
  router.get('/revenue-chart', requireRoles('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
    try {
      const chart = await service.getRevenueChart(req.query, currentRole(req));
      sendSuccess(res, chart);
    } catch (err) {
      next(err);
    }
  });

  // 3. Order distribution by status (fulfillment metric)
  router.get('/order-status', requireRoles('admin', 'ban_hang', 'kho', 'ke_toan'), async (req, res, next) => {
    try {
      const breakdown = await service.getOrderStatus(req.query, currentRole(req));
      sendSuccess(res, breakdown);
    } catch (err) {
      next(err);
    }
  });

  // 4. Top customers by order value (money metric: kho denied)
  router.get('/top-customers', requireRoles('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
    try {
      const topCustomers = await service.getTopCustomers(req.query, currentRole(req));
      sendSuccess(res, topCustomers);
    } catch (err) {
      next(err);
    }
  });

  // 5. Top products by ordered value (money metric: kho denied)
  router.get('/top-products', requireRoles('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
    try {
      const topProducts = await service.getTopProducts(req.query, currentRole(req));
      sendSuccess(res, topProducts);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createOverviewRoutes();
module.exports.createOverviewRoutes = createOverviewRoutes;
