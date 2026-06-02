import { describe, expect, it, vi } from 'vitest';
import { UserProfilesModule } from './user-profiles';

type TestUserProfilesModule = UserProfilesModule & {
  supabase: unknown;
};

const profileRow = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'guide@example.com',
  full_name: 'Guide User',
  phone: '090',
  note: 'note',
  is_default_guide: false,
  role: 'editor',
  status: 'active',
  settlement_role: 'guide',
  permissions: null,
  created_at: null,
  updated_at: null,
  created_by: null,
};

describe('UserProfilesModule', () => {
  it('passes languageIds to update_own_profile RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: profileRow, error: null });
    const userLanguageQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const module = new UserProfilesModule();
    (module as unknown as TestUserProfilesModule).supabase = {
      rpc,
      from: vi.fn(() => userLanguageQuery),
    };

    await module.updateOwnProfile({
      fullName: 'Guide User',
      phone: '090',
      note: 'note',
      languageIds: ['lang-1', 'lang-2'],
    });

    expect(rpc).toHaveBeenCalledWith('update_own_profile', {
      p_full_name: 'Guide User',
      p_phone: '090',
      p_note: 'note',
      p_language_ids: ['lang-1', 'lang-2'],
    });
  });
});
