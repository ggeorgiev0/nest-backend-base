import { ConfigService } from '@nestjs/config';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import {
  AllExceptionsFilter,
  GlobalValidationPipe,
  ExceptionMapperService,
  ErrorLoggerService,
} from './common/exceptions';
import { CustomLoggerService } from './common/logger';

/**
 * Bootstrap the application
 */
async function bootstrap(): Promise<void> {
  // Create the application with logger
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs until logger is set up
  });

  // Use Pino Logger for application logging
  app.useLogger(app.get(Logger));

  // Get configuration service
  const configService = app.get(ConfigService);

  // Register global validation pipe
  app.useGlobalPipes(
    new GlobalValidationPipe({
      transform: true, // Transform payloads to match DTO classes
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error when non-whitelisted properties are present
      forbidUnknownValues: true, // Validate nested objects without decorators
    }),
  );

  // Register global exception filter
  const httpAdapterHost = app.get(HttpAdapterHost);
  const logger = app.get(CustomLoggerService);
  const exceptionMapper = new ExceptionMapperService(configService);
  const errorLogger = new ErrorLoggerService(logger, configService);

  app.useGlobalFilters(
    new AllExceptionsFilter(httpAdapterHost, configService, logger, exceptionMapper, errorLogger),
  );

  // Get port from config
  const port = configService.get<number>('PORT', 3000);

  // Start the application
  await app.listen(port);

  // Log startup information using the configured logger
  const appName = configService.get<string>('APP_NAME', 'NestJS Backend Base');
  const environment = configService.get<string>('NODE_ENV', 'development');

  logger.log(`${appName} is running on port ${port} in ${environment} mode`);
}

// Using void to explicitly mark that we're handling the promise
void bootstrap();
