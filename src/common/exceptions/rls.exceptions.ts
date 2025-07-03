import { BusinessRuleViolationException } from './domain-exceptions';

/**
 * Exception thrown when RLS identifier validation fails
 */
export class RLSValidationException extends BusinessRuleViolationException {
  constructor(message: string, errorContext?: Record<string, unknown>) {
    super(message, { ...errorContext, errorCode: 'E01003' });
  }
}