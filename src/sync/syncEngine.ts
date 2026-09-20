/**
 * SyncEngine for SyncNote
 *
 * Implements two-way synchronization between local IndexedDB and Supabase:
 * - Push: flushes local sync_queue to Supabase with idempotency
 * - Pull: restores cloud notes and reconciles with Last-Write-Wins (LWW)
 * - Automatic retry on network reconnection
 * - Graceful fallback and status emission
 */

import {
  idbGetQueue,
  idbDequeueSync,
  idbPut,
  idbGet,
  idbGetMeta,
  idbSetMeta,
  STORES,
  idbGetAllNotesWithTombstones,
} from '../db/indexedDB';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import { Note, SyncIndicatorStatus, SyncQueueItem, SyncStatusInfo } from '../types';

type SyncStatusListener = (info: SyncStatusInfo) => void;

class SyncEngine {
  private listeners = new Set<SyncStatusListener>();
  private isSyncing = false;
  private currentStatus: SyncIndicatorStatus = 'synced';
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private activeUserId: string | null = null;
  private syncTimer: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notify();
        this.sync();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.currentStatus = 'offline';
        this.notify();
      });

      // Heartbeat periodic sync (every 25 seconds if online)
      setInterval(() => {
        if (this.isOnline && this.activeUserId) {
          this.sync();
        }
      }, 25000);
    }
  }

  public subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatusInfo());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getStatusInfo(): SyncStatusInfo {
    return {
      status: this.currentStatus,
      pendingCount: 0, // will be dynamically refreshed
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
      isOnline: this.isOnline,
    };
  }

  private async notify(overridePending?: number): Promise<void> {
    const queue = await idbGetQueue().catch(() => []);
    const pendingCount = overridePending !== undefined ? overridePending : queue.length;

    // Derive indicator status if not actively syncing or offline
    let displayStatus = this.currentStatus;
    if (!this.isOnline) {
      displayStatus = 'offline';
    } else if (this.isSyncing) {
      displayStatus = 'syncing';
    } else if (this.lastError) {
      displayStatus = pendingCount > 0 ? 'failed' : 'synced';
    } else if (pendingCount > 0) {
      displayStatus = 'pending';
    } else {
      displayStatus = 'synced';
    }

    this.currentStatus = displayStatus;

    const info: SyncStatusInfo = {
      status: displayStatus,
      pendingCount,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
      isOnline: this.isOnline,
    };

    this.listeners.forEach((l) => {
      try {
        l(info);
      } catch (err) {
        console.error('Error notifying sync listener:', err);
      }
    });
  }

  public setUser(userId: string | null): void {
    const prev = this.activeUserId;
    this.activeUserId = userId;

    if (userId && userId !== prev) {
      // Load last synced timestamp for this user
      idbGetMeta<string>(`last_synced_at_${userId}`).then((saved) => {
        this.lastSyncedAt = saved;
        this.notify();
        this.sync();
      });
    } else if (!userId) {
      this.lastSyncedAt = null;
      this.notify();
    }
  }

  /**
   * Schedules a debounced sync pass (e.g. after local note edits)
   */
  public scheduleSync(delayMs = 800): void {
    if (this.syncTimer) {
      window.clearTimeout(this.syncTimer);
    }
    this.syncTimer = window.setTimeout(() => {
      this.sync();
    }, delayMs);
    // Immediately reflect pending state
    this.notify();
  }

  /**
   * Main synchronization procedure
   */
  public async sync(): Promise<void> {
    if (this.isSyncing) return;

    // If offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.isOnline = false;
      await this.notify();
      return;
    }

    // Require Supabase configuration & authenticated user
    if (!isSupabaseConfigured() || !this.activeUserId) {
      // Without cloud configuration or login, we stay purely local
      const queue = await idbGetQueue().catch(() => []);
      if (queue.length > 0) {
        this.currentStatus = 'pending';
      } else {
        this.currentStatus = 'synced';
      }
      await this.notify();
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    this.isSyncing = true;
    this.currentStatus = 'syncing';
    this.lastError = null;
    await this.notify();

    try {
      // -------------------------------------------------------------
      // PHASE 1: Push outbound local changes from sync_queue
      // -------------------------------------------------------------
      const queue = await idbGetQueue();

      for (const item of queue) {
        try {
          const payload = item.payload;

          if (item.operation === 'create' || item.operation === 'update') {
            // Upsert note record into Supabase
            const { error } = await supabase.from('notes').upsert({
              id: payload.id || item.recordId,
              user_id: payload.user_id || this.activeUserId,
              title: payload.title ?? '',
              content: payload.content ?? '',
              created_at: payload.created_at,
              updated_at: payload.updated_at,
              deleted_at: payload.deleted_at ?? null,
            });

            if (error) throw error;

            // Remove from queue
            await idbDequeueSync(item.id);

            // Mark local record as 'synced' if still in local storage
            const local = await idbGet<Note>(STORES.NOTES, item.recordId);
            if (local && local.updated_at === payload.updated_at) {
              await idbPut(STORES.NOTES, { ...local, sync_status: 'synced' });
            }
          } else if (item.operation === 'delete') {
            // Soft-delete: update deleted_at in Supabase
            const { error } = await supabase.from('notes').upsert({
              id: item.recordId,
              user_id: payload.user_id || this.activeUserId,
              title: payload.title ?? '',
              content: payload.content ?? '',
              created_at: payload.created_at || new Date().toISOString(),
              updated_at: payload.updated_at || new Date().toISOString(),
              deleted_at: payload.deleted_at || new Date().toISOString(),
            });

            if (error) throw error;

            await idbDequeueSync(item.id);

            const local = await idbGet<Note>(STORES.NOTES, item.recordId);
            if (local) {
              await idbPut(STORES.NOTES, { ...local, sync_status: 'synced' });
            }
          }
        } catch (itemErr: any) {
          console.warn(`Sync item failed for record ${item.recordId}:`, itemErr);
          this.lastError = itemErr.message || 'Network or database error during upload';

          // If network failure, stop pushing remaining queue items
          if (
            itemErr.message?.includes('Failed to fetch') ||
            itemErr.message?.includes('NetworkError') ||
            !navigator.onLine
          ) {
            this.isOnline = false;
            break;
          }
        }
      }

      // -------------------------------------------------------------
      // PHASE 2: Pull inbound cloud notes (Restore & Reconcile)
      // -------------------------------------------------------------
      if (this.isOnline) {
        const { data: cloudNotes, error: fetchErr } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', this.activeUserId);

        if (fetchErr) {
          throw fetchErr;
        }

        if (cloudNotes && Array.isArray(cloudNotes)) {
          const currentQueue = await idbGetQueue();
          const pendingIds = new Set(currentQueue.map((q) => q.recordId));
          const localNotes = await idbGetAllNotesWithTombstones(this.activeUserId);
          const localMap = new Map(localNotes.map((n) => [n.id, n]));

          for (const cNote of cloudNotes) {
            const lNote = localMap.get(cNote.id);

            if (!lNote) {
              // Note does not exist locally — save it!
              await idbPut(STORES.NOTES, {
                id: cNote.id,
                user_id: cNote.user_id,
                title: cNote.title || '',
                content: cNote.content || '',
                created_at: cNote.created_at,
                updated_at: cNote.updated_at,
                deleted_at: cNote.deleted_at || null,
                sync_status: 'synced',
              });
            } else {
              // Exists locally: Conflict resolution with Last-Write-Wins (LWW)
              // If local note has uncommitted changes in sync_queue, local changes take precedence
              if (pendingIds.has(cNote.id)) {
                continue;
              }

              const cloudTime = new Date(cNote.updated_at).getTime();
              const localTime = new Date(lNote.updated_at).getTime();

              if (cloudTime > localTime) {
                // Cloud is newer: update local copy
                await idbPut(STORES.NOTES, {
                  id: cNote.id,
                  user_id: cNote.user_id,
                  title: cNote.title || '',
                  content: cNote.content || '',
                  created_at: cNote.created_at,
                  updated_at: cNote.updated_at,
                  deleted_at: cNote.deleted_at || null,
                  sync_status: 'synced',
                });
              }
            }
          }
        }

        // Record last synced timestamp
        const nowIso = new Date().toISOString();
        this.lastSyncedAt = nowIso;
        if (this.activeUserId) {
          await idbSetMeta(`last_synced_at_${this.activeUserId}`, nowIso);
        }
      }
    } catch (err: any) {
      console.error('Error during synchronization:', err);
      this.lastError = err.message || 'Synchronization failed';
    } finally {
      this.isSyncing = false;
      await this.notify();
    }
  }
}

export const syncEngine = new SyncEngine();
