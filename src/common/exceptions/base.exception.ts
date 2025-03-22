import { HttpException, HttpStatus } from '@nestjs/common';

import { ErrorCode } from './error-codes.enum';
import { HttpResponse } from './http-response.interface';

/**
 * Base application exception that extends NestJS HttpException
 * Adds support for error codes and additional context
 */
export class BaseException extends HttpException {
  /**
   * Error code for client-side error handling
   */
  readonly errorCode: ErrorCode;

  /**
   * Additional error context for logging
   * Not exposed in the response
   */
  readonly errorContext?: Record<string, unknown>;

  /**
   * Constructor for BaseException
   * @param message Error message
   * @param status HTTP status code
   * @param errorCode Error code for client-side error handling
   * @param errorContext Additional error context for logging (not exposed in response)
   */
  constructor(
    message: string,
    status: HttpStatus,
    errorCode: ErrorCode,
    errorContext?: Record<string, unknown>,
  ) {
    super(message, status);
    this.errorCode = errorCode;
    this.errorContext = errorContext;
  }

  /**
   * Get the response object for the exception
   * Overrides HttpException getResponse to include error code
   */
  getResponse(): Partial<HttpResponse> {
    return {
      status: 'error',
      statusCode: this.getStatus(),
      message: this.message,
      errorCode: this.errorCode,
      timestamp: new Date().toISOString(),
    };
  }
}
