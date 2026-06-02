import { describe, expect, it } from 'vitest';
import {
  ALL_PERMISSIONS,
  dbRowToUserProfile,
  getDefaultPermissionsForProfile,
  getEffectivePermissions,
  userProfileToDbInsert,
  userProfileToDbUpdate,
  type UserProfileInput,
  type UserProfileRow,
} from './user';

const baseProfileInput: UserProfileInput = {
  email: 'admin@example.com',
  fullName: 'Admin User',
  role: 'admin',
  status: 'active',
  settlementRole: 'none',
  permissions: ['view_tours'],
};

const baseProfileRow: UserProfileRow = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'admin@example.com',
  full_name: 'Admin User',
  role: 'admin',
  status: 'active',
  settlement_role: 'none',
  permissions: ['view_tours'],
  created_at: null,
  updated_at: null,
  created_by: null,
};

describe('user profile permissions', () => {
  it('maps any admin profile to full app permissions', () => {
    const profile = dbRowToUserProfile(baseProfileRow);

    expect(profile.permissions).toEqual(ALL_PERMISSIONS);
  });

  it('stores admin inserts without explicit permission overrides', () => {
    const insert = userProfileToDbInsert(baseProfileRow.id, baseProfileInput);

    expect(insert.permissions).toBeNull();
  });

  it('clears explicit permission overrides when updating a user to admin', () => {
    const update = userProfileToDbUpdate({
      role: 'admin',
      permissions: ['view_tours'],
    });

    expect(update.permissions).toBeNull();
  });

  it('grants editor guide users tour creation, editing, and settlement submission by default', () => {
    const permissions = getDefaultPermissionsForProfile({ role: 'editor', settlementRole: 'guide' });

    expect(permissions).toEqual(expect.arrayContaining([
      'create_tours',
      'edit_tours',
      'edit_tour_info',
      'edit_tour_info_all_fields',
      'submit_settlement',
    ]));
  });

  it('keeps explicit non-admin permission overrides exact', () => {
    const permissions = getEffectivePermissions({
      role: 'editor',
      settlementRole: 'guide',
      permissions: ['view_tours'],
    });

    expect(permissions).toEqual(['view_tours']);
  });
});
