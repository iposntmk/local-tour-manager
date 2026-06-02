import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { UserProfile, UserProfileInput } from '@/types/user';
import { dbRowToUserProfile, userProfileToDbInsert, userProfileToDbUpdate } from '@/types/user';
import type { SearchQuery } from '@/types/datastore';
import type { Guide, Language } from '@/types/master';
import { generateSearchKeywords } from '@/lib/string-utils';
import { mapLanguage } from './mappers';

type UserProfileGuideRow = Database['public']['Tables']['user_profiles']['Row'] & {
  phone?: string | null;
  note?: string | null;
  is_default_guide?: boolean | null;
  guide_search_keywords?: string[] | null;
};

type OwnProfilePatch = Pick<Partial<UserProfileInput>, 'fullName' | 'phone' | 'note' | 'languageIds'>;

// supabase-js trả về FunctionsHttpError khi Edge Function phản hồi non-2xx;
// body JSON thực sự nằm trong error.context (một Response). Trích `error` từ đó.
async function extractFunctionErrorMessage(error: unknown): Promise<string | undefined> {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.clone().json();
      if (body && typeof body.error === 'string') return body.error;
    } catch {
      // body không phải JSON — bỏ qua, dùng message mặc định
    }
  }
  return (error as { message?: string })?.message;
}

export class UserProfilesModule {
  declare protected supabase: SupabaseClient<Database>;

  private isMissingUserLanguageSchemaError(error: { code?: string; message?: string; details?: string; hint?: string } | null): boolean {
    const text = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
    return text.includes('user_languages') || text.includes('languages') || text.includes('schema cache');
  }

  private async loadLanguagesByUserId(userIds: string[]): Promise<Map<string, Language[]>> {
    const result = new Map<string, Language[]>();
    if (userIds.length === 0) return result;

    const { data: links, error: linkError } = await (this.supabase as any)
      .from('user_languages')
      .select('user_id, language_id')
      .in('user_id', userIds);

    if (linkError) {
      if (this.isMissingUserLanguageSchemaError(linkError)) return result;
      throw linkError;
    }

    const languageIds = Array.from(new Set(
      ((links || []) as { language_id: string }[]).map((link) => link.language_id).filter(Boolean)
    ));
    if (languageIds.length === 0) return result;

    const { data: languages, error: languageError } = await this.supabase
      .from('languages')
      .select('*')
      .in('id', languageIds);

    if (languageError) {
      if (this.isMissingUserLanguageSchemaError(languageError)) return result;
      throw languageError;
    }

    const languagesById = new Map((languages || []).map((language) => [language.id, mapLanguage(language)]));
    (links || []).forEach((link) => {
      const language = languagesById.get(link.language_id);
      if (!language) return;
      const current = result.get(link.user_id) || [];
      result.set(link.user_id, [...current, language]);
    });

    return result;
  }

  private async attachLanguageIds(profiles: UserProfile[]): Promise<UserProfile[]> {
    const languagesByUserId = await this.loadLanguagesByUserId(profiles.map((profile) => profile.id));
    return profiles.map((profile) => ({
      ...profile,
      languageIds: (languagesByUserId.get(profile.id) || []).map((language) => language.id),
    }));
  }

  private mapGuideUser(row: UserProfileGuideRow, languages: Language[]): Guide {
    const name = row.full_name?.trim() || row.email;
    return {
      id: row.id,
      name,
      phone: row.phone || '',
      note: row.note || '',
      languages,
      isDefault: !!row.is_default_guide,
      status: row.status as Guide['status'],
      searchKeywords: row.guide_search_keywords || generateSearchKeywords(`${name} ${row.email} ${row.phone || ''}`),
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
      createdBy: row.created_by ?? undefined,
      isShared: true,
    };
  }

  private async replaceUserLanguages(userId: string, languageIds?: string[]): Promise<void> {
    if (languageIds === undefined) return;

    const { error: deleteError } = await (this.supabase as any)
      .from('user_languages')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      if (this.isMissingUserLanguageSchemaError(deleteError)) return;
      throw deleteError;
    }

    const unique = Array.from(new Set(languageIds.filter(Boolean)));
    if (unique.length === 0) return;

    const { error: insertError } = await (this.supabase as any)
      .from('user_languages')
      .insert(unique.map((languageId) => ({ user_id: userId, language_id: languageId, proficiency: 'working' })));

    if (insertError) {
      if (this.isMissingUserLanguageSchemaError(insertError)) return;
      throw insertError;
    }
  }

  private async clearOtherDefaultGuides(userId: string, input: Partial<UserProfileInput>): Promise<void> {
    if (input.settlementRole !== 'guide' || input.isDefaultGuide !== true) return;

    const { error } = await (this.supabase as any)
      .from('user_profiles')
      .update({ is_default_guide: false })
      .neq('id', userId)
      .eq('is_default_guide', true);

    if (error) throw error;
  }

  async listUserProfiles(query?: SearchQuery): Promise<UserProfile[]> {
    let dbQuery = this.supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply status filter
    if (query?.status && query.status !== 'all') {
      dbQuery = dbQuery.eq('status', query.status);
    }
    if (query?.settlementRole && query.settlementRole !== 'all') {
      dbQuery = dbQuery.eq('settlement_role', query.settlementRole);
    }

    // Apply search filter (email or full_name)
    if (query?.search) {
      dbQuery = dbQuery.or(`email.ilike.%${query.search}%,full_name.ilike.%${query.search}%`);
    }

    // Apply pagination
    if (query?.limit) {
      dbQuery = dbQuery.limit(query.limit);
    }
    if (query?.offset) {
      dbQuery = dbQuery.range(query.offset, query.offset + (query.limit || 50) - 1);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Error listing user profiles:', error);
      throw new Error(`Failed to list user profiles: ${error.message}`);
    }

    return this.attachLanguageIds((data || []).map(dbRowToUserProfile));
  }

  async listGuideUsers(query?: SearchQuery): Promise<Guide[]> {
    let dbQuery = this.supabase
      .from('user_profiles')
      .select('*')
      .eq('settlement_role', 'guide')
      .order('is_default_guide', { ascending: false })
      .order('full_name', { ascending: true });

    if (query?.status && query.status !== 'all') dbQuery = dbQuery.eq('status', query.status);
    if (query?.search) {
      dbQuery = dbQuery.or(`email.ilike.%${query.search}%,full_name.ilike.%${query.search}%,phone.ilike.%${query.search}%`);
    }
    if (query?.limit) dbQuery = dbQuery.limit(query.limit);
    if (query?.offset) dbQuery = dbQuery.range(query.offset, query.offset + (query.limit || 50) - 1);

    const { data, error } = await dbQuery;
    if (error) throw new Error(`Failed to list guide users: ${error.message}`);

    const rows = (data || []) as UserProfileGuideRow[];
    const languagesByUserId = await this.loadLanguagesByUserId(rows.map((row) => row.id));
    return rows.map((row) => this.mapGuideUser(row, languagesByUserId.get(row.id) || []));
  }

  async getGuideUser(id: string): Promise<Guide | null> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Failed to get guide user: ${error.message}`);
    if (!data) return null;
    const row = data as UserProfileGuideRow;
    const languagesByUserId = await this.loadLanguagesByUserId([row.id]);
    return this.mapGuideUser(row, languagesByUserId.get(row.id) || []);
  }

  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      console.error('Error getting user profile:', error);
      throw new Error(`Failed to get user profile: ${error.message}`);
    }

    if (!data) return undefined;
    const [profile] = await this.attachLanguageIds([dbRowToUserProfile(data)]);
    return profile;
  }

  async getUserProfileByEmail(email: string): Promise<UserProfile | undefined> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      console.error('Error getting user profile by email:', error);
      throw new Error(`Failed to get user profile: ${error.message}`);
    }

    if (!data) return undefined;
    const [profile] = await this.attachLanguageIds([dbRowToUserProfile(data)]);
    return profile;
  }

  async createAuthUser(input: { email: string; password: string; fullName?: string }): Promise<string> {
    // Tạo tài khoản đăng nhập qua Edge Function `create-user` (Admin API) thay vì
    // supabase.auth.signUp ở client — tránh việc signUp tự đăng nhập thành user mới
    // (mất session admin) và bỏ yêu cầu xác nhận email.
    const { data, error } = await this.supabase.functions.invoke<{ userId?: string; error?: string }>(
      'create-user',
      { body: input },
    );

    if (error) {
      const serverMessage = await extractFunctionErrorMessage(error);
      console.error('Error creating user (edge function):', serverMessage ?? error);
      throw new Error(
        serverMessage ??
          'Không thể tạo tài khoản. Hãy chắc chắn Edge Function "create-user" đã được deploy ' +
            '(supabase functions deploy create-user).',
      );
    }

    if (data?.error) throw new Error(data.error);
    if (!data?.userId) throw new Error('Edge Function "create-user" không trả về userId.');
    return data.userId;
  }

  async createUserProfile(
    userId: string,
    input: UserProfileInput,
    createdBy?: string
  ): Promise<UserProfile> {
    await this.clearOtherDefaultGuides(userId, input);
    const insert = userProfileToDbInsert(userId, input, createdBy);

    const { data, error } = await this.supabase
      .from('user_profiles')
      .insert(insert)
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      throw new Error(`Failed to create user profile: ${error.message}`);
    }

    await this.replaceUserLanguages(data.id, input.languageIds);
    const [profile] = await this.attachLanguageIds([dbRowToUserProfile(data)]);
    return profile;
  }

  async updateUserProfile(id: string, patch: Partial<UserProfileInput>): Promise<void> {
    await this.clearOtherDefaultGuides(id, patch);
    const update = userProfileToDbUpdate(patch);

    const { error } = await this.supabase
      .from('user_profiles')
      .update(update)
      .eq('id', id);

    if (error) {
      console.error('Error updating user profile:', error);
      throw new Error(`Failed to update user profile: ${error.message}`);
    }

    await this.replaceUserLanguages(id, patch.languageIds);
  }

  async updateOwnProfile(patch: OwnProfilePatch): Promise<UserProfile> {
    const { data, error } = await (this.supabase as any).rpc('update_own_profile', {
      p_full_name: patch.fullName ?? null,
      p_phone: patch.phone ?? null,
      p_note: patch.note ?? null,
      p_language_ids: patch.languageIds ?? null,
    });

    if (error) {
      console.error('Error updating own profile:', error);
      throw new Error(`Failed to update own profile: ${error.message}`);
    }
    if (!data) throw new Error('Failed to update own profile: no profile returned');

    const [profile] = await this.attachLanguageIds([dbRowToUserProfile(data)]);
    return profile;
  }

  async deleteUserProfile(id: string): Promise<void> {
    // Xóa qua Edge Function `delete-user` để loại bỏ CẢ hồ sơ (user_profiles)
    // lẫn tài khoản đăng nhập trong auth.users. Xóa trực tiếp bảng user_profiles
    // từ client KHÔNG đụng tới auth.users, nên người dùng vẫn đăng nhập được.
    const { data, error } = await this.supabase.functions.invoke<{ success?: boolean; error?: string }>(
      'delete-user',
      { body: { userId: id } },
    );

    if (error) {
      const serverMessage = await extractFunctionErrorMessage(error);
      console.error('Error deleting user (edge function):', serverMessage ?? error);
      throw new Error(
        serverMessage ??
          'Không thể xóa người dùng. Hãy chắc chắn Edge Function "delete-user" đã được deploy ' +
            '(supabase functions deploy delete-user).',
      );
    }

    if (data?.error) {
      throw new Error(data.error);
    }
  }

  async getCurrentUserProfile(): Promise<UserProfile | undefined> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) {
      return undefined;
    }

    return this.getUserProfile(user.id);
  }
}
