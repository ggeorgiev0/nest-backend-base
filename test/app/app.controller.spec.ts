/**
 * @group unit
 */
import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';

import {
  ExternalServiceException,
  ResourceNotFoundException,
  DomainUnauthorizedException,
} from '@/common/exceptions';

import { AppController } from '../../src/app.controller';
import { AppService } from '../../src/app.service';
import { CustomLoggerService } from '../../src/common/logger/logger.service';
import { MockConfigModule } from '../utils/config-mocks';
import { mockPinoLogger, mockCustomLoggerService, resetLoggerMocks } from '../utils/logger-mocks';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    // Reset all mock functions
    resetLoggerMocks();

    const app: TestingModule = await Test.createTestingModule({
      imports: [MockConfigModule],
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getHello: jest.fn().mockReturnValue('Hello World!'),
          },
        },
        {
          provide: PinoLogger,
          useValue: mockPinoLogger,
        },
        {
          provide: CustomLoggerService,
          useValue: mockCustomLoggerService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      const result = appController.getHello();
      expect(result).toBe('Hello World!');
      expect(mockPinoLogger.info).toHaveBeenCalled();
      expect(appService.getHello).toHaveBeenCalled();
    });
  });

  describe('triggerError', () => {
    it('should throw ExternalServiceException', () => {
      // Arrange & Act
      try {
        appController.triggerError();
        // If we reach this line, the test should fail
        fail('Expected triggerError to throw an exception');
      } catch (error) {
        // Assert
        expect(error).toBeInstanceOf(ExternalServiceException);
        const httpError = error as ExternalServiceException;
        expect(httpError.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect(httpError.message).toBe('An error occurred');

        // Verify logger calls
        expect(mockPinoLogger.warn).toHaveBeenCalledWith('Warning: About to simulate an error');
        expect(mockPinoLogger.error).toHaveBeenCalled();

        // Check the error payload structure
        const errorCallArgs = mockPinoLogger.error.mock.calls[0];
        expect(errorCallArgs[0]).toHaveProperty('err');
        expect(errorCallArgs[0]).toHaveProperty('endpoint', '/error');
        expect(errorCallArgs[0]).toHaveProperty('timestamp');
        expect(errorCallArgs[1]).toBe('Error occurred while processing request');
      }
    });
  });

  describe('getUserById', () => {
    it('should return user details for valid ID', () => {
      // Arrange
      const userId = '123';

      // Act
      const result = appController.getUserById(userId);

      // Assert
      expect(result).toBe(`User ${userId} details retrieved`);

      // Verify logger calls
      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        { userId },
        `Fetching user with ID: ${userId}`,
      );
      expect(mockPinoLogger.debug).toHaveBeenCalled();

      // Check the debug payload structure
      const debugCallArgs = mockPinoLogger.debug.mock.calls[0];
      expect(debugCallArgs[0]).toHaveProperty('userId', userId);
      expect(debugCallArgs[0]).toHaveProperty('details');
      expect(debugCallArgs[0].details).toHaveProperty('id', userId);
      expect(debugCallArgs[0].details).toHaveProperty('name', 'Sample User');
      expect(debugCallArgs[0].details).toHaveProperty('lastLogin');
      expect(debugCallArgs[1]).toBe('User details retrieved successfully');
    });

    it('should throw ResourceNotFoundException for user ID 999', () => {
      // Arrange
      const userId = '999';

      // Act & Assert
      try {
        appController.getUserById(userId);
        fail('Expected getUserById to throw for ID 999');
      } catch (error) {
        // Assert exception details
        expect(error).toBeInstanceOf(ResourceNotFoundException);
        const httpError = error as ResourceNotFoundException;
        expect(httpError.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(httpError.message).toBe('User not found');

        // Verify logger calls
        expect(mockPinoLogger.info).toHaveBeenCalledWith(
          { userId },
          `Fetching user with ID: ${userId}`,
        );
        expect(mockPinoLogger.warn).toHaveBeenCalledWith({ userId }, 'User not found');
      }
    });
  });

  describe('login', () => {
    it('should return success message for valid admin credentials', () => {
      // Arrange
      const credentials = { username: 'admin', password: 'admin' };

      // Act
      const result = appController.login(credentials);

      // Assert
      expect(result).toBe('Login successful');

      // Verify logger calls related to sanitization
      expect(mockPinoLogger.info).toHaveBeenCalledTimes(2);

      // Check first logger call with sanitized object
      const firstLogCall = mockPinoLogger.info.mock.calls[0];
      expect(firstLogCall[0]).toHaveProperty('credentials');
      expect(firstLogCall[0].credentials).toHaveProperty('username', 'admin');
      expect(firstLogCall[0].credentials).toHaveProperty('password', '[REDACTED]');
      expect(firstLogCall[1]).toBe('Login attempt received');

      // Check second logger call with picked safe fields
      const secondLogCall = mockPinoLogger.info.mock.calls[1];
      expect(secondLogCall[0]).toHaveProperty('user');
      expect(secondLogCall[0].user).toHaveProperty('username', 'admin');
      expect(secondLogCall[0].user).not.toHaveProperty('password');
      expect(secondLogCall[1]).toBe('Processing login for user');
    });

    it('should throw DomainUnauthorizedException for invalid credentials', () => {
      // Arrange
      const credentials = { username: 'user', password: 'wrongpass' };

      // Act & Assert
      try {
        appController.login(credentials);
        fail('Expected login to throw for invalid credentials');
      } catch (error) {
        // Assert exception details
        expect(error).toBeInstanceOf(DomainUnauthorizedException);
        const httpError = error as DomainUnauthorizedException;
        expect(httpError.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        expect(httpError.message).toBe('Invalid credentials');

        // Verify logger calls
        expect(mockPinoLogger.info).toHaveBeenCalledTimes(2);
      }
    });

    it('should handle credentials with token field', () => {
      // Arrange
      const credentials = {
        username: 'admin',
        password: 'admin',
        token: 'secret-token',
      };

      // Act
      const result = appController.login(credentials);

      // Assert
      expect(result).toBe('Login successful');

      // Verify sanitization of token field
      const firstLogCall = mockPinoLogger.info.mock.calls[0];
      expect(firstLogCall[0].credentials).toHaveProperty('token', '[REDACTED]');

      // Verify token isn't included in picked fields
      const secondLogCall = mockPinoLogger.info.mock.calls[1];
      expect(secondLogCall[0].user).not.toHaveProperty('token');
    });
  });
});
