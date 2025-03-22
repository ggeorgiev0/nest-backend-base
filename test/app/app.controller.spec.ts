import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';

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
});
