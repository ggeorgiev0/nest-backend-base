import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export type SubscriptionStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';

export interface RealtimeSubscriptionOptions {
  event?: ChangeEvent;
  schema?: string;
  table?: string;
  filter?: string;
}

export interface RealtimeConfig {
  maxChannels?: number;
  connectionTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export type RealtimeCallback<T extends Record<string, unknown> = Record<string, unknown>> = (
  payload: RealtimePostgresChangesPayload<T>,
) => void | Promise<void>;

export interface ChannelMetadata {
  name: string;
  createdAt: Date;
  lastActivity: Date;
  subscriptionCount: number;
}
