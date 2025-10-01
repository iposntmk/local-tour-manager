import type { DataStore } from '@/types/datastore';
import { IndexedDbStore } from './indexeddb-store';

let storeInstance: DataStore | null = null;

export function createStore(): DataStore {
  if (!storeInstance) {
    // For now, always use IndexedDB
    // Future: could add MemoryStore fallback if IndexedDB fails
    storeInstance = new IndexedDbStore();
  }
  return storeInstance;
}

export const store = createStore();
