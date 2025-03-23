/**
 * Application error codes
 * Provides consistent error codes for client-side error handling
 *
 * Format: E{Category}{Specific}
 * - E: Error prefix
 * - Category: Two digits representing error category
 * - Specific: Three digits representing specific error within category
 *
 * Categories:
 * - 01: Validation errors
 * - 02: Authentication errors
 * - 03: Authorization errors
 * - 04: Resource errors (not found, already exists, etc.)
 * - 05: Business logic errors
 * - 06: External service errors
 * - 99: System/unexpected errors
 */
export enum ErrorCode {
  // Validation errors (01)
  VALIDATION_FAILED = 'E01001',
  INVALID_INPUT = 'E01002',
  INVALID_FORMAT = 'E01003',

  // Authentication errors (02)
  UNAUTHORIZED = 'E02001',
  INVALID_CREDENTIALS = 'E02002',
  SESSION_EXPIRED = 'E02003',
  INVALID_TOKEN = 'E02004',

  // Authorization errors (03)
  FORBIDDEN = 'E03001',
  INSUFFICIENT_PERMISSIONS = 'E03002',

  // Resource errors (04)
  RESOURCE_NOT_FOUND = 'E04001',
  RESOURCE_ALREADY_EXISTS = 'E04002',
  RESOURCE_CONFLICT = 'E04003',

  // Business logic errors (05)
  BUSINESS_RULE_VIOLATION = 'E05001',
  INVALID_STATE = 'E05002',
  OPERATION_NOT_ALLOWED = 'E05003',

  // External service errors (06)
  EXTERNAL_SERVICE_ERROR = 'E06001',
  EXTERNAL_SERVICE_TIMEOUT = 'E06002',
  EXTERNAL_SERVICE_UNAVAILABLE = 'E06003',

  // System/unexpected errors (99)
  INTERNAL_SERVER_ERROR = 'E99001',
  NOT_IMPLEMENTED = 'E99002',
  SERVICE_UNAVAILABLE = 'E99003',
}
