import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';

import {
  mockPinoLogger,
  mockCustomLoggerService,
  resetLoggerMocks,
} from '../test/utils/logger-mocks';

import { AppService } from './app.service';
import { CustomLoggerService } from './common/logger/logger.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    // Reset all mock functions
    resetLoggerMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
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

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      const result = service.getHello();
      expect(result).toBe('Hello World!');
      expect(mockCustomLoggerService.log).toHaveBeenCalled();
      expect(mockCustomLoggerService.debug).toHaveBeenCalled();
    });
  });
});
