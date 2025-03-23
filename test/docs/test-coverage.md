# Test Coverage Documentation

This project uses Jest's built-in coverage reporting to track test coverage across the codebase. Coverage reports help identify areas of code that aren't adequately tested.

## Running Coverage Reports

To generate a coverage report, run:

```bash
yarn test:cov
```

This will run all tests and generate a coverage report in the `coverage` directory.

## Coverage Reports

The following coverage reports are generated:

- **Text**: Console output showing coverage statistics
- **HTML**: Interactive HTML report in `coverage/lcov-report/index.html`
- **LCOV**: Machine-readable format for CI tools in `coverage/lcov.info`
- **JSON**: Detailed JSON report in `coverage/coverage-final.json`

## Coverage Configuration

The coverage configuration is defined in `test/jest-config.json`:

```json
"collectCoverageFrom": [
  "src/**/*.(t|j)s",
  "!src/**/*.module.ts",
  "!src/**/*.dto.ts",
  "!src/**/*.entity.ts",
  "!src/**/*.interface.ts",
  "!src/**/index.ts",
  "!src/**/*.mock.ts",
  "!src/main.ts",
  "!src/**/dtos/**",
  "!src/**/interfaces/**",
  "!src/**/constants/**",
  "!src/**/*.config.ts",
  "!src/**/types/**"
],
```

This configuration excludes certain files that typically don't need testing, such as modules, DTOs, interfaces, constants, and configuration files.

## Coverage Thresholds

Coverage thresholds define the minimum acceptable coverage levels for the codebase. The thresholds are currently set to 0% to allow the build to pass while the test suite is being developed.

As the test suite matures, these thresholds should be adjusted to enforce higher coverage standards:

```json
"coverageThreshold": {
  "global": {
    "statements": 0,
    "branches": 0,
    "functions": 0,
    "lines": 0
  }
}
```

### Recommended Future Thresholds

Once the test suite is more complete, update the thresholds to more appropriate values:

```json
"coverageThreshold": {
  "global": {
    "statements": 80,
    "branches": 70,
    "functions": 80,
    "lines": 80
  }
}
```

You can also set thresholds for specific files or directories:

```json
"coverageThreshold": {
  "global": {
    "statements": 60,
    "branches": 50,
    "functions": 60,
    "lines": 60
  },
  "src/core/": {
    "statements": 90,
    "branches": 80,
    "functions": 90,
    "lines": 90
  },
  "src/api/": {
    "statements": 80,
    "branches": 70,
    "functions": 80,
    "lines": 80
  }
}
```

## Understanding Coverage Metrics

- **Statements**: Percentage of statements executed
- **Branches**: Percentage of control flow branches executed (if/else, switch, etc.)
- **Functions**: Percentage of functions called
- **Lines**: Percentage of executable lines executed

## Improving Coverage

To improve test coverage:

1. Start by focusing on critical business logic
2. Use the HTML report to identify untested code
3. Write tests for uncovered functionality
4. Add tests for edge cases and error handling
5. Focus on improving branch coverage in complex conditionals

## CI Integration

The coverage report is designed to integrate with CI systems. The LCOV format is particularly useful for tools like SonarQube, Codecov, or Coveralls.

For CI integration, ensure the CI script includes the coverage command:

```yaml
- name: Run tests with coverage
  run: yarn test:cov
```
