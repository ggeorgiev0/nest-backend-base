import { ArgumentMetadata } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

import { GlobalValidationPipe, ValidationException } from '../../src/common/exceptions';

// Test DTO class
class TestUserDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password!: string;
}

describe('GlobalValidationPipe', () => {
  let validationPipe: GlobalValidationPipe;

  beforeEach(() => {
    // Create an instance directly instead of using NestJS TestingModule
    // since there are no dependencies to inject
    validationPipe = new GlobalValidationPipe({
      transform: true,
      whitelist: true,
    });
  });

  it('should be defined', () => {
    expect(validationPipe).toBeDefined();
  });

  it('should pass validation with valid DTO', async () => {
    // Arrange
    const dto = {
      email: 'test@example.com',
      password: 'test-valid-pwd',
    };
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestUserDto,
    };

    // Act
    const result = await validationPipe.transform(dto, metadata);

    // Assert
    expect(result).toEqual(dto);
  });

  it('should throw ValidationException for invalid email', async () => {
    // Arrange
    const dto = {
      email: 'invalid-email',
      password: 'test-valid-pwd',
    };
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestUserDto,
    };

    // Act & Assert
    try {
      await validationPipe.transform(dto, metadata);
      fail('Expected ValidationException to be thrown');
    } catch (error) {
      const validationError = error as ValidationException;
      expect(validationError).toBeInstanceOf(ValidationException);
      expect(validationError.errors).toBeDefined();
      expect(validationError.errors.email).toBeDefined();
      expect(validationError.errors.email.length).toBeGreaterThan(0);
    }
  });

  it('should throw ValidationException for missing required fields', async () => {
    // Arrange
    const dto = {
      email: 'test@example.com',
      // Missing password
    };
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestUserDto,
    };

    // Act & Assert
    try {
      await validationPipe.transform(dto, metadata);
      fail('Expected ValidationException to be thrown');
    } catch (error) {
      const validationError = error as ValidationException;
      expect(validationError).toBeInstanceOf(ValidationException);
      expect(validationError.errors).toBeDefined();
      expect(validationError.errors.password).toBeDefined();
      expect(validationError.errors.password.length).toBeGreaterThan(0);
    }
  });

  it('should throw ValidationException for multiple validation errors', async () => {
    // Arrange
    const dto = {
      email: 'invalid-email',
      password: 'short',
    };
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestUserDto,
    };

    // Act & Assert
    try {
      await validationPipe.transform(dto, metadata);
      fail('Expected ValidationException to be thrown');
    } catch (error) {
      const validationError = error as ValidationException;
      expect(validationError).toBeInstanceOf(ValidationException);
      expect(validationError.errors).toBeDefined();
      expect(validationError.errors.email).toBeDefined();
      expect(validationError.errors.password).toBeDefined();
      expect(Object.keys(validationError.errors).length).toBe(2);
    }
  });

  it('should not validate if metatype is not provided', async () => {
    // Arrange
    const dto = {
      email: 'invalid-email',
      password: 'test-pwd',
    };
    const metadata: ArgumentMetadata = {
      type: 'body',
    };

    // Act
    const result = await validationPipe.transform(dto, metadata);

    // Assert
    expect(result).toEqual(dto);
  });

  it('should not validate if value is not an object', async () => {
    // Arrange
    const value = 'string-value';
    const metadata: ArgumentMetadata = {
      type: 'param',
      metatype: TestUserDto,
    };

    // Act
    const result = await validationPipe.transform(value, metadata);

    // Assert
    expect(result).toEqual(value);
  });

  it('should not validate native JavaScript types', async () => {
    // Arrange
    const dto = {
      email: 'invalid-email',
      password: 'test-pwd',
    };
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: Object,
    };

    // Act
    const result = await validationPipe.transform(dto, metadata);

    // Assert
    expect(result).toEqual(dto);
  });
});
