import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { UserProfile, UserProfileInput } from '@/types/user';
import { dbRowToUserProfile, userProfileToDbInsert, userProfileToDbUpdate } from '@/types/user';
import type { SearchQuery } from '@/types/datastore';

export class UserProfilesModule {
  declare protected supabase: SupabaseClient<Database>;

  async listUserProfiles(query?: SearchQuery): Promise<UserProfile[]> {
    let dbQuery = this.supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply status filter
    if (query?.status && query.status !== 'all') {
      dbQuery = dbQuery.eq('status', query.status);
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

    return (data || []).map(dbRowToUserProfile);
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

    return data ? dbRowToUserProfile(data) : undefined;
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

    return data ? dbRowToUserProfile(data) : undefined;
  }

  async createUserProfile(
    userId: string,
    input: UserProfileInput,
    createdBy?: string
  ): Promise<UserProfile> {
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

    return dbRowToUserProfile(data);
  }

  async updateUserProfile(id: string, patch: Partial<UserProfileInput>): Promise<void> {
    const update = userProfileToDbUpdate(patch);

    const { error } = await this.supabase
      .from('user_profiles')
      .update(update)
      .eq('id', id);

    if (error) {
      console.error('Error updating user profile:', error);
      throw new Error(`Failed to update user profile: ${error.message}`);
    }
  }

  async deleteUserProfile(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_profiles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting user profile:', error);
      throw new Error(`Failed to delete user profile: ${error.message}`);
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
