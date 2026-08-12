/**
 * CORS helpers — allow only configured origins (no wildcard in production).
 */

const DEFAULT_ORIGINS = [
  'https://task-cloud.netlify.app',
  'http://localhost:4200',
  'http://127.0.0.1:4200',
];

export function allowedOrigins() {
  const fromEnv = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : DEFAULT_ORIGINS;
}

export function corsHeaders(req) {
  const origin = req.headers.get('origin');
  const allowed = allowedOrigins();
  const headers = {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Vary': 'Origin',
  };

  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (!origin) {
    // Non-browser clients (curl, MCP, smoke tests) — omit ACAO
  }

  return headers;
}
