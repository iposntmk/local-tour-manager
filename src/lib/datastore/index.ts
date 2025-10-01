import type { DataStore } from '@/types/datastore';
import { SupabaseStore } from './supabase-store';
import { IndexedDbStore } from './indexeddb-store';

let storeInstance: DataStore | null = null;

export function createStore(): DataStore {
  if (!storeInstance) {
    // Use Supabase as primary storage with IndexedDB as fallback cache
    try {
      storeInstance = new SupabaseStore();
    } catch (error) {
      console.warn('Failed to initialize Supabase store, falling back to IndexedDB:', error);
      storeInstance = new IndexedDbStore();
    }
  }
  return storeInstance;
}

export const store = createStore();
