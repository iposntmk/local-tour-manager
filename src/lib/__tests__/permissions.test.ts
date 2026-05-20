import { describe, expect, it } from 'vitest';
import { PERMISSION_TREE, getNodePermissions } from '../permissions';
import { ALL_PERMISSIONS } from '@/types/user';

describe('permission tree', () => {
  it('contains every declared permission so user checkboxes stay complete', () => {
    const treePermissions = new Set(PERMISSION_TREE.flatMap(getNodePermissions));
    const missingPermissions = ALL_PERMISSIONS.filter((permission) => !treePermissions.has(permission));

    expect(missingPermissions).toEqual([]);
  });

  it('does not contain duplicate permission nodes', () => {
    const treePermissions = PERMISSION_TREE.flatMap(getNodePermissions);
    const duplicates = treePermissions.filter(
      (permission, index) => treePermissions.indexOf(permission) !== index
    );

    expect(duplicates).toEqual([]);
  });
});
