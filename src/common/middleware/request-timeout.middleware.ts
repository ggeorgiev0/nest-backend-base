import { Injectable, NestMiddleware, RequestTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to enforce request timeout
 * Prevents long-running requests from consuming resources
 */
@Injectable()
export class RequestTimeoutMiddleware implements NestMiddleware {
  private readonly timeout: number;

  constructor(private readonly configService: ConfigService) {
    // Default to 30 seconds if not configured
    this.timeout = this.configService.get<number>('REQUEST_TIMEOUT', 30_000);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Set timeout for the request
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        next(new RequestTimeoutException('Request timeout exceeded'));
      }
    }, this.timeout);

    // Clear timeout when response finishes
    res.on('finish', () => {
      clearTimeout(timer);
    });

    // Clear timeout on response close
    res.on('close', () => {
      clearTimeout(timer);
    });

    next();
  }
}
