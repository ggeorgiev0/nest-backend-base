import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';

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
  const port = configService.get<number>('PORT', 3000);

  // Start the application
  await app.listen(port);

  // Log startup information using the configured logger
  const logger = app.get(Logger);
  const appName = configService.get<string>('APP_NAME', 'NestJS Backend Base');
  const environment = configService.get<string>('NODE_ENV', 'development');

  logger.log(`${appName} is running on port ${port} in ${environment} mode`);
}

// Using void to explicitly mark that we're handling the promise
void bootstrap();
