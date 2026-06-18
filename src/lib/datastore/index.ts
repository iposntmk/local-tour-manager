import type { DataStore } from '@/types/datastore';
import type { UserProfile } from '@/types/user';
import { SupabaseStore } from './supabase-store';

let storeInstance: DataStore | null = null;

export function createStore(): DataStore {
  if (!storeInstance) {
    storeInstance = new SupabaseStore();
  }
  return storeInstance;
}

export const store = createStore();

export function setStoreCurrentUserProfile(profile: UserProfile | null | undefined): void {
  const target = store as DataStore & {
    setCurrentUserProfile?: (profile: UserProfile | null | undefined) => void;
  };
  target.setCurrentUserProfile?.(profile);
}
