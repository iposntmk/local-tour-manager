import type { Database } from '@/integrations/supabase/types';

// User role types
export type UserRole = 'admin' | 'editor' | 'viewer';
export type UserStatus = 'active' | 'inactive';

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
}

// Permission types
export type Permission =
  | 'view_tours'
  | 'create_tours'
  | 'edit_tours'
  | 'delete_tours'
  | 'export_tours'
  | 'view_master_data'
  | 'edit_master_data'
  | 'delete_master_data'
  | 'view_statistics'
  | 'manage_users'
  | 'view_all_users'
  | 'create_users'
  | 'edit_users'
  | 'delete_users'
  | 'change_user_roles';

// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'view_tours',
    'create_tours',
    'edit_tours',
    'delete_tours',
    'export_tours',
    'view_master_data',
    'edit_master_data',
    'delete_master_data',
    'view_statistics',
    'manage_users',
    'view_all_users',
    'create_users',
    'edit_users',
    'delete_users',
    'change_user_roles',
  ],
  editor: [
    'view_tours',
    'create_tours',
    'edit_tours',
    'export_tours',
    'view_master_data',
    'edit_master_data',
    'view_statistics',
  ],
  viewer: [
    'view_tours',
    'view_master_data',
    'view_statistics',
  ],
};

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

// Convert database row to UserProfile
export function dbRowToUserProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name ?? undefined,
    role: row.role as UserRole,
    status: row.status as UserStatus,
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
  return {
    id: userId,
    email: profile.email,
    full_name: profile.fullName,
    role: profile.role,
    status: profile.status,
    created_by: createdBy,
  };
}

// Convert UserProfile to database update
export function userProfileToDbUpdate(profile: Partial<UserProfileInput>): UserProfileUpdate {
  const update: UserProfileUpdate = {};

  if (profile.email !== undefined) update.email = profile.email;
  if (profile.fullName !== undefined) update.full_name = profile.fullName;
  if (profile.role !== undefined) update.role = profile.role;
  if (profile.status !== undefined) update.status = profile.status;

  return update;
}
