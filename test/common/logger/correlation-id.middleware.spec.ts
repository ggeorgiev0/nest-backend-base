/**
 * @group unit
 */
import { NextFunction, Request, Response } from 'express';

import { CorrelationIdMiddleware } from '../../../src/common/logger/correlation-id.middleware';

interface RequestWithHeaders extends Request {
  headers: Record<string, string | string[] | undefined>;
  correlationId?: string;
}

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let mockRequest: RequestWithHeaders;
  let mockResponse: Response;
  let nextFunction: NextFunction;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
    mockRequest = {
      headers: {},
    } as RequestWithHeaders;
    mockResponse = {
      set: jest.fn(),
    } as unknown as Response;
    nextFunction = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should generate a correlation ID if none exists', () => {
    middleware.use(mockRequest, mockResponse, nextFunction);

    // Check if correlation ID was generated and added to request and response
    const headerName = CorrelationIdMiddleware.CORRELATION_ID_HEADER.toLowerCase();
    expect(mockRequest.headers[headerName]).toBeDefined();
    expect(typeof mockRequest.headers[headerName]).toBe('string');
    expect(mockResponse.set).toHaveBeenCalledWith(
      CorrelationIdMiddleware.CORRELATION_ID_HEADER,
      mockRequest.headers[headerName],
    );
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should use existing correlation ID from request headers', () => {
    const existingCorrelationId = 'existing-correlation-id';
    mockRequest.headers[CorrelationIdMiddleware.CORRELATION_ID_HEADER.toLowerCase()] =
      existingCorrelationId;

    middleware.use(mockRequest, mockResponse, nextFunction);

    // Check if existing correlation ID was used
    const headerName = CorrelationIdMiddleware.CORRELATION_ID_HEADER.toLowerCase();
    expect(mockRequest.headers[headerName]).toBe(existingCorrelationId);
    expect(mockResponse.set).toHaveBeenCalledWith(
      CorrelationIdMiddleware.CORRELATION_ID_HEADER,
      existingCorrelationId,
    );
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should add correlation ID to the request object', () => {
    middleware.use(mockRequest, mockResponse, nextFunction);

    // Check if correlation ID was added to request object
    expect(mockRequest.correlationId).toBeDefined();
    expect(typeof mockRequest.correlationId).toBe('string');

    // Verify that the correlation ID in the request object matches the one in the headers
    const headerName = CorrelationIdMiddleware.CORRELATION_ID_HEADER.toLowerCase();
    expect(mockRequest.correlationId).toBe(mockRequest.headers[headerName]);
  });
});
