import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from '@infrastructure/persistence/repositories/users.repository';
import { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let prismaService: PrismaService;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
  };

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    executeTransaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createInput: Prisma.UserCreateInput = {
        email: 'new@example.com',
        name: 'New User',
      };

      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await repository.create(createInput);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: createInput,
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const mockUsers = [mockUser, { ...mockUser, id: '2', email: 'user2@example.com' }];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await repository.findAll();

      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when no users exist', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should find a user by id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findOne(mockUser.id);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await repository.findOne('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findByEmail(mockUser.email);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateInput: Prisma.UserUpdateInput = {
        name: 'Updated Name',
      };
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await repository.update(mockUser.id, updateInput);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: updateInput,
      });
      expect(result).toEqual(updatedUser);
    });

    it('should handle update errors', async () => {
      const updateInput: Prisma.UserUpdateInput = { name: 'Updated' };
      const error = new Error('Update failed');
      
      mockPrismaService.user.update.mockRejectedValue(error);

      await expect(repository.update('non-existent', updateInput))
        .rejects.toThrow(error);
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      const result = await repository.remove(mockUser.id);

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toEqual(mockUser);
    });

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed');
      mockPrismaService.user.delete.mockRejectedValue(error);

      await expect(repository.remove('non-existent'))
        .rejects.toThrow(error);
    });
  });

  describe('createWithTransaction', () => {
    it('should create user within a transaction', async () => {
      const createInput: Prisma.UserCreateInput = {
        email: 'transaction@example.com',
        name: 'Transaction User',
      };

      const mockTx = {
        user: {
          create: jest.fn().mockResolvedValue(mockUser),
        },
      };

      mockPrismaService.executeTransaction.mockImplementation(async (fn) => {
        return fn(mockTx);
      });

      const result = await repository.createWithTransaction(createInput);

      expect(mockPrismaService.executeTransaction).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(mockTx.user.create).toHaveBeenCalledWith({ data: createInput });
      expect(result).toEqual(mockUser);
    });

    it('should rollback transaction on error', async () => {
      const createInput: Prisma.UserCreateInput = {
        email: 'fail@example.com',
        name: 'Fail User',
      };

      const error = new Error('Transaction failed');
      mockPrismaService.executeTransaction.mockRejectedValue(error);

      await expect(repository.createWithTransaction(createInput))
        .rejects.toThrow(error);
    });
  });

  describe('error handling', () => {
    it('should propagate Prisma errors', async () => {
      const prismaError = new Error('P2002: Unique constraint violation');
      mockPrismaService.user.create.mockRejectedValue(prismaError);

      await expect(repository.create({ email: 'duplicate@example.com' }))
        .rejects.toThrow(prismaError);
    });
  });
});