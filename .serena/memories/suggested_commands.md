# Essential Commands for NestJS Backend Base

## Development Commands

```bash
# Install dependencies
yarn install

# Run development server with hot reload
yarn start:dev

# Run with debugging
yarn start:debug

# Build for production
yarn build

# Run production build
yarn start:prod
```

## Testing Commands

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:cov

# Run specific test groups
yarn test:unit              # Unit tests only
yarn test:integration       # Integration tests only

# Debug tests
yarn test:debug

# Run a single test file
yarn test <path-to-test-file>
```

## Code Quality Commands

```bash
# Lint code (auto-fix enabled)
yarn lint

# Format code with Prettier
yarn format

# Type checking (implicit with build)
yarn build
```

## Database Commands

```bash
# Generate Prisma client
yarn prisma:generate

# Run migrations
yarn prisma:migrate

# Open Prisma Studio (DB GUI)
yarn prisma:studio

# Environment-specific commands
yarn prisma:generate:dev    # Uses .env.development
yarn prisma:generate:test   # Uses .env.testing
```

## Git Hooks

```bash
# Install/reinstall git hooks
yarn hooks:install
```

## System Commands (macOS/Darwin)

- `ls`: List files
- `cd`: Change directory
- `rg`: Fast search (ripgrep) - preferred over grep
- `find`: Find files
- `git`: Version control
