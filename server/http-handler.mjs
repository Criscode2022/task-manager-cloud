/**
 * Shared HTTP router for Task Cloud Neon API.
 * Protected routes require a matching PIN hash via X-Pin-Hash header
 * (body/query pin_hash also accepted as fallback).
 */
import {
  bulkUploadTasks,
  createTask,
  createUser,
  deleteAllTasks,
  deleteTask,
  deleteUser,
  getTaskById,
  getTasks,
  getUser,
  getUserByPinHash,
  updateTask,
  verifyUserPin,
} from './db.mjs';

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Pin-Hash',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...headers,
    },
  });
}

function errorResponse(error) {
  const status = error.status || 500;
  console.error('API error:', error);
  return json(
    {
      error: error.message || 'Internal server error',
    },
    status,
  );
}

async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function extractPinHash(req, body = {}, url) {
  return (
    req.headers.get('x-pin-hash') ||
    body.pin_hash ||
    url.searchParams.get('pin_hash') ||
    ''
  );
}

async function requireUserPin(userId, pinHash) {
  if (!userId || !pinHash) {
    throw Object.assign(new Error('Authentication required'), { status: 401 });
  }
  const valid = await verifyUserPin(Number(userId), pinHash);
  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }
}

/**
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export async function handleApiRequest(req) {
  if (req.method === 'OPTIONS') {
    return json({ ok: true });
  }

  const url = new URL(req.url);
  // Support both /api/... and /.netlify/functions/api/...
  let pathname = url.pathname
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api/, '');

  if (!pathname.startsWith('/')) {
    pathname = `/${pathname}`;
  }

  // Normalize trailing slash (except root)
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  try {
    // Health — public
    if (req.method === 'GET' && (pathname === '/' || pathname === '/health')) {
      return json({ ok: true, service: 'task-cloud-neon-api' });
    }

    // Users — create account (public; pin_hash becomes the credential)
    if (req.method === 'POST' && pathname === '/users') {
      const body = await readJson(req);
      if (!body.pin_hash) {
        return json({ error: 'pin_hash is required' }, 400);
      }
      const user = await createUser(body.pin_hash);
      return json(user, 201);
    }

    // Login lookup — credential is in the path
    if (req.method === 'GET' && pathname.startsWith('/users/by-pin/')) {
      const pinHash = decodeURIComponent(pathname.slice('/users/by-pin/'.length));
      if (!pinHash) {
        return json({ error: 'Authentication required' }, 401);
      }
      const user = await getUserByPinHash(pinHash);
      return json(user);
    }

    if (req.method === 'GET' && /^\/users\/\d+$/.test(pathname)) {
      const userId = Number(pathname.split('/')[2]);
      const pinHash = extractPinHash(req, {}, url);
      await requireUserPin(userId, pinHash);
      const user = await getUser(userId);
      return json(user);
    }

    if (req.method === 'POST' && /^\/users\/\d+\/verify$/.test(pathname)) {
      const userId = Number(pathname.split('/')[2]);
      const body = await readJson(req);
      const pinHash = extractPinHash(req, body, url);
      if (!pinHash) {
        return json({ error: 'Authentication required' }, 401);
      }
      const valid = await verifyUserPin(userId, pinHash);
      return json({ valid });
    }

    if (req.method === 'DELETE' && /^\/users\/\d+$/.test(pathname)) {
      const userId = Number(pathname.split('/')[2]);
      const pinHash = extractPinHash(req, {}, url);
      await requireUserPin(userId, pinHash);
      await deleteUser(userId);
      return json({ ok: true });
    }

    // Tasks
    if (req.method === 'GET' && pathname === '/tasks') {
      const userId = Number(url.searchParams.get('userId'));
      if (!userId) {
        return json({ error: 'userId query param is required' }, 400);
      }
      const pinHash = extractPinHash(req, {}, url);
      await requireUserPin(userId, pinHash);
      const tasks = await getTasks(userId);
      return json(tasks);
    }

    if (req.method === 'POST' && pathname === '/tasks') {
      const body = await readJson(req);
      if (!body.user_id || !body.title) {
        return json({ error: 'user_id and title are required' }, 400);
      }
      const pinHash = extractPinHash(req, body, url);
      await requireUserPin(body.user_id, pinHash);
      const task = await createTask(body);
      return json(task, 201);
    }

    if (req.method === 'POST' && pathname === '/tasks/bulk') {
      const body = await readJson(req);
      if (!Array.isArray(body.tasks) || body.tasks.length === 0) {
        return json({ error: 'tasks array is required' }, 400);
      }
      const userIds = [
        ...new Set(body.tasks.map((t) => Number(t.user_id)).filter(Boolean)),
      ];
      if (userIds.length !== 1) {
        return json(
          { error: 'All bulk tasks must belong to the same authenticated user' },
          400,
        );
      }
      const pinHash = extractPinHash(req, body, url);
      await requireUserPin(userIds[0], pinHash);
      const tasks = await bulkUploadTasks(body.tasks);
      return json(tasks, 201);
    }

    if (req.method === 'PUT' && /^\/tasks\/\d+$/.test(pathname)) {
      const taskId = Number(pathname.split('/')[2]);
      const body = await readJson(req);
      const existing = await getTaskById(taskId);
      const pinHash = extractPinHash(req, body, url);
      await requireUserPin(existing.user_id, pinHash);
      const task = await updateTask(taskId, body);
      return json(task);
    }

    if (req.method === 'DELETE' && pathname === '/tasks') {
      const userId = Number(url.searchParams.get('userId'));
      if (!userId) {
        return json({ error: 'userId query param is required' }, 400);
      }
      const pinHash = extractPinHash(req, {}, url);
      await requireUserPin(userId, pinHash);
      await deleteAllTasks(userId);
      return json({ ok: true });
    }

    if (req.method === 'DELETE' && /^\/tasks\/\d+$/.test(pathname)) {
      const taskId = Number(pathname.split('/')[2]);
      const existing = await getTaskById(taskId);
      const pinHash = extractPinHash(req, {}, url);
      await requireUserPin(existing.user_id, pinHash);
      await deleteTask(taskId);
      return json({ ok: true });
    }

    return json({ error: `Not found: ${req.method} ${pathname}` }, 404);
  } catch (error) {
    return errorResponse(error);
  }
}
