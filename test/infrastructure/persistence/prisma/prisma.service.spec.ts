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
  };

  beforeEach(async () => {
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

    it('should throw error when connection fails', async () => {
      const error = new Error('Connection failed');
      (service.$connect as jest.Mock).mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        { err: error },
        'Failed to connect to the database',
      );
    });

    it('should handle non-Error exceptions', async () => {
      const error = 'String error';
      (service.$connect as jest.Mock).mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toEqual(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to the database with unknown error',
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

      const result = await service.executeTransaction(mockFn);

      expect(service.$transaction).toHaveBeenCalledWith(mockFn);
      expect(mockFn).toHaveBeenCalledWith(service);
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
});
