/**
 * @group unit
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import {
  ResourceNotFoundException,
  ValidationException,
  BusinessRuleViolationException,
  DomainUnauthorizedException,
  DomainForbiddenException,
  ConflictException,
  ExternalServiceException,
} from '../../../../src/common/exceptions/domain-exceptions';
import { ErrorCode } from '../../../../src/common/exceptions/error-codes.enum';
import { ExceptionMapperService } from '../../../../src/common/exceptions/services/exception-mapper.service';

describe('ExceptionMapperService', () => {
  let service: ExceptionMapperService;
  let configService: jest.Mocked<ConfigService>;

  // Define tests for both production and non-production environments
  describe.each([
    { environment: 'development', isProduction: false },
    { environment: 'production', isProduction: true },
  ])('in $environment environment', ({ environment, isProduction }) => {
    beforeEach(async () => {
      // Mock ConfigService
      configService = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'NODE_ENV') {
            return environment;
          }
        }),
      } as unknown as jest.Mocked<ConfigService>;

      // Create test module
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExceptionMapperService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      service = module.get<ExceptionMapperService>(ExceptionMapperService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should add correlation ID to response if provided', () => {
      const error = new Error('Test error');
      const correlationId = 'test-correlation-id';

      const response = service.mapExceptionToResponse(error, correlationId);

      expect(response.correlationId).toBe(correlationId);
    });

    // Testing different types of exceptions
    describe('mapExceptionToResponse', () => {
      // Testing Base Exception mapping
      describe('with BaseException', () => {
        it('should correctly map ResourceNotFoundException', () => {
          const error = new ResourceNotFoundException('Resource not found', { resourceId: '123' });
          const response = service.mapExceptionToResponse(error);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
          expect(response.message).toBe('Resource not found');
          expect(response.errorCode).toBe(ErrorCode.RESOURCE_NOT_FOUND);

          // Data behavior depends on environment
          if (isProduction) {
            expect(response.data).toBeUndefined();
          } else {
            expect(response.data).toEqual({ resourceId: '123' });
          }
        });

        it('should correctly map ValidationException with errors', () => {
          const validationErrors = {
            email: ['must be a valid email'],
            name: ['must not be empty', 'must be at least 3 characters long'],
          };
          const error = new ValidationException(validationErrors, 'Validation failed', {
            userId: '123',
          });
          const response = service.mapExceptionToResponse(error);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
          expect(response.message).toBe('Validation failed');
          expect(response.errorCode).toBe(ErrorCode.VALIDATION_FAILED);
          expect(response.errors).toEqual(validationErrors);

          // Data behavior depends on environment
          if (isProduction) {
            expect(response.data).toBeUndefined();
          } else {
            expect(response.data).toEqual({ userId: '123' });
          }
        });

        it('should correctly map BusinessRuleViolationException', () => {
          const error = new BusinessRuleViolationException('Business rule violated', {
            rule: 'max-items',
          });
          const response = service.mapExceptionToResponse(error);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
          expect(response.message).toBe('Business rule violated');
          expect(response.errorCode).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);

          // Data behavior depends on environment
          if (isProduction) {
            expect(response.data).toBeUndefined();
          } else {
            expect(response.data).toEqual({ rule: 'max-items' });
          }
        });

        it('should correctly map DomainUnauthorizedException', () => {
          const error = new DomainUnauthorizedException('Not authorized', { userId: '123' });
          const response = service.mapExceptionToResponse(error);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
          expect(response.message).toBe('Not authorized');
          expect(response.errorCode).toBe(ErrorCode.UNAUTHORIZED);
        });

        it('should correctly map DomainForbiddenException', () => {
          const error = new DomainForbiddenException('Access denied', { permission: 'admin' });
          const response = service.mapExceptionToResponse(error);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.FORBIDDEN);
          expect(response.message).toBe('Access denied');
          expect(response.errorCode).toBe(ErrorCode.FORBIDDEN);
        });

        it('should correctly map ConflictException', () => {
          const error = new ConflictException('Resource conflict', { entityId: '123' });
          const response = service.mapExceptionToResponse(error);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.CONFLICT);
          expect(response.message).toBe('Resource conflict');
          expect(response.errorCode).toBe(ErrorCode.RESOURCE_CONFLICT);
        });

        it('should correctly map ExternalServiceException', () => {
          const error = new ExternalServiceException('External service error', {
            service: 'payment-api',
          });
          const response = service.mapExceptionToResponse(error);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
          expect(response.message).toBe('External service error');
          expect(response.errorCode).toBe(ErrorCode.EXTERNAL_SERVICE_ERROR);
        });
      });

      // Testing HttpException mapping
      describe('with HttpException', () => {
        it('should map HttpException with string response', () => {
          const error = new HttpException('Forbidden access', HttpStatus.FORBIDDEN);
          const response = service.mapExceptionToResponse(error);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.FORBIDDEN);
          expect(response.message).toBe('Forbidden access');
          expect(response.errorCode).toBe(ErrorCode.FORBIDDEN);
        });

        it('should map HttpException with object response', () => {
          const error = new HttpException(
            { message: 'Custom error message', errors: { field: ['error'] } },
            HttpStatus.BAD_REQUEST,
          );
          const response = service.mapExceptionToResponse(error);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
          expect(response.message).toBe('Custom error message');
          expect(response.errorCode).toBe(ErrorCode.INVALID_INPUT);
          expect(response.errors).toEqual({ field: ['error'] });

          // Test environment-specific behavior
          if (isProduction) {
            expect(response.data).toBeUndefined();
          } else {
            expect(response.data).toBeDefined();
          }
        });

        it('should map HttpException with complex object and no message property', () => {
          const error = new HttpException({ customProperty: 'value' }, HttpStatus.BAD_REQUEST);
          const response = service.mapExceptionToResponse(error);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
          expect(response.message).toBe('An error occurred');
          expect(response.errorCode).toBe(ErrorCode.INVALID_INPUT);

          // Test environment-specific behavior
          if (isProduction) {
            expect(response.data).toBeUndefined();
          } else {
            expect(response.data).toBeDefined();
            expect(response.data).toHaveProperty('customProperty', 'value');
          }
        });

        it('should map all status codes to appropriate error codes', () => {
          // Test several status codes
          const statusCodesToTest = [
            { status: HttpStatus.BAD_REQUEST, expectedCode: ErrorCode.INVALID_INPUT },
            { status: HttpStatus.UNAUTHORIZED, expectedCode: ErrorCode.UNAUTHORIZED },
            { status: HttpStatus.FORBIDDEN, expectedCode: ErrorCode.FORBIDDEN },
            { status: HttpStatus.NOT_FOUND, expectedCode: ErrorCode.RESOURCE_NOT_FOUND },
            { status: HttpStatus.CONFLICT, expectedCode: ErrorCode.RESOURCE_CONFLICT },
            {
              status: HttpStatus.UNPROCESSABLE_ENTITY,
              expectedCode: ErrorCode.BUSINESS_RULE_VIOLATION,
            },
            { status: HttpStatus.SERVICE_UNAVAILABLE, expectedCode: ErrorCode.SERVICE_UNAVAILABLE },
            {
              status: HttpStatus.INTERNAL_SERVER_ERROR,
              expectedCode: ErrorCode.INTERNAL_SERVER_ERROR,
            },
            { status: 499, expectedCode: ErrorCode.INTERNAL_SERVER_ERROR }, // Unmapped status code
          ];

          // Test each status code
          for (const { status, expectedCode } of statusCodesToTest) {
            const response = service.mapStatusToErrorCode(status);
            expect(response).toBe(expectedCode);
          }
        });

        it('should handle HttpException with response as array', () => {
          const message = ['Error1', 'Error2'];
          const exception = new HttpException(message, HttpStatus.BAD_REQUEST);
          const response = service.mapExceptionToResponse(exception);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
          expect(response.message).toBe('An error occurred'); // Default message when array encountered
          expect(response.errorCode).toBe(ErrorCode.INVALID_INPUT);
        });

        it('should handle HttpException with response as number', () => {
          const message = 42 as unknown as Record<string, any>;
          const exception = new HttpException(message, HttpStatus.BAD_REQUEST);
          const response = service.mapExceptionToResponse(exception);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
          expect(response.message).toBe('Http Exception'); // Actual message returned by the service
          expect(response.errorCode).toBe(ErrorCode.INVALID_INPUT);
        });
      });

      // Testing mapping of validation error formats
      describe('with validation error formats', () => {
        it('should map class-validator format validation errors', () => {
          const validationError = {
            message: {
              validation: [
                {
                  property: 'email',
                  constraints: {
                    isEmail: 'email must be a valid email address',
                    isNotEmpty: 'email should not be empty',
                  },
                },
                {
                  property: 'password',
                  constraints: {
                    minLength: 'password must be at least 8 characters',
                  },
                },
              ],
            },
          };

          const response = service.mapExceptionToResponse(validationError);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
          expect(response.message).toBe('Validation failed');
          expect(response.errorCode).toBe(ErrorCode.VALIDATION_FAILED);
          expect(response.errors).toBeDefined();
          expect(response.errors?.email).toContain('email must be a valid email address');
          expect(response.errors?.email).toContain('email should not be empty');
          expect(response.errors?.password).toContain('password must be at least 8 characters');
        });

        it('should map mongoose-like validation errors', () => {
          const validationError = {
            errors: {
              email: { message: 'Email is invalid' },
              name: { message: 'Name is required' },
            },
          };

          const response = service.mapExceptionToResponse(validationError);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
          expect(response.message).toBe('Validation failed');
          expect(response.errorCode).toBe(ErrorCode.VALIDATION_FAILED);
          expect(response.errors).toBeDefined();
          expect(response.errors?.email).toContain('Email is invalid');
          expect(response.errors?.name).toContain('Name is required');
        });

        it('should handle empty validation errors object', () => {
          const exception = {
            message: { validation: [] },
            name: 'ValidationError',
          };

          const response = service.mapExceptionToResponse(exception);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
          expect(response.message).toBe('Validation failed');
          expect(response.errorCode).toBe(ErrorCode.VALIDATION_FAILED);
          expect(response.errors).toEqual({});
        });

        it('should handle validation errors without constraints', () => {
          const exception = {
            message: {
              validation: [
                { property: 'email' }, // No constraints property
              ],
            },
            name: 'ValidationError',
          };

          const response = service.mapExceptionToResponse(exception);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
          expect(response.message).toBe('Validation failed');
          expect(response.errorCode).toBe(ErrorCode.VALIDATION_FAILED);
          expect(response.errors).toEqual({ email: [] });
        });
      });

      // Add more tests for isKnownValidationFormat private method
      describe('isKnownValidationFormat method', () => {
        it('should recognize validation format with message.validation', () => {
          const exception = {
            message: {
              validation: [{ property: 'email', constraints: { isEmail: 'Must be an email' } }],
            },
          };

          // Call mapExceptionToResponse to test the private method indirectly
          const response = service.mapExceptionToResponse(exception);

          // If it recognizes the format, it should use ValidationFailed error code
          expect(response.errorCode).toBe(ErrorCode.VALIDATION_FAILED);
        });

        it('should recognize validation format with errors property', () => {
          const exception = {
            errors: {
              email: { message: 'Must be an email' },
            },
          };

          const response = service.mapExceptionToResponse(exception);

          expect(response.errorCode).toBe(ErrorCode.VALIDATION_FAILED);
        });
      });

      // Testing unknown exceptions
      describe('with unknown exceptions', () => {
        it('should handle Error objects', () => {
          const error = new Error('Something went wrong');
          error.stack = 'Error: Something went wrong\n    at Test';
          const response = service.mapExceptionToResponse(error);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect(response.message).toBe('An unexpected error occurred');

          // Test environment-specific behavior
          if (isProduction) {
            expect(response.data?.stack).toBeUndefined();
          } else {
            expect(response.data).toBeDefined();
            expect(response.data).toHaveProperty('name', 'Error');
            expect(response.data).toHaveProperty('message', 'Something went wrong');
            expect(response.data).toHaveProperty('stack', error.stack);
          }
        });

        it('should handle non-Error object exceptions', () => {
          const error = { custom: 'error' };
          const response = service.mapExceptionToResponse(error);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect(response.message).toBe('An unexpected error occurred');

          // Test environment-specific behavior
          if (isProduction) {
            expect(response.data).toBeUndefined();
          } else {
            expect(response.data).toBeDefined();
            expect(response.data).toHaveProperty('exception', '[object Object]');
          }
        });

        it('should handle primitive exceptions (string)', () => {
          const error = 'String error';
          const response = service.mapExceptionToResponse(error);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect(response.message).toBe('An unexpected error occurred');

          // Test environment-specific behavior
          if (isProduction) {
            expect(response.data).toBeUndefined();
          } else {
            expect(response.data).toBeDefined();
            expect(response.data).toHaveProperty('exception', 'String error');
          }
        });

        it('should handle primitive exceptions (number)', () => {
          const error = 42;
          const response = service.mapExceptionToResponse(error);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect(response.message).toBe('An unexpected error occurred');

          // Test environment-specific behavior
          if (isProduction) {
            expect(response.data).toBeUndefined();
          } else {
            expect(response.data).toBeDefined();
            expect(response.data).toHaveProperty('exception', '42');
          }
        });

        it('should handle null exception', () => {
          const error = null;
          const response = service.mapExceptionToResponse(error);

          expect(response.status).toBe('error');
          expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect(response.message).toBe('An unexpected error occurred');

          // Test environment-specific behavior
          if (isProduction) {
            expect(response.data).toBeUndefined();
          } else {
            expect(response.data).toBeDefined();
            expect(response.data).toHaveProperty('exception', 'null');
          }
        });
      });
    });
  });
});
