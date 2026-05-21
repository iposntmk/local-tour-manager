import { getSupabaseClient } from './supabase-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { DataStore } from '@/types/datastore';
import { MasterDataModule } from './modules/master-data';
import { AuxiliaryDataModule } from './modules/auxiliary-data';
import { TourOperationsModule } from './modules/tour-operations';
import { UserProfilesModule } from './modules/user-profiles';

function applyMixins(derivedCtor: any, constructors: any[]) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      if (name !== 'constructor') {
        Object.defineProperty(
          derivedCtor.prototype,
          name,
          Object.getOwnPropertyDescriptor(baseCtor.prototype, name) || Object.create(null)
        );
      }
    });
  });
}

export class SupabaseStore implements DataStore {
  protected readonly supabase: SupabaseClient<Database>;

  constructor() {
    this.supabase = getSupabaseClient();
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SupabaseStore extends MasterDataModule, AuxiliaryDataModule, TourOperationsModule, UserProfilesModule {}

applyMixins(SupabaseStore, [MasterDataModule, AuxiliaryDataModule, TourOperationsModule, UserProfilesModule]);
