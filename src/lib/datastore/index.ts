import type { DataStore } from '@/types/datastore';
import { SupabaseStore } from './supabase-store';
import { IndexedDbStore } from './indexeddb-store';

let storeInstance: DataStore | null = null;

function canUseSupabase(): boolean {
  const url = import.meta.env?.VITE_SUPABASE_URL;
  const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('Supabase environment configuration missing or incomplete.');
    return false;
  }

  try {
    new URL(url);
  } catch (error) {
    console.warn('Supabase URL is invalid.');
    return false;
  }

  return true;
}

export function createStore(): DataStore {
  if (!storeInstance) {
    if (canUseSupabase()) {
      try {
        storeInstance = new SupabaseStore();
        console.info('Using Supabase datastore backend.');
      } catch (error) {
        console.warn('Failed to initialize Supabase store, falling back to IndexedDB:', error);
      }
    }

    if (!storeInstance) {
      storeInstance = new IndexedDbStore();
      console.info('Using IndexedDB datastore backend.');
    }
  }

  return storeInstance;
}

export const store = createStore();
