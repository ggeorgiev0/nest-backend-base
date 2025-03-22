import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';

import { EnvironmentVariablesValidation } from './env/env.validation';

/**
 * Validate environment configuration
 * @param config - Environment variables object
 * @returns Validated configuration object
 */
function validateConfig(config: Record<string, unknown>): EnvironmentVariablesValidation {
  const validatedConfig = plainToInstance(EnvironmentVariablesValidation, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map((error: ValidationError) => {
      const constraints = error.constraints ? Object.values(error.constraints) : [];
      return `${error.property}: ${constraints.join(', ')}`;
    });
    throw new Error(`Configuration validation failed: ${errorMessages.join('; ')}`);
  }

  return validatedConfig;
}

/**
 * Configuration module that loads and validates environment variables
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      validate: validateConfig,
      validationOptions: {
        allowUnknown: false,
        abortEarly: true,
      },
      expandVariables: true,
      cache: true,
      isGlobal: true,
    }),
  ],
})
export class ConfigModule {}
