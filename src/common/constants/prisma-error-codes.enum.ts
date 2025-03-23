/**
 * Prisma error codes enum
 *
 * This enum maps Prisma error codes to descriptive names and provides documentation
 * for each error type. Used primarily by the DatabaseErrorInterceptor.
 *
 * See official Prisma documentation:
 * https://www.prisma.io/docs/reference/api-reference/error-reference#error-codes
 */
export enum PrismaErrorCode {
  /**
   * Unique constraint violation
   * Occurs when a unique constraint is violated, such as when trying to create a record
   * with a value that already exists in a unique field.
   */
  UNIQUE_CONSTRAINT_VIOLATION = 'P2002',

  /**
   * Foreign key constraint violation
   * Occurs when attempting to create or update a record with a foreign key
   * that doesn't exist in the related table.
   */
  FOREIGN_KEY_CONSTRAINT_VIOLATION = 'P2003',

  /**
   * Query interpretation error
   * Occurs when Prisma Client cannot properly interpret a query, often due to
   * invalid input or unsupported operations.
   */
  QUERY_INTERPRETATION_ERROR = 'P2016',

  /**
   * Required related record not found
   * Occurs when a related record that is required is not found.
   */
  REQUIRED_RELATED_RECORD_NOT_FOUND = 'P2018',

  /**
   * Input error
   * Occurs when there is an error in the input to a Prisma operation.
   */
  INPUT_ERROR = 'P2019',

  /**
   * Table does not exist
   * Occurs when a query references a table that doesn't exist in the database schema.
   */
  TABLE_DOES_NOT_EXIST = 'P2021',

  /**
   * Record not found
   * Occurs when attempting to retrieve, update, or delete a record that doesn't exist.
   */
  RECORD_NOT_FOUND = 'P2025',
}
