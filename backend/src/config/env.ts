import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Database
  PGHOST: z.string().min(1).default('localhost'),
  PGPORT: z.coerce.number().int().positive().default(5432),
  PGDATABASE: z.string().min(1).default('erp_sales_crm_dev'),
  PGUSER: z.string().min(1).default('postgres'),
  PGPASSWORD: z.string().default(''),
  PGSSL: z.coerce.boolean().default(false),
  PG_MAX_POOL: z.coerce.number().int().positive().default(20),
  PG_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),

  // Authentication
  JWT_SECRET: z.string().min(8).default('default_dev_jwt_secret_min_32_chars_long_for_security'),
  JWT_EXPIRES_IN: z.string().default('8h'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Business Policy Configurations (Injected / Configurable)
  TAX_RATE: z.coerce.number().min(0).max(1).default(0),
  CREDIT_LIMIT_MODE: z.enum(['warning', 'hard_block']).default('warning'),
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
