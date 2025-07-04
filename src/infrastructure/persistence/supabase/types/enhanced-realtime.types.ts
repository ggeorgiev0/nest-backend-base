/**
 * Enhanced type definitions for Supabase Realtime without using 'any'
 */

import { RealtimePostgresChangesPayload as SupabaseRealtimePayload } from '@supabase/supabase-js';

/**
 * Base type for all database records that can be tracked via realtime
 */
export interface RealtimeRecord {
  [key: string]: unknown;
}

/**
 * Generic constraint for realtime payloads
 */
export type RealtimePayloadConstraint = Record<string, unknown>;

/**
 * Enhanced type for realtime callbacks with proper generic constraints
 */
export type EnhancedRealtimeCallback<
  T extends RealtimePayloadConstraint = RealtimePayloadConstraint,
> = (payload: SupabaseRealtimePayload<T>) => void | Promise<void>;

/**
 * Type-safe realtime filter options
 */
export interface TypedRealtimeFilter {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in';
  value: string | number | boolean | null;
}

/**
 * Convert typed filter to string format for Supabase
 */
export function buildFilterString(filter: TypedRealtimeFilter): string {
  if (filter.value === null) {
    return `${filter.column}=${filter.operator}.null`;
  }
  return `${filter.column}=${filter.operator}.${filter.value}`;
}

/**
 * Extended realtime subscription options with type safety
 */
export interface TypedRealtimeSubscriptionOptions {
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table?: string;
  filter?: string;
}

/**
 * Type guard to check if a value is a valid realtime record
 */
export function isRealtimeRecord(value: unknown): value is RealtimeRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Helper type to extract the payload type from a realtime callback
 */
export type ExtractPayloadType<T> = T extends EnhancedRealtimeCallback<infer P> ? P : never;
