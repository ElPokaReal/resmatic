import { Controller, Get } from '@nestjs/common';

@Controller({ path: 'health', version: '1' })
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      time: new Date().toISOString(),
      uptime: Math.round(process.uptime() * 1000), // ms
    };
  }
}
