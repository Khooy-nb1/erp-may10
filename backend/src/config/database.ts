import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;

export function setPool(customPool: pg.Pool | null): void {
  poolInstance = customPool;
}

export function getPool(): pg.Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      host: env.PGHOST,
      port: env.PGPORT,
      database: env.PGDATABASE,
      user: env.PGUSER,
      password: env.PGPASSWORD,
      ssl: env.PGSSL ? { rejectUnauthorized: false } : false,
      max: env.PG_MAX_POOL,
      idleTimeoutMillis: env.NODE_ENV === 'test' ? 1000 : 30000,
      connectionTimeoutMillis: env.NODE_ENV === 'test' ? 1000 : 5000,
      statement_timeout: env.PG_STATEMENT_TIMEOUT_MS,
    });
    poolInstance.on('error', (err) => {
      // Log unexpected idle client error without leaking connection secrets
      const errorCode =
        err && typeof err === 'object' && 'code' in err && typeof err.code === 'string'
          ? err.code
          : undefined;
      console.error('[DATABASE_POOL_ERROR]', {
        message: err instanceof Error ? err.message : String(err),
        code: errorCode,
      });
    });
  }
  return poolInstance;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const pool = getPool();
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[DATABASE_ROLLBACK_ERROR]', {
        message: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
      });
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    const latencyMs = Date.now() - start;
    return { healthy: true, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - start;
    return {
      healthy: false,
      latencyMs,
      error: err instanceof Error ? err.message : 'Database connection check failed',
    };
  }
}

export async function closePool(): Promise<void> {
  if (poolInstance) {
    const pool = poolInstance;
    poolInstance = null;
    await pool.end();
  }
}
