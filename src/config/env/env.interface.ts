export enum Environment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  schema: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface LogConfig {
  level: string;
  format: string;
}

export interface EnvironmentVariables {
  // Application
  NODE_ENV: Environment;
  PORT: number;
  API_PREFIX: string;
  APP_NAME: string;
  APP_DESCRIPTION: string;
  API_VERSION: string;

  // Database
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  DB_SCHEMA: string;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;

  // Redis
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;

  // Logging
  LOG_LEVEL: string;
  LOG_FORMAT: string;

  // Security
  CORS_ORIGIN: string;
  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX_REQUESTS: number;
}
