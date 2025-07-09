import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';

interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  factor: number;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly connectionRetryOptions: RetryOptions = {
    maxRetries: 5,
    initialDelay: 1000, // 1 second
    maxDelay: 30_000, // 30 seconds
    factor: 2, // exponential backoff factor
  };

  private isConnected = false;
  private connectionAttempts = 0;

  constructor(private readonly logger: PinoLogger) {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'stdout', level: 'info' },
              { emit: 'stdout', level: 'warn' },
              { emit: 'stdout', level: 'error' },
            ]
          : [{ emit: 'stdout', level: 'error' }],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Set the logger context
    this.logger.setContext('PrismaService');

    if (process.env.NODE_ENV === 'development') {
      // TypeScript workaround for Prisma's event system
      // There's a known type issue with Prisma's $on method for 'query' events
      // We create a type assertion to properly type the event handler
      // See: https://github.com/prisma/prisma/issues/19463
      const prismaWithEvents = this as PrismaClient & {
        $on(event: 'query', callback: (e: Prisma.QueryEvent) => void): void;
      };
      prismaWithEvents.$on('query', (e: Prisma.QueryEvent) => {
        this.logger.debug(
          {
            query: e.query,
            params: e.params,
            duration: `${e.duration}ms`,
          },
          'Prisma Query',
        );
      });
    }
  }

  async onModuleInit(): Promise<void> {
    await this.connectWithRetry();
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.isConnected = false;
      this.logger.info('Prisma disconnected successfully');
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error({ err: error }, 'Error during Prisma disconnect');
      } else {
        this.logger.error('Error during Prisma disconnect with unknown error');
      }
    }
  }

  /**
   * Connect to database with retry logic
   */
  private async connectWithRetry(): Promise<void> {
    const { maxRetries, initialDelay, maxDelay, factor } = this.connectionRetryOptions;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.connectionAttempts = attempt;
        this.logger.info(`Attempting database connection (attempt ${attempt}/${maxRetries})...`);

        await this.$connect();

        this.isConnected = true;
        this.connectionAttempts = 0;
        this.logger.info('Prisma connected successfully');
        return;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;

        if (error instanceof Error) {
          this.logger.error(
            { err: error, attempt, maxRetries },
            `Database connection attempt ${attempt} failed`,
          );
        } else {
          this.logger.error(
            { attempt, maxRetries },
            `Database connection attempt ${attempt} failed with unknown error`,
          );
        }

        if (isLastAttempt) {
          this.logger.error('Max connection retries reached. Unable to connect to database.');
          throw error;
        }

        // Calculate next delay with exponential backoff
        const nextDelay = Math.min(delay * factor, maxDelay);
        this.logger.info(`Retrying database connection in ${delay}ms...`);

        await this.sleep(delay);
        delay = nextDelay;
      }
    }
  }

  /**
   * Helper method for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute a query with automatic retry on connection errors
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    const maxRetries = 3;
    const retryDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check connection health before executing
        if (!this.isConnected) {
          this.logger.warn('Database connection lost. Attempting to reconnect...');
          await this.connectWithRetry();
        }

        return await operation();
      } catch (error) {
        const isConnectionError = this.isConnectionError(error);
        const isLastAttempt = attempt === maxRetries;

        if (error instanceof Error) {
          this.logger.error(
            { err: error, attempt, operation: operationName },
            `Operation failed: ${operationName}`,
          );
        }

        if (!isConnectionError || isLastAttempt) {
          throw error;
        }

        this.isConnected = false;
        this.logger.info(`Retrying operation ${operationName} in ${retryDelay}ms...`);
        await this.sleep(retryDelay);
      }
    }

    throw new Error(`Operation ${operationName} failed after ${maxRetries} attempts`);
  }

  /**
   * Check if error is a connection error
   */
  private isConnectionError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const connectionErrorPatterns = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'Connection terminated',
      'Connection lost',
      'Database connection failed',
      'P1001', // Prisma connection error code
    ];

    return connectionErrorPatterns.some(
      (pattern) => error.message.includes(pattern) || error.name.includes(pattern),
    );
  }

  // Override transaction method with retry logic
  async executeTransaction<T>(fn: (prisma: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.executeWithRetry(
      () =>
        this.$transaction(fn, {
          maxWait: 5000, // 5 seconds
          timeout: 10_000, // 10 seconds
        }),
      'transaction',
    );
  }

  // Helper method to get a clean client instance
  getClient(): PrismaClient {
    return this;
  }

  // Enhanced health check method with retry
  async healthCheck(): Promise<boolean> {
    try {
      await this.executeWithRetry(() => this.$queryRaw`SELECT 1`, 'healthCheck');
      return true;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error({ err: error }, 'Database health check failed');
      } else {
        this.logger.error('Database health check failed with unknown error');
      }
      return false;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    connectionAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      connectionAttempts: this.connectionAttempts,
    };
  }
}
