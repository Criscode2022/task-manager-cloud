-- Task Cloud — auth hardening schema (sessions + pin_lookup)
-- Safe to run on existing Neon databases. Applied automatically by the API on boot.

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS pin_lookup TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_pin_lookup
    ON public.users (pin_lookup)
    WHERE pin_lookup IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions (expires_at);
