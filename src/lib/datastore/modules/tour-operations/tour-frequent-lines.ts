import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { FrequentTourLine, QuickAddLineType } from '@/types/quick-add';

/** Xếp hạng tên dòng dùng nhiều nhất — nguồn của danh sách thêm nhanh trên các tab dòng. */
export class TourFrequentLinesModule {
  declare protected supabase: SupabaseClient<Database>;

  async listFrequentTourLines(lineType: QuickAddLineType, limit = 30): Promise<FrequentTourLine[]> {
    const { data, error } = await (this.supabase as any).rpc('get_frequent_tour_lines', {
      p_line_type: lineType,
      p_limit: limit,
    });
    if (error) throw error;
    return ((data || []) as Array<{ name: string; usage_count: number | string }>).map((row) => ({
      name: row.name,
      count: Number(row.usage_count) || 0,
    }));
  }
}
