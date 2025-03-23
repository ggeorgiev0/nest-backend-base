# Test Groups Documentation

This project uses Jest test groups to organize and run tests efficiently. Groups allow you to categorize tests and run specific subsets of tests based on their purpose.

## Available Groups

The following test groups are defined:

- **unit**: Unit tests that test components in isolation
- **integration**: Integration tests that test interactions between components
- **e2e**: End-to-end tests that test the system as a whole (configured separately in jest-e2e.json)

## How to Use Test Groups

### Marking Tests with Groups

Add a docblock comment at the top of your test file to specify which group(s) it belongs to:

```typescript
/**
 * @group unit
 */
describe('AppService', () => {
  // Unit tests...
});
```

For multiple groups:

```typescript
/**
 * @group unit
 * @group critical
 */
describe('AuthService', () => {
  // Tests that belong to both unit and critical groups
});
```

### Running Specific Test Groups

Use the npm scripts defined in package.json:

```bash
# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run unit tests in watch mode
npm run test:unit:watch

# Run integration tests in watch mode
npm run test:integration:watch

# Run all tests sequentially
npm run test:all

# Run all tests in parallel
npm run test:all:parallel
```

Or use the Jest CLI directly:

```bash
# Run tests with a specific group
jest --group=unit

# Run tests with multiple groups
jest --group=unit,critical

# Exclude a group
jest --group=unit --group=^slow
```

## Best Practices

1. Every test file should have at least one group tag
2. Unit tests should always have the `unit` group
3. Integration tests should always have the `integration` group
4. Consider adding additional groups for critical paths, slow tests, etc.
5. Keep test files focused on a single type of testing to avoid confusion
