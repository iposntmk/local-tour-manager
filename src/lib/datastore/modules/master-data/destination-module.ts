import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { TouristDestination, TouristDestinationInput } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';
import { generateSearchKeywords } from '@/lib/string-utils';
import { mapTouristDestination } from '../mappers';
import type { TouristDestinationUpdate } from '../store-types';

export class DestinationModule {
  declare protected supabase: SupabaseClient<Database>;

  async toggleTouristDestinationStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async listTouristDestinations(query?: SearchQuery): Promise<TouristDestination[]> {
    let qb = this.supabase.from('tourist_destinations').select('*').order('name');
    if (query?.search) qb = qb.ilike('name', `%${query.search}%`);
    const { data, error } = await qb;
    if (error) throw error;
    return (data || []).map(mapTouristDestination);
  }

  async getTouristDestination(id: string): Promise<TouristDestination | null> {
    const { data, error } = await this.supabase.from('tourist_destinations').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapTouristDestination(data) : null;
  }

  async createTouristDestination(destination: TouristDestinationInput): Promise<TouristDestination> {
    const { data: existing } = await this.supabase.from('tourist_destinations').select('id').ilike('name', destination.name).maybeSingle();
    if (existing) throw new Error('A tourist destination with this name already exists');

    const { data, error } = await this.supabase.from('tourist_destinations').insert({
      name: destination.name,
      price: destination.price,
      province_id: destination.provinceRef.id,
      province_name_at_booking: destination.provinceRef.nameAtBooking,
      status: 'active',
      search_keywords: generateSearchKeywords(destination.name),
    }).select().single();
    if (error) throw error;
    return mapTouristDestination(data);
  }

  async updateTouristDestination(id: string, destination: Partial<TouristDestination>): Promise<void> {
    const updates: TouristDestinationUpdate = {};
    if (destination.name !== undefined) {
      const { data: dup } = await this.supabase.from('tourist_destinations').select('id').ilike('name', destination.name).neq('id', id).maybeSingle();
      if (dup) throw new Error('A tourist destination with this name already exists');
      updates.name = destination.name;
      updates.search_keywords = generateSearchKeywords(destination.name);
    }
    if (destination.price !== undefined) updates.price = destination.price;
    if (destination.provinceRef !== undefined) {
      updates.province_id = destination.provinceRef.id;
      updates.province_name_at_booking = destination.provinceRef.nameAtBooking;
    }
    if (destination.status !== undefined) updates.status = destination.status;
    const { error } = await this.supabase.from('tourist_destinations').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteTouristDestination(id: string): Promise<void> {
    const { error } = await this.supabase.from('tourist_destinations').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateTouristDestination(id: string): Promise<TouristDestination> {
    const original = await this.getTouristDestination(id);
    if (!original) throw new Error('Tourist destination not found');
    return this.createTouristDestination({ name: `${original.name} (Copy)`, price: original.price, provinceRef: original.provinceRef });
  }

  async deleteAllTouristDestinations(): Promise<void> {
    const { error } = await this.supabase.from('tourist_destinations').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateTouristDestinations(inputs: TouristDestinationInput[]): Promise<TouristDestination[]> {
    const names = inputs.map((i) => i.name.toLowerCase());
    const dups = names.filter((n, idx) => names.indexOf(n) !== idx);
    if (dups.length > 0) throw new Error('Duplicate names found in batch');

    const { data: existing } = await this.supabase.from('tourist_destinations').select('name');
    if (existing) {
      const existingNames = existing.map((d) => d.name.toLowerCase());
      const conflicts = inputs.filter((i) => existingNames.includes(i.name.toLowerCase()));
      if (conflicts.length > 0) throw new Error(`The following tourist destinations already exist: ${conflicts.map((d) => d.name).join(', ')}`);
    }

    const { data, error } = await this.supabase.from('tourist_destinations').insert(
      inputs.map((i) => ({
        name: i.name,
        price: i.price,
        province_id: i.provinceRef.id,
        province_name_at_booking: i.provinceRef.nameAtBooking,
        status: 'active',
        search_keywords: generateSearchKeywords(i.name),
      }))
    ).select();
    if (error) throw error;
    return (data || []).map(mapTouristDestination);
  }
}
