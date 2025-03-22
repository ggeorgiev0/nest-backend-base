# NestJS Backend Base

A robust NestJS backend following "Bulletproof" architecture principles, designed for scalability, maintainability, and developer productivity.

## Prerequisites

- Node.js (v18.x or higher)
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
├── config/           # Configuration files and environment variables
│   ├── database/    # Database configuration
│   └── env/         # Environment configuration
├── core/            # Core business logic, services, and models
│   ├── entities/    # Database entities
│   ├── services/    # Business logic services
│   └── interfaces/  # Core interfaces and types
├── lib/             # Shared libraries and utility functions
│   ├── decorators/  # Custom decorators
│   ├── filters/     # Exception filters
│   ├── guards/      # Authentication/Authorization guards
│   ├── interceptors/# Request/Response interceptors
│   └── middleware/  # Custom middleware
└── utils/           # Helper utilities and shared code
    ├── constants/   # Constants and enums
    ├── helpers/     # Helper functions
    └── types/       # Shared types and interfaces
```

## Features

- Strict TypeScript configuration for type safety
- Comprehensive ESLint setup with multiple plugins
- Consistent code formatting with Prettier
- Git hooks with Husky and lint-staged
- Path aliases for clean imports
- Structured folders following "Bulletproof" principles
- JWT-based authentication
- Role-based access control (RBAC)
- Request validation using class-validator
- Swagger/OpenAPI documentation
- Error handling and logging system
- Database migrations and seeding
- Unit and e2e testing setup
- Docker support
- CI/CD pipeline configuration

## Getting Started

### Installation

1. Clone the repository:

```bash
git clone https://github.com/ggeorgiev0/nest-backend-base.git
cd nest-backend-base
```

2. Install dependencies:

```bash
yarn install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`

### Development

1. Start the development server:

```bash
yarn start:dev
```

2. Start with debugging:

```bash
yarn start:debug
```

The API will be available at `http://localhost:3000`
Swagger documentation will be at `http://localhost:3000/api/docs`

### Building for Production

```bash
yarn build
yarn start:prod
```

### Testing

```bash
# Unit tests
yarn test

# e2e tests
yarn test:e2e

# Test coverage
yarn test:cov
```

## Database Management

```bash
# Generate a migration
yarn migration:generate src/database/migrations/MigrationName

# Run migrations
yarn migration:run

# Revert last migration
yarn migration:revert

# Run seeds
yarn seed:run
```

## Code Quality Tools

- ESLint with TypeScript, Import, SonarJS, and Unicorn plugins
- Prettier for consistent formatting
- Husky for Git hooks
- lint-staged for pre-commit checks

### Running Quality Checks

```bash
# Lint check
yarn lint

# Lint and fix
yarn lint:fix

# Format check
yarn format

# Format fix
yarn format:fix
```

## Import Structure

Imports should be organized in the following order:

1. Node built-in modules
2. External dependencies
3. Internal modules (@/\*)
4. Parent directory imports
5. Same directory imports
6. Type imports

Example:

```typescript
import { join } from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '@/core/services';
import { BaseController } from '../base.controller';
import { CreateUserDto } from './dto';
import type { User } from './types';
```

## Type Safety

The project uses strict TypeScript configuration with:

- strict mode enabled
- strictNullChecks
- noImplicitAny
- strictBindCallApply
- noUncheckedIndexedAccess

## Contributing

1. Create a new branch from `main`
2. Make your changes
3. Write/update tests as needed
4. Ensure all tests pass
5. Submit a pull request

## Scripts

- `yarn start:dev` - Start the development server
- `yarn start:debug` - Start the server in debug mode
- `yarn start:prod` - Start the production server
- `yarn build` - Build the application
- `yarn test` - Run unit tests
- `yarn test:e2e` - Run end-to-end tests
- `yarn test:cov` - Generate test coverage report
- `yarn lint` - Run ESLint
- `yarn format` - Run Prettier
- `yarn prepare` - Install Husky hooks

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
