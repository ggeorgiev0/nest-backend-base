/**
 * @group unit
 */
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { Environment } from '../../../src/config/env/env.interface';
import { EnvironmentVariablesValidation } from '../../../src/config/env/env.validation';

// Helper function to create a valid env config
function createValidConfig(): Record<string, unknown> {
  return {
    NODE_ENV: Environment.Development,
    PORT: '3000',
    API_PREFIX: 'api',
    APP_NAME: 'Test App',
    APP_DESCRIPTION: 'Test Description',
    API_VERSION: 'v1',
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_USERNAME: 'postgres',
    DB_PASSWORD: 'postgres',
    DB_DATABASE: 'testdb',
    DB_SCHEMA: 'public',
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '1h',
    JWT_REFRESH_SECRET: 'refresh-secret',
    JWT_REFRESH_EXPIRES_IN: '7d',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    LOG_LEVEL: 'info',
    LOG_FORMAT: 'combined',
    CORS_ORIGIN: '*',
    RATE_LIMIT_WINDOW: '60000',
    RATE_LIMIT_MAX_REQUESTS: '100',
  };
}

describe('EnvironmentVariablesValidation', () => {
  it('should pass validation with valid environment variables', async () => {
    const config = createValidConfig();
    const validatedConfig = plainToInstance(EnvironmentVariablesValidation, config, {
      enableImplicitConversion: true,
    });

    const errors = await validate(validatedConfig);
    expect(errors.length).toBe(0);
  });

  it('should transform string numbers to actual numbers', () => {
    const config = createValidConfig();
    const validatedConfig = plainToInstance(EnvironmentVariablesValidation, config, {
      enableImplicitConversion: true,
    });

    expect(typeof validatedConfig.PORT).toBe('number');
    expect(validatedConfig.PORT).toBe(3000);

    expect(typeof validatedConfig.DB_PORT).toBe('number');
    expect(validatedConfig.DB_PORT).toBe(5432);

    expect(typeof validatedConfig.REDIS_PORT).toBe('number');
    expect(validatedConfig.REDIS_PORT).toBe(6379);

    expect(typeof validatedConfig.RATE_LIMIT_WINDOW).toBe('number');
    expect(validatedConfig.RATE_LIMIT_WINDOW).toBe(60_000);

    expect(typeof validatedConfig.RATE_LIMIT_MAX_REQUESTS).toBe('number');
    expect(validatedConfig.RATE_LIMIT_MAX_REQUESTS).toBe(100);
  });

  it('should fail validation when required variables are missing', async () => {
    const config = {
      NODE_ENV: Environment.Development,
      // Missing other required fields
    };

    const validatedConfig = plainToInstance(EnvironmentVariablesValidation, config);
    const errors = await validate(validatedConfig);

    expect(errors.length).toBeGreaterThan(0);

    // Check for specific errors
    const errorProperties = errors.map((error) => error.property);
    expect(errorProperties).toContain('PORT');
    expect(errorProperties).toContain('API_PREFIX');
  });

  it('should fail validation with invalid NODE_ENV', async () => {
    const config = {
      ...createValidConfig(),
      NODE_ENV: 'invalid-env',
    };

    const validatedConfig = plainToInstance(EnvironmentVariablesValidation, config);
    const errors = await validate(validatedConfig);

    expect(errors.length).toBeGreaterThan(0);
    const nodeEnvError = errors.find((error) => error.property === 'NODE_ENV');
    expect(nodeEnvError).toBeDefined();
  });

  it('should fail validation with invalid PORT (out of range)', async () => {
    const config = {
      ...createValidConfig(),
      PORT: '70000', // Above max port number
    };

    const validatedConfig = plainToInstance(EnvironmentVariablesValidation, config, {
      enableImplicitConversion: true,
    });
    const errors = await validate(validatedConfig);

    expect(errors.length).toBeGreaterThan(0);
    const portError = errors.find((error) => error.property === 'PORT');
    expect(portError).toBeDefined();
  });

  it('should fail validation with invalid PORT (negative)', async () => {
    const config = {
      ...createValidConfig(),
      PORT: '-1', // Negative port
    };

    const validatedConfig = plainToInstance(EnvironmentVariablesValidation, config, {
      enableImplicitConversion: true,
    });
    const errors = await validate(validatedConfig);

    expect(errors.length).toBeGreaterThan(0);
    const portError = errors.find((error) => error.property === 'PORT');
    expect(portError).toBeDefined();
  });

  it('should handle optional REDIS_PASSWORD correctly', async () => {
    // Test with password
    const configWithPassword = {
      ...createValidConfig(),
      REDIS_PASSWORD: 'redis-password',
    };

    let validatedConfig = plainToInstance(EnvironmentVariablesValidation, configWithPassword, {
      enableImplicitConversion: true,
    });
    let errors = await validate(validatedConfig);

    expect(errors.length).toBe(0);
    expect(validatedConfig.REDIS_PASSWORD).toBe('redis-password');

    // Test without password
    const configWithoutPassword = {
      ...createValidConfig(),
    };
    // Remove REDIS_PASSWORD if it exists
    delete (configWithoutPassword as any).REDIS_PASSWORD;

    validatedConfig = plainToInstance(EnvironmentVariablesValidation, configWithoutPassword, {
      enableImplicitConversion: true,
    });
    errors = await validate(validatedConfig);

    expect(errors.length).toBe(0);
    expect(validatedConfig.REDIS_PASSWORD).toBeUndefined();
  });
});
