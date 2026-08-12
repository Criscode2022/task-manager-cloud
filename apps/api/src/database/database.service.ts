import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { neon, NeonQueryFunction } from '@neondatabase/serverless';

@Injectable()
export class DatabaseService {
  private sql: NeonQueryFunction<false, false> | null = null;

  constructor(private readonly config: ConfigService) {}

  getSql(): NeonQueryFunction<false, false> {
    if (!this.sql) {
      const databaseUrl = this.config.get<string>('DATABASE_URL');
      if (!databaseUrl) {
        throw Object.assign(new Error('DATABASE_URL is not set'), { status: 500 });
      }
      this.sql = neon(databaseUrl);
    }
    return this.sql;
  }

  async ensureAuthSchema(): Promise<void> {
    const sql = this.getSql();
    await sql`
      ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS pin_lookup TEXT
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_pin_lookup
      ON public.users (pin_lookup)
      WHERE pin_lookup IS NOT NULL
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.sessions (
        id UUID PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions (user_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions (expires_at)
    `;
  }
}
