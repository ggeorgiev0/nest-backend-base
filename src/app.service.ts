import { Injectable } from '@nestjs/common';

import { CustomLoggerService } from '@/common/logger';

/**
 * Example application service
 */
@Injectable()
export class AppService {
  constructor(private readonly logger: CustomLoggerService) {
    // Remove the setContext call since it's not supported in our custom logger
  }

  /**
   * Get a hello message
   * @returns A greeting message
   */
  getHello(): string {
    this.logger.log('getHello method called', {
      timestamp: new Date().toISOString(),
      metadata: {
        method: 'getHello',
        service: 'AppService',
      },
    });

    try {
      // Some example business logic
      const message = 'Hello World!';

      this.logger.debug('Generated hello message', { message });
      return message;
    } catch (error) {
      // Example error handling with structured logging
      this.logger.error(error instanceof Error ? error : new Error(String(error)), undefined, {
        severity: 'high',
        impact: 'user experience',
      });
      throw error;
    }
  }
}
