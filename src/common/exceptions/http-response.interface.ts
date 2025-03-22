/**
 * Standardized HTTP response interface for consistent API responses
 * Both success and error responses follow this structure
 */
export interface HttpResponse<T = any> {
  /**
   * Status of the response (success or error)
   */
  status: 'success' | 'error';

  /**
   * HTTP status code
   */
  statusCode: number;

  /**
   * Response message
   */
  message: string;

  /**
   * Optional error code for client-side error handling
   * Present only for error responses
   */
  errorCode?: string;

  /**
   * Response data
   * For success responses: the requested data
   * For error responses: additional error details (if any)
   */
  data?: T;

  /**
   * Optional timestamp of the response
   */
  timestamp: string;

  /**
   * Optional correlation ID for request tracing
   */
  correlationId?: string;

  /**
   * Optional validation errors
   * Present only for validation error responses
   */
  errors?: Record<string, string[]>;
}
