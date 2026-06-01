import { describe, expect, it } from 'vitest';
import {
  ALL_PERMISSIONS,
  dbRowToUserProfile,
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
});
