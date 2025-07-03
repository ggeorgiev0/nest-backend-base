import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ErrorCode } from '@/common/constants/error-codes.enum';
import { BaseException } from '@/common/exceptions/base.exception';
import { ValidationException } from '@/common/exceptions/domain-exceptions';
import { HttpResponse } from '@/core/interfaces';

/**
 * Service responsible for mapping different exception types to standardized HttpResponse objects
 * Follows Single Responsibility Principle by focusing only on mapping exceptions to responses
 */
@Injectable()
export class ExceptionMapperService {
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
  }

  /**
   * Maps any exception to a standardized HttpResponse
   * @param exception The exception to map
   * @param correlationId Optional correlation ID for request tracing
   * @returns Standardized HttpResponse object
   */
  mapExceptionToResponse(exception: unknown, correlationId?: string): HttpResponse {
    // Create default error response
    const errorResponse: HttpResponse = {
      status: 'error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
    };

    // Add correlation ID if available
    if (correlationId) {
      errorResponse.correlationId = correlationId;
    }

    // Map different types of exceptions
    if (exception instanceof BaseException) {
      this.mapBaseException(exception, errorResponse);
    } else if (exception instanceof HttpException) {
      this.mapHttpException(exception, errorResponse);
    } else if (this.isKnownValidationFormat(exception)) {
      this.mapValidationError(exception as Record<string, unknown>, errorResponse);
    } else {
      this.mapUnknownException(exception, errorResponse);
    }

    // Remove stack trace in production
    if (this.isProduction && errorResponse.data?.stack) {
      delete errorResponse.data.stack;
    }

    return errorResponse;
  }

  /**
   * Maps BaseException to HttpResponse
   */
  private mapBaseException(exception: BaseException, errorResponse: HttpResponse): void {
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
   * Maps HttpException to HttpResponse
   */
  private mapHttpException(exception: HttpException, errorResponse: HttpResponse): void {
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
   * Maps validation errors to HttpResponse
   */
  private mapValidationError(
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
   * Maps unknown exceptions to HttpResponse
   */
  private mapUnknownException(exception: unknown, errorResponse: HttpResponse): void {
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
   * Maps HTTP status codes to error codes
   * @param status HTTP status code
   * @returns Corresponding error code
   */
  mapStatusToErrorCode(status: number): ErrorCode {
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
   * Checks if an exception is a validation error
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
}
