import { Injectable, OnModuleDestroy, Optional, Inject } from '@nestjs/common';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import {
  RealtimeConnectionException,
  RealtimeSubscriptionException,
  RealtimeChannelLimitException,
  RealtimeTimeoutException,
} from '@common/exceptions/realtime.exceptions';
import { CustomLoggerService } from '@common/logger';

import { SupabaseService } from './supabase.service';
import {
  SubscriptionStatus,
  RealtimeSubscriptionOptions,
  RealtimeConfig,
  RealtimeCallback,
  ChannelMetadata,
} from './types/realtime.types';

export interface RealtimeSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => Promise<void>;
}

@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private activeChannels: Map<string, RealtimeChannel> = new Map();
  private channelMetadata: Map<string, ChannelMetadata> = new Map();
  private readonly maxChannels: number = 100;
  private readonly connectionTimeout: number = 30_000; // 30 seconds

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly logger: CustomLoggerService,
    @Optional() @Inject('REALTIME_CONFIG') private readonly config?: RealtimeConfig,
  ) {
    if (config?.maxChannels) {
      this.maxChannels = config.maxChannels;
    }
    if (config?.connectionTimeout) {
      this.connectionTimeout = config.connectionTimeout;
    }
  }

  async onModuleDestroy(): Promise<void> {
    // Clean up all active subscriptions
    const promises = [...this.activeChannels.keys()].map((channelName) =>
      this.unsubscribe(channelName),
    );
    await Promise.all(promises);
  }

  /**
   * Subscribe to real-time changes on a table
   */
  subscribe<T extends Record<string, unknown> = Record<string, unknown>>(
    channelName: string,
    options: RealtimeSubscriptionOptions,
    callback: RealtimeCallback<T>,
  ): RealtimeSubscription {
    // Check channel limit
    if (this.activeChannels.size >= this.maxChannels) {
      throw new RealtimeChannelLimitException(
        `Maximum number of channels (${this.maxChannels}) reached`,
      );
    }

    // Check if channel already exists
    if (this.activeChannels.has(channelName)) {
      throw new RealtimeSubscriptionException(`Channel ${channelName} already exists`);
    }

    const client = this.supabaseService.getClient();
    const channel = client.channel(channelName);

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (!this.channelMetadata.has(channelName)) {
        this.handleSubscriptionTimeout(channelName, channel);
      }
    }, this.connectionTimeout);

    // Set up the subscription
    channel.on(
      'postgres_changes' as const,
      {
        event: options.event || '*',
        schema: options.schema || 'public',
        table: options.table,
        filter: options.filter,
      },
      (payload: RealtimePostgresChangesPayload<T>) => {
        this.updateChannelActivity(channelName);
        this.logger.debug('Realtime event received', {
          channel: channelName,
          event: payload.eventType,
          table: payload.table,
        });

        // Execute callback without awaiting to avoid promise in void return
        void (async (): Promise<void> => {
          try {
            await callback(payload);
          } catch (error) {
            this.logger.error(
              error instanceof Error ? error : new Error('Callback execution failed'),
              undefined,
              { channelName, event: payload.eventType },
            );
          }
        })();
      },
    );

    // Subscribe to the channel
    channel.subscribe((status: string) => {
      this.handleSubscriptionStatus(status as SubscriptionStatus, channelName, timeoutId);
    });

    // Store the channel
    this.activeChannels.set(channelName, channel);

    return {
      channel,
      unsubscribe: (): Promise<void> => this.unsubscribe(channelName),
    };
  }

  /**
   * Subscribe to changes on a specific record
   */
  subscribeToRecord<T extends Record<string, unknown> = Record<string, unknown>>(
    channelName: string,
    table: string,
    recordId: string,
    callback: RealtimeCallback<T>,
  ): RealtimeSubscription {
    return this.subscribe<T>(
      channelName,
      {
        table,
        filter: `id=eq.${recordId}`,
      },
      callback,
    );
  }

  /**
   * Subscribe to INSERT events only
   */
  subscribeToInserts<T extends Record<string, unknown> = Record<string, unknown>>(
    channelName: string,
    table: string,
    callback: RealtimeCallback<T>,
  ): RealtimeSubscription {
    return this.subscribe<T>(
      channelName,
      {
        event: 'INSERT',
        table,
      },
      callback,
    );
  }

  /**
   * Subscribe to UPDATE events only
   */
  subscribeToUpdates<T extends Record<string, unknown> = Record<string, unknown>>(
    channelName: string,
    table: string,
    callback: RealtimeCallback<T>,
    filter?: string,
  ): RealtimeSubscription {
    return this.subscribe<T>(
      channelName,
      {
        event: 'UPDATE',
        table,
        filter,
      },
      callback,
    );
  }

  /**
   * Subscribe to DELETE events only
   */
  subscribeToDeletes<T extends Record<string, unknown> = Record<string, unknown>>(
    channelName: string,
    table: string,
    callback: RealtimeCallback<T>,
  ): RealtimeSubscription {
    return this.subscribe<T>(
      channelName,
      {
        event: 'DELETE',
        table,
      },
      callback,
    );
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channelName: string): Promise<void> {
    const channel = this.activeChannels.get(channelName);

    if (channel) {
      try {
        await channel.unsubscribe();
        this.activeChannels.delete(channelName);
        this.channelMetadata.delete(channelName);
        this.logger.log(`Unsubscribed from channel: ${channelName}`);
      } catch {
        throw new RealtimeSubscriptionException(
          `Failed to unsubscribe from channel ${channelName}`,
        );
      }
    }
  }

  /**
   * Get all active channel names
   */
  getActiveChannels(): string[] {
    return [...this.activeChannels.keys()];
  }

  /**
   * Check if a channel is active
   */
  isChannelActive(channelName: string): boolean {
    return this.activeChannels.has(channelName);
  }

  /**
   * Get channel metadata
   */
  getChannelMetadata(channelName: string): ChannelMetadata | undefined {
    return this.channelMetadata.get(channelName);
  }

  private handleSubscriptionStatus(
    status: SubscriptionStatus,
    channelName: string,
    timeoutId: NodeJS.Timeout,
  ): void {
    switch (status) {
      case 'SUBSCRIBED': {
        clearTimeout(timeoutId);
        this.channelMetadata.set(channelName, {
          name: channelName,
          createdAt: new Date(),
          lastActivity: new Date(),
          subscriptionCount: 1,
        });
        this.logger.log(`Subscribed to channel: ${channelName}`);
        break;
      }
      case 'CHANNEL_ERROR': {
        clearTimeout(timeoutId);
        this.cleanupFailedChannel(channelName);
        throw new RealtimeConnectionException(
          `Channel error: ${channelName} - Channel subscription failed`,
        );
      }
      case 'TIMED_OUT': {
        clearTimeout(timeoutId);
        this.cleanupFailedChannel(channelName);
        throw new RealtimeTimeoutException(
          `Channel timed out: ${channelName} - Channel subscription timed out`,
        );
      }
      case 'CLOSED': {
        this.logger.log(`Channel closed: ${channelName}`);
        break;
      }
    }
  }

  private handleSubscriptionTimeout(channelName: string, _channel: RealtimeChannel): void {
    this.cleanupFailedChannel(channelName);
    throw new RealtimeTimeoutException(
      `Channel ${channelName} subscription timed out after ${this.connectionTimeout}ms`,
    );
  }

  private cleanupFailedChannel(channelName: string): void {
    this.activeChannels.delete(channelName);
    this.channelMetadata.delete(channelName);
  }

  private updateChannelActivity(channelName: string): void {
    const metadata = this.channelMetadata.get(channelName);
    if (metadata) {
      metadata.lastActivity = new Date();
    }
  }
}
