import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type {
  Guide,
  Language,
  Company,
  Nationality,
  Province,
  TouristDestination,
  Shopping,
  ExpenseCategory,
  DetailedExpense,
  GuideInput,
  LanguageInput,
  CompanyInput,
  NationalityInput,
  ProvinceInput,
  TouristDestinationInput,
  ShoppingInput,
  ExpenseCategoryInput,
  DetailedExpenseInput,
} from '@/types/master';
import type { SearchQuery } from '@/types/datastore';
import { generateSearchKeywords } from '@/lib/string-utils';
import {
  mapLanguage,
  mapGuide,
  mapCompany,
  mapNationality,
  mapProvince,
  mapTouristDestination,
  mapShopping,
  mapExpenseCategory,
  mapDetailedExpense,
} from './mappers';
import type {
  GuideRow,
  GuideUpdate,
  LanguageUpdate,
  CompanyUpdate,
  NationalityUpdate,
  ProvinceUpdate,
  TouristDestinationUpdate,
  ShoppingUpdate,
  ExpenseCategoryUpdate,
  DetailedExpenseUpdate,
} from './store-types';

export class MasterDataModule {
  declare protected supabase: SupabaseClient<Database>;

  // ------------------------------------------------------------------ helpers

  private isMissingLanguageSchemaError(error: { code?: string; message?: string; details?: string; hint?: string } | null): boolean {
    const text = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
    return (
      text.includes('guide_languages') ||
      text.includes('languages') ||
      text.includes('nationality_languages') ||
      text.includes('could not find a relationship') ||
      text.includes('schema cache')
    );
  }

  private async attachGuideLanguages(guides: GuideRow[]): Promise<Guide[]> {
    if (guides.length === 0) {
      return [];
    }

    const guideIds = guides.map((guide) => guide.id);
    const { data: guideLanguages, error: guideLanguagesError } = await this.supabase
      .from('guide_languages')
      .select('guide_id, language_id')
      .in('guide_id', guideIds);

    if (guideLanguagesError) {
      if (this.isMissingLanguageSchemaError(guideLanguagesError)) {
        return guides.map((guide) => mapGuide({ ...guide, languages: [] }));
      }
      throw guideLanguagesError;
    }

    const languageIds = Array.from(new Set((guideLanguages || []).map((item) => item.language_id)));
    if (languageIds.length === 0) {
      return guides.map((guide) => mapGuide({ ...guide, languages: [] }));
    }

    const { data: languages, error: languagesError } = await this.supabase
      .from('languages')
      .select('*')
      .in('id', languageIds);

    if (languagesError) {
      if (this.isMissingLanguageSchemaError(languagesError)) {
        return guides.map((guide) => mapGuide({ ...guide, languages: [] }));
      }
      throw languagesError;
    }

    const languagesById = new Map((languages || []).map((language) => [language.id, mapLanguage(language)]));
    const languageIdsByGuideId = new Map<string, string[]>();
    (guideLanguages || []).forEach((item) => {
      const existing = languageIdsByGuideId.get(item.guide_id) || [];
      existing.push(item.language_id);
      languageIdsByGuideId.set(item.guide_id, existing);
    });

    return guides.map((guide) => {
      const guideLanguageIds = languageIdsByGuideId.get(guide.id) || [];
      const guideLanguagesValue = guideLanguageIds
        .map((languageId) => languagesById.get(languageId))
        .filter((language): language is Language => Boolean(language));

      return mapGuide({ ...guide, languages: guideLanguagesValue });
    });
  }

  private async replaceGuideLanguages(guideId: string, languageIds: string[]): Promise<void> {
    const { error: deleteError } = await this.supabase
      .from('guide_languages')
      .delete()
      .eq('guide_id', guideId);
    if (deleteError) throw deleteError;

    const uniqueLanguageIds = Array.from(new Set(languageIds.filter(Boolean)));
    if (uniqueLanguageIds.length === 0) {
      return;
    }

    const records = uniqueLanguageIds.map((languageId) => ({
      guide_id: guideId,
      language_id: languageId,
      proficiency: 'working',
    }));

    const { error: insertError } = await this.supabase
      .from('guide_languages')
      .insert(records);
    if (insertError) throw insertError;
  }

  // ------------------------------------------------------------------ Guides

  async listGuides(query?: SearchQuery): Promise<Guide[]> {
    const applyFilters = <T extends { eq: (...args: any[]) => any; ilike: (...args: any[]) => any }>(queryBuilder: T) => {
      let filteredBuilder = queryBuilder;

      if (query?.status) filteredBuilder = filteredBuilder.eq('status', query.status);
      if (query?.search) filteredBuilder = filteredBuilder.ilike('name', `%${query.search}%`);

      return filteredBuilder;
    };

    const primaryQuery = applyFilters(
      this.supabase
        .from('guides')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name')
    );

    const { data, error } = await primaryQuery;
    if (!error) {
      return this.attachGuideLanguages(data || []);
    }

    const isMissingDefaultColumn =
      error.message?.includes('is_default') ||
      error.details?.includes('is_default') ||
      error.hint?.includes('is_default');

    if (!isMissingDefaultColumn) {
      throw error;
    }

    const fallbackQuery = applyFilters(
      this.supabase
        .from('guides')
        .select('*')
        .order('name')
    );

    const { data: fallbackData, error: fallbackError } = await fallbackQuery;
    if (fallbackError) throw fallbackError;
    return this.attachGuideLanguages(fallbackData || []);
  }

  async getGuide(id: string): Promise<Guide | null> {
    const { data, error } = await this.supabase.from('guides').select('*').eq('id', id).single();
    if (error) return null;
    if (!data) return null;
    const [guide] = await this.attachGuideLanguages([data]);
    return guide || null;
  }

  async createGuide(guide: GuideInput): Promise<Guide> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('guides')
      .select('id')
      .ilike('name', guide.name)
      .maybeSingle();

    if (existing) {
      throw new Error('A guide with this name already exists');
    }

    if (guide.isDefault) {
      const { error: clearDefaultError } = await this.supabase
        .from('guides')
        .update({ is_default: false })
        .eq('is_default', true);

      if (clearDefaultError) throw clearDefaultError;
    }

    const searchKeywords = generateSearchKeywords(guide.name);
    const { data, error } = await this.supabase
      .from('guides')
      .insert({
        is_default: guide.isDefault || false,
        name: guide.name,
        phone: guide.phone || '',
        note: guide.note || '',
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();

    if (error) throw error;
    if (guide.languageIds !== undefined) {
      await this.replaceGuideLanguages(data.id, guide.languageIds);
    }

    const created = await this.getGuide(data.id);
    if (!created) throw new Error('Guide was created but could not be loaded');
    return created;
  }

  async updateGuide(id: string, guide: Partial<GuideInput>): Promise<void> {
    const { data: existingGuide, error: guideLookupError } = await this.supabase
      .from('guides')
      .select('id, name')
      .eq('id', id)
      .maybeSingle();

    if (guideLookupError) throw guideLookupError;
    if (!existingGuide) {
      throw new Error('Guide not found or you do not have permission to edit it');
    }

    const updates: GuideUpdate = {};
    if (guide.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('guides')
        .select('id')
        .ilike('name', guide.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A guide with this name already exists');
      }

      updates.name = guide.name;
      updates.search_keywords = generateSearchKeywords(guide.name);
    }
    if (guide.phone !== undefined) updates.phone = guide.phone;
    if (guide.note !== undefined) updates.note = guide.note;
    if (guide.isDefault !== undefined) updates.is_default = guide.isDefault;

    const hasUpdates = Object.keys(updates).length > 0;
    const hasLanguageUpdates = guide.languageIds !== undefined;
    if (!hasUpdates && !hasLanguageUpdates) {
      throw new Error('No changes to save');
    }

    if (guide.isDefault) {
      const { error: clearDefaultError } = await this.supabase
        .from('guides')
        .update({ is_default: false })
        .neq('id', id)
        .eq('is_default', true);

      if (clearDefaultError) throw clearDefaultError;
    }

    let updatedGuide: { id: string } | null = existingGuide;
    if (hasUpdates) {
      const { data, error } = await this.supabase
        .from('guides')
        .update(updates)
        .eq('id', id)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      updatedGuide = data;
    }
    if (!updatedGuide) {
      throw new Error(`Guide "${existingGuide.name}" was not updated. Refresh and try again.`);
    }

    if (hasLanguageUpdates) {
      await this.replaceGuideLanguages(id, guide.languageIds || []);
    }
  }

  async deleteGuide(id: string): Promise<void> {
    const { data: guide, error: guideLookupError } = await this.supabase
      .from('guides')
      .select('id, name')
      .eq('id', id)
      .maybeSingle();

    if (guideLookupError) throw guideLookupError;
    if (!guide) {
      throw new Error('Guide not found or you do not have permission to delete it');
    }

    const { error: detachError } = await this.supabase
      .from('tours')
      .update({ guide_id: null })
      .eq('guide_id', id);

    if (detachError) {
      throw new Error(`Cannot delete guide "${guide.name}" because related tours could not be updated`);
    }

    const { data: deletedGuide, error } = await this.supabase
      .from('guides')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!deletedGuide) {
      throw new Error(`Guide "${guide.name}" was not deleted. Refresh and try again.`);
    }
  }

  async duplicateGuide(id: string): Promise<Guide> {
    const original = await this.getGuide(id);
    if (!original) throw new Error('Guide not found');
    return this.createGuide({
      name: `${original.name} (Copy)`,
      phone: original.phone,
      note: original.note,
      languageIds: original.languages.map((language) => language.id),
      isDefault: false,
    });
  }

  async deleteAllGuides(): Promise<void> {
    const { error: detachError } = await this.supabase
      .from('tours')
      .update({ guide_id: null })
      .not('guide_id', 'is', null);

    if (detachError) throw detachError;

    const { error } = await this.supabase.from('guides').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateGuides(inputs: GuideInput[]): Promise<Guide[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }

    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('guides')
      .select('name');

    if (existing) {
      const existingNames = existing.map(g => g.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following guides already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }

    const records = inputs.map(input => ({
      name: input.name,
      phone: input.phone || '',
      note: input.note || '',
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));

    const { data, error } = await this.supabase
      .from('guides')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(mapGuide);
  }

  async toggleGuideStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  // ------------------------------------------------------------------ Languages

  async listLanguages(query?: SearchQuery): Promise<Language[]> {
    let queryBuilder = this.supabase
      .from('languages')
      .select('*')
      .order('name');

    if (query?.status) queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) {
      if (this.isMissingLanguageSchemaError(error)) {
        return [];
      }
      throw error;
    }
    return (data || []).map(mapLanguage);
  }

  async getLanguage(id: string): Promise<Language | null> {
    const { data, error } = await this.supabase.from('languages').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapLanguage(data) : null;
  }

  async createLanguage(language: LanguageInput): Promise<Language> {
    const code = language.code.trim().toLowerCase();
    const name = language.name.trim();
    const { data: existing } = await this.supabase
      .from('languages')
      .select('id')
      .ilike('code', code)
      .maybeSingle();

    if (existing) {
      throw new Error('A language with this code already exists');
    }

    const { data, error } = await this.supabase
      .from('languages')
      .insert({
        code,
        name,
        native_name: language.nativeName || null,
        status: 'active',
        search_keywords: generateSearchKeywords(`${name} ${code} ${language.nativeName || ''}`),
      })
      .select()
      .single();

    if (error) throw error;
    return mapLanguage(data);
  }

  async updateLanguage(id: string, language: Partial<Language>): Promise<void> {
    const updates: LanguageUpdate = {};
    if (language.code !== undefined) updates.code = language.code.trim().toLowerCase();
    if (language.name !== undefined) {
      updates.name = language.name.trim();
      updates.search_keywords = generateSearchKeywords(`${language.name} ${language.code || ''} ${language.nativeName || ''}`);
    }
    if (language.nativeName !== undefined) updates.native_name = language.nativeName || null;

    if (Object.keys(updates).length === 0) {
      throw new Error('No changes to save');
    }

    const { error } = await this.supabase
      .from('languages')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  }

  async duplicateLanguage(id: string): Promise<Language> {
    const original = await this.getLanguage(id);
    if (!original) throw new Error('Language not found');
    return this.createLanguage({
      code: `${original.code}-copy`,
      name: `${original.name} (Copy)`,
      nativeName: original.nativeName,
    });
  }

  async deleteLanguage(id: string): Promise<void> {
    const { error } = await this.supabase.from('languages').delete().eq('id', id);
    if (error) throw error;
  }

  async deleteAllLanguages(): Promise<void> {
    const { error } = await this.supabase.from('languages').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateLanguages(inputs: LanguageInput[]): Promise<Language[]> {
    const records = inputs.map((input) => {
      const code = input.code.trim().toLowerCase();
      const name = input.name.trim();
      return {
        code,
        name,
        native_name: input.nativeName || null,
        status: 'active',
        search_keywords: generateSearchKeywords(`${name} ${code} ${input.nativeName || ''}`),
      };
    });

    const { data, error } = await this.supabase
      .from('languages')
      .insert(records)
      .select();
    if (error) throw error;
    return (data || []).map(mapLanguage);
  }

  async toggleLanguageStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  // ------------------------------------------------------------------ Companies

  async toggleCompanyStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async listCompanies(query?: SearchQuery): Promise<Company[]> {
    const applyFilters = <T extends { ilike: (...args: any[]) => any }>(queryBuilder: T) => {
      let filteredBuilder = queryBuilder;

      if (query?.search) filteredBuilder = filteredBuilder.ilike('name', `%${query.search}%`);

      return filteredBuilder;
    };

    const primaryQuery = applyFilters(
      this.supabase
        .from('companies')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name')
    );

    const { data, error } = await primaryQuery;
    if (!error) {
      return (data || []).map(mapCompany);
    }

    const isMissingDefaultColumn =
      error.message?.includes('is_default') ||
      error.details?.includes('is_default') ||
      error.hint?.includes('is_default');

    if (!isMissingDefaultColumn) {
      throw error;
    }

    const fallbackQuery = applyFilters(
      this.supabase
        .from('companies')
        .select('*')
        .order('name')
    );

    const { data: fallbackData, error: fallbackError } = await fallbackQuery;
    if (fallbackError) throw fallbackError;
    return (fallbackData || []).map(mapCompany);
  }

  async getCompany(id: string): Promise<Company | null> {
    const { data, error } = await this.supabase.from('companies').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapCompany(data) : null;
  }

  async createCompany(company: CompanyInput): Promise<Company> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('companies')
      .select('id')
      .ilike('name', company.name)
      .maybeSingle();

    if (existing) {
      throw new Error('A company with this name already exists');
    }

    if (company.isDefault) {
      const { error: clearDefaultError } = await this.supabase
        .from('companies')
        .update({ is_default: false })
        .eq('is_default', true);

      if (clearDefaultError) throw clearDefaultError;
    }

    const searchKeywords = generateSearchKeywords(company.name);
    const { data, error } = await this.supabase
      .from('companies')
      .insert({
        is_default: company.isDefault || false,
        name: company.name,
        contact_name: company.contactName || '',
        phone: company.phone || '',
        email: company.email || '',
        note: company.note || '',
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();

    if (error) throw error;
    return mapCompany(data);
  }

  async updateCompany(id: string, company: Partial<Company>): Promise<void> {
    const { data: existingCompany, error: companyLookupError } = await this.supabase
      .from('companies')
      .select('id, name')
      .eq('id', id)
      .maybeSingle();

    if (companyLookupError) throw companyLookupError;
    if (!existingCompany) {
      throw new Error('Company not found or you do not have permission to edit it');
    }

    const updates: CompanyUpdate = {};
    if (company.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('companies')
        .select('id')
        .ilike('name', company.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A company with this name already exists');
      }

      updates.name = company.name;
      updates.search_keywords = generateSearchKeywords(company.name);
    }
    if (company.contactName !== undefined) updates.contact_name = company.contactName;
    if (company.phone !== undefined) updates.phone = company.phone;
    if (company.email !== undefined) updates.email = company.email;
    if (company.note !== undefined) updates.note = company.note;
    if (company.isDefault !== undefined) updates.is_default = company.isDefault;

    const hasUpdates = Object.keys(updates).length > 0;
    if (!hasUpdates) {
      throw new Error('No changes to save');
    }

    if (company.isDefault) {
      const { error: clearDefaultError } = await this.supabase
        .from('companies')
        .update({ is_default: false })
        .neq('id', id)
        .eq('is_default', true);

      if (clearDefaultError) throw clearDefaultError;
    }

    const { data: updatedCompany, error } = await this.supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!updatedCompany) {
      throw new Error(`Company "${existingCompany.name}" was not updated. Refresh and try again.`);
    }
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
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }

    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('companies')
      .select('name');

    if (existing) {
      const existingNames = existing.map(c => c.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following companies already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }

    const records = inputs.map(input => ({
      name: input.name,
      contact_name: input.contactName || '',
      phone: input.phone || '',
      email: input.email || '',
      note: input.note || '',
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));

    const { data, error } = await this.supabase
      .from('companies')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(mapCompany);
  }

  // ------------------------------------------------------------------ Nationalities

  async toggleNationalityStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async listNationalities(query?: SearchQuery): Promise<Nationality[]> {
    let queryBuilder = this.supabase.from('nationalities').select('*').order('name');

    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(mapNationality);
  }

  async getNationality(id: string): Promise<Nationality | null> {
    const { data, error } = await this.supabase.from('nationalities').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapNationality(data) : null;
  }

  async createNationality(nationality: NationalityInput): Promise<Nationality> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('nationalities')
      .select('id')
      .ilike('name', nationality.name)
      .maybeSingle();

    if (existing) {
      throw new Error('A nationality with this name already exists');
    }

    const searchKeywords = generateSearchKeywords(nationality.name);
    const { data, error } = await this.supabase
      .from('nationalities')
      .insert({
        name: nationality.name,
        iso2: nationality.iso2,
        emoji: nationality.emoji,
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();

    if (error) throw error;
    return mapNationality(data);
  }

  async updateNationality(id: string, nationality: Partial<Nationality>): Promise<void> {
    const updates: NationalityUpdate = {};
    if (nationality.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('nationalities')
        .select('id')
        .ilike('name', nationality.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A nationality with this name already exists');
      }

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
    return this.createNationality({
      name: `${original.name} (Copy)`,
      iso2: original.iso2,
      emoji: original.emoji,
    });
  }

  async deleteAllNationalities(): Promise<void> {
    const { error } = await this.supabase.from('nationalities').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateNationalities(inputs: NationalityInput[]): Promise<Nationality[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }

    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('nationalities')
      .select('name');

    if (existing) {
      const existingNames = existing.map(n => n.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following nationalities already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }

    const records = inputs.map(input => ({
      name: input.name,
      iso2: input.iso2 || null,
      emoji: input.emoji || null,
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));

    const { data, error } = await this.supabase
      .from('nationalities')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(mapNationality);
  }

  // ------------------------------------------------------------------ Provinces

  async toggleProvinceStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async listProvinces(query?: SearchQuery): Promise<Province[]> {
    let queryBuilder = this.supabase.from('provinces').select('*').order('name');

    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(mapProvince);
  }

  async getProvince(id: string): Promise<Province | null> {
    const { data, error } = await this.supabase.from('provinces').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapProvince(data) : null;
  }

  async createProvince(province: ProvinceInput): Promise<Province> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('provinces')
      .select('id')
      .ilike('name', province.name)
      .maybeSingle();

    if (existing) {
      throw new Error('A province with this name already exists');
    }

    const searchKeywords = generateSearchKeywords(province.name);
    const { data, error } = await this.supabase
      .from('provinces')
      .insert({
        name: province.name,
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();

    if (error) throw error;
    return mapProvince(data);
  }

  async updateProvince(id: string, province: Partial<Province>): Promise<void> {
    const updates: ProvinceUpdate = {};
    if (province.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('provinces')
        .select('id')
        .ilike('name', province.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A province with this name already exists');
      }

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
    return this.createProvince({
      name: `${original.name} (Copy)`,
    });
  }

  async deleteAllProvinces(): Promise<void> {
    const { error } = await this.supabase.from('provinces').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateProvinces(inputs: ProvinceInput[]): Promise<Province[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }

    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('provinces')
      .select('name');

    if (existing) {
      const existingNames = existing.map(p => p.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following provinces already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }

    const records = inputs.map(input => ({
      name: input.name,
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));

    const { data, error } = await this.supabase
      .from('provinces')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(mapProvince);
  }

  // ------------------------------------------------------------------ Tourist Destinations

  async toggleTouristDestinationStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async listTouristDestinations(query?: SearchQuery): Promise<TouristDestination[]> {
    let queryBuilder = this.supabase.from('tourist_destinations').select('*').order('name');

    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(mapTouristDestination);
  }

  async getTouristDestination(id: string): Promise<TouristDestination | null> {
    const { data, error } = await this.supabase.from('tourist_destinations').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapTouristDestination(data) : null;
  }

  async createTouristDestination(destination: TouristDestinationInput): Promise<TouristDestination> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('tourist_destinations')
      .select('id')
      .ilike('name', destination.name)
      .maybeSingle();

    if (existing) {
      throw new Error('A tourist destination with this name already exists');
    }

    const searchKeywords = generateSearchKeywords(destination.name);
    const { data, error } = await this.supabase
      .from('tourist_destinations')
      .insert({
        name: destination.name,
        price: destination.price,
        province_id: destination.provinceRef.id,
        province_name_at_booking: destination.provinceRef.nameAtBooking,
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();

    if (error) throw error;
    return mapTouristDestination(data);
  }

  async updateTouristDestination(id: string, destination: Partial<TouristDestination>): Promise<void> {
    const updates: TouristDestinationUpdate = {};
    if (destination.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('tourist_destinations')
        .select('id')
        .ilike('name', destination.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A tourist destination with this name already exists');
      }

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
    return this.createTouristDestination({
      name: `${original.name} (Copy)`,
      price: original.price,
      provinceRef: original.provinceRef,
    });
  }

  async deleteAllTouristDestinations(): Promise<void> {
    const { error } = await this.supabase.from('tourist_destinations').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateTouristDestinations(inputs: TouristDestinationInput[]): Promise<TouristDestination[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }

    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('tourist_destinations')
      .select('name');

    if (existing) {
      const existingNames = existing.map(d => d.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following tourist destinations already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }

    const records = inputs.map(input => ({
      name: input.name,
      price: input.price,
      province_id: input.provinceRef.id,
      province_name_at_booking: input.provinceRef.nameAtBooking,
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));

    const { data, error } = await this.supabase
      .from('tourist_destinations')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(mapTouristDestination);
  }

  // ------------------------------------------------------------------ Shopping

  async toggleShoppingStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async listShoppings(query?: SearchQuery): Promise<Shopping[]> {
    let queryBuilder = this.supabase.from('shoppings').select('*').order('name');

    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(mapShopping);
  }

  async getShopping(id: string): Promise<Shopping | null> {
    const { data, error } = await this.supabase.from('shoppings').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapShopping(data) : null;
  }

  async createShopping(shopping: ShoppingInput): Promise<Shopping> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('shoppings')
      .select('id')
      .ilike('name', shopping.name)
      .maybeSingle();

    if (existing) {
      throw new Error('A shopping with this name already exists');
    }

    const searchKeywords = generateSearchKeywords(shopping.name);
    const { data, error } = await this.supabase
      .from('shoppings')
      .insert({
        name: shopping.name,
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();

    if (error) throw error;
    return mapShopping(data);
  }

  async updateShopping(id: string, shopping: Partial<Shopping>): Promise<void> {
    const updates: ShoppingUpdate = {};
    if (shopping.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('shoppings')
        .select('id')
        .ilike('name', shopping.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A shopping with this name already exists');
      }

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
    return this.createShopping({
      name: `${original.name} (Copy)`,
    });
  }

  async deleteAllShoppings(): Promise<void> {
    const { error } = await this.supabase.from('shoppings').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateShoppings(inputs: ShoppingInput[]): Promise<Shopping[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }

    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('shoppings')
      .select('name');

    if (existing) {
      const existingNames = existing.map(s => s.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following shoppings already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }

    const records = inputs.map(input => ({
      name: input.name,
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));

    const { data, error } = await this.supabase
      .from('shoppings')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(mapShopping);
  }

  // ------------------------------------------------------------------ Expense Categories

  async toggleExpenseCategoryStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async listExpenseCategories(query?: SearchQuery): Promise<ExpenseCategory[]> {
    let queryBuilder = this.supabase.from('expense_categories').select('*').order('name');

    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(mapExpenseCategory);
  }

  async getExpenseCategory(id: string): Promise<ExpenseCategory | null> {
    const { data, error } = await this.supabase.from('expense_categories').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapExpenseCategory(data) : null;
  }

  async createExpenseCategory(category: ExpenseCategoryInput): Promise<ExpenseCategory> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('expense_categories')
      .select('id')
      .ilike('name', category.name)
      .maybeSingle();

    if (existing) {
      throw new Error('An expense category with this name already exists');
    }

    const searchKeywords = generateSearchKeywords(category.name);
    const { data, error } = await this.supabase
      .from('expense_categories')
      .insert({
        name: category.name,
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();

    if (error) throw error;
    return mapExpenseCategory(data);
  }

  async updateExpenseCategory(id: string, category: Partial<ExpenseCategory>): Promise<void> {
    const updates: ExpenseCategoryUpdate = {};
    if (category.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('expense_categories')
        .select('id')
        .ilike('name', category.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('An expense category with this name already exists');
      }

      updates.name = category.name;
      updates.search_keywords = generateSearchKeywords(category.name);
    }

    const { error } = await this.supabase.from('expense_categories').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteExpenseCategory(id: string): Promise<void> {
    const { error } = await this.supabase.from('expense_categories').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateExpenseCategory(id: string): Promise<ExpenseCategory> {
    const original = await this.getExpenseCategory(id);
    if (!original) throw new Error('Expense category not found');
    return this.createExpenseCategory({
      name: `${original.name} (Copy)`,
    });
  }

  async deleteAllExpenseCategories(): Promise<void> {
    const { error } = await this.supabase.from('expense_categories').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateExpenseCategories(inputs: ExpenseCategoryInput[]): Promise<ExpenseCategory[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }

    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('expense_categories')
      .select('name');

    if (existing) {
      const existingNames = existing.map(c => c.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following expense categories already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }

    const records = inputs.map(input => ({
      name: input.name,
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));

    const { data, error } = await this.supabase
      .from('expense_categories')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(mapExpenseCategory);
  }

  // ------------------------------------------------------------------ Detailed Expenses

  async listDetailedExpenses(query?: SearchQuery): Promise<DetailedExpense[]> {
    let queryBuilder = this.supabase.from('detailed_expenses').select('*').order('name');

    if (query?.status) queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(mapDetailedExpense);
  }

  async getDetailedExpense(id: string): Promise<DetailedExpense | null> {
    const { data, error } = await this.supabase.from('detailed_expenses').select('*').eq('id', id).single();
    if (error) return null;
    return data ? mapDetailedExpense(data) : null;
  }

  async createDetailedExpense(expense: DetailedExpenseInput): Promise<DetailedExpense> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('detailed_expenses')
      .select('id')
      .ilike('name', expense.name)
      .maybeSingle();

    if (existing) {
      throw new Error('A detailed expense with this name already exists');
    }

    const searchKeywords = generateSearchKeywords(expense.name);
    const { data, error } = await this.supabase
      .from('detailed_expenses')
      .insert({
        name: expense.name,
        price: expense.price,
        category_id: expense.categoryRef.id,
        category_name_at_booking: expense.categoryRef.nameAtBooking,
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();

    if (error) throw error;
    return mapDetailedExpense(data);
  }

  async updateDetailedExpense(id: string, expense: Partial<DetailedExpense>): Promise<void> {
    const updates: DetailedExpenseUpdate = {};
    if (expense.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('detailed_expenses')
        .select('id')
        .ilike('name', expense.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A detailed expense with this name already exists');
      }

      updates.name = expense.name;
      updates.search_keywords = generateSearchKeywords(expense.name);
    }
    if (expense.price !== undefined) updates.price = expense.price;
    if (expense.categoryRef !== undefined) {
      updates.category_id = expense.categoryRef.id;
      updates.category_name_at_booking = expense.categoryRef.nameAtBooking;
    }
    if (expense.status !== undefined) updates.status = expense.status;

    const { error } = await this.supabase.from('detailed_expenses').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteDetailedExpense(id: string): Promise<void> {
    // Soft delete: set status to 'inactive' instead of hard delete
    const { error } = await this.supabase
      .from('detailed_expenses')
      .update({ status: 'inactive' })
      .eq('id', id);
    if (error) throw error;
  }

  async toggleDetailedExpenseStatus(id: string): Promise<void> {
    // Get current status
    const expense = await this.getDetailedExpense(id);
    if (!expense) throw new Error('Detailed expense not found');

    const newStatus = expense.status === 'active' ? 'inactive' : 'active';
    const { error } = await this.supabase
      .from('detailed_expenses')
      .update({ status: newStatus })
      .eq('id', id);
    if (error) throw error;
  }

  async duplicateDetailedExpense(id: string): Promise<DetailedExpense> {
    const original = await this.getDetailedExpense(id);
    if (!original) throw new Error('Detailed expense not found');
    return this.createDetailedExpense({
      name: `${original.name} (Copy)`,
      price: original.price,
      categoryRef: original.categoryRef,
    });
  }

  async deleteAllDetailedExpenses(): Promise<void> {
    const { error } = await this.supabase.from('detailed_expenses').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateDetailedExpenses(inputs: DetailedExpenseInput[]): Promise<DetailedExpense[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }

    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('detailed_expenses')
      .select('name');

    if (existing) {
      const existingNames = existing.map(e => e.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following detailed expenses already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }

    const records = inputs.map(input => ({
      name: input.name,
      price: input.price,
      category_id: input.categoryRef.id,
      category_name_at_booking: input.categoryRef.nameAtBooking,
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));

    const { data, error } = await this.supabase
      .from('detailed_expenses')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(mapDetailedExpense);
  }
}
