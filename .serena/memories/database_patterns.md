# Database Patterns and Prisma Usage

## Database Stack

- **ORM**: Prisma 6.5.0
- **Database**: PostgreSQL 14.x+
- **Real-time**: Supabase integration ready

## Repository Pattern

Always use repositories for data access:

```typescript
// Good - Use repository
const user = await this.usersRepository.findById(id);

// Avoid - Direct Prisma usage outside repositories
const user = await this.prisma.user.findUnique({ where: { id } });
```

## Transaction Handling

Use the transaction helper for multi-step operations:

```typescript
await this.usersRepository.executeTransaction(async (tx) => {
  await tx.user.create({ data: userData });
  await tx.profile.create({ data: profileData });
});
```

## Error Mapping

Database errors must be mapped to domain exceptions:

```typescript
try {
  // database operation
} catch (error) {
  if (error.code === 'P2002') {
    throw new ConflictException('Resource already exists', 'E03001');
  }
  throw new DatabaseException('Operation failed', 'E05001');
}
```

## Prisma Schema

- Located at `prisma/schema.prisma`
- Uses UUID for IDs
- Includes timestamps (createdAt, updatedAt)
- Proper indexes for performance

## Health Checks

Database connectivity monitored via `/health` endpoint
