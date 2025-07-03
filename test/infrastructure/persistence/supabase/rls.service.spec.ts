import { Test, TestingModule } from '@nestjs/testing';
import { CustomLoggerService } from '@common/logger';
import { RLSService, RLSPolicy } from '@infrastructure/persistence/supabase/rls.service';
import { SupabaseService } from '@infrastructure/persistence/supabase/supabase.service';
import { RLSValidationException } from '@common/exceptions/rls.exceptions';

describe('RLSService', () => {
  let service: RLSService;
  let supabaseService: SupabaseService;
  let logger: CustomLoggerService;

  const mockSupabaseService = {
    getClient: jest.fn(),
    getAdminClient: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RLSService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<RLSService>(RLSService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
    logger = module.get<CustomLoggerService>(CustomLoggerService);
  });

  describe('generateEnableRLSSQL', () => {
    it('should generate correct SQL to enable RLS', () => {
      const sql = service.generateEnableRLSSQL('users');
      expect(sql).toBe('ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;');
    });

    it('should validate table name', () => {
      expect(() => service.generateEnableRLSSQL('invalid-table!'))
        .toThrow(RLSValidationException);
      
      expect(() => service.generateEnableRLSSQL(''))
        .toThrow(RLSValidationException);
      
      expect(() => service.generateEnableRLSSQL('DROP'))
        .toThrow(RLSValidationException);
    });

    it('should reject table names longer than 63 characters', () => {
      const longTableName = 'a'.repeat(64);
      expect(() => service.generateEnableRLSSQL(longTableName))
        .toThrow(RLSValidationException);
    });
  });

  describe('generateCreatePolicySQL', () => {
    const validPolicy: RLSPolicy = {
      name: 'users_select_policy',
      table: 'users',
      action: 'SELECT',
      expression: 'auth.uid() = user_id',
    };

    it('should generate correct SQL for basic policy', () => {
      const sql = service.generateCreatePolicySQL(validPolicy);
      expect(sql).toContain('CREATE POLICY "users_select_policy"');
      expect(sql).toContain('ON "users"');
      expect(sql).toContain('FOR SELECT');
      expect(sql).toContain('TO PUBLIC');
      expect(sql).toContain('USING (auth.uid() = user_id)');
    });

    it('should include roles when specified', () => {
      const policyWithRoles: RLSPolicy = {
        ...validPolicy,
        roles: ['authenticated', 'service_role'],
      };
      const sql = service.generateCreatePolicySQL(policyWithRoles);
      expect(sql).toContain('TO authenticated, service_role');
    });

    it('should include check expression for INSERT/UPDATE', () => {
      const policyWithCheck: RLSPolicy = {
        ...validPolicy,
        action: 'INSERT',
        checkExpression: 'email IS NOT NULL',
      };
      const sql = service.generateCreatePolicySQL(policyWithCheck);
      expect(sql).toContain('WITH CHECK (email IS NOT NULL)');
    });

    it('should validate policy name', () => {
      const invalidPolicy: RLSPolicy = {
        ...validPolicy,
        name: 'invalid policy!',
      };
      expect(() => service.generateCreatePolicySQL(invalidPolicy))
        .toThrow(RLSValidationException);
    });

    it('should validate table name', () => {
      const invalidPolicy: RLSPolicy = {
        ...validPolicy,
        table: 'invalid-table!',
      };
      expect(() => service.generateCreatePolicySQL(invalidPolicy))
        .toThrow(RLSValidationException);
    });

    it('should support all action types', () => {
      const actions: Array<RLSPolicy['action']> = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL'];
      
      actions.forEach(action => {
        const policy: RLSPolicy = { ...validPolicy, action };
        const sql = service.generateCreatePolicySQL(policy);
        expect(sql).toContain(`FOR ${action}`);
      });
    });
  });

  describe('generateDropPolicySQL', () => {
    it('should generate correct SQL to drop policy', () => {
      const sql = service.generateDropPolicySQL('users_policy', 'users');
      expect(sql).toBe('DROP POLICY IF EXISTS "users_policy" ON "users";');
    });

    it('should validate policy name', () => {
      expect(() => service.generateDropPolicySQL('invalid policy!', 'users'))
        .toThrow(RLSValidationException);
    });

    it('should validate table name', () => {
      expect(() => service.generateDropPolicySQL('users_policy', 'invalid-table!'))
        .toThrow(RLSValidationException);
    });
  });

  describe('logRLSPolicy', () => {
    it('should log policy information', () => {
      service.logRLSPolicy('CREATE', 'users_policy', 'users');
      
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RLS Policy CREATE: users_policy on users',
      );
    });
  });

  describe('generateTableRLSSetup', () => {
    it('should generate complete RLS setup with default options', () => {
      const policies = service.generateTableRLSSetup('users');
      
      expect(policies).toHaveLength(5); // Enable RLS + 4 policies
      expect(policies[0]).toContain('ENABLE ROW LEVEL SECURITY');
      expect(policies.some(p => p.includes('allow_authenticated_read_users'))).toBe(true);
      expect(policies.some(p => p.includes('allow_users_update_own_users'))).toBe(true);
      expect(policies.some(p => p.includes('allow_users_delete_own_users'))).toBe(true);
      expect(policies.some(p => p.includes('service_role_bypass_users'))).toBe(true);
    });

    it('should allow public read when specified', () => {
      const policies = service.generateTableRLSSetup('users', {
        allowPublicRead: true,
      });
      
      expect(policies.some(p => p.includes('allow_public_read_users'))).toBe(true);
      expect(policies.some(p => p.includes('USING (true)'))).toBe(true);
    });

    it('should add insert policy when specified', () => {
      const policies = service.generateTableRLSSetup('users', {
        allowAuthenticatedInsert: true,
      });
      
      expect(policies.some(p => p.includes('allow_authenticated_insert_users'))).toBe(true);
    });

    it('should use custom user ID column', () => {
      const policies = service.generateTableRLSSetup('users', {
        allowOwnRecordUpdate: true,
        userIdColumn: 'owner_id',
      });
      
      const updatePolicy = policies.find(p => p.includes('update own records'));
      expect(updatePolicy).toContain('auth.uid()::text = owner_id');
    });

    it('should validate custom user ID column', () => {
      expect(() => service.generateTableRLSSetup('users', {
        allowAuthenticatedInsert: true,
        userIdColumn: 'invalid-column!',
      })).toThrow(RLSValidationException);
    });

    it('should skip policies when disabled', () => {
      const policies = service.generateTableRLSSetup('users', {
        allowOwnRecordUpdate: false,
        allowOwnRecordDelete: false,
      });
      
      expect(policies.some(p => p.includes('update own records'))).toBe(false);
      expect(policies.some(p => p.includes('delete own records'))).toBe(false);
    });
  });

  describe('identifier validation', () => {
    it('should accept valid identifiers', () => {
      const validIdentifiers = [
        'users',
        'user_profiles',
        '_temp',
        'table123',
        'CamelCase',
      ];
      
      validIdentifiers.forEach(identifier => {
        expect(() => service.generateEnableRLSSQL(identifier)).not.toThrow();
      });
    });

    it('should reject invalid identifiers', () => {
      const invalidIdentifiers = [
        '123table', // starts with number
        'table-name', // contains hyphen
        'table name', // contains space
        'table@name', // contains special char
        '', // empty
        '   ', // whitespace only
      ];
      
      invalidIdentifiers.forEach(identifier => {
        expect(() => service.generateEnableRLSSQL(identifier))
          .toThrow(RLSValidationException);
      });
    });

    it('should reject SQL reserved words', () => {
      const reservedWords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TABLE', 'DROP'];
      
      reservedWords.forEach(word => {
        expect(() => service.generateEnableRLSSQL(word))
          .toThrow(RLSValidationException);
        expect(() => service.generateEnableRLSSQL(word.toLowerCase()))
          .toThrow(RLSValidationException);
      });
    });
  });
});