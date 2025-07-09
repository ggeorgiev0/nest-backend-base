import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { RequestSizeLimitMiddleware } from './request-size-limit.middleware';
import { RequestTimeoutMiddleware } from './request-timeout.middleware';

/**
 * Module that provides common middleware for the application
 */
@Module({
  imports: [ConfigModule],
  providers: [RequestTimeoutMiddleware, RequestSizeLimitMiddleware],
  exports: [RequestTimeoutMiddleware, RequestSizeLimitMiddleware],
})
export class MiddlewareModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply middleware to all routes
    consumer.apply(RequestSizeLimitMiddleware, RequestTimeoutMiddleware).forRoutes('*');
  }
}
