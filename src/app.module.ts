import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { DatabaseErrorInterceptor } from '@/common/interceptors/database-error.interceptor';
import { LoggerModule } from '@/common/logger';
import { MiddlewareModule } from '@/common/middleware/middleware.module';
import { ConfigModule } from '@/config/config.module';
import { UsersModule } from '@/core/services/users/users.module';
import { HealthModule } from '@/infrastructure/health/health.module';
import { PrismaModule } from '@/infrastructure/persistence/prisma/prisma.module';
import { SupabaseModule } from '@/infrastructure/persistence/supabase/supabase.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    MiddlewareModule,
    PrismaModule,
    SupabaseModule,
    UsersModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: DatabaseErrorInterceptor,
    },
  ],
})
export class AppModule {}
