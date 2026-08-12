import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import * as bcrypt from 'bcryptjs';

export const PIN_LENGTH = 8;
const BCRYPT_ROUNDS = 12;

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === 'string' && new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export function pinLookupKey(pin: string, pepper: string): string {
  return createHmac('sha256', pepper).update(pin).digest('hex');
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

export async function verifyPinHash(pin: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  // Legacy unsalted SHA-256 hex (64 chars) from previous client-side hashing
  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
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
