/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { ConfigModule } from '@nestjs/config';

// Mock configuration values for testing
const mockConfig = {
  NODE_ENV: 'test',
  PORT: 3000,
  API_PREFIX: 'api',
  APP_NAME: 'Test App',
  APP_DESCRIPTION: 'Test Description',
  API_VERSION: '1.0.0',
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  DB_USERNAME: 'test',
  DB_PASSWORD: 'test',
  DB_DATABASE: 'test',
  DB_SCHEMA: 'public',
  JWT_SECRET: 'test-secret',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_SECRET: 'test-refresh-secret',
  JWT_REFRESH_EXPIRES_IN: '7d',
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  LOG_LEVEL: 'info',
  LOG_FORMAT: 'pretty',
  CORS_ORIGIN: '*',
  RATE_LIMIT_WINDOW: 60_000,
  RATE_LIMIT_MAX_REQUESTS: 100,
};

// Create a mock ConfigModule for testing
export const MockConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  load: [() => mockConfig],
});

// Export the mock config for use in tests
export const getMockConfig = () => mockConfig;
