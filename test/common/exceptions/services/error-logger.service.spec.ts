/**
 * @group unit
 */
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';

import { HttpResponse } from '../../../../src/common/exceptions/http-response.interface';
import {
  ErrorLoggerService,
  ErrorLogContext,
} from '../../../../src/common/exceptions/services/error-logger.service';
import { CustomLoggerService } from '../../../../src/common/logger/logger.service';

// Mock request factory to create different request scenarios
function createMockRequest(
  method = 'GET',
  url = '/test',
  body?: Record<string, unknown>,
  query?: Record<string, unknown>,
  headers?: Record<string, string>,
): Request {
  return {
    method,
    url,
    body,
    query: query || {},
    headers: headers || {},
  } as unknown as Request;
}

// Mock response factory
function createMockResponse(
  statusCode = 200,
  message = 'Success',
  errorCode?: string,
  correlationId?: string,
): HttpResponse {
  return {
    status: statusCode >= 400 ? 'error' : 'success',
    statusCode,
    message,
    timestamp: new Date().toISOString(),
    errorCode,
    correlationId,
  };
}

describe('ErrorLoggerService', () => {
  let service: ErrorLoggerService;
  let logger: jest.Mocked<CustomLoggerService>;
  let configService: jest.Mocked<ConfigService>;

  // Different environment setups for production and non-production
  describe.each([
    { env: 'development', isProduction: false },
    { env: 'production', isProduction: true },
  ])('In $env environment', ({ env, isProduction }) => {
    beforeEach(async () => {
      // Mock logger methods
      logger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      } as unknown as jest.Mocked<CustomLoggerService>;

      // Mock config service
      configService = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'NODE_ENV') {
            return env;
          }
        }),
      } as unknown as jest.Mocked<ConfigService>;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ErrorLoggerService,
          {
            provide: CustomLoggerService,
            useValue: logger,
          },
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      service = module.get<ErrorLoggerService>(ErrorLoggerService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    describe('logException', () => {
      // Test different status code ranges
      it.each([
        { codeDesc: '5xx errors', statusCode: 500, expectedLevel: 'error' },
        { codeDesc: '4xx errors', statusCode: 400, expectedLevel: 'warn' },
        { codeDesc: '3xx redirects', statusCode: 301, expectedLevel: 'info' },
        { codeDesc: '2xx success', statusCode: 200, expectedLevel: 'debug' },
      ])(
        'should log with $expectedLevel level for status code $statusCode ($codeDesc)',
        ({ statusCode, expectedLevel }) => {
          const request = createMockRequest();
          const response = createMockResponse(statusCode, 'Test message');
          const exception = new Error('Test error');

          service.logException(exception, response, request);

          // Check if the right log level was used
          switch (expectedLevel) {
            case 'error': {
              expect(logger.error).toHaveBeenCalled();

              break;
            }
            case 'warn': {
              expect(logger.warn).toHaveBeenCalled();

              break;
            }
            case 'debug': {
              expect(logger.debug).toHaveBeenCalled();

              break;
            }
            default: {
              expect(logger.log).toHaveBeenCalled();
            }
          }
        },
      );

      // Test for request body handling for different HTTP methods
      it.each([
        { method: 'POST', shouldIncludeBody: true },
        { method: 'PUT', shouldIncludeBody: true },
        { method: 'PATCH', shouldIncludeBody: true },
        { method: 'GET', shouldIncludeBody: false },
        { method: 'DELETE', shouldIncludeBody: false },
      ])(
        'should $shouldIncludeBody include request body with $method method',
        ({ method, shouldIncludeBody }) => {
          const testBody = { test: 'value', password: 'secret' };
          const request = createMockRequest(method, '/test', testBody);
          const response = createMockResponse(400, 'Test message');
          const exception = new Error('Test error');

          service.logException(exception, response, request);

          expect(logger.warn).toHaveBeenCalled();
          const logContext = logger.warn.mock.calls[0][1] as ErrorLogContext;

          if (shouldIncludeBody) {
            expect(logContext).toHaveProperty('body');
            expect(logContext.body).toHaveProperty('password', '[REDACTED]');
          } else {
            expect(logContext.body).toBeUndefined();
          }
        },
      );

      // Test sensitive header sanitization
      it('should sanitize sensitive headers', () => {
        const request = createMockRequest('GET', '/test', undefined, undefined, {
          authorization: 'Bearer token123',
          'user-agent': 'test-agent',
          cookie: 'secret-cookie',
          'content-type': 'application/json',
        });
        const response = createMockResponse(400, 'Test message');
        const exception = new Error('Test error');

        service.logException(exception, response, request);

        expect(logger.warn).toHaveBeenCalled();
        const logContext = logger.warn.mock.calls[0][1] as ErrorLogContext;

        expect(logContext.headers).toHaveProperty('authorization', '[REDACTED]');
        expect(logContext.headers).toHaveProperty('cookie', '[REDACTED]');
        expect(logContext.headers).toHaveProperty('content-type', 'application/json');
        expect(logContext.headers).toHaveProperty('user-agent', 'test-agent');
      });

      // Test error stack inclusion based on environment
      it(`should ${isProduction ? 'not include' : 'include'} error stack trace in ${env}`, () => {
        const request = createMockRequest();
        const response = createMockResponse(500, 'Server error');
        const exception = new Error('Test error');
        exception.stack = 'Error: Test error\n    at TestFunction';

        service.logException(exception, response, request);

        expect(logger.error).toHaveBeenCalled();
        const logContext = logger.error.mock.calls[0][2] as ErrorLogContext;

        if (isProduction) {
          expect(logContext.error).toBeUndefined();
        } else {
          expect(logContext.error).toBeDefined();
          expect((logContext.error as { stack: string }).stack).toBe(exception.stack);
          expect((logContext.error as { message: string }).message).toBe(exception.message);
          expect((logContext.error as { name: string }).name).toBe(exception.name);
        }
      });

      // Test correlation ID inclusion
      it('should include correlation ID if available', () => {
        const correlationId = 'test-correlation-id';
        const request = createMockRequest();
        const response = createMockResponse(400, 'Test message', 'VALIDATION_ERROR', correlationId);
        const exception = new Error('Test error');

        service.logException(exception, response, request);

        expect(logger.warn).toHaveBeenCalled();
        const logContext = logger.warn.mock.calls[0][1] as ErrorLogContext;
        expect(logContext).toHaveProperty('correlationId', correlationId);
      });

      // Test query parameters inclusion
      it('should include query parameters', () => {
        const query = { page: '1', filter: 'active', token: 'sensitive' };
        const request = createMockRequest('GET', '/test', undefined, query);
        const response = createMockResponse(400, 'Test message');
        const exception = new Error('Test error');

        service.logException(exception, response, request);

        expect(logger.warn).toHaveBeenCalled();
        const logContext = logger.warn.mock.calls[0][1] as ErrorLogContext;
        expect(logContext).toHaveProperty('query');
        expect(logContext.query).toHaveProperty('page', '1');
        expect(logContext.query).toHaveProperty('filter', 'active');
        expect(logContext.query).toHaveProperty('token', '[REDACTED]');
      });

      // Test with Error and non-Error exceptions
      it('should handle non-Error exceptions correctly', () => {
        const request = createMockRequest();
        const response = createMockResponse(500, 'Server error');
        const exception = 'String exception'; // Not an Error object

        service.logException(exception, response, request);

        expect(logger.error).toHaveBeenCalled();
        const logContext = logger.error.mock.calls[0][2] as ErrorLogContext;

        // Even in non-production, non-Error exceptions shouldn't have stack details
        expect(logContext.error).toBeUndefined();
      });
    });
  });
});
