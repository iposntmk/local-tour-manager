import type { DataStore } from '@/types/datastore';
import { SupabaseStore } from './supabase-store';

let storeInstance: DataStore | null = null;

export function createStore(): DataStore {
  if (!storeInstance) {
    storeInstance = new SupabaseStore();
  }
  return storeInstance;
}

export const store = createStore();
