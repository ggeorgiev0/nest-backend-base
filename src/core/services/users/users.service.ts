import { Injectable } from '@nestjs/common';
import { User, Prisma } from '@prisma/client';

import { UsersRepository } from '@/infrastructure/persistence/repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.usersRepository.create(data);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  async findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOne(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.usersRepository.update(id, data);
  }

  async remove(id: string): Promise<User> {
    return this.usersRepository.remove(id);
  }
}
