import { Router } from 'express';
import { productService } from '../services/product.service.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

export function createProductRoutes(service = productService, auth = authenticate): Router {
  const router = Router();

  router.use(auth);

  // List / search products (allowed for admin, ban_hang, kho, ke_toan)
  router.get('/', requireRole('admin', 'ban_hang', 'kho', 'ke_toan'), async (req, res, next) => {
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
  router.get('/:id', requireRole('admin', 'ban_hang', 'kho', 'ke_toan'), async (req, res, next) => {
    try {
      const product = await service.getProductById(Number(req.params.id));
      sendSuccess(res, product);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export const productRoutes = createProductRoutes();
