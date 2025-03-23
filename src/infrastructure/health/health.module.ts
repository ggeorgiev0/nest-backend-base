import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from '@/api/controllers/health.controller';

import { PrismaModule } from '../persistence/prisma/prisma.module';

import { PrismaHealthIndicator } from './prisma.health';

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator],
  exports: [PrismaHealthIndicator],
})
export class HealthModule {}
