-- ==============================================================================
-- SyncNote: PostgreSQL / Supabase Migration Schema
-- ==============================================================================
-- Run this SQL script in your Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ==============================================================================

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
-- Query active notes for user, sorted by updated_at
create index if not exists idx_notes_user_updated 
  on public.notes (user_id, updated_at desc);

-- Query sync changes / tombstones since timestamp
create index if not exists idx_notes_user_deleted 
  on public.notes (user_id, deleted_at);

-- 3. Enable Row Level Security (RLS)
alter table public.notes enable row level security;

-- 4. Row Level Security Policies
-- Policy: Users can only view their own notes
create policy "Users can view own notes"
  on public.notes
  for select
  using (auth.uid() = user_id);

-- Policy: Users can only insert notes where user_id matches authenticated user
create policy "Users can insert own notes"
  on public.notes
  for insert
  with check (auth.uid() = user_id);

-- Policy: Users can only update their own notes
create policy "Users can update own notes"
  on public.notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: Users can delete their own notes (if hard deletion is performed)
create policy "Users can delete own notes"
  on public.notes
  for delete
  using (auth.uid() = user_id);

-- 5. Optional auto-update updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  -- Only overwrite updated_at if the client did not explicitly supply a newer timestamp
  if new.updated_at is null or new.updated_at <= old.updated_at then
    new.updated_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
  before update on public.notes
  for each row
  execute function public.handle_updated_at();

-- 6. Grant appropriate permissions to authenticated users
grant select, insert, update, delete on public.notes to authenticated;
