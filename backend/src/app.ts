import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middlewares/request-id.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { sendSuccess } from './utils/response.js';
import { checkDatabaseHealth } from './config/database.js';

export function createApp(): Express {
  const app = express();

  // Security and headers
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );

  // Body parser with size limit
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request ID and duration tracking
  app.use(requestIdMiddleware);

  // Health check endpoint
  app.get('/api/v1/health', async (_req, res, next) => {
    try {
      const dbHealth = await checkDatabaseHealth();
      const status = dbHealth.healthy ? 'healthy' : 'degraded';
      const statusCode = dbHealth.healthy ? 200 : 503;

      return res.status(statusCode).json({
        success: dbHealth.healthy,
        data: {
          status,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          database: {
            healthy: dbHealth.healthy,
            latencyMs: dbHealth.latencyMs,
          },
        },
        message: dbHealth.healthy ? 'Service operational' : 'Database connection degraded',
        meta: null,
      });
    } catch (err) {
      next(err);
    }
  });

  // Root welcome / baseline route
  app.get('/api/v1', (_req, res) => {
    sendSuccess(res, {
      service: 'ERP Sales & CRM API',
      version: '1.0.0',
    });
  });

  // Global error handler
  app.use(errorMiddleware);

  return app;
}

export const app = createApp();
