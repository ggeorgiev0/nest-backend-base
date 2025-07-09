import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';

import { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  const mockLogger = {
    setContext: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);

    // Mock the Prisma client methods
    service.$connect = jest.fn().mockResolvedValue();
    service.$disconnect = jest.fn().mockResolvedValue();
    service.$queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    service.$transaction = jest.fn().mockImplementation((fn) => fn(service));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should set logger context', () => {
      expect(mockLogger.setContext).toHaveBeenCalledWith('PrismaService');
    });
  });

  describe('onModuleInit', () => {
    it('should connect to database successfully', async () => {
      await service.onModuleInit();

      expect(service.$connect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Prisma connected successfully');
    });

    it('should retry connection on failure', async () => {
      const error = new Error('Connection failed');
      (service.$connect as jest.Mock)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce();

      const initPromise = service.onModuleInit();

      // Advance timers to trigger retries
      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);

      await initPromise;

      expect(service.$connect).toHaveBeenCalledTimes(3);
      expect(mockLogger.info).toHaveBeenCalledWith('Prisma connected successfully');
    });

    it('should throw error after max retries', async () => {
      const error = new Error('Connection failed');
      (service.$connect as jest.Mock).mockRejectedValue(error);

      // We need to simulate the connection with proper promise handling
      const initPromise = service.onModuleInit().catch((error_) => error_);

      // Advance through all retry attempts with exponential backoff
      await jest.advanceTimersByTimeAsync(1000); // First retry
      await jest.advanceTimersByTimeAsync(2000); // Second retry
      await jest.advanceTimersByTimeAsync(4000); // Third retry
      await jest.advanceTimersByTimeAsync(8000); // Fourth retry
      await jest.advanceTimersByTimeAsync(16_000); // Fifth retry

      const result = await initPromise;
      expect(result).toEqual(error);
      expect(service.$connect).toHaveBeenCalledTimes(5);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Max connection retries reached. Unable to connect to database.',
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database successfully', async () => {
      await service.onModuleDestroy();

      expect(service.$disconnect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Prisma disconnected successfully');
    });

    it('should handle disconnect errors gracefully', async () => {
      const error = new Error('Disconnect failed');
      (service.$disconnect as jest.Mock).mockRejectedValue(error);

      await service.onModuleDestroy();

      expect(mockLogger.error).toHaveBeenCalledWith(
        { err: error },
        'Error during Prisma disconnect',
      );
    });

    it('should handle non-Error exceptions during disconnect', async () => {
      const error = 'String error';
      (service.$disconnect as jest.Mock).mockRejectedValue(error);

      await service.onModuleDestroy();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during Prisma disconnect with unknown error',
      );
    });
  });

  describe('executeTransaction', () => {
    it('should execute transaction successfully', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      (service.$transaction as jest.Mock).mockImplementation((fn, _options) => fn(service));

      const result = await service.executeTransaction(mockFn);

      expect(service.$transaction).toHaveBeenCalledWith(mockFn, {
        maxWait: 5000,
        timeout: 10_000,
      });
      expect(mockFn).toHaveBeenCalledWith(service);
      expect(result).toBe('result');
    });

    it('should retry transaction on connection error', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const connectionError = new Error('ECONNREFUSED');

      (service.$transaction as jest.Mock)
        .mockRejectedValueOnce(connectionError)
        .mockImplementationOnce((fn) => fn(service));

      // Mock the connect method for retry
      (service.$connect as jest.Mock).mockResolvedValue();

      const transactionPromise = service.executeTransaction(mockFn);

      // Advance timer for retry delay
      await jest.advanceTimersByTimeAsync(1000);

      const result = await transactionPromise;

      expect(service.$transaction).toHaveBeenCalledTimes(2);
      expect(result).toBe('result');
    });
  });

  describe('getClient', () => {
    it('should return the service instance', () => {
      const client = service.getClient();

      expect(client).toBe(service);
    });
  });

  describe('healthCheck', () => {
    it('should return true when database is healthy', async () => {
      const result = await service.healthCheck();

      expect(service.$queryRaw).toHaveBeenCalledWith(['SELECT 1']);
      expect(result).toBe(true);
    });

    it('should return false when database is unhealthy', async () => {
      const error = new Error('Database error');
      (service.$queryRaw as jest.Mock).mockRejectedValue(error);

      const result = await service.healthCheck();

      expect(mockLogger.error).toHaveBeenCalledWith({ err: error }, 'Database health check failed');
      expect(result).toBe(false);
    });

    it('should handle non-Error exceptions in health check', async () => {
      const error = 'String error';
      (service.$queryRaw as jest.Mock).mockRejectedValue(error);

      const result = await service.healthCheck();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database health check failed with unknown error',
      );
      expect(result).toBe(false);
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connection status', () => {
      const status = service.getConnectionStatus();

      expect(status).toEqual({
        isConnected: false,
        connectionAttempts: 0,
      });
    });

    it('should return updated status after successful connection', async () => {
      await service.onModuleInit();

      const status = service.getConnectionStatus();

      expect(status).toEqual({
        isConnected: true,
        connectionAttempts: 0,
      });
    });
  });
});
