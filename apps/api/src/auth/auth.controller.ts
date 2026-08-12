import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { RateLimitService } from '../common/rate-limit.service';
import { AuthGuard, AuthedRequest } from './auth.guard';
import { AuthService } from './auth.service';
import { PinDto } from './dto/pin.dto';
import { HttpException } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly rateLimit: RateLimitService,
    private readonly config: ConfigService,
  ) {}

  private enforceAuthRateLimit(req: Request, bucketName: string) {
    const ip = this.rateLimit.clientIp(req);
    const result = this.rateLimit.consume(`auth:${bucketName}:${ip}`, {
      limit: Number(this.config.get('AUTH_RATE_LIMIT') || 10),
      windowMs: Number(this.config.get('AUTH_RATE_WINDOW_MS') || 15 * 60 * 1000),
    });
    if (!result.allowed) {
      throw new HttpException(
        {
          message: 'Too many auth attempts. Try again later.',
          retryAfterSec: result.retryAfterSec,
        },
        429,
      );
    }
    return result;
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: PinDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rate = this.enforceAuthRateLimit(req, 'login');
    const result = await this.auth.login(body.pin);
    res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
    return result;
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async logout(@Req() req: AuthedRequest) {
    await this.auth.revokeSession(req.auth.userId, req.auth.sessionId);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() req: AuthedRequest) {
    return this.auth.getUser(req.auth.userId);
  }
}
