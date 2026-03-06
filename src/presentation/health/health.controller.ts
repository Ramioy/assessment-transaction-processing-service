import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { Public } from '@shared/guards/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check', description: 'Returns service liveness status. Public — no API key required.' })
  @ApiResponse({ status: 200, description: 'Service is up', schema: { example: { status: 'ok', timestamp: '2026-03-06T00:00:00.000Z' } } })
  @ApiResponse({ status: 404, description: 'Health check disabled (ENABLE_HEALTH_CHECK=false)' })
  check(): { status: string; timestamp: string } {
    if (!this.configService.get<boolean>('ENABLE_HEALTH_CHECK', true)) {
      throw new NotFoundException('Health check is disabled');
    }
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
