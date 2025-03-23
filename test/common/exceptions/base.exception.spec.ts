/**
 * @group unit
 */
import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../src/common/constants/error-codes.enum';
import { BaseException } from '../../../src/common/exceptions/base.exception';

// Create a concrete implementation of the abstract BaseException for testing
class TestException extends BaseException {
  constructor(
    message = 'Test exception',
    status = HttpStatus.BAD_REQUEST,
    errorCode = ErrorCode.INVALID_INPUT,
    errorContext?: Record<string, unknown>,
  ) {
    super(message, status, errorCode, errorContext);
  }
}

describe('BaseException', () => {
  it('should be instantiated with provided values', () => {
    const message = 'Test error message';
    const status = HttpStatus.NOT_FOUND;
    const errorCode = ErrorCode.RESOURCE_NOT_FOUND;
    const errorContext = { resourceId: '123' };

    const exception = new TestException(message, status, errorCode, errorContext);

    expect(exception.message).toBe(message);
    expect(exception.getStatus()).toBe(status);
    expect(exception.errorCode).toBe(errorCode);
    expect(exception.errorContext).toEqual(errorContext);
  });

  it('should handle undefined error context', () => {
    const exception = new TestException(
      'Test message',
      HttpStatus.BAD_REQUEST,
      ErrorCode.INVALID_INPUT,
    );

    expect(exception.errorContext).toBeUndefined();

    const response = exception.getResponse() as Record<string, unknown>;
    expect(response).not.toHaveProperty('errorContext');
  });

  it('should handle null error context', () => {
    const exception = new TestException(
      'Test message',
      HttpStatus.BAD_REQUEST,
      ErrorCode.INVALID_INPUT,
      null as unknown as Record<string, unknown>,
    );

    expect(exception.errorContext).toBeNull();

    const response = exception.getResponse() as Record<string, unknown>;
    expect(response).not.toHaveProperty('errorContext');
  });

  it('should include status code in response', () => {
    const exception = new TestException();

    const response = exception.getResponse() as Record<string, unknown>;
    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
  });

  it('should include error code in response', () => {
    const exception = new TestException();

    const response = exception.getResponse() as Record<string, unknown>;
    expect(response).toHaveProperty('errorCode');
    expect(response.errorCode).toBe(ErrorCode.INVALID_INPUT);
  });

  it('should include timestamp in response', () => {
    const exception = new TestException();

    const response = exception.getResponse() as Record<string, unknown>;
    expect(response).toHaveProperty('timestamp');
    expect(typeof response.timestamp).toBe('string');
  });

  it('should have "error" as status in response', () => {
    const exception = new TestException();

    const response = exception.getResponse() as Record<string, unknown>;
    expect(response).toHaveProperty('status');
    expect(response.status).toBe('error');
  });

  it('should store error context but not include it in response', () => {
    const errorContext = { userId: 'abc123', action: 'delete' };
    const exception = new TestException(
      'Test message',
      HttpStatus.BAD_REQUEST,
      ErrorCode.INVALID_INPUT,
      errorContext,
    );

    expect(exception.errorContext).toEqual(errorContext);

    const response = exception.getResponse() as Record<string, unknown>;
    expect(response).not.toHaveProperty('errorContext');
  });
});
