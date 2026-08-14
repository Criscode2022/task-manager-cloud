import { z } from 'zod';

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    PIN_PEPPER: z.string().min(32, 'PIN_PEPPER must be at least 32 characters'),
    API_PORT: z.coerce.number().int().positive().optional(),
    PORT: z.coerce.number().int().positive().optional(),
    API_BASE_URL: z.string().optional(),
    ALLOWED_ORIGINS: z.string().optional(),
    ALLOW_VERCEL_PREVIEWS: z.enum(['true', 'false']).optional(),
    SESSION_TTL_SECONDS: z.coerce.number().int().positive().optional(),
    AUTH_RATE_LIMIT: z.coerce.number().int().positive().optional(),
    AUTH_RATE_WINDOW_MS: z.coerce.number().int().positive().optional(),
    NODE_ENV: z.string().optional(),
  })
  .passthrough();

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${details}`);
  }

  return parsed.data;
}
