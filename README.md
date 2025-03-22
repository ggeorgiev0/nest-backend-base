# NestJS Backend Base

A robust NestJS backend following "Bulletproof" architecture principles.

## Project Structure

```
src/
├── api/              # API controllers, DTOs, and routes
├── config/           # Configuration files and environment variables
├── core/             # Core business logic, services, and models
├── lib/              # Shared libraries and utility functions
└── utils/            # Helper utilities and shared code
```

## Features

- Strict TypeScript configuration
- Comprehensive ESLint setup with multiple plugins
- Consistent code formatting with Prettier
- Git hooks with Husky and lint-staged
- Path aliases for clean imports
- Structured folders following "Bulletproof" principles

## Getting Started

### Installation

```bash
yarn install
```

### Development

```bash
yarn start:dev
```

### Testing

```bash
yarn test
```

## Code Quality Tools

- ESLint with TypeScript, Import, SonarJS, and Unicorn plugins
- Prettier for consistent formatting
- Husky for Git hooks
- lint-staged for pre-commit checks

## Import Structure

Imports should be organized in the following order:

1. Node built-in modules
2. External dependencies
3. Internal modules (@/\*)
4. Parent directory imports
5. Same directory imports
6. Type imports

## Type Safety

The project uses strict TypeScript configuration with:

- strict mode enabled
- strictNullChecks
- noImplicitAny
- strictBindCallApply
