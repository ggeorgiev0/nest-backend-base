import { Module } from '@nestjs/common';

import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { LoggerModule } from '@/common/logger';
import { ConfigModule } from '@/config/config.module';
import { UsersModule } from '@/core/services/users/users.module';
import { PrismaModule } from '@/infrastructure/persistence/prisma/prisma.module';
import { SupabaseModule } from '@/infrastructure/persistence/supabase/supabase.module';

@Module({
  imports: [ConfigModule, LoggerModule, PrismaModule, SupabaseModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
