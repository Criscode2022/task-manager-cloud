import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthClaims } from './auth.types';

export type AuthedRequest = Request & { auth: AuthClaims };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = this.auth.extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }
    let claims: AuthClaims;
    try {
      claims = await this.auth.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    await this.auth.requireValidSession(claims.userId, claims.sessionId);
    req.auth = claims;
    return true;
  }
}
