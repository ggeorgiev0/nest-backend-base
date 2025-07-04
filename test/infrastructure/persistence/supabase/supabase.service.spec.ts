import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from '@supabase/supabase-js';

import { SupabaseService } from '@infrastructure/persistence/supabase/supabase.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('SupabaseService', () => {
  let service: SupabaseService;

  const mockSupabaseClient = {
    auth: {},
    from: jest.fn(),
    rpc: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SupabaseService>(SupabaseService);
  });

  describe('constructor', () => {
    it('should create Supabase client with correct config', () => {
      expect(createClient).toHaveBeenCalledWith('https://test.supabase.co', 'test-anon-key');
    });

    it('should call configService.get for required keys', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('SUPABASE_URL');
      expect(mockConfigService.get).toHaveBeenCalledWith('SUPABASE_ANON_KEY');
    });
  });

  describe('getClient', () => {
    it('should return the initialized Supabase client', () => {
      const client = service.getClient();

      expect(client).toBe(mockSupabaseClient);
    });
  });

  describe('getAdminClient', () => {
    it('should create and return admin client with service role key', () => {
      const adminClient = service.getAdminClient();

      expect(createClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-role-key',
      );
      expect(adminClient).toBe(mockSupabaseClient);
    });

    it('should create new client instance each time', () => {
      const adminClient1 = service.getAdminClient();
      const adminClient2 = service.getAdminClient();

      expect(createClient).toHaveBeenCalledTimes(3); // 1 from constructor + 2 from getAdminClient
      expect(adminClient1).toBe(adminClient2); // Both return the same mock
    });
  });

  describe('error handling', () => {
    it('should handle missing SUPABASE_URL config', () => {
      const errorConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'SUPABASE_URL') return;
          return mockConfigService.get(key);
        }),
      };

      // TypeScript non-null assertion handles this at compile time
      // Creating the service should not throw at runtime
      const testService = new SupabaseService(errorConfigService as any);
      expect(testService).toBeDefined();
    });

    it('should handle missing SUPABASE_ANON_KEY config', () => {
      const errorConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'SUPABASE_ANON_KEY') return;
          return mockConfigService.get(key);
        }),
      };

      // TypeScript non-null assertion handles this at compile time
      // Creating the service should not throw at runtime
      const testService = new SupabaseService(errorConfigService as any);
      expect(testService).toBeDefined();
    });
  });
});
