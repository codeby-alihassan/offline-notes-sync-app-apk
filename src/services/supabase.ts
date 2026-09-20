/**
 * Supabase Client and Authentication Service
 *
 * Configured with Row Level Security (RLS) via public anon key.
 * Never use service_role key in frontend.
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const STORAGE_KEY_CUSTOM_URL = 'syncnote_custom_supabase_url';
const STORAGE_KEY_CUSTOM_ANON = 'syncnote_custom_supabase_anon';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  // Check localStorage overrides first (convenient for interactive preview setup)
  const customUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CUSTOM_URL) : null;
  const customAnon = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CUSTOM_ANON) : null;

  const url = (customUrl || import.meta.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (customAnon || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  return { url, anonKey };
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_CUSTOM_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_CUSTOM_ANON, anonKey.trim());
    // Recreate client instance
    supabaseClientInstance = null;
  }
}

export function clearSupabaseCredentials(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_URL);
    localStorage.removeItem(STORAGE_KEY_CUSTOM_ANON);
    supabaseClientInstance = null;
  }
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http') && anonKey.length > 10);
}

let supabaseClientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseClientInstance) return supabaseClientInstance;

  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey || !url.startsWith('http')) {
    return null;
  }

  try {
    supabaseClientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return supabaseClientInstance;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

// Authentication operations

export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  const client = getSupabase();
  if (!client) {
    return {
      error: new Error(
        'Supabase is not configured yet. Please configure your Supabase URL and Anon Key.',
      ),
    };
  }

  const redirectTo = window.location.origin;

  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });

  return { error };
}

export async function signOut(): Promise<{ error: Error | null }> {
  const client = getSupabase();
  if (!client) return { error: null };

  const { error } = await client.auth.signOut();
  return { error };
}

export async function getCurrentUser(): Promise<User | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data: { user } } = await client.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
