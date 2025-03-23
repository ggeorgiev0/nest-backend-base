import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { CustomLoggerService } from '../../logger/logger.service';
import { sanitizeObject } from '../../utils/sensitive-data.utils';
import { HttpResponse } from '../http-response.interface';

/**
 * Logger interface for exceptions
 * Defines what context should be included in exception logs
 */
export interface ErrorLogContext {
  /**
   * HTTP path where the error occurred
   */
  path?: string;

  /**
   * HTTP method of the request
   */
  method?: string;

  /**
   * Sanitized request headers
   */
  headers?: Record<string, string>;

  /**
   * Sanitized query parameters
   */
  query?: Record<string, unknown>;

  /**
   * Sanitized request body
   */
  body?: Record<string, unknown>;

  /**
   * Error details or stack trace (non-production only)
   */
  error?: unknown;

  /**
   * Correlation ID for request tracing
   */
  correlationId?: string;

  /**
   * Additional data to include in the log
   */
  [key: string]: unknown;
}

/**
 * Service responsible for logging exceptions with appropriate context
 * Follows Single Responsibility Principle by focusing only on error logging
 */
@Injectable()
export class ErrorLoggerService {
  private readonly isProduction: boolean;
  private readonly sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];

  constructor(
    private readonly logger: CustomLoggerService,
    private readonly configService: ConfigService,
  ) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
  }

  /**
   * Log an exception with full context
   * @param exception The exception to log
   * @param response The formatted response
   * @param request The HTTP request
   */
  logException(exception: unknown, response: HttpResponse, request: Request): void {
    const logLevel = this.determineLogLevel(response.statusCode);
    const context = this.buildLogContext(exception, response, request);

    // Log with appropriate level
    switch (logLevel) {
      case 'error': {
        this.logger.error(
          `Error: ${response.message} [${response.statusCode}]`,
          undefined,
          context,
        );
        break;
      }
      case 'warn': {
        this.logger.warn(`Warning: ${response.message} [${response.statusCode}]`, context);
        break;
      }
      case 'debug': {
        this.logger.debug(`Debug: ${response.message} [${response.statusCode}]`, context);
        break;
      }
      default: {
        this.logger.log(`Info: ${response.message} [${response.statusCode}]`, context);
      }
    }
  }

  /**
   * Determine the appropriate log level based on status code
   * @param statusCode HTTP status code
   * @returns Log level
   */
  private determineLogLevel(statusCode: number): 'error' | 'warn' | 'info' | 'debug' {
    if (statusCode >= 500) {
      return 'error';
    } else if (statusCode >= 400) {
      return 'warn';
    } else if (statusCode >= 300) {
      return 'info';
    }
    return 'debug';
  }

  /**
   * Build log context from request and response
   * @param exception Original exception
   * @param response Formatted response
   * @param request HTTP request
   * @returns Formatted log context
   */
  private buildLogContext(
    exception: unknown,
    response: HttpResponse,
    request: Request,
  ): ErrorLogContext {
    const context: ErrorLogContext = {
      statusCode: response.statusCode,
      errorCode: response.errorCode,
      path: request.url,
      method: request.method,
      correlationId: response.correlationId,
    };

    // Add secure request headers (sanitized)
    context.headers = this.getSecureHeaders(request);

    // Include query parameters and body for debug purposes (sanitized)
    context.query = sanitizeObject(request.query);

    // Only include body for certain methods and if it exists
    if (['POST', 'PUT', 'PATCH'].includes(request.method) && request.body) {
      context.body = sanitizeObject(request.body as Record<string, unknown>);
    }

    // Add error details if not in production
    if (!this.isProduction && exception instanceof Error) {
      context.error = {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      };
    }

    return context;
  }

  /**
   * Get sanitized headers from request
   * @param request HTTP request
   * @returns Sanitized headers
   */
  private getSecureHeaders(request: Request): Record<string, string> {
    return sanitizeObject(request.headers as Record<string, unknown>, {
      customSensitiveFields: this.sensitiveHeaders,
    }) as Record<string, string>;
  }
}
