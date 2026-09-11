import { createApp } from './app.js';
import { env } from './config/env.js';
import { closePool } from './config/database.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[ERP_SALES_API] Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

// Graceful shutdown handling
function handleShutdown(signal: string) {
  console.log(`[ERP_SALES_API] Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await closePool();
      console.log('[ERP_SALES_API] Database pool closed. Process terminated.');
      process.exit(0);
    } catch (err) {
      console.error('[ERP_SALES_API] Error during database shutdown:', err);
      process.exit(1);
    }
  });

  // Force close after 10s if hanging
  setTimeout(() => {
    console.error('[ERP_SALES_API] Forcefully shutting down after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
