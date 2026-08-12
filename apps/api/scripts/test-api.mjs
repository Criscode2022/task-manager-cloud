/**
 * End-to-end smoke test against the Nest Neon API.
 *
 * Usage (from repo root):
 *   npm run api
 *   npm run test:api
 */
import { randomInt } from 'node:crypto';

const base = (process.env.API_BASE_URL || 'http://localhost:3001/api').replace(
  /\/$/,
  '',
);

function randomPin() {
  return String(randomInt(10_000_000, 99_999_999));
}

async function req(method, path, body, token) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}${path}`, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(
      `${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`,
    );
  }
  return data;
}

async function expectStatus(method, path, body, token, status) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status !== status) {
    const text = await res.text();
    throw new Error(
      `${method} ${path} expected ${status}, got ${res.status}: ${text}`,
    );
  }
}

async function main() {
  console.log('Testing Neon API at', base);

  const health = await req('GET', '/health');
  console.log('✓ health', health);

  const pin = randomPin();
  const created = await req('POST', '/users', { pin });
  if (!created.token || !created.id || !created.expires_at) {
    throw new Error('register must return id, token, expires_at');
  }
  if (created.pin_hash) {
    throw new Error('pin_hash must not be returned');
  }
  console.log('✓ register user', created.id);

  await expectStatus('GET', `/tasks?userId=${created.id}`, undefined, undefined, 401);
  console.log('✓ reject unauthenticated task list');

  await expectStatus(
    'GET',
    `/users/by-pin/${encodeURIComponent('deadbeef')}`,
    undefined,
    undefined,
    410,
  );
  console.log('✓ reject credential-in-URL by-pin route');

  const task = await req(
    'POST',
    '/tasks',
    {
      title: 'Auth hardening smoke test',
      description: 'created by scripts/test-neon-api.mjs',
      done: false,
      priority: 'high',
      tags: ['neon', 'security'],
    },
    created.token,
  );
  console.log('✓ create task', task.id);

  const updated = await req(
    'PUT',
    `/tasks/${task.id}`,
    { done: true },
    created.token,
  );
  if (!updated.done) throw new Error('update failed');
  console.log('✓ update task');

  const listed = await req(
    'GET',
    `/tasks?userId=${created.id}`,
    undefined,
    created.token,
  );
  if (!listed.some((t) => t.id === task.id)) throw new Error('list missing task');
  console.log('✓ list tasks', listed.length);

  await req('POST', '/auth/logout', {}, created.token);
  console.log('✓ logout');

  await expectStatus(
    'GET',
    `/tasks?userId=${created.id}`,
    undefined,
    created.token,
    401,
  );
  console.log('✓ revoked token rejected');

  const login = await req('POST', '/auth/login', { pin });
  if (!login.token) throw new Error('login must return token');
  console.log('✓ login');

  const bulk = await req(
    'POST',
    '/tasks/bulk',
    {
      tasks: [
        { title: 'Bulk A', description: '', done: false, priority: 'low', tags: [] },
        { title: 'Bulk B', description: '', done: false, priority: 'low', tags: ['b'] },
      ],
    },
    login.token,
  );
  console.log('✓ bulk upload', bulk.length);

  await req('DELETE', `/tasks?userId=${login.id}`, undefined, login.token);
  console.log('✓ delete all tasks');

  await req('DELETE', `/users/${login.id}`, undefined, login.token);
  console.log('✓ delete user');

  console.log('\nAll Neon API security smoke tests passed.');
  console.log(`PIN used during test: ${pin}`);
}

main().catch((err) => {
  console.error('\nNeon API smoke test failed:', err.message);
  process.exit(1);
});
