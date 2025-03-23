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
 * Maximum depth for recursive sanitization to prevent stack overflow
 */
const MAX_SANITIZE_DEPTH = 10;

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

  /**
   * Custom masking function to use for sensitive values
   * If provided, this will be used instead of the mask string
   * @param value The original value to mask
   * @param key The key of the value being masked
   * @returns The masked value
   */
  maskFunction?: (value: unknown, key: string) => unknown;
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
 * Creates a masked object with the same shape as the original
 * Preserves structure while masking all values
 */
function createMaskedObjectWithSameShape(obj: Record<string, unknown>, mask: string): unknown {
  if (Array.isArray(obj)) {
    return obj.map(() => mask);
  }

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    result[key] =
      value && typeof value === 'object'
        ? createMaskedObjectWithSameShape(value as Record<string, unknown>, mask)
        : mask;
  }

  return result;
}

/**
 * Process a sensitive field by applying appropriate masking
 */
function processSensitiveField(
  value: unknown,
  mask: string,
  maskFunction?: (value: unknown, key: string) => unknown,
  key?: string,
): unknown {
  if (maskFunction) {
    return maskFunction(value, key || '');
  }

  if (Array.isArray(value)) {
    return value.map(() => mask);
  }

  if (typeof value === 'object' && value !== null) {
    return createMaskedObjectWithSameShape(value as Record<string, unknown>, mask);
  }

  return mask;
}

/**
 * Recursively sanitize an object, masking sensitive fields
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
    maskFunction,
  } = options;

  // Prevent stack overflow with a max depth check
  if (currentDepth > maxDepth) {
    return obj;
  }

  // Handle non-objects
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Combine default and custom sensitive fields
  const sensitiveFields = [...SENSITIVE_FIELDS, ...customSensitiveFields];

  // Handle arrays with recursive sanitization
  if (Array.isArray(obj)) {
    return obj.map((item: unknown) =>
      sanitizeObject(item, {
        customSensitiveFields,
        mask,
        maxDepth,
        currentDepth: currentDepth + 1,
        maskFunction,
      }),
    ) as unknown as T;
  }

  return sanitizeObjectRecord(obj as Record<string, unknown>, sensitiveFields, {
    customSensitiveFields,
    mask,
    maxDepth,
    currentDepth,
    maskFunction,
  }) as T;
}

/**
 * Helper function to sanitize record objects
 * Extracted to reduce cognitive complexity
 */
function sanitizeObjectRecord(
  obj: Record<string, unknown>,
  sensitiveFields: string[],
  options: SanitizeOptions,
): Record<string, unknown> {
  const {
    customSensitiveFields = [],
    mask = DEFAULT_MASK,
    maxDepth = MAX_SANITIZE_DEPTH,
    currentDepth = 0,
    maskFunction,
  } = options;

  const result = { ...obj };

  for (const key of Object.keys(result)) {
    // Check if this key contains any sensitive field name
    const isSensitive = isSensitiveField(key, sensitiveFields);
    const value = result[key];

    if (isSensitive) {
      result[key] = processSensitiveField(value, mask, maskFunction, key);
    } else if (value && typeof value === 'object') {
      // Recursively sanitize non-sensitive fields
      result[key] = sanitizeObject(value, {
        customSensitiveFields,
        mask,
        maxDepth,
        currentDepth: currentDepth + 1,
        maskFunction,
      });
    }
  }

  return result;
}

/**
 * Sanitize only the top level properties of an object
 * Use this for better performance when deep sanitization is not needed
 * or when working with large objects
 *
 * @param obj Object to sanitize
 * @param options Sanitization options
 * @returns Sanitized object with sensitive fields masked
 */
export function sanitizeObjectShallow<T>(obj: T, options: SanitizeOptions = {}): T {
  const { customSensitiveFields = [], mask = DEFAULT_MASK, maskFunction } = options;

  // Handle non-objects
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Combine default and custom sensitive fields
  const sensitiveFields = [...SENSITIVE_FIELDS, ...customSensitiveFields];

  // Handle arrays - only sanitize strings
  if (Array.isArray(obj)) {
    return obj.map((item: unknown) => {
      const isSensitiveString =
        typeof item === 'string' &&
        sensitiveFields.some((field) => item.toLowerCase().includes(field.toLowerCase()));

      if (isSensitiveString) {
        return maskFunction ? maskFunction(item, 'array-item') : mask;
      }

      return item;
    }) as unknown as T;
  }

  // Handle objects - only sanitize top level
  const result = { ...obj } as Record<string, unknown>;

  for (const key of Object.keys(result)) {
    // Check if this key contains any sensitive field name
    const isSensitive = isSensitiveField(key, sensitiveFields);

    if (isSensitive) {
      const value = result[key];
      if (maskFunction) {
        // Use custom masking function if provided
        result[key] = maskFunction(value, key);
      } else if (Array.isArray(value)) {
        // Replace each array element with mask to preserve array structure
        result[key] = value.map(() => mask);
      } else if (typeof value === 'object' && value !== null) {
        // For objects at this level, apply a shallow mask
        result[key] = mask;
      } else {
        // For primitive values, simply mask
        result[key] = mask;
      }
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
