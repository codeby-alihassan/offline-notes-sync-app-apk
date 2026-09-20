import React from 'react';
import { FileText, Plus, Database, User as UserIcon, RefreshCw } from 'lucide-react';
import { SyncIndicatorStatus } from '../types';

export type MobileTab = 'notes' | 'cloud' | 'account';

interface BottomNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  onNewNote: () => void;
  syncStatus: SyncIndicatorStatus;
  pendingCount: number;
  notesCount: number;
  isAuthenticated: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onNewNote,
  syncStatus,
  pendingCount,
  notesCount,
  isAuthenticated,
}) => {
  return (
    <nav
      id="mobile-bottom-navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 px-2 py-1.5 shadow-lg safe-bottom"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Notes Tab */}
        <button
          id="mobile-nav-notes"
          onClick={() => onSelectTab('notes')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] px-2 rounded-xl transition-all ${
            activeTab === 'notes'
              ? 'text-neutral-900 font-semibold'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <FileText className="w-5 h-5" />
            {notesCount > 0 && (
              <span className="absolute -top-1 -right-2.5 px-1.5 py-0.2 bg-neutral-100 border border-neutral-300 text-[10px] font-bold rounded-full text-neutral-700 min-w-[16px] text-center">
                {notesCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-1">Notes</span>
        </button>

        {/* Center Primary Action: + New Note */}
        <button
          id="mobile-nav-new-note"
          onClick={onNewNote}
          className="flex items-center gap-1.5 px-4 min-h-[44px] bg-neutral-900 active:bg-neutral-800 text-white rounded-full shadow-sm hover:shadow-md transition-all active:scale-95"
          title="Create a new note"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs font-semibold pr-0.5">New Note</span>
        </button>

        {/* Cloud Sync Tab */}
        <button
          id="mobile-nav-cloud"
          onClick={() => onSelectTab('cloud')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] px-2 rounded-xl transition-all ${
            activeTab === 'cloud'
              ? 'text-neutral-900 font-semibold'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <Database className="w-5 h-5" />
            {syncStatus === 'pending' && (
              <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
            )}
            {syncStatus === 'syncing' && (
              <RefreshCw className="absolute -top-1 -right-2 w-3 h-3 text-sky-600 animate-spin" />
            )}
            {syncStatus === 'offline' && (
              <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-neutral-400 ring-2 ring-white" />
            )}
            {syncStatus === 'synced' && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </div>
          <span className="text-[11px] mt-1">
            {syncStatus === 'pending' ? `Sync (${pendingCount})` : 'Cloud'}
          </span>
        </button>

        {/* Account Tab */}
        <button
          id="mobile-nav-account"
          onClick={() => onSelectTab('account')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] px-2 rounded-xl transition-all ${
            activeTab === 'account'
              ? 'text-neutral-900 font-semibold'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <UserIcon className="w-5 h-5" />
            {isAuthenticated && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </div>
          <span className="text-[11px] mt-1">{isAuthenticated ? 'Account' : 'Sign In'}</span>
        </button>
      </div>
    </nav>
  );
};
