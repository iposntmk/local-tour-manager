import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { Shopping, ShoppingInput } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';
import { generateSearchKeywords } from '@/lib/string-utils';
import { mapShopping } from '../mappers';
import type { ShoppingUpdate } from '../store-types';

export class ShoppingModule {
  declare protected supabase: SupabaseClient<Database>;

  async toggleShoppingStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async listShoppings(query?: SearchQuery): Promise<Shopping[]> {
    let qb = this.supabase.from('shoppings').select('*').order('name');
    if (query?.search) qb = qb.ilike('name', `%${query.search}%`);
    const { data, error } = await qb;
    if (error) throw error;
    return (data || []).map(mapShopping);
  }

  async getShopping(id: string): Promise<Shopping | null> {
    const { data, error } = await this.supabase.from('shoppings').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapShopping(data) : null;
  }

  async createShopping(shopping: ShoppingInput): Promise<Shopping> {
    const { data: existing } = await this.supabase.from('shoppings').select('id').ilike('name', shopping.name).maybeSingle();
    if (existing) throw new Error('A shopping with this name already exists');

    const { data, error } = await this.supabase.from('shoppings').insert({
      name: shopping.name,
      status: 'active',
      search_keywords: generateSearchKeywords(shopping.name),
    }).select().single();
    if (error) throw error;
    return mapShopping(data);
  }

  async updateShopping(id: string, shopping: Partial<Shopping>): Promise<void> {
    const updates: ShoppingUpdate = {};
    if (shopping.name !== undefined) {
      const { data: dup } = await this.supabase.from('shoppings').select('id').ilike('name', shopping.name).neq('id', id).maybeSingle();
      if (dup) throw new Error('A shopping with this name already exists');
      updates.name = shopping.name;
      updates.search_keywords = generateSearchKeywords(shopping.name);
    }
    const { error } = await this.supabase.from('shoppings').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteShopping(id: string): Promise<void> {
    const { error } = await this.supabase.from('shoppings').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateShopping(id: string): Promise<Shopping> {
    const original = await this.getShopping(id);
    if (!original) throw new Error('Shopping not found');
    return this.createShopping({ name: `${original.name} (Copy)` });
  }

  async deleteAllShoppings(): Promise<void> {
    const { error } = await this.supabase.from('shoppings').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateShoppings(inputs: ShoppingInput[]): Promise<Shopping[]> {
    const names = inputs.map((i) => i.name.toLowerCase());
    const dups = names.filter((n, idx) => names.indexOf(n) !== idx);
    if (dups.length > 0) throw new Error('Duplicate names found in batch');

    const { data: existing } = await this.supabase.from('shoppings').select('name');
    if (existing) {
      const existingNames = existing.map((s) => s.name.toLowerCase());
      const conflicts = inputs.filter((i) => existingNames.includes(i.name.toLowerCase()));
      if (conflicts.length > 0) throw new Error(`The following shoppings already exist: ${conflicts.map((d) => d.name).join(', ')}`);
    }

    const { data, error } = await this.supabase.from('shoppings').insert(
      inputs.map((i) => ({ name: i.name, status: 'active', search_keywords: generateSearchKeywords(i.name) }))
    ).select();
    if (error) throw error;
    return (data || []).map(mapShopping);
  }
}
