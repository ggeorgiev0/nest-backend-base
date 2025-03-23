/**
 * List of common field names that might contain sensitive information
 * This constant is used throughout the application for sanitizing data in logs and error responses
 */
export const SENSITIVE_FIELDS = [
  'password',
  'passwordConfirmation',
  'currentPassword',
  'newPassword',
  'passwd',
  'token',
  'refreshToken',
  'accessToken',
  'apiKey',
  'api_key',
  'secret',
  'privateKey',
  'private_key',
  'authorization',
  'credentials',
  'auth',
  'ssn',
  'socialSecurity',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'pin',
  'email',
  'phone',
];
