import { useState, useEffect, useCallback } from 'react';
import {
  getSupabase,
  signInWithGoogle as authSignInWithGoogle,
  signOut as authSignOut,
  isSupabaseConfigured,
} from '../services/supabase';
import { AuthUser, Note } from '../types';
import { syncEngine } from '../sync/syncEngine';
import { idbGetAll, idbPut, STORES } from '../db/indexedDB';

const LOCAL_GUEST_ID = 'local_offline_user';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(isSupabaseConfigured());

  // Check auth state on mount and subscribe to changes
  useEffect(() => {
    const supabase = getSupabase();
    setIsConfigured(isSupabaseConfigured());

    if (!supabase) {
      // Fall back to local guest user for offline operations
      const guestUser: AuthUser = {
        id: LOCAL_GUEST_ID,
        name: 'Offline User',
        email: 'Local Storage Only',
      };
      setUser(guestUser);
      syncEngine.setUser(LOCAL_GUEST_ID);
      setIsLoading(false);
      return;
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn('Error fetching session:', error);
      }
      if (session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url,
        };
        setUser(authUser);
        syncEngine.setUser(authUser.id);
      } else {
        // Fallback to guest user
        const guestUser: AuthUser = {
          id: LOCAL_GUEST_ID,
          name: 'Guest (Offline)',
        };
        setUser(guestUser);
        syncEngine.setUser(LOCAL_GUEST_ID);
      }
      setIsLoading(false);
    });

    // Listen for auth state changes (e.g. OAuth redirect return, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url,
        };

        // If transitioning from local guest to authenticated user, adopt notes
        try {
          const allNotes = await idbGetAll<Note>(STORES.NOTES);
          for (const note of allNotes) {
            if (note.user_id === LOCAL_GUEST_ID) {
              await idbPut(STORES.NOTES, {
                ...note,
                user_id: authUser.id,
                sync_status: 'pending',
              });
            }
          }
        } catch (migrationErr) {
          console.error('Note migration error:', migrationErr);
        }

        setUser(authUser);
        syncEngine.setUser(authUser.id);
        syncEngine.sync();
      } else {
        const guestUser: AuthUser = {
          id: LOCAL_GUEST_ID,
          name: 'Guest (Offline)',
        };
        setUser(guestUser);
        syncEngine.setUser(LOCAL_GUEST_ID);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignInWithGoogle = useCallback(async () => {
    setAuthError(null);
    const { error } = await authSignInWithGoogle();
    if (error) {
      setAuthError(error.message);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setAuthError(null);
    const { error } = await authSignOut();
    if (error) {
      setAuthError(error.message);
    } else {
      const guestUser: AuthUser = {
        id: LOCAL_GUEST_ID,
        name: 'Guest (Offline)',
      };
      setUser(guestUser);
      syncEngine.setUser(LOCAL_GUEST_ID);
    }
  }, []);

  const refreshConfig = useCallback(() => {
    setIsConfigured(isSupabaseConfigured());
  }, []);

  const isAuthenticated = Boolean(user && user.id !== LOCAL_GUEST_ID);

  return {
    user,
    isAuthenticated,
    isLoading,
    authError,
    isConfigured,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
    refreshConfig,
  };
}
