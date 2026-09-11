import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { checkDatabaseHealth, withTransaction, setPool, closePool } from './database.js';
import pg from 'pg';

describe('Database Configuration & Transaction Helper', () => {
  afterEach(async () => {
    await closePool();
  });

  it('checkDatabaseHealth returns healthy: true when query succeeds', async () => {
    const mockPool = {
      query: async (sql: string) => {
        assert.equal(sql, 'SELECT 1');
        return { rows: [{ '?column?': 1 }], rowCount: 1 };
      },
      end: async () => {},
      on: () => {},
    } as unknown as pg.Pool;

    setPool(mockPool);

    const health = await checkDatabaseHealth();
    assert.equal(health.healthy, true);
    assert.ok(health.latencyMs >= 0);
  });

  it('checkDatabaseHealth returns healthy: false with error when query fails', async () => {
    const mockPool = {
      query: async () => {
        throw new Error('Connection refused mock');
      },
      end: async () => {},
      on: () => {},
    } as unknown as pg.Pool;

    setPool(mockPool);

    const health = await checkDatabaseHealth();
    assert.equal(health.healthy, false);
    assert.equal(health.error, 'Connection refused mock');
  });

  it('withTransaction executes BEGIN, callback, COMMIT, and releases client on success', async () => {
    const executedQueries: string[] = [];
    let released = false;

    const mockClient = {
      query: async (sql: string) => {
        executedQueries.push(sql);
        return { rows: [] };
      },
      release: () => {
        released = true;
      },
    } as unknown as pg.PoolClient;

    const mockPool = {
      connect: async () => mockClient,
      end: async () => {},
      on: () => {},
    } as unknown as pg.Pool;

    setPool(mockPool);

    const result = await withTransaction(async (client) => {
      await client.query('INSERT INTO test (col) VALUES (1)');
      return 'transaction_success';
    });

    assert.equal(result, 'transaction_success');
    assert.deepEqual(executedQueries, [
      'BEGIN',
      'INSERT INTO test (col) VALUES (1)',
      'COMMIT',
    ]);
    assert.equal(released, true);
  });

  it('withTransaction executes BEGIN, ROLLBACK, releases client, and rethrows on failure', async () => {
    const executedQueries: string[] = [];
    let released = false;

    const mockClient = {
      query: async (sql: string) => {
        executedQueries.push(sql);
        return { rows: [] };
      },
      release: () => {
        released = true;
      },
    } as unknown as pg.PoolClient;

    const mockPool = {
      connect: async () => mockClient,
      end: async () => {},
      on: () => {},
    } as unknown as pg.Pool;

    setPool(mockPool);

    await assert.rejects(
      async () => {
        await withTransaction(async (client) => {
          await client.query('INSERT INTO test (col) VALUES (1)');
          throw new Error('Intentional transaction failure');
        });
      },
      /Intentional transaction failure/
    );

    assert.deepEqual(executedQueries, [
      'BEGIN',
      'INSERT INTO test (col) VALUES (1)',
      'ROLLBACK',
    ]);
    assert.equal(released, true);
  });
});
