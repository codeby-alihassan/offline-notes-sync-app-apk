/**
 * Native IndexedDB wrapper for SyncNote offline storage.
 * Manages 'notes', 'sync_queue', and 'metadata' stores.
 */

import { Note, SyncQueueItem } from '../types';

const DB_NAME = 'syncnote_db';
const DB_VERSION = 1;

export const STORES = {
  NOTES: 'notes',
  SYNC_QUEUE: 'sync_queue',
  METADATA: 'metadata',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // 1. Notes store
      if (!db.objectStoreNames.contains(STORES.NOTES)) {
        const notesStore = db.createObjectStore(STORES.NOTES, { keyPath: 'id' });
        notesStore.createIndex('user_id', 'user_id', { unique: false });
        notesStore.createIndex('updated_at', 'updated_at', { unique: false });
        notesStore.createIndex('deleted_at', 'deleted_at', { unique: false });
        notesStore.createIndex('sync_status', 'sync_status', { unique: false });
      }

      // 2. Sync Queue store
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
        queueStore.createIndex('recordId', 'recordId', { unique: false });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // 3. Metadata store (key-value)
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onclose = () => {
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });

  return dbPromise;
}

// Low-level helper operations

export async function idbGet<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPut<T>(storeName: string, value: T): Promise<IDBValidKey> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbDelete(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function idbClear(storeName: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Typed helpers for Notes store
export async function idbGetNotesByUser(userId: string): Promise<Note[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTES, 'readonly');
    const store = tx.objectStore(STORES.NOTES);
    const index = store.index('user_id');
    const req = index.getAll(IDBKeyRange.only(userId));
    req.onsuccess = () => {
      const all = (req.result as Note[]) || [];
      // Filter out tombstones/soft-deleted notes for the UI view
      const active = all.filter(n => !n.deleted_at);
      // Sort newest updated first
      active.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      resolve(active);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function idbGetAllNotesWithTombstones(userId: string): Promise<Note[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTES, 'readonly');
    const store = tx.objectStore(STORES.NOTES);
    const index = store.index('user_id');
    const req = index.getAll(IDBKeyRange.only(userId));
    req.onsuccess = () => resolve(req.result as Note[]);
    req.onerror = () => reject(req.error);
  });
}

// Typed helpers for Sync Queue
export async function idbGetQueue(): Promise<SyncQueueItem[]> {
  const items = await idbGetAll<SyncQueueItem>(STORES.SYNC_QUEUE);
  // Sort FIFO by timestamp
  return items.sort((a, b) => a.timestamp - b.timestamp);
}

export async function idbEnqueueSync(item: SyncQueueItem): Promise<void> {
  // If an existing queue item already exists for this recordId, consolidate or replace
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const index = store.index('recordId');
    const req = index.getAll(IDBKeyRange.only(item.recordId));

    req.onsuccess = () => {
      const existing = (req.result as SyncQueueItem[]) || [];
      // If we are deleting a record that was newly created while offline and never sent to cloud,
      // we can simply remove the creation queue item and the delete queue item
      const createdOffline = existing.find(e => e.operation === 'create');
      if (item.operation === 'delete' && createdOffline) {
        // Delete previous create operation
        existing.forEach(e => store.delete(e.id));
        // Also do not add delete operation if it never existed on server
        // (Wait: If it never was on the server, server doesn't know about it. But we check payload.user_id)
      }

      // If updating, merge payload or replace existing update
      existing.forEach(e => {
        if (e.operation === 'update' && item.operation === 'update') {
          store.delete(e.id);
        }
      });

      store.put(item);
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDequeueSync(itemId: string): Promise<void> {
  await idbDelete(STORES.SYNC_QUEUE, itemId);
}

// Metadata helpers
export async function idbGetMeta<T>(key: string): Promise<T | null> {
  const res = await idbGet<{ key: string; value: T }>(STORES.METADATA, key);
  return res ? res.value : null;
}

export async function idbSetMeta<T>(key: string, value: T): Promise<void> {
  await idbPut(STORES.METADATA, { key, value });
}
