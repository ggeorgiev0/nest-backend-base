import { HttpStatus } from '@nestjs/common';

import { BaseException } from './base.exception';
import { ErrorCode } from './error-codes.enum';

/**
 * Resource not found exception
 * Used when a requested resource doesn't exist
 */
export class ResourceNotFoundException extends BaseException {
  constructor(message: string = 'Resource not found', errorContext?: Record<string, any>) {
    super(message, HttpStatus.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND, errorContext);
  }
}

/**
 * Validation exception
 * Used for validation errors
 */
export class ValidationException extends BaseException {
  /**
   * Validation errors object
   */
  readonly errors: Record<string, string[]>;

  constructor(
    errors: Record<string, string[]>,
    message: string = 'Validation failed',
    errorContext?: Record<string, any>,
  ) {
    super(message, HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED, errorContext);
    this.errors = errors;
  }

  /**
   * Override getResponse to include validation errors
   */
  getResponse(): Record<string, any> {
    return {
      ...super.getResponse(),
      errors: this.errors,
    };
  }
}

/**
 * Business rule violation exception
 * Used when an operation violates a business rule
 */
export class BusinessRuleViolationException extends BaseException {
  constructor(message: string, errorContext?: Record<string, any>) {
    super(
      message,
      HttpStatus.UNPROCESSABLE_ENTITY,
      ErrorCode.BUSINESS_RULE_VIOLATION,
      errorContext,
    );
  }
}

/**
 * Unauthorized exception
 * Used for authentication errors
 */
export class UnauthorizedException extends BaseException {
  constructor(message: string = 'Unauthorized access', errorContext?: Record<string, any>) {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, errorContext);
  }
}

/**
 * Forbidden exception
 * Used for authorization errors
 */
export class ForbiddenException extends BaseException {
  constructor(message: string = 'Access forbidden', errorContext?: Record<string, any>) {
    super(message, HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, errorContext);
  }
}

/**
 * Conflict exception
 * Used when a resource already exists or there's a conflict with the current state
 */
export class ConflictException extends BaseException {
  constructor(message: string = 'Resource conflict', errorContext?: Record<string, any>) {
    super(message, HttpStatus.CONFLICT, ErrorCode.RESOURCE_CONFLICT, errorContext);
  }
}

/**
 * External service exception
 * Used when an external service fails or is unavailable
 */
export class ExternalServiceException extends BaseException {
  constructor(message: string = 'External service error', errorContext?: Record<string, any>) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE, ErrorCode.EXTERNAL_SERVICE_ERROR, errorContext);
  }
}
