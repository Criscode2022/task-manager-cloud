import { Injectable } from '@angular/core';

/**
 * Service for secure PIN hashing using Web Crypto API
 * Uses SHA-256 for cryptographic hashing
 */
@Injectable({
  providedIn: 'root',
})
export class PinHashService {
  /**
   * Hash a PIN using SHA-256
   * @param pin - The PIN to hash (4-digit string)
   * @returns Promise with hex-encoded hash
   */
  async hashPin(pin: string): Promise<string> {
    // Convert PIN string to Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);

    // Hash using SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  }

  /**
   * Generate a random 4-digit PIN
   * @returns A random 4-digit PIN string
   */
  generatePin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Verify a PIN against a hash
   * @param pin - The PIN to verify
   * @param hash - The stored hash to compare against
   * @returns Promise with true if PIN matches
   */
  async verifyPin(pin: string, hash: string): Promise<boolean> {
    const pinHash = await this.hashPin(pin);
    return pinHash === hash;
  }
}
