import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { LoggerModule } from '@common/logger';

import { RealtimeService } from './realtime.service';
import { RLSService } from './rls.service';
import { SupabaseService } from './supabase.service';

@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [SupabaseService, RLSService, RealtimeService],
  exports: [SupabaseService, RLSService, RealtimeService],
})
export class SupabaseModule {}
