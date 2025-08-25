import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './common/prisma/prisma.service';

@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  check() {
    return {
      status: 'ok',
      time: new Date().toISOString(),
      uptime: Math.round(process.uptime() * 1000), // ms
    };
  }

  @Get('ready')
  async ready() {
    const requiredEnvVars = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
    for (const key of requiredEnvVars) {
      if (!this.config.get<string>(key)) {
        throw new ServiceUnavailableException(`Missing required environment variable: ${key}`);
      }
    }

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        time: new Date().toISOString(),
        uptime: Math.round(process.uptime() * 1000), // ms
      };
    } catch (error) {
      throw new ServiceUnavailableException('Database not ready');
    }
  }
}
