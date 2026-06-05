import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { DestinationFree, DestinationFreeInput } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';
import { generateSearchKeywords } from '@/lib/string-utils';
import { mapDestinationFree } from '../mappers';
import type { DestinationFreeUpdate } from '../store-types';

const normalizeOptionalText = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export class DestinationFreeModule {
  declare protected supabase: SupabaseClient<Database>;

  private async buildUniqueCopyName(name: string): Promise<string> {
    const baseName = name.trim();
    const { data } = await this.supabase.from('destinations_free').select('name');
    const existingNames = new Set((data || []).map((row) => row.name.toLowerCase()));

    let copyIndex = 1;
    let candidate = '';
    do {
      const copyLabel = copyIndex === 1 ? 'Copy' : `Copy ${copyIndex}`;
      candidate = `${baseName} (${copyLabel})`;
      copyIndex += 1;
    } while (existingNames.has(candidate.toLowerCase()));

    return candidate;
  }

  async listDestinationsFree(query?: SearchQuery): Promise<DestinationFree[]> {
    let qb = this.supabase.from('destinations_free').select('*').order('name');
    if (query?.search) qb = qb.or(`name.ilike.%${query.search}%,raw_name.ilike.%${query.search}%`);
    const { data, error } = await qb;
    if (error) throw error;
    return (data || []).map(mapDestinationFree);
  }

  async getDestinationFree(id: string): Promise<DestinationFree | null> {
    const { data, error } = await this.supabase.from('destinations_free').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapDestinationFree(data) : null;
  }

  async createDestinationFree(input: DestinationFreeInput): Promise<DestinationFree> {
    const name = input.name.trim();
    const { data: existing } = await this.supabase.from('destinations_free').select('id').ilike('name', name).maybeSingle();
    if (existing) throw new Error('A destination with this name already exists');

    const { data, error } = await this.supabase.from('destinations_free').insert({
      name,
      raw_name: normalizeOptionalText(input.rawName),
      province_id: input.provinceRef.id,
      province_name_at_booking: input.provinceRef.nameAtBooking,
      status: 'active',
      search_keywords: generateSearchKeywords(name),
    }).select().single();
    if (error) throw error;
    return mapDestinationFree(data);
  }

  async updateDestinationFree(id: string, destination: Partial<DestinationFree>): Promise<void> {
    const updates: DestinationFreeUpdate = {};
    if (destination.name !== undefined) {
      const name = destination.name.trim();
      const { data: dup } = await this.supabase.from('destinations_free').select('id').ilike('name', name).neq('id', id).maybeSingle();
      if (dup) throw new Error('A destination with this name already exists');
      updates.name = name;
      updates.search_keywords = generateSearchKeywords(name);
    }
    if (destination.rawName !== undefined) updates.raw_name = normalizeOptionalText(destination.rawName);
    if (destination.provinceRef !== undefined) {
      updates.province_id = destination.provinceRef.id;
      updates.province_name_at_booking = destination.provinceRef.nameAtBooking;
    }
    if (destination.status !== undefined) updates.status = destination.status;
    const { error } = await this.supabase.from('destinations_free').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteDestinationFree(id: string): Promise<void> {
    const { error } = await this.supabase.from('destinations_free').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateDestinationFree(id: string): Promise<DestinationFree> {
    const original = await this.getDestinationFree(id);
    if (!original) throw new Error('Destination not found');
    const name = await this.buildUniqueCopyName(original.name);
    return this.createDestinationFree({
      name,
      provinceRef: original.provinceRef,
    });
  }

  async deleteAllDestinationsFree(): Promise<void> {
    const { error } = await this.supabase.from('destinations_free').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateDestinationsFree(inputs: DestinationFreeInput[]): Promise<DestinationFree[]> {
    const names = inputs.map((i) => i.name.trim().toLowerCase());
    const dups = names.filter((n, idx) => names.indexOf(n) !== idx);
    if (dups.length > 0) throw new Error('Duplicate names found in batch');

    const { data: existing } = await this.supabase.from('destinations_free').select('name');
    if (existing) {
      const existingNames = existing.map((d) => d.name.toLowerCase());
      const conflicts = inputs.filter((i) => existingNames.includes(i.name.trim().toLowerCase()));
      if (conflicts.length > 0) throw new Error(`The following destinations already exist: ${conflicts.map((d) => d.name).join(', ')}`);
    }

    const { data, error } = await this.supabase.from('destinations_free').insert(
      inputs.map((i) => ({
        name: i.name.trim(),
        raw_name: normalizeOptionalText(i.rawName),
        province_id: i.provinceRef.id,
        province_name_at_booking: i.provinceRef.nameAtBooking,
        status: 'active',
        search_keywords: generateSearchKeywords(i.name.trim()),
      }))
    ).select();
    if (error) throw error;
    return (data || []).map(mapDestinationFree);
  }
}
