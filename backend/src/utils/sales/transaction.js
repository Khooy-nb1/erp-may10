'use strict';

const db = require('../../config/database');

/**
 * Runs `callback(client)` inside a single ACID transaction on the shared Core
 * connection pool (contract §11: any operation touching two or more tables must
 * be wrapped in a transaction, and every failure must roll the whole operation
 * back).
 *
 * The API mirrors the retired PH1 `withTransaction` helper so the ported
 * services keep their original control flow.
 */
async function withTransaction(callback) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[SALES_ROLLBACK_ERROR]', {
        message: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
      });
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { withTransaction };
