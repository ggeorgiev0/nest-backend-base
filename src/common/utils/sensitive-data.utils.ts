/**
 * Unified utilities for handling sensitive data in logs and error responses
 */
import { SENSITIVE_FIELDS } from '../constants/sensitive-fields.constants';

/**
 * Default mask for sensitive values
 */
const DEFAULT_MASK = '[REDACTED]';

/**
 * Default maximum depth for object traversal
 */
const DEFAULT_MAX_DEPTH = 10;

/**
 * Options for sanitizing objects
 */
export interface SanitizeOptions {
  /**
   * Additional field names to consider sensitive
   */
  customSensitiveFields?: string[];

  /**
   * Custom mask value to replace sensitive data with
   */
  mask?: string;

  /**
   * Maximum depth for recursive sanitization
   * Used to prevent stack overflow on large circular objects
   */
  maxDepth?: number;

  /**
   * Current depth in the recursion
   * @internal Used internally - don't set this manually
   */
  currentDepth?: number;
}

/**
 * Check if a field name contains a sensitive key
 * @param key Field name to check
 * @param sensitiveFields List of sensitive field names to check against
 * @returns Boolean indicating if field is sensitive
 */
export const isSensitiveField = (
  key: string,
  sensitiveFields: string[] = SENSITIVE_FIELDS,
): boolean => {
  const lowerKey = key.toLowerCase();
  return sensitiveFields.some((field) => lowerKey.includes(field.toLowerCase()));
};

/**
 * Sanitize an object by masking sensitive fields
 *
 * @param obj Object to sanitize
 * @param options Sanitization options
 * @returns Sanitized object with sensitive fields masked
 */
export function sanitizeObject<T>(obj: T, options: SanitizeOptions = {}): T {
  const {
    customSensitiveFields = [],
    mask = DEFAULT_MASK,
    maxDepth = DEFAULT_MAX_DEPTH,
    currentDepth = 0,
  } = options;

  // Handle non-objects and depth limit
  if (!obj || typeof obj !== 'object' || currentDepth >= maxDepth) {
    return obj;
  }

  // Combine default and custom sensitive fields
  const sensitiveFields = [...SENSITIVE_FIELDS, ...customSensitiveFields];

  // Handle arrays
  if (Array.isArray(obj)) {
    const result = obj.map((item) =>
      typeof item === 'object' && item !== null
        ? sanitizeObject(item, {
            customSensitiveFields,
            mask,
            maxDepth,
            currentDepth: currentDepth + 1,
          })
        : item,
    ) as T;
    return result;
  }

  // Handle objects
  const result = { ...obj } as Record<string, unknown>;

  for (const key of Object.keys(result)) {
    // Check if this key contains any sensitive field name
    const isSensitive = isSensitiveField(key, sensitiveFields);

    if (isSensitive) {
      // Mask sensitive field while preserving type
      const value = result[key];
      if (Array.isArray(value)) {
        // Replace each array element with mask to preserve array structure
        result[key] = value.map(() => mask);
      } else if (typeof value === 'object' && value !== null) {
        // For objects, apply a recursive sanitization with increased depth
        result[key] = sanitizeObject(value, {
          customSensitiveFields,
          mask,
          maxDepth,
          currentDepth: currentDepth + 1,
        });
      } else {
        // For primitive values, simply mask
        result[key] = mask;
      }
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      // Recursively sanitize nested objects
      result[key] = sanitizeObject(result[key] as Record<string, unknown>, {
        customSensitiveFields,
        mask,
        maxDepth,
        currentDepth: currentDepth + 1,
      });
    }
  }

  return result as T;
}

/**
 * Pick only the safe fields from an object to log
 *
 * Use this when you want to explicitly choose which fields to include
 * rather than filtering out sensitive ones
 *
 * @param obj Object to extract safe fields from
 * @param safeFields Array of field names that are safe to include
 * @returns A new object containing only the specified safe fields
 */
export function pickSafeFields<T, K extends keyof T>(obj: T, safeFields: K[]): Pick<T, K> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return {} as Pick<T, K>;
  }

  const result = {} as Pick<T, K>;

  for (const field of safeFields) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }

  return result;
}

/**
 * Backward compatibility with the old API
 * @deprecated Use the new sanitizeObject function instead
 */
export function sanitizeObjectLegacy<T extends Record<string, unknown>>(
  obj: T,
  customSensitiveFields: string[] = [],
  mask = DEFAULT_MASK,
): T {
  return sanitizeObject(obj, { customSensitiveFields, mask });
}
