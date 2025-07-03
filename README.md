# NestJS Backend Base

A robust NestJS backend following Domain-Driven Design (DDD) architecture principles, designed for scalability, maintainability, and developer productivity.

## Prerequisites

- Node.js (v22.14.0 or higher)
- Yarn package manager
- PostgreSQL (v14.x or higher)
- Docker (optional, for containerization)
- Supabase CLI (optional, for edge functions and Supabase features)

## Project Structure

```
src/
├── api/                    # API layer - HTTP request/response handling
│   ├── controllers/        # Request handlers
│   ├── dtos/              # Data Transfer Objects
│   │   └── users/         # User-specific DTOs
│   └── validators/        # Custom validators
├── common/                # Cross-cutting concerns
│   ├── constants/         # Application constants and enums
│   ├── exceptions/        # Exception handling system
│   ├── interceptors/      # Global interceptors (e.g., database error handling)
│   ├── logger/           # Pino-based logging with correlation ID tracking
│   └── utils/            # Shared utilities
├── config/               # Configuration management
│   ├── env/             # Environment configuration and validation
│   └── ...              # Other configuration modules
├── core/                # Core domain - business logic
│   ├── entities/        # Domain entities (currently using DTOs)
│   ├── interfaces/      # Core interfaces and types
│   └── services/        # Business logic services
│       ├── exceptions/  # Exception handling services
│       └── users/       # User domain services
├── infrastructure/      # Infrastructure layer - external services
│   ├── health/         # Health check implementations
│   └── persistence/    # Data persistence layer
│       ├── prisma/     # Prisma ORM service
│       ├── repositories/ # Repository implementations
│       └── supabase/   # Supabase integration
│           └── types/  # TypeScript types for Supabase
├── lib/                # Reusable libraries and utilities
│   ├── decorators/     # Custom decorators
│   ├── guards/         # Authentication/Authorization guards
│   ├── interceptors/   # Custom interceptors
│   └── middleware/     # Custom middleware
└── utils/              # Helper utilities
    ├── helpers/        # Helper functions
    └── types/          # Shared TypeScript types
```

## Features

### Core Features

- **TypeScript**: Strict configuration with path aliases for clean imports
- **Code Quality**: ESLint, Prettier, Husky with lint-staged for pre-commit hooks
- **Architecture**: Domain-Driven Design (DDD) with clear separation of concerns
- **Testing**: Jest with test groups support (unit, integration, e2e)

### Database & ORM

- **Prisma ORM**: Type-safe database access with migrations
- **PostgreSQL**: Primary database with full ACID compliance
- **Repository Pattern**: Abstracted data access layer
- **Database Interceptor**: Automatic Prisma error handling and mapping
- **Seeding**: Database seed scripts with transaction support

### Supabase Integration

- **Real-time Subscriptions**: WebSocket-based real-time data updates
- **Row Level Security (RLS)**: Helper service for generating RLS policies
- **Service Role**: Separate admin client for elevated operations
- **Edge Functions**: Ready for Supabase Edge Functions deployment

### Error Handling & Logging

- **Centralized Exception Filter**: Catches and formats all errors consistently
- **Domain Exceptions**: Typed exceptions for different error scenarios
- **Error Codes**: Structured error codes (E01xxx - E05xxx) for client handling
- **Pino Logger**: High-performance JSON logging with:
  - Correlation ID tracking for request tracing
  - Automatic sensitive data redaction
  - Log rotation in production (10MB files, 7-day retention)
  - Pretty printing in development

### API Features

- **Request Validation**: class-validator with custom validation pipe
- **DTOs**: Type-safe request/response objects
- **Health Checks**: Database connectivity and system resource monitoring
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Built-in rate limiting support

### Development Experience

- **Hot Reload**: Fast development with --watch mode
- **Debug Mode**: Built-in debugging support
- **Environment Management**: Multiple .env files for different environments
- **Docker Support**: Dockerfile and docker-compose ready
- **CI/CD Ready**: GitHub Actions and other CI/CD configurations

## Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd nest-backend-base

# Install dependencies
yarn install

# Copy environment variables
cp .env.example .env
cp .env.example .env.development
cp .env.example .env.testing

# Configure your database connection in .env files
# Update DATABASE_URL with your PostgreSQL connection string
```

### Database Setup

```bash
# Generate Prisma client
yarn prisma:generate

# Run database migrations
yarn prisma:migrate:dev

# Seed the database (optional)
yarn prisma:seed:dev

# Open Prisma Studio to view your data
yarn prisma:studio
```

### Running the Application

```bash
# Development mode with hot reload
yarn start:dev

# Debug mode
yarn start:debug

# Production mode
yarn build
yarn start:prod
```

## Available Commands

### Development

```bash
yarn start              # Start the application
yarn start:dev          # Start with hot reload
yarn start:debug        # Start with debugging enabled
yarn start:prod         # Start production build
yarn build              # Build for production
```

### Testing

```bash
yarn test               # Run all tests
yarn test:watch         # Run tests in watch mode
yarn test:cov           # Run tests with coverage
yarn test:debug         # Debug tests
yarn test:unit          # Run unit tests only
yarn test:integration   # Run integration tests only
```

### Code Quality

```bash
yarn lint               # Lint and fix code
yarn format             # Format code with Prettier
```

### Database (Prisma)

```bash
yarn prisma:generate    # Generate Prisma client
yarn prisma:migrate     # Run migrations (development)
yarn prisma:studio      # Open Prisma Studio GUI

# Environment-specific commands
yarn prisma:generate:dev   # Generate client for development
yarn prisma:generate:test  # Generate client for testing
yarn prisma:seed           # Seed database (uses default .env)
yarn prisma:seed:dev       # Seed database for development
```

### Git Hooks

```bash
yarn hooks:install      # Manually install git hooks
```

### Supabase

```bash
yarn supabase           # Run Supabase CLI commands
```

## Branch and Commit Conventions

### Branch Naming

Branches should follow the naming convention:

```
feature-description-XX
```

Where:

- `feature-description` is a short description of the feature or issue
- `XX` is the issue number from the issue tracker

Examples:

- `error-handling-4`
- `user-authentication-15`
- `api-documentation-23`

### Commit Messages

Commit messages should follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>: <description>
```

The issue number will be automatically appended to your commit message based on the branch name. For example, if you're on branch `error-handling-4` and write the commit message `feat: add proper error handling`, it will be automatically formatted as:

```
feat: add proper error handling [#4]
```

This automation is handled by a Git hook, so you don't need to manually add the issue reference.

#### Installing the Git Hook

The hook is automatically set up when you run `yarn install` through Husky. However, if the hook is not working or you've just cloned the repository, you can manually install it by running:

```bash
yarn hooks:install
```

This command installs the hook in both the standard Git hooks location (`.git/hooks/`) and the Husky hooks location (`.husky/_/`), ensuring it works regardless of your Git configuration.

#### Troubleshooting

If your commit messages don't automatically include the issue number:

1. Make sure you're following the branch naming convention with a number at the end (e.g., `feature-description-123`)
2. Reinstall the Git hooks by running `yarn hooks:install`
3. Check if the hooks are executable:
   ```bash
   ls -la .git/hooks/prepare-commit-msg
   ls -la .husky/_/prepare-commit-msg
   ```
4. Verify your Git hooks path:
   ```bash
   git config --get core.hooksPath
   ```

## Environment Configuration

The project uses different `.env` files for different environments:

- `.env` - Default environment variables
- `.env.development` - Development-specific variables
- `.env.testing` - Testing environment variables
- `.env.production` - Production variables (not committed to git)

### Required Environment Variables

```bash
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
PRISMA_LOG_LEVEL=warn

# Supabase (optional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT (when authentication is implemented)
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=info
LOG_PRETTY=true  # Set to false in production
```

## Error Handling

### Error Code Structure

The project uses a structured error code system:

- `E01xxx` - Validation errors
- `E02xxx` - Authentication/Authorization errors
- `E03xxx` - Business logic errors
- `E04xxx` - External service errors
- `E05xxx` - Database errors

### Error Response Format

All errors follow a consistent format:

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Validation failed",
  "errorCode": "E01001",
  "timestamp": "2023-12-08T12:34:56.789Z",
  "correlationId": "abc-123-def-456",
  "errors": {
    "field": ["Error message"]
  }
}
```

## Testing Strategy

### Test Organization

Tests are organized by type using Jest groups:

```bash
# Run specific test groups
yarn test:unit          # Unit tests (@group unit)
yarn test:integration   # Integration tests (@group integration)
```

### Test Structure

```
test/
├── unit/              # Unit tests for services, utilities
├── integration/       # API endpoint tests
├── e2e/              # End-to-end tests
└── utils/            # Test utilities and mocks
```

## Important Implementation Notes

### Repository Pattern

Always use repositories for data access:

```typescript
// ✅ Good
const user = await this.usersRepository.findById(id);

// ❌ Avoid direct Prisma usage outside repositories
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

### Logging Best Practices

```typescript
// Use structured logging with context
this.logger.log('User created', { userId: user.id });

// Never log sensitive data
this.logger.log('Login attempt', { email }); // ✅ Good
this.logger.log('Login attempt', { email, password }); // ❌ Bad
```

### Supabase Real-time Usage

```typescript
// Subscribe to table changes
const subscription = await realtimeService.subscribe(
  'user-changes',
  { table: 'users', event: 'INSERT' },
  async (payload) => {
    await handleNewUser(payload.new);
  },
);

// Clean up when done
await subscription.unsubscribe();
```

## Contributing

1. Create a feature branch following the naming convention
2. Make your changes
3. Ensure all tests pass: `yarn test`
4. Ensure code quality: `yarn lint`
5. Commit using conventional commits
6. Create a pull request

## License

This project is licensed under the MIT License.
