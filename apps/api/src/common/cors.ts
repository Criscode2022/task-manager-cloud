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
