/**
 * Local Neon API server for Angular `ng serve` development.
 * Mirrors Netlify Functions routing under /api/*
 */
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

loadEnv({ path: join(root, '.env') });

const { handleApiRequest } = await import(
  pathToFileURL(join(root, 'server', 'http-handler.mjs')).href
);

const port = Number(process.env.API_PORT || 3001);

const server = createServer(async (req, res) => {
  try {
    const host = req.headers.host || `localhost:${port}`;
    const url = new URL(req.url || '/', `http://${host}`);

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : body,
    });

    const response = await handleApiRequest(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const text = await response.text();
    res.end(text);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
  }
});

server.listen(port, () => {
  console.log(`Neon local API listening on http://localhost:${port}`);
  console.log(`Health: http://localhost:${port}/api/health`);
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL is not set — API calls will fail until it is configured.');
  }
});
