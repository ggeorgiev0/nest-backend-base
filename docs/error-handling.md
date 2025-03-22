# Error Handling System

This document describes the error handling system implemented in the NestJS backend base. The system provides a consistent way to handle, format, and log errors across the application.

## Table of Contents

- [Overview](#overview)
- [Error Response Format](#error-response-format)
- [Error Codes](#error-codes)
- [Custom Exceptions](#custom-exceptions)
- [Global Exception Filter](#global-exception-filter)
- [Validation Pipe](#validation-pipe)
- [Sensitive Data Protection](#sensitive-data-protection)
- [Logging Integration](#logging-integration)
- [Testing Error Handling](#testing-error-handling)

## Overview

The error handling system consists of several components:

1. **Global Exception Filter** - Catches all exceptions and formats them according to a standardized response format
2. **Custom Exception Classes** - Domain-specific exceptions for different error types
3. **Error Codes System** - Consistent error codes for client-side error handling
4. **Validation Pipe** - Validates incoming data using class-validator
5. **Sensitive Data Protection** - Sanitizes sensitive data in error responses
6. **Logging Integration** - Integrates with the application's logger for error logging

## Error Response Format

All error responses follow this format:

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Error message",
  "errorCode": "E01001",
  "data": {}, // Optional, additional error details (only in non-production)
  "timestamp": "2023-03-22T12:34:56.789Z",
  "correlationId": "unique-correlation-id", // Optional
  "errors": {} // Optional, validation errors
}
```

Fields:

- `status`: Always "error" for error responses
- `statusCode`: HTTP status code
- `message`: Human-readable error message
- `errorCode`: Application-specific error code
- `data`: Additional error details (only in non-production environments)
- `timestamp`: When the error occurred
- `correlationId`: Request correlation ID for tracing
- `errors`: Validation errors (for validation errors only)

## Error Codes

Error codes follow the format `E{Category}{Specific}`:

- E: Error prefix
- Category: Two-digit category code
- Specific: Three-digit specific error code

Categories:

- 01: Validation errors
- 02: Authentication errors
- 03: Authorization errors
- 04: Resource errors
- 05: Business logic errors
- 06: External service errors
- 99: System/unexpected errors

Examples:

- `E01001`: Validation failed
- `E02001`: Unauthorized
- `E04001`: Resource not found

## Custom Exceptions

The system provides several domain-specific exception classes:

- `BaseException` - Base class for all custom exceptions
- `ResourceNotFoundException` - For when a requested resource doesn't exist
- `ValidationException` - For validation errors
- `BusinessRuleViolationException` - For business rule violations
- `UnauthorizedException` - For authentication errors
- `ForbiddenException` - For authorization errors
- `ConflictException` - For resource conflicts
- `ExternalServiceException` - For external service errors

### Using Custom Exceptions

```typescript
import { ResourceNotFoundException } from '@common/exceptions';

// In a service
if (!user) {
  throw new ResourceNotFoundException(`User with ID ${id} not found`);
}

// With additional context for logging (not exposed in response in production)
throw new ResourceNotFoundException('User not found', { userId: id, requestPath: '/users' });
```

## Global Exception Filter

The global exception filter (`AllExceptionsFilter`) catches all exceptions and formats them according to the standardized response format. It handles:

- Custom domain exceptions
- NestJS HTTP exceptions
- Validation errors
- Unexpected errors

It is registered globally in `main.ts` and integrates with the application's logger.

## Validation Pipe

The validation pipe (`GlobalValidationPipe`) validates incoming data using class-validator decorators. It transforms validation errors into a consistent format and throws a `ValidationException` when validation fails.

### Creating DTOs with Validation

```typescript
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}
```

### Validation Error Format

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Validation failed",
  "errorCode": "E01001",
  "timestamp": "2023-03-22T12:34:56.789Z",
  "errors": {
    "email": ["Invalid email format"],
    "password": ["Password must be at least 8 characters"]
  }
}
```

## Sensitive Data Protection

The system automatically sanitizes sensitive data in error responses using the `sanitizeObject` utility. Sensitive fields like passwords, tokens, and API keys are masked with `[REDACTED]`.

## Logging Integration

The error handling system integrates with the application's logger (`CustomLoggerService`). It logs:

- Error details with appropriate severity (error for 500s, warn for 400s)
- Request context (URL, method, IP)
- Correlation ID
- Sanitized headers

Example log format:

```
{
  "level": "error",
  "time": "2023-03-22T12:34:56.789Z",
  "pid": 1234,
  "hostname": "server",
  "correlationId": "unique-correlation-id",
  "statusCode": 500,
  "errorCode": "E99001",
  "path": "/users",
  "method": "POST",
  "err": {
    "message": "Internal server error",
    "stack": "..." // Stack trace (only in non-production)
  }
}
```

## Testing Error Handling

The error handling system includes comprehensive tests:

- `exception-filter.spec.ts` - Tests for the global exception filter
- `validation.pipe.spec.ts` - Tests for the validation pipe

Run tests with:

```bash
npm test
```

## Best Practices

1. **Use Domain-Specific Exceptions** - Use the appropriate exception class for the error type
2. **Include Context for Logging** - Add relevant context information to exceptions
3. **Validate Input Data** - Use class-validator for DTOs
4. **Add Custom Error Messages** - Provide user-friendly error messages
5. **Don't Expose Sensitive Data** - Don't include sensitive data in error responses
6. **Use Error Codes** - Use consistent error codes for client-side error handling
