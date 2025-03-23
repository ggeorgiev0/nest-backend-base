/**
 * @group unit
 */
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';

import { ErrorCode } from '@/common/constants';

import {
  AllExceptionsFilter,
  BaseException,
  ResourceNotFoundException,
  ValidationException,
  ExceptionMapperService,
  ErrorLoggerService,
} from '../../src/common/exceptions';
import { sanitizeObject } from '../../src/common/utils';

// Create mock ArgumentsHost outside the describe block
function createMockArgumentsHost(): ArgumentsHost {
  const mockRequest = {
    url: '/test',
    method: 'GET',
    ip: '127.0.0.1',
    headers: {},
    correlationId: 'test-correlation-id',
  } as unknown as Request;

  const mockResponse = {} as Response;

  const mockHttpArgumentsHost = {
    getRequest: () => mockRequest,
    getResponse: () => mockResponse,
    getNext: () => jest.fn(),
  };

  return {
    switchToHttp: () => mockHttpArgumentsHost,
    getArgByIndex: () => ({}),
    getArgs: () => [],
    getType: () => 'http',
    switchToRpc: () => ({}) as any,
    switchToWs: () => ({}) as any,
  } as unknown as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let httpAdapter: any;
  let exceptionMapper: Partial<ExceptionMapperService>;
  let errorLogger: Partial<ErrorLoggerService>;

  beforeEach(async () => {
    // Mock the HTTP adapter
    httpAdapter = {
      reply: jest.fn(),
    };

    // Mock exception mapper
    exceptionMapper = {
      mapExceptionToResponse: jest.fn().mockImplementation((exception, correlationId) => {
        // Basic implementation for test purposes
        let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'An unexpected error occurred';

        if (exception instanceof BaseException) {
          errorCode = exception.errorCode;
          statusCode = exception.getStatus();
          message = exception.message;
        } else if (exception instanceof HttpException) {
          statusCode = exception.getStatus();
          message = exception.message;
          if (statusCode === HttpStatus.FORBIDDEN) {
            errorCode = ErrorCode.FORBIDDEN;
          }
        }

        const response: any = {
          status: 'error',
          statusCode,
          message,
          errorCode,
          correlationId,
          timestamp: new Date().toISOString(),
        };

        // Add validation errors if available
        if (exception instanceof ValidationException) {
          response.errors = exception.errors;
        }

        // Add error context for BaseException
        if (exception instanceof BaseException && exception.errorContext) {
          response.data = sanitizeObject(exception.errorContext);
        }

        return response;
      }),
    };

    // Mock error logger
    errorLogger = {
      logException: jest.fn(),
    };

    // Create a test module with the filter and its dependencies
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllExceptionsFilter,
        {
          provide: HttpAdapterHost,
          useValue: { httpAdapter },
        },
        {
          provide: ExceptionMapperService,
          useValue: exceptionMapper,
        },
        {
          provide: ErrorLoggerService,
          useValue: errorLogger,
        },
      ],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
  });

  it('should handle BaseException correctly', () => {
    // Arrange
    const host = createMockArgumentsHost();
    const exception = new BaseException(
      'Test base exception',
      HttpStatus.BAD_REQUEST,
      ErrorCode.INVALID_INPUT,
    );

    // Act
    filter.catch(exception, host);

    // Assert
    expect(httpAdapter.reply).toHaveBeenCalled();
    expect(httpAdapter.reply.mock.calls[0][2]).toBe(HttpStatus.BAD_REQUEST);
    expect(errorLogger.logException).toHaveBeenCalled();

    const response = httpAdapter.reply.mock.calls[0][1];
    expect(response.status).toBe('error');
    expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(response.message).toBe('Test base exception');
    expect(response.errorCode).toBe(ErrorCode.INVALID_INPUT);
    expect(response.correlationId).toBe('test-correlation-id');
  });

  it('should handle ResourceNotFoundException correctly', () => {
    // Arrange
    const host = createMockArgumentsHost();
    const exception = new ResourceNotFoundException('Resource not found');

    // Act
    filter.catch(exception, host);

    // Assert
    expect(httpAdapter.reply).toHaveBeenCalled();
    expect(httpAdapter.reply.mock.calls[0][2]).toBe(HttpStatus.NOT_FOUND);
    expect(errorLogger.logException).toHaveBeenCalled();

    const response = httpAdapter.reply.mock.calls[0][1];
    expect(response.status).toBe('error');
    expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(response.message).toBe('Resource not found');
    expect(response.errorCode).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });

  it('should handle ValidationException with errors correctly', () => {
    // Arrange
    const host = createMockArgumentsHost();
    const validationErrors = {
      email: ['Email is invalid'],
      password: ['Password is too short', 'Password must contain a number'],
    };
    const exception = new ValidationException(validationErrors, 'Validation failed');

    // Act
    filter.catch(exception, host);

    // Assert
    expect(httpAdapter.reply).toHaveBeenCalled();
    expect(httpAdapter.reply.mock.calls[0][2]).toBe(HttpStatus.BAD_REQUEST);
    expect(errorLogger.logException).toHaveBeenCalled();

    const response = httpAdapter.reply.mock.calls[0][1];
    expect(response.status).toBe('error');
    expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(response.message).toBe('Validation failed');
    expect(response.errorCode).toBe(ErrorCode.VALIDATION_FAILED);

    // Email and password validation will be provided by the mock
    expect(response.errors).toEqual(validationErrors);
  });

  it('should handle NestJS HttpException correctly', () => {
    // Arrange
    const host = createMockArgumentsHost();
    const exception = new HttpException('Test HTTP exception', HttpStatus.FORBIDDEN);

    // Act
    filter.catch(exception, host);

    // Assert
    expect(httpAdapter.reply).toHaveBeenCalled();
    expect(httpAdapter.reply.mock.calls[0][2]).toBe(HttpStatus.FORBIDDEN);
    expect(errorLogger.logException).toHaveBeenCalled();

    const response = httpAdapter.reply.mock.calls[0][1];
    expect(response.status).toBe('error');
    expect(response.statusCode).toBe(HttpStatus.FORBIDDEN);
    expect(response.message).toBe('Test HTTP exception');
    // The implementation maps the status code to an error code
    expect(response.errorCode).toEqual(ErrorCode.FORBIDDEN);
  });

  it('should handle generic Error correctly', () => {
    // Arrange
    const host = createMockArgumentsHost();
    const exception = new Error('Generic error');

    // Act
    filter.catch(exception, host);

    // Assert
    expect(httpAdapter.reply).toHaveBeenCalled();
    expect(httpAdapter.reply.mock.calls[0][2]).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(errorLogger.logException).toHaveBeenCalled();

    const response = httpAdapter.reply.mock.calls[0][1];
    expect(response.status).toBe('error');
    expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.message).toBe('An unexpected error occurred');
    expect(response.errorCode).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
  });

  it('should sanitize sensitive data in errors', () => {
    // Arrange
    const host = createMockArgumentsHost();
    const exception = new BaseException(
      'Security error',
      HttpStatus.UNAUTHORIZED,
      ErrorCode.UNAUTHORIZED,
      {
        password: 'test-pwd', // Using non-descriptive placeholder for testing
        user: { token: 'some-token', email: 'test@example.com' },
      },
    );

    // Act
    filter.catch(exception, host);

    // Assert
    const response = httpAdapter.reply.mock.calls[0][1];
    // The mock exceptionMapper sanitizes data
    expect(response.data.password).toBe('[REDACTED]');
    expect(response.data.user.token).toBe('[REDACTED]');
    expect(response.data.user.email).toBe('[REDACTED]');
  });
});
