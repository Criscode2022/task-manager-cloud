/**
 * Shared HTTP router for Task Cloud Neon API.
 *
 * Auth model:
 * - Register/login send the raw PIN in the JSON body over HTTPS
 * - Server stores bcrypt(pin) + HMAC lookup; issues short-lived JWTs
 * - Protected routes require Authorization: Bearer <token>
 */
import {
  extractBearerToken,
  isValidPin,
  PIN_LENGTH,
  verifyAccessToken,
} from './auth.mjs';
import { corsHeaders } from './cors.mjs';
import {
  bulkUploadTasks,
  createTask,
  deleteAllTasks,
  deleteTask,
  deleteUser,
  ensureAuthSchema,
  getTaskById,
  getTasks,
  getUser,
  loginWithPin,
  registerUser,
  requireValidSession,
  revokeSession,
  updateTask,
} from './db.mjs';
import { clientIp, consumeRateLimit } from './rate-limit.mjs';

let schemaReady;

async function ensureSchemaOnce() {
  if (!schemaReady) {
    schemaReady = ensureAuthSchema().catch((err) => {
      schemaReady = undefined;
      throw err;
    });
  }
  await schemaReady;
}

function json(req, data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(req),
      ...extraHeaders,
    },
  });
}

function errorResponse(req, error) {
  const status = error.status || 500;
  if (status >= 500) {
    console.error('API error:', error);
  }
  return json(
    req,
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

function enforceAuthRateLimit(req, bucketName) {
  const ip = clientIp(req);
  const result = consumeRateLimit(`auth:${bucketName}:${ip}`, {
    limit: Number(process.env.AUTH_RATE_LIMIT || 10),
    windowMs: Number(process.env.AUTH_RATE_WINDOW_MS || 15 * 60 * 1000),
  });
  if (!result.allowed) {
    throw Object.assign(new Error('Too many auth attempts. Try again later.'), {
      status: 429,
      retryAfterSec: result.retryAfterSec,
    });
  }
  return result;
}

async function requireAuth(req) {
  const token = extractBearerToken(req);
  if (!token) {
    throw Object.assign(new Error('Authentication required'), { status: 401 });
  }
  let claims;
  try {
    claims = await verifyAccessToken(token);
  } catch {
    throw Object.assign(new Error('Invalid or expired token'), { status: 401 });
  }
  await requireValidSession(claims.userId, claims.sessionId);
  return claims;
}

/**
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export async function handleApiRequest(req) {
  if (req.method === 'OPTIONS') {
    return json(req, { ok: true });
  }

  const url = new URL(req.url);
  let pathname = url.pathname
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api/, '');

  if (!pathname.startsWith('/')) {
    pathname = `/${pathname}`;
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  try {
    await ensureSchemaOnce();

    if (req.method === 'GET' && (pathname === '/' || pathname === '/health')) {
      return json(req, { ok: true, service: 'task-cloud-neon-api' });
    }

    // Register — raw PIN in body; rate-limited
    if (req.method === 'POST' && pathname === '/users') {
      const rate = enforceAuthRateLimit(req, 'register');
      const body = await readJson(req);
      if (!isValidPin(body.pin)) {
        return json(
          req,
          { error: `pin must be exactly ${PIN_LENGTH} digits` },
          400,
        );
      }
      const result = await registerUser(body.pin);
      return json(
        req,
        {
          id: result.id,
          token: result.token,
          expires_at: result.expires_at,
          expires_in: result.expires_in,
        },
        201,
        { 'X-RateLimit-Remaining': String(rate.remaining) },
      );
    }

    // Login — raw PIN in body; rate-limited. Replaces GET /users/by-pin/*
    if (req.method === 'POST' && pathname === '/auth/login') {
      const rate = enforceAuthRateLimit(req, 'login');
      const body = await readJson(req);
      if (!isValidPin(body.pin)) {
        return json(
          req,
          { error: `pin must be exactly ${PIN_LENGTH} digits` },
          400,
        );
      }
      const result = await loginWithPin(body.pin);
      return json(
        req,
        {
          id: result.id,
          token: result.token,
          expires_at: result.expires_at,
          expires_in: result.expires_in,
        },
        200,
        { 'X-RateLimit-Remaining': String(rate.remaining) },
      );
    }

    if (req.method === 'POST' && pathname === '/auth/logout') {
      const auth = await requireAuth(req);
      await revokeSession(auth.userId, auth.sessionId);
      return json(req, { ok: true });
    }

    if (req.method === 'GET' && pathname === '/auth/me') {
      const auth = await requireAuth(req);
      const user = await getUser(auth.userId);
      return json(req, user);
    }

    // Removed insecure routes:
    // - GET /users/by-pin/:hash (credential in URL)
    // - POST /users/:id/verify (pin_hash replay)

    if (req.method === 'GET' && /^\/users\/\d+$/.test(pathname)) {
      const userId = Number(pathname.split('/')[2]);
      const auth = await requireAuth(req);
      if (auth.userId !== userId) {
        return json(req, { error: 'Forbidden' }, 403);
      }
      const user = await getUser(userId);
      return json(req, user);
    }

    if (req.method === 'DELETE' && /^\/users\/\d+$/.test(pathname)) {
      const userId = Number(pathname.split('/')[2]);
      const auth = await requireAuth(req);
      if (auth.userId !== userId) {
        return json(req, { error: 'Forbidden' }, 403);
      }
      await deleteUser(userId);
      return json(req, { ok: true });
    }

    if (req.method === 'GET' && pathname === '/tasks') {
      const auth = await requireAuth(req);
      const userId = Number(url.searchParams.get('userId') || auth.userId);
      if (userId !== auth.userId) {
        return json(req, { error: 'Forbidden' }, 403);
      }
      const tasks = await getTasks(userId);
      return json(req, tasks);
    }

    if (req.method === 'POST' && pathname === '/tasks') {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      if (!body.title) {
        return json(req, { error: 'title is required' }, 400);
      }
      const task = await createTask({
        ...body,
        user_id: auth.userId,
      });
      return json(req, task, 201);
    }

    if (req.method === 'POST' && pathname === '/tasks/bulk') {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      if (!Array.isArray(body.tasks) || body.tasks.length === 0) {
        return json(req, { error: 'tasks array is required' }, 400);
      }
      const tasks = await bulkUploadTasks(
        body.tasks.map((t) => ({ ...t, user_id: auth.userId })),
      );
      return json(req, tasks, 201);
    }

    if (req.method === 'PUT' && /^\/tasks\/\d+$/.test(pathname)) {
      const auth = await requireAuth(req);
      const taskId = Number(pathname.split('/')[2]);
      const body = await readJson(req);
      const existing = await getTaskById(taskId);
      if (existing.user_id !== auth.userId) {
        return json(req, { error: 'Forbidden' }, 403);
      }
      const task = await updateTask(taskId, body);
      return json(req, task);
    }

    if (req.method === 'DELETE' && pathname === '/tasks') {
      const auth = await requireAuth(req);
      const userId = Number(url.searchParams.get('userId') || auth.userId);
      if (userId !== auth.userId) {
        return json(req, { error: 'Forbidden' }, 403);
      }
      await deleteAllTasks(userId);
      return json(req, { ok: true });
    }

    if (req.method === 'DELETE' && /^\/tasks\/\d+$/.test(pathname)) {
      const auth = await requireAuth(req);
      const taskId = Number(pathname.split('/')[2]);
      const existing = await getTaskById(taskId);
      if (existing.user_id !== auth.userId) {
        return json(req, { error: 'Forbidden' }, 403);
      }
      await deleteTask(taskId);
      return json(req, { ok: true });
    }

    // Explicitly reject legacy credential-in-URL route
    if (pathname.startsWith('/users/by-pin/')) {
      return json(
        req,
        {
          error:
            'Gone. Use POST /auth/login with JSON body { "pin": "..." } instead.',
        },
        410,
      );
    }

    return json(req, { error: `Not found: ${req.method} ${pathname}` }, 404);
  } catch (error) {
    const headers = {};
    if (error.status === 429 && error.retryAfterSec) {
      headers['Retry-After'] = String(error.retryAfterSec);
    }
    const response = errorResponse(req, error);
    if (Object.keys(headers).length) {
      const merged = new Headers(response.headers);
      for (const [k, v] of Object.entries(headers)) merged.set(k, v);
      return new Response(response.body, {
        status: response.status,
        headers: merged,
      });
    }
    return response;
  }
}
