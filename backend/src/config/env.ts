import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Development-only fallback secret. It is committed to the repository, so it is
 * never acceptable in production — see the `superRefine` guard below.
 */
const DEV_JWT_SECRET = 'default_dev_jwt_secret_min_32_chars_long_for_security';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Database
  PGHOST: z.string().min(1).default('localhost'),
  PGPORT: z.coerce.number().int().positive().default(5432),
  PGDATABASE: z.string().min(1).default('erp_sales_crm_dev'),
  PGUSER: z.string().min(1).default('postgres'),
  PGPASSWORD: z.string().default(''),
  // NOT `z.coerce.boolean()`: that applies JavaScript `Boolean()`, so the string
  // "false" — the only way to express false in a .env file — coerces to `true`.
  // That silently enables PGSSL and breaks every connection with "The server does
  // not support SSL connections". Unknown values are rejected, not defaulted, so a
  // typo fails loudly at startup instead of quietly flipping a TLS flag.
  PGSSL: z
    .enum(['true', 'false', '1', '0'])
    .default('false')
    .transform((value) => value === 'true' || value === '1'),
  PG_MAX_POOL: z.coerce.number().int().positive().default(20),
  PG_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),

  // Authentication
  JWT_SECRET: z.string().min(8).default(DEV_JWT_SECRET),
  JWT_EXPIRES_IN: z.string().default('8h'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Business Policy Configurations (Injected / Configurable)
  TAX_RATE: z.coerce.number().min(0).max(1).default(0),
  CREDIT_LIMIT_MODE: z.enum(['warning', 'hard_block']).default('warning'),
}).superRefine((parsed, ctx) => {
  // Fail closed. `JWT_SECRET` has a development default so local work and the
  // test suite need no setup, but that value is in the repository — booting a
  // production server with it would let anyone who can read the source forge a
  // token for any role, including admin. A missing secret must therefore be a
  // startup error, not a silent fallback.
  if (parsed.NODE_ENV !== 'production') return;

  if (parsed.JWT_SECRET === DEV_JWT_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_SECRET'],
      message:
        'JWT_SECRET must be set explicitly when NODE_ENV=production; the built-in development default is public and would allow forged tokens',
    });
    return;
  }

  if (parsed.JWT_SECRET.length < 32) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_SECRET'],
      message: 'JWT_SECRET must be at least 32 characters when NODE_ENV=production',
    });
  }
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const formattedErrors = result.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      throw new Error(`Environment configuration error: ${formattedErrors}`);
    }
    cachedEnv = result.data;
  }
  return cachedEnv;
}

export function resetEnvCache(): void {
  cachedEnv = null;
}

export const env = getEnv();
