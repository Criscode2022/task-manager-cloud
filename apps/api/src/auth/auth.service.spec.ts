import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { AuthService } from './auth.service';

function makeAuth() {
  const config = {
    get: (key: string) => {
      const env: Record<string, string> = {
        JWT_SECRET: 'unit-test-jwt-secret-32-chars-min',
        PIN_PEPPER: 'unit-test-pin-pepper-32-chars-min',
        SESSION_TTL_SECONDS: '3600',
      };
      return env[key];
    },
  } as unknown as ConfigService;

  const db = { getSql: () => async () => [] } as unknown as DatabaseService;
  return new AuthService(db, config);
}

describe('AuthService', () => {
  const auth = makeAuth();

  it('extracts a Bearer token and ignores other schemes', () => {
    expect(auth.extractBearerToken('Bearer abc.def')).toBe('abc.def');
    expect(auth.extractBearerToken('bearer xyz')).toBe('xyz');
    expect(auth.extractBearerToken('Basic nope')).toBe('');
    expect(auth.extractBearerToken(undefined)).toBe('');
  });

  it('signs and verifies an access token', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const token = await auth.createAccessToken({
      userId: 42,
      sessionId: 'sid-1',
      expiresAt,
    });
    const claims = await auth.verifyAccessToken(token);
    expect(claims.userId).toBe(42);
    expect(claims.sessionId).toBe('sid-1');
  });

  it('rejects a tampered token', async () => {
    await expect(auth.verifyAccessToken('not-a-jwt')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
