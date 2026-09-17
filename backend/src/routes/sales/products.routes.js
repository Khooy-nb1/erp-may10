'use strict';

const express = require('express');
const { requireRoles } = require('../../middlewares/auth');
const { productService } = require('../../services/sales/product.service');
const { sendSuccess, sendPaginated } = require('../../utils/sales/response');

/**
 * Product routes - mounted at `/san-pham` in sales routes.
 *
 * Authorization is Core's (`middlewares/auth.js`), by ruling R-1: reads keep
 * PH1's role set (`admin`, `ban_hang`, `kho`, `ke_toan`) because the frozen Core
 * permission matrix has no single permission covering that exact set.
 */
function createProductRoutes(service = productService) {
  const router = express.Router();

  // List / search products
  router.get('/', requireRoles('admin', 'ban_hang', 'kho', 'ke_toan'), async (req, res, next) => {
    try {
      const result = await service.listProducts(req.query);
      sendPaginated(
        res,
        result.products,
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

  // Get product detail
  router.get('/:id', requireRoles('admin', 'ban_hang', 'kho', 'ke_toan'), async (req, res, next) => {
    try {
      const product = await service.getProductById(Number(req.params.id));
      sendSuccess(res, product);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createProductRoutes();
module.exports.createProductRoutes = createProductRoutes;
