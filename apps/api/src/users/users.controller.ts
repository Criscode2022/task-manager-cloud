import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthGuard, AuthedRequest } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { PinDto } from '../auth/dto/pin.dto';
import { RateLimitService } from '../common/rate-limit.service';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
    private readonly rateLimit: RateLimitService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  async register(
    @Body() body: PinDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = this.rateLimit.clientIp(req);
    const rate = this.rateLimit.consume(`auth:register:${ip}`, {
      limit: Number(this.config.get('AUTH_RATE_LIMIT') || 10),
      windowMs: Number(this.config.get('AUTH_RATE_WINDOW_MS') || 15 * 60 * 1000),
    });
    if (!rate.allowed) {
      throw new HttpException(
        {
          message: 'Too many auth attempts. Try again later.',
          retryAfterSec: rate.retryAfterSec,
        },
        429,
      );
    }
    const result = await this.auth.register(body.pin);
    res.status(201);
    res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
    return result;
  }

  @Get('by-pin/:hash')
  gone() {
    throw new HttpException(
      {
        message:
          'Gone. Use POST /auth/login with JSON body { "pin": "..." } instead.',
      },
      410,
    );
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async getUser(
    @Param('id', ParseIntPipe) userId: number,
    @Req() req: AuthedRequest,
  ) {
    if (req.auth.userId !== userId) {
      throw new ForbiddenException('Forbidden');
    }
    return this.users.getUser(userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async deleteUser(
    @Param('id', ParseIntPipe) userId: number,
    @Req() req: AuthedRequest,
  ) {
    if (req.auth.userId !== userId) {
      throw new ForbiddenException('Forbidden');
    }
    await this.users.deleteUser(userId);
    return { ok: true };
  }
}
