import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { Guide, Language, GuideInput, LanguageInput } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';
import { generateSearchKeywords } from '@/lib/string-utils';
import { mapLanguage } from '../mappers';
import type { LanguageUpdate } from '../store-types';

// Guides are now user_profiles with settlement_role = 'guide'. The guide master
// methods below read through to the user-profile store; all guide creation and
// editing happens on the Users page. The legacy `guides` table is no longer used.
export class GuideModule {
  declare protected supabase: SupabaseClient<Database>;
  declare listGuideUsers: (query?: SearchQuery) => Promise<Guide[]>;
  declare getGuideUser: (id: string) => Promise<Guide | null>;

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

  private guideManagementMoved(): never {
    throw new Error(
      'Hướng dẫn viên nay được quản lý tại trang Người dùng. Hãy tạo/sửa tài khoản và đặt "Vai trò quyết toán" thành "Hướng dẫn viên".'
    );
  }

  async listGuides(query?: SearchQuery): Promise<Guide[]> {
    return this.listGuideUsers(query);
  }

  async getGuide(id: string): Promise<Guide | null> {
    return this.getGuideUser(id);
  }

  async createGuide(_guide: GuideInput): Promise<Guide> {
    return this.guideManagementMoved();
  }

  async updateGuide(_id: string, _guide: Partial<GuideInput>): Promise<void> {
    this.guideManagementMoved();
  }

  async deleteGuide(_id: string): Promise<void> {
    this.guideManagementMoved();
  }

  async duplicateGuide(_id: string): Promise<Guide> {
    return this.guideManagementMoved();
  }

  async deleteAllGuides(): Promise<void> {
    this.guideManagementMoved();
  }

  async bulkCreateGuides(_inputs: GuideInput[]): Promise<Guide[]> {
    return this.guideManagementMoved();
  }

  async toggleGuideStatus(_id: string): Promise<void> {
    this.guideManagementMoved();
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
