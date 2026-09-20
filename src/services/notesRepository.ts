/**
 * Notes Repository
 *
 * Provides a clean interface for UI components to read and write notes
 * exclusively to IndexedDB first (offline-first source of truth).
 * Enqueues changes for cloud synchronization.
 */

import {
  idbGet,
  idbPut,
  idbGetNotesByUser,
  idbEnqueueSync,
  STORES,
} from '../db/indexedDB';
import { Note, SyncQueueItem } from '../types';

type ChangeListener = () => void;
const listeners = new Set<ChangeListener>();

export function subscribeToNoteChanges(listener: ChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyChange(): void {
  listeners.forEach((l) => {
    try {
      l();
    } catch (e) {
      console.error('Error in change listener:', e);
    }
  });
}

export const notesRepository = {
  /**
   * Fetch all active (non-deleted) notes for the current user from local IndexedDB
   */
  async getNotes(userId: string): Promise<Note[]> {
    return await idbGetNotesByUser(userId);
  },

  /**
   * Get a single note by ID
   */
  async getNote(id: string): Promise<Note | undefined> {
    return await idbGet<Note>(STORES.NOTES, id);
  },

  /**
   * Create a new note locally.
   * Immediately persists to IndexedDB, marks sync_status = 'pending',
   * enqueues operation in sync_queue, and notifies UI.
   */
  async createNote(userId: string, title = '', content = ''): Promise<Note> {
    const now = new Date().toISOString();
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `note_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const newNote: Note = {
      id,
      user_id: userId,
      title,
      content,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      sync_status: 'pending',
    };

    // 1. Save to local IndexedDB
    await idbPut(STORES.NOTES, newNote);

    // 2. Enqueue sync task
    const queueItem: SyncQueueItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sync_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      operation: 'create',
      entity: 'note',
      recordId: id,
      payload: newNote,
      timestamp: Date.now(),
      retries: 0,
    };
    await idbEnqueueSync(queueItem);

    // 3. Notify listeners (instant UI update)
    notifyChange();

    return newNote;
  },

  /**
   * Update an existing note locally.
   * Immediately updates IndexedDB, updates updated_at, marks sync_status = 'pending',
   * enqueues update in sync_queue, and notifies UI.
   */
  async updateNote(
    id: string,
    updates: { title?: string; content?: string },
  ): Promise<Note | null> {
    const existing = await idbGet<Note>(STORES.NOTES, id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updatedNote: Note = {
      ...existing,
      ...updates,
      updated_at: now,
      sync_status: 'pending',
    };

    await idbPut(STORES.NOTES, updatedNote);

    // Enqueue sync item
    const queueItem: SyncQueueItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sync_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      operation: 'update',
      entity: 'note',
      recordId: id,
      payload: updatedNote,
      timestamp: Date.now(),
      retries: 0,
    };
    await idbEnqueueSync(queueItem);

    notifyChange();
    return updatedNote;
  },

  /**
   * Soft-delete note locally using tombstone strategy.
   * Sets deleted_at = now, marks sync_status = 'pending', enqueues delete,
   * hides from active UI notes list immediately.
   */
  async deleteNote(id: string): Promise<boolean> {
    const existing = await idbGet<Note>(STORES.NOTES, id);
    if (!existing) return false;

    const now = new Date().toISOString();
    const tombstone: Note = {
      ...existing,
      deleted_at: now,
      updated_at: now,
      sync_status: 'pending',
    };

    await idbPut(STORES.NOTES, tombstone);

    const queueItem: SyncQueueItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sync_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      operation: 'delete',
      entity: 'note',
      recordId: id,
      payload: tombstone,
      timestamp: Date.now(),
      retries: 0,
    };
    await idbEnqueueSync(queueItem);

    notifyChange();
    return true;
  },
};
