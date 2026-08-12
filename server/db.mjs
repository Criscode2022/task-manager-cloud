/**
 * Neon Postgres data access shared by Netlify Functions and the local API server.
 */
import { neon } from '@neondatabase/serverless';
import {
  createAccessToken,
  getSessionTtlSeconds,
  hashPin,
  newSessionId,
  pinLookupKey,
  verifyPinHash,
} from './auth.mjs';

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }
  return neon(databaseUrl);
}

function serializeTask(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    title: row.title,
    description: row.description ?? '',
    done: Boolean(row.done),
    priority: row.priority || 'medium',
    tags: Array.isArray(row.tags) ? row.tags : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function serializeUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    created_at: row.created_at,
  };
}

async function issueSession(userId) {
  const sql = getSql();
  const sessionId = newSessionId();
  const ttl = getSessionTtlSeconds();
  const expiresAt = new Date(Date.now() + ttl * 1000);
  const rows = await sql`
    INSERT INTO public.sessions (id, user_id, expires_at)
    VALUES (${sessionId}, ${userId}, ${expiresAt.toISOString()})
    RETURNING id, user_id, expires_at
  `;
  const session = rows[0];
  const token = await createAccessToken({
    userId,
    sessionId: session.id,
    expiresAt: new Date(session.expires_at),
  });
  return {
    id: Number(userId),
    token,
    expires_at: new Date(session.expires_at).toISOString(),
    expires_in: ttl,
  };
}

export async function ensureAuthSchema() {
  const sql = getSql();
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

export async function getTaskById(taskId) {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM public.tasks WHERE id = ${taskId} LIMIT 1
  `;
  if (!rows[0]) {
    throw Object.assign(new Error('Task not found'), { status: 404 });
  }
  return serializeTask(rows[0]);
}

export async function getTasks(userId) {
  const sql = getSql();
  const rows = await sql`
    SELECT *
    FROM public.tasks
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows.map(serializeTask);
}

export async function createTask(task) {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO public.tasks (
      user_id, title, description, done, priority, tags, updated_at
    ) VALUES (
      ${task.user_id},
      ${task.title},
      ${task.description ?? ''},
      ${task.done ?? false},
      ${task.priority || 'medium'},
      ${task.tags || []},
      NOW()
    )
    RETURNING *
  `;
  return serializeTask(rows[0]);
}

export async function updateTask(taskId, updates) {
  const sql = getSql();
  const existing = await sql`
    SELECT * FROM public.tasks WHERE id = ${taskId} LIMIT 1
  `;
  if (!existing[0]) {
    throw Object.assign(new Error('Task not found'), { status: 404 });
  }

  const current = existing[0];
  const title = updates.title ?? current.title;
  const description =
    updates.description !== undefined ? updates.description : current.description;
  const done = updates.done !== undefined ? updates.done : current.done;
  const priority = updates.priority ?? current.priority;
  const tags = updates.tags ?? current.tags;

  const rows = await sql`
    UPDATE public.tasks
    SET
      title = ${title},
      description = ${description},
      done = ${done},
      priority = ${priority},
      tags = ${tags},
      updated_at = NOW()
    WHERE id = ${taskId}
    RETURNING *
  `;
  return serializeTask(rows[0]);
}

export async function deleteTask(taskId) {
  const sql = getSql();
  const rows = await sql`
    DELETE FROM public.tasks WHERE id = ${taskId} RETURNING id
  `;
  if (!rows[0]) {
    throw Object.assign(new Error('Task not found'), { status: 404 });
  }
}

export async function deleteAllTasks(userId) {
  const sql = getSql();
  await sql`DELETE FROM public.tasks WHERE user_id = ${userId}`;
}

export async function bulkUploadTasks(tasks) {
  const created = [];
  for (const task of tasks) {
    created.push(await createTask(task));
  }
  return created;
}

export async function registerUser(pin) {
  const sql = getSql();
  const lookup = pinLookupKey(pin);
  const pinHash = await hashPin(pin);

  try {
    const rows = await sql`
      INSERT INTO public.users (pin_hash, pin_lookup)
      VALUES (${pinHash}, ${lookup})
      RETURNING *
    `;
    const user = serializeUser(rows[0]);
    const session = await issueSession(user.id);
    return { user, ...session };
  } catch (error) {
    if (String(error.message || error).includes('idx_users_pin_lookup')) {
      throw Object.assign(new Error('PIN already in use'), { status: 409 });
    }
    throw error;
  }
}

export async function loginWithPin(pin) {
  const sql = getSql();
  const lookup = pinLookupKey(pin);

  let rows = await sql`
    SELECT id, pin_hash, pin_lookup
    FROM public.users
    WHERE pin_lookup = ${lookup}
    LIMIT 1
  `;

  // Legacy fallback: old client-side SHA-256 hashes without pin_lookup
  if (!rows[0]) {
    const { createHash } = await import('node:crypto');
    const legacyHash = createHash('sha256').update(pin).digest('hex');
    rows = await sql`
      SELECT id, pin_hash, pin_lookup
      FROM public.users
      WHERE pin_hash = ${legacyHash} AND pin_lookup IS NULL
      LIMIT 1
    `;
  }

  if (!rows[0]) {
    throw Object.assign(new Error('Invalid PIN'), { status: 401 });
  }

  const userRow = rows[0];
  const valid = await verifyPinHash(pin, userRow.pin_hash);
  if (!valid) {
    throw Object.assign(new Error('Invalid PIN'), { status: 401 });
  }

  // Upgrade legacy accounts to bcrypt + lookup on successful login
  if (!userRow.pin_lookup || /^[a-f0-9]{64}$/i.test(userRow.pin_hash)) {
    const upgradedHash = await hashPin(pin);
    await sql`
      UPDATE public.users
      SET pin_hash = ${upgradedHash}, pin_lookup = ${lookup}
      WHERE id = ${userRow.id}
    `;
  }

  const session = await issueSession(userRow.id);
  return {
    user: { id: Number(userRow.id) },
    ...session,
  };
}

export async function getUser(userId) {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM public.users WHERE id = ${userId} LIMIT 1
  `;
  if (!rows[0]) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }
  return serializeUser(rows[0]);
}

export async function requireValidSession(userId, sessionId) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, user_id, expires_at, revoked_at
    FROM public.sessions
    WHERE id = ${sessionId} AND user_id = ${userId}
    LIMIT 1
  `;
  const session = rows[0];
  if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) {
    throw Object.assign(new Error('Session expired or revoked'), { status: 401 });
  }
  return session;
}

export async function revokeSession(userId, sessionId) {
  const sql = getSql();
  await sql`
    UPDATE public.sessions
    SET revoked_at = NOW()
    WHERE id = ${sessionId} AND user_id = ${userId} AND revoked_at IS NULL
  `;
}

export async function revokeAllSessions(userId) {
  const sql = getSql();
  await sql`
    UPDATE public.sessions
    SET revoked_at = NOW()
    WHERE user_id = ${userId} AND revoked_at IS NULL
  `;
}

export async function deleteUser(userId) {
  await revokeAllSessions(userId);
  await deleteAllTasks(userId);
  const sql = getSql();
  const rows = await sql`
    DELETE FROM public.users WHERE id = ${userId} RETURNING id
  `;
  if (!rows[0]) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }
}
