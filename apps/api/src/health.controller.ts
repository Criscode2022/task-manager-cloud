import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  root() {
    return { ok: true, service: 'task-cloud-nest-api' };
  }

  @Get('health')
  health() {
    return { ok: true, service: 'task-cloud-nest-api' };
  }
}
