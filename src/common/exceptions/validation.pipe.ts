import { ArgumentMetadata, Injectable, PipeTransform, Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

import { ValidationException } from './domain-exceptions';

/**
 * Global validation pipe that validates DTOs using class-validator
 * Provides consistent validation error format
 */
@Injectable()
export class GlobalValidationPipe implements PipeTransform {
  /**
   * Constructor
   * @param options Options for the validation pipe
   */
  constructor(
    private readonly options: {
      /**
       * Whether to enable auto type conversion
       */
      transform?: boolean;
      /**
       * Whether to whitelist properties that don't have decorators
       */
      whitelist?: boolean;
      /**
       * Whether to throw an error if non-whitelisted properties are present
       */
      forbidNonWhitelisted?: boolean;
      /**
       * Whether to reject nested objects that don't have decorators
       */
      forbidUnknownValues?: boolean;
    } = {
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      forbidUnknownValues: false,
    },
  ) {}

  /**
   * Transform and validate incoming data
   * @param value The value to validate
   * @param metadata Metadata about the value
   * @returns The validated and transformed value
   * @throws ValidationException if validation fails
   */
  async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    // Only validate if metatype is defined and it's not a primitive type
    if (!metadata.metatype || this.isNativeType(metadata.metatype)) {
      return value;
    }

    // Skip validation for non-object values (e.g., params, query with a single value)
    if (typeof value !== 'object' || value === null) {
      return value;
    }

    const valueAsRecord = value as Record<string, unknown>;

    // Transform plain object to instance of the metatype class
    const object = plainToInstance(metadata.metatype, valueAsRecord, {
      enableImplicitConversion: this.options.transform,
    });

    // Validate the object
    const errors = await validate(object as object, {
      whitelist: this.options.whitelist,
      forbidNonWhitelisted: this.options.forbidNonWhitelisted,
      forbidUnknownValues: this.options.forbidUnknownValues,
    });

    // If there are validation errors, format them and throw an exception
    if (errors.length > 0) {
      throw new ValidationException(this.formatErrors(errors));
    }

    // Return the validated object
    return object;
  }

  /**
   * Check if a type is a native JavaScript type
   * @param metatype The type to check
   * @returns Boolean indicating if the type is native
   */
  private isNativeType(metatype: Type<unknown>): boolean {
    const nativeTypes: Array<Type<unknown>> = [String, Boolean, Number, Array, Object, Date];
    return nativeTypes.includes(metatype);
  }

  /**
   * Format validation errors into a more user-friendly structure
   * @param errors Validation errors from class-validator
   * @returns Formatted errors
   */
  private formatErrors(errors: ValidationError[]): Record<string, string[]> {
    const formattedErrors: Record<string, string[]> = {};

    const formatError = (error: ValidationError, parentPath = ''): void => {
      const property = parentPath ? `${parentPath}.${error.property}` : error.property;

      // Handle constraints (validation errors)
      if (error.constraints) {
        formattedErrors[property] = Object.values(error.constraints);
      }

      // Handle nested errors
      if (error.children && error.children.length > 0) {
        for (const child of error.children) formatError(child, property);
      }
    };

    for (const error of errors) formatError(error);
    return formattedErrors;
  }
}
