# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Serena MCP Usage

**STRONGLY RECOMMENDED**: Always use Serena MCP tools when working with this codebase. Serena provides semantic code understanding and intelligent navigation that significantly improves code analysis and modification accuracy.

To use Serena MCP:

1. Ensure Serena MCP is configured in your Claude Code environment
2. Start each session by calling `mcp__serena__initial_instructions`
3. Use Serena's symbolic tools (`find_symbol`, `replace_symbol_body`, etc.) for precise code modifications
4. Leverage Serena's memory system to maintain context across sessions

Benefits of using Serena MCP:

- Semantic understanding of code structure and relationships
- Precise symbol-based editing instead of regex replacements
- Persistent memory of project patterns and conventions
- Intelligent code navigation and search capabilities
- Better understanding of architectural patterns and dependencies

If Serena MCP is not available, fallback to standard tools, but be aware that code modifications may be less precise and context may be lost between sessions.

## Common Commands

### Development

```bash
# Install dependencies
yarn install

# Run development server
yarn start:dev

# Run with debugging
yarn start:debug

# Build for production
yarn build

# Run production build
yarn start:prod
```

### Testing

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:cov

# Run specific test groups
yarn test:unit              # Unit tests only
yarn test:integration       # Integration tests only

# Debug tests
yarn test:debug

# Run a single test file
yarn test <path-to-test-file>
```

### Code Quality

```bash
# Lint code
yarn lint

# Format code
yarn format

# Type checking (implicit with build)
yarn build
```

### Database

```bash
# Generate Prisma client
yarn prisma:generate

# Run migrations
yarn prisma:migrate

# Open Prisma Studio
yarn prisma:studio

# Environment-specific commands
yarn prisma:generate:dev    # Uses .env.development
yarn prisma:generate:test   # Uses .env.testing

# Seed the database
yarn prisma:seed           # Uses default .env
yarn prisma:seed:dev       # Uses .env.development
```

### Git Hooks

```bash
# Install/reinstall git hooks
yarn hooks:install
```

## Architecture Overview

This NestJS backend follows **Domain-Driven Design (DDD)** principles with clear separation of concerns:

### Layer Structure

1. **API Layer** (`src/api/`): HTTP request/response handling
2. **Core Domain** (`src/core/`): Business logic and domain models
3. **Infrastructure** (`src/infrastructure/`): External services, persistence
4. **Common** (`src/common/`): Cross-cutting concerns (logging, exceptions)

### Key Architectural Patterns

- **Repository Pattern**: Data access abstraction in `infrastructure/persistence/repositories/`
- **Dependency Injection**: NestJS built-in DI for loose coupling
- **Module-based**: Each feature encapsulated in its own module
- **Global Exception Filter**: Centralized error handling
- **Interceptors**: For cross-cutting concerns like database error mapping

### Database Architecture

- **Prisma ORM**: Type-safe database access with schema-first approach
- **Supabase Integration**: Ready for real-time features and RLS
- **Transaction Support**: Via `executeTransaction` helper in repositories
- **Health Checks**: Database connectivity monitoring

## Logging System

The project uses **Pino** logger with structured JSON logging:

### Usage

```typescript
import { LoggerService } from '@common/logger';

// In a service/controller
constructor(private readonly logger: LoggerService) {}

// Log with context
this.logger.log('User created', { userId: user.id });
this.logger.warn('Rate limit approaching', { ip: request.ip });
this.logger.error('Failed to process payment', error, { orderId });
```

### Features

- **Correlation IDs**: Automatic request tracing
- **Sensitive Data Redaction**: Automatic removal of passwords, tokens, etc.
- **Environment-based**: Pretty printing in dev, JSON in production
- **Log Rotation**: 10MB files, 7-day retention in production

## Exception Handling

### Custom Exceptions

```typescript
// Domain exceptions
throw new ValidationException('Invalid email format', 'E01002');
throw new NotFoundException('User not found', 'E02002');
throw new ConflictException('Email already exists', 'E02003');
```

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

### Error Code Categories

- `E01xxx`: Validation errors
- `E02xxx`: Authentication/Authorization
- `E03xxx`: Business logic errors
- `E04xxx`: External service errors
- `E05xxx`: Database errors

## Development Conventions

### Branch Naming

```
feature-description-XX
```

Where XX is the issue number. Examples:

- `error-handling-4`
- `user-authentication-15`

### Commit Messages

Follow Conventional Commits. Issue numbers are automatically appended:

```
feat: add user authentication
# Becomes: feat: add user authentication [#15]
```

### Code Style

- Use absolute imports: `@common/logger` instead of `../../../common/logger`
- Prefer dependency injection over static imports
- Keep controllers thin, business logic in services
- Use DTOs for request/response validation
- Follow existing patterns in the codebase

## Testing Strategy

### Test Organization

- Mirror src/ structure in test/
- Use `@group` tags for test categorization
- Mock external dependencies using provided utilities

### Test Types

1. **Unit Tests**: Service methods, utilities
2. **Integration Tests**: API endpoints with real database
3. **E2E Tests**: Full application flow

### Mocking Utilities

- `test/utils/config-mocks.ts`: Configuration mocking
- `test/utils/logger-mocks.ts`: Logger mocking

## Important Implementation Notes

### Repository Pattern

Always use repositories for data access:

```typescript
// Good
const user = await this.usersRepository.findById(id);

// Avoid direct Prisma usage outside repositories
const user = await this.prisma.user.findUnique({ where: { id } });
```

### Transaction Handling

Use the transaction helper for multi-step operations:

```typescript
await this.usersRepository.executeTransaction(async (tx) => {
  await tx.user.create({ data: userData });
  await tx.profile.create({ data: profileData });
});
```

### Error Handling

Never expose internal errors. Always map to domain exceptions:

```typescript
try {
  // database operation
} catch (error) {
  if (error.code === 'P2002') {
    throw new ConflictException('Resource already exists', 'E03001');
  }
  throw new DatabaseException('Operation failed', 'E05001');
}
```

### Sensitive Data

The logger automatically redacts sensitive fields, but always be cautious:

- Never log full request/response bodies
- Use structured logging with specific fields
- Avoid logging user passwords, tokens, or keys

## Environment Configuration

Required environment variables are validated on startup. See `.env.example` for all variables. Key categories:

- Application settings (PORT, NODE_ENV)
- Database connection (DATABASE_URL, Prisma variables)
- Supabase credentials
- JWT secrets
- Redis configuration
- Security settings (CORS, rate limiting)

## Health Checks

The `/health` endpoint monitors:

- Database connectivity
- Memory usage
- Disk space
- Extensible for additional service checks

Access via: `GET /health`

## Supabase Features

### Row Level Security (RLS)

The project includes RLS support via `RLSService`:

```typescript
// Enable RLS on a table
await rlsService.enableRLS('users');

// Create a policy
await rlsService.createPolicy({
  name: 'Users can view own profile',
  table: 'users',
  action: 'SELECT',
  expression: 'auth.uid() = id',
});
```

### Real-time Subscriptions

Use `RealtimeService` for real-time data updates:

```typescript
import { RealtimeService } from '@infrastructure/persistence/supabase';

// Basic subscription to all changes
const subscription = await realtimeService.subscribe<User>(
  'user-changes',
  { table: 'users' },
  async (payload) => {
    switch (payload.eventType) {
      case 'INSERT':
        await handleNewUser(payload.new);
        break;
      case 'UPDATE':
        await handleUserUpdate(payload.new, payload.old);
        break;
      case 'DELETE':
        await handleUserDeletion(payload.old);
        break;
    }
  }
);

// Subscribe to specific events
const insertSub = realtimeService.subscribeToInserts<User>(
  'new-users',
  'users',
  async (payload) => {
    await sendWelcomeEmail(payload.new);
  }
);

// Subscribe to changes for a specific record
const userSub = realtimeService.subscribeToRecord<User>(
  'user-123-changes',
  'users',
  'user-123',
  async (payload) => {
    await updateUserCache(payload.new);
  }
);

// Subscribe with filters
const adminUpdateSub = realtimeService.subscribeToUpdates<User>(
  'admin-updates',
  'users',
  async (payload) => {
    await notifyAdminChange(payload.new);
  },
  'role=eq.admin' // Only admin users
);

// Clean up when done
await subscription.unsubscribe();

// Check active channels
const activeChannels = realtimeService.getActiveChannels();
```

#### Configuration

Configure realtime behavior through the module:

```typescript
@Module({
  imports: [
    SupabaseModule.register({
      realtimeConfig: {
        maxChannels: 50,
        connectionTimeout: 60000,
        retryAttempts: 3,
        retryDelay: 1000,
      },
    }),
  ],
})
export class AppModule {}
```
