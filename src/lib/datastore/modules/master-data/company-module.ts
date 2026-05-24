import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { Company, CompanyInput } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';
import { generateSearchKeywords } from '@/lib/string-utils';
import { mapCompany } from '../mappers';
import type { CompanyUpdate } from '../store-types';

export class CompanyModule {
  declare protected supabase: SupabaseClient<Database>;

  async toggleCompanyStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async listCompanies(query?: SearchQuery): Promise<Company[]> {
    const applyFilters = <T extends { ilike: (...a: any[]) => any }>(qb: T) => {
      let b = qb;
      if (query?.search) b = b.ilike('name', `%${query.search}%`);
      return b;
    };

    const { data, error } = await applyFilters(
      this.supabase.from('companies').select('*').order('is_default', { ascending: false }).order('name')
    );
    if (!error) return (data || []).map(mapCompany);

    const isMissingDefault = error.message?.includes('is_default') || error.details?.includes('is_default') || error.hint?.includes('is_default');
    if (!isMissingDefault) throw error;

    const { data: fallback, error: fallbackError } = await applyFilters(this.supabase.from('companies').select('*').order('name'));
    if (fallbackError) throw fallbackError;
    return (fallback || []).map(mapCompany);
  }

  async getCompany(id: string): Promise<Company | null> {
    const { data, error } = await this.supabase.from('companies').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapCompany(data) : null;
  }

  async createCompany(company: CompanyInput): Promise<Company> {
    const { data: existing } = await this.supabase.from('companies').select('id').ilike('name', company.name).maybeSingle();
    if (existing) throw new Error('A company with this name already exists');

    if (company.isDefault) {
      const { error } = await this.supabase.from('companies').update({ is_default: false }).eq('is_default', true);
      if (error) throw error;
    }

    const { data, error } = await this.supabase.from('companies').insert({
      is_default: company.isDefault || false,
      name: company.name,
      contact_name: company.contactName || '',
      phone: company.phone || '',
      email: company.email || '',
      note: company.note || '',
      status: 'active',
      search_keywords: generateSearchKeywords(company.name),
    }).select().single();
    if (error) throw error;
    return mapCompany(data);
  }

  async updateCompany(id: string, company: Partial<Company>): Promise<void> {
    const { data: existing, error: lookupError } = await this.supabase.from('companies').select('id, name').eq('id', id).maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) throw new Error('Company not found or you do not have permission to edit it');

    const updates: CompanyUpdate = {};
    if (company.name !== undefined) {
      const { data: dup } = await this.supabase.from('companies').select('id').ilike('name', company.name).neq('id', id).maybeSingle();
      if (dup) throw new Error('A company with this name already exists');
      updates.name = company.name;
      updates.search_keywords = generateSearchKeywords(company.name);
    }
    if (company.contactName !== undefined) updates.contact_name = company.contactName;
    if (company.phone !== undefined) updates.phone = company.phone;
    if (company.email !== undefined) updates.email = company.email;
    if (company.note !== undefined) updates.note = company.note;
    if (company.isDefault !== undefined) updates.is_default = company.isDefault;
    if (Object.keys(updates).length === 0) throw new Error('No changes to save');

    if (company.isDefault) {
      const { error } = await this.supabase.from('companies').update({ is_default: false }).neq('id', id).eq('is_default', true);
      if (error) throw error;
    }

    const { data: updated, error } = await this.supabase.from('companies').update(updates).eq('id', id).select('id').maybeSingle();
    if (error) throw error;
    if (!updated) throw new Error(`Company "${existing.name}" was not updated. Refresh and try again.`);
  }

  async deleteCompany(id: string): Promise<void> {
    const { error } = await this.supabase.from('companies').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateCompany(id: string): Promise<Company> {
    const original = await this.getCompany(id);
    if (!original) throw new Error('Company not found');
    return this.createCompany({
      name: `${original.name} (Copy)`,
      contactName: original.contactName,
      phone: original.phone,
      email: original.email,
      note: original.note,
      isDefault: false,
    });
  }

  async deleteAllCompanies(): Promise<void> {
    const { error } = await this.supabase.from('companies').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateCompanies(inputs: CompanyInput[]): Promise<Company[]> {
    const names = inputs.map((i) => i.name.toLowerCase());
    const dups = names.filter((n, idx) => names.indexOf(n) !== idx);
    if (dups.length > 0) throw new Error('Duplicate names found in batch');

    const { data: existing } = await this.supabase.from('companies').select('name');
    if (existing) {
      const existingNames = existing.map((c) => c.name.toLowerCase());
      const conflicts = inputs.filter((i) => existingNames.includes(i.name.toLowerCase()));
      if (conflicts.length > 0) throw new Error(`The following companies already exist: ${conflicts.map((d) => d.name).join(', ')}`);
    }

    const { data, error } = await this.supabase.from('companies').insert(
      inputs.map((i) => ({
        name: i.name,
        contact_name: i.contactName || '',
        phone: i.phone || '',
        email: i.email || '',
        note: i.note || '',
        status: 'active',
        search_keywords: generateSearchKeywords(i.name),
      }))
    ).select();
    if (error) throw error;
    return (data || []).map(mapCompany);
  }
}
