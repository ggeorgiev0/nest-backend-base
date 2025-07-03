import { Injectable } from '@nestjs/common';
import { User, Prisma } from '@prisma/client';

import { CreateUserDto } from '@/api/dtos/users/create-user.dto';
import { UpdateUserDto } from '@/api/dtos/users/update-user.dto';
import { UsersRepository } from '@/infrastructure/persistence/repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  async create(data: CreateUserDto): Promise<User> {
    const createData: Prisma.UserCreateInput = {
      name: data.name,
      email: data.email,
    };
    return this.usersRepository.create(createData);
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

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const updateData: Prisma.UserUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    return this.usersRepository.update(id, updateData);
  }

  async remove(id: string): Promise<User> {
    return this.usersRepository.remove(id);
  }
}
