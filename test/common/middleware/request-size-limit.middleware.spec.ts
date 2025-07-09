import { PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

import { RequestSizeLimitMiddleware } from '@common/middleware/request-size-limit.middleware';

describe('RequestSizeLimitMiddleware', () => {
  let middleware: RequestSizeLimitMiddleware;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue: any) => {
        if (key === 'MAX_REQUEST_BODY_SIZE') return 1024; // 1KB for testing
        if (key === 'MAX_URL_LENGTH') return 100; // 100 chars for testing
        return defaultValue;
      }),
    } as any;

    mockRequest = {
      url: '/test',
      method: 'GET',
      headers: {},
      on: jest.fn(),
      destroy: jest.fn(),
    };
    mockResponse = {};
    mockNext = jest.fn();

    middleware = new RequestSizeLimitMiddleware(mockConfigService);
  });

  describe('URL length validation', () => {
    it('should pass when URL length is within limit', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
    });

    it('should throw PayloadTooLargeException when URL exceeds limit', () => {
      mockRequest.url = 'a'.repeat(101);

      expect(() => {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(PayloadTooLargeException);
      expect(() => {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow('URL length exceeds maximum allowed size');
    });
  });

  describe('Content-Length header validation', () => {
    it('should pass when Content-Length is within limit', () => {
      mockRequest.headers = { 'content-length': '500' };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should throw PayloadTooLargeException when Content-Length exceeds limit', () => {
      mockRequest.headers = { 'content-length': '2000' };

      expect(() => {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(PayloadTooLargeException);
      expect(() => {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow('Request body size exceeds maximum allowed size');
    });

    it('should handle missing Content-Length header', () => {
      mockRequest.headers = {};

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Request body monitoring', () => {
    it('should monitor body size for POST requests', () => {
      mockRequest.method = 'POST';

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.on).toHaveBeenCalledWith('data', expect.any(Function));
    });

    it('should monitor body size for PUT requests', () => {
      mockRequest.method = 'PUT';

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.on).toHaveBeenCalledWith('data', expect.any(Function));
    });

    it('should monitor body size for PATCH requests', () => {
      mockRequest.method = 'PATCH';

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.on).toHaveBeenCalledWith('data', expect.any(Function));
    });

    it('should not monitor body size for GET requests', () => {
      mockRequest.method = 'GET';

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.on).not.toHaveBeenCalled();
    });

    it('should not monitor body size for DELETE requests', () => {
      mockRequest.method = 'DELETE';

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.on).not.toHaveBeenCalled();
    });

    it('should throw and destroy request when body exceeds limit during streaming', () => {
      mockRequest.method = 'POST';
      let dataHandler: (chunk: Buffer) => void;

      (mockRequest.on as jest.Mock).mockImplementation((event, handler) => {
        if (event === 'data') {
          dataHandler = handler;
        }
      });

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate data chunks
      const chunk1 = Buffer.alloc(500);
      const chunk2 = Buffer.alloc(600); // This will exceed the 1KB limit

      dataHandler!(chunk1); // Should be fine
      expect(mockRequest.destroy).not.toHaveBeenCalled();

      expect(() => {
        dataHandler!(chunk2); // Should exceed limit
      }).toThrow(PayloadTooLargeException);
      expect(mockRequest.destroy).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should use default values when not configured', () => {
      const customConfigService = {
        get: jest.fn((key: string, defaultValue: any) => defaultValue),
      } as any;

      const testMiddleware = new RequestSizeLimitMiddleware(customConfigService);
      expect(testMiddleware).toBeDefined();

      expect(customConfigService.get).toHaveBeenCalledWith(
        'MAX_REQUEST_BODY_SIZE',
        10 * 1024 * 1024,
      );
      expect(customConfigService.get).toHaveBeenCalledWith('MAX_URL_LENGTH', 2048);
    });
  });
});
