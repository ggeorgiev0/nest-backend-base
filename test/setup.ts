import { getMockConfig } from './utils/config-mocks';

// Set mock environment variables for all tests
const mockConfig = getMockConfig();
for (const [key, value] of Object.entries(mockConfig)) {
  process.env[key] = String(value);
}
