## Description

Configure database integration with Supabase PostgreSQL and Prisma ORM to provide robust data access, migrations, and entity management with real-time capabilities.

## Tasks

- [ ] Set up Supabase project and obtain API credentials
- [ ] Configure environment variables for Supabase connection
- [ ] Integrate Prisma ORM with Supabase PostgreSQL
- [ ] Set up database schema management and migrations with Prisma
- [ ] Configure row-level security (RLS) policies in Supabase
- [ ] Create database module in NestJS for Supabase/Prisma integration
- [ ] Implement real-time data subscriptions using Supabase
- [ ] Configure Supabase database extensions if needed
- [ ] Add database health check endpoints
- [ ] Set up error handling for database operations
- [ ] Configure logging for database queries
- [ ] Set up database backup and restoration processes
- [ ] Create seed scripts for initial data
- [ ] Set up a local development environment with Supabase CLI
- [ ] Optimize query performance for Supabase PostgreSQL

## Acceptance Criteria

- Supabase PostgreSQL connection is properly configured with environment variables
- Prisma ORM is correctly integrated with Supabase and provides type-safe queries
- Database schema can be managed and migrated using Prisma migrations
- Row-level security (RLS) policies correctly control data access based on user roles
- Real-time data subscriptions work as expected for relevant tables
- Database module provides a clean abstraction of database operations
- Database errors are properly handled and logged
- Database health check provides meaningful status information
- Database backup and restoration processes are documented and tested
- Seed scripts provide necessary initial data for development and testing
- Local development environment matches production Supabase configuration
- Connection can be tested with simple CRUD operations
- Query performance is optimized for production use

## Priority

High

## Plan of Action

### 1. Set up Supabase Project

1. **Create a Supabase Project**:

   - Sign up for a Supabase account at https://supabase.com
   - Create a new project in the Supabase dashboard
   - Note down the API URL and API keys (anon key and service role key)

2. **Set up Local Development Environment**:
   - Install Supabase CLI: `npm install -g supabase`
   - Initialize Supabase locally: `supabase init`
   - Start Supabase services: `supabase start`
   - Access local Supabase Studio at: http://localhost:54323

### 2. Integrate Prisma ORM with Supabase

1. **Install Prisma Dependencies**:

   ```bash
   npm install @prisma/client
   npm install prisma --save-dev
   ```

2. **Initialize Prisma**:

   ```bash
   npx prisma init
   ```

3. **Configure Prisma for Supabase**:

   - Update `.env` file with Supabase connection string:

   ```
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
   ```

   - Update `schema.prisma` to use Supabase PostgreSQL:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }

   generator client {
     provider = "prisma-client-js"
   }
   ```

4. **Update Environment Variables Configuration**:
   - Add Supabase credentials to `.env.example` and `.env.development`:
   ```
   # Supabase
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   DATABASE_URL=your-database-connection-string
   ```

### 3. Set up Database Schema and Models

1. **Define Database Schema in Prisma**:

   - Create models in `schema.prisma` file based on your application requirements
   - Example model:

   ```prisma
   model User {
     id        String   @id @default(uuid())
     email     String   @unique
     name      String?
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   }
   ```

2. **Generate Prisma Client**:

   ```bash
   npx prisma generate
   ```

3. **Create Initial Migration**:
   ```bash
   npx prisma migrate dev --name init
   ```

### 4. Create NestJS Database Module

1. **Create Prisma Service**:

   ```bash
   nest generate service prisma
   ```

2. **Implement PrismaService**:

   - Create `src/prisma/prisma.service.ts`:

   ```typescript
   import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
   import { PrismaClient } from '@prisma/client';

   @Injectable()
   export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
     constructor() {
       super({
         log:
           process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
       });
     }

     async onModuleInit() {
       await this.$connect();
     }

     async onModuleDestroy() {
       await this.$disconnect();
     }
   }
   ```

3. **Create Prisma Module**:

   ```bash
   nest generate module prisma
   ```

4. **Implement PrismaModule**:

   - Update `src/prisma/prisma.module.ts`:

   ```typescript
   import { Module } from '@nestjs/common';
   import { PrismaService } from './prisma.service';

   @Module({
     providers: [PrismaService],
     exports: [PrismaService],
   })
   export class PrismaModule {}
   ```

5. **Create Supabase Service**:

   ```bash
   npm install @supabase/supabase-js
   nest generate service supabase
   ```

6. **Implement SupabaseService**:

   - Create `src/supabase/supabase.service.ts`:

   ```typescript
   import { Injectable } from '@nestjs/common';
   import { createClient, SupabaseClient } from '@supabase/supabase-js';
   import { ConfigService } from '@nestjs/config';

   @Injectable()
   export class SupabaseService {
     private supabaseClient: SupabaseClient;

     constructor(private configService: ConfigService) {
       this.supabaseClient = createClient(
         this.configService.get<string>('SUPABASE_URL'),
         this.configService.get<string>('SUPABASE_ANON_KEY'),
       );
     }

     getClient(): SupabaseClient {
       return this.supabaseClient;
     }
   }
   ```

7. **Create Supabase Module**:

   ```bash
   nest generate module supabase
   ```

8. **Implement SupabaseModule**:

   - Update `src/supabase/supabase.module.ts`:

   ```typescript
   import { Module } from '@nestjs/common';
   import { SupabaseService } from './supabase.service';

   @Module({
     providers: [SupabaseService],
     exports: [SupabaseService],
   })
   export class SupabaseModule {}
   ```

### 5. Configure Row-Level Security (RLS)

1. **Enable RLS on Tables**:

   - In Supabase Dashboard, go to the SQL Editor
   - Run SQL to enable RLS on your tables:

   ```sql
   ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
   ```

2. **Create RLS Policies**:

   - Define policies based on user roles:

   ```sql
   CREATE POLICY "Users can view their own data"
   ON "public"."users"
   FOR SELECT
   USING (auth.uid() = id);

   CREATE POLICY "Users can update their own data"
   ON "public"."users"
   FOR UPDATE
   USING (auth.uid() = id);
   ```

3. **Implement RLS Policies in NestJS**:

   - For queries requiring elevated permissions, use the service role key:

   ```typescript
   import { createClient } from '@supabase/supabase-js';

   const supabaseAdmin = createClient(
     process.env.SUPABASE_URL,
     process.env.SUPABASE_SERVICE_ROLE_KEY,
   );
   ```

### 6. Set up Real-Time Subscriptions

1. **Configure Real-Time in Supabase**:

   - Enable real-time for specific tables in Supabase Dashboard
   - Go to Database > Replication > Source > Select tables to enable for real-time

2. **Implement Subscription Service in NestJS**:

   - Create `src/subscriptions/subscriptions.service.ts`:

   ```typescript
   import { Injectable } from '@nestjs/common';
   import { SupabaseService } from '../supabase/supabase.service';

   @Injectable()
   export class SubscriptionsService {
     constructor(private supabaseService: SupabaseService) {}

     subscribeToTable(tableName: string, callback: (payload: any) => void) {
       const supabase = this.supabaseService.getClient();

       return supabase
         .channel('table-changes')
         .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, callback)
         .subscribe();
     }
   }
   ```

### 7. Add Health Check Endpoints

1. **Install Terminus for Health Checks**:

   ```bash
   npm install @nestjs/terminus
   ```

2. **Create Custom Health Indicator for Prisma**:

   - Create `src/health/prisma.health.ts`:

   ```typescript
   import { Injectable } from '@nestjs/common';
   import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
   import { PrismaService } from '../prisma/prisma.service';

   @Injectable()
   export class PrismaHealthIndicator extends HealthIndicator {
     constructor(private prisma: PrismaService) {
       super();
     }

     async isHealthy(key: string): Promise<HealthIndicatorResult> {
       try {
         // Run a simple query to check if the database is responsive
         await this.prisma.$queryRaw`SELECT 1`;
         return this.getStatus(key, true);
       } catch (error) {
         throw new HealthCheckError(
           'Prisma health check failed',
           this.getStatus(key, false, { error: error.message }),
         );
       }
     }
   }
   ```

3. **Create Health Controller**:

   - Create `src/health/health.controller.ts`:

   ```typescript
   import { Controller, Get } from '@nestjs/common';
   import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
   import { PrismaHealthIndicator } from './prisma.health';

   @Controller('health')
   export class HealthController {
     constructor(
       private health: HealthCheckService,
       private prismaHealth: PrismaHealthIndicator,
     ) {}

     @Get()
     @HealthCheck()
     check() {
       return this.health.check([() => this.prismaHealth.isHealthy('prisma')]);
     }
   }
   ```

4. **Create Health Module**:
   ```bash
   nest generate module health
   ```

### 8. Set up Error Handling and Logging

1. **Create Database Error Interceptor**:

   - Create `src/common/interceptors/database-error.interceptor.ts`:

   ```typescript
   import {
     Injectable,
     NestInterceptor,
     ExecutionContext,
     CallHandler,
     InternalServerErrorException,
   } from '@nestjs/common';
   import { Observable, throwError } from 'rxjs';
   import { catchError } from 'rxjs/operators';
   import { Prisma } from '@prisma/client';
   import { PinoLogger } from 'nestjs-pino';

   @Injectable()
   export class DatabaseErrorInterceptor implements NestInterceptor {
     constructor(private readonly logger: PinoLogger) {
       this.logger.setContext('DatabaseErrorInterceptor');
     }

     intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
       return next.handle().pipe(
         catchError((error) => {
           if (error instanceof Prisma.PrismaClientKnownRequestError) {
             this.logger.error({ error }, 'Prisma known request error');
             // Handle specific Prisma errors based on error.code
             return throwError(() => new InternalServerErrorException('Database operation failed'));
           }
           if (error instanceof Prisma.PrismaClientValidationError) {
             this.logger.error({ error }, 'Prisma validation error');
             return throwError(() => new InternalServerErrorException('Invalid data provided'));
           }
           return throwError(() => error);
         }),
       );
     }
   }
   ```

2. **Configure Global Database Error Handling**:

   - Update `src/app.module.ts` to apply the interceptor globally:

   ```typescript
   import { Module } from '@nestjs/common';
   import { APP_INTERCEPTOR } from '@nestjs/core';
   import { DatabaseErrorInterceptor } from './common/interceptors/database-error.interceptor';

   @Module({
     providers: [
       {
         provide: APP_INTERCEPTOR,
         useClass: DatabaseErrorInterceptor,
       },
     ],
   })
   export class AppModule {}
   ```

3. **Configure Query Logging**:

   - Update Prisma Service to log queries in development:

   ```typescript
   constructor() {
     super({
       log: process.env.NODE_ENV === 'development'
         ? [
             { emit: 'event', level: 'query' },
             { emit: 'stdout', level: 'info' },
             { emit: 'stdout', level: 'warn' },
             { emit: 'stdout', level: 'error' },
           ]
         : [{ emit: 'stdout', level: 'error' }],
     });

     if (process.env.NODE_ENV === 'development') {
       this.$on('query', (e) => {
         console.log('Query: ' + e.query);
         console.log('Params: ' + e.params);
         console.log('Duration: ' + e.duration + 'ms');
       });
     }
   }
   ```

### 9. Configure Database Extensions

1. **Enable Extensions in Supabase**:

   - In Supabase Dashboard, go to Database > Extensions
   - Enable extensions based on your needs (e.g., `uuid-ossp`, `pg_stat_statements`)

2. **Use Extensions in Your Database Schema**:
   - For example, using the `uuid-ossp` extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

### 10. Create Seed Scripts

1. **Create Seed Script**:

   - Create `prisma/seed.ts`:

   ```typescript
   import { PrismaClient } from '@prisma/client';

   const prisma = new PrismaClient();

   async function main() {
     // Create seed data
     const user1 = await prisma.user.upsert({
       where: { email: 'admin@example.com' },
       update: {},
       create: {
         email: 'admin@example.com',
         name: 'Admin User',
       },
     });

     console.log({ user1 });
   }

   main()
     .catch((e) => {
       console.error(e);
       process.exit(1);
     })
     .finally(async () => {
       await prisma.$disconnect();
     });
   ```

2. **Configure Seed Script in package.json**:
   ```json
   {
     "scripts": {
       "db:seed": "ts-node prisma/seed.ts"
     },
     "prisma": {
       "seed": "ts-node prisma/seed.ts"
     }
   }
   ```

### 11. Set up Database Backup and Restoration

1. **Implement Backup System**:

   - Create a script for database backup:

   ```typescript
   // src/scripts/backup-database.ts
   import { exec } from 'child_process';
   import { promisify } from 'util';
   import * as fs from 'fs';
   import * as path from 'path';

   const execAsync = promisify(exec);

   async function backupDatabase() {
     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
     const backupDir = path.join(process.cwd(), 'backups');
     const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

     // Create backups directory if it doesn't exist
     if (!fs.existsSync(backupDir)) {
       fs.mkdirSync(backupDir, { recursive: true });
     }

     // Using pg_dump to create a backup
     try {
       const connectionString = process.env.DATABASE_URL;
       await execAsync(`pg_dump "${connectionString}" > "${backupFile}"`);
       console.log(`Backup created successfully: ${backupFile}`);
     } catch (error) {
       console.error('Backup failed:', error);
     }
   }

   backupDatabase();
   ```

2. **Implement Restoration System**:

   - Create a script for database restoration:

   ```typescript
   // src/scripts/restore-database.ts
   import { exec } from 'child_process';
   import { promisify } from 'util';

   const execAsync = promisify(exec);

   async function restoreDatabase(backupFile: string) {
     try {
       const connectionString = process.env.DATABASE_URL;
       await execAsync(`psql "${connectionString}" < "${backupFile}"`);
       console.log('Database restored successfully');
     } catch (error) {
       console.error('Restoration failed:', error);
     }
   }

   // Get backup file from command line argument
   const backupFile = process.argv[2];
   if (!backupFile) {
     console.error('Please provide a backup file path');
     process.exit(1);
   }

   restoreDatabase(backupFile);
   ```

3. **Add Scripts to package.json**:
   ```json
   {
     "scripts": {
       "db:backup": "ts-node src/scripts/backup-database.ts",
       "db:restore": "ts-node src/scripts/restore-database.ts"
     }
   }
   ```

### 12. Optimize Query Performance

1. **Index Creation**:

   - Add indexes to frequently queried fields in Prisma schema:

   ```prisma
   model User {
     id        String   @id @default(uuid())
     email     String   @unique
     name      String?
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt

     @@index([email])
   }
   ```

2. **Use Optimized Queries**:

   - Select only necessary fields:

   ```typescript
   const users = await prisma.user.findMany({
     select: {
       id: true,
       name: true,
       // Only select needed fields
     },
   });
   ```

   - Use transactions for multiple operations:

   ```typescript
   await prisma.$transaction([
     prisma.user.create({
       data: {
         /* ... */
       },
     }),
     prisma.profile.create({
       data: {
         /* ... */
       },
     }),
   ]);
   ```

3. **Monitor Query Performance**:
   - Enable the `pg_stat_statements` extension in Supabase
   - Create a monitoring endpoint to check query performance:
   ```typescript
   @Get('stats')
   async getDatabaseStats() {
     const stats = await this.prisma.$queryRaw`
       SELECT query, calls, total_time, mean_time
       FROM pg_stat_statements
       ORDER BY mean_time DESC
       LIMIT 10;
     `;
     return stats;
   }
   ```

### 13. Testing Database Integration

1. **Create Integration Tests**:

   - Create a test database in Supabase
   - Create test files for database operations:

   ```typescript
   // test/database.integration.spec.ts
   import { Test } from '@nestjs/testing';
   import { PrismaService } from '../src/prisma/prisma.service';
   import { SupabaseService } from '../src/supabase/supabase.service';

   describe('Database Integration', () => {
     let prismaService: PrismaService;
     let supabaseService: SupabaseService;

     beforeAll(async () => {
       const moduleRef = await Test.createTestingModule({
         providers: [PrismaService, SupabaseService],
       }).compile();

       prismaService = moduleRef.get<PrismaService>(PrismaService);
       supabaseService = moduleRef.get<SupabaseService>(SupabaseService);
     });

     afterAll(async () => {
       await prismaService.$disconnect();
     });

     it('should connect to the database', async () => {
       const result = await prismaService.$queryRaw`SELECT 1 as result`;
       expect(result[0].result).toBe(1);
     });

     // Add more tests for your specific database operations
   });
   ```

2. **Create End-to-End CRUD Testing**:
   - Implement tests for create, read, update, and delete operations
