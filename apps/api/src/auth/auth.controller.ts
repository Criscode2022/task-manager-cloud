import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from './current-user.decorator';
import { AuthService } from './auth.service';
import { AuthClaims } from './auth.types';
import { PinDto } from './dto/pin.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 900_000, limit: 10 } })
  @Post('login')
  @HttpCode(200)
  login(@Body() body: PinDto) {
    return this.auth.login(body.pin);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentUser() user: AuthClaims) {
    await this.auth.revokeSession(user.userId, user.sessionId);
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthClaims) {
    return this.auth.getUser(user.userId);
  }
}
