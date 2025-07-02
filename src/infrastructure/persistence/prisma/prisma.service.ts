import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
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
    });

    // Set the logger context
    this.logger.setContext('PrismaService');

    if (process.env.NODE_ENV === 'development') {
      // TypeScript workaround for Prisma's event system
      // There's a known type issue with Prisma's $on method for 'query' events
      // We use (this as any) to bypass TypeScript's type checking while still
      // maintaining type safety for the event object with Prisma.QueryEvent
      // See: https://github.com/prisma/prisma/issues/19463
      (this as any).$on('query', (e: Prisma.QueryEvent) => {
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

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.info('Prisma connected successfully');
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error({ err: error }, 'Failed to connect to the database');
      } else {
        this.logger.error('Failed to connect to the database with unknown error');
      }
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.info('Prisma disconnected successfully');
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error({ err: error }, 'Error during Prisma disconnect');
      } else {
        this.logger.error('Error during Prisma disconnect with unknown error');
      }
    }
  }

  // Helper method for transaction handling
  async executeTransaction<T>(fn: (prisma: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.$transaction(fn);
  }

  // Helper method to get a clean client instance
  getClient(): PrismaClient {
    return this;
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
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
}
