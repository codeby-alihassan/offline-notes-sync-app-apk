import React from 'react';
import { SyncIndicatorStatus } from '../types';
import { CloudOff, RefreshCw, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: SyncIndicatorStatus;
  pendingCount?: number;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  pendingCount = 0,
  className = '',
}) => {
  switch (status) {
    case 'offline':
      return (
        <span
          id="sync-status-offline"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200 ${className}`}
          title="Working completely offline. Changes saved locally to IndexedDB."
        >
          <CloudOff className="w-3.5 h-3.5 text-neutral-500" />
          <span>Offline</span>
        </span>
      );

    case 'syncing':
      return (
        <span
          id="sync-status-syncing"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200 ${className}`}
          title="Synchronizing changes with Supabase cloud..."
        >
          <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin" />
          <span>Syncing...</span>
        </span>
      );

    case 'synced':
      return (
        <span
          id="sync-status-synced"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
          title="All local changes are fully synced to cloud."
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Synced</span>
        </span>
      );

    case 'pending':
      return (
        <span
          id="sync-status-pending"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 ${className}`}
          title={`${pendingCount} change${pendingCount === 1 ? '' : 's'} queued for synchronization.`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          <span>Sync pending{pendingCount > 0 ? ` (${pendingCount})` : ''}</span>
        </span>
      );

    case 'failed':
      return (
        <span
          id="sync-status-failed"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 ${className}`}
          title="Cloud synchronization encountered an error. Changes remain safely stored locally."
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Sync failed</span>
        </span>
      );

    default:
      return null;
  }
};
