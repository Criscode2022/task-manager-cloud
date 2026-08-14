import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

function ctx(headers: Record<string, string> = {}): ExecutionContext {
  const req = { headers, auth: undefined };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  const auth = {
    extractBearerToken: (h?: string) =>
      /^Bearer\s+(.+)$/i.exec(h || '')?.[1] || '',
    verifyAccessToken: async (token: string) => {
      if (token !== 'good') throw new Error('bad');
      return { userId: 1, sessionId: 's1' };
    },
    requireValidSession: async () => ({ id: 's1' }),
  } as unknown as AuthService;

  it('lets public handlers through', async () => {
    const reflector = {
      getAllAndOverride: () => true,
    } as unknown as Reflector;
    const guard = new AuthGuard(auth, reflector);
    await expect(guard.canActivate(ctx())).resolves.toBe(true);
  });

  it('rejects a missing bearer token', async () => {
    const reflector = {
      getAllAndOverride: () => false,
    } as unknown as Reflector;
    const guard = new AuthGuard(auth, reflector);
    await expect(guard.canActivate(ctx())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches claims when the token is valid', async () => {
    const reflector = {
      getAllAndOverride: () => false,
    } as unknown as Reflector;
    const guard = new AuthGuard(auth, reflector);
    const request = ctx({ authorization: 'Bearer good' });
    await expect(guard.canActivate(request)).resolves.toBe(true);
    expect(request.switchToHttp().getRequest().auth).toEqual({
      userId: 1,
      sessionId: 's1',
    });
  });
});
