/**
 * End-to-end smoke test against the local Neon API (or any API_BASE_URL).
 *
 * Usage:
 *   DATABASE_URL=... npm run api   # terminal 1
 *   node scripts/test-neon-api.mjs # terminal 2
 */
import { createHash, randomInt } from 'node:crypto';

const base = (process.env.API_BASE_URL || 'http://localhost:3001/api').replace(
  /\/$/,
  '',
);

function hashPin(pin) {
  return createHash('sha256').update(pin).digest('hex');
}

async function req(method, path, body, pinHash) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (pinHash) headers['X-Pin-Hash'] = pinHash;

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
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log('Testing Neon API at', base);

  const health = await req('GET', '/health');
  console.log('✓ health', health);

  const pin = String(randomInt(1000, 9999));
  const pinHash = hashPin(pin);
  const user = await req('POST', '/users', { pin_hash: pinHash });
  console.log('✓ create user', user.id, 'pin', pin);
  if (user.pin_hash) {
    throw new Error('pin_hash must not be returned in user responses');
  }

  const verify = await req(
    'POST',
    `/users/${user.id}/verify`,
    { pin_hash: pinHash },
    pinHash,
  );
  if (!verify.valid) throw new Error('PIN verify failed');
  console.log('✓ verify pin');

  const byPin = await req(
    'GET',
    `/users/by-pin/${encodeURIComponent(pinHash)}`,
  );
  if (byPin.id !== user.id) throw new Error('by-pin mismatch');
  console.log('✓ get user by pin');

  // Unauthenticated list must fail
  let blocked = false;
  try {
    await req('GET', `/tasks?userId=${user.id}`);
  } catch (err) {
    blocked = String(err.message).includes('401');
  }
  if (!blocked) throw new Error('expected 401 without X-Pin-Hash on GET /tasks');
  console.log('✓ reject unauthenticated task list');

  const task = await req(
    'POST',
    '/tasks',
    {
      user_id: user.id,
      title: 'Neon migration smoke test',
      description: 'created by scripts/test-neon-api.mjs',
      done: false,
      priority: 'high',
      tags: ['neon', 'smoke'],
    },
    pinHash,
  );
  console.log('✓ create task', task.id);

  const updated = await req(
    'PUT',
    `/tasks/${task.id}`,
    {
      done: true,
      priority: 'medium',
    },
    pinHash,
  );
  if (!updated.done) throw new Error('update failed');
  console.log('✓ update task');

  const listed = await req(
    'GET',
    `/tasks?userId=${user.id}`,
    undefined,
    pinHash,
  );
  if (!listed.some((t) => t.id === task.id)) throw new Error('list missing task');
  console.log('✓ list tasks', listed.length);

  await req('DELETE', `/tasks/${task.id}`, undefined, pinHash);
  console.log('✓ delete task');

  const bulk = await req(
    'POST',
    '/tasks/bulk',
    {
      tasks: [
        {
          user_id: user.id,
          title: 'Bulk A',
          description: '',
          done: false,
          priority: 'low',
          tags: [],
        },
        {
          user_id: user.id,
          title: 'Bulk B',
          description: '',
          done: false,
          priority: 'low',
          tags: ['b'],
        },
      ],
    },
    pinHash,
  );
  console.log('✓ bulk upload', bulk.length);

  await req('DELETE', `/tasks?userId=${user.id}`, undefined, pinHash);
  console.log('✓ delete all tasks');

  await req('DELETE', `/users/${user.id}`, undefined, pinHash);
  console.log('✓ delete user');

  console.log('\nAll Neon API smoke tests passed.');
  console.log(`Save this test PIN if needed: ${pin}`);
}

main().catch((err) => {
  console.error('\nNeon API smoke test failed:', err.message);
  process.exit(1);
});
