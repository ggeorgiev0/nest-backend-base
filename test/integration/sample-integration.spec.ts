/**
 * @group integration
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';

import { AppController } from '../../src/app.controller';
import { AppService } from '../../src/app.service';
import { CustomLoggerService } from '../../src/common/logger/logger.service';
import { MockConfigModule } from '../utils/config-mocks';
import { mockPinoLogger, mockCustomLoggerService, resetLoggerMocks } from '../utils/logger-mocks';

/**
 * This is a sample integration test that demonstrates how to test
 * the interaction between the controller and the actual service implementation.
 * In real integration tests, you would typically:
 * 1. Use real service implementations instead of mocks
 * 2. Test actual database interactions
 * 3. Test interactions between multiple components
 */
describe('AppController and AppService Integration', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    // Reset all mock functions
    resetLoggerMocks();

    const app: TestingModule = await Test.createTestingModule({
      imports: [MockConfigModule],
      controllers: [AppController],
      providers: [
        // Using the actual service implementation
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

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('Controller-Service Integration', () => {
    it('should properly integrate controller with service', () => {
      // Test that the controller correctly uses the service
      const result = appController.getHello();
      expect(result).toBe('Hello World!');

      // Verify that the actual service method was called
      const serviceSpy = jest.spyOn(appService, 'getHello');
      appController.getHello();
      expect(serviceSpy).toHaveBeenCalled();
    });
  });
});
