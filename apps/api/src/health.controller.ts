import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from './auth/public.decorator';
import { DatabaseService } from './database/database.service';

@Controller()
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Public()
  @Get()
  root() {
    return { ok: true, service: 'task-cloud-nest-api' };
  }

  @Public()
  @Get('health')
  async health() {
    try {
      await this.db.ping();
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }

    return { ok: true, service: 'task-cloud-nest-api' };
  }
}
