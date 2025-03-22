/**
 * Utility functions for handling sensitive data in error responses
 */
import { SENSITIVE_FIELDS } from '../constants/sensitive-fields.constants';

/**
 * Default mask for sensitive values
 */
const DEFAULT_MASK = '[REDACTED]';

/**
 * Check if a field name contains a sensitive key
 * @param key Field name to check
 * @returns Boolean indicating if field is sensitive
 */
export const isSensitiveField = (key: string): boolean => {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()));
};

/**
 * Sanitize an object by masking sensitive fields
 * @param obj Object to sanitize
 * @param customSensitiveFields Additional field names to consider sensitive
 * @param mask Custom mask value
 * @returns Sanitized object with sensitive fields masked
 */
export const sanitizeObject = <T extends Record<string, any>>(
  obj: T,
  customSensitiveFields: string[] = [],
  mask: string = DEFAULT_MASK,
): Record<string, any> => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result: Record<string, any> = { ...obj };
  const sensitiveFields = [...SENSITIVE_FIELDS, ...customSensitiveFields];

  for (const key of Object.keys(result)) {
    // Check if this key contains any sensitive field name
    const isSensitive = sensitiveFields.some((field) =>
      key.toLowerCase().includes(field.toLowerCase()),
    );

    if (isSensitive) {
      // Mask sensitive field
      result[key] = mask;
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      // Recursively sanitize nested objects
      result[key] = Array.isArray(result[key])
        ? result[key].map((item: any) =>
            typeof item === 'object' && item !== null
              ? sanitizeObject(item, customSensitiveFields, mask)
              : item,
          )
        : sanitizeObject(result[key], customSensitiveFields, mask);
    }
  }

  return result as T;
};
