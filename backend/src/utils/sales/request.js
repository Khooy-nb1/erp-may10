'use strict';

/**
 * Request-level helpers shared by the module's services.
 *
 * The module is its own validator (the frozen Core backend carries no schema
 * library), so these keep the request boundary uniform across the six domains:
 * one Vietnamese message pair for body/query failures, one place that turns a
 * path id into a positive integer (instead of letting `Number('abc')` reach
 * PostgreSQL and surface as a 500), one guard for PH1's bilingual field aliases,
 * and one mapping from validator issues to the contract's `[{ field, message }]`
 * detail shape.
 */

const { v } = require('./validate');
const { ValidationError } = require('./errors');

/** Replaces the ported English strings; the module answers in Vietnamese. */
const INVALID_BODY_MESSAGE = 'Dữ liệu gửi lên không hợp lệ.';
const INVALID_QUERY_MESSAGE = 'Tham số truy vấn không hợp lệ.';

const idSchema = v.coerce.number().int().positive();

/**
 * Validates a path parameter id.
 *
 * `Number('abc')` is `NaN` and `Number('1.5')` is not a bigint: passing either to
 * a `BIGINT` comparison raises a PostgreSQL error, which the platform renders as
 * a 500. Malformed ids are client input, so they answer 422 with a field error.
 *
 * @param {unknown} raw
 * @param {string} [field] Detail field the client can attach the message to.
 * @param {string} [label] Vietnamese noun used in the message ('khách hàng'...).
 * @returns {number}
 */
function parseIdParam(raw, field = 'id', label = 'ID') {
  // `1e3`, `0x10` and ` 12 ` all pass `Number()`, but an id path segment must be
  // plain decimal digits; anything else is a malformed request, not a lookup.
  const isPlainIntegerString = typeof raw === 'string' && /^[0-9]+$/.test(raw);
  const parsed = isPlainIntegerString || typeof raw === 'number' ? idSchema.safeParse(raw) : null;
  if (!parsed || !parsed.success) {
    throw new ValidationError(`${label} không hợp lệ.`, [
      { field, message: `${label} phải là số nguyên dương.` },
    ]);
  }
  return parsed.data;
}

/**
 * Rejects a payload that carries both spellings of an aliased field with
 * different values. PH1's services accepted Vietnamese *and* English names and
 * resolved the pair with `||`, so a client sending `ma_don_ban_hang` and
 * `orderId` with different values silently won (or lost) the argument.
 *
 * @param {Record<string, unknown>} raw
 * @param {Array<[string, string]>} pairs `[canonical, alias]`
 */
function assertNoAliasConflict(raw, pairs) {
  if (!raw || typeof raw !== 'object') return;
  const issues = [];
  for (const [canonical, alias] of pairs) {
    const left = raw[canonical];
    const right = raw[alias];
    if (left === undefined || right === undefined) continue;
    if (left === null || right === null) continue;
    if (left === right) continue;
    if (typeof left === 'string' && typeof right === 'string' && left.trim() === right.trim()) continue;
    issues.push({
      field: canonical,
      message: `Chỉ gửi một trong hai trường ${canonical} hoặc ${alias}.`,
    });
  }
  if (issues.length > 0) {
    throw new ValidationError(INVALID_BODY_MESSAGE, issues);
  }
}

/** Maps validator issues onto the contract's `[{ field, message }]` details. */
function fieldIssues(issues) {
  return (issues || []).map((issue) => ({
    field: Array.isArray(issue.path) ? issue.path.join('.') : String(issue.field ?? ''),
    message: issue.message,
  }));
}

module.exports = {
  INVALID_BODY_MESSAGE,
  INVALID_QUERY_MESSAGE,
  parseIdParam,
  assertNoAliasConflict,
  fieldIssues,
};
