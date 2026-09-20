import React, { useState } from 'react';
import { SyncIndicatorStatus, AuthUser } from '../types';
import { StatusBadge } from './StatusBadge';
import {
  NotebookPen,
  RefreshCw,
  LogIn,
  LogOut,
  Database,
  WifiOff,
  User as UserIcon,
} from 'lucide-react';
import { SupabaseConfigModal } from './SupabaseConfigModal';

interface HeaderProps {
  status: SyncIndicatorStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  isOnline: boolean;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isConfigured: boolean;
  onSync: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onConfigChanged: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  pendingCount,
  lastSyncedAt,
  isOnline,
  user,
  isAuthenticated,
  isConfigured,
  onSync,
  onSignIn,
  onSignOut,
  onConfigChanged,
}) => {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Format last synced time
  const formatLastSynced = (iso: string | null) => {
    if (!iso) return 'Never';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return 'Never';

    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <header className="border-b border-neutral-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* App Branding */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <NotebookPen className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-100" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-neutral-900 text-base sm:text-lg tracking-tight truncate">
                  SyncNote
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-neutral-100 text-neutral-600 tracking-wider">
                  Offline-First
                </span>
              </div>
            </div>
          </div>

          {/* Sync & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-4 flex-shrink-0">
            {/* Status Pill */}
            <div className="flex items-center gap-1.5">
              <StatusBadge status={status} pendingCount={pendingCount} />

              {/* Last synced timestamp (desktop) */}
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-[10px] text-neutral-400 font-medium">Last synced</span>
                <span className="text-xs text-neutral-700 font-medium font-mono">
                  {formatLastSynced(lastSyncedAt)}
                </span>
              </div>

              {/* Manual Sync Button with min 44px touch target on mobile */}
              <button
                id="manual-sync-btn"
                onClick={onSync}
                disabled={status === 'syncing' || !isOnline}
                title="Trigger immediate sync with Supabase"
                className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${status === 'syncing' ? 'animate-spin text-sky-600' : ''}`} />
              </button>
            </div>

            {/* Cloud Database Config button (visible on desktop or tablet) */}
            <button
              id="open-db-config-btn"
              onClick={() => setIsConfigModalOpen(true)}
              title={isConfigured ? 'Supabase connected' : 'Configure Supabase credentials'}
              className={`hidden md:inline-flex items-center gap-1.5 px-3 min-h-[36px] rounded-xl border transition-all text-xs font-medium ${
                isConfigured
                  ? 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                  : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>{isConfigured ? 'Supabase' : 'Connect Cloud'}</span>
            </button>

            {/* Desktop User Profile / Sign In */}
            <div className="hidden md:flex border-l border-neutral-200 pl-3 sm:pl-4 items-center gap-2">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-2.5">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full border border-neutral-200 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-medium text-xs">
                      {user.name ? user.name.slice(0, 2).toUpperCase() : <UserIcon className="w-4 h-4" />}
                    </div>
                  )}

                  <div className="text-left">
                    <p className="text-xs font-semibold text-neutral-800 truncate max-w-[120px]">
                      {user.name || 'User'}
                    </p>
                    <p className="text-[10px] text-neutral-500 truncate max-w-[120px]">
                      {user.email}
                    </p>
                  </div>

                  <button
                    id="sign-out-btn"
                    onClick={onSignOut}
                    title="Sign out"
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center text-neutral-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  id="google-signin-btn"
                  onClick={onSignIn}
                  className="inline-flex items-center gap-2 px-3.5 min-h-[38px] text-xs font-medium text-neutral-800 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl shadow-2xs hover:shadow-xs transition-all"
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
              )}
            </div>
          </div>
        </div>

        {/* Global Offline Bar if offline */}
        {!isOnline && (
          <div className="bg-neutral-800 text-neutral-100 text-xs py-1.5 px-4 flex items-center justify-center gap-2">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span>You are currently offline. Changes are saved to IndexedDB and will auto-sync when online.</span>
          </div>
        )}
      </header>

      {/* Supabase Config Modal */}
      <SupabaseConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSaved={onConfigChanged}
      />
    </>
  );
};
