import React, { useState } from 'react';
import { SyncIndicatorStatus, AuthUser } from '../types';
import { StatusBadge } from './StatusBadge';
import {
  Database,
  RefreshCw,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Check,
  Copy,
  Wifi,
  WifiOff,
  Cloud,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
} from '../services/supabase';

interface MobileCloudViewProps {
  status: SyncIndicatorStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  isOnline: boolean;
  isConfigured: boolean;
  onSync: () => void;
  onConfigSaved: () => void;
  onClose: () => void;
}

export const MobileCloudView: React.FC<MobileCloudViewProps> = ({
  status,
  pendingCount,
  lastSyncedAt,
  isOnline,
  isConfigured,
  onSync,
  onConfigSaved,
  onClose,
}) => {
  const currentCreds = getSupabaseCredentials();
  const [url, setUrl] = useState(currentCreds.url);
  const [anonKey, setAnonKey] = useState(currentCreds.anonKey);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const formatLastSynced = (iso: string | null) => {
    if (!iso) return 'Never';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return 'Never';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(url, anonKey);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onConfigSaved();
      onClose();
    }, 600);
  };

  const copySql = () => {
    const sql = `-- SyncNote SQL Schema
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);
alter table public.notes enable row level security;
create policy "Users manage own notes" on public.notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);`;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 pb-24 bg-neutral-50/60">
      {/* Cloud Status Card */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Sync Status</h3>
              <p className="text-[11px] text-neutral-500">
                {isOnline ? 'Online connection active' : 'Device is currently offline'}
              </p>
            </div>
          </div>
          <StatusBadge status={status} pendingCount={pendingCount} />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100 text-xs">
          <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
            <span className="text-neutral-400 block text-[10px] uppercase font-medium">Last Synced</span>
            <span className="font-semibold text-neutral-800 font-mono mt-0.5 block">
              {formatLastSynced(lastSyncedAt)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
            <span className="text-neutral-400 block text-[10px] uppercase font-medium">Queue</span>
            <span className="font-semibold text-neutral-800 font-mono mt-0.5 block">
              {pendingCount} pending
            </span>
          </div>
        </div>

        {/* Sync Now Button - 48px height */}
        <button
          onClick={onSync}
          disabled={status === 'syncing' || !isOnline}
          className="w-full flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl bg-neutral-900 active:bg-neutral-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
        >
          <RefreshCw className={`w-4 h-4 ${status === 'syncing' ? 'animate-spin' : ''}`} />
          <span>{status === 'syncing' ? 'Synchronizing now...' : 'Sync Cloud Now'}</span>
        </button>
      </div>

      {/* Supabase Connection Settings */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Supabase Connection</h3>
            <p className="text-[11px] text-neutral-500">PostgreSQL cloud storage credentials</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1">
              Project URL
            </label>
            <input
              type="url"
              required
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1">
              Anon / Public Key
            </label>
            <input
              type="password"
              required
              placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-neutral-900 active:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.99]"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved & Connected!</span>
              </>
            ) : (
              <span>Save Credentials</span>
            )}
          </button>
        </form>

        {/* Quick SQL Copy */}
        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
          <span className="text-neutral-500 text-[11px]">Database Schema:</span>
          <button
            onClick={copySql}
            className="inline-flex items-center gap-1 text-[11px] text-neutral-800 font-medium hover:underline p-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied SQL' : 'Copy SQL Schema'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface MobileAccountViewProps {
  user: AuthUser | null;
  isAuthenticated: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onClose: () => void;
}

export const MobileAccountView: React.FC<MobileAccountViewProps> = ({
  user,
  isAuthenticated,
  onSignIn,
  onSignOut,
  onClose,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 pb-24 bg-neutral-50/60">
      <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-2xs space-y-4 text-center">
        {isAuthenticated && user ? (
          <>
            <div className="mx-auto w-16 h-16 rounded-full border-2 border-neutral-200 overflow-hidden flex items-center justify-center bg-neutral-100">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name || 'User'} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-8 h-8 text-neutral-500" />
              )}
            </div>

            <div>
              <h2 className="text-base font-bold text-neutral-900">{user.name || 'Google User'}</h2>
              <p className="text-xs text-neutral-500 mt-0.5">{user.email}</p>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
                Connected via Google
              </span>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed text-left bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              Your notes are bound to your Google account with Row Level Security. Opening SyncNote on another device with this account restores your cloud notes automatically.
            </p>

            <button
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold shadow-2xs active:bg-rose-100 transition-all active:scale-[0.99]"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-600">
              <UserIcon className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-base font-bold text-neutral-900">Offline Guest Mode</h2>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                You can write and edit notes offline without an account. Sign in with Google to enable automatic cloud synchronization across your devices.
              </p>
            </div>

            <button
              onClick={onSignIn}
              className="w-full flex items-center justify-center gap-2.5 min-h-[48px] px-4 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs font-semibold shadow-2xs active:bg-neutral-50 transition-all active:scale-[0.99]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
