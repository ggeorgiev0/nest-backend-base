/**
 * Common database-related type definitions
 */

/**
 * Generic database error types
 */
export interface DatabaseError {
  code?: string;
  message: string;
  detail?: string;
  hint?: string;
  position?: string;
  internalPosition?: string;
  internalQuery?: string;
  where?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
  file?: string;
  line?: string;
  routine?: string;
}

/**
 * Prisma-specific error extensions
 */
export interface PrismaErrorExtensions {
  code?: string;
  clientVersion?: string;
  meta?: Record<string, unknown>;
  batchRequestIdx?: number;
}

/**
 * Extended database error with Prisma-specific fields
 */
export interface ExtendedDatabaseError extends DatabaseError {
  extensions?: PrismaErrorExtensions;
}

/**
 * Type guard to check if an error is a database error
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Database query event types for logging and monitoring
 */
export interface DatabaseQueryEvent {
  query: string;
  params?: string;
  duration?: number | string;
  timestamp?: Date;
}

/**
 * Database connection status
 */
export type DatabaseConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * Database health check result
 */
export interface DatabaseHealthCheckResult {
  status: DatabaseConnectionStatus;
  message?: string;
  latency?: number;
}
