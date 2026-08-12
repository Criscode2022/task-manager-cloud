/**
 * Neon Postgres data access shared by Netlify Functions and the local API server.
 */
import { neon } from '@neondatabase/serverless';

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
  // Never expose pin_hash to API clients
  return {
    id: Number(row.id),
    created_at: row.created_at,
  };
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

export async function createUser(pinHash) {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO public.users (pin_hash)
    VALUES (${pinHash})
    RETURNING *
  `;
  return serializeUser(rows[0]);
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

export async function getUserByPinHash(pinHash) {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM public.users WHERE pin_hash = ${pinHash} LIMIT 1
  `;
  if (!rows[0]) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }
  return serializeUser(rows[0]);
}

export async function verifyUserPin(userId, pinHash) {
  const sql = getSql();
  const rows = await sql`
    SELECT pin_hash FROM public.users WHERE id = ${userId} LIMIT 1
  `;
  if (!rows[0]) {
    return false;
  }
  return rows[0].pin_hash === pinHash;
}

export async function deleteUser(userId) {
  await deleteAllTasks(userId);
  const sql = getSql();
  const rows = await sql`
    DELETE FROM public.users WHERE id = ${userId} RETURNING id
  `;
  if (!rows[0]) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }
}
