# Environment Configuration

This directory contains the environment configuration system for the NestJS Backend Base project.

## Structure

```
config/
├── env/
│   ├── env.interface.ts   # Environment variable interfaces
│   └── env.validation.ts  # Class-validator schema
├── config.module.ts       # Configuration module
└── README.md             # This file
```

## Environment Variables

### Application

- `NODE_ENV`: Application environment (development/test/production)
- `PORT`: Port number for the server
- `API_PREFIX`: Prefix for all API routes
- `APP_NAME`: Application name
- `APP_DESCRIPTION`: Application description
- `API_VERSION`: API version

### Database

- `DB_HOST`: Database host
- `DB_PORT`: Database port
- `DB_USERNAME`: Database username
- `DB_PASSWORD`: Database password
- `DB_DATABASE`: Database name
- `DB_SCHEMA`: Database schema

### Supabase

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key for client-side operations
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key for server-side operations
- `DATABASE_URL`: Direct connection URL to the Supabase PostgreSQL database

### JWT

- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRES_IN`: JWT token expiration time
- `JWT_REFRESH_SECRET`: Secret key for refresh tokens
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiration time

### Redis

- `REDIS_HOST`: Redis host
- `REDIS_PORT`: Redis port
- `REDIS_PASSWORD`: Redis password (optional)

### Logging

- `LOG_LEVEL`: Logging level (debug/info/warn/error)
- `LOG_FORMAT`: Logging format (dev/combined/json)
- `LOG_DIR`: Directory to store log files
- `LOG_FILE_PREFIX`: Prefix for log file names

### Security

- `CORS_ORIGIN`: CORS allowed origin
- `RATE_LIMIT_WINDOW`: Rate limiting window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window

## Environment Files

The project uses different environment files for different environments:

- `.env.example`: Template file with example values
- `.env.development`: Development environment configuration
- `.env.test`: Test environment configuration
- `.env.production`: Production environment configuration

## Validation

Environment variables are validated using class-validator. The validation:

1. Ensures all required variables are present
2. Validates variable types and formats
3. Transforms values where needed (e.g., string to number)
4. Provides clear error messages for invalid configurations

## Usage

To use the configuration in your services:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './env/env.interface';

@Injectable()
export class YourService {
  constructor(private configService: ConfigService<EnvironmentVariables, true>) {}

  someMethod() {
    const port = this.configService.get('PORT', { infer: true });
    // port is typed as number
  }
}
```

## Security

- Never commit actual environment files (.env.\*) to version control
- Keep sensitive values secure and use different values for each environment
- Use strong, unique secrets for JWT and other security features
- Consider using a secrets management service in production

## Best Practices

1. Always use the example file as a template
2. Keep environment files consistent across environments
3. Document any new variables added
4. Use meaningful default values in development
5. Validate all environment variables
6. Use type-safe configuration access
7. Keep sensitive information secure
