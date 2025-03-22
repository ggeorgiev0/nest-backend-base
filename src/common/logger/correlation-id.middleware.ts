import { randomUUID } from 'node:crypto';

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/**
 * Middleware to add a correlation ID to each request
 * Used for tracking and correlating logs across the request lifecycle
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  /**
   * Header name where the correlation ID is stored
   */
  public static readonly CORRELATION_ID_HEADER = 'X-Correlation-ID';

  /**
   * Add correlation ID to the request
   * If the request already has a correlation ID, use it
   * Otherwise, generate a new one
   */
  use(request: Request, response: Response, next: NextFunction): void {
    // Get existing correlation ID or generate a new one
    const correlationId =
      request.headers[CorrelationIdMiddleware.CORRELATION_ID_HEADER.toLowerCase()] || randomUUID();

    // Add correlation ID to both request and response headers
    request.headers[CorrelationIdMiddleware.CORRELATION_ID_HEADER.toLowerCase()] = correlationId;
    response.set(CorrelationIdMiddleware.CORRELATION_ID_HEADER, correlationId as string);

    // Add correlation ID to the request object for logger access
    (request as Request & { correlationId?: string }).correlationId = correlationId as string;

    next();
  }
}
