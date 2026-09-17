'use strict';

const express = require('express');
const { requireRoles, requirePermission } = require('../../middlewares/auth');
const { customerService } = require('../../services/sales/customer.service');
const { receivableService } = require('../../services/sales/receivable.service');
const { sendSuccess, sendPaginated } = require('../../utils/sales/response');

/**
 * Customer routes - mounted at `/api/v1/sales/khach-hang` from `salesRoutes.js`.
 *
 * Authorization is Core's (`middlewares/auth.js`), by ruling R-1:
 *  - read endpoints keep PH1's role set (`admin`, `ban_hang`, `ke_toan`) because no
 *    single shipped permission covers the accounting read grant and the Core
 *    permission matrix is frozen;
 *  - write endpoints use the shipped `sales.*` permissions, whose holder set
 *    ({`ban_hang`, `admin`}) is exactly PH1's.
 */
function createCustomerRoutes(service = customerService, recService = receivableService) {
  const router = express.Router();

  // 1. List customers with search, filtering, and pagination
  router.get('/', requireRoles('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
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
  router.post('/', requirePermission('sales.create'), async (req, res, next) => {
    try {
      const customer = await service.createCustomer(req.body, req.user ? req.user.id : null);
      sendSuccess(res, customer, 'Tạo khách hàng mới thành công.', 201);
    } catch (err) {
      next(err);
    }
  });

  // 3. Get customer detail
  router.get('/:id', requireRoles('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
    try {
      const customer = await service.getCustomerById(Number(req.params.id));
      sendSuccess(res, customer);
    } catch (err) {
      next(err);
    }
  });

  // 4. Update customer general info
  router.patch('/:id', requirePermission('sales.update'), async (req, res, next) => {
    try {
      const updated = await service.updateCustomer(Number(req.params.id), req.body, req.user ? req.user.id : null);
      sendSuccess(res, updated, 'Cập nhật thông tin khách hàng thành công.');
    } catch (err) {
      next(err);
    }
  });

  // 5. Update customer status (Admin only)
  router.patch('/:id/status', requireRoles('admin'), async (req, res, next) => {
    try {
      const updated = await service.updateCustomerStatus(Number(req.params.id), req.body, req.user ? req.user.id : null);
      sendSuccess(res, updated, 'Cập nhật trạng thái khách hàng thành công.');
    } catch (err) {
      next(err);
    }
  });

  // 6. Get commercial summary
  router.get('/:id/summary', requireRoles('admin', 'ban_hang', 'ke_toan'), async (req, res, next) => {
    try {
      const summary = await service.getCustomerSummary(Number(req.params.id));
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  });

  // 7. Get customer specific receivables (ruling R-2: sales permission holders)
  router.get('/:id/receivables', requirePermission('sales.view'), async (req, res, next) => {
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

module.exports = createCustomerRoutes();
module.exports.createCustomerRoutes = createCustomerRoutes;
