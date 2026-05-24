import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { Nationality, NationalityInput } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';
import { generateSearchKeywords } from '@/lib/string-utils';
import { mapNationality } from '../mappers';
import type { NationalityUpdate } from '../store-types';

export class NationalityModule {
  declare protected supabase: SupabaseClient<Database>;

  async toggleNationalityStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async listNationalities(query?: SearchQuery): Promise<Nationality[]> {
    let qb = this.supabase.from('nationalities').select('*').order('name');
    if (query?.search) qb = qb.ilike('name', `%${query.search}%`);
    const { data, error } = await qb;
    if (error) throw error;
    return (data || []).map(mapNationality);
  }

  async getNationality(id: string): Promise<Nationality | null> {
    const { data, error } = await this.supabase.from('nationalities').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapNationality(data) : null;
  }

  async createNationality(nationality: NationalityInput): Promise<Nationality> {
    const { data: existing } = await this.supabase.from('nationalities').select('id').ilike('name', nationality.name).maybeSingle();
    if (existing) throw new Error('A nationality with this name already exists');

    const { data, error } = await this.supabase.from('nationalities').insert({
      name: nationality.name,
      iso2: nationality.iso2,
      emoji: nationality.emoji,
      status: 'active',
      search_keywords: generateSearchKeywords(nationality.name),
    }).select().single();
    if (error) throw error;
    return mapNationality(data);
  }

  async updateNationality(id: string, nationality: Partial<Nationality>): Promise<void> {
    const updates: NationalityUpdate = {};
    if (nationality.name !== undefined) {
      const { data: dup } = await this.supabase.from('nationalities').select('id').ilike('name', nationality.name).neq('id', id).maybeSingle();
      if (dup) throw new Error('A nationality with this name already exists');
      updates.name = nationality.name;
      updates.search_keywords = generateSearchKeywords(nationality.name);
    }
    if (nationality.iso2 !== undefined) updates.iso2 = nationality.iso2;
    if (nationality.emoji !== undefined) updates.emoji = nationality.emoji;
    const { error } = await this.supabase.from('nationalities').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteNationality(id: string): Promise<void> {
    const { error } = await this.supabase.from('nationalities').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateNationality(id: string): Promise<Nationality> {
    const original = await this.getNationality(id);
    if (!original) throw new Error('Nationality not found');
    return this.createNationality({ name: `${original.name} (Copy)`, iso2: original.iso2, emoji: original.emoji });
  }

  async deleteAllNationalities(): Promise<void> {
    const { error } = await this.supabase.from('nationalities').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateNationalities(inputs: NationalityInput[]): Promise<Nationality[]> {
    const names = inputs.map((i) => i.name.toLowerCase());
    const dups = names.filter((n, idx) => names.indexOf(n) !== idx);
    if (dups.length > 0) throw new Error('Duplicate names found in batch');

    const { data: existing } = await this.supabase.from('nationalities').select('name');
    if (existing) {
      const existingNames = existing.map((n) => n.name.toLowerCase());
      const conflicts = inputs.filter((i) => existingNames.includes(i.name.toLowerCase()));
      if (conflicts.length > 0) throw new Error(`The following nationalities already exist: ${conflicts.map((d) => d.name).join(', ')}`);
    }

    const { data, error } = await this.supabase.from('nationalities').insert(
      inputs.map((i) => ({ name: i.name, iso2: i.iso2 || null, emoji: i.emoji || null, status: 'active', search_keywords: generateSearchKeywords(i.name) }))
    ).select();
    if (error) throw error;
    return (data || []).map(mapNationality);
  }
}
