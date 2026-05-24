import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { Guide, Language, GuideInput, LanguageInput } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';
import { generateSearchKeywords } from '@/lib/string-utils';
import { mapLanguage, mapGuide } from '../mappers';
import type { GuideRow, GuideUpdate, LanguageUpdate } from '../store-types';

export class GuideModule {
  declare protected supabase: SupabaseClient<Database>;

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
    if (guides.length === 0) return [];
    const guideIds = guides.map((g) => g.id);
    const { data: guideLanguages, error: glError } = await this.supabase
      .from('guide_languages').select('guide_id, language_id').in('guide_id', guideIds);

    if (glError) {
      if (this.isMissingLanguageSchemaError(glError)) return guides.map((g) => mapGuide({ ...g, languages: [] }));
      throw glError;
    }

    const languageIds = Array.from(new Set((guideLanguages || []).map((i) => i.language_id)));
    if (languageIds.length === 0) return guides.map((g) => mapGuide({ ...g, languages: [] }));

    const { data: languages, error: lError } = await this.supabase.from('languages').select('*').in('id', languageIds);
    if (lError) {
      if (this.isMissingLanguageSchemaError(lError)) return guides.map((g) => mapGuide({ ...g, languages: [] }));
      throw lError;
    }

    const languagesById = new Map((languages || []).map((l) => [l.id, mapLanguage(l)]));
    const languageIdsByGuideId = new Map<string, string[]>();
    (guideLanguages || []).forEach((item) => {
      const existing = languageIdsByGuideId.get(item.guide_id) || [];
      existing.push(item.language_id);
      languageIdsByGuideId.set(item.guide_id, existing);
    });

    return guides.map((guide) => {
      const ids = languageIdsByGuideId.get(guide.id) || [];
      const langs = ids.map((id) => languagesById.get(id)).filter((l): l is Language => Boolean(l));
      return mapGuide({ ...guide, languages: langs });
    });
  }

  private async replaceGuideLanguages(guideId: string, languageIds: string[]): Promise<void> {
    const { error: deleteError } = await this.supabase.from('guide_languages').delete().eq('guide_id', guideId);
    if (deleteError) throw deleteError;
    const unique = Array.from(new Set(languageIds.filter(Boolean)));
    if (unique.length === 0) return;
    const { error: insertError } = await this.supabase.from('guide_languages')
      .insert(unique.map((id) => ({ guide_id: guideId, language_id: id, proficiency: 'working' })));
    if (insertError) throw insertError;
  }

  async listGuides(query?: SearchQuery): Promise<Guide[]> {
    const applyFilters = <T extends { eq: (...a: any[]) => any; ilike: (...a: any[]) => any }>(qb: T) => {
      let b = qb;
      if (query?.status) b = b.eq('status', query.status);
      if (query?.search) b = b.ilike('name', `%${query.search}%`);
      return b;
    };

    const { data, error } = await applyFilters(
      this.supabase.from('guides').select('*').order('is_default', { ascending: false }).order('name')
    );
    if (!error) return this.attachGuideLanguages(data || []);

    const isMissingDefault = error.message?.includes('is_default') || error.details?.includes('is_default') || error.hint?.includes('is_default');
    if (!isMissingDefault) throw error;

    const { data: fallback, error: fallbackError } = await applyFilters(this.supabase.from('guides').select('*').order('name'));
    if (fallbackError) throw fallbackError;
    return this.attachGuideLanguages(fallback || []);
  }

  async getGuide(id: string): Promise<Guide | null> {
    const { data, error } = await this.supabase.from('guides').select('*').eq('id', id).single();
    if (error) return null;
    if (!data) return null;
    const [guide] = await this.attachGuideLanguages([data]);
    return guide || null;
  }

  async createGuide(guide: GuideInput): Promise<Guide> {
    const { data: existing } = await this.supabase.from('guides').select('id').ilike('name', guide.name).maybeSingle();
    if (existing) throw new Error('A guide with this name already exists');

    if (guide.isDefault) {
      const { error } = await this.supabase.from('guides').update({ is_default: false }).eq('is_default', true);
      if (error) throw error;
    }

    const { data, error } = await this.supabase.from('guides').insert({
      is_default: guide.isDefault || false,
      name: guide.name,
      phone: guide.phone || '',
      note: guide.note || '',
      status: 'active',
      search_keywords: generateSearchKeywords(guide.name),
    }).select().single();
    if (error) throw error;

    if (guide.languageIds !== undefined) await this.replaceGuideLanguages(data.id, guide.languageIds);
    const created = await this.getGuide(data.id);
    if (!created) throw new Error('Guide was created but could not be loaded');
    return created;
  }

  async updateGuide(id: string, guide: Partial<GuideInput>): Promise<void> {
    const { data: existing, error: lookupError } = await this.supabase.from('guides').select('id, name').eq('id', id).maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) throw new Error('Guide not found or you do not have permission to edit it');

    const updates: GuideUpdate = {};
    if (guide.name !== undefined) {
      const { data: dup } = await this.supabase.from('guides').select('id').ilike('name', guide.name).neq('id', id).maybeSingle();
      if (dup) throw new Error('A guide with this name already exists');
      updates.name = guide.name;
      updates.search_keywords = generateSearchKeywords(guide.name);
    }
    if (guide.phone !== undefined) updates.phone = guide.phone;
    if (guide.note !== undefined) updates.note = guide.note;
    if (guide.isDefault !== undefined) updates.is_default = guide.isDefault;

    const hasUpdates = Object.keys(updates).length > 0;
    const hasLanguageUpdates = guide.languageIds !== undefined;
    if (!hasUpdates && !hasLanguageUpdates) throw new Error('No changes to save');

    if (guide.isDefault) {
      const { error } = await this.supabase.from('guides').update({ is_default: false }).neq('id', id).eq('is_default', true);
      if (error) throw error;
    }

    if (hasUpdates) {
      const { data: updated, error } = await this.supabase.from('guides').update(updates).eq('id', id).select('id').maybeSingle();
      if (error) throw error;
      if (!updated) throw new Error(`Guide "${existing.name}" was not updated. Refresh and try again.`);
    }
    if (hasLanguageUpdates) await this.replaceGuideLanguages(id, guide.languageIds || []);
  }

  async deleteGuide(id: string): Promise<void> {
    const { data: guide, error: lookupError } = await this.supabase.from('guides').select('id, name').eq('id', id).maybeSingle();
    if (lookupError) throw lookupError;
    if (!guide) throw new Error('Guide not found or you do not have permission to delete it');

    const { error: detachError } = await this.supabase.from('tours').update({ guide_id: null }).eq('guide_id', id);
    if (detachError) throw new Error(`Cannot delete guide "${guide.name}" because related tours could not be updated`);

    const { data: deleted, error } = await this.supabase.from('guides').delete().eq('id', id).select('id').maybeSingle();
    if (error) throw error;
    if (!deleted) throw new Error(`Guide "${guide.name}" was not deleted. Refresh and try again.`);
  }

  async duplicateGuide(id: string): Promise<Guide> {
    const original = await this.getGuide(id);
    if (!original) throw new Error('Guide not found');
    return this.createGuide({
      name: `${original.name} (Copy)`,
      phone: original.phone,
      note: original.note,
      languageIds: original.languages.map((l) => l.id),
      isDefault: false,
    });
  }

  async deleteAllGuides(): Promise<void> {
    const { error: detachError } = await this.supabase.from('tours').update({ guide_id: null }).not('guide_id', 'is', null);
    if (detachError) throw detachError;
    const { error } = await this.supabase.from('guides').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateGuides(inputs: GuideInput[]): Promise<Guide[]> {
    const names = inputs.map((i) => i.name.toLowerCase());
    const dups = names.filter((n, idx) => names.indexOf(n) !== idx);
    if (dups.length > 0) throw new Error('Duplicate names found in batch');

    const { data: existing } = await this.supabase.from('guides').select('name');
    if (existing) {
      const existingNames = existing.map((g) => g.name.toLowerCase());
      const conflicts = inputs.filter((i) => existingNames.includes(i.name.toLowerCase()));
      if (conflicts.length > 0) throw new Error(`The following guides already exist: ${conflicts.map((d) => d.name).join(', ')}`);
    }

    const { data, error } = await this.supabase.from('guides').insert(
      inputs.map((i) => ({ name: i.name, phone: i.phone || '', note: i.note || '', status: 'active', search_keywords: generateSearchKeywords(i.name) }))
    ).select();
    if (error) throw error;
    return (data || []).map(mapGuide);
  }

  async toggleGuideStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async listLanguages(query?: SearchQuery): Promise<Language[]> {
    let qb = this.supabase.from('languages').select('*').order('name');
    if (query?.status) qb = qb.eq('status', query.status);
    if (query?.search) qb = qb.ilike('name', `%${query.search}%`);
    const { data, error } = await qb;
    if (error) {
      if (this.isMissingLanguageSchemaError(error)) return [];
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
    const { data: existing } = await this.supabase.from('languages').select('id').ilike('code', code).maybeSingle();
    if (existing) throw new Error('A language with this code already exists');

    const { data, error } = await this.supabase.from('languages').insert({
      code, name,
      native_name: language.nativeName || null,
      status: 'active',
      search_keywords: generateSearchKeywords(`${name} ${code} ${language.nativeName || ''}`),
    }).select().single();
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
    if (Object.keys(updates).length === 0) throw new Error('No changes to save');
    const { error } = await this.supabase.from('languages').update(updates).eq('id', id);
    if (error) throw error;
  }

  async duplicateLanguage(id: string): Promise<Language> {
    const original = await this.getLanguage(id);
    if (!original) throw new Error('Language not found');
    return this.createLanguage({ code: `${original.code}-copy`, name: `${original.name} (Copy)`, nativeName: original.nativeName });
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
    const records = inputs.map((i) => {
      const code = i.code.trim().toLowerCase();
      const name = i.name.trim();
      return { code, name, native_name: i.nativeName || null, status: 'active', search_keywords: generateSearchKeywords(`${name} ${code} ${i.nativeName || ''}`) };
    });
    const { data, error } = await this.supabase.from('languages').insert(records).select();
    if (error) throw error;
    return (data || []).map(mapLanguage);
  }

  async toggleLanguageStatus(_id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }
}
