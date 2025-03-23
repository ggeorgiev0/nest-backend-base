import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { Environment } from './env.interface';

/**
 * Validation class for environment variables using class-validator
 */
export class EnvironmentVariablesValidation {
  // Application
  @IsEnum(Environment)
  @IsNotEmpty()
  NODE_ENV!: Environment;

  @Transform(({ value }: TransformFnParams) => Number.parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @Max(65_535)
  @IsNotEmpty()
  PORT!: number;

  @IsString()
  @IsNotEmpty()
  API_PREFIX!: string;

  @IsString()
  @IsNotEmpty()
  APP_NAME!: string;

  @IsString()
  @IsNotEmpty()
  APP_DESCRIPTION!: string;

  @IsString()
  @IsNotEmpty()
  API_VERSION!: string;

  // Database
  @IsString()
  @IsNotEmpty()
  DB_HOST!: string;

  @Transform(({ value }: TransformFnParams) => Number.parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @Max(65_535)
  @IsNotEmpty()
  DB_PORT!: number;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME!: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  DB_DATABASE!: string;

  @IsString()
  @IsNotEmpty()
  DB_SCHEMA!: string;

  // Prisma
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  // Supabase
  @IsString()
  @IsNotEmpty()
  SUPABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_ANON_KEY!: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_SERVICE_ROLE_KEY!: string;

  // JWT
  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN!: string;

  // Redis
  @IsString()
  @IsNotEmpty()
  REDIS_HOST!: string;

  @Transform(({ value }: TransformFnParams) => Number.parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @Max(65_535)
  @IsNotEmpty()
  REDIS_PORT!: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  // Logging
  @IsString()
  @IsNotEmpty()
  LOG_LEVEL!: string;

  @IsString()
  @IsNotEmpty()
  LOG_FORMAT!: string;

  // Security
  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN!: string;

  @Transform(({ value }: TransformFnParams) => Number.parseInt(value as string, 10))
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  RATE_LIMIT_WINDOW!: number;

  @Transform(({ value }: TransformFnParams) => Number.parseInt(value as string, 10))
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  RATE_LIMIT_MAX_REQUESTS!: number;
}
