import type { Database } from '@/integrations/supabase/types';
import { ALL_PERMISSIONS, normalizePermissions } from '@/types/user-permissions';

// User role types
export type UserRole = 'admin' | 'editor' | 'viewer';
export type UserStatus = 'active' | 'inactive';

// Settlement workflow role (independent of system role)
export type SettlementRole = 'none' | 'guide' | 'accountant';

// Database types
export type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert'];
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];

type UserProfileGuideDbFields = {
  phone?: string | null;
  note?: string | null;
  is_default_guide?: boolean | null;
};

// Application user profile type
export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  note?: string;
  isDefaultGuide?: boolean;
  languageIds?: string[];
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
  phone?: string;
  note?: string;
  isDefaultGuide?: boolean;
  languageIds?: string[];
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
  | 'view_tour_all_tabs'
  | 'view_tour_info'
  | 'view_tour_destinations'
  | 'view_tour_expenses'
  | 'view_tour_meals'
  | 'view_tour_combined'
  | 'view_tour_allowances'
  | 'view_tour_shoppings'
  | 'view_tour_images'
  | 'view_tour_summary'
  | 'edit_tour_info'
  | 'edit_tour_destinations'
  | 'edit_tour_expenses'
  | 'edit_tour_meals'
  | 'edit_tour_allowances'
  | 'edit_tour_shoppings'
  | 'edit_tour_summary'
  | 'view_tour_info_all_fields'
  | 'edit_tour_info_all_fields'
  | 'view_tour_info_tour_code'
  | 'edit_tour_info_tour_code'
  | 'view_tour_info_companies'
  | 'edit_tour_info_companies'
  | 'view_tour_info_guide'
  | 'edit_tour_info_guide'
  | 'view_tour_info_client'
  | 'edit_tour_info_client'
  | 'view_tour_info_pax'
  | 'edit_tour_info_pax'
  | 'view_tour_info_dates'
  | 'edit_tour_info_dates'
  | 'view_tour_info_driver'
  | 'edit_tour_info_driver'
  | 'view_tour_info_notes'
  | 'edit_tour_info_notes'
  | 'view_tour_line_all_fields'
  | 'edit_tour_line_all_fields'
  | 'view_tour_line_name'
  | 'edit_tour_line_name'
  | 'view_tour_line_price'
  | 'edit_tour_line_price'
  | 'view_tour_line_date'
  | 'edit_tour_line_date'
  | 'view_tour_line_quantity'
  | 'edit_tour_line_quantity'
  | 'view_tour_line_evidence'
  | 'edit_tour_line_evidence'
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

export {
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  SETTLEMENT_ROLE_PERMISSIONS,
  getDefaultPermissionsForProfile,
  getEffectivePermissions,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  normalizePermissions,
  profileHasPermission,
} from '@/types/user-permissions';

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
  const guideFields = row as unknown as {
    phone?: string | null;
    note?: string | null;
    is_default_guide?: boolean | null;
  };
  const isMasterAdmin = row.email === 'iposntmk@gmail.com';
  const role = isMasterAdmin ? 'admin' : (row.role as UserRole);
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name ?? undefined,
    phone: guideFields.phone ?? undefined,
    note: guideFields.note ?? undefined,
    isDefaultGuide: guideFields.is_default_guide ?? false,
    role,
    status: isMasterAdmin ? 'active' : (row.status as UserStatus),
    settlementRole: (settlementRoleRaw as SettlementRole) ?? 'none',
    permissions: role === 'admin' ? ALL_PERMISSIONS : (Array.isArray(permissionsRaw) ? normalizePermissions(permissionsRaw) : undefined),
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    createdBy: row.created_by ?? undefined,
  };
}

function permissionsForDb(profile: Partial<UserProfileInput>): Permission[] | null | undefined {
  if (profile.role === 'admin') return null;
  if (profile.permissions === undefined) return undefined;
  return profile.permissions === null ? null : normalizePermissions(profile.permissions);
}

// Convert UserProfile to database insert
export function userProfileToDbInsert(
  userId: string,
  profile: UserProfileInput,
  createdBy?: string
): UserProfileInsert {
  const permissions = permissionsForDb(profile);
  const insert: UserProfileInsert & { settlement_role?: SettlementRole } & UserProfileGuideDbFields = {
    id: userId,
    email: profile.email,
    full_name: profile.fullName,
    phone: profile.phone,
    note: profile.note,
    is_default_guide: profile.isDefaultGuide,
    role: profile.role,
    status: profile.status,
    created_by: createdBy,
  };
  if (profile.settlementRole !== undefined) {
    insert.settlement_role = profile.settlementRole;
  }
  if (permissions !== undefined) {
    (insert as UserProfileInsert & { permissions?: Permission[] | null }).permissions = permissions;
  }
  return insert as UserProfileInsert;
}

// Convert UserProfile to database update
export function userProfileToDbUpdate(profile: Partial<UserProfileInput>): UserProfileUpdate {
  const update: UserProfileUpdate & { settlement_role?: SettlementRole } & UserProfileGuideDbFields = {};
  const permissions = permissionsForDb(profile);

  if (profile.email !== undefined) update.email = profile.email;
  if (profile.fullName !== undefined) update.full_name = profile.fullName;
  if (profile.phone !== undefined) update.phone = profile.phone;
  if (profile.note !== undefined) update.note = profile.note;
  if (profile.isDefaultGuide !== undefined) update.is_default_guide = profile.isDefaultGuide;
  if (profile.role !== undefined) update.role = profile.role;
  if (profile.status !== undefined) update.status = profile.status;
  if (profile.settlementRole !== undefined) update.settlement_role = profile.settlementRole;
  if (permissions !== undefined) {
    (update as UserProfileUpdate & { permissions?: Permission[] | null }).permissions = permissions;
  }

  return update as UserProfileUpdate;
}
