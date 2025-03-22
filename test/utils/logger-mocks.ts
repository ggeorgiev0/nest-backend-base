/**
 * Shared mock implementations for logging-related services
 * These mocks are used across test files to maintain consistency
 */

/**
 * Mock for PinoLogger
 */
export const mockPinoLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  setContext: jest.fn(),
};

/**
 * Mock for CustomLoggerService
 */
export const mockCustomLoggerService = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
};

/**
 * Reset all mock functions in both mocks
 * Use in beforeEach to ensure clean test state
 */
export const resetLoggerMocks = (): void => {
  for (const mockFn of Object.values(mockPinoLogger)) mockFn.mockReset();
  for (const mockFn of Object.values(mockCustomLoggerService)) mockFn.mockReset();
};
