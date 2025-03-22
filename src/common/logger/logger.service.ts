import { Inject, Injectable, LoggerService, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { PinoLogger } from 'nestjs-pino';

/**
 * Custom logger service that extends Pino logger
 * Adds helper methods and request context awareness
 */
@Injectable({ scope: Scope.TRANSIENT })
export class CustomLoggerService implements LoggerService {
  constructor(
    private readonly pinoLogger: PinoLogger,
    @Inject(REQUEST) private readonly request?: Request & { correlationId?: string },
  ) {
    // If a request is available, add correlation ID to logger context
    if (this.request?.correlationId) {
      this.pinoLogger.setContext('request');
    }
  }

  /**
   * Log a message at 'info' level
   */
  log(message: string, ...optionalParams: unknown[]): void {
    const context = this.getContext(optionalParams);
    const correlationContext = this.addCorrelationId(context);
    this.pinoLogger.info(correlationContext, message);
  }

  /**
   * Log a message at 'error' level
   */
  error(message: string | Error, trace?: string, ...optionalParams: unknown[]): void {
    const context = this.getContext(optionalParams);
    const correlationContext = this.addCorrelationId(context);

    if (message instanceof Error) {
      this.pinoLogger.error({ err: message, trace, ...correlationContext }, message.message);
    } else {
      this.pinoLogger.error({ trace, ...correlationContext }, message);
    }
  }

  /**
   * Log a message at 'warn' level
   */
  warn(message: string, ...optionalParams: unknown[]): void {
    const context = this.getContext(optionalParams);
    const correlationContext = this.addCorrelationId(context);
    this.pinoLogger.warn(correlationContext, message);
  }

  /**
   * Log a message at 'debug' level
   */
  debug(message: string, ...optionalParams: unknown[]): void {
    const context = this.getContext(optionalParams);
    const correlationContext = this.addCorrelationId(context);
    this.pinoLogger.debug(correlationContext, message);
  }

  /**
   * Log a message at 'trace' level
   * Used for detailed tracing of function calls
   */
  trace(message: string, ...optionalParams: unknown[]): void {
    const context = this.getContext(optionalParams);
    const correlationContext = this.addCorrelationId(context);
    this.pinoLogger.trace(correlationContext, message);
  }

  /**
   * Log a message at 'fatal' level
   * Used for critical errors that may cause application termination
   */
  fatal(message: string | Error, ...optionalParams: unknown[]): void {
    const context = this.getContext(optionalParams);
    const correlationContext = this.addCorrelationId(context);

    if (message instanceof Error) {
      this.pinoLogger.fatal({ err: message, ...correlationContext }, message.message);
    } else {
      this.pinoLogger.fatal(correlationContext, message);
    }
  }

  /**
   * Extract context from optional parameters
   * The last parameter can be an object with additional context properties
   */
  private getContext(optionalParams: unknown[]): Record<string, unknown> {
    if (optionalParams.length === 0) {
      return {};
    }

    const lastParam = optionalParams.at(-1);
    if (lastParam && typeof lastParam === 'object' && !Array.isArray(lastParam)) {
      return lastParam as Record<string, unknown>;
    }

    return {};
  }

  /**
   * Add correlation ID to the context if available
   */
  private addCorrelationId(context: Record<string, unknown>): Record<string, unknown> {
    if (this.request?.correlationId) {
      return {
        ...context,
        correlationId: this.request.correlationId,
      };
    }
    return context;
  }
}
