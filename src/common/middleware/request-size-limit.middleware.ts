import { Injectable, NestMiddleware, PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to enforce request size limits
 * Prevents excessively large payloads from overwhelming the server
 */
@Injectable()
export class RequestSizeLimitMiddleware implements NestMiddleware {
  private readonly maxBodySize: number;
  private readonly maxUrlLength: number;

  constructor(private readonly configService: ConfigService) {
    // Default to 10MB for body size if not configured
    this.maxBodySize = this.configService.get<number>('MAX_REQUEST_BODY_SIZE', 10 * 1024 * 1024);
    // Default to 2048 characters for URL length
    this.maxUrlLength = this.configService.get<number>('MAX_URL_LENGTH', 2048);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Check URL length
    if (req.url.length > this.maxUrlLength) {
      throw new PayloadTooLargeException('URL length exceeds maximum allowed size');
    }

    // Check Content-Length header if present
    const contentLength = req.headers['content-length'];
    if (contentLength && Number.parseInt(contentLength, 10) > this.maxBodySize) {
      throw new PayloadTooLargeException('Request body size exceeds maximum allowed size');
    }

    // For POST/PUT/PATCH requests, monitor the body size through data events
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      let bodySize = 0;

      req.on('data', (chunk: Buffer) => {
        bodySize += chunk.length;
        if (bodySize > this.maxBodySize) {
          // Destroy the request to stop processing
          req.destroy();
          throw new PayloadTooLargeException('Request body size exceeds maximum allowed size');
        }
      });
    }

    next();
  }
}
