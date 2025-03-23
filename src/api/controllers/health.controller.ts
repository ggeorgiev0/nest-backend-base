import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
} from '@nestjs/terminus';

import { BaseException } from '@/common/exceptions';
import { PrismaHealthIndicator } from '@/infrastructure/health/prisma.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    try {
      return await this.health.check([
        (): Promise<HealthIndicatorResult> => this.prismaHealth.isHealthy('prisma'),
      ]);
    } catch (error) {
      // Check if the error is one of our BaseExceptions with healthCheckResult context
      if (error instanceof BaseException && error.errorContext?.healthCheckResult) {
        return {
          status: 'error',
          info: error.errorContext.healthCheckResult as HealthIndicatorResult,
          details: {},
        };
      }
      // Otherwise re-throw the error for the global exception filter to handle
      throw error;
    }
  }
}
