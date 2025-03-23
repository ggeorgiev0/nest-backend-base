/**
 * @group integration
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LoggerModule } from 'nestjs-pino';
import supertest from 'supertest';

import { HealthModule } from '@/infrastructure/health/health.module';
import { PrismaModule } from '@/infrastructure/persistence/prisma/prisma.module';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';

const mockPrismaService = {
  $queryRaw: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  healthCheck: jest.fn(),
};

describe('Health Check (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            transport: {
              target: 'pino-pretty',
              options: {
                singleLine: true,
              },
            },
            level: 'silent',
          },
        }),
        HealthModule,
      ],
    })
      .overrideModule(PrismaModule)
      .useModule({
        module: class MockPrismaModule {},
        providers: [
          {
            provide: PrismaService,
            useValue: mockPrismaService,
          },
        ],
        exports: [PrismaService],
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return a healthy status when all checks pass', async () => {
      // Mock the Prisma query to succeed
      mockPrismaService.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const response = await supertest(app.getHttpServer()).get('/health').expect(200);

      // The exact structure may vary based on Terminus version
      // Focus on checking the critical parts
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('info.prisma.status', 'up');

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should return a detailed error response when health check fails', async () => {
      // Mock the Prisma query to fail
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection refused'));

      const response = await supertest(app.getHttpServer()).get('/health').expect(200); // Still returns 200 as per health check standards

      // The exact structure may vary based on Terminus version
      // Focus on checking the critical parts
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body.info.prisma).toHaveProperty('status', 'down');
      expect(response.body.info.prisma.error).toContain('Connection refused');

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });
  });
});
