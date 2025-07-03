import { Test, TestingModule } from '@nestjs/testing';
import { CustomLoggerService } from '@common/logger';
import { RealtimeService } from '@infrastructure/persistence/supabase/realtime.service';
import { SupabaseService } from '@infrastructure/persistence/supabase/supabase.service';
import {
  RealtimeConnectionException,
  RealtimeSubscriptionException,
  RealtimeChannelLimitException,
  RealtimeTimeoutException,
} from '@common/exceptions/realtime.exceptions';
import {
  RealtimeCallback,
  ChangeEvent,
  RealtimeSubscriptionOptions,
} from '@infrastructure/persistence/supabase/types/realtime.types';

describe('RealtimeService', () => {
  let service: RealtimeService;
  let supabaseService: SupabaseService;
  let logger: CustomLoggerService;

  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    socket: {
      isConnected: jest.fn(),
    },
  };

  const mockSupabaseClient = {
    channel: jest.fn().mockReturnValue(mockChannel),
    removeChannel: jest.fn(),
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue(mockSupabaseClient),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeService,
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

    service = module.get<RealtimeService>(RealtimeService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
    logger = module.get<CustomLoggerService>(CustomLoggerService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should use default config values when no config provided', () => {
      expect(service['maxChannels']).toBe(100);
      expect(service['connectionTimeout']).toBe(30000);
    });
  });

  describe('subscribe', () => {
    const channelName = 'test-channel';
    const tableName = 'users';
    const callback: RealtimeCallback = jest.fn();

    it('should create subscription for all events on a table', async () => {
      const options: RealtimeSubscriptionOptions = {
        event: '*' as ChangeEvent,
        table: tableName,
      };

      mockChannel.subscribe.mockImplementation((cb?: any) => {
        if (cb) cb('ok');
        return mockChannel;
      });

      const subscription = service.subscribe(channelName, options, callback);

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith(channelName);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        expect.any(Function),
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
      expect(subscription.channel).toBe(mockChannel);
      expect(subscription.unsubscribe).toBeInstanceOf(Function);
    });

    it('should create subscription for specific event', async () => {
      const options: RealtimeSubscriptionOptions = {
        event: 'INSERT' as ChangeEvent,
        table: tableName,
        schema: 'custom',
      };

      mockChannel.subscribe.mockImplementation((cb?: any) => {
        if (cb) cb('ok');
        return mockChannel;
      });

      service.subscribe(channelName, options, callback);

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        { event: 'INSERT', schema: 'custom', table: tableName },
        expect.any(Function),
      );
    });

    it('should handle connection timeout', () => {
      const options: RealtimeSubscriptionOptions = {
        event: '*' as ChangeEvent,
        table: tableName,
      };

      mockChannel.subscribe.mockImplementation(() => {
        // Don't call callback, simulating timeout
        return mockChannel;
      });

      const subscription = service.subscribe(channelName, options, callback);
      
      // Timeout should throw when timer expires
      expect(() => {
        jest.advanceTimersByTime(30000);
      }).toThrow(RealtimeTimeoutException);
    });

    it('should handle subscription error', () => {
      const options: RealtimeSubscriptionOptions = {
        event: '*' as ChangeEvent,
        table: tableName,
      };

      mockChannel.subscribe.mockImplementation((cb?: any) => {
        if (cb) cb('CHANNEL_ERROR');
        return mockChannel;
      });

      expect(() => service.subscribe(channelName, options, callback))
        .toThrow(RealtimeConnectionException);
    });

    it('should throw when channel already exists', () => {
      const options: RealtimeSubscriptionOptions = {
        event: '*' as ChangeEvent,
        table: tableName,
      };

      mockChannel.subscribe.mockImplementation((cb?: any) => {
        if (cb) cb('SUBSCRIBED');
        return mockChannel;
      });

      // First subscription succeeds
      service.subscribe(channelName, options, callback);

      // Second subscription with same channel name should throw
      expect(() => service.subscribe(channelName, options, callback))
        .toThrow(RealtimeSubscriptionException);
    });

    it('should enforce channel limit', () => {
      const options: RealtimeSubscriptionOptions = {
        event: '*' as ChangeEvent,
        table: tableName,
      };

      mockChannel.subscribe.mockImplementation((cb?: any) => {
        if (cb) cb('ok');
        return mockChannel;
      });

      // Create 100 channels (the limit)
      for (let i = 0; i < 100; i++) {
        service.subscribe(`channel-${i}`, options, callback);
      }

      // 101st channel should throw
      expect(() => service.subscribe('channel-101', options, callback))
        .toThrow(RealtimeChannelLimitException);
    });

    it('should call callback when event is received', async () => {
      const options: RealtimeSubscriptionOptions = {
        event: 'INSERT' as ChangeEvent,
        table: tableName,
      };

      const mockPayload = { new: { id: 1, name: 'Test' } };
      let capturedCallback: any;

      mockChannel.on.mockImplementation((event, opts, cb) => {
        capturedCallback = cb;
        return mockChannel;
      });

      mockChannel.subscribe.mockImplementation((cb?: any) => {
        if (cb) cb('ok');
        return mockChannel;
      });

      service.subscribe(channelName, options, callback);

      // Simulate receiving an event
      capturedCallback(mockPayload);

      expect(callback).toHaveBeenCalledWith(mockPayload);
    });

    it('should handle callback errors', async () => {
      jest.useRealTimers(); // Temporarily use real timers for this test
      const options: RealtimeSubscriptionOptions = {
        event: 'INSERT' as ChangeEvent,
        table: tableName,
      };

      const errorCallback: RealtimeCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      const mockPayload = { new: { id: 1, name: 'Test' } };
      let capturedCallback: any;

      mockChannel.on.mockImplementation((event, opts, cb) => {
        capturedCallback = cb;
        return mockChannel;
      });

      mockChannel.subscribe.mockImplementation((cb?: any) => {
        if (cb) cb('ok');
        return mockChannel;
      });

      service.subscribe(channelName, options, errorCallback);

      // Simulate receiving an event
      capturedCallback(mockPayload);

      expect(errorCallback).toHaveBeenCalled();
      // Wait for async error handler
      await new Promise(resolve => setImmediate(resolve));
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        undefined,
        expect.objectContaining({ channelName }),
      );
      
      jest.useFakeTimers(); // Restore fake timers
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from channel', async () => {
      const channelName = 'test-channel';
      const options: RealtimeSubscriptionOptions = {
        event: '*' as ChangeEvent,
        table: 'users',
      };

      mockChannel.subscribe.mockImplementation((cb?: any) => {
        if (cb) cb('ok');
        return mockChannel;
      });

      const subscription = service.subscribe(channelName, options, jest.fn());

      await service.unsubscribe(channelName);

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Unsubscribed from channel: ${channelName}`,
      );
    });

    it('should handle unsubscribe errors', async () => {
      const channelName = 'test-channel';
      const options: RealtimeSubscriptionOptions = {
        event: '*' as ChangeEvent,
        table: 'users',
      };

      mockChannel.subscribe.mockImplementation((cb?: any) => {
        if (cb) cb('ok');
        return mockChannel;
      });

      const subscription = service.subscribe(channelName, options, jest.fn());

      const error = new Error('Unsubscribe failed');
      mockChannel.unsubscribe.mockRejectedValue(error);

      await expect(service.unsubscribe(channelName))
        .rejects.toThrow(RealtimeSubscriptionException);
    });
  });

  describe('isChannelActive', () => {
    it('should return true when channel is active', () => {
      const channelName = 'test-channel';
      const options: RealtimeSubscriptionOptions = {
        event: '*' as ChangeEvent,
        table: 'users',
      };

      mockChannel.subscribe.mockImplementation((cb?: any) => {
        if (cb) cb('SUBSCRIBED');
        return mockChannel;
      });

      service.subscribe(channelName, options, jest.fn());
      const isActive = service.isChannelActive(channelName);

      expect(isActive).toBe(true);
    });

    it('should return false when channel is not active', () => {
      const isActive = service.isChannelActive('non-existent-channel');
      expect(isActive).toBe(false);
    });
  });

  describe('onModuleDestroy', () => {
    it('should unsubscribe from all channels', async () => {
      const options: RealtimeSubscriptionOptions = {
        event: '*' as ChangeEvent,
        table: 'users',
      };

      mockChannel.subscribe.mockImplementation((cb?: any) => {
        if (cb) cb('ok');
        return mockChannel;
      });

      // Create multiple subscriptions
      service.subscribe('channel-1', options, jest.fn());
      service.subscribe('channel-2', options, jest.fn());

      // Mock successful unsubscribe
      mockChannel.unsubscribe.mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(mockChannel.unsubscribe).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during cleanup', async () => {
      const options: RealtimeSubscriptionOptions = {
        event: '*' as ChangeEvent,
        table: 'users',
      };

      mockChannel.subscribe.mockImplementation((cb?: any) => {
        if (cb) cb('ok');
        return mockChannel;
      });

      service.subscribe('channel-1', options, jest.fn());

      const error = new Error('Cleanup failed');
      mockChannel.unsubscribe.mockRejectedValue(error);

      // onModuleDestroy will reject due to Promise.all
      await expect(service.onModuleDestroy()).rejects.toThrow(RealtimeSubscriptionException);
    });
  });
});