import type { DataStore } from '@/types/datastore';
import { isSupabaseEnabled } from './supabase-client';
import { SupabaseStore } from './supabase-store';
import { IndexedDbStore } from './indexeddb-store';

let storeInstance: DataStore | null = null;

export function createStore(): DataStore {
  if (!storeInstance) {
    if (isSupabaseEnabled()) {
      try {
        storeInstance = new SupabaseStore();
      } catch (error) {
        console.warn('Failed to initialize Supabase store, falling back to IndexedDB:', error);
        storeInstance = new IndexedDbStore();
      }
    } else {
      storeInstance = new IndexedDbStore();
    }
  }
  return storeInstance;
}

export const store = createStore();
