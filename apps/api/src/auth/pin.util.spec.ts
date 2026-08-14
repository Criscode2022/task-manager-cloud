import { hashPin, isValidPin, pinLookupKey, verifyPinHash } from './pin.util';

describe('pin.util', () => {
  it('accepts exactly 8 digits', () => {
    expect(isValidPin('12345678')).toBe(true);
    expect(isValidPin('1234567')).toBe(false);
    expect(isValidPin('1234567a')).toBe(false);
    expect(isValidPin(12345678)).toBe(false);
  });

  it('derives a stable lookup key from PIN + pepper', () => {
    const a = pinLookupKey('12345678', 'pepper-one');
    const b = pinLookupKey('12345678', 'pepper-one');
    const c = pinLookupKey('12345678', 'pepper-two');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('verifies a bcrypt PIN hash', async () => {
    const hash = await hashPin('87654321');
    expect(await verifyPinHash('87654321', hash)).toBe(true);
    expect(await verifyPinHash('00000000', hash)).toBe(false);
  });

  it('still verifies the legacy unsalted SHA-256 hex', async () => {
    const { createHash } = await import('node:crypto');
    const legacy = createHash('sha256').update('11223344').digest('hex');
    expect(await verifyPinHash('11223344', legacy)).toBe(true);
    expect(await verifyPinHash('00000000', legacy)).toBe(false);
  });
});
