import { Injectable } from '@angular/core';

/** Login recovery code length (digits). */
export const PIN_LENGTH = 8;

/**
 * Client-side PIN helpers.
 * Hashing is intentionally NOT done in the browser anymore — the raw PIN is
 * sent once over HTTPS and hashed server-side with bcrypt + per-user salt.
 */
@Injectable({
  providedIn: 'root',
})
export class PinHashService {
  /**
   * Generate a cryptographically random numeric PIN.
   */
  generatePin(length = PIN_LENGTH): string {
    const digits = new Uint32Array(length);
    crypto.getRandomValues(digits);
    return Array.from(digits, (n) => String(n % 10)).join('');
  }

  /**
   * Validate PIN format (digits only, expected length).
   */
  isValidPin(pin: string, length = PIN_LENGTH): boolean {
    return new RegExp(`^\\d{${length}}$`).test(pin || '');
  }
}
