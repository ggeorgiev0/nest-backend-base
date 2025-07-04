import { ArgumentMetadata } from '@nestjs/common';
import { Type } from 'class-transformer';
import * as classTransformer from 'class-transformer';
import { IsString, IsNumber, IsEmail, ValidateNested, IsNotEmpty } from 'class-validator';
import * as classValidator from 'class-validator';

import { ValidationException } from '@common/exceptions/domain-exceptions';
import { GlobalValidationPipe } from '@common/exceptions/validation.pipe';

// Test DTOs
class TestDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  age!: number;

  @IsEmail()
  email!: string;
}

class NestedDto {
  @IsString()
  field!: string;
}

class TestDtoWithNested {
  @IsString()
  name!: string;

  @ValidateNested()
  @Type(() => NestedDto)
  nested!: NestedDto;
}

describe('GlobalValidationPipe', () => {
  let pipe: GlobalValidationPipe;

  beforeEach(() => {
    pipe = new GlobalValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      forbidUnknownValues: true,
    });
  });

  describe('transform', () => {
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestDto,
      data: '',
    };

    it('should validate and transform a valid object', async () => {
      const input = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      const result = await pipe.transform(input, metadata);

      expect(result).toBeInstanceOf(TestDto);
      expect(result).toEqual(input);
    });

    it('should throw ValidationException for invalid data', async () => {
      const input = {
        name: '',
        age: 'not a number',
        email: 'invalid-email',
      };

      await expect(pipe.transform(input, metadata)).rejects.toThrow(ValidationException);
    });

    it('should format validation errors correctly', async () => {
      const input = {
        name: '',
        age: 'not a number',
        email: 'invalid-email',
      };

      try {
        await pipe.transform(input, metadata);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationException);
        const validationError = error as ValidationException;
        expect(validationError.errors).toBeDefined();
        expect(validationError.errors.name).toContain('name should not be empty');
        expect(validationError.errors.age).toBeDefined();
        expect(validationError.errors.email).toContain('email must be an email');
      }
    });

    it('should handle nested validation', async () => {
      const nestedMetadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestDtoWithNested,
        data: '',
      };

      const input = {
        name: 'Test',
        nested: {
          // Missing required field
        },
      };

      await expect(pipe.transform(input, nestedMetadata)).rejects.toThrow(ValidationException);
    });

    it('should format nested validation errors with dot notation', async () => {
      const nestedMetadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestDtoWithNested,
        data: '',
      };

      const input = {
        name: 'Test',
        nested: {
          // Missing required field
        },
      };

      try {
        await pipe.transform(input, nestedMetadata);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationException);
        const validationError = error as ValidationException;
        expect(validationError.errors['nested.field']).toBeDefined();
      }
    });

    it('should skip validation for native types', async () => {
      const stringMetadata: ArgumentMetadata = {
        type: 'body',
        metatype: String,
        data: '',
      };

      const input = 'test string';
      const result = await pipe.transform(input, stringMetadata);

      expect(result).toBe(input);
    });

    it('should skip validation when metatype is undefined', async () => {
      const undefinedMetadata: ArgumentMetadata = {
        type: 'body',
        metatype: undefined,
        data: '',
      };

      const input = { any: 'data' };
      const result = await pipe.transform(input, undefinedMetadata);

      expect(result).toBe(input);
    });

    it('should skip validation for non-object values', async () => {
      const result = await pipe.transform('string value', metadata);
      expect(result).toBe('string value');

      const nullResult = await pipe.transform(null, metadata);
      expect(nullResult).toBeNull();
    });

    it('should strip non-whitelisted properties when whitelist is true', async () => {
      const input = {
        name: 'John',
        age: 30,
        email: 'john@example.com',
        extraField: 'should be removed',
      };

      const result = (await pipe.transform(input, metadata)) as any;

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('age');
      expect(result).toHaveProperty('email');
      expect(result).not.toHaveProperty('extraField');
    });

    it('should throw error for non-whitelisted properties when forbidNonWhitelisted is true', async () => {
      const strictPipe = new GlobalValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      const input = {
        name: 'John',
        age: 30,
        email: 'john@example.com',
        extraField: 'should cause error',
      };

      await expect(strictPipe.transform(input, metadata)).rejects.toThrow(ValidationException);
    });

    it('should handle single valid DTO from array metatype', async () => {
      const input = {
        name: 'John',
        age: 30,
        email: 'john@example.com',
      };

      const result = await pipe.transform(input, metadata);
      expect(result).toBeInstanceOf(TestDto);
      expect(result).toHaveProperty('name', 'John');
    });

    it('should handle unexpected errors during validation', async () => {
      // Mock plainToInstance to throw an error
      const mockError = new Error('Unexpected transformation error');
      jest.spyOn(classTransformer, 'plainToInstance').mockImplementationOnce(() => {
        throw mockError;
      });

      const input = { name: 'Test', age: 25, email: 'test@example.com' };

      await expect(pipe.transform(input, metadata)).rejects.toThrow(ValidationException);

      jest.restoreAllMocks();
    });

    it('should wrap non-ValidationException errors', async () => {
      // Force an error by passing an invalid value that causes transformation to fail
      const circularRef: any = {};
      circularRef.self = circularRef;

      // This should cause an error during validation
      jest.spyOn(classValidator, 'validate').mockRejectedValueOnce(new Error('Test error'));

      const input = { name: 'Test', age: 25, email: 'test@example.com' };

      try {
        await pipe.transform(input, metadata);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationException);
        expect((error as ValidationException).message).toContain('Validation error: Test error');
      }

      jest.restoreAllMocks();
    });
  });

  describe('constructor options', () => {
    it('should use default options when none provided', () => {
      const defaultPipe = new GlobalValidationPipe();
      expect(defaultPipe).toBeDefined();
    });

    it('should accept custom options', () => {
      const customPipe = new GlobalValidationPipe({
        transform: false,
        whitelist: false,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
      });
      expect(customPipe).toBeDefined();
    });
  });
});
