import { Controller, Get, HttpException, HttpStatus, Param } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { AppService } from './app.service';

/**
 * Example application controller demonstrating logging patterns
 */
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly logger: PinoLogger,
  ) {
    // Set a context for all logs from this controller
    this.logger.setContext('AppController');
  }

  /**
   * Basic route demonstrating logging
   */
  @Get()
  getHello(): string {
    // Log the request to this endpoint
    this.logger.info('Processing request to GET /');
    return this.appService.getHello();
  }

  /**
   * Route demonstrating error logging
   */
  @Get('error')
  triggerError(): string {
    this.logger.warn('Warning: About to simulate an error');

    try {
      // Simulate an error
      throw new Error('This is a simulated error');
    } catch (error) {
      // Log the error with details
      this.logger.error(
        {
          err: error,
          endpoint: '/error',
          timestamp: new Date().toISOString(),
        },
        'Error occurred while processing request',
      );

      // Re-throw as HTTP exception
      throw new HttpException('An error occurred', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Route demonstrating logging with parameters
   */
  @Get('users/:id')
  getUserById(@Param('id') id: string): string {
    this.logger.info({ userId: id }, `Fetching user with ID: ${id}`);

    if (id === '999') {
      this.logger.warn({ userId: id }, 'User not found');
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Simulate fetching a user
    const userDetails = { id, name: 'Sample User', lastLogin: new Date().toISOString() };

    this.logger.debug(
      {
        userId: id,
        details: userDetails,
      },
      'User details retrieved successfully',
    );

    return `User ${id} details retrieved`;
  }
}
