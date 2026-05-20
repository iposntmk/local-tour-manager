import type { Database } from '@/integrations/supabase/types';

// User role types
export type UserRole = 'admin' | 'editor' | 'viewer';
export type UserStatus = 'active' | 'inactive';

// Settlement workflow role (independent of system role)
export type SettlementRole = 'none' | 'guide' | 'accountant';

// Database types
export type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert'];
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];

// Application user profile type
export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  role: UserRole;
  status: UserStatus;
  settlementRole: SettlementRole;
  permissions?: Permission[] | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

// Input type for creating/updating user profiles
export interface UserProfileInput {
  email: string;
  fullName?: string;
  role: UserRole;
  status: UserStatus;
  settlementRole?: SettlementRole;
  permissions?: Permission[] | null;
}

// Permission types
export type Permission =
  | 'view_tours'
  | 'create_tours'
  | 'edit_tours'
  | 'delete_tours'
  | 'export_tours'
  | 'import_tours'
  | 'duplicate_tours'
  | 'backup_data'
  | 'download_all_tour_images'
  | 'edit_tour_info'
  | 'edit_tour_destinations'
  | 'edit_tour_expenses'
  | 'edit_tour_meals'
  | 'edit_tour_allowances'
  | 'edit_tour_shoppings'
  | 'edit_tour_summary'
  | 'upload_tour_images'
  | 'delete_tour_images'
  | 'view_master_data'
  | 'edit_master_data'
  | 'delete_master_data'
  | 'view_guides'
  | 'create_guides'
  | 'edit_guides'
  | 'delete_guides'
  | 'import_guides'
  | 'export_guides'
  | 'view_languages'
  | 'create_languages'
  | 'edit_languages'
  | 'delete_languages'
  | 'import_languages'
  | 'export_languages'
  | 'view_companies'
  | 'create_companies'
  | 'edit_companies'
  | 'delete_companies'
  | 'import_companies'
  | 'export_companies'
  | 'view_nationalities'
  | 'create_nationalities'
  | 'edit_nationalities'
  | 'delete_nationalities'
  | 'import_nationalities'
  | 'export_nationalities'
  | 'view_provinces'
  | 'create_provinces'
  | 'edit_provinces'
  | 'delete_provinces'
  | 'import_provinces'
  | 'export_provinces'
  | 'view_tourist_destinations'
  | 'create_tourist_destinations'
  | 'edit_tourist_destinations'
  | 'delete_tourist_destinations'
  | 'import_tourist_destinations'
  | 'export_tourist_destinations'
  | 'view_shopping'
  | 'create_shopping'
  | 'edit_shopping'
  | 'delete_shopping'
  | 'import_shopping'
  | 'export_shopping'
  | 'view_expense_categories'
  | 'create_expense_categories'
  | 'edit_expense_categories'
  | 'delete_expense_categories'
  | 'import_expense_categories'
  | 'export_expense_categories'
  | 'view_detailed_expenses'
  | 'create_detailed_expenses'
  | 'edit_detailed_expenses'
  | 'delete_detailed_expenses'
  | 'import_detailed_expenses'
  | 'export_detailed_expenses'
  | 'view_statistics'
  | 'manage_users'
  | 'view_all_users'
  | 'create_users'
  | 'edit_users'
  | 'delete_users'
  | 'change_user_roles'
  // Settlement workflow permissions
  | 'submit_settlement'
  | 'review_settlement_line'
  | 'approve_settlement'
  | 'reopen_settlement'
  | 'mark_tour_paid';

export const ALL_PERMISSIONS: Permission[] = [
  'view_tours',
  'create_tours',
  'edit_tours',
  'delete_tours',
  'export_tours',
  'import_tours',
  'duplicate_tours',
  'backup_data',
  'download_all_tour_images',
  'edit_tour_info',
  'edit_tour_destinations',
  'edit_tour_expenses',
  'edit_tour_meals',
  'edit_tour_allowances',
  'edit_tour_shoppings',
  'edit_tour_summary',
  'upload_tour_images',
  'delete_tour_images',
  'view_master_data',
  'edit_master_data',
  'delete_master_data',
  'view_guides',
  'create_guides',
  'edit_guides',
  'delete_guides',
  'import_guides',
  'export_guides',
  'view_languages',
  'create_languages',
  'edit_languages',
  'delete_languages',
  'import_languages',
  'export_languages',
  'view_companies',
  'create_companies',
  'edit_companies',
  'delete_companies',
  'import_companies',
  'export_companies',
  'view_nationalities',
  'create_nationalities',
  'edit_nationalities',
  'delete_nationalities',
  'import_nationalities',
  'export_nationalities',
  'view_provinces',
  'create_provinces',
  'edit_provinces',
  'delete_provinces',
  'import_provinces',
  'export_provinces',
  'view_tourist_destinations',
  'create_tourist_destinations',
  'edit_tourist_destinations',
  'delete_tourist_destinations',
  'import_tourist_destinations',
  'export_tourist_destinations',
  'view_shopping',
  'create_shopping',
  'edit_shopping',
  'delete_shopping',
  'import_shopping',
  'export_shopping',
  'view_expense_categories',
  'create_expense_categories',
  'edit_expense_categories',
  'delete_expense_categories',
  'import_expense_categories',
  'export_expense_categories',
  'view_detailed_expenses',
  'create_detailed_expenses',
  'edit_detailed_expenses',
  'delete_detailed_expenses',
  'import_detailed_expenses',
  'export_detailed_expenses',
  'view_statistics',
  'manage_users',
  'view_all_users',
  'create_users',
  'edit_users',
  'delete_users',
  'change_user_roles',
  'submit_settlement',
  'review_settlement_line',
  'approve_settlement',
  'reopen_settlement',
  'mark_tour_paid',
];

const EDITOR_MASTER_PERMISSIONS: Permission[] = [
  'view_master_data',
  'edit_master_data',
  'view_guides',
  'create_guides',
  'edit_guides',
  'import_guides',
  'export_guides',
  'view_languages',
  'create_languages',
  'edit_languages',
  'import_languages',
  'export_languages',
  'view_companies',
  'create_companies',
  'edit_companies',
  'import_companies',
  'export_companies',
  'view_nationalities',
  'create_nationalities',
  'edit_nationalities',
  'import_nationalities',
  'export_nationalities',
  'view_provinces',
  'create_provinces',
  'edit_provinces',
  'import_provinces',
  'export_provinces',
  'view_tourist_destinations',
  'create_tourist_destinations',
  'edit_tourist_destinations',
  'import_tourist_destinations',
  'export_tourist_destinations',
  'view_shopping',
  'create_shopping',
  'edit_shopping',
  'import_shopping',
  'export_shopping',
  'view_expense_categories',
  'create_expense_categories',
  'edit_expense_categories',
  'import_expense_categories',
  'export_expense_categories',
  'view_detailed_expenses',
  'create_detailed_expenses',
  'edit_detailed_expenses',
  'import_detailed_expenses',
  'export_detailed_expenses',
];

const VIEWER_MASTER_PERMISSIONS: Permission[] = [
  'view_master_data',
  'view_guides',
  'view_languages',
  'view_companies',
  'view_nationalities',
  'view_provinces',
  'view_tourist_destinations',
  'view_shopping',
  'view_expense_categories',
  'view_detailed_expenses',
];

// System-role permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ALL_PERMISSIONS,
  editor: [
    'view_tours',
    'create_tours',
    'edit_tours',
    'export_tours',
    'import_tours',
    'duplicate_tours',
    'export_tours',
    'download_all_tour_images',
    'edit_tour_info',
    'edit_tour_destinations',
    'edit_tour_expenses',
    'edit_tour_meals',
    'edit_tour_allowances',
    'edit_tour_shoppings',
    'edit_tour_summary',
    'upload_tour_images',
    'view_statistics',
    ...EDITOR_MASTER_PERMISSIONS,
  ],
  viewer: [
    'view_tours',
    'view_statistics',
    ...VIEWER_MASTER_PERMISSIONS,
  ],
};

// Settlement-role permissions mapping (independent of system role)
export const SETTLEMENT_ROLE_PERMISSIONS: Record<SettlementRole, Permission[]> = {
  none: [],
  guide: ['submit_settlement'],
  accountant: ['review_settlement_line', 'approve_settlement'],
};

export function normalizePermissions(permissions?: readonly string[] | null): Permission[] {
  if (!permissions) return [];
  const known = new Set(ALL_PERMISSIONS);
  return Array.from(new Set(permissions.filter((permission): permission is Permission => known.has(permission as Permission))));
}

// Helper function to check if a role has a specific permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// Helper function to check if a role has any of the given permissions
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

// Helper function to check if a role has all of the given permissions
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

// Effective permissions = system role ∪ settlement role
export function getDefaultPermissionsForProfile(profile: Pick<UserProfile, 'role' | 'settlementRole'>): Permission[] {
  const sys = ROLE_PERMISSIONS[profile.role] ?? [];
  const settle = SETTLEMENT_ROLE_PERMISSIONS[profile.settlementRole] ?? [];
  return Array.from(new Set([...sys, ...settle]));
}

// Effective permissions = per-user permissions if configured, otherwise role preset ∪ settlement role.
// Admins always get ALL_PERMISSIONS so a stale stored override cannot lock them out of newer features.
export function getEffectivePermissions(
  profile: Pick<UserProfile, 'role' | 'settlementRole'> & { permissions?: Permission[] | null; email?: string }
): Permission[] {
  if (profile.role === 'admin' || profile.email === 'iposntmk@gmail.com') {
    return ALL_PERMISSIONS;
  }
  if (Array.isArray(profile.permissions)) {
    return normalizePermissions(profile.permissions);
  }
  return getDefaultPermissionsForProfile(profile);
}

export function profileHasPermission(
  profile: Pick<UserProfile, 'role' | 'settlementRole'> & { permissions?: Permission[] | null; email?: string },
  permission: Permission
): boolean {
  return getEffectivePermissions(profile).includes(permission);
}

export function isGuide(profile?: Pick<UserProfile, 'settlementRole'> | null): boolean {
  return profile?.settlementRole === 'guide';
}

export function isAccountant(profile?: Pick<UserProfile, 'settlementRole'> | null): boolean {
  return profile?.settlementRole === 'accountant';
}

// User role display labels (Vietnamese)
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quản trị viên',
  editor: 'Biên tập viên',
  viewer: 'Người xem',
};

// User status display labels (Vietnamese)
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Hoạt động',
  inactive: 'Không hoạt động',
};

// Settlement role display labels (Vietnamese)
export const SETTLEMENT_ROLE_LABELS: Record<SettlementRole, string> = {
  none: 'Không tham gia',
  guide: 'Hướng dẫn viên',
  accountant: 'Kế toán',
};

// Convert database row to UserProfile
export function dbRowToUserProfile(row: UserProfileRow): UserProfile {
  const settlementRoleRaw = (row as unknown as { settlement_role?: string | null }).settlement_role;
  const permissionsRaw = (row as unknown as { permissions?: string[] | null }).permissions;
  const isMasterAdmin = row.email === 'iposntmk@gmail.com';
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name ?? undefined,
    role: isMasterAdmin ? 'admin' : (row.role as UserRole),
    status: isMasterAdmin ? 'active' : (row.status as UserStatus),
    settlementRole: (settlementRoleRaw as SettlementRole) ?? 'none',
    permissions: isMasterAdmin ? ALL_PERMISSIONS : (Array.isArray(permissionsRaw) ? normalizePermissions(permissionsRaw) : undefined),
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    createdBy: row.created_by ?? undefined,
  };
}

// Convert UserProfile to database insert
export function userProfileToDbInsert(
  userId: string,
  profile: UserProfileInput,
  createdBy?: string
): UserProfileInsert {
  const insert: UserProfileInsert & { settlement_role?: SettlementRole } = {
    id: userId,
    email: profile.email,
    full_name: profile.fullName,
    role: profile.role,
    status: profile.status,
    created_by: createdBy,
  };
  if (profile.settlementRole !== undefined) {
    insert.settlement_role = profile.settlementRole;
  }
  if (profile.permissions !== undefined) {
    (insert as UserProfileInsert & { permissions?: Permission[] | null }).permissions = profile.permissions;
  }
  return insert as UserProfileInsert;
}

// Convert UserProfile to database update
export function userProfileToDbUpdate(profile: Partial<UserProfileInput>): UserProfileUpdate {
  const update: UserProfileUpdate & { settlement_role?: SettlementRole } = {};

  if (profile.email !== undefined) update.email = profile.email;
  if (profile.fullName !== undefined) update.full_name = profile.fullName;
  if (profile.role !== undefined) update.role = profile.role;
  if (profile.status !== undefined) update.status = profile.status;
  if (profile.settlementRole !== undefined) update.settlement_role = profile.settlementRole;
  if (profile.permissions !== undefined) {
    (update as UserProfileUpdate & { permissions?: Permission[] | null }).permissions = profile.permissions;
  }

  return update as UserProfileUpdate;
}
