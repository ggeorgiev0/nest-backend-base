# NestJS Backend Base

A robust NestJS backend following DDD (Domain-Driven Design) architecture principles, designed for scalability, maintainability, and developer productivity.

## Prerequisites

- Node.js (v22.14.0 or higher)
- Yarn package manager
- PostgreSQL (v14.x or higher)
- Docker (optional, for containerization)

## Project Structure

```
src/
├── api/              # API controllers, DTOs, and routes
│   ├── controllers/  # Request handlers
│   ├── dtos/        # Data Transfer Objects
│   └── validators/   # Custom validators
├── common/           # Shared components used across the application
│   ├── constants/    # Application constants and enums
│   ├── exceptions/   # Exception handling system
│   │   ├── services/ # Exception handling services
│   │   └── ...       # Exception filters, base exceptions, etc.
│   ├── logger/       # Logging system with correlation ID tracking
│   └── utils/        # Shared utilities (e.g., sensitive data handling)
├── config/           # Configuration files and environment variables
│   ├── env/          # Environment configuration and validation
│   └── ...           # Other configuration modules
├── core/             # Core business logic, services, and models
│   ├── entities/     # Database entities
│   ├── services/     # Business logic services
│   └── interfaces/   # Core interfaces and types
├── lib/              # Specialized libraries and utilities
│   ├── decorators/   # Custom decorators
│   ├── guards/       # Authentication/Authorization guards
│   ├── interceptors/ # Request/Response interceptors
│   └── middleware/   # Custom middleware
└── utils/            # Helper utilities and shared code
    ├── helpers/      # Helper functions
    └── types/        # Shared types and interfaces
```

## Features

- Strict TypeScript configuration for type safety
- Comprehensive ESLint setup with multiple plugins
- Consistent code formatting with Prettier
- Git hooks with Husky and lint-staged
- Path aliases for clean imports
- Structured folders following domain-driven design principles
- JWT-based authentication
- Role-based access control (RBAC)
- Request validation using class-validator
- Swagger/OpenAPI documentation
- Advanced error handling system:
  - Centralized exception filter
  - Standardized error response format
  - Structured error codes for client-side handling
  - Sensitive data protection in logs and responses
  - Correlation ID tracking for request tracing
- Comprehensive logging system with structured logs
- Database migrations and seeding
- Unit and e2e testing setup
- Docker support
- CI/CD pipeline configuration

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
