import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';

import { CorrelationIdMiddleware } from '../logger/correlation-id.middleware';
import { CustomLoggerService } from '../logger/logger.service';
import { sanitizeObject } from '../utils/sensitive-data.utils';

import { BaseException } from './base.exception';
import { ValidationException } from './domain-exceptions';
import { ErrorCode } from './error-codes.enum';
import { HttpResponse } from './http-response.interface';

/**
 * Global exception filter that handles all exceptions
 * Formats errors according to the standardized response format
 * Integrates with the custom logger for error logging
 */
@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly isProduction: boolean;

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: CustomLoggerService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    this.isProduction = configService.get<string>('NODE_ENV') === 'production';
  }

  /**
   * Catch and handle all exceptions
   * @param exception The exception object
   * @param host ArgumentsHost object
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    // Get HTTP adapter
    const { httpAdapter } = this.httpAdapterHost;

    // Get request and response objects
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Default response
    const errorResponse: HttpResponse = {
      status: 'error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
    };

    // Get correlation ID from request if available
    const correlationId = (request as Request & { correlationId?: string }).correlationId;
    if (correlationId) {
      errorResponse.correlationId = correlationId;
    }

    // Handle different types of exceptions
    try {
      if (exception instanceof BaseException) {
        // Our custom domain exceptions
        this.handleBaseException(exception, errorResponse);
      } else if (exception instanceof HttpException) {
        // NestJS HTTP exceptions
        this.handleHttpException(exception, errorResponse);
      } else if (this.isKnownValidationFormat(exception)) {
        // Handle validation errors from class-validator
        this.handleValidationError(exception as Record<string, unknown>, errorResponse);
      } else {
        // Unknown/unexpected exceptions
        this.handleUnknownException(exception, errorResponse);
      }

      // Log the error with appropriate context
      this.logException(exception, errorResponse, request);

      // Remove stack trace in production
      if (this.isProduction && errorResponse.data?.stack) {
        delete errorResponse.data.stack;
      }

      // Sanitize sensitive data before sending response
      const sanitizedResponse = sanitizeObject(errorResponse);

      // Send the error response
      httpAdapter.reply(response, sanitizedResponse, errorResponse.statusCode);
    } catch (error) {
      // If error handling itself fails, log it and return a simple error
      this.logger.error('Error in exception filter', undefined, {
        error: error instanceof Error ? error.message : String(error),
      });

      const fallbackResponse: HttpResponse = {
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error occurred while processing the original error',
        timestamp: new Date().toISOString(),
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
      };

      if (correlationId) {
        fallbackResponse.correlationId = correlationId;
      }

      httpAdapter.reply(response, fallbackResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Handle our custom BaseException
   */
  private handleBaseException(exception: BaseException, errorResponse: HttpResponse): void {
    errorResponse.statusCode = exception.getStatus();
    errorResponse.message = exception.message;
    errorResponse.errorCode = exception.errorCode;

    // Add validation errors if available (for ValidationException)
    if (exception instanceof ValidationException) {
      errorResponse.errors = exception.errors;
    }

    // Add error context to data for non-production environments
    if (!this.isProduction && exception.errorContext) {
      errorResponse.data = exception.errorContext;
    }
  }

  /**
   * Handle NestJS HTTP exceptions
   */
  private handleHttpException(exception: HttpException, errorResponse: HttpResponse): void {
    // Set common properties once
    errorResponse.statusCode = exception.getStatus();
    errorResponse.errorCode = this.mapStatusToErrorCode(exception.getStatus());

    const response = exception.getResponse();

    if (typeof response === 'string') {
      errorResponse.message = response;
    } else if (typeof response === 'object') {
      const responseObj = response as Record<string, unknown>;
      errorResponse.message = (responseObj.message as string) || 'An error occurred';

      // Include validation errors if available
      if (responseObj.errors) {
        errorResponse.errors = responseObj.errors as Record<string, string[]>;
      }

      // Add additional data for non-production environments
      if (!this.isProduction) {
        errorResponse.data = responseObj;
      }
    } else {
      errorResponse.message = exception.message;
    }
  }

  /**
   * Handle validation errors
   */
  private handleValidationError(
    exception: Record<string, unknown>,
    errorResponse: HttpResponse,
  ): void {
    errorResponse.statusCode = HttpStatus.BAD_REQUEST;
    errorResponse.message = 'Validation failed';
    errorResponse.errorCode = ErrorCode.VALIDATION_FAILED;

    // Format validation errors into a more user-friendly structure
    const formattedErrors: Record<string, string[]> = {};

    if (Array.isArray((exception.message as Record<string, unknown>)?.validation)) {
      for (const error of (exception.message as Record<string, unknown>)?.validation as Array<{
        property: string;
        constraints?: Record<string, string>;
      }>) {
        formattedErrors[error.property] = Object.values(error.constraints || {});
      }
    } else if (exception.errors) {
      const errors = exception.errors as Record<string, { message: string }>;
      for (const key of Object.keys(errors)) {
        formattedErrors[key] = [errors[key].message];
      }
    }

    errorResponse.errors = formattedErrors;
  }

  /**
   * Handle unknown/unexpected exceptions
   */
  private handleUnknownException(exception: unknown, errorResponse: HttpResponse): void {
    errorResponse.message = 'An unexpected error occurred';

    // Log detailed error info in non-production environments
    if (!this.isProduction) {
      errorResponse.data =
        exception instanceof Error
          ? {
              name: exception.name,
              message: exception.message,
              stack: exception.stack || '',
            }
          : { exception: String(exception) };
    }
  }

  /**
   * Check if an exception is a validation error
   */
  private isKnownValidationFormat(exception: unknown): boolean {
    if (!exception || typeof exception !== 'object') {
      return false;
    }

    const exceptionObj = exception as Record<string, unknown>;
    return (
      (exceptionObj.message as Record<string, unknown>)?.validation !== undefined ||
      exceptionObj.errors !== undefined
    );
  }

  /**
   * Map HTTP status codes to error codes
   */
  private mapStatusToErrorCode(status: number): ErrorCode {
    // Cast the status to avoid type errors in the switch
    const errorCodeMap: Record<number, ErrorCode> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.INVALID_INPUT,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
      [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorCode.RESOURCE_NOT_FOUND,
      [HttpStatus.CONFLICT]: ErrorCode.RESOURCE_CONFLICT,
      [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.BUSINESS_RULE_VIOLATION,
      [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
    };

    return errorCodeMap[status] || ErrorCode.INTERNAL_SERVER_ERROR;
  }

  /**
   * Log the exception with appropriate context
   */
  private logException(exception: unknown, errorResponse: HttpResponse, request: Request): void {
    const logContext = {
      statusCode: errorResponse.statusCode,
      errorCode: errorResponse.errorCode,
      path: request.url,
      method: request.method,
      correlationId: errorResponse.correlationId,
      ip: request.ip,
      headers: {
        ...this.getSecureHeaders(request),
        [CorrelationIdMiddleware.CORRELATION_ID_HEADER.toLowerCase()]: errorResponse.correlationId,
      },
    };

    // If it's our custom exception with context, add that context
    if (exception instanceof BaseException && exception.errorContext) {
      Object.assign(logContext, { errorContext: exception.errorContext });
    }

    // Log the error with appropriate severity based on status code
    if (errorResponse.statusCode >= 500) {
      const errorObj = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(errorResponse.message, undefined, {
        ...logContext,
        error: errorObj.message,
        stack: errorObj.stack,
      });
    } else {
      this.logger.warn(errorResponse.message, logContext);
    }
  }

  /**
   * Get headers excluding sensitive information
   */
  private getSecureHeaders(request: Request): Record<string, string> {
    const headers = { ...request.headers } as Record<string, string>;

    // Remove sensitive headers
    for (const header of ['authorization', 'cookie', 'set-cookie']) {
      if (headers[header]) {
        headers[header] = '[REDACTED]';
      }
    }

    return headers;
  }
}
