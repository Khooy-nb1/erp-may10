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

  it('keeps the development JWT default outside production', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'development';

    // Local work and the test suite must need no secret setup.
    assert.equal(getEnv().JWT_SECRET.length > 0, true);
  });

  it('refuses to boot in production with the built-in development JWT secret', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';

    // The default is published in the repository, so accepting it in production
    // would let anyone forge a token for any role. Startup must fail instead.
    assert.throws(() => getEnv(), /Environment configuration error: JWT_SECRET:/);
  });

  it('refuses a production JWT secret shorter than 32 characters', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'too-short';

    assert.throws(() => getEnv(), /Environment configuration error: JWT_SECRET:/);
  });

  it('accepts an explicit production JWT secret', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(48);

    assert.equal(getEnv().JWT_SECRET, 'a'.repeat(48));
  });

  it('parses PGSSL=false as false rather than JavaScript truthiness', () => {
    // A regression guard: `z.coerce.boolean()` would read the string "false" as
    // true and enable TLS against a server that does not support it, breaking
    // every database connection.
    process.env.PGSSL = 'false';
    assert.equal(getEnv().PGSSL, false);

    process.env.PGSSL = 'true';
    resetEnvCache();
    assert.equal(getEnv().PGSSL, true);
  });

  it('rejects an unrecognized PGSSL value instead of guessing', () => {
    process.env.PGSSL = 'yes';
    assert.throws(() => getEnv(), /Environment configuration error: PGSSL:/);
  });
});
