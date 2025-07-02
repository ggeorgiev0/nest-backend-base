# Code Style and Conventions

## TypeScript Configuration

- **Strict Mode**: Enabled with strictNullChecks, noImplicitAny
- **Target**: ES2023
- **Module**: NodeNext
- **Path Aliases**: Use absolute imports
  - `@/` → src/
  - `@api/` → src/api/
  - `@common/` → src/common/
  - `@config/` → src/config/
  - `@core/` → src/core/
  - `@infrastructure/` → src/infrastructure/
  - `@persistence/` → src/infrastructure/persistence/

## Code Formatting (Prettier)

- Print Width: 100
- Tab Width: 2 spaces
- Semicolons: Always
- Quotes: Single quotes
- Trailing Comma: All
- Arrow Parens: Always
- End of Line: LF

## Architecture Patterns

- **Domain-Driven Design (DDD)**: Clear separation of concerns
- **Repository Pattern**: Data access abstraction
- **Dependency Injection**: NestJS built-in DI
- **Module-based**: Each feature in its own module

## Naming Conventions

- **Files**: kebab-case (e.g., user.service.ts)
- **Classes**: PascalCase (e.g., UserService)
- **Interfaces**: PascalCase with 'I' prefix optional
- **DTOs**: PascalCase ending with 'Dto'
- **Exceptions**: PascalCase ending with 'Exception'

## Best Practices

- Keep controllers thin, business logic in services
- Use DTOs for request/response validation
- Never expose internal errors - map to domain exceptions
- Use structured logging with specific fields
- Prefer dependency injection over static imports
- Follow existing patterns in the codebase
