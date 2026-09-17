'use strict';

/**
 * Business policy configuration for the Sales module.
 *
 * The standalone PH1 app validated its own environment (including JWT and
 * database settings) with `zod`. In the integrated module all runtime
 * configuration is Core's (`backend/src/config/database.js` owns the pool,
 * `middlewares/auth.js` owns identity), so only the business policy switches
 * remain module-owned. Defaults match the retired PH1 environment defaults.
 */

function readTaxRate() {
  const raw = process.env.TAX_RATE;
  if (raw === undefined || raw === '') return 0;
  const value = Number(raw);
  if (Number.isNaN(value) || value < 0 || value > 1) return 0;
  return value;
}

function readCreditLimitMode() {
  const raw = (process.env.CREDIT_LIMIT_MODE || '').trim();
  return raw === 'hard_block' ? 'hard_block' : 'warning';
}

const salesConfig = {
  /** VAT rate applied to order totals (0..1). */
  TAX_RATE: readTaxRate(),
  /** `warning`: credit overrun needs an explicit acknowledgement; `hard_block`: refuse. */
  CREDIT_LIMIT_MODE: readCreditLimitMode(),
};

module.exports = { salesConfig };
