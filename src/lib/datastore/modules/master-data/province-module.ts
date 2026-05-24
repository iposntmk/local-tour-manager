import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { Province, ProvinceInput } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';
import { generateSearchKeywords } from '@/lib/string-utils';
import { mapProvince } from '../mappers';
import type { ProvinceUpdate } from '../store-types';

export class ProvinceModule {
  declare protected supabase: SupabaseClient<Database>;

  async toggleProvinceStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async listProvinces(query?: SearchQuery): Promise<Province[]> {
    let qb = this.supabase.from('provinces').select('*').order('name');
    if (query?.search) qb = qb.ilike('name', `%${query.search}%`);
    const { data, error } = await qb;
    if (error) throw error;
    return (data || []).map(mapProvince);
  }

  async getProvince(id: string): Promise<Province | null> {
    const { data, error } = await this.supabase.from('provinces').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapProvince(data) : null;
  }

  async createProvince(province: ProvinceInput): Promise<Province> {
    const { data: existing } = await this.supabase.from('provinces').select('id').ilike('name', province.name).maybeSingle();
    if (existing) throw new Error('A province with this name already exists');

    const { data, error } = await this.supabase.from('provinces').insert({
      name: province.name,
      status: 'active',
      search_keywords: generateSearchKeywords(province.name),
    }).select().single();
    if (error) throw error;
    return mapProvince(data);
  }

  async updateProvince(id: string, province: Partial<Province>): Promise<void> {
    const updates: ProvinceUpdate = {};
    if (province.name !== undefined) {
      const { data: dup } = await this.supabase.from('provinces').select('id').ilike('name', province.name).neq('id', id).maybeSingle();
      if (dup) throw new Error('A province with this name already exists');
      updates.name = province.name;
      updates.search_keywords = generateSearchKeywords(province.name);
    }
    const { error } = await this.supabase.from('provinces').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteProvince(id: string): Promise<void> {
    const { error } = await this.supabase.from('provinces').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateProvince(id: string): Promise<Province> {
    const original = await this.getProvince(id);
    if (!original) throw new Error('Province not found');
    return this.createProvince({ name: `${original.name} (Copy)` });
  }

  async deleteAllProvinces(): Promise<void> {
    const { error } = await this.supabase.from('provinces').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateProvinces(inputs: ProvinceInput[]): Promise<Province[]> {
    const names = inputs.map((i) => i.name.toLowerCase());
    const dups = names.filter((n, idx) => names.indexOf(n) !== idx);
    if (dups.length > 0) throw new Error('Duplicate names found in batch');

    const { data: existing } = await this.supabase.from('provinces').select('name');
    if (existing) {
      const existingNames = existing.map((p) => p.name.toLowerCase());
      const conflicts = inputs.filter((i) => existingNames.includes(i.name.toLowerCase()));
      if (conflicts.length > 0) throw new Error(`The following provinces already exist: ${conflicts.map((d) => d.name).join(', ')}`);
    }

    const { data, error } = await this.supabase.from('provinces').insert(
      inputs.map((i) => ({ name: i.name, status: 'active', search_keywords: generateSearchKeywords(i.name) }))
    ).select();
    if (error) throw error;
    return (data || []).map(mapProvince);
  }
}
