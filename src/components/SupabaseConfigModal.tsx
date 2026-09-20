import React, { useState } from 'react';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  isSupabaseConfigured,
} from '../services/supabase';
import { Database, X, Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const SAMPLE_SCHEMA = `-- SyncNote SQL Schema
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

create policy "Users manage own notes"
  on public.notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);`;

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const currentCreds = getSupabaseCredentials();
  const [url, setUrl] = useState(currentCreds.url);
  const [anonKey, setAnonKey] = useState(currentCreds.anonKey);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(url, anonKey);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onSaved();
      onClose();
    }, 600);
  };

  const handleReset = () => {
    clearSupabaseCredentials();
    setUrl('');
    setAnonKey('');
    onSaved();
  };

  const copySql = () => {
    navigator.clipboard.writeText(SAMPLE_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-neutral-200 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Supabase Cloud Settings</h2>
              <p className="text-xs text-neutral-500">Connect your PostgreSQL cloud database</p>
            </div>
          </div>
          <button
            id="close-config-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3.5 text-xs text-blue-900 leading-relaxed">
            <div className="flex items-center gap-1.5 font-medium mb-1 text-blue-950">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Offline-First Architecture Guarantee</span>
            </div>
            SyncNote operates fully offline in IndexedDB even without Supabase credentials. When configured, notes automatically synchronize to your Supabase PostgreSQL database.
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Supabase Project URL
              </label>
              <input
                id="input-supabase-url"
                type="url"
                required
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                From Supabase Dashboard &rarr; Project Settings &rarr; API &rarr; Project URL
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Supabase Anon / Public API Key
              </label>
              <input
                id="input-supabase-anon"
                type="password"
                required
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Client-safe anon key with Row Level Security. Never enter the service_role key.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-rose-600 hover:text-rose-700 hover:underline"
              >
                Clear Custom Keys
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="save-supabase-config-btn"
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save & Connect</span>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Quick SQL Schema Reference */}
          <div className="border-t border-neutral-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                SQL Schema Quick Setup
              </span>
              <button
                onClick={copySql}
                className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 hover:underline"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
              </button>
            </div>
            <pre className="bg-neutral-900 text-neutral-100 p-3 rounded-lg text-[11px] font-mono overflow-x-auto max-h-28">
              {SAMPLE_SCHEMA}
            </pre>
            <p className="text-[11px] text-neutral-500 mt-1 flex items-center gap-1">
              <span>Run in Supabase SQL Editor. Complete script available in</span>
              <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-800 font-mono">supabase/schema.sql</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
