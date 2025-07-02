# NestJS Backend Base Project Overview

## Project Purpose

A robust NestJS backend following Domain-Driven Design (DDD) architecture principles, designed for scalability, maintainability, and developer productivity. It provides a solid foundation for building enterprise-grade backend applications.

## Tech Stack

- **Framework**: NestJS 11.x with TypeScript
- **Node.js**: v22.14.0 or higher
- **Database**: PostgreSQL (14.x+) with Prisma ORM (6.5.0)
- **Real-time**: Supabase integration ready
- **Logging**: Pino logger with structured JSON logging
- **Testing**: Jest with groups support for unit/integration tests
- **Package Manager**: Yarn
- **Build Tool**: SWC for fast compilation
- **Code Quality**: ESLint, Prettier, Husky, lint-staged

## Key Features

- Strict TypeScript configuration for type safety
- JWT-based authentication (ready)
- Role-based access control (RBAC) (ready)
- Request validation using class-validator
- Swagger/OpenAPI documentation support
- Advanced error handling with structured error codes
- Correlation ID tracking for request tracing
- Database migrations and seeding with Prisma
- Docker support
- CI/CD pipeline configuration ready
