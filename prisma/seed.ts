import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const logger = new PrismaClient().$use(async (params: any, next: any) => {
    const result = await next(params);
    return result;
  }) as any;

  logger.info = (message: string) => console.log(`[SEED] ${message}`);
  logger.error = (message: string, error?: any) => console.error(`[SEED ERROR] ${message}`, error);

  logger.info('Starting seed...');

  try {
    // Use transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Create test users
      const users = [
        {
          email: 'admin@example.com',
          name: 'Admin User',
        },
        {
          email: 'user1@example.com',
          name: 'Test User 1',
        },
        {
          email: 'user2@example.com',
          name: 'Test User 2',
        },
      ];

      for (const userData of users) {
        const user = await tx.user.upsert({
          where: { email: userData.email },
          update: {},
          create: userData,
        });
        logger.info(`Created/Updated user: ${user.email}`);
      }
    });

    logger.info('Seed completed successfully');
  } catch (error) {
    logger.error('Transaction failed during seed', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });