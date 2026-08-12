/**
 * Auth helpers: PIN validation, bcrypt hashing, lookup HMAC, JWT sessions.
 */
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

export const PIN_LENGTH = 8;
const BCRYPT_ROUNDS = 12;
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw Object.assign(new Error(`${name} is not configured`), { status: 500 });
  }
  return value;
}

export function getSessionTtlSeconds() {
  const raw = Number(process.env.SESSION_TTL_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SESSION_TTL_SECONDS;
}

export function isValidPin(pin) {
  return typeof pin === 'string' && new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export function pinLookupKey(pin) {
  const pepper = requireEnv('PIN_PEPPER');
  return createHmac('sha256', pepper).update(pin).digest('hex');
}

export async function hashPin(pin) {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

export async function verifyPinHash(pin, storedHash) {
  if (!storedHash) return false;
  // Legacy unsalted SHA-256 hex (64 chars) from previous client-side hashing
  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    const { createHash } = await import('node:crypto');
    const legacy = createHash('sha256').update(pin).digest('hex');
    try {
      return timingSafeEqual(
        Buffer.from(legacy, 'utf8'),
        Buffer.from(storedHash.toLowerCase(), 'utf8'),
      );
    } catch {
      return false;
    }
  }
  return bcrypt.compare(pin, storedHash);
}

function jwtSecretKey() {
  return new TextEncoder().encode(requireEnv('JWT_SECRET'));
}

export async function createAccessToken({ userId, sessionId, expiresAt }) {
  return new SignJWT({
    sid: sessionId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(jwtSecretKey());
}

export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, jwtSecretKey());
  const userId = Number(payload.sub);
  const sessionId = String(payload.sid || '');
  if (!userId || !sessionId) {
    throw Object.assign(new Error('Invalid token'), { status: 401 });
  }
  return { userId, sessionId, exp: payload.exp };
}

export function newSessionId() {
  return randomUUID();
}

export function extractBearerToken(req) {
  const header = req.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}
