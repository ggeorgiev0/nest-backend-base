import { ConfigService } from '@nestjs/config';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from '@/app.module';
import {
  AllExceptionsFilter,
  GlobalValidationPipe,
  ExceptionMapperService,
  ErrorLoggerService,
} from '@/common/exceptions';
import { CustomLoggerService } from '@/common/logger';

// Store server instance for graceful shutdown
let app: Awaited<ReturnType<typeof NestFactory.create>> | null = null;
let logger: CustomLoggerService | null = null;
let isShuttingDown = false;

/**
 * Gracefully shutdown the application
 */
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  if (logger) {
    logger.log(`Received ${signal} signal. Starting graceful shutdown...`);
  }

  if (app) {
    try {
      // Set a timeout for graceful shutdown
      const shutdownTimeout = setTimeout(() => {
        if (logger) {
          logger.error('Graceful shutdown timeout. Force exiting...');
        }
        // In production environments, the process manager should handle forced shutdown
        throw new Error('Graceful shutdown timeout exceeded');
      }, 10_000); // 10 second timeout

      await app.close();
      clearTimeout(shutdownTimeout);

      if (logger) {
        logger.log('Application shut down successfully');
      }
    } catch (error) {
      if (logger) {
        logger.error(
          'Error during graceful shutdown',
          error instanceof Error ? error.message : String(error),
        );
      }
      throw error;
    }
  }
}

/**
 * Bootstrap the application
 */
async function bootstrap(): Promise<void> {
  try {
    // Create the application with logger
    app = await NestFactory.create(AppModule, {
      bufferLogs: true, // Buffer logs until logger is set up
      abortOnError: false, // Don't abort on startup errors
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

    // Use resolve() instead of get() for scoped providers
    const resolvedLogger = await app.resolve(CustomLoggerService);
    logger = resolvedLogger;

    const exceptionMapper = new ExceptionMapperService(configService);

    // Create error logger with the resolved logger instance
    const errorLogger = new ErrorLoggerService(resolvedLogger, configService);

    app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost, exceptionMapper, errorLogger));

    // Enable shutdown hooks
    app.enableShutdownHooks();

    // Get port from config
    const port = configService.get<number>('PORT', 3000);

    // Start the application
    await app.listen(port);

    // Log startup information using the configured logger
    const appName = configService.get<string>('APP_NAME', 'NestJS Backend Base');
    const environment = configService.get<string>('NODE_ENV', 'development');

    resolvedLogger.log(`${appName} is running on port ${port} in ${environment} mode`);
  } catch (error) {
    if (logger) {
      logger.error(
        'Failed to bootstrap application',
        error instanceof Error ? error.message : String(error),
      );
    } else {
      console.error('Failed to bootstrap application:', error);
    }
    throw error;
  }
}

// Handle process signals
process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  if (logger) {
    logger.error('Uncaught Exception', error.message);
  } else {
    console.error('Uncaught Exception:', error);
  }
  void gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, _promise: Promise<unknown>) => {
  if (logger) {
    logger.error('Unhandled Promise Rejection', JSON.stringify({ reason: String(reason) }));
  } else {
    console.error('Unhandled Promise Rejection:', reason);
  }
  void gracefulShutdown('unhandledRejection');
});

// Bootstrap the application
bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  // Allow the process manager to handle the restart
});
