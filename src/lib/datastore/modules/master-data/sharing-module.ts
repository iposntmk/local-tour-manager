import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { ShareableMasterDataTable } from '@/types/datastore';

export class SharingModule {
  declare protected supabase: SupabaseClient<Database>;

  async setMasterDataShared(
    table: ShareableMasterDataTable,
    id: string,
    shared: boolean
  ): Promise<void> {
    const { data, error } = await this.supabase
      .from(table)
      .update({ is_shared: shared })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Không tìm thấy mục master data hoặc bạn không có quyền chia sẻ.');
  }
}
