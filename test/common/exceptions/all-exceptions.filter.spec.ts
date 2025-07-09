import { ArgumentsHost } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { AllExceptionsFilter } from '@common/exceptions/all-exceptions.filter';
import {
  ValidationException,
  ResourceNotFoundException,
} from '@common/exceptions/domain-exceptions';
import { ErrorLoggerService } from '@core/services/exceptions/error-logger.service';
import { ExceptionMapperService } from '@core/services/exceptions/exception-mapper.service';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  const mockHttpAdapter = {
    reply: jest.fn(),
  };

  const mockHttpAdapterHost = {
    httpAdapter: mockHttpAdapter,
  };

  const mockExceptionMapper = {
    mapExceptionToResponse: jest.fn(),
  };

  const mockErrorLogger = {
    logException: jest.fn(),
  };

  const mockRequest = {
    url: '/test',
    method: 'GET',
    headers: {},
    ip: '127.0.0.1',
    correlationId: 'test-correlation-id',
  } as any;

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as any;

  const mockArgumentsHost = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    }),
  } as unknown as ArgumentsHost;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllExceptionsFilter,
        {
          provide: HttpAdapterHost,
          useValue: mockHttpAdapterHost,
        },
        {
          provide: ExceptionMapperService,
          useValue: mockExceptionMapper,
        },
        {
          provide: ErrorLoggerService,
          useValue: mockErrorLogger,
        },
      ],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
  });

  describe('catch', () => {
    const mockResponseBody = {
      status: 'error',
      statusCode: 400,
      message: 'Validation failed',
      errorCode: 'E01001',
      timestamp: '2023-01-01T00:00:00Z',
      correlationId: 'test-correlation-id',
    };

    beforeEach(() => {
      mockExceptionMapper.mapExceptionToResponse.mockReturnValue(mockResponseBody);
    });

    it('should handle domain exceptions', () => {
      const exception = new ValidationException({ field: ['Invalid input'] });

      filter.catch(exception, mockArgumentsHost);

      expect(mockArgumentsHost.switchToHttp).toHaveBeenCalled();
      expect(mockExceptionMapper.mapExceptionToResponse).toHaveBeenCalledWith(
        exception,
        'test-correlation-id',
      );
      expect(mockErrorLogger.logException).toHaveBeenCalledWith(
        exception,
        mockResponseBody,
        mockRequest,
      );
      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(mockResponse, mockResponseBody, 400);
    });

    it('should handle standard Error objects', () => {
      const exception = new Error('Something went wrong');
      const errorResponseBody = {
        ...mockResponseBody,
        statusCode: 500,
        message: 'Internal server error',
      };
      mockExceptionMapper.mapExceptionToResponse.mockReturnValue(errorResponseBody);

      filter.catch(exception, mockArgumentsHost);

      expect(mockExceptionMapper.mapExceptionToResponse).toHaveBeenCalledWith(
        exception,
        'test-correlation-id',
      );
      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(mockResponse, errorResponseBody, 500);
    });

    it('should handle non-Error exceptions', () => {
      const exception = 'String error';

      filter.catch(exception, mockArgumentsHost);

      expect(mockExceptionMapper.mapExceptionToResponse).toHaveBeenCalledWith(
        exception,
        'test-correlation-id',
      );
      expect(mockErrorLogger.logException).toHaveBeenCalledWith(
        exception,
        mockResponseBody,
        mockRequest,
      );
    });

    it('should handle exceptions when correlation ID is not present', () => {
      const requestWithoutCorrelationId = {
        ...mockRequest,
        correlationId: undefined,
      };

      const hostWithoutCorrelationId = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(requestWithoutCorrelationId),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as unknown as ArgumentsHost;

      const exception = new ResourceNotFoundException('Resource not found', { id: '123' });

      filter.catch(exception, hostWithoutCorrelationId);

      expect(mockExceptionMapper.mapExceptionToResponse).toHaveBeenCalledWith(exception, undefined);
    });

    it('should pass all required parameters to error logger', () => {
      const exception = new ValidationException({ field: ['Test error'] });

      filter.catch(exception, mockArgumentsHost);

      expect(mockErrorLogger.logException).toHaveBeenCalledWith(
        exception,
        mockResponseBody,
        mockRequest,
      );
    });

    it('should handle exceptions with custom status codes', () => {
      const exception = new ResourceNotFoundException('Not found', { resource: 'user' });
      const notFoundResponseBody = {
        ...mockResponseBody,
        statusCode: 404,
        message: 'Not found',
        errorCode: 'E02002',
      };
      mockExceptionMapper.mapExceptionToResponse.mockReturnValue(notFoundResponseBody);

      filter.catch(exception, mockArgumentsHost);

      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(mockResponse, notFoundResponseBody, 404);
    });

    it('should handle null or undefined exceptions', () => {
      const nullException = null;
      const undefinedException = undefined;

      filter.catch(nullException, mockArgumentsHost);
      expect(mockExceptionMapper.mapExceptionToResponse).toHaveBeenCalledWith(
        nullException,
        'test-correlation-id',
      );

      filter.catch(undefinedException, mockArgumentsHost);
      expect(mockExceptionMapper.mapExceptionToResponse).toHaveBeenCalledWith(
        undefinedException,
        'test-correlation-id',
      );
    });

    it('should use HttpAdapterHost to ensure platform independence', () => {
      const exception = new Error('Test error');

      filter.catch(exception, mockArgumentsHost);

      // Verify that we're using the httpAdapter from HttpAdapterHost
      expect(mockHttpAdapter.reply).toHaveBeenCalled();
      // Verify we're not calling response methods directly
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });
});
