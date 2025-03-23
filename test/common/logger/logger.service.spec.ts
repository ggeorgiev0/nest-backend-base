/**
 * @group unit
 */
import { REQUEST } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';

import { CustomLoggerService } from '../../../src/common/logger/logger.service';

describe('CustomLoggerService', () => {
  let service: CustomLoggerService;
  let pinoLogger: jest.Mocked<PinoLogger>;
  let module: TestingModule;

  // Setup with no request
  beforeEach(async () => {
    // Mock PinoLogger
    pinoLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      setContext: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>;

    module = await Test.createTestingModule({
      providers: [
        CustomLoggerService,
        {
          provide: PinoLogger,
          useValue: pinoLogger,
        },
        {
          provide: REQUEST,
          useValue: undefined,
        },
      ],
    }).compile();

    // Use resolve instead of get for the scoped provider
    service = await module.resolve(CustomLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log methods', () => {
    it('should call pinoLogger.info for log method', () => {
      service.log('test message');
      expect(pinoLogger.info).toHaveBeenCalledWith({}, 'test message');
    });

    it('should call pinoLogger.error for error method with string', () => {
      service.error('error message');
      expect(pinoLogger.error).toHaveBeenCalledWith({}, 'error message');
    });

    it('should call pinoLogger.error for error method with Error object', () => {
      const error = new Error('test error');
      service.error(error);
      expect(pinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: error }),
        'test error',
      );
    });

    it('should call pinoLogger.warn for warn method', () => {
      service.warn('warning message');
      expect(pinoLogger.warn).toHaveBeenCalledWith({}, 'warning message');
    });

    it('should call pinoLogger.debug for debug method', () => {
      service.debug('debug message');
      expect(pinoLogger.debug).toHaveBeenCalledWith({}, 'debug message');
    });

    it('should call pinoLogger.trace for trace method', () => {
      service.trace('trace message');
      expect(pinoLogger.trace).toHaveBeenCalledWith({}, 'trace message');
    });

    it('should call pinoLogger.fatal for fatal method with string', () => {
      service.fatal('fatal message');
      expect(pinoLogger.fatal).toHaveBeenCalledWith({}, 'fatal message');
    });

    it('should call pinoLogger.fatal for fatal method with Error object', () => {
      const error = new Error('fatal error');
      service.fatal(error);
      expect(pinoLogger.fatal).toHaveBeenCalledWith(
        expect.objectContaining({ err: error }),
        'fatal error',
      );
    });
  });

  describe('with context', () => {
    it('should add context object to log message', () => {
      const context = { userId: '123', action: 'login' };
      service.log('User logged in', context);
      expect(pinoLogger.info).toHaveBeenCalledWith(context, 'User logged in');
    });

    it('should ignore non-object last parameters', () => {
      service.log('Test message', 'string param');
      expect(pinoLogger.info).toHaveBeenCalledWith({}, 'Test message');
    });

    it('should ignore array last parameters', () => {
      service.log('Test message', ['array', 'param']);
      expect(pinoLogger.info).toHaveBeenCalledWith({}, 'Test message');
    });
  });

  describe('with correlation ID', () => {
    const correlationId = 'test-correlation-id';
    let serviceWithCorrelation: CustomLoggerService;
    let moduleWithCorrelation: TestingModule;

    beforeEach(async () => {
      moduleWithCorrelation = await Test.createTestingModule({
        providers: [
          CustomLoggerService,
          {
            provide: PinoLogger,
            useValue: pinoLogger,
          },
          {
            provide: REQUEST,
            useValue: { correlationId },
          },
        ],
      }).compile();

      serviceWithCorrelation = await moduleWithCorrelation.resolve(CustomLoggerService);
    });

    it('should add correlation ID to log context', () => {
      serviceWithCorrelation.log('Message with correlation');
      expect(pinoLogger.info).toHaveBeenCalledWith({ correlationId }, 'Message with correlation');
    });

    it('should merge correlation ID with existing context', () => {
      const context = { userId: '123', action: 'test' };
      serviceWithCorrelation.log('Message with context and correlation', context);
      expect(pinoLogger.info).toHaveBeenCalledWith(
        { ...context, correlationId },
        'Message with context and correlation',
      );
    });

    it('should set context on PinoLogger when constructed with request', () => {
      expect(pinoLogger.setContext).toHaveBeenCalledWith('request');
    });
  });
});
