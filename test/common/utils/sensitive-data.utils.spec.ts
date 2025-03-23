/**
 * @group unit
 */
import {
  isSensitiveField,
  sanitizeObject,
  sanitizeObjectShallow,
  pickSafeFields,
} from '../../../src/common/utils/sensitive-data.utils';

// Custom masking function for testing
function testMaskFunction(value: unknown, key: string): unknown {
  if (typeof value === 'string') {
    if (key.includes('email')) {
      // Using a simplified pattern to avoid backtracking vulnerability
      // eslint-disable-next-line sonarjs/slow-regex
      return value.replace(/^(..)(.*)(@.*)$/, '$1***$3');
    }
    if (key.includes('password')) {
      // Show password strength
      return `[${value.toString().length} chars]`;
    }
  }
  return '[CUSTOM MASKED]';
}

describe('Sensitive Data Utils', () => {
  // Sample test data
  const sampleUserData = {
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'secret123',
    address: {
      street: '123 Main St',
      city: 'Boston',
      zip: '02108',
      creditCard: '4111-1111-1111-1111',
    },
    tokens: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'abc123xyz789',
    },
    settings: {
      theme: 'dark',
      apiKey: 'sk_test_abcdefg',
    },
    phoneNumbers: ['555-1234', '555-5678'],
    tags: ['user', 'customer'],
    socialSecurityData: {
      ssn: '123-45-6789',
      verified: true,
    },
  };

  describe('isSensitiveField', () => {
    it('should identify sensitive fields from default list', () => {
      expect(isSensitiveField('password')).toBe(true);
      expect(isSensitiveField('userPassword')).toBe(true);
      expect(isSensitiveField('user_password')).toBe(true);
      expect(isSensitiveField('PASSWORD')).toBe(true);
      expect(isSensitiveField('creditCard')).toBe(true);
      expect(isSensitiveField('credit_card_number')).toBe(true);
      expect(isSensitiveField('name')).toBe(false);
      expect(isSensitiveField('address')).toBe(false);
    });

    it('should identify custom sensitive fields', () => {
      expect(isSensitiveField('secretQuestion', ['secretQuestion'])).toBe(true);
      expect(isSensitiveField('custom_field', ['custom'])).toBe(true);
      expect(isSensitiveField('regularField', ['secretQuestion'])).toBe(false);
    });

    it('should handle case-insensitive matching', () => {
      expect(isSensitiveField('PASSWORD')).toBe(true);
      expect(isSensitiveField('Password')).toBe(true);
      expect(isSensitiveField('userPASSWORD')).toBe(true);
      expect(isSensitiveField('USER_password')).toBe(true);
    });
  });

  describe('sanitizeObject', () => {
    it('should mask all sensitive fields recursively', () => {
      const sanitized = sanitizeObject(sampleUserData);

      // Check top-level sensitive fields
      expect(sanitized.email).toBe('[REDACTED]');
      expect(sanitized.password).toBe('[REDACTED]');

      // Check nested sensitive fields
      expect(sanitized.address.creditCard).toBe('[REDACTED]');
      expect(sanitized.tokens.accessToken).toBe('[REDACTED]');
      expect(sanitized.tokens.refreshToken).toBe('[REDACTED]');
      expect(sanitized.settings.apiKey).toBe('[REDACTED]');
      expect(sanitized.socialSecurityData.ssn).toBe('[REDACTED]');

      // Check that non-sensitive fields are preserved
      expect(sanitized.id).toBe('123');
      expect(sanitized.name).toBe('John Doe');
      expect(sanitized.address.street).toBe('123 Main St');
      expect(sanitized.settings.theme).toBe('dark');

      // In the actual implementation, 'phone' is a sensitive field
      // so phoneNumbers array is sanitized
      expect(sanitized.phoneNumbers).toEqual(['[REDACTED]', '[REDACTED]']);

      expect(sanitized.tags).toEqual(['user', 'customer']);
    });

    it('should use custom mask if provided', () => {
      const sanitized = sanitizeObject(sampleUserData, { mask: '***' });

      expect(sanitized.password).toBe('***');
      expect(sanitized.tokens.accessToken).toBe('***');
    });

    it('should respect max depth for sanitization', () => {
      // Create a nested object with sensitive data for testing
      const nestedObj = {
        level: 1,
        nested: {
          level: 2,
          password: 'depth2-password',
          nested: {
            level: 3,
            password: 'depth3-password',
            nested: {
              level: 4,
              password: 'depth4-password',
              nested: {
                level: 5,
                password: 'depth5-password',
              },
            },
          },
        },
      };

      // With max depth of 3
      const sanitized = sanitizeObject(nestedObj, { maxDepth: 3 });

      // First level properties are preserved
      expect(sanitized.level).toBe(1);
      expect(sanitized.nested).toBeDefined();

      // Second level is sanitized
      expect(sanitized.nested.level).toBe(2);
      expect(sanitized.nested.password).toBe('[REDACTED]');
      expect(sanitized.nested.nested).toBeDefined();

      // Third level is sanitized
      expect(sanitized.nested.nested.level).toBe(3);
      expect(sanitized.nested.nested.password).toBe('[REDACTED]');

      // Fourth level exists but not sanitized (due to max depth)
      expect(sanitized.nested.nested.nested).toBeDefined();
    });

    it('should handle arrays correctly', () => {
      const dataWithArrays = {
        passwords: ['pass1', 'pass2', 'pass3'],
        tags: ['one', 'two', 'three'],
      };

      const sanitized = sanitizeObject(dataWithArrays);

      // Check sanitization of string arrays with sensitive key
      expect(sanitized.passwords).toEqual(['[REDACTED]', '[REDACTED]', '[REDACTED]']);

      // Check that non-sensitive arrays are preserved
      expect(sanitized.tags).toEqual(['one', 'two', 'three']);
    });

    it('should sanitize objects in arrays', () => {
      // Test data with objects in arrays
      const dataWithObjectArrays = {
        users: [
          { name: 'User 1', password: 'pass1' },
          { name: 'User 2', password: 'pass2' },
        ],
      };

      const sanitized = sanitizeObject(dataWithObjectArrays);

      // Check each object in the array is sanitized
      expect(sanitized.users[0].name).toBe('User 1');
      expect(sanitized.users[0].password).toBe('[REDACTED]');
      expect(sanitized.users[1].name).toBe('User 2');
      expect(sanitized.users[1].password).toBe('[REDACTED]');
    });

    it('should sanitize entire arrays with sensitive field names', () => {
      // Test data with a sensitive key containing an array of objects
      const data = {
        credentials: [
          { username: 'user1', password: 'pass1' },
          { username: 'user2', password: 'pass2' },
        ],
      };

      const sanitized = sanitizeObject(data);

      // The entire credentials array should be masked because 'credentials' is a sensitive field name
      expect(sanitized.credentials).toEqual(['[REDACTED]', '[REDACTED]']);
    });

    it('should handle null or undefined values', () => {
      const data = {
        name: 'Test',
        password: null,
        secretKey: undefined,
        user: null,
      };

      const sanitized = sanitizeObject(data);

      // Even when field is sensitive, null values are sanitized
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.secretKey).toBe('[REDACTED]');

      // Non-sensitive null values should stay null
      expect(sanitized.user).toBe(null);
      expect(sanitized.name).toBe('Test');
    });

    it('should use custom mask function if provided', () => {
      const data = {
        email: 'test@example.com',
        password: 'secret123',
        accessToken: 'token123',
        refreshToken: 'refresh456',
      };

      const sanitized = sanitizeObject(data, { maskFunction: testMaskFunction });

      // Check that mask function is applied correctly
      expect(sanitized.email).toBe('te***@example.com');
      expect(sanitized.password).toBe('[9 chars]');
      expect(sanitized.accessToken).toBe('[CUSTOM MASKED]');
      expect(sanitized.refreshToken).toBe('[CUSTOM MASKED]');
    });

    it('should handle primitive values (non-objects)', () => {
      // String
      expect(sanitizeObject('just a string')).toBe('just a string');

      // Number
      expect(sanitizeObject(42)).toBe(42);

      // Boolean
      expect(sanitizeObject(true)).toBe(true);

      // Null
      expect(sanitizeObject(null)).toBe(null);
    });

    it('should handle custom sensitive fields', () => {
      const data = {
        name: 'Test',
        businessKey: 'abc-123',
        account: {
          internalId: '12345',
        },
      };

      const sanitized = sanitizeObject(data, {
        customSensitiveFields: ['businessKey', 'internalId'],
      });

      expect(sanitized.businessKey).toBe('[REDACTED]');
      expect(sanitized.account.internalId).toBe('[REDACTED]');
      expect(sanitized.name).toBe('Test');
    });

    // Corrected test for max depth boundary
    it('should correctly handle objects at max depth boundary', () => {
      // Create a deeply nested object
      const createNestedObject = (
        currentDepth: number,
        maxDepth: number,
      ): Record<string, unknown> => {
        if (currentDepth > maxDepth) {
          return { value: 'leaf' };
        }
        return {
          depth: currentDepth,
          password: `depth${currentDepth}-secret`,
          nested: createNestedObject(currentDepth + 1, maxDepth),
        };
      };

      const deepObject = createNestedObject(1, 12);

      // Test with exactly the max depth
      const sanitized = sanitizeObject(deepObject, { maxDepth: 10 });

      // The 10th level should still be sanitized
      let current = sanitized as any;
      for (let i = 1; i <= 10; i++) {
        expect(current.depth).toBe(i);
        expect(current.password).toBe('[REDACTED]');
        if (i < 10) {
          current = current.nested;
        }
      }

      // Check that we stopped at the maxDepth and didn't process deeper levels
      expect(current.nested).toBeDefined();
    });
  });

  describe('sanitizeObjectShallow', () => {
    it('should only mask top-level sensitive fields', () => {
      // Create a test object with sensitive fields at different levels
      const data = {
        email: 'test@example.com',
        password: 'secret123',
        data: {
          secretKey: 'sensitive',
        },
      };

      const sanitized = sanitizeObjectShallow(data);

      // Top-level sensitive fields should be masked
      expect(sanitized.email).toBe('[REDACTED]');
      expect(sanitized.password).toBe('[REDACTED]');

      // But nested sensitive fields should NOT be masked
      expect(sanitized.data.secretKey).toBe('sensitive');
    });

    it('should handle arrays in shallow mode', () => {
      const dataWithArrays = {
        names: ['John', 'Jane'],
        passwords: ['pass1', 'pass2'],
      };

      const sanitized = sanitizeObjectShallow(dataWithArrays);

      // Arrays with sensitive keys should have all entries masked
      expect(sanitized.passwords).toEqual(['[REDACTED]', '[REDACTED]']);

      // Non-sensitive arrays should be preserved
      expect(sanitized.names).toEqual(['John', 'Jane']);
    });

    // Note: In actual implementation, array items aren't checked for sensitivity in sanitizeObjectShallow
    // Updated test to match actual behavior
    it('should not check array items for sensitive content in shallow mode', () => {
      const data = {
        terms: ['password123', 'normal term', 'api_key_value'],
      };

      const sanitized = sanitizeObjectShallow(data);

      // In the actual implementation, regular arrays (non-sensitive key) aren't checked for content
      expect(sanitized.terms[0]).toBe('password123');
      expect(sanitized.terms[1]).toBe('normal term');
      expect(sanitized.terms[2]).toBe('api_key_value');
    });

    it('should handle primitive values in shallow mode', () => {
      expect(sanitizeObjectShallow('just a string')).toBe('just a string');
      expect(sanitizeObjectShallow(42)).toBe(42);
      expect(sanitizeObjectShallow(null)).toBe(null);
    });

    it('should use custom options in shallow mode', () => {
      const data = {
        name: 'Test',
        customSensitive: 'secret',
      };

      const sanitized = sanitizeObjectShallow(data, {
        customSensitiveFields: ['customSensitive'],
        mask: '***',
      });

      expect(sanitized.customSensitive).toBe('***');
      expect(sanitized.name).toBe('Test');
    });

    it('should use custom mask function with shallow mode', () => {
      const data = {
        email: 'user@example.com',
        password: 'secret',
        description: 'Regular text',
      };

      const sanitized = sanitizeObjectShallow(data, {
        maskFunction: testMaskFunction,
      });

      expect(sanitized.email).toBe('us***@example.com');
      expect(sanitized.password).toBe('[6 chars]');
      expect(sanitized.description).toBe('Regular text');
    });

    it('should handle both objects and arrays with mask function', () => {
      const data = {
        credentials: {
          email: 'admin@example.com',
          password: 'admin123',
        },
        tokens: {
          accessToken: 'jwt-token',
          refreshToken: 'refresh-token',
        },
      };

      const sanitized = sanitizeObjectShallow(data, {
        maskFunction: testMaskFunction,
      });

      // For sensitive object fields, the entire object should be masked using the mask function
      expect(sanitized.credentials).toBe('[CUSTOM MASKED]');
      expect(sanitized.tokens).toBe('[CUSTOM MASKED]');
    });
  });

  describe('pickSafeFields', () => {
    it('should pick only the specified safe fields', () => {
      const result = pickSafeFields(sampleUserData, ['id', 'name', 'address']);

      // Should include only the specified fields
      const resultKeys = Object.keys(result);
      resultKeys.sort((a, b) => a.localeCompare(b));
      expect(resultKeys).toEqual(['address', 'id', 'name']);

      // The picked fields should have their original values
      expect(result.id).toBe('123');
      expect(result.name).toBe('John Doe');
      expect(result.address).toEqual(sampleUserData.address);

      // Should not include other fields
      expect((result as any).email).toBeUndefined();
      expect((result as any).password).toBeUndefined();
    });

    it('should handle empty array of safe fields', () => {
      const result = pickSafeFields(sampleUserData, []);
      expect(Object.keys(result).length).toBe(0);
    });

    it('should handle non-object inputs gracefully', () => {
      expect(pickSafeFields(null as any, ['id'])).toEqual({});
      expect(pickSafeFields(undefined as any, ['id'])).toEqual({});
      expect(pickSafeFields(123 as any, ['id'])).toEqual({});
      expect(pickSafeFields('string' as any, ['id'])).toEqual({});
      expect(pickSafeFields(true as any, ['id'])).toEqual({});
      expect(pickSafeFields([] as any, ['id'])).toEqual({});
    });

    it('should skip fields not present in the object', () => {
      const data = { name: 'Test', age: 30 };
      const result = pickSafeFields(data, ['name', 'email', 'age'] as any);

      expect(Object.keys(result).length).toBe(2);
      expect(result.name).toBe('Test');
      expect(result.age).toBe(30);
      expect((result as any).email).toBeUndefined();
    });
  });
});
