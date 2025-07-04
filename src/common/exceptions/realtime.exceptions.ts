import { ExternalServiceException } from './domain-exceptions';

/**
 * Exception thrown when realtime connection fails
 */
export class RealtimeConnectionException extends ExternalServiceException {
  constructor(message: string, errorContext?: Record<string, unknown>) {
    super(message, { ...errorContext, errorCode: 'E04001' });
  }
}

/**
 * Exception thrown when realtime subscription fails
 */
export class RealtimeSubscriptionException extends ExternalServiceException {
  constructor(message: string, errorContext?: Record<string, unknown>) {
    super(message, { ...errorContext, errorCode: 'E04002' });
  }
}

/**
 * Exception thrown when maximum channels limit is reached
 */
export class RealtimeChannelLimitException extends ExternalServiceException {
  constructor(message: string, errorContext?: Record<string, unknown>) {
    super(message, { ...errorContext, errorCode: 'E04003' });
  }
}

/**
 * Exception thrown when realtime operation times out
 */
export class RealtimeTimeoutException extends ExternalServiceException {
  constructor(message: string, errorContext?: Record<string, unknown>) {
    super(message, { ...errorContext, errorCode: 'E04004' });
  }
}
