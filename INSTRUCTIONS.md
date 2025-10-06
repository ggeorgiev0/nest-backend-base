# NEST-BACKEND-BASE INSTRUCTIONS

## Domain-Driven Design (DDD) Backend Development Standards

**Version:** 1.0
**Last Updated:** 2025-10-06
**Status:** AUTHORITATIVE - All development MUST follow these standards

---

## Table of Contents

1. [DDD Architecture Requirements](#1-ddd-architecture-requirements)
2. [TypeScript Standards](#2-typescript-standards)
3. [Security Requirements](#3-security-requirements)
4. [Testing Requirements](#4-testing-requirements)
5. [Database Design & Implementation](#5-database-design--implementation)
6. [API Design Standards](#6-api-design-standards)
7. [Error Handling Architecture](#7-error-handling-architecture)
8. [Code Quality Standards](#8-code-quality-standards)
9. [Compliance Requirements](#9-compliance-requirements)
10. [Performance & Optimization](#10-performance--optimization)
11. [CI/CD & DevOps Requirements](#11-cicd--devops-requirements)
12. [Module Organization](#12-module-organization)
13. [Task Completion Checklist](#13-task-completion-checklist)

---

## 1. DDD Architecture Requirements

### 1.1 Core Principle

**CRITICAL:** Business logic MUST reside in the domain layer. Controllers are ONLY for request/response handling.

### 1.2 Layer Structure

```
src/
├── domain/                     # ⭐ CORE BUSINESS LOGIC (NO DEPENDENCIES)
│   ├── entities/               # Rich domain models with business rules
│   │   ├── user.entity.ts
│   │   └── user.entity.spec.ts
│   ├── value-objects/          # Immutable domain concepts
│   │   ├── email.vo.ts
│   │   ├── password.vo.ts
│   │   └── money.vo.ts
│   ├── aggregates/             # Consistency boundaries
│   │   └── user-aggregate.ts
│   ├── services/               # Domain logic that doesn't fit in entities
│   │   ├── auth-domain.service.ts
│   │   └── pricing-domain.service.ts
│   ├── repositories/           # Repository INTERFACES (not implementations)
│   │   └── user.repository.interface.ts
│   └── events/                 # Domain events
│       └── user-created.event.ts
│
├── application/                # USE CASES & ORCHESTRATION
│   ├── use-cases/              # Application-specific business logic
│   │   ├── create-user/
│   │   │   ├── create-user.use-case.ts
│   │   │   ├── create-user.dto.ts
│   │   │   └── create-user.use-case.spec.ts
│   │   └── authenticate-user/
│   │       ├── authenticate-user.use-case.ts
│   │       └── authenticate-user.dto.ts
│   ├── services/               # Application services
│   │   └── user-application.service.ts
│   └── ports/                  # Interfaces for infrastructure
│       └── email-sender.port.ts
│
├── infrastructure/             # TECHNICAL IMPLEMENTATION
│   ├── persistence/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── repositories/       # Repository IMPLEMENTATIONS
│   │       └── user.repository.impl.ts
│   ├── external/               # Third-party integrations
│   │   ├── email/
│   │   │   └── sendgrid-email.service.ts
│   │   └── cache/
│   │       └── redis-cache.service.ts
│   └── config/                 # Configuration
│       └── database.config.ts
│
└── presentation/               # API INTERFACE
    ├── controllers/            # HTTP endpoints
    │   ├── user.controller.ts
    │   └── auth.controller.ts
    ├── dtos/                   # Request/Response DTOs
    │   ├── create-user-request.dto.ts
    │   └── user-response.dto.ts
    ├── guards/                 # Authentication/Authorization
    │   ├── jwt-auth.guard.ts
    │   └── roles.guard.ts
    ├── decorators/             # Custom decorators
    │   └── current-user.decorator.ts
    └── interceptors/           # Cross-cutting concerns
        └── transform.interceptor.ts
```

### 1.3 Dependency Rules

**CRITICAL:** Dependencies flow INWARD only:

```
Presentation → Application → Domain
Infrastructure → Application → Domain
             ↓
       NO OUTWARD DEPENDENCIES
```

- ✅ **Domain layer**: ZERO external dependencies (no NestJS, no Prisma, no HTTP)
- ✅ **Application layer**: Can depend on Domain
- ✅ **Infrastructure layer**: Can depend on Domain and Application
- ✅ **Presentation layer**: Can depend on Application (NOT Domain directly)

### 1.4 ❌ DON'T: Business Logic in Controllers

```typescript
// ❌ WRONG: Business logic in controller
@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() credentials: { username: string; password: string }) {
    // ❌ NEVER DO THIS - Business logic in controller
    if (credentials.username === 'admin' && credentials.password === 'admin') {
      return 'Login successful';
    }
    throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
  }
}
```

### 1.5 ✅ DO: Proper DDD Architecture

```typescript
// ✅ CORRECT: Controller delegates to use case
// presentation/controllers/auth.controller.ts
@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(private readonly authenticateUserUseCase: AuthenticateUserUseCase) {}

  @Post('login')
  @ApiOperation({ summary: 'Authenticate user and get JWT token' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return await this.authenticateUserUseCase.execute(dto);
  }
}

// application/use-cases/authenticate-user/authenticate-user.use-case.ts
@Injectable()
export class AuthenticateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authDomainService: AuthDomainService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(dto: LoginDto): Promise<LoginResponseDto> {
    // 1. Find user
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Validate credentials (domain service)
    const password = Password.create(dto.password);
    const isValid = this.authDomainService.validateCredentials(user, password);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Generate token
    const token = this.jwtService.sign({
      userId: user.id,
      email: user.email.value,
    });

    return {
      accessToken: token,
      user: UserResponseDto.fromEntity(user),
    };
  }
}

// domain/services/auth-domain.service.ts
@Injectable()
export class AuthDomainService {
  validateCredentials(user: User, password: Password): boolean {
    // ✅ Business logic in domain layer
    return user.password.equals(password);
  }

  canResetPassword(user: User): boolean {
    // ✅ Domain rules in domain service
    return !user.isLocked && user.emailVerified;
  }
}

// domain/entities/user.entity.ts
export class User {
  private constructor(
    public readonly id: string,
    public readonly email: Email,
    private _password: Password,
    public readonly createdAt: Date,
    private _isLocked: boolean = false,
    private _emailVerified: boolean = false,
  ) {}

  // ✅ Business rules encapsulated in entity
  get password(): Password {
    return this._password;
  }

  get isLocked(): boolean {
    return this._isLocked;
  }

  get emailVerified(): boolean {
    return this._emailVerified;
  }

  // ✅ Domain behavior
  lock(): void {
    this._isLocked = true;
  }

  verifyEmail(): void {
    if (this._emailVerified) {
      throw new BusinessRuleViolationException('Email already verified');
    }
    this._emailVerified = true;
  }

  changePassword(newPassword: Password): void {
    if (this._isLocked) {
      throw new BusinessRuleViolationException('Cannot change password for locked user');
    }
    this._password = newPassword;
  }

  // Factory method
  static create(email: Email, password: Password): User {
    return new User(uuid(), email, password, new Date(), false, false);
  }
}

// domain/value-objects/password.vo.ts
export class Password {
  private constructor(private readonly hashedValue: string) {}

  // ✅ Value object encapsulates validation
  static create(plainPassword: string): Password {
    if (!plainPassword || plainPassword.length < 8) {
      throw new ValidationException('Password must be at least 8 characters');
    }
    const hashed = bcrypt.hashSync(plainPassword, 10);
    return new Password(hashed);
  }

  static fromHash(hashedValue: string): Password {
    return new Password(hashedValue);
  }

  equals(other: Password): boolean {
    return bcrypt.compareSync(other.hashedValue, this.hashedValue);
  }
}

// domain/value-objects/email.vo.ts
export class Email {
  private constructor(public readonly value: string) {}

  static create(email: string): Email {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationException('Invalid email format');
    }
    return new Email(email.toLowerCase());
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}

// domain/repositories/user.repository.interface.ts
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}

// infrastructure/persistence/repositories/user.repository.impl.ts
@Injectable()
export class UserRepositoryImpl implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async save(user: User): Promise<User> {
    const data = this.toPersistence(user);
    const record = await this.prisma.user.upsert({
      where: { id: user.id },
      create: data,
      update: data,
    });
    return this.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  private toDomain(record: any): User {
    return User.create(Email.create(record.email), Password.fromHash(record.password));
  }

  private toPersistence(user: User): any {
    return {
      id: user.id,
      email: user.email.value,
      password: user.password['hashedValue'], // Access private property
      createdAt: user.createdAt,
    };
  }
}
```

### 1.6 Repository Pattern Implementation

**CRITICAL:** Repository interfaces MUST be in domain layer, implementations in infrastructure.

```typescript
// ✅ domain/repositories/product.repository.interface.ts
export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findAll(params: FindProductsParams): Promise<Product[]>;
  save(product: Product): Promise<Product>;
  delete(id: string): Promise<void>;
}

// ✅ infrastructure/persistence/repositories/product.repository.impl.ts
@Injectable()
export class ProductRepositoryImpl implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Product | null> {
    // Implementation using Prisma
  }

  // ... other methods
}

// ✅ Module configuration
@Module({
  providers: [
    {
      provide: 'IProductRepository',
      useClass: ProductRepositoryImpl,
    },
  ],
})
export class ProductModule {}

// ✅ Injection in use case
@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
  ) {}
}
```

---

## 2. TypeScript Standards

### 2.1 Strict Mode (NON-NEGOTIABLE)

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### 2.2 NO `any` Types Policy

❌ **NEVER use `any`** unless absolutely necessary (external library types)

```typescript
// ❌ WRONG
function processData(data: any) {
  return data.value;
}

// ✅ CORRECT
function processData(data: { value: string }): string {
  return data.value;
}

// ✅ CORRECT: Use generics
function processData<T extends { value: string }>(data: T): string {
  return data.value;
}

// ⚠️ ACCEPTABLE: External library with no types
import * as legacyLib from 'legacy-library';
const result = legacyLib.someFunction() as unknown as MyType;
```

### 2.3 Explicit Return Types

**REQUIRED:** All functions MUST have explicit return types.

```typescript
// ❌ WRONG: Implicit return type
async function getUser(id: string) {
  return await this.userRepository.findById(id);
}

// ✅ CORRECT: Explicit return type
async function getUser(id: string): Promise<User | null> {
  return await this.userRepository.findById(id);
}
```

### 2.4 Type Safety in Error Handling

```typescript
// ✅ CORRECT: Type-safe error handling
try {
  const user = await this.userRepository.findById(id);
  if (!user) {
    throw new ResourceNotFoundException('User', id);
  }
  return user;
} catch (error) {
  if (error instanceof ResourceNotFoundException) {
    throw error;
  }
  if (error instanceof PrismaClientKnownRequestError) {
    throw new DatabaseException('Database error', error);
  }
  throw new UnexpectedException('Unexpected error', error);
}
```

### 2.5 DTOs Must Use class-validator

```typescript
// ✅ CORRECT: Properly typed and validated DTO
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, maxLength: 100 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;
}
```

---

## 3. Security Requirements

### 3.1 CRITICAL: No Secrets in Git

**NEVER commit:**

- `.env` files
- API keys
- Database passwords
- JWT secrets
- OAuth client secrets

```bash
# .gitignore (REQUIRED)
.env
.env.local
.env.*.local
*.key
*.pem
secrets/
```

```bash
# .env.example (REQUIRED - commit this)
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_secure_password_here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-it-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-it-in-production
JWT_REFRESH_EXPIRES_IN=7d

# External Services
REDIS_URL=redis://localhost:6379
EMAIL_API_KEY=your_email_service_api_key_here
```

### 3.2 JWT Authentication Implementation

```typescript
// ✅ infrastructure/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { userId: string; email: string }): Promise<User> {
    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}

// ✅ presentation/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }
}

// ✅ Usage in controller
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  @Get('me')
  async getCurrentUser(@CurrentUser() user: User): Promise<UserResponseDto> {
    return UserResponseDto.fromEntity(user);
  }
}
```

### 3.3 Password Hashing with bcrypt

```typescript
// ✅ domain/value-objects/password.vo.ts
import * as bcrypt from 'bcrypt';

export class Password {
  private static readonly SALT_ROUNDS = 10;

  private constructor(private readonly hashedValue: string) {}

  static async create(plainPassword: string): Promise<Password> {
    if (!plainPassword || plainPassword.length < 8) {
      throw new ValidationException('Password must be at least 8 characters long');
    }

    // Additional validation rules
    if (!/[A-Z]/.test(plainPassword)) {
      throw new ValidationException('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(plainPassword)) {
      throw new ValidationException('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(plainPassword)) {
      throw new ValidationException('Password must contain at least one number');
    }

    const hashed = await bcrypt.hash(plainPassword, Password.SALT_ROUNDS);
    return new Password(hashed);
  }

  static fromHash(hashedValue: string): Password {
    return new Password(hashedValue);
  }

  async equals(plainPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, this.hashedValue);
  }

  getHash(): string {
    return this.hashedValue;
  }
}
```

### 3.4 RBAC Implementation

```typescript
// ✅ domain/value-objects/role.vo.ts
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  MODERATOR = 'MODERATOR',
}

export class Role {
  private constructor(public readonly value: UserRole) {}

  static create(role: string): Role {
    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new ValidationException('Invalid role');
    }
    return new Role(role as UserRole);
  }

  isAdmin(): boolean {
    return this.value === UserRole.ADMIN;
  }

  canModerate(): boolean {
    return this.value === UserRole.ADMIN || this.value === UserRole.MODERATOR;
  }
}

// ✅ presentation/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@/domain/value-objects/role.vo';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// ✅ presentation/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@/domain/value-objects/role.vo';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role.value === role);
  }
}

// ✅ Usage
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  @Get('users')
  async getAllUsers(): Promise<UserResponseDto[]> {
    // Only admins can access this
  }
}
```

### 3.5 Rate Limiting Configuration

```bash
# Install @nestjs/throttler
yarn add @nestjs/throttler
```

```typescript
// ✅ app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3, // 3 requests
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

// ✅ Override rate limit for specific endpoint
@Controller('auth')
export class AuthController {
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return await this.authenticateUserUseCase.execute(dto);
  }
}
```

### 3.6 Input Sanitization Beyond Validation

```typescript
// ✅ common/utils/sanitization.utils.ts
import * as DOMPurify from 'isomorphic-dompurify';

export class SanitizationUtils {
  static sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
      ALLOWED_ATTR: ['href'],
    });
  }

  static sanitizeString(input: string): string {
    // Remove potential XSS vectors
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .trim();
  }

  static sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
}

// ✅ Usage in DTO transformation
export class CreatePostDto {
  @IsString()
  @Transform(({ value }) => SanitizationUtils.sanitizeString(value))
  title: string;

  @IsString()
  @Transform(({ value }) => SanitizationUtils.sanitizeHtml(value))
  content: string;
}
```

---

## 4. Testing Requirements

### 4.1 Minimum Coverage: 85% (NON-NEGOTIABLE)

```json
// package.json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 85,
        "functions": 85,
        "lines": 85,
        "statements": 85
      }
    }
  }
}
```

### 4.2 What Must Be Tested

**CRITICAL (100% coverage required):**

- Exception filters
- Authentication guards
- Authorization guards
- Validation pipes
- Domain entities
- Value objects
- Domain services

**HIGH PRIORITY (90%+ coverage):**

- Use cases
- Repository implementations
- Controllers

**MEDIUM PRIORITY (80%+ coverage):**

- DTOs
- Utilities
- Mappers

### 4.3 Unit Test Example: Domain Entity

```typescript
// domain/entities/user.entity.spec.ts
describe('User Entity', () => {
  describe('create', () => {
    it('should create a valid user', () => {
      const email = Email.create('test@example.com');
      const password = Password.fromHash('hashed_password');

      const user = User.create(email, password);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.isLocked).toBe(false);
      expect(user.emailVerified).toBe(false);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', () => {
      const user = User.create(Email.create('test@example.com'), Password.fromHash('hash'));

      user.verifyEmail();

      expect(user.emailVerified).toBe(true);
    });

    it('should throw error if email already verified', () => {
      const user = User.create(Email.create('test@example.com'), Password.fromHash('hash'));
      user.verifyEmail();

      expect(() => user.verifyEmail()).toThrow(BusinessRuleViolationException);
    });
  });

  describe('changePassword', () => {
    it('should change password if user not locked', () => {
      const user = User.create(Email.create('test@example.com'), Password.fromHash('old_hash'));
      const newPassword = Password.fromHash('new_hash');

      user.changePassword(newPassword);

      expect(user.password).toBe(newPassword);
    });

    it('should throw error if user is locked', () => {
      const user = User.create(Email.create('test@example.com'), Password.fromHash('hash'));
      user.lock();

      expect(() => user.changePassword(Password.fromHash('new'))).toThrow(
        BusinessRuleViolationException,
      );
    });
  });
});
```

### 4.4 Integration Test Example: Repository

```typescript
// infrastructure/persistence/repositories/user.repository.impl.spec.ts
describe('UserRepositoryImpl (Integration)', () => {
  let repository: UserRepositoryImpl;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserRepositoryImpl, PrismaService],
    }).compile();

    repository = module.get<UserRepositoryImpl>(UserRepositoryImpl);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  describe('save', () => {
    it('should persist user to database', async () => {
      const user = User.create(
        Email.create('test@example.com'),
        await Password.create('Password123'),
      );

      const saved = await repository.save(user);

      expect(saved.id).toBeDefined();
      expect(saved.email.value).toBe('test@example.com');

      // Verify in database
      const record = await prisma.user.findUnique({
        where: { id: saved.id },
      });
      expect(record).toBeDefined();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const user = User.create(
        Email.create('test@example.com'),
        await Password.create('Password123'),
      );
      await repository.save(user);

      const found = await repository.findByEmail('test@example.com');

      expect(found).toBeDefined();
      expect(found?.email.value).toBe('test@example.com');
    });

    it('should return null if user not found', async () => {
      const found = await repository.findByEmail('notfound@example.com');

      expect(found).toBeNull();
    });
  });
});
```

### 4.5 E2E Test Example: API Endpoint

```typescript
// test/auth.e2e-spec.ts
describe('Auth API (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Password123',
          name: 'New User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.user.email).toBe('newuser@example.com');
        });
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should return 409 for duplicate email', async () => {
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'duplicate@example.com',
        password: 'Password123',
        name: 'User 1',
      });

      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123',
          name: 'User 2',
        })
        .expect(409);
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'logintest@example.com',
        password: 'Password123',
        name: 'Login Test',
      });
    });

    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'Password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
        });
    });

    it('should return 401 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'WrongPassword',
        })
        .expect(401);
    });
  });
});
```

### 4.6 Mocking Strategies

```typescript
// ✅ CORRECT: Mock repository in use case test
describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new CreateUserUseCase(mockUserRepository);
  });

  it('should create user successfully', async () => {
    const dto = {
      email: 'test@example.com',
      password: 'Password123',
      name: 'Test User',
    };

    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.save.mockResolvedValue(
      User.create(Email.create(dto.email), await Password.create(dto.password)),
    );

    const result = await useCase.execute(dto);

    expect(result).toBeDefined();
    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(dto.email);
    expect(mockUserRepository.save).toHaveBeenCalled();
  });

  it('should throw ConflictException if email already exists', async () => {
    const dto = {
      email: 'existing@example.com',
      password: 'Password123',
      name: 'Test User',
    };

    mockUserRepository.findByEmail.mockResolvedValue(
      User.create(Email.create(dto.email), await Password.create('OldPassword123')),
    );

    await expect(useCase.execute(dto)).rejects.toThrow(ConflictException);
  });
});
```

---

## 5. Database Design & Implementation

### 5.1 Prisma Schema Requirements

```prisma
// infrastructure/persistence/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ✅ CORRECT: Proper indexes, constraints, relations
model User {
  id            String    @id @default(uuid())
  email         String    @unique @db.VarChar(255)
  password      String    @db.VarChar(255)
  name          String    @db.VarChar(255)
  role          Role      @default(USER)
  isLocked      Boolean   @default(false) @map("is_locked")
  emailVerified Boolean   @default(false) @map("email_verified")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")

  // Relations
  posts         Post[]
  comments      Comment[]

  // Indexes
  @@index([email])
  @@index([createdAt])
  @@map("users")
}

model Post {
  id        String    @id @default(uuid())
  title     String    @db.VarChar(500)
  content   String    @db.Text
  published Boolean   @default(false)
  authorId  String    @map("author_id")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  // Relations
  author    User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  comments  Comment[]

  // Indexes
  @@index([authorId])
  @@index([published, createdAt])
  @@map("posts")
}

enum Role {
  ADMIN
  USER
  MODERATOR
}
```

### 5.2 Migration Strategy

**CRITICAL RULES:**

1. NEVER edit existing migrations
2. ALWAYS create new migrations for changes
3. ALWAYS review migrations before applying
4. ALWAYS backup database before production migrations

```bash
# Create new migration
npx prisma migrate dev --name add_user_role

# Apply migrations in production
npx prisma migrate deploy

# Reset database (DEVELOPMENT ONLY)
npx prisma migrate reset
```

### 5.3 Connection Pooling Configuration

```typescript
// infrastructure/persistence/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('DATABASE_URL'),
        },
      },
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}
```

### 5.4 Transaction Handling

```typescript
// ✅ CORRECT: Transaction in use case
@Injectable()
export class CreateOrderUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('IOrderRepository')
    private readonly orderRepository: IOrderRepository,
    @Inject('IInventoryRepository')
    private readonly inventoryRepository: IInventoryRepository,
  ) {}

  async execute(dto: CreateOrderDto): Promise<OrderResponseDto> {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Create order
      const order = Order.create(dto.customerId, dto.items);
      const savedOrder = await this.orderRepository.save(order, tx);

      // 2. Update inventory
      for (const item of dto.items) {
        await this.inventoryRepository.decreaseStock(item.productId, item.quantity, tx);
      }

      // 3. Send notification (outside transaction)
      await this.notificationService.sendOrderConfirmation(savedOrder);

      return OrderResponseDto.fromEntity(savedOrder);
    });
  }
}
```

### 5.5 Indexes and Constraints

**REQUIRED indexes:**

- Primary keys (automatic)
- Foreign keys (add manually)
- Fields used in WHERE clauses
- Fields used in ORDER BY
- Unique constraints for business rules

```prisma
// ✅ CORRECT: Proper indexing strategy
model Product {
  id          String   @id @default(uuid())
  sku         String   @unique @db.VarChar(50)  // Unique constraint
  name        String   @db.VarChar(255)
  categoryId  String   @map("category_id")
  price       Decimal  @db.Decimal(10, 2)
  stock       Int      @default(0)
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")

  category    Category @relation(fields: [categoryId], references: [id])

  // Composite index for common queries
  @@index([categoryId, isActive, createdAt])
  // Single index for SKU lookups (already covered by @unique)
  @@index([isActive, stock]) // Low stock queries
  @@map("products")
}
```

---

## 6. API Design Standards

### 6.1 Swagger/OpenAPI Documentation

**REQUIRED:** All endpoints MUST be documented with Swagger.

```bash
# Install dependencies
yarn add @nestjs/swagger
```

```typescript
// ✅ main.ts: Swagger setup
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Your API')
    .setDescription('API description')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(3000);
}

// ✅ Controller with full Swagger documentation
@Controller('users')
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UserController {
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    return await this.getUserUseCase.execute(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
  })
  async createUser(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return await this.createUserUseCase.execute(dto);
  }
}
```

### 6.2 Proper HTTP Status Codes

```typescript
// ✅ CORRECT: Use appropriate status codes
@Post()
@HttpCode(HttpStatus.CREATED) // 201
async create(@Body() dto: CreateDto): Promise<ResponseDto> {
  return await this.useCase.execute(dto);
}

@Put(':id')
@HttpCode(HttpStatus.OK) // 200
async update(@Param('id') id: string, @Body() dto: UpdateDto): Promise<ResponseDto> {
  return await this.useCase.execute(id, dto);
}

@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT) // 204
async delete(@Param('id') id: string): Promise<void> {
  await this.useCase.execute(id);
}

// Exception codes
throw new BadRequestException('Invalid input'); // 400
throw new UnauthorizedException('Invalid credentials'); // 401
throw new ForbiddenException('Access denied'); // 403
throw new NotFoundException('Resource not found'); // 404
throw new ConflictException('Email already exists'); // 409
throw new UnprocessableEntityException('Business rule violation'); // 422
throw new InternalServerErrorException('Server error'); // 500
```

### 6.3 API Versioning Strategy

```typescript
// ✅ app.module.ts
@Module({
  imports: [
    RouterModule.register([
      {
        path: 'v1',
        children: [
          { path: 'users', module: UsersModule },
          { path: 'auth', module: AuthModule },
        ],
      },
      {
        path: 'v2',
        children: [{ path: 'users', module: UsersV2Module }],
      },
    ]),
  ],
})
export class AppModule {}

// OR use URI versioning
@Controller({
  path: 'users',
  version: '1',
})
export class UsersV1Controller {}

@Controller({
  path: 'users',
  version: '2',
})
export class UsersV2Controller {}

// main.ts
app.enableVersioning({
  type: VersioningType.URI,
});
```

### 6.4 Pagination Pattern

```typescript
// ✅ CORRECT: Standardized pagination
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiProperty({ default: 1, minimum: 1 })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @ApiProperty({ default: 10, minimum: 1, maximum: 100 })
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  sortBy?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  @ApiProperty({ enum: ['ASC', 'DESC'], required: false, default: 'DESC' })
  order?: 'ASC' | 'DESC' = 'DESC';
}

export class PaginatedResponseDto<T> {
  @ApiProperty()
  data: T[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  static create<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponseDto<T> {
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

// Usage
@Get()
@ApiResponse({ status: 200, type: PaginatedResponseDto })
async getUsers(
  @Query() pagination: PaginationDto,
): Promise<PaginatedResponseDto<UserResponseDto>> {
  return await this.getUsersUseCase.execute(pagination);
}
```

### 6.5 Response Standardization

```typescript
// ✅ common/dtos/api-response.dto.ts
export class ApiResponse<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data?: T;

  @ApiProperty()
  error?: {
    code: string;
    message: string;
    details?: any;
  };

  @ApiProperty()
  timestamp: string;

  static success<T>(data: T): ApiResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static error(code: string, message: string, details?: any): ApiResponse<any> {
    return {
      success: false,
      error: { code, message, details },
      timestamp: new Date().toISOString(),
    };
  }
}
```

---

## 7. Error Handling Architecture

### 7.1 Exception Filter Hierarchy

```typescript
// ✅ common/exceptions/base.exception.ts
export abstract class BaseException extends Error {
  constructor(
    public readonly message: string,
    public readonly code: ErrorCode,
    public readonly statusCode: HttpStatus,
    public readonly details?: any,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ✅ common/exceptions/error-code.enum.ts
export enum ErrorCode {
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Authentication/Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Business Rules
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // Infrastructure
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Generic
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

// ✅ Custom exception classes
export class ValidationException extends BaseException {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, details);
  }
}

export class BusinessRuleViolationException extends BaseException {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.BUSINESS_RULE_VIOLATION, HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
}

export class ResourceNotFoundException extends BaseException {
  constructor(resourceName: string, identifier: string) {
    super(
      `${resourceName} with identifier ${identifier} not found`,
      ErrorCode.RESOURCE_NOT_FOUND,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class UnauthorizedException extends BaseException {
  constructor(message: string = 'Unauthorized') {
    super(message, ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenException extends BaseException {
  constructor(message: string = 'Forbidden') {
    super(message, ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN);
  }
}
```

### 7.2 All Exceptions Filter

```typescript
// ✅ common/exceptions/all-exceptions.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { BaseException } from './base.exception';
import { ErrorCode } from './error-code.enum';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: CustomLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = ErrorCode.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = undefined;

    if (exception instanceof BaseException) {
      status = exception.statusCode;
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message;
      code = this.mapHttpStatusToErrorCode(status);
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log error
    this.logger.error(
      {
        correlationId: request.correlationId,
        method: request.method,
        url: request.url,
        statusCode: status,
        errorCode: code,
        message,
        details,
        stack: exception instanceof Error ? exception.stack : undefined,
      },
      'Exception caught',
    );

    // Send response
    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        ...(process.env.NODE_ENV === 'development' && details ? { details } : {}),
      },
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: request.correlationId,
    });
  }

  private mapHttpStatusToErrorCode(status: HttpStatus): ErrorCode {
    const mapping: Record<number, ErrorCode> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_ERROR,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
      [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorCode.RESOURCE_NOT_FOUND,
      [HttpStatus.CONFLICT]: ErrorCode.DUPLICATE_RESOURCE,
      [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.BUSINESS_RULE_VIOLATION,
    };

    return mapping[status] || ErrorCode.INTERNAL_SERVER_ERROR;
  }
}
```

### 7.3 Correlation ID Tracking

```typescript
// ✅ common/middleware/correlation-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId = (req.headers['x-correlation-id'] as string) || uuid();
    req['correlationId'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  }
}

// app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
```

---

## 8. Code Quality Standards

### 8.1 ESLint Compliance (MANDATORY)

**ZERO ESLint errors allowed.** Build must fail if linting fails.

```json
// package.json
{
  "scripts": {
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --max-warnings 0",
    "lint:fix": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"
  }
}
```

### 8.2 Cognitive Complexity Limit: 15

```typescript
// ❌ WRONG: Cognitive complexity too high
function processOrder(order: Order): void {
  if (order.items.length > 0) {
    for (const item of order.items) {
      if (item.quantity > 0) {
        if (item.price > 0) {
          if (item.inStock) {
            // ... more nested logic
          } else {
            // ... handle out of stock
          }
        } else {
          // ... handle invalid price
        }
      } else {
        // ... handle invalid quantity
      }
    }
  }
}

// ✅ CORRECT: Extract methods, reduce complexity
function processOrder(order: Order): void {
  this.validateOrderHasItems(order);

  for (const item of order.items) {
    this.processOrderItem(item);
  }
}

private validateOrderHasItems(order: Order): void {
  if (order.items.length === 0) {
    throw new ValidationException('Order must have at least one item');
  }
}

private processOrderItem(item: OrderItem): void {
  this.validateOrderItem(item);

  if (!item.inStock) {
    this.handleOutOfStock(item);
    return;
  }

  this.addItemToOrder(item);
}

private validateOrderItem(item: OrderItem): void {
  if (item.quantity <= 0) {
    throw new ValidationException('Item quantity must be positive');
  }
  if (item.price <= 0) {
    throw new ValidationException('Item price must be positive');
  }
}
```

### 8.3 No Magic Values

```typescript
// ❌ WRONG: Magic numbers and strings
if (user.age >= 18) {
  // ...
}

if (status === 'pending') {
  // ...
}

// ✅ CORRECT: Named constants
const MINIMUM_AGE = 18;
const OrderStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
} as const;

if (user.age >= MINIMUM_AGE) {
  // ...
}

if (status === OrderStatus.PENDING) {
  // ...
}
```

### 8.4 Proper Module Organization

```typescript
// ✅ CORRECT: Feature module
@Module({
  imports: [DatabaseModule, LoggerModule],
  controllers: [UserController],
  providers: [
    // Use cases
    CreateUserUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,

    // Domain services
    AuthDomainService,

    // Repositories
    {
      provide: 'IUserRepository',
      useClass: UserRepositoryImpl,
    },
  ],
  exports: ['IUserRepository'],
})
export class UserModule {}
```

### 8.5 No Circular Dependencies

```typescript
// ❌ WRONG: Circular dependency
// user.service.ts
import { OrderService } from './order.service';

@Injectable()
export class UserService {
  constructor(private orderService: OrderService) {}
}

// order.service.ts
import { UserService } from './user.service';

@Injectable()
export class OrderService {
  constructor(private userService: UserService) {}
}

// ✅ CORRECT: Extract shared logic to new service
// user.service.ts
@Injectable()
export class UserService {
  constructor(private sharedService: SharedService) {}
}

// order.service.ts
@Injectable()
export class OrderService {
  constructor(private sharedService: SharedService) {}
}

// shared.service.ts
@Injectable()
export class SharedService {
  // Shared logic here
}
```

---

## 9. Compliance Requirements

### 9.1 GDPR Compliance (MANDATORY for EU users)

```typescript
// ✅ Data deletion endpoint (Right to be forgotten)
@Controller('users')
export class UserController {
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete user account (GDPR)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@CurrentUser() user: User): Promise<void> {
    await this.deleteUserUseCase.execute(user.id);
  }
}

// ✅ Data export endpoint (Data portability)
@Get('me/export')
@UseGuards(JwtAuthGuard)
@ApiOperation({ summary: 'Export user data (GDPR)' })
async exportUserData(@CurrentUser() user: User): Promise<UserDataExportDto> {
  return await this.exportUserDataUseCase.execute(user.id);
}

// ✅ Consent tracking
model UserConsent {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  consentType String   @map("consent_type") // 'marketing', 'analytics', etc.
  granted     Boolean
  grantedAt   DateTime @map("granted_at")
  revokedAt   DateTime? @map("revoked_at")
  ipAddress   String   @map("ip_address")

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, consentType])
  @@map("user_consents")
}
```

### 9.2 PII Handling and Encryption

```typescript
// ✅ Encrypt PII at rest
import * as crypto from 'crypto';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.get<string>('ENCRYPTION_KEY');
    this.key = crypto.scryptSync(secret, 'salt', 32);
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encrypted: string): string {
    const [ivHex, authTagHex, encryptedHex] = encrypted.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// Usage in entity
export class User {
  // ... other fields

  private _ssn: string; // Encrypted in database

  get ssn(): string {
    return this.encryptionService.decrypt(this._ssn);
  }

  set ssn(value: string) {
    this._ssn = this.encryptionService.encrypt(value);
  }
}
```

### 9.3 Audit Logging

```typescript
// ✅ Audit log model
model AuditLog {
  id          String   @id @default(uuid())
  userId      String?  @map("user_id")
  action      String   @db.VarChar(100)
  resourceType String  @map("resource_type") @db.VarChar(100)
  resourceId  String?  @map("resource_id")
  oldValue    Json?    @map("old_value")
  newValue    Json?    @map("new_value")
  ipAddress   String   @map("ip_address")
  userAgent   String   @map("user_agent")
  timestamp   DateTime @default(now())

  user        User?    @relation(fields: [userId], references: [id])

  @@index([userId, timestamp])
  @@index([resourceType, resourceId])
  @@map("audit_logs")
}

// ✅ Audit logging service
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    userId: string | null,
    action: string,
    resourceType: string,
    resourceId: string | null,
    oldValue: any,
    newValue: any,
    request: Request,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        oldValue,
        newValue,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || 'unknown',
      },
    });
  }
}

// ✅ Usage in use case
async execute(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
  const oldUser = await this.userRepository.findById(id);
  const updatedUser = await this.userRepository.update(id, dto);

  await this.auditLogService.log(
    id,
    'UPDATE_USER',
    'User',
    id,
    oldUser,
    updatedUser,
    this.request,
  );

  return UserResponseDto.fromEntity(updatedUser);
}
```

### 9.4 Data Retention Policies

```typescript
// ✅ Soft delete with retention policy
model User {
  id        String    @id @default(uuid())
  email     String    @unique
  deletedAt DateTime? @map("deleted_at")

  @@map("users")
}

// ✅ Scheduled job to purge old soft-deleted records
@Injectable()
export class DataRetentionService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 2 * * *') // Run at 2 AM daily
  async purgeDeletedUsers(): Promise<void> {
    const retentionDays = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.user.deleteMany({
      where: {
        deletedAt: {
          lte: cutoffDate,
        },
      },
    });

    console.log(`Purged ${result.count} users deleted before ${cutoffDate}`);
  }
}
```

---

## 10. Performance & Optimization

### 10.1 Database Query Optimization

```typescript
// ❌ WRONG: N+1 query problem
async getPostsWithAuthors(): Promise<Post[]> {
  const posts = await this.prisma.post.findMany();

  for (const post of posts) {
    post.author = await this.prisma.user.findUnique({
      where: { id: post.authorId },
    });
  }

  return posts;
}

// ✅ CORRECT: Use include to eager load
async getPostsWithAuthors(): Promise<Post[]> {
  return await this.prisma.post.findMany({
    include: {
      author: true,
    },
  });
}

// ✅ CORRECT: Select only needed fields
async getPostTitles(): Promise<{ id: string; title: string }[]> {
  return await this.prisma.post.findMany({
    select: {
      id: true,
      title: true,
    },
  });
}
```

### 10.2 Caching Strategy (Redis)

```bash
# Install Redis dependencies
yarn add @nestjs/cache-manager cache-manager
yarn add cache-manager-redis-store
yarn add -D @types/cache-manager-redis-store
```

```typescript
// ✅ app.module.ts: Redis cache configuration
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      ttl: 60, // Default TTL in seconds
    }),
  ],
})
export class AppModule {}

// ✅ Usage in service
@Injectable()
export class UserService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly userRepository: IUserRepository,
  ) {}

  async getUserById(id: string): Promise<User> {
    const cacheKey = `user:${id}`;

    // Try cache first
    const cached = await this.cacheManager.get<User>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new ResourceNotFoundException('User', id);
    }

    // Store in cache
    await this.cacheManager.set(cacheKey, user, 300); // 5 minutes

    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.update(id, dto);

    // Invalidate cache
    await this.cacheManager.del(`user:${id}`);

    return user;
  }
}
```

### 10.3 Connection Pooling

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/db?schema=public&connection_limit=20&pool_timeout=20"
```

### 10.4 Graceful Shutdown

```typescript
// ✅ main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Handle shutdown signals
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing server gracefully');
    await app.close();
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, closing server gracefully');
    await app.close();
  });

  await app.listen(3000);
}
```

---

## 11. CI/CD & DevOps Requirements

### 11.1 Docker Configuration

```dockerfile
# ✅ Dockerfile (multi-stage build)
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build
RUN yarn install --production --frozen-lockfile

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000

CMD ["node", "dist/main"]
```

```yaml
# ✅ docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/mydb
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=mydb
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 11.2 Health Check Endpoints

```typescript
// ✅ health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@Controller('health')
@ApiTags('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check application health' })
  check() {
    return this.health.check([
      () => this.prisma.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }),
    ]);
  }

  @Get('readiness')
  @HealthCheck()
  @ApiOperation({ summary: 'Check if app is ready to receive traffic' })
  readiness() {
    return this.health.check([() => this.prisma.pingCheck('database')]);
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Check if app is alive' })
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

### 11.3 GitHub Actions CI/CD Pipeline

```yaml
# ✅ .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Run ESLint
        run: yarn lint

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Type check
        run: yarn tsc --noEmit

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db

      - name: Run unit tests
        run: yarn test:cov
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db

      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 85" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 85% threshold"
            exit 1
          fi

      - name: Run E2E tests
        run: yarn test:e2e
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db

  build:
    runs-on: ubuntu-latest
    needs: [lint, type-check, test]
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Build
        run: yarn build

      - name: Upload build artifact
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  docker:
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to DockerHub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            yourusername/app:latest
            yourusername/app:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### 11.4 Environment Separation

```bash
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://dev:dev@localhost:5432/dev_db
JWT_SECRET=dev-secret-change-in-production
LOG_LEVEL=debug

# .env.staging
NODE_ENV=staging
DATABASE_URL=${STAGING_DATABASE_URL}
JWT_SECRET=${STAGING_JWT_SECRET}
LOG_LEVEL=info

# .env.production
NODE_ENV=production
DATABASE_URL=${PROD_DATABASE_URL}
JWT_SECRET=${PROD_JWT_SECRET}
LOG_LEVEL=warn
```

### 11.5 Secrets Management

**NEVER store secrets in .env files in production.**

Use one of:

- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Azure Key Vault**
- **Google Secret Manager**
- **Kubernetes Secrets**

```typescript
// ✅ Example: AWS Secrets Manager integration
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

@Injectable()
export class SecretsService {
  private client: SecretsManagerClient;

  constructor() {
    this.client = new SecretsManagerClient({ region: 'us-east-1' });
  }

  async getSecret(secretName: string): Promise<string> {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await this.client.send(command);
    return response.SecretString || '';
  }
}
```

---

## 12. Module Organization

### 12.1 Feature Modules

```typescript
// ✅ user/user.module.ts
@Module({
  imports: [DatabaseModule, LoggerModule, CacheModule],
  controllers: [UserController],
  providers: [
    // Use cases
    CreateUserUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,

    // Domain services
    UserDomainService,

    // Repositories
    {
      provide: 'IUserRepository',
      useClass: UserRepositoryImpl,
    },
  ],
  exports: ['IUserRepository', UserDomainService],
})
export class UserModule {}
```

### 12.2 Shared Modules

```typescript
// ✅ shared/shared.module.ts
@Global()
@Module({
  providers: [DateTimeService, ValidationService, EncryptionService],
  exports: [DateTimeService, ValidationService, EncryptionService],
})
export class SharedModule {}
```

### 12.3 Core Modules

```typescript
// ✅ core/core.module.ts
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    LoggerModule,
    DatabaseModule,
  ],
  exports: [ConfigModule, LoggerModule, DatabaseModule],
})
export class CoreModule {}
```

---

## 13. Task Completion Checklist

### Before marking ANY task complete, verify:

#### Compilation & Build

- [ ] `yarn tsc` passes with ZERO errors
- [ ] `yarn build` succeeds
- [ ] No TypeScript compilation warnings

#### Code Quality

- [ ] `yarn lint` passes with ZERO errors and ZERO warnings
- [ ] No `any` types (except documented exceptions)
- [ ] All functions have explicit return types
- [ ] No magic values (all constants named)
- [ ] Cognitive complexity ≤15 for all functions
- [ ] No circular dependencies

#### Architecture

- [ ] Business logic is in domain layer (NOT controllers)
- [ ] Repository pattern followed (interface in domain, impl in infrastructure)
- [ ] Dependency injection used correctly
- [ ] Proper layer separation (domain → application → infrastructure → presentation)
- [ ] No infrastructure leaking into domain

#### Testing

- [ ] `yarn test` passes with ZERO failing tests
- [ ] Test coverage ≥85% (backend)
- [ ] Domain entities have unit tests
- [ ] Use cases have unit tests
- [ ] Controllers have integration tests
- [ ] Critical paths have E2E tests
- [ ] Exception filters are tested
- [ ] Guards are tested

#### Security

- [ ] NO secrets in code
- [ ] NO hardcoded credentials
- [ ] Passwords hashed with bcrypt
- [ ] JWT authentication implemented correctly
- [ ] Authorization guards in place
- [ ] Input validation using class-validator
- [ ] Input sanitization beyond validation
- [ ] Rate limiting configured

#### Database

- [ ] Prisma schema is valid
- [ ] Migrations created (never edited existing ones)
- [ ] Proper indexes on foreign keys and query fields
- [ ] Constraints defined (unique, foreign key, etc.)
- [ ] Repository implementation complete
- [ ] Connection pooling configured

#### API Design

- [ ] Swagger/OpenAPI documentation complete
- [ ] All endpoints documented with @ApiOperation
- [ ] DTOs have @ApiProperty decorators
- [ ] Proper HTTP status codes used
- [ ] Pagination implemented for lists
- [ ] Response standardization followed

#### Compliance

- [ ] GDPR requirements met (if applicable)
- [ ] Audit logging for sensitive operations
- [ ] PII encrypted (if applicable)
- [ ] Data retention policy implemented

#### DevOps

- [ ] Dockerfile exists and builds
- [ ] docker-compose.yml works
- [ ] Health check endpoints (/health, /readiness, /liveness)
- [ ] Environment variables in .env.example (NOT .env)
- [ ] CI/CD pipeline passes

#### Documentation

- [ ] Code is self-documenting (clear names)
- [ ] Complex logic has comments
- [ ] Public APIs have JSDoc
- [ ] README updated if needed

---

## Final Notes

**These standards are NON-NEGOTIABLE.** Every developer working on this project MUST follow these guidelines. Any code that violates these standards will be REJECTED in code review.

**Remember:**

- Business logic belongs in the DOMAIN layer
- Controllers are THIN - they delegate to use cases
- Test EVERYTHING - 85% minimum coverage
- Security is NOT optional
- Secrets NEVER go in git

**When in doubt:**

1. Check this document
2. Look at existing compliant code examples
3. Ask for clarification

**Good luck, and write clean, maintainable, production-grade code!**

---

**Document Version:** 1.0
**Last Updated:** 2025-10-06
**Maintained By:** Backend Team Lead
