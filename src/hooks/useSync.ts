import { useState, useEffect, useCallback } from 'react';
import { syncEngine } from '../sync/syncEngine';
import { SyncStatusInfo } from '../types';

export function useSync() {
  const [syncInfo, setSyncInfo] = useState<SyncStatusInfo>(() => syncEngine.getStatusInfo());

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((updatedInfo) => {
      setSyncInfo(updatedInfo);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const triggerSync = useCallback(async () => {
    await syncEngine.sync();
  }, []);

  return {
    ...syncInfo,
    triggerSync,
  };
}
