'use strict';

const { ConflictError } = require('../../../utils/sales/errors');

/**
 * Backend-owned document codes for the cross-module integration services.
 *
 * The client never supplies a business code: every code is generated here,
 * checked against the table it will be written to, and retried on collision -
 * the same `<PREFIX>-<year>-<6 digits>` strategy the sales services use for
 * `KH-` / `DBH-` / `GH-` / `HDBH-`.
 *
 * Table and column names come from the fixed allow-list below, never from a
 * request, so the interpolated SQL cannot be influenced by input.
 */
const CODE_TARGETS = {
  lenh_san_xuat: { column: 'ma_lenh_san_xuat', prefix: 'LSX' },
  phieu_xuat_kho: { column: 'ma_phieu_xuat', prefix: 'PXK' },
};

const MAX_ATTEMPTS = 5;

/**
 * @param {import('pg').PoolClient} client Transaction client the code will be written with.
 * @param {keyof typeof CODE_TARGETS} table Target table.
 * @param {Date} [now] Clock used for the year segment (tests pin it).
 * @returns {Promise<string>} An unused code.
 */
async function generateUniqueCode(client, table, now = new Date()) {
  const target = CODE_TARGETS[table];
  if (!target) {
    throw new Error(`Unsupported business-code target: ${table}`);
  }

  const year = now.getFullYear();
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = `${target.prefix}-${year}-${Math.floor(100000 + Math.random() * 900000)}`;
    const existing = await client.query(
      `SELECT 1 FROM ${table} WHERE ${target.column} = $1 LIMIT 1`,
      [code]
    );
    if (existing.rows.length === 0) {
      return code;
    }
  }

  throw new ConflictError('DATABASE_CONFLICT', 'Không thể tạo mã nghiệp vụ duy nhất. Vui lòng thử lại.');
}

module.exports = { CODE_TARGETS, MAX_ATTEMPTS, generateUniqueCode };
