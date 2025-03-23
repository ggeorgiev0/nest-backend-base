import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { PrismaErrorCode } from '@/common/constants/prisma-error-codes.enum';
import {
  ResourceNotFoundException,
  ValidationException,
  ExternalServiceException,
  ConflictException,
} from '@/common/exceptions';

@Injectable()
export class DatabaseErrorInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext('DatabaseErrorInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          // Handle specific Prisma error codes
          // See: https://www.prisma.io/docs/reference/api-reference/error-reference#error-codes
          const errorCode = error.code as PrismaErrorCode;
          switch (errorCode) {
            case PrismaErrorCode.UNIQUE_CONSTRAINT_VIOLATION: {
              // Unique constraint violation
              const fields = (error.meta?.target as string[])?.join(', ') || 'unknown field';
              const errorContext = {
                prismaCode: error.code,
                prismaErrorType: 'UNIQUE_CONSTRAINT_VIOLATION',
                fields,
                meta: error.meta,
              };
              this.logger.warn(errorContext, `Unique constraint violation on: ${fields}`);

              return throwError(
                () =>
                  new ConflictException(`Unique constraint violation on: ${fields}`, errorContext),
              );
            }
            case PrismaErrorCode.RECORD_NOT_FOUND: {
              // Record not found
              const errorContext = {
                prismaCode: error.code,
                prismaErrorType: 'RECORD_NOT_FOUND',
                meta: error.meta,
                message: error.message,
              };
              this.logger.warn(errorContext, 'Record not found');

              return throwError(
                () => new ResourceNotFoundException('Record not found', errorContext),
              );
            }
            case PrismaErrorCode.FOREIGN_KEY_CONSTRAINT_VIOLATION: {
              // Foreign key constraint failed
              const errorContext = {
                prismaCode: error.code,
                prismaErrorType: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
                meta: error.meta,
                message: error.message,
              };
              this.logger.warn(errorContext, 'Foreign key constraint failed');

              return throwError(
                () => new ConflictException('Foreign key constraint failed', errorContext),
              );
            }
            case PrismaErrorCode.QUERY_INTERPRETATION_ERROR: // Query interpretation error
            case PrismaErrorCode.REQUIRED_RELATED_RECORD_NOT_FOUND: // Required record in related table not found
            case PrismaErrorCode.INPUT_ERROR: // Input error
            case PrismaErrorCode.TABLE_DOES_NOT_EXIST: {
              // Table does not exist
              const errorContext = {
                prismaCode: error.code,
                prismaErrorType: this.getPrismaErrorTypeFromCode(error.code),
                meta: error.meta,
                message: error.message,
              };
              this.logger.warn(errorContext, `Database error: ${error.message}`);

              return throwError(
                () =>
                  new ValidationException(
                    { database: [`Database error: ${error.message}`] },
                    'Invalid database operation',
                    errorContext,
                  ),
              );
            }
            default: {
              const errorContext = {
                prismaCode: error.code,
                meta: error.meta,
                message: error.message,
              };
              this.logger.error(errorContext, `Unhandled Prisma error code ${error.code}`);

              return throwError(
                () => new ExternalServiceException('Database operation failed', errorContext),
              );
            }
          }
        }

        if (error instanceof Prisma.PrismaClientValidationError) {
          const errorContext = {
            errorType: 'PrismaClientValidationError',
            message: error.message,
          };
          this.logger.warn(errorContext, 'Prisma validation error');

          return throwError(
            () =>
              new ValidationException(
                { database: ['Invalid data provided'] },
                'Invalid data provided',
                errorContext,
              ),
          );
        }

        if (error instanceof Prisma.PrismaClientInitializationError) {
          const errorContext = {
            errorType: 'PrismaClientInitializationError',
            message: error.message,
          };
          this.logger.error(errorContext, 'Prisma initialization error');

          return throwError(
            () => new ExternalServiceException('Database connection failed', errorContext),
          );
        }

        // For other errors, just rethrow
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get a human-readable error type from Prisma error code
   * @param code Prisma error code
   * @returns Human-readable error type or 'UNKNOWN' if not recognized
   */
  private getPrismaErrorTypeFromCode(code: string): string {
    // Cast the code to PrismaErrorCode to ensure type compatibility
    const errorCode = code as PrismaErrorCode;

    switch (errorCode) {
      case PrismaErrorCode.UNIQUE_CONSTRAINT_VIOLATION: {
        return 'UNIQUE_CONSTRAINT_VIOLATION';
      }
      case PrismaErrorCode.FOREIGN_KEY_CONSTRAINT_VIOLATION: {
        return 'FOREIGN_KEY_CONSTRAINT_VIOLATION';
      }
      case PrismaErrorCode.QUERY_INTERPRETATION_ERROR: {
        return 'QUERY_INTERPRETATION_ERROR';
      }
      case PrismaErrorCode.REQUIRED_RELATED_RECORD_NOT_FOUND: {
        return 'REQUIRED_RELATED_RECORD_NOT_FOUND';
      }
      case PrismaErrorCode.INPUT_ERROR: {
        return 'INPUT_ERROR';
      }
      case PrismaErrorCode.TABLE_DOES_NOT_EXIST: {
        return 'TABLE_DOES_NOT_EXIST';
      }
      case PrismaErrorCode.RECORD_NOT_FOUND: {
        return 'RECORD_NOT_FOUND';
      }
      default: {
        return 'UNKNOWN';
      }
    }
  }
}
