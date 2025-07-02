import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult } from '@nestjs/terminus';

import { ExternalServiceException } from '@/common/exceptions';

import { PrismaService } from '../persistence/prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator {
  constructor(private prisma: PrismaService) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        [key]: {
          status: 'up',
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Create a custom error with the necessary context for health check
      const healthCheckResult = {
        [key]: {
          status: 'down',
          error: errorMessage,
        },
      };

      // Throw our custom exception with the health check context
      throw new ExternalServiceException('Prisma health check failed', {
        healthCheckResult,
        cause: error,
      });
    }
  }
}
