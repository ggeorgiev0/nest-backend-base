# Task Completion Checklist

When completing any coding task, ensure you:

## 1. Code Quality

- [ ] Run linting: `yarn lint`
- [ ] Run formatting: `yarn format`
- [ ] Build successfully: `yarn build`

## 2. Testing

- [ ] Write/update tests for new functionality
- [ ] Run relevant tests:
  - Unit tests: `yarn test:unit`
  - Integration tests: `yarn test:integration`
  - All tests: `yarn test`
- [ ] Ensure tests pass

## 3. Documentation

- [ ] Update CLAUDE.md if adding new patterns/conventions
- [ ] Add JSDoc comments for public APIs if needed
- [ ] Update README.md for major features

## 4. Git Workflow

- [ ] Follow branch naming: `feature-description-XX`
- [ ] Use conventional commits (feat:, fix:, chore:, etc.)
- [ ] Issue number auto-appended by git hook
- [ ] Create PR with proper description if requested

## 5. Database Changes

- [ ] Generate Prisma client if schema changed: `yarn prisma:generate`
- [ ] Create migration if needed: `yarn prisma:migrate`
- [ ] Test database changes

## Important Notes

- NEVER commit without running lint and tests
- ALWAYS check for TypeScript errors via build
- Log sensitive data is automatically redacted
- Use domain exceptions for error handling
