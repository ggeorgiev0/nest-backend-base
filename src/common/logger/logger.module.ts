import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import { ConfigModule } from '../../config/config.module';

import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { LoggerConfigService } from './logger.config';
import { CustomLoggerService } from './logger.service';

/**
 * Logger module that provides a configured Pino logger and correlation ID middleware
 */
@Module({
  imports: [
    ConfigModule,
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const loggerConfigService = new LoggerConfigService(configService);
        return loggerConfigService.createLoggerOptions();
      },
    }),
  ],
  providers: [LoggerConfigService, CustomLoggerService],
  exports: [PinoLoggerModule, CustomLoggerService],
})
export class LoggerModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply the correlation ID middleware to all routes
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
