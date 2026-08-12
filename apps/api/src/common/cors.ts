import { ConfigService } from '@nestjs/config';

const DEFAULT_ORIGINS = [
  'https://task-cloud.netlify.app',
  'http://localhost:4200',
  'http://127.0.0.1:4200',
];

export function allowedOrigins(config?: ConfigService): string[] {
  const raw = config?.get<string>('ALLOWED_ORIGINS') || process.env.ALLOWED_ORIGINS || '';
  const fromEnv = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : DEFAULT_ORIGINS;
}

/** Match exact allowlist, plus optional Vercel preview hosts (*.vercel.app). */
export function isOriginAllowed(
  origin: string | undefined,
  config?: ConfigService,
): boolean {
  if (!origin) return true;
  const allowed = allowedOrigins(config);
  if (allowed.includes(origin)) return true;

  const allowPreviews =
    (config?.get<string>('ALLOW_VERCEL_PREVIEWS') ||
      process.env.ALLOW_VERCEL_PREVIEWS ||
      'true') === 'true';
  if (allowPreviews && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
    return true;
  }
  return false;
}
