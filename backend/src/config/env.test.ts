import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getEnv, resetEnvCache } from './env.js';

describe('Environment Configuration Validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetEnvCache();
  });

  it('provides safe defaults when environment variables are omitted', () => {
    delete process.env.PORT;
    delete process.env.PGHOST;
    delete process.env.TAX_RATE;
    delete process.env.CREDIT_LIMIT_MODE;

    const parsed = getEnv();
    assert.equal(parsed.PORT, 3000);
    assert.equal(parsed.PGHOST, 'localhost');
    assert.equal(parsed.TAX_RATE, 0);
    assert.equal(parsed.CREDIT_LIMIT_MODE, 'warning');
  });

  it('parses custom environment overrides correctly', () => {
    process.env.PORT = '4000';
    process.env.TAX_RATE = '0.08';
    process.env.CREDIT_LIMIT_MODE = 'hard_block';

    const parsed = getEnv();
    assert.equal(parsed.PORT, 4000);
    assert.equal(parsed.TAX_RATE, 0.08);
    assert.equal(parsed.CREDIT_LIMIT_MODE, 'hard_block');
  });

  it('throws a descriptive configuration error on invalid values', () => {
    process.env.PORT = 'not-a-number';

    assert.throws(
      () => getEnv(),
      /Environment configuration error: PORT:/
    );
  });
});
