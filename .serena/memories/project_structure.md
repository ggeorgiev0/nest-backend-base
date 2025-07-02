# Project Structure

## Directory Layout

```
src/
├── api/              # API Layer - HTTP request/response handling
│   ├── controllers/  # Request handlers
│   ├── dtos/        # Data Transfer Objects
│   └── validators/   # Custom validators
├── common/           # Cross-cutting concerns
│   ├── constants/    # Application constants and enums
│   ├── exceptions/   # Exception handling system
│   │   ├── services/ # Exception handling services
│   │   └── filters/  # Exception filters
│   ├── logger/       # Pino logging system
│   └── utils/        # Shared utilities
├── config/           # Configuration management
│   ├── env/          # Environment configuration
│   └── modules/      # Config modules
├── core/             # Core Domain - Business logic
│   ├── entities/     # Database entities
│   ├── services/     # Business logic services
│   └── interfaces/   # Core interfaces and types
├── infrastructure/   # External services & persistence
│   ├── persistence/  # Database access
│   │   └── repositories/ # Repository implementations
│   └── external/     # Third-party integrations
├── lib/              # Framework extensions
│   ├── decorators/   # Custom decorators
│   ├── guards/       # Auth guards
│   ├── interceptors/ # Request/response interceptors
│   └── middleware/   # Custom middleware
└── utils/            # Helper utilities
    ├── helpers/      # Helper functions
    └── types/        # Shared types
```

## Module Structure

Each feature follows NestJS module pattern:

- `*.module.ts` - Module definition
- `*.controller.ts` - HTTP endpoints
- `*.service.ts` - Business logic
- `*.repository.ts` - Data access
- `dto/*.dto.ts` - Request/response DTOs

## Test Structure

- Mirrors src/ directory structure
- Unit tests: `*.spec.ts`
- Integration tests: `*.integration.spec.ts`
- E2E tests: in `test/e2e/`
