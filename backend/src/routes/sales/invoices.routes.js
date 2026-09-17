'use strict';

const express = require('express');
const { requireRoles } = require('../../middlewares/auth');
const { invoiceService } = require('../../services/sales/invoice.service');
const { sendSuccess, sendPaginated } = require('../../utils/sales/response');
const { parseIdParam } = require('../../utils/sales/request');

/**
 * Invoice routes - mounted at `/hoa-don` in sales routes.
 *
 * Authorization guards, by ruling R-2:
 *  - reads keep PH1's role set (`admin`, `ban_hang`, `ke_toan`) because no single
 *    shipped permission covers it;
 *  - creation stays role-gated (`admin`, `ke_toan`) per ruling R-1: `ke_toan`
 *    holds no `sales.*` permission.
 */
function createInvoiceRoutes(service = invoiceService) {
  const router = express.Router();

  // 1. List invoices
  router.get('/', requireRoles('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
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
  router.post('/', requireRoles('admin', 'ke_toan'), async (req, res, next) => {
    try {
      const invoice = await service.createInvoice(req.body, (req.user && req.user.id) || 1);
      sendSuccess(res, invoice, 'Xuất hóa đơn bán hàng thành công.', 201);
    } catch (err) {
      next(err);
    }
  });

  // 3. Get invoice detail
  router.get('/:id', requireRoles('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
    try {
      const invoice = await service.getInvoiceById(parseIdParam(req.params.id, 'id', 'Mã hóa đơn'));
      sendSuccess(res, invoice);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createInvoiceRoutes();
module.exports.createInvoiceRoutes = createInvoiceRoutes;
