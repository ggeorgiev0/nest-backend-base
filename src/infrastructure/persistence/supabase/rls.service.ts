import { Injectable } from '@nestjs/common';

import { CustomLoggerService } from '@common/logger';
import { RLSValidationException } from '@common/exceptions/rls.exceptions';

import { SupabaseService } from './supabase.service';

export interface RLSPolicy {
  name: string;
  table: string;
  action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  expression: string;
  checkExpression?: string;
  roles?: string[];
}

/**
 * Service for managing Row Level Security (RLS) policies in Supabase.
 *
 * Note: RLS policies should be managed through Supabase migrations or the Supabase dashboard.
 * This service provides helper methods to generate the SQL for RLS policies.
 */
@Injectable()
export class RLSService {
  private readonly SQL_IDENTIFIER_REGEX = /^[a-zA-Z_]\w*$/;
  private readonly RESERVED_WORDS = new Set([
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'FROM', 'WHERE', 'JOIN',
    'TABLE', 'DROP', 'CREATE', 'ALTER', 'GRANT', 'REVOKE', 'EXECUTE',
  ]);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly logger: CustomLoggerService,
  ) {}

  /**
   * Validate SQL identifier (table/column name)
   */
  private validateIdentifier(identifier: string, type: string): void {
    if (!identifier || identifier.trim().length === 0) {
      throw new RLSValidationException(`${type} name cannot be empty`);
    }

    if (!this.SQL_IDENTIFIER_REGEX.test(identifier)) {
      throw new RLSValidationException(
        `Invalid ${type} name: ${identifier}. Must start with a letter or underscore and contain only letters, numbers, and underscores`,
      );
    }

    if (this.RESERVED_WORDS.has(identifier.toUpperCase())) {
      throw new RLSValidationException(
        `${type} name '${identifier}' is a reserved SQL keyword`,
      );
    }

    if (identifier.length > 63) {
      throw new RLSValidationException(
        `${type} name '${identifier}' exceeds maximum length of 63 characters`,
      );
    }
  }

  /**
   * Sanitize and validate table name
   */
  private sanitizeTableName(table: string): string {
    this.validateIdentifier(table, 'Table');
    return table;
  }

  /**
   * Sanitize and validate column name
   */
  private sanitizeColumnName(column: string): string {
    this.validateIdentifier(column, 'Column');
    return column;
  }

  /**
   * Generate SQL to enable RLS on a table
   */
  generateEnableRLSSQL(table: string): string {
    const sanitizedTable = this.sanitizeTableName(table);
    return `ALTER TABLE "${sanitizedTable}" ENABLE ROW LEVEL SECURITY;`;
  }

  /**
   * Generate SQL to create an RLS policy
   */
  generateCreatePolicySQL(policy: RLSPolicy): string {
    const sanitizedTable = this.sanitizeTableName(policy.table);
    this.validateIdentifier(policy.name, 'Policy');
    
    const roles = policy.roles?.join(', ') || 'PUBLIC';
    const checkClause = policy.checkExpression ? `WITH CHECK (${policy.checkExpression})` : '';

    return `
CREATE POLICY "${policy.name}" ON "${sanitizedTable}"
FOR ${policy.action}
TO ${roles}
USING (${policy.expression})
${checkClause};`.trim();
  }

  /**
   * Generate SQL to drop an RLS policy
   */
  generateDropPolicySQL(policyName: string, table: string): string {
    const sanitizedTable = this.sanitizeTableName(table);
    this.validateIdentifier(policyName, 'Policy');
    
    return `DROP POLICY IF EXISTS "${policyName}" ON "${sanitizedTable}";`;
  }

  /**
   * Log RLS policy information
   */
  logRLSPolicy(action: string, policyName: string, table: string): void {
    this.logger.log(`RLS Policy ${action}: ${policyName} on ${table}`);
  }

  /**
   * Generate a complete RLS setup for a table with common policies
   */
  generateTableRLSSetup(
    table: string,
    options?: {
      allowPublicRead?: boolean;
      allowAuthenticatedInsert?: boolean;
      allowOwnRecordUpdate?: boolean;
      allowOwnRecordDelete?: boolean;
      userIdColumn?: string;
    },
  ): string[] {
    const {
      allowPublicRead = false,
      allowAuthenticatedInsert = false,
      allowOwnRecordUpdate = true,
      allowOwnRecordDelete = true,
      userIdColumn = 'user_id',
    } = options || {};

    // Validate the userIdColumn if it's going to be used
    if (allowAuthenticatedInsert || allowOwnRecordUpdate || allowOwnRecordDelete) {
      this.sanitizeColumnName(userIdColumn);
    }

    const policies: string[] = [this.generateEnableRLSSQL(table)];

    // Public read policy
    if (allowPublicRead) {
      policies.push(
        this.generateCreatePolicySQL({
          name: `allow_public_read_${table}`,
          table,
          action: 'SELECT',
          expression: 'true',
        }),
      );
    } else {
      // Authenticated read policy
      policies.push(
        this.generateCreatePolicySQL({
          name: `allow_authenticated_read_${table}`,
          table,
          action: 'SELECT',
          expression: "auth.role() = 'authenticated'",
          roles: ['authenticated'],
        }),
      );
    }

    // Insert policy for authenticated users
    if (allowAuthenticatedInsert) {
      policies.push(
        this.generateCreatePolicySQL({
          name: `allow_authenticated_insert_${table}`,
          table,
          action: 'INSERT',
          expression: "auth.role() = 'authenticated'",
          checkExpression: `auth.uid()::text = ${userIdColumn}`,
          roles: ['authenticated'],
        }),
      );
    }

    // Update own records
    if (allowOwnRecordUpdate) {
      policies.push(
        this.generateCreatePolicySQL({
          name: `allow_users_update_own_${table}`,
          table,
          action: 'UPDATE',
          expression: `auth.uid()::text = ${userIdColumn}`,
          checkExpression: `auth.uid()::text = ${userIdColumn}`,
          roles: ['authenticated'],
        }),
      );
    }

    // Delete own records
    if (allowOwnRecordDelete) {
      policies.push(
        this.generateCreatePolicySQL({
          name: `allow_users_delete_own_${table}`,
          table,
          action: 'DELETE',
          expression: `auth.uid()::text = ${userIdColumn}`,
          roles: ['authenticated'],
        }),
      );
    }

    // Service role bypass
    policies.push(
      this.generateCreatePolicySQL({
        name: `service_role_bypass_${table}`,
        table,
        action: 'ALL',
        expression: 'true',
        checkExpression: 'true',
        roles: ['service_role'],
      }),
    );

    return policies;
  }
}
