/**
 * Standardized HTTP response interface for consistent API responses
 * Both success and error responses follow this structure
 */
export interface HttpResponse {
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
   * ISO string timestamp of when the response was generated
   */
  timestamp: string;

  /**
   * Optional error code for client-side error handling
   * Present only for error responses
   */
  errorCode?: string;

  /**
   * Optional correlation ID for request tracing
   */
  correlationId?: string;

  /**
   * Optional object containing validation errors
   * Keys are field names, values are arrays of error messages
   */
  errors?: Record<string, string[]>;

  /**
   * Optional data payload
   */
  data?: Record<string, unknown>;
}
