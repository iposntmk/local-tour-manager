import { describe, expect, it, vi } from 'vitest';
import { GuideModule } from './guide-module';

type TestGuideModule = GuideModule & {
  listGuideUsers: unknown;
};

describe('GuideModule', () => {
  it('keeps legacy listGuides as a canonical guide-user read-through', async () => {
    const guides = [{
      id: 'profile-1',
      name: 'Guide User',
      phone: '',
      note: '',
      languages: [],
      status: 'active' as const,
      searchKeywords: [],
      createdAt: '',
      updatedAt: '',
      isShared: true,
    }];
    const listGuideUsers = vi.fn().mockResolvedValue(guides);
    const module = new GuideModule();
    (module as unknown as TestGuideModule).listGuideUsers = listGuideUsers;

    await expect(module.listGuides({ status: 'active' })).resolves.toBe(guides);
    expect(listGuideUsers).toHaveBeenCalledWith({ status: 'active' });
  });
});
