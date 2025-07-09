# NestJS Backend Server Architecture

## High-Level Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        CLIENT[Web/Mobile Client]
    end

    subgraph "API Gateway Layer"
        NGINX[Nginx/Load Balancer]
    end

    subgraph "Application Layer"
        subgraph "NestJS Application"
            MW[Middleware Layer]
            CTRL[Controllers/API Layer]
            INT[Interceptors]
            GUARD[Guards]
            PIPE[Pipes/Validation]
            SVC[Service Layer]
            REPO[Repository Layer]
        end
    end

    subgraph "Infrastructure Layer"
        DB[(PostgreSQL)]
        REDIS[(Redis Cache)]
        SUPA[Supabase Realtime]
    end

    CLIENT --> NGINX
    NGINX --> MW
    MW --> CTRL
    CTRL --> INT
    INT --> GUARD
    GUARD --> PIPE
    PIPE --> SVC
    SVC --> REPO
    REPO --> DB
    REPO --> REDIS
    SVC --> SUPA
```

## Detailed Component Architecture

```mermaid
graph LR
    subgraph "Request Flow"
        REQ[HTTP Request] --> MW1[Correlation ID Middleware]
        MW1 --> MW2[Request Size Limit]
        MW2 --> MW3[Request Timeout]
        MW3 --> MW4[Logger Middleware]
        MW4 --> CTRL[Controller]
        CTRL --> PIPE[Validation Pipe]
        PIPE --> GUARD[Auth Guard]
        GUARD --> INT1[Database Error Interceptor]
        INT1 --> SVC[Service Layer]
        SVC --> REPO[Repository]
        REPO --> DB[(Database)]
        DB --> REPO
        REPO --> SVC
        SVC --> INT1
        INT1 --> FILTER[Exception Filter]
        FILTER --> RES[HTTP Response]
    end
```

## Domain-Driven Design (DDD) Layer Architecture

```mermaid
graph TD
    subgraph "API Layer - src/api/"
        CTRL_API[Controllers]
        DTO[DTOs]
        VAL[Validators]

        CTRL_API --> DTO
        CTRL_API --> VAL
    end

    subgraph "Core Domain - src/core/"
        ENT[Entities]
        SVC_CORE[Domain Services]
        INT_CORE[Domain Interfaces]
        EXC_SVC[Exception Services]

        SVC_CORE --> ENT
        SVC_CORE --> INT_CORE
        SVC_CORE --> EXC_SVC
    end

    subgraph "Infrastructure - src/infrastructure/"
        PRISMA[Prisma Service]
        REPO_IMPL[Repository Implementations]
        SUPA_SVC[Supabase Service]
        REALTIME[Realtime Service]
        RLS[Row Level Security]
        HEALTH[Health Indicators]

        REPO_IMPL --> PRISMA
        REALTIME --> SUPA_SVC
        RLS --> SUPA_SVC
        HEALTH --> PRISMA
    end

    subgraph "Common/Cross-Cutting - src/common/"
        LOG[Logger Service]
        EXC_FILTER[Exception Filters]
        CONST[Constants/Enums]
        UTILS[Utilities]
        MW_COMMON[Middleware]
        INT_COMMON[Interceptors]

        EXC_FILTER --> LOG
        MW_COMMON --> LOG
    end

    subgraph "Configuration - src/config/"
        ENV[Environment Config]
        MOD_CONFIG[Config Modules]

        ENV --> MOD_CONFIG
    end

    CTRL_API --> SVC_CORE
    SVC_CORE --> REPO_IMPL
    CTRL_API --> EXC_FILTER
    SVC_CORE --> LOG
```

## Module Dependencies

```mermaid
graph TD
    APP[AppModule] --> CONFIG[ConfigModule]
    APP --> LOG_MOD[LoggerModule]
    APP --> MW_MOD[MiddlewareModule]
    APP --> HEALTH_MOD[HealthModule]
    APP --> USERS_MOD[UsersModule]
    APP --> PRISMA_MOD[PrismaModule]
    APP --> SUPA_MOD[SupabaseModule]

    USERS_MOD --> PRISMA_MOD
    USERS_MOD --> LOG_MOD

    HEALTH_MOD --> PRISMA_MOD

    SUPA_MOD --> CONFIG
    SUPA_MOD --> LOG_MOD

    PRISMA_MOD --> CONFIG
    PRISMA_MOD --> LOG_MOD
```

## Error Handling Flow

```mermaid
flowchart TD
    ERR[Error Occurs] --> TYPE{Error Type?}

    TYPE -->|Validation Error| VAL_EXC[ValidationException]
    TYPE -->|Not Found| NOT_FOUND[ResourceNotFoundException]
    TYPE -->|Conflict| CONFLICT[ConflictException]
    TYPE -->|Database Error| DB_ERR[Database Error]
    TYPE -->|Business Rule| BUS_EXC[BusinessRuleViolationException]
    TYPE -->|External Service| EXT_EXC[ExternalServiceException]
    TYPE -->|Realtime Error| RT_EXC[RealtimeException]

    DB_ERR --> DB_INT[DatabaseErrorInterceptor]
    DB_INT --> MAP[ExceptionMapperService]

    VAL_EXC --> FILTER[AllExceptionsFilter]
    NOT_FOUND --> FILTER
    CONFLICT --> FILTER
    BUS_EXC --> FILTER
    EXT_EXC --> FILTER
    RT_EXC --> FILTER
    MAP --> FILTER

    FILTER --> LOG_SVC[ErrorLoggerService]
    LOG_SVC --> RESP[Structured Error Response]

    RESP --> |JSON| CLIENT[Client]
```

## Database Architecture

```mermaid
graph TD
    subgraph "Application"
        SVC[Service Layer]
        REPO[Repository Pattern]
    end

    subgraph "Prisma Layer"
        PRISMA[PrismaService]
        TX[Transaction Support]
        RETRY[Retry Logic]
    end

    subgraph "Database"
        PG[(PostgreSQL)]
        SCHEMA[Schema/Migrations]
        RLS_DB[Row Level Security]
    end

    subgraph "Real-time"
        SUPA_RT[Supabase Realtime]
        CHANNELS[Channels]
        SUBS[Subscriptions]
    end

    SVC --> REPO
    REPO --> PRISMA
    PRISMA --> TX
    PRISMA --> RETRY
    TX --> PG
    RETRY --> PG
    PG --> SCHEMA
    PG --> RLS_DB

    SUPA_RT --> PG
    CHANNELS --> SUPA_RT
    SUBS --> CHANNELS
    SVC -.-> SUBS
```

## Logging and Monitoring Architecture

```mermaid
graph LR
    subgraph "Request"
        REQ[Incoming Request]
        CORR[Correlation ID]
    end

    subgraph "Logging Pipeline"
        PINO[Pino Logger]
        REDACT[Sensitive Data Redaction]
        FORMAT[JSON Formatting]
        ROTATE[Log Rotation]
    end

    subgraph "Output"
        CONSOLE[Console/stdout]
        FILE[Log Files]
        MONITOR[Monitoring System]
    end

    REQ --> CORR
    CORR --> PINO
    PINO --> REDACT
    REDACT --> FORMAT
    FORMAT --> CONSOLE
    FORMAT --> FILE
    FORMAT --> MONITOR
    FILE --> ROTATE
```

## Security Architecture

```mermaid
graph TD
    subgraph "Security Layers"
        REQ[Request] --> CORS[CORS Middleware]
        CORS --> HELMET[Helmet Security Headers]
        HELMET --> RATE[Rate Limiting]
        RATE --> SIZE[Request Size Limit]
        SIZE --> TIMEOUT[Request Timeout]
        TIMEOUT --> AUTH[JWT Authentication]
        AUTH --> RBAC[Role-Based Access]
        RBAC --> RLS[Row Level Security]
        RLS --> DATA[Data Access]
    end

    subgraph "Data Protection"
        SENS[Sensitive Data Detection]
        REDACT[Automatic Redaction]
        ENCRYPT[Encryption at Rest]

        DATA --> SENS
        SENS --> REDACT
        DATA --> ENCRYPT
    end
```

## Key Components Explained

### 1. **Middleware Layer**

- **Correlation ID**: Tracks requests across the system
- **Request Size Limit**: Prevents large payload attacks
- **Request Timeout**: Prevents hung requests
- **Logger Middleware**: Logs all requests/responses

### 2. **Controller Layer (API)**

- RESTful endpoints
- Request handling
- Response formatting
- Route definitions

### 3. **Service Layer (Core)**

- Business logic implementation
- Domain rules enforcement
- Transaction orchestration
- External service integration

### 4. **Repository Layer**

- Data access abstraction
- Query building
- Transaction management
- Cache integration

### 5. **Infrastructure Services**

- **Prisma**: Type-safe ORM
- **Supabase**: Real-time subscriptions
- **Redis**: Caching layer
- **Health Checks**: System monitoring

### 6. **Cross-Cutting Concerns**

- **Logger**: Structured JSON logging with Pino
- **Exception Handling**: Centralized error processing
- **Validation**: DTO validation with class-validator
- **Authentication**: JWT-based auth
- **Authorization**: Role-based access control

## Configuration Management

```mermaid
graph TD
    ENV_FILE[.env files] --> ENV_VAL[Environment Validation]
    ENV_VAL --> CONFIG_SVC[ConfigService]
    CONFIG_SVC --> MODULES[Feature Modules]

    subgraph "Environment Types"
        DEV[.env.development]
        TEST[.env.testing]
        PROD[.env.production]
    end

    DEV --> ENV_FILE
    TEST --> ENV_FILE
    PROD --> ENV_FILE
```

## Development Workflow

```mermaid
graph LR
    DEV[Development] --> TEST[Testing]
    TEST --> BUILD[Build]
    BUILD --> DEPLOY[Deploy]

    subgraph "Development"
        HOT[Hot Reload]
        DEBUG[Debug Mode]
        SEED[Database Seeding]
    end

    subgraph "Testing"
        UNIT[Unit Tests]
        INT[Integration Tests]
        E2E[E2E Tests]
    end

    subgraph "Build"
        TS[TypeScript Compile]
        LINT[Linting]
        FORMAT[Formatting]
    end

    subgraph "Deploy"
        DOCKER[Docker Build]
        MIGRATE[Database Migration]
        HEALTH_CHECK[Health Verification]
    end
```

## Performance Considerations

1. **Connection Pooling**: Prisma manages database connections
2. **Caching Strategy**: Redis for frequently accessed data
3. **Request Batching**: Supabase realtime for efficient updates
4. **Lazy Loading**: Modules loaded on demand
5. **Query Optimization**: Indexed database queries

## Scalability Features

1. **Horizontal Scaling**: Stateless architecture
2. **Load Balancing**: Ready for multiple instances
3. **Database Sharding**: Supported via Prisma
4. **Microservices Ready**: Modular design for extraction
5. **Event-Driven**: Real-time capabilities via Supabase

## Monitoring and Observability

1. **Health Endpoints**: `/health` for system status
2. **Structured Logging**: JSON logs for parsing
3. **Correlation IDs**: Request tracing
4. **Performance Metrics**: Ready for APM integration
5. **Error Tracking**: Detailed error context logging
