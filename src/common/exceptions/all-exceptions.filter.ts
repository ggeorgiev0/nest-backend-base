import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';

import { CustomLoggerService } from '../logger/logger.service';

import { ErrorLoggerService } from './services/error-logger.service';
import { ExceptionMapperService } from './services/exception-mapper.service';

// AppConfig interface definition (simplified)
interface AppConfig {
  NODE_ENV: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Global filter to catch and handle all exceptions
 *
 * This filter delegates the responsibility of mapping exceptions to the ExceptionMapperService
 * and the responsibility of logging exceptions to the ErrorLoggerService, following the
 * Single Responsibility Principle.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly isProduction: boolean;

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly configService: ConfigService<AppConfig>,
    private readonly logger: CustomLoggerService,
    private readonly exceptionMapper: ExceptionMapperService,
    private readonly errorLogger: ErrorLoggerService,
  ) {
    this.isProduction = configService.get<string>('NODE_ENV') === 'production';
  }

  /**
   * Catch and handle all exceptions
   *
   * @param exception The exception to handle
   * @param host Host providing request and response
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { httpAdapter } = this.httpAdapterHost;

    // Get correlation ID from request if available
    const correlationId = (request as Request & { correlationId?: string }).correlationId;

    // Create the response object using the exception mapper service
    const responseBody = this.exceptionMapper.mapExceptionToResponse(exception, correlationId);

    // Log the error with appropriate level using the error logger service
    this.errorLogger.logException(exception, responseBody, request);

    // Set HTTP status code and send the response
    httpAdapter.reply(response, responseBody, responseBody.statusCode);
  }
}
