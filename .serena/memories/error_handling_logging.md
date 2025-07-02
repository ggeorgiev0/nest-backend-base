# Error Handling and Logging

## Exception Handling

### Custom Exceptions

All extend from BaseException with error codes:

- `ValidationException` - E01xxx codes
- `NotFoundException` - E02xxx codes
- `ConflictException` - E02xxx codes
- `DomainUnauthorizedException` - E02xxx codes
- `BusinessRuleViolationException` - E03xxx codes
- `ExternalServiceException` - E04xxx codes
- `DatabaseException` - E05xxx codes

### Error Response Format

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Validation failed",
  "errorCode": "E01001",
  "timestamp": "2023-03-22T12:34:56.789Z",
  "correlationId": "abc-123"
}
```

### Usage Example

```typescript
throw new ValidationException('Invalid email format', 'E01002');
throw new NotFoundException('User not found', 'E02002');
```

## Logging System (Pino)

### Features

- Structured JSON logging
- Correlation IDs for request tracing
- Automatic sensitive data redaction
- Environment-based formatting (pretty in dev, JSON in prod)
- Log rotation (10MB files, 7-day retention)

### Usage

```typescript
import { LoggerService } from '@common/logger';

constructor(private readonly logger: LoggerService) {}

// Log with context
this.logger.log('User created', { userId: user.id });
this.logger.warn('Rate limit approaching', { ip: request.ip });
this.logger.error('Failed to process payment', error, { orderId });
```

### Best Practices

- Never log full request/response bodies
- Use structured logging with specific fields
- Context is automatically included via correlation IDs
- Sensitive fields are auto-redacted (password, token, etc.)
