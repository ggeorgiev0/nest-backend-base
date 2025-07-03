import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { AppService } from '@/app.service';
import {
  ExternalServiceException,
  ResourceNotFoundException,
  DomainUnauthorizedException,
} from '@/common/exceptions';
import { pickSafeFields, sanitizeObject } from '@/common/utils';

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

      // Re-throw as domain exception
      throw new ExternalServiceException('An error occurred');
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
      throw new ResourceNotFoundException('User not found');
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

  /**
   * Route demonstrating safe logging with redaction utilities
   */
  @Post('login')
  login(@Body() credentials: { username: string; password: string; token?: string }): string {
    // Example 1: Using the sanitizeObject utility
    // This automatically redacts sensitive fields like password and token
    this.logger.info({ credentials: sanitizeObject(credentials) }, 'Login attempt received');
    // Will log: { credentials: { username: "user123", password: "[REDACTED]", token: "[REDACTED]" } }

    // Example 2: Using the pickSafeFields utility
    // This explicitly selects only safe fields to log
    this.logger.info(
      { user: pickSafeFields(credentials, ['username']) },
      'Processing login for user',
    );
    // Will log: { user: { username: "user123" } }

    // Simulate login logic
    if (credentials.username === 'admin' && credentials.password === 'admin') {
      return 'Login successful';
    }

    throw new DomainUnauthorizedException('Invalid credentials');
  }
}
