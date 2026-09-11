import { Router } from 'express';
import { authService, loginSchema } from '../services/auth.service.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { loginRateLimiter } from '../middlewares/rate-limit.middleware.js';
import { sendSuccess } from '../utils/response.js';

export function createAuthRoutes(
  service = authService,
  auth = authenticate,
  loginLimiter = loginRateLimiter
): Router {
  const router = Router();

  router.post('/login', loginLimiter, async (req, res, next) => {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await service.login(validated);
      sendSuccess(res, result, 'Đăng nhập thành công.');
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', auth, (req, res) => {
    sendSuccess(res, req.user);
  });

  router.post('/logout', auth, (_req, res) => {
    sendSuccess(res, null, 'Đăng xuất thành công.');
  });

  return router;
}

export const authRoutes = createAuthRoutes();
