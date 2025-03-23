import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { PrismaService } from './prisma.service';

@Module({
  imports: [LoggerModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
