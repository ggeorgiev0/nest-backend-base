/**
 * @group unit
 */
import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../src/common/constants/error-codes.enum';
import {
  BusinessRuleViolationException,
  ConflictException,
  DomainForbiddenException,
  DomainUnauthorizedException,
  ExternalServiceException,
  ResourceNotFoundException,
  ValidationException,
} from '../../../src/common/exceptions/domain-exceptions';

describe('Domain Exceptions', () => {
  describe('ResourceNotFoundException', () => {
    it('should be instantiated with default message', () => {
      const exception = new ResourceNotFoundException();
      expect(exception.message).toBe('Resource not found');
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(exception.errorCode).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('should be instantiated with custom message', () => {
      const exception = new ResourceNotFoundException('Custom not found message');
      expect(exception.message).toBe('Custom not found message');
    });

    it('should store error context but not include it in response', () => {
      const errorContext = { resourceId: '123', requestPath: '/resource/123' };
      const exception = new ResourceNotFoundException('Resource not found', errorContext);

      const response = exception.getResponse() as Record<string, unknown>;
      expect(response).not.toHaveProperty('errorContext');
      expect(exception.errorContext).toEqual(errorContext);
    });
  });

  describe('ValidationException', () => {
    it('should be instantiated with default message', () => {
      const errors = { name: ['Name is required'] };
      const exception = new ValidationException(errors);

      expect(exception.message).toBe('Validation failed');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe(ErrorCode.VALIDATION_FAILED);
      expect(exception.errors).toEqual(errors);
    });

    it('should be instantiated with custom message', () => {
      const errors = { email: ['Invalid email format'] };
      const exception = new ValidationException(errors, 'Custom validation error');

      expect(exception.message).toBe('Custom validation error');
      expect(exception.errors).toEqual(errors);
    });

    it('should include errors in getResponse() output', () => {
      const errors = { password: ['Password too weak', 'Minimum 8 characters required'] };
      const exception = new ValidationException(errors);

      const response = exception.getResponse();
      expect(response).toHaveProperty('errors');
      expect(response.errors).toEqual(errors);
    });

    it('should store error context but not include it in response', () => {
      const errors = { username: ['Username already taken'] };
      const errorContext = { userId: 'abc123' };
      const exception = new ValidationException(errors, 'Validation failed', errorContext);

      const response = exception.getResponse();
      expect(response).toHaveProperty('errors');
      expect(response).not.toHaveProperty('errorContext');
      expect(response.errors).toEqual(errors);
      expect(exception.errorContext).toEqual(errorContext);
    });
  });

  describe('BusinessRuleViolationException', () => {
    it('should be instantiated with provided message', () => {
      const exception = new BusinessRuleViolationException('Business rule violated');

      expect(exception.message).toBe('Business rule violated');
      expect(exception.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(exception.errorCode).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
    });

    it('should store error context but not include it in response', () => {
      const errorContext = { rule: 'maxItemsRule', limit: 10, current: 11 };
      const exception = new BusinessRuleViolationException('Maximum items exceeded', errorContext);

      const response = exception.getResponse() as Record<string, unknown>;
      expect(response).not.toHaveProperty('errorContext');
      expect(exception.errorContext).toEqual(errorContext);
    });
  });

  describe('DomainUnauthorizedException', () => {
    it('should be instantiated with default message', () => {
      const exception = new DomainUnauthorizedException();

      expect(exception.message).toBe('Unauthorized access');
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(exception.errorCode).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('should store error context but not include it in response', () => {
      const errorContext = { requiredRole: 'admin' };
      const exception = new DomainUnauthorizedException('Authentication required', errorContext);

      expect(exception.message).toBe('Authentication required');

      const response = exception.getResponse() as Record<string, unknown>;
      expect(response).not.toHaveProperty('errorContext');
      expect(exception.errorContext).toEqual(errorContext);
    });
  });

  describe('DomainForbiddenException', () => {
    it('should be instantiated with default message', () => {
      const exception = new DomainForbiddenException();

      expect(exception.message).toBe('Access forbidden');
      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exception.errorCode).toBe(ErrorCode.FORBIDDEN);
    });

    it('should store error context but not include it in response', () => {
      const errorContext = { requiredPermission: 'ADMIN_DELETE' };
      const exception = new DomainForbiddenException('Missing required permission', errorContext);

      expect(exception.message).toBe('Missing required permission');

      const response = exception.getResponse() as Record<string, unknown>;
      expect(response).not.toHaveProperty('errorContext');
      expect(exception.errorContext).toEqual(errorContext);
    });
  });

  describe('ConflictException', () => {
    it('should be instantiated with default message', () => {
      const exception = new ConflictException();

      expect(exception.message).toBe('Resource conflict');
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.errorCode).toBe(ErrorCode.RESOURCE_CONFLICT);
    });

    it('should store error context but not include it in response', () => {
      const errorContext = { conflictingId: '123' };
      const exception = new ConflictException('Entity already exists', errorContext);

      expect(exception.message).toBe('Entity already exists');

      const response = exception.getResponse() as Record<string, unknown>;
      expect(response).not.toHaveProperty('errorContext');
      expect(exception.errorContext).toEqual(errorContext);
    });
  });

  describe('ExternalServiceException', () => {
    it('should be instantiated with default message', () => {
      const exception = new ExternalServiceException();

      expect(exception.message).toBe('External service error');
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.errorCode).toBe(ErrorCode.EXTERNAL_SERVICE_ERROR);
    });

    it('should store error context but not include it in response', () => {
      const errorContext = { service: 'PaymentAPI', status: 503 };
      const exception = new ExternalServiceException('Payment service unavailable', errorContext);

      expect(exception.message).toBe('Payment service unavailable');

      const response = exception.getResponse() as Record<string, unknown>;
      expect(response).not.toHaveProperty('errorContext');
      expect(exception.errorContext).toEqual(errorContext);
    });
  });
});
