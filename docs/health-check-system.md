# Health Check System

This document describes the health check system implemented in the application.

## Overview

The health check system is based on the NestJS Terminus library, which provides a standardized way to check the health of various services and dependencies. The system exposes a `/health` endpoint that returns the health status of the application and its dependencies.

## Architecture

The health check system consists of the following components:

1. **HealthController** - Handles the `/health` endpoint and coordinates health checks
2. **HealthModule** - Configures the health check system and its dependencies
3. **Health Indicators** - Services that check the health of specific components:
   - **PrismaHealthIndicator** - Checks the health of the Prisma database connection

## Health Check Response Format

The health check endpoint returns a response with the following structure:

```json
{
  "status": "ok",
  "info": {
    "prisma": {
      "status": "up"
    }
  }
}
```

When a health check fails, the response format is:

```json
{
  "status": "error",
  "info": {
    "prisma": {
      "status": "down",
      "error": "Error message"
    }
  }
}
```

## Error Handling

The health check system has been integrated with the application's exception handling system:

1. Health check errors are now thrown as `ExternalServiceException` instances instead of the deprecated `HealthCheckError`
2. The error contains context data that preserves the health check result format
3. The HealthController catches these exceptions and formats the response appropriately
4. This approach integrates with the global exception handling system and provides consistent logging

## Testing

The health check system is tested through integration tests that:

1. Mock the Prisma service to simulate both successful and failed database connections
2. Verify that the health check endpoint returns the expected response format
3. Ensure that the error handling works correctly

## Adding New Health Indicators

To add a new health indicator:

1. Create a new health indicator class that extends or follows the pattern of `PrismaHealthIndicator`
2. Register the health indicator in the `HealthModule`
3. Add the new health check to the `HealthController`'s `check` method

Example:

```typescript
// Step 1: Create a new health indicator
@Injectable()
export class NewServiceHealthIndicator {
  constructor(private service: NewService) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.service.checkConnection();
      return {
        [key]: {
          status: 'up',
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const healthCheckResult = {
        [key]: {
          status: 'down',
          error: errorMessage,
        },
      };

      throw new ExternalServiceException('Service health check failed', {
        healthCheckResult,
        cause: error,
      });
    }
  }
}

// Step 2: Add to HealthModule providers array
@Module({
  imports: [TerminusModule, PrismaModule, NewServiceModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, NewServiceHealthIndicator],
  exports: [PrismaHealthIndicator, NewServiceHealthIndicator],
})
export class HealthModule {}

// Step 3: Add to HealthController's check method
@Get()
@HealthCheck()
async check() {
  try {
    return await this.health.check([
      () => this.prismaHealth.isHealthy('prisma'),
      () => this.newServiceHealth.isHealthy('newService'),
    ]);
  } catch (error) {
    if (error instanceof BaseException && error.errorContext?.healthCheckResult) {
      return {
        status: 'error',
        info: error.errorContext.healthCheckResult,
      };
    }
    throw error;
  }
}
```
