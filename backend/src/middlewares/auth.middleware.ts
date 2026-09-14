import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { userRepository, IUserRepository } from '../repositories/user.repository.js';
import { UserProfile, toUserProfile } from '../models/user.model.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { JwtPayload } from '../services/auth.service.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
      userId?: number;
    }
  }
}

export type AuthMiddleware = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function createAuthMiddleware(userRepo: IUserRepository = userRepository): AuthMiddleware {
  return async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError();
      }

      const token = authHeader.substring(7).trim();
      if (!token) {
        throw new UnauthorizedError();
      }

      let payload: JwtPayload;
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
        payload = decoded as JwtPayload;
      } catch {
        throw new UnauthorizedError();
      }

      const user = await userRepo.findById(payload.id);
      if (!user || user.trang_thai !== 'hoat_dong') {
        throw new UnauthorizedError();
      }

      req.user = toUserProfile(user);
      req.userId = user.id;

      next();
    } catch (err) {
      next(err);
    }
  };
}

export const authenticate = createAuthMiddleware();

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    // admin has full access across all capabilities by default
    if (req.user.vai_tro === 'admin' || allowedRoles.includes(req.user.vai_tro)) {
      return next();
    }

    return next(new ForbiddenError());
  };
}
