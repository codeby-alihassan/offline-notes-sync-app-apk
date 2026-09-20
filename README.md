# SyncNote — Offline-First Cloud Notes

**SyncNote** is an offline-first note-taking web application built with React, TypeScript, Vite, Tailwind CSS, IndexedDB, and Supabase.

The application allows users to read, create, edit, delete, and search notes with zero latency while completely disconnected from the internet. When network connectivity is restored, all offline changes are automatically synchronized to a PostgreSQL cloud database powered by Supabase with Row Level Security (RLS).

---

## Architecture Overview

SyncNote uses an **offline-first repository architecture**. The local browser storage (IndexedDB) is the immediate source of truth for all user interactions. Network I/O is completely decoupled from the user interface.

```
+-------------------------------------------------------------------------+
|                               SyncNote UI                               |
|        (React 19 + Tailwind CSS + Responsive Business Layout)           |
+------------------------------------+------------------------------------+
                                     |
                          1. Instant Read / Write
                                     v
+-------------------------------------------------------------------------+
|                         Notes Repository Layer                          |
|             (Atomically saves to IDB and enqueues sync tasks)            |
+-------------------+--------------------------------+--------------------+
                    |                                |
       Writes Note  |                   Queues Task  |
                    v                                v
+----------------------------+      +-------------------------------------+
|    IndexedDB: 'notes'      |      |      IndexedDB: 'sync_queue'        |
|  - id                      |      |  - id                               |
|  - user_id                 |      |  - operation (create/update/delete) |
|  - title, content          |      |  - recordId                         |
|  - created_at, updated_at  |      |  - payload                          |
|  - deleted_at (tombstone)  |      |  - timestamp, retries               |
|  - sync_status             |      +------------------+------------------+
+----------------------------+                         |
                    ^                                  |
                    | Reconciles (LWW)                 | 2. Pushes Outbound
                    |                                  v
+-------------------+-----------------------------------------------------+
|                              SyncEngine                                 |
|         (Monitors connectivity, executes Push & Pull passes)            |
+------------------------------------+------------------------------------+
                                     |
                       3. Authenticated HTTPS API
                                     v
+-------------------------------------------------------------------------+
|                           Supabase Cloud                                |
|        (PostgreSQL + Row Level Security + Google OAuth Provider)        |
+-------------------------------------------------------------------------+
```

---

## Tech Stack

* **Frontend Framework:** React 19, TypeScript
* **Build Tool:** Vite
* **Styling:** Tailwind CSS (modern, clean business-style interface)
* **Local Storage:** Native Browser IndexedDB (no heavy external storage wrappers)
* **Cloud Database & Auth:** Supabase (PostgreSQL with Row Level Security & Google OAuth)
* **Icons:** `lucide-react`

---

## How Offline Mode Works

1. **Local-First Writes:** When a user creates, edits, or deletes a note, the mutation is executed against the local IndexedDB database immediately.
2. **Instant UI Response:** The UI state updates instantly with zero network delay or loading spinners.
3. **Queue Enqueuing:** Each write creates an atomic entry in the `sync_queue` object store (operation type, record ID, timestamp, and payload).
4. **Offline Detection:** If the browser loses connectivity (`navigator.onLine === false` or network requests throw `TypeError: Failed to fetch`), the status changes to **Offline** or **Sync pending**.
5. **No Data Loss:** Notes created or modified offline remain fully intact inside the browser's persistent IndexedDB even if the browser tab is refreshed or closed.

---

## How Synchronization Works

SyncNote implements automatic two-way synchronization via `SyncEngine`:

### 1. Outbound Push (Local &rarr; Cloud)
* Triggered automatically whenever changes are queued, when internet connectivity returns (`window.addEventListener('online')`), and periodically.
* Reads pending operations from `sync_queue` in FIFO order.
* Executes idempotent `upsert` operations on Supabase `notes` table.
* Upon confirmation from Supabase, the item is removed from `sync_queue`, and the local note record is marked `sync_status: 'synced'`.

### 2. Inbound Pull & Restore (Cloud &rarr; Local)
* Queries Supabase for all notes belonging to the authenticated user (`auth.uid() = user_id`).
* Downloads cloud notes into local IndexedDB.
* Enables restoring all notes when a user signs in on a brand-new device or clean browser.

### 3. Deletions & Tombstone Strategy
* Deleting a note offline does not purge the local record immediately. Instead, it assigns a `deleted_at` timestamp (tombstone) and enqueues a `delete` sync operation.
* This ensures that when the device goes back online, Supabase receives the deletion tombstone rather than mistaking the missing local note for a new cloud note.
* Active UI lists filter out notes where `deleted_at !== null`.

### 4. Conflict Handling: Last-Write-Wins (LWW)
* If a note was modified both locally and remotely, SyncNote evaluates `updated_at` timestamps:
  - If a local change is currently uncommitted in `sync_queue`, local edits take precedence.
  - If remote `cloudNote.updated_at > localNote.updated_at`, the remote cloud version overwrites the local copy.
  - Keeps conflict resolution deterministic, fast, and simple without complex operational transformations.

---

## How Authentication Works

* **Google OAuth via Supabase Auth:** Users authenticate using their Google account (`supabase.auth.signInWithOAuth({ provider: 'google' })`).
* **Row Level Security (RLS):** Every row in the Supabase `notes` table stores `user_id uuid references auth.users(id)`.
* **Tenant Isolation:** RLS policies guarantee that users can **only** read, insert, update, and delete their own notes (`auth.uid() = user_id`).
* **Guest / Offline Session:** If a user opens the app while offline before logging in, SyncNote allows local note creation under a local guest session. Once signed in, local notes are migrated to the authenticated user ID.

---

## Supabase Setup Guide

### 1. Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, choose your organization, enter a project name (e.g., `SyncNote`), set a database password, and choose a region.

### 2. Configure Google Authentication
1. In your Supabase Dashboard, go to **Authentication &rarr; Providers &rarr; Google**.
2. Enable Google authentication.
3. Add your Google OAuth Client ID and Secret (obtained from Google Cloud Console).
4. Add your application URL (e.g. `http://localhost:3000`) to **Authentication &rarr; URL Configuration &rarr; Redirect URLs**.

### 3. Run the Database SQL Migration
1. In the Supabase Dashboard, open the **SQL Editor** on the left menu.
2. Click **New Query**.
3. Copy and paste the entire contents of `supabase/schema.sql` (or copy from below) and click **Run**:

```sql
-- 1. Create notes table
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

-- 2. Performance indexes
create index if not exists idx_notes_user_updated 
  on public.notes (user_id, updated_at desc);

create index if not exists idx_notes_user_deleted 
  on public.notes (user_id, deleted_at);

-- 3. Enable Row Level Security (RLS)
alter table public.notes enable row level security;

-- 4. RLS Policies
create policy "Users can view own notes"
  on public.notes for select
  using (auth.uid() = user_id);

create policy "Users can insert own notes"
  on public.notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notes"
  on public.notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own notes"
  on public.notes for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.notes to authenticated;
```

---

## Environment Configuration

Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

Fill in your Supabase credentials:

```env
# From Supabase Dashboard -> Project Settings -> API
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

> **Security Note:** Only use the **anon / public** API key in the frontend. Never expose the `service_role` key.
> 
> *Tip:* You can also click the **Connect Cloud** button in the SyncNote UI header to enter or test your credentials directly in the browser.

---

## Running Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing Scenarios

### Test 1: Online Note Creation
1. Sign in with Google (or configure Supabase credentials).
2. Click **New Note**, type a title and content.
3. Observe the status pill: changes from **Syncing...** to **Synced** within moments.
4. Open the Supabase Table Editor &rarr; `notes` table to verify the row is saved in PostgreSQL.

### Test 2: Offline Note Creation & Auto-Sync
1. Open DevTools in your browser (`F12` or `Ctrl+Shift+I` / `Cmd+Option+I`).
2. Go to the **Network** tab and toggle the dropdown from **No throttling** to **Offline**.
3. Notice the SyncNote header banner displays **Offline**.
4. Create 3 new notes and modify their titles.
5. Notice the status indicator displays **Sync pending (3)** and each note shows a pending badge.
6. Refresh the page while still offline — all notes and queued changes remain in IndexedDB!
7. Switch Network back to **No throttling** (Online).
8. Observe SyncNote automatically detect connectivity, push pending changes, and transition to **Synced**.

### Test 3: Offline Editing & Deletion (Tombstones)
1. Switch browser to **Offline** mode in DevTools.
2. Edit an existing note's content.
3. Delete another note by clicking the trash icon.
4. Verify the deleted note disappears from the active list, while the deletion tombstone is queued.
5. Reconnect to the internet.
6. Verify the edited note updates in Supabase and the deleted note's `deleted_at` is set in Supabase.

### Test 4: Restoring Cloud Notes on Another Device / Browser
1. Open a different browser (or an Incognito/Private window).
2. Open the SyncNote URL.
3. Sign in with the same Google account.
4. The SyncEngine automatically runs an inbound pull pass, downloads all cloud notes into the new browser's IndexedDB, and displays them.

---

## Known Limitations & Design Decisions

* **Conflict Strategy:** Uses simple Last-Write-Wins (LWW) based on timestamps. It does not perform character-by-character Operational Transformation (OT) or CRDTs for simultaneous real-time multi-user cursor editing.
* **Storage Limits:** Browser IndexedDB storage is quota-bounded by available device disk space (typically gigabytes on desktop, hundreds of megabytes on mobile).
* **Tombstone Cleanup:** Soft-deleted notes remain in PostgreSQL with `deleted_at != null` to propagate deletions cleanly across all devices. A periodic scheduled SQL cron job (`pg_cron`) can purge tombstones older than 30 days if desired.
