/**
 * Core type definitions for SyncNote
 */

export type SyncState = 'synced' | 'pending' | 'failed';

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status?: SyncState;
}

export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  entity: 'note';
  recordId: string;
  payload: Partial<Note>;
  timestamp: number;
  retries: number;
  last_error?: string;
}

export type SyncIndicatorStatus = 'offline' | 'syncing' | 'synced' | 'pending' | 'failed';

export interface SyncStatusInfo {
  status: SyncIndicatorStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  isOnline: boolean;
}

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
}
