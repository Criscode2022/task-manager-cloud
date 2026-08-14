import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthedRequest } from './auth.guard';
import { AuthClaims } from './auth.types';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthClaims => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    return req.auth;
  },
);
