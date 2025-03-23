import { Module } from '@nestjs/common';

import { UsersController } from '@/api/controllers/users.controller';
import { PrismaModule } from '@/infrastructure/persistence/prisma/prisma.module';
import { UsersRepository } from '@/infrastructure/persistence/repositories/users.repository';

import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
