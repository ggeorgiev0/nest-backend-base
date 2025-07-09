import { RequestTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

import { RequestTimeoutMiddleware } from '@common/middleware/request-timeout.middleware';

describe('RequestTimeoutMiddleware', () => {
  let middleware: RequestTimeoutMiddleware;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    mockConfigService = {
      get: jest.fn().mockReturnValue(5000), // 5 seconds for testing
    } as any;

    mockRequest = {};
    mockResponse = {
      headersSent: false,
      on: jest.fn(),
    };
    mockNext = jest.fn();

    middleware = new RequestTimeoutMiddleware(mockConfigService);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should call next without error if request completes within timeout', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockNext).not.toHaveBeenCalledWith(expect.any(RequestTimeoutException));
  });

  it('should throw RequestTimeoutException when timeout is exceeded', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    // Advance time past the timeout
    jest.advanceTimersByTime(5001);

    expect(mockNext).toHaveBeenCalledWith(expect.any(RequestTimeoutException));
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Request timeout exceeded',
      }),
    );
  });

  it('should not throw timeout if headers are already sent', () => {
    mockResponse.headersSent = true;
    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    // Advance time past the timeout
    jest.advanceTimersByTime(5001);

    // Should only be called once with no arguments (initial next())
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should clear timeout when response finishes', () => {
    let finishCallback: () => void;
    (mockResponse.on as jest.Mock).mockImplementation((event, callback) => {
      if (event === 'finish') {
        finishCallback = callback;
      }
    });

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    // Simulate response finish
    finishCallback!();

    // Advance time past the timeout
    jest.advanceTimersByTime(5001);

    // Should not throw timeout since response finished
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should clear timeout when response closes', () => {
    let closeCallback: () => void;
    (mockResponse.on as jest.Mock).mockImplementation((event, callback) => {
      if (event === 'close') {
        closeCallback = callback;
      }
    });

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    // Simulate response close
    closeCallback!();

    // Advance time past the timeout
    jest.advanceTimersByTime(5001);

    // Should not throw timeout since response closed
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should use default timeout when not configured', () => {
    mockConfigService.get.mockReturnValue(30_000);

    const testMiddleware = new RequestTimeoutMiddleware(mockConfigService);
    expect(testMiddleware).toBeDefined();

    expect(mockConfigService.get).toHaveBeenCalledWith('REQUEST_TIMEOUT', 30_000);
  });
});
