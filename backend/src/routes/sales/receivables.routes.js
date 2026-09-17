'use strict';

const express = require('express');
const { requirePermission } = require('../../middlewares/auth');
const { receivableService } = require('../../services/sales/receivable.service');
const { sendSuccess, sendPaginated } = require('../../utils/sales/response');

/**
 * Receivable routes - mounted at `/cong-no` in sales routes.
 *
 * Authorization (ruling R-2): the module is read-only, so reads sit behind the
 * shipped `sales.view` permission while the aging buckets - which were
 * Finance-only in PH1 (`admin`, `ke_toan`) - use `accounting.receivable`.
 */
function createReceivableRoutes(service = receivableService) {
  const router = express.Router();

  // 1. Get receivable summary KPIs
  router.get('/summary', requirePermission('sales.view'), async (req, res, next) => {
    try {
      const summary = await service.getSummaryForQuery(req.query);
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  });

  // 2. Get receivable aging bucket report (Finance / Accounting only)
  router.get('/aging', requirePermission('accounting.receivable'), async (_req, res, next) => {
    try {
      const aging = await service.getAgingReport();
      sendSuccess(res, aging);
    } catch (err) {
      next(err);
    }
  });

  // 3. List receivables with filters and pagination
  router.get('/', requirePermission('sales.view'), async (req, res, next) => {
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

module.exports = createReceivableRoutes();
module.exports.createReceivableRoutes = createReceivableRoutes;
