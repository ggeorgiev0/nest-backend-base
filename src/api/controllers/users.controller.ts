import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { User } from '@prisma/client';

import { CreateUserDto } from '@/api/dtos/users/create-user.dto';
import { UpdateUserDto } from '@/api/dtos/users/update-user.dto';
import { ResourceNotFoundException } from '@/common/exceptions';
import { UsersService } from '@/core/services/users/users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() data: CreateUserDto): Promise<User> {
    return this.usersService.create(data);
  }

  @Get()
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new ResourceNotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: UpdateUserDto): Promise<User> {
    return this.usersService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<User> {
    return this.usersService.remove(id);
  }
}
