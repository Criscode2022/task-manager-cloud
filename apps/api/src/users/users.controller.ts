import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { AuthClaims } from '../auth/auth.types';
import { PinDto } from '../auth/dto/pin.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  @Public()
  @Throttle({ default: { ttl: 900_000, limit: 10 } })
  @Post()
  register(@Body() body: PinDto) {
    return this.auth.register(body.pin);
  }

  @Public()
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
  getUser(
    @Param('id', ParseIntPipe) userId: number,
    @CurrentUser() user: AuthClaims,
  ) {
    return this.users.getOwnUser(user.userId, userId);
  }

  @Delete(':id')
  @HttpCode(200)
  async deleteUser(
    @Param('id', ParseIntPipe) userId: number,
    @CurrentUser() user: AuthClaims,
  ) {
    await this.users.deleteOwnUser(user.userId, userId);
    return { ok: true };
  }
}
