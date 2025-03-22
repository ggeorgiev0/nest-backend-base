/**
 * Utilities for logging safely with sensitive data handling
 */

/**
 * List of common field names that might contain sensitive information
 * This is used for the sanitizeObject utility function
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'api_key',
  'secret',
  'privateKey',
  'private_key',
  'authorization',
  'email',
  'phone',
  'ssn',
  'creditCard',
  'cardNumber',
];

/**
 * Sanitize an object by removing known sensitive fields
 *
 * Use this when you need to manually sanitize an object before logging
 * Note: The pino redaction filter still applies as a safety net, but
 * it's better to sanitize objects explicitly when possible
 *
 * @param obj Object to sanitize
 * @param additionalFields Optional additional field names to redact
 * @returns A new object with sensitive information removed
 */
export function sanitizeObject<T>(obj: T, additionalFields: string[] = []): Partial<T> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const fieldsToRedact = [...SENSITIVE_FIELDS, ...additionalFields];
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (fieldsToRedact.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      // Replace sensitive fields with [REDACTED]
      (result as any)[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      // Recursively sanitize nested objects
      (result as any)[key] = sanitizeObject(value, additionalFields);
    } else {
      // Copy non-sensitive fields as-is
      (result as any)[key] = value;
    }
  }

  return result;
}

/**
 * Pick only the safe fields from an object to log
 *
 * Use this when you want to explicitly choose which fields to include
 * in logs rather than filtering out sensitive ones
 *
 * @param obj Object to extract safe fields from
 * @param safeFields Array of field names that are safe to log
 * @returns A new object containing only the specified safe fields
 */
export function pickSafeFields<T, K extends keyof T>(obj: T, safeFields: K[]): Pick<T, K> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj as any;
  }

  const result = {} as Pick<T, K>;

  for (const field of safeFields) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }

  return result;
}
