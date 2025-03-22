# Structured Logging System

The logging system in this application provides structured, configurable logging using Pino and NestJS integration. It is designed to produce logs that are both human-readable in development and machine-parseable in production.

## Features

- **Structured JSON Logging**: All logs are structured in JSON format, making them easy to parse in production environments.
- **Environment-Based Configuration**: Logging configuration adapts based on the environment (development, production).
- **Redaction of Sensitive Data**: Sensitive data is automatically redacted from logs.
- **Correlation IDs**: Request tracing with correlation IDs for tracking requests across services.
- **Context-Aware Logging**: Logs include the context (controller, service, etc.) they originated from.
- **Multiple Log Levels**: Supports debug, info, warn, error, and fatal log levels.
- **Pretty Printing in Development**: Human-readable logs in development with color coding.
- **Log Rotation in Production**: Automatic log rotation based on file size and time to manage disk space.

## Usage

### Basic Logging with PinoLogger

For straightforward use cases, inject the `PinoLogger` from nestjs-pino:

```typescript
import { Controller } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Controller('example')
export class ExampleController {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext('ExampleController');
  }

  someMethod(): void {
    this.logger.info('This is an info message');
    this.logger.debug({ customField: 'value' }, 'Debug message with context');

    try {
      // Some operation
    } catch (error) {
      this.logger.error({ err: error }, 'An error occurred');
    }
  }
}
```

### Enhanced Logging with CustomLoggerService

For more advanced use cases, the `CustomLoggerService` extends the standard NestJS Logger and adds correlation ID tracking:

```typescript
import { Controller } from '@nestjs/common';
import { CustomLoggerService } from '../common/logger/logger.service';

@Controller('example')
export class ExampleController {
  constructor(private readonly logger: CustomLoggerService) {}

  someMethod(): void {
    this.logger.log('Standard log message');
    this.logger.debug('Debug message');

    try {
      // Some operation
    } catch (error) {
      this.logger.error(error, undefined, {
        additionalContext: 'Some additional context',
      });
    }
  }
}
```

## Configuration

Logging is configured through environment variables:

- `LOG_LEVEL`: Sets the minimum log level (trace, debug, info, warn, error, fatal)
- `LOG_FORMAT`: Sets the format (dev, json)
- `NODE_ENV`: Affects logging behavior (development, production)
- `LOG_DIR`: Directory where log files are stored (default: 'logs')
- `LOG_FILE_PREFIX`: Prefix for log file names (default: 'app')

In development mode with `LOG_FORMAT=dev`, logs are pretty-printed. In production, logs are output as JSON and written to rotating log files.

## Log Rotation

In production mode, logs are automatically rotated to prevent them from growing too large:

- Logs are stored in the directory specified by `LOG_DIR` with names following the pattern `{LOG_FILE_PREFIX}-YYYY-MM-DD-HH-MM.log`
- Files are rotated when they reach 10MB in size
- Old log files are compressed using gzip
- A maximum of 7 days of logs are kept, with older logs automatically deleted

This configuration helps manage disk space while ensuring that recent logs are always available for troubleshooting.

## Best Practices

1. **Use Appropriate Log Levels**:

   - `trace`: Very detailed information for debugging during development
   - `debug`: Detailed information useful for debugging
   - `info`: General information about application operation
   - `warn`: Warning messages that don't affect operation but might need attention
   - `error`: Error conditions that affect operation but don't crash the application
   - `fatal`: Severe error conditions that may lead to application termination

2. **Add Context to Logs**:

   - Include relevant data as a context object
   - Don't log sensitive information like passwords, tokens, etc.

3. **Structured Error Logging**:

   - When logging errors, pass the error object directly
   - Add additional context about the error

4. **Use Correlation IDs**:
   - For distributed systems, include correlation IDs in logs
   - The system automatically adds correlation IDs to HTTP requests

## Implementation Details

- **Logger Module**: Provides logger configuration and services
- **CorrelationIdMiddleware**: Adds correlation IDs to requests
- **LoggerConfigService**: Configures Pino logger based on environment
- **CustomLoggerService**: Extends logger functionality with correlation ID tracking
- **Log Rotation**: Implemented using pino-roll for production environments
